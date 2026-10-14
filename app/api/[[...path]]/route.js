// =====================================================================
// API Backend ErgoVision Ecommerce - Next.js App Router
// Maneja todas las rutas /api/* con auth JWT y conexion a Supabase
// =====================================================================
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabase } from '@/lib/supabase';
import {
  signToken,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from '@/lib/auth-helpers';
import { enviarEmailConfirmacionPedido } from '@/lib/email';
import { subirImagenDesdeDataUrl } from '@/lib/storage';

// Helper para responder JSON con codigo HTTP
const json = (data, status = 200) => NextResponse.json(data, { status });

// Middleware: requiere autenticacion
async function requiereAuth(request) {
  const user = await getCurrentUser(request);
  if (!user) return { error: json({ detail: 'No autorizado' }, 401) };
  return { user };
}

// Middleware: requiere rol admin
async function requiereAdmin(request) {
  const r = await requiereAuth(request);
  if (r.error) return r;
  if (r.user.role !== 'admin')
    return { error: json({ detail: 'Acceso solo para administradores' }, 403) };
  return r;
}

// Si la URL es base64 (data:image/...), la sube a Supabase Storage y devuelve URL publica
async function procesarUrlImagen(urlOImagenBase64) {
  if (!urlOImagenBase64) return null;
  if (urlOImagenBase64.startsWith('data:image/')) {
    return await subirImagenDesdeDataUrl(urlOImagenBase64);
  }
  return urlOImagenBase64;
}

// Handler principal para todas las rutas /api/*
async function handler(request, { params }) {
  const sb = getSupabase();
  const path = '/' + ((await params)?.path || []).join('/');
  const method = request.method;

  try {
    // ============ HEALTH ============
    if (path === '/' && method === 'GET') {
      return json({ message: 'ErgoVision API OK', version: '2.0' });
    }

    // ============ AUTH ============
    // Registro publico de usuarios cliente
    if (path === '/auth/register' && method === 'POST') {
      const { email, password, name } = await request.json();
      if (!email || !password || !name)
        return json({ detail: 'Datos incompletos' }, 400);
      const { data: existing } = await sb
        .from('users')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();
      if (existing) return json({ detail: 'Email ya registrado' }, 400);
      const password_hash = await hashPassword(password);
      const { data: newUser, error } = await sb
        .from('users')
        .insert({
          user_id: randomUUID(),
          email,
          name,
          password_hash,
          role: 'customer',
        })
        .select('user_id,email,name,role,picture')
        .single();
      if (error) return json({ detail: error.message }, 500);
      const token = signToken(newUser);
      return json({ token, user: newUser });
    }

    // Login con email + contrasena
    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json();
      const { data: user } = await sb
        .from('users')
        .select('user_id,email,name,role,picture,password_hash')
        .eq('email', email)
        .maybeSingle();
      if (!user) return json({ detail: 'Credenciales invalidas' }, 401);
      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) return json({ detail: 'Credenciales invalidas' }, 401);
      const { password_hash, ...safe } = user;
      const token = signToken(safe);
      return json({ token, user: safe });
    }

    // Obtener usuario actual desde token
    if (path === '/auth/me' && method === 'GET') {
      const r = await requiereAuth(request);
      if (r.error) return r.error;
      return json(r.user);
    }

    // ============ PRODUCTOS PUBLICOS ============
    if (path === '/products' && method === 'GET') {
      const { data, error } = await sb
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return json({ detail: error.message }, 500);
      return json(data);
    }

    const matchProducto = path.match(/^\/products\/([^/]+)$/);
    if (matchProducto && method === 'GET') {
      const { data, error } = await sb
        .from('products')
        .select('*')
        .eq('product_id', matchProducto[1])
        .single();
      if (error) return json({ detail: 'Producto no encontrado' }, 404);
      return json(data);
    }

    // ============ ADMIN: CRUD PRODUCTOS ============
    if (path === '/admin/products' && method === 'POST') {
      const r = await requiereAdmin(request);
      if (r.error) return r.error;
      const body = await request.json();
      // Si viene imagen base64, subirla a storage primero
      const image_url = await procesarUrlImagen(body.image_url);
      const { data, error } = await sb
        .from('products')
        .insert({
          product_id: randomUUID(),
          name: body.name,
          description: body.description || null,
          price: parseInt(body.price) || 0,
          cost_price: parseInt(body.cost_price) || 0,
          image_url,
          category: body.category || null,
          stock: parseInt(body.stock) || 0,
        })
        .select('*')
        .single();
      if (error) return json({ detail: error.message }, 500);
      return json(data);
    }

    const matchAdminProducto = path.match(/^\/admin\/products\/([^/]+)$/);
    if (matchAdminProducto && method === 'PUT') {
      const r = await requiereAdmin(request);
      if (r.error) return r.error;
      const body = await request.json();
      const update = {};
      for (const k of ['name', 'description', 'category']) {
        if (body[k] !== undefined) update[k] = body[k];
      }
      if (body.price !== undefined) update.price = parseInt(body.price) || 0;
      if (body.cost_price !== undefined)
        update.cost_price = parseInt(body.cost_price) || 0;
      if (body.stock !== undefined) update.stock = parseInt(body.stock) || 0;
      if (body.image_url !== undefined) {
        update.image_url = await procesarUrlImagen(body.image_url);
      }
      update.updated_at = new Date().toISOString();
      const { data, error } = await sb
        .from('products')
        .update(update)
        .eq('product_id', matchAdminProducto[1])
        .select('*')
        .single();
      if (error) return json({ detail: error.message }, 500);
      return json(data);
    }

    if (matchAdminProducto && method === 'DELETE') {
      const r = await requiereAdmin(request);
      if (r.error) return r.error;
      const { error } = await sb
        .from('products')
        .delete()
        .eq('product_id', matchAdminProducto[1]);
      if (error) return json({ detail: error.message }, 500);
      return json({ message: 'Producto eliminado' });
    }

    // ============ ADMIN: CRUD USUARIOS CLIENTES ============
    if (path === '/admin/users' && method === 'GET') {
      const r = await requiereAdmin(request);
      if (r.error) return r.error;
      const { data, error } = await sb
        .from('users')
        .select('user_id,email,name,role,picture,created_at')
        .order('created_at', { ascending: false });
      if (error) return json({ detail: error.message }, 500);
      return json(data);
    }

    if (path === '/admin/users' && method === 'POST') {
      const r = await requiereAdmin(request);
      if (r.error) return r.error;
      const { email, password, name, role } = await request.json();
      if (!email || !password || !name)
        return json({ detail: 'Datos incompletos' }, 400);
      const { data: existing } = await sb
        .from('users')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();
      if (existing) return json({ detail: 'Email ya registrado' }, 400);
      const password_hash = await hashPassword(password);
      const { data: newUser, error } = await sb
        .from('users')
        .insert({
          user_id: randomUUID(),
          email,
          name,
          password_hash,
          role: role || 'customer',
        })
        .select('user_id,email,name,role,created_at')
        .single();
      if (error) return json({ detail: error.message }, 500);
      return json(newUser);
    }

    const matchUsuario = path.match(/^\/admin\/users\/([^/]+)$/);
    if (matchUsuario && method === 'DELETE') {
      const r = await requiereAdmin(request);
      if (r.error) return r.error;
      // Evitar borrar al propio admin
      if (matchUsuario[1] === r.user.user_id)
        return json({ detail: 'No puedes eliminar tu propio usuario' }, 400);
      const { error } = await sb
        .from('users')
        .delete()
        .eq('user_id', matchUsuario[1]);
      if (error) return json({ detail: error.message }, 500);
      return json({ message: 'Usuario eliminado' });
    }

    // ============ CARRITO ============
    if (path === '/cart' && method === 'GET') {
      const r = await requiereAuth(request);
      if (r.error) return r.error;
      const { data, error } = await sb
        .from('cart_items')
        .select(
          'cart_item_id, product_id, quantity, products(name, price, image_url)'
        )
        .eq('user_id', r.user.user_id);
      if (error) return json({ detail: error.message }, 500);
      const items = data.map((it) => ({
        cart_item_id: it.cart_item_id,
        product_id: it.product_id,
        product_name: it.products?.name,
        product_price: String(it.products?.price ?? 0),
        product_image: it.products?.image_url,
        quantity: it.quantity,
        subtotal: String((it.products?.price || 0) * it.quantity),
      }));
      return json(items);
    }

    if (path === '/cart' && method === 'POST') {
      const r = await requiereAuth(request);
      if (r.error) return r.error;
      const { product_id, quantity = 1 } = await request.json();
      const { data: prod } = await sb
        .from('products')
        .select('product_id')
        .eq('product_id', product_id)
        .maybeSingle();
      if (!prod) return json({ detail: 'Producto no encontrado' }, 404);
      const { data: existing } = await sb
        .from('cart_items')
        .select('*')
        .eq('user_id', r.user.user_id)
        .eq('product_id', product_id)
        .maybeSingle();
      if (existing) {
        await sb
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('cart_item_id', existing.cart_item_id);
        return json({ message: 'Cantidad actualizada' });
      }
      await sb.from('cart_items').insert({
        cart_item_id: randomUUID(),
        user_id: r.user.user_id,
        product_id,
        quantity,
      });
      return json({ message: 'Agregado al carrito' });
    }

    const matchCart = path.match(/^\/cart\/([^/]+)$/);
    if (matchCart && method === 'PUT') {
      const r = await requiereAuth(request);
      if (r.error) return r.error;
      const { quantity } = await request.json();
      const { error } = await sb
        .from('cart_items')
        .update({ quantity })
        .eq('cart_item_id', matchCart[1])
        .eq('user_id', r.user.user_id);
      if (error) return json({ detail: error.message }, 500);
      return json({ message: 'Actualizado' });
    }
    if (matchCart && method === 'DELETE') {
      const r = await requiereAuth(request);
      if (r.error) return r.error;
      const { error } = await sb
        .from('cart_items')
        .delete()
        .eq('cart_item_id', matchCart[1])
        .eq('user_id', r.user.user_id);
      if (error) return json({ detail: error.message }, 500);
      return json({ message: 'Eliminado' });
    }

    // ============ PEDIDOS / ORDENES ============
    if (path === '/orders' && method === 'POST') {
      const r = await requiereAuth(request);
      if (r.error) return r.error;
      const { customer_name, customer_email } = await request.json();
      // Obtener items del carrito con info del producto
      const { data: cartItems } = await sb
        .from('cart_items')
        .select('quantity, product_id, products(name, price, cost_price)')
        .eq('user_id', r.user.user_id);
      if (!cartItems || cartItems.length === 0)
        return json({ detail: 'Carrito vacio' }, 400);
      const total = cartItems.reduce(
        (s, it) => s + (it.products?.price || 0) * it.quantity,
        0
      );
      // Crear orden
      const { data: order, error: orderErr } = await sb
        .from('orders')
        .insert({
          order_id: randomUUID(),
          user_id: r.user.user_id,
          total,
          status: 'completed',
          customer_name,
          customer_email,
        })
        .select('*')
        .single();
      if (orderErr) return json({ detail: orderErr.message }, 500);
      // Insertar items de la orden
      const orderItems = cartItems.map((it) => ({
        order_item_id: randomUUID(),
        order_id: order.order_id,
        product_id: it.product_id,
        product_name: it.products?.name,
        quantity: it.quantity,
        price: it.products?.price || 0,
      }));
      await sb.from('order_items').insert(orderItems);
      // Vaciar carrito
      await sb.from('cart_items').delete().eq('user_id', r.user.user_id);
      // Enviar email de confirmacion (no bloqueante en caso de error)
      const { data: settings } = await sb
        .from('site_settings')
        .select('site_name, primary_color')
        .limit(1)
        .maybeSingle();
      const respuestaCliente = {
        order_id: order.order_id,
        total: String(order.total),
        status: order.status,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        created_at: order.created_at,
        items: orderItems.map((it) => ({
          product_name: it.product_name,
          quantity: it.quantity,
          price: String(it.price),
        })),
      };
      // Enviar email asincronamente, no bloquear respuesta
      const resEmail = await enviarEmailConfirmacionPedido(
        customer_email,
        respuestaCliente,
        settings
      );
      respuestaCliente.email_sent = resEmail.ok;
      return json(respuestaCliente);
    }

    if (path === '/orders' && method === 'GET') {
      const r = await requiereAuth(request);
      if (r.error) return r.error;
      const { data, error } = await sb
        .from('orders')
        .select('*, items:order_items(product_name, quantity, price)')
        .eq('user_id', r.user.user_id)
        .order('created_at', { ascending: false });
      if (error) return json({ detail: error.message }, 500);
      return json(data);
    }

    if (path === '/admin/orders' && method === 'GET') {
      const r = await requiereAdmin(request);
      if (r.error) return r.error;
      const { data, error } = await sb
        .from('orders')
        .select('*, items:order_items(product_name, quantity, price, product_id)')
        .order('created_at', { ascending: false });
      if (error) return json({ detail: error.message }, 500);
      return json(data);
    }

    // ============ ADMIN: ESTADISTICAS PARA REPORTES ============
    if (path === '/admin/stats' && method === 'GET') {
      const r = await requiereAdmin(request);
      if (r.error) return r.error;
      // Productos con info de costo
      const { data: products } = await sb
        .from('products')
        .select('product_id, name, price, cost_price');
      // Todas las ordenes con sus items
      const { data: orders } = await sb
        .from('orders')
        .select('*, items:order_items(product_name, quantity, price, product_id)')
        .order('created_at', { ascending: false });
      // Calcular productos mas vendidos
      const mapaVentas = {};
      let ingresoTotal = 0;
      let costoTotal = 0;
      (orders || []).forEach((ord) => {
        ingresoTotal += Number(ord.total || 0);
        (ord.items || []).forEach((it) => {
          const key = it.product_id || it.product_name;
          if (!mapaVentas[key]) {
            mapaVentas[key] = {
              product_id: it.product_id,
              product_name: it.product_name,
              quantity: 0,
              revenue: 0,
              cost: 0,
            };
          }
          mapaVentas[key].quantity += it.quantity;
          mapaVentas[key].revenue += Number(it.price) * it.quantity;
          // Buscar costo del producto
          const prod = products?.find((p) => p.product_id === it.product_id);
          const costoUnit = prod?.cost_price || 0;
          mapaVentas[key].cost += costoUnit * it.quantity;
          costoTotal += costoUnit * it.quantity;
        });
      });
      const productosMasVendidos = Object.values(mapaVentas)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
      return json({
        total_orders: orders?.length || 0,
        total_revenue: ingresoTotal,
        total_cost: costoTotal,
        total_profit: ingresoTotal - costoTotal,
        top_products: productosMasVendidos,
        orders: orders || [],
      });
    }

    // ============ SITE SETTINGS (CONFIGURACION) ============
    if (path === '/settings' && method === 'GET') {
      const { data } = await sb
        .from('site_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      return json(data || {});
    }

    if (path === '/admin/settings' && method === 'PUT') {
      const r = await requiereAdmin(request);
      if (r.error) return r.error;
      const body = await request.json();
      // Si el logo viene como base64, subirlo primero
      if (body.logo_url) {
        body.logo_url = await procesarUrlImagen(body.logo_url);
      }
      const { data: existing } = await sb
        .from('site_settings')
        .select('setting_id')
        .limit(1)
        .maybeSingle();
      const update = {};
      for (const k of [
        'site_name',
        'primary_color',
        'font_family_heading',
        'font_family_body',
        'logo_url',
      ]) {
        if (body[k] !== undefined) update[k] = body[k];
      }
      update.updated_at = new Date().toISOString();
      if (existing) {
        const { data, error } = await sb
          .from('site_settings')
          .update(update)
          .eq('setting_id', existing.setting_id)
          .select('*')
          .single();
        if (error) return json({ detail: error.message }, 500);
        return json(data);
      } else {
        const { data, error } = await sb
          .from('site_settings')
          .insert({ setting_id: randomUUID(), ...update })
          .select('*')
          .single();
        if (error) return json({ detail: error.message }, 500);
        return json(data);
      }
    }

    return json({ detail: `No encontrado: ${method} ${path}` }, 404);
  } catch (err) {
    console.error('API error:', err);
    return json({ detail: err.message || 'Error interno' }, 500);
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
