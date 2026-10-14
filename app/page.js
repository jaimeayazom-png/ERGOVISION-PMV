'use client';
// =====================================================================
// ErgoVision Ecommerce - Frontend SPA Next.js
// SPA con routing basado en estado: home, catalogo, carrito, checkout,
// pedidos, admin (productos/pedidos/reportes/clientes/configuracion)
// =====================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  ShoppingCart, User, LogOut, Plus, Minus, Trash2, Edit, Eye, Glasses, ShieldCheck, Truck,
  CreditCard, Package, LayoutDashboard, ArrowLeft, CheckCircle2, Upload, Image as ImageIcon,
  FileText, Download, Users, Settings, TrendingUp, DollarSign,
} from 'lucide-react';

// =================== HELPERS ===================

// Formatea numero como pesos colombianos
const formatoCOP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

// URL de imagen de respaldo cuando no hay imagen disponible
const IMAGEN_FALLBACK =
  'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&q=80&auto=format&fit=crop';

// Reemplaza URLs con localhost (del setup original) por imagen fallback
const imagenSegura = (url) => {
  if (!url || url.includes('localhost')) return IMAGEN_FALLBACK;
  return url;
};

// Wrapper para fetch al backend con auth opcional
async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Error');
  return data;
}

// Convierte un archivo File a string base64 data URL
function archivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// =================== HOOK: AUTH ===================
function useAuth() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('ev_token');
    const u = localStorage.getItem('ev_user');
    if (t && u) {
      setToken(t);
      try { setUser(JSON.parse(u)); } catch {}
    }
    setReady(true);
  }, []);

  const login = (token, user) => {
    localStorage.setItem('ev_token', token);
    localStorage.setItem('ev_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };
  const logout = () => {
    localStorage.removeItem('ev_token');
    localStorage.removeItem('ev_user');
    setToken(null);
    setUser(null);
  };
  return { token, user, ready, login, logout };
}

// =================== COMPONENTE: UPLOADER DE IMAGEN ===================
function ImagenUploader({ value, onChange, label = 'Imagen' }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const onSeleccionarArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es muy grande (máx 5MB)');
      return;
    }
    setSubiendo(true);
    try {
      const base64 = await archivoABase64(file);
      onChange(base64);
      toast.success('Imagen lista para guardar');
    } catch (err) {
      toast.error('Error procesando imagen');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-3 items-start mt-1">
        {value ? (
          <div className="relative w-24 h-24 rounded-md overflow-hidden border-2 border-slate-200 flex-shrink-0">
            <img src={value} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = IMAGEN_FALLBACK)} />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-md border-2 border-dashed border-slate-300 flex items-center justify-center flex-shrink-0">
            <ImageIcon className="h-8 w-8 text-slate-400" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onSeleccionarArchivo}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-1" />
            {subiendo ? 'Procesando...' : 'Subir imagen local'}
          </Button>
          <Input
            placeholder="...o pega una URL https://..."
            value={value && !value.startsWith('data:') ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// =================== HEADER ===================
function Header({ user, cartCount, onNav, onLogout, onOpenAuth, configSitio }) {
  const colorPrimario = configSitio?.primary_color || '#0d9488';
  const nombre = configSitio?.site_name || 'ErgoVision';
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => onNav('home')} className="flex items-center gap-2 group">
          {configSitio?.logo_url ? (
            <img src={configSitio.logo_url} alt={nombre} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${colorPrimario}, #0ea5e9)` }}>
              <Glasses className="h-5 w-5" />
            </div>
          )}
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="text-slate-900">{nombre.split(' ')[0] || nombre}</span>
            {nombre.split(' ')[1] && <span style={{ color: colorPrimario }}>{nombre.split(' ').slice(1).join(' ')}</span>}
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
          <button onClick={() => onNav('home')} className="hover:text-teal-600">Inicio</button>
          <button onClick={() => onNav('catalog')} className="hover:text-teal-600">Catálogo</button>
          {user && <button onClick={() => onNav('orders')} className="hover:text-teal-600">Mis pedidos</button>}
          {user?.role === 'admin' && (
            <button onClick={() => onNav('admin')} className="font-semibold" style={{ color: colorPrimario }}>
              <LayoutDashboard className="inline h-4 w-4 mr-1" />Admin
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onNav('cart')} className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-bold" style={{ backgroundColor: colorPrimario }}>
                {cartCount}
              </span>
            )}
          </Button>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-slate-600">Hola, <b>{user.name?.split(' ')[0]}</b></span>
              <Button size="sm" variant="outline" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={onOpenAuth} style={{ backgroundColor: colorPrimario }} className="text-white hover:opacity-90">
              <User className="h-4 w-4 mr-1" /> Ingresar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

// =================== HERO ===================
function Hero({ onShop, configSitio }) {
  const colorPrimario = configSitio?.primary_color || '#0d9488';
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-50">
      <div className="container mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <Badge style={{ backgroundColor: colorPrimario + '20', color: colorPrimario }} className="mb-4">Tecnología anti luz azul</Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Cuida tus ojos. <span style={{ color: colorPrimario }}>Mejora tu vida.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-lg">
            Lentes {configSitio?.site_name || 'ErgoVision'} con filtro de luz azul. Reduce la fatiga visual, mejora tu descanso y trabaja cómodo todo el día.
          </p>
          <div className="mt-7 flex gap-3">
            <Button size="lg" onClick={onShop} style={{ backgroundColor: colorPrimario }} className="text-white hover:opacity-90">Ver catálogo</Button>
            <Button size="lg" variant="outline" onClick={onShop}>Conocer más</Button>
          </div>
          <div className="mt-8 flex gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" style={{ color: colorPrimario }} /> Garantía 1 año</div>
            <div className="flex items-center gap-2"><Truck className="h-4 w-4" style={{ color: colorPrimario }} /> Envío nacional</div>
            <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" style={{ color: colorPrimario }} /> Pago seguro</div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-50" style={{ background: `linear-gradient(135deg, ${colorPrimario}, #06b6d4)` }} />
          <img
            src="https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=900&q=80&auto=format&fit=crop"
            alt="Lentes"
            className="relative rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
          />
        </div>
      </div>
    </section>
  );
}

// =================== TARJETA DE PRODUCTO ===================
function ProductCard({ product, onAdd, onView, color }) {
  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all border-slate-200">
      <div className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onView(product)}>
        <img
          src={imagenSegura(product.image_url)}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.currentTarget.src = IMAGEN_FALLBACK; }}
        />
        {product.stock < 5 && product.stock > 0 && (
          <Badge className="absolute top-2 right-2 bg-amber-500">Quedan {product.stock}</Badge>
        )}
        {product.stock === 0 && (
          <Badge className="absolute top-2 right-2 bg-red-500">Agotado</Badge>
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{product.name}</CardTitle>
        {product.category && <span className="text-xs text-slate-500">{product.category}</span>}
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem]">{product.description}</p>
        <div className="mt-3 text-2xl font-bold" style={{ color }}>{formatoCOP(product.price)}</div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button className="flex-1 text-white hover:opacity-90" style={{ backgroundColor: color }} onClick={() => onAdd(product)} disabled={product.stock === 0}>
          <ShoppingCart className="h-4 w-4 mr-1" /> Agregar
        </Button>
        <Button variant="outline" size="icon" onClick={() => onView(product)}>
          <Eye className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// =================== MODAL DE AUTENTICACIÓN ===================
function AuthModal({ open, onClose, onLogin }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const body = tab === 'login' ? { email: form.email, password: form.password } : form;
      const res = await api(endpoint, { method: 'POST', body });
      onLogin(res.token, res.user);
      toast.success(tab === 'login' ? '¡Bienvenido!' : 'Cuenta creada');
      onClose();
      setForm({ email: '', password: '', name: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }} className="text-2xl">
            {tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>
          <form onSubmit={submit} className="space-y-3 mt-4">
            {tab === 'register' && (
              <div>
                <Label>Nombre</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700">
              {loading ? 'Procesando...' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
            </Button>
          </form>
          {tab === 'login' && (
            <div className="mt-4 p-3 bg-slate-50 rounded-md text-xs text-slate-600">
              <div className="font-semibold mb-1">Cuentas demo:</div>
              <div>Admin: <code>admin@ergovision.com</code> / <code>admin123</code></div>
              <div>Cliente: <code>cliente@test.com</code> / <code>cliente123</code></div>
            </div>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// =================== VISTA: CARRITO ===================
function CartView({ items, onUpdate, onRemove, onCheckout, color }) {
  if (!items || items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto text-slate-300" />
        <h2 className="mt-4 text-2xl font-bold">Tu carrito está vacío</h2>
        <p className="text-slate-500 mt-2">Agrega productos para continuar</p>
      </div>
    );
  }
  const total = items.reduce((s, it) => s + Number(it.subtotal), 0);
  return (
    <div className="container mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Carrito de compras</h2>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((it) => (
            <Card key={it.cart_item_id} className="p-4">
              <div className="flex gap-4 items-center">
                <img src={imagenSegura(it.product_image)} alt={it.product_name} className="w-20 h-20 object-cover rounded-md" onError={(e) => (e.currentTarget.src = IMAGEN_FALLBACK)} />
                <div className="flex-1">
                  <h3 className="font-semibold">{it.product_name}</h3>
                  <p className="text-sm text-slate-500">{formatoCOP(it.product_price)} c/u</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onUpdate(it.cart_item_id, Math.max(1, it.quantity - 1))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{it.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onUpdate(it.cart_item_id, it.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold" style={{ color }}>{formatoCOP(it.subtotal)}</div>
                  <Button size="sm" variant="ghost" className="text-red-500 mt-2" onClick={() => onRemove(it.cart_item_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="p-6 h-fit sticky top-20">
          <h3 className="font-bold text-lg mb-4">Resumen</h3>
          <div className="flex justify-between text-slate-600 mb-2"><span>Subtotal</span><span>{formatoCOP(total)}</span></div>
          <div className="flex justify-between text-slate-600 mb-2"><span>Envío</span><span style={{ color }}>Gratis</span></div>
          <div className="border-t pt-3 flex justify-between font-bold text-xl">
            <span>Total</span><span style={{ color }}>{formatoCOP(total)}</span>
          </div>
          <Button className="w-full mt-5 text-white hover:opacity-90" style={{ backgroundColor: color }} size="lg" onClick={onCheckout}>
            Proceder al pago
          </Button>
        </Card>
      </div>
    </div>
  );
}

// =================== VISTA: CHECKOUT ===================
function CheckoutView({ items, user, token, onSuccess, onBack, color }) {
  const [form, setForm] = useState({ customer_name: user?.name || '', customer_email: user?.email || '', card: '4242 4242 4242 4242', cvv: '123', expiry: '12/27' });
  const [loading, setLoading] = useState(false);
  const total = items.reduce((s, it) => s + Number(it.subtotal), 0);

  const pagar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1200)); // simular pago
      const order = await api('/orders', {
        method: 'POST',
        body: { customer_name: form.customer_name, customer_email: form.customer_email },
        token,
      });
      toast.success('¡Pago procesado!' + (order.email_sent ? ' Email enviado.' : ''));
      onSuccess(order);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <Button variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" />Volver al carrito</Button>
      <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Checkout</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Datos de envío y pago</h3>
          <form onSubmit={pagar} className="space-y-3">
            <div>
              <Label>Nombre completo</Label>
              <Input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <Label>Email (donde llegará la confirmación)</Label>
              <Input type="email" required value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
            </div>
            <div className="pt-3 border-t">
              <Label className="text-sm font-semibold">Tarjeta (simulada)</Label>
              <Input value={form.card} onChange={(e) => setForm({ ...form, card: e.target.value })} placeholder="4242 4242 4242 4242" className="mt-1" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} placeholder="MM/AA" />
                <Input value={form.cvv} onChange={(e) => setForm({ ...form, cvv: e.target.value })} placeholder="CVV" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full text-white hover:opacity-90" style={{ backgroundColor: color }} size="lg">
              {loading ? 'Procesando pago...' : `Pagar ${formatoCOP(total)}`}
            </Button>
            <p className="text-xs text-center text-slate-500">Pago simulado para MVP — no se realiza cargo real</p>
          </form>
        </Card>
        <Card className="p-6 h-fit">
          <h3 className="font-bold text-lg mb-4">Tu orden</h3>
          {items.map((it) => (
            <div key={it.cart_item_id} className="flex justify-between py-2 border-b text-sm">
              <span>{it.product_name} × {it.quantity}</span>
              <span className="font-semibold">{formatoCOP(it.subtotal)}</span>
            </div>
          ))}
          <div className="flex justify-between mt-4 pt-3 border-t font-bold text-xl">
            <span>Total</span>
            <span style={{ color }}>{formatoCOP(total)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// =================== VISTA: ÉXITO DE COMPRA ===================
function OrderSuccess({ order, onContinue, color }) {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="max-w-md mx-auto">
        <CheckCircle2 className="h-20 w-20 mx-auto" style={{ color }} />
        <h2 className="text-3xl font-bold mt-4" style={{ fontFamily: 'Outfit, sans-serif' }}>¡Compra exitosa!</h2>
        <p className="text-slate-600 mt-2">Tu pedido <code className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">{order.order_id?.slice(0, 8)}</code> fue confirmado.</p>
        {order.email_sent && (
          <Badge className="mt-3 bg-green-100 text-green-700">✓ Email de confirmación enviado</Badge>
        )}
        <Card className="mt-6 p-4 text-left">
          <div className="font-semibold mb-2">Detalle</div>
          {order.items?.map((it, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span>{it.product_name} × {it.quantity}</span>
              <span>{formatoCOP(Number(it.price) * it.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold mt-2 pt-2 border-t">
            <span>Total</span>
            <span style={{ color }}>{formatoCOP(order.total)}</span>
          </div>
        </Card>
        <Button className="mt-6 text-white hover:opacity-90" style={{ backgroundColor: color }} onClick={onContinue}>Continuar comprando</Button>
      </div>
    </div>
  );
}

// =================== VISTA: MIS PEDIDOS ===================
function OrdersView({ orders, color }) {
  if (!orders || orders.length === 0)
    return <div className="container mx-auto px-4 py-16 text-center text-slate-500">No tienes pedidos aún.</div>;
  return (
    <div className="container mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Mis pedidos</h2>
      <div className="space-y-3">
        {orders.map((o) => (
          <Card key={o.order_id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-mono text-xs text-slate-500">#{o.order_id.slice(0, 8)}</div>
                <div className="font-semibold">{new Date(o.created_at).toLocaleString('es-CO')}</div>
              </div>
              <div className="text-right">
                <Badge className="bg-teal-100 text-teal-800">{o.status}</Badge>
                <div className="text-xl font-bold mt-1" style={{ color }}>{formatoCOP(o.total)}</div>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {o.items?.map((it, i) => (
                <span key={i}>{it.product_name} × {it.quantity}{i < o.items.length - 1 ? ', ' : ''}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// =================== MODAL: DETALLE DE PRODUCTO ===================
function ProductDetail({ product, open, onClose, onAdd, color }) {
  if (!product) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="grid md:grid-cols-2 gap-6">
          <img src={imagenSegura(product.image_url)} alt={product.name} className="w-full aspect-square object-cover rounded-md" onError={(e) => (e.currentTarget.src = IMAGEN_FALLBACK)} />
          <div>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }} className="text-2xl">{product.name}</DialogTitle>
            </DialogHeader>
            {product.category && <Badge variant="outline" className="mt-2">{product.category}</Badge>}
            <p className="text-slate-600 my-4">{product.description}</p>
            <div className="text-3xl font-bold" style={{ color }}>{formatoCOP(product.price)}</div>
            <p className="text-sm text-slate-500 mt-2">Stock: {product.stock} unidades</p>
            <Button className="mt-6 w-full text-white hover:opacity-90" style={{ backgroundColor: color }} onClick={() => { onAdd(product); onClose(); }} disabled={product.stock === 0}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Agregar al carrito
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =================== ADMIN: FORMULARIO DE PRODUCTO ===================
function ProductFormDialog({ open, product, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', description: '', price: 0, cost_price: 0, image_url: '', category: '', stock: 0 });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        cost_price: product.cost_price || 0,
        image_url: product.image_url || '',
        category: product.category || '',
        stock: product.stock || 0,
      });
    }
  }, [product]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product?.product_id ? 'Editar' : 'Nuevo'} producto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Precio venta (COP)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Costo unitario (COP)</Label>
              <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: parseInt(e.target.value) || 0 })} />
              <p className="text-xs text-slate-500 mt-1">Para reportes financieros</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Categoría</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <ImagenUploader value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} label="Imagen del producto" />
          {form.price > 0 && form.cost_price > 0 && (
            <div className="bg-emerald-50 p-3 rounded text-sm">
              <strong>Margen estimado:</strong> {formatoCOP(form.price - form.cost_price)} ({(((form.price - form.cost_price) / form.price) * 100).toFixed(1)}%)
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => onSave(form)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================== ADMIN: GRÁFICA DE PRODUCTOS MÁS VENDIDOS ===================
function GraficoVentas({ topProductos, color }) {
  const datos = (topProductos || []).slice(0, 8).map((p) => ({
    nombre: (p.product_name || 'Sin nombre').length > 18 ? p.product_name.slice(0, 16) + '...' : p.product_name,
    Cantidad: p.quantity,
    Ingresos: p.revenue,
  }));
  const coloresPie = ['#0d9488', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-4">
        <h3 className="font-bold mb-3 text-slate-800"><TrendingUp className="inline h-4 w-4 mr-1" />Top productos vendidos (unidades)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={datos}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="nombre" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar dataKey="Cantidad" fill={color || '#0d9488'} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card className="p-4">
        <h3 className="font-bold mb-3 text-slate-800"><DollarSign className="inline h-4 w-4 mr-1" />Distribución de ingresos</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={datos} dataKey="Ingresos" nameKey="nombre" cx="50%" cy="50%" outerRadius={90} label={(e) => `${(e.percent * 100).toFixed(0)}%`}>
              {datos.map((_, i) => <Cell key={i} fill={coloresPie[i % coloresPie.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => formatoCOP(v)} />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// =================== ADMIN: REPORTE FINANCIERO PDF ===================
async function generarReportePDF(stats, configSitio) {
  // Carga dinámica de jspdf para no inflar el bundle inicial
  const { default: jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || autoTableModule.autoTable;

  const doc = new jsPDF();
  const nombreSitio = configSitio?.site_name || 'ErgoVision';
  const fechaHoy = new Date().toLocaleDateString('es-CO');
  const colorPrimario = configSitio?.primary_color || '#0d9488';

  // Encabezado
  doc.setFontSize(22);
  doc.setTextColor(13, 148, 136);
  doc.text(nombreSitio, 14, 20);
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text('Reporte Financiero Quincenal', 14, 28);
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${fechaHoy}`, 14, 34);

  // Resumen ejecutivo
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('Resumen Ejecutivo', 14, 46);
  doc.setDrawColor(13, 148, 136);
  doc.line(14, 48, 196, 48);

  const resumen = [
    ['Total de pedidos', String(stats.total_orders || 0)],
    ['Ingresos totales (ventas)', formatoCOP(stats.total_revenue)],
    ['Costos totales', formatoCOP(stats.total_cost)],
    ['Ganancia bruta', formatoCOP(stats.total_profit)],
    ['Margen', stats.total_revenue ? `${((stats.total_profit / stats.total_revenue) * 100).toFixed(1)}%` : '0%'],
  ];
  autoTable(doc, {
    startY: 52,
    head: [['Métrica', 'Valor']],
    body: resumen,
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136] },
    styles: { fontSize: 10 },
  });

  // Top productos
  const yTop = doc.lastAutoTable?.finalY || 100;
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('Top Productos Vendidos', 14, yTop + 12);
  doc.line(14, yTop + 14, 196, yTop + 14);

  const topRows = (stats.top_products || []).slice(0, 10).map((p, i) => [
    String(i + 1),
    p.product_name || '—',
    String(p.quantity),
    formatoCOP(p.revenue),
    formatoCOP(p.cost),
    formatoCOP(p.revenue - p.cost),
  ]);
  autoTable(doc, {
    startY: yTop + 18,
    head: [['#', 'Producto', 'Unid.', 'Ingreso', 'Costo', 'Ganancia']],
    body: topRows,
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136] },
    styles: { fontSize: 9 },
  });

  // Lista de pedidos
  const yOrders = doc.lastAutoTable?.finalY || 200;
  if (yOrders > 230) doc.addPage();
  const yStartOrders = yOrders > 230 ? 20 : yOrders + 12;
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('Detalle de Pedidos', 14, yStartOrders);
  doc.line(14, yStartOrders + 2, 196, yStartOrders + 2);

  const orderRows = (stats.orders || []).slice(0, 30).map((o) => [
    o.order_id.slice(0, 8),
    o.customer_name || '—',
    new Date(o.created_at).toLocaleDateString('es-CO'),
    o.status,
    formatoCOP(o.total),
  ]);
  autoTable(doc, {
    startY: yStartOrders + 6,
    head: [['Pedido', 'Cliente', 'Fecha', 'Estado', 'Total']],
    body: orderRows,
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136] },
    styles: { fontSize: 9 },
  });

  // Pie de página
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`${nombreSitio} - Reporte generado automáticamente`, 14, 285);

  doc.save(`reporte_quincenal_${nombreSitio.replace(/\s/g, '_')}_${fechaHoy}.pdf`);
}

// =================== ADMIN: TAB REPORTES ===================
function TabReportes({ stats, configSitio, onRefresh, color }) {
  if (!stats) return <div className="text-center py-8 text-slate-500">Cargando estadísticas...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Reportes Financieros</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh}>Refrescar datos</Button>
          <Button onClick={() => generarReportePDF(stats, configSitio)} style={{ backgroundColor: color }} className="text-white hover:opacity-90">
            <Download className="h-4 w-4 mr-1" /> Descargar PDF Quincenal
          </Button>
        </div>
      </div>

      {/* KPIs financieros */}
      <div className="grid md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Ingresos</div>
          <div className="text-2xl font-bold text-emerald-600">{formatoCOP(stats.total_revenue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Costos</div>
          <div className="text-2xl font-bold text-red-500">{formatoCOP(stats.total_cost)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Ganancia</div>
          <div className="text-2xl font-bold text-teal-600">{formatoCOP(stats.total_profit)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Margen</div>
          <div className="text-2xl font-bold text-indigo-600">{stats.total_revenue ? `${((stats.total_profit / stats.total_revenue) * 100).toFixed(1)}%` : '0%'}</div>
        </Card>
      </div>

      <GraficoVentas topProductos={stats.top_products} color={color} />

      <Card className="p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4" />Productos top por ganancia</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Producto</th>
                <th className="text-right p-2">Unidades</th>
                <th className="text-right p-2">Ingresos</th>
                <th className="text-right p-2">Costo</th>
                <th className="text-right p-2">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {(stats.top_products || []).map((p, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 font-medium">{p.product_name}</td>
                  <td className="p-2 text-right">{p.quantity}</td>
                  <td className="p-2 text-right text-emerald-600">{formatoCOP(p.revenue)}</td>
                  <td className="p-2 text-right text-red-500">{formatoCOP(p.cost)}</td>
                  <td className="p-2 text-right font-bold text-teal-700">{formatoCOP(p.revenue - p.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// =================== ADMIN: TAB CLIENTES ===================
function TabClientes({ token, color }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });

  const cargar = useCallback(async () => {
    try { setUsers(await api('/admin/users', { token })); } catch (e) { toast.error(e.message); }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async () => {
    try {
      await api('/admin/users', { method: 'POST', body: form, token });
      toast.success('Usuario creado');
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'customer' });
      cargar();
    } catch (e) { toast.error(e.message); }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await api(`/admin/users/${id}`, { method: 'DELETE', token });
      toast.success('Usuario eliminado');
      cargar();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} style={{ backgroundColor: color }} className="text-white hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" /> Nuevo usuario
        </Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Rol</th>
                <th className="text-left p-3">Registro</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-slate-600">{u.email}</td>
                  <td className="p-3">
                    <Badge className={u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>{u.role}</Badge>
                  </td>
                  <td className="p-3 text-slate-500">{new Date(u.created_at).toLocaleDateString('es-CO')}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => eliminar(u.user_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Contraseña</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" /></div>
            <div>
              <Label>Rol</Label>
              <select className="w-full border rounded-md p-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="customer">Cliente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={crear} style={{ backgroundColor: color }} className="text-white">Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== ADMIN: TAB CONFIGURACIÓN ===================
function TabConfiguracion({ token, configSitio, onActualizar, color }) {
  const [form, setForm] = useState({
    site_name: configSitio?.site_name || 'ErgoVision',
    primary_color: configSitio?.primary_color || '#0d9488',
    font_family_heading: configSitio?.font_family_heading || 'Outfit',
    font_family_body: configSitio?.font_family_body || 'Work Sans',
    logo_url: configSitio?.logo_url || '',
  });

  useEffect(() => {
    if (configSitio) {
      setForm({
        site_name: configSitio.site_name || 'ErgoVision',
        primary_color: configSitio.primary_color || '#0d9488',
        font_family_heading: configSitio.font_family_heading || 'Outfit',
        font_family_body: configSitio.font_family_body || 'Work Sans',
        logo_url: configSitio.logo_url || '',
      });
    }
  }, [configSitio]);

  const guardar = async () => {
    try {
      await api('/admin/settings', { method: 'PUT', body: form, token });
      toast.success('Configuración actualizada');
      onActualizar();
    } catch (e) { toast.error(e.message); }
  };

  const paletasPredefinidas = [
    { nombre: 'Teal', color: '#0d9488' },
    { nombre: 'Azul', color: '#2563eb' },
    { nombre: 'Verde', color: '#059669' },
    { nombre: 'Púrpura', color: '#7c3aed' },
    { nombre: 'Naranja', color: '#ea580c' },
    { nombre: 'Rosa', color: '#db2777' },
    { nombre: 'Rojo', color: '#dc2626' },
    { nombre: 'Indigo', color: '#4f46e5' },
  ];

  return (
    <Card className="p-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Nombre del ecommerce</Label>
            <Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
          </div>
          <div>
            <Label>Color primario de la marca</Label>
            <div className="flex gap-2 items-center mt-1">
              <Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-16 h-10" />
              <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            </div>
            <div className="flex gap-1 flex-wrap mt-2">
              {paletasPredefinidas.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setForm({ ...form, primary_color: p.color })}
                  className="w-8 h-8 rounded-full border-2 hover:scale-110 transition"
                  style={{ backgroundColor: p.color, borderColor: form.primary_color === p.color ? '#000' : '#fff' }}
                  title={p.nombre}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Tipografía títulos</Label>
            <Input value={form.font_family_heading} onChange={(e) => setForm({ ...form, font_family_heading: e.target.value })} />
          </div>
          <div>
            <Label>Tipografía body</Label>
            <Input value={form.font_family_body} onChange={(e) => setForm({ ...form, font_family_body: e.target.value })} />
          </div>
        </div>
        <div className="space-y-4">
          <ImagenUploader value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} label="Logo del ecommerce" />
          <div className="bg-slate-50 p-4 rounded-md">
            <Label>Vista previa</Label>
            <div className="mt-3 flex items-center gap-2 p-3 bg-white rounded border">
              {form.logo_url ? (
                <img src={form.logo_url} alt="logo" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded flex items-center justify-center text-white" style={{ backgroundColor: form.primary_color }}>
                  <Glasses className="h-5 w-5" />
                </div>
              )}
              <span className="text-xl font-bold">{form.site_name}</span>
            </div>
            <Button className="mt-3 w-full text-white" style={{ backgroundColor: form.primary_color }}>Botón de ejemplo</Button>
          </div>
          <Button onClick={guardar} className="w-full text-white hover:opacity-90" size="lg" style={{ backgroundColor: color }}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </Card>
  );
}

// =================== PANEL ADMIN ===================
function AdminPanel({ token, products, reloadProducts, configSitio, onActualizarConfig, color }) {
  const [tab, setTab] = useState('products');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadOrders = useCallback(async () => {
    try { setOrders(await api('/admin/orders', { token })); } catch (e) { toast.error(e.message); }
  }, [token]);

  const loadStats = useCallback(async () => {
    try { setStats(await api('/admin/stats', { token })); } catch (e) { toast.error(e.message); }
  }, [token]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
    if (tab === 'reports') loadStats();
  }, [tab, loadOrders, loadStats]);

  const guardar = async (form) => {
    try {
      if (editing?.product_id) {
        await api(`/admin/products/${editing.product_id}`, { method: 'PUT', body: form, token });
        toast.success('Producto actualizado');
      } else {
        await api('/admin/products', { method: 'POST', body: form, token });
        toast.success('Producto creado');
      }
      setShowForm(false);
      setEditing(null);
      reloadProducts();
    } catch (e) { toast.error(e.message); }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api(`/admin/products/${id}`, { method: 'DELETE', token });
      toast.success('Eliminado');
      reloadProducts();
    } catch (e) { toast.error(e.message); }
  };

  const statsKpi = {
    products: products.length,
    orders: orders.length,
    revenue: orders.reduce((s, o) => s + Number(o.total || 0), 0),
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
          <LayoutDashboard className="inline h-7 w-7 mr-2" style={{ color }} />
          Panel Administrador
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
          <Package className="h-8 w-8 opacity-80" />
          <div className="mt-2 text-3xl font-bold">{statsKpi.products}</div>
          <div className="text-sm opacity-90">Productos</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
          <ShoppingCart className="h-8 w-8 opacity-80" />
          <div className="mt-2 text-3xl font-bold">{statsKpi.orders}</div>
          <div className="text-sm opacity-90">Pedidos</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <CreditCard className="h-8 w-8 opacity-80" />
          <div className="mt-2 text-3xl font-bold">{formatoCOP(statsKpi.revenue)}</div>
          <div className="text-sm opacity-90">Ingresos</div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="products"><Package className="h-4 w-4 mr-1" />Productos</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1" />Pedidos</TabsTrigger>
          <TabsTrigger value="reports"><FileText className="h-4 w-4 mr-1" />Reportes</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Clientes</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />Config.</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="flex justify-end mb-3">
            <Button onClick={() => { setEditing({}); setShowForm(true); }} style={{ backgroundColor: color }} className="text-white hover:opacity-90">
              <Plus className="h-4 w-4 mr-1" /> Nuevo producto
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3">Producto</th>
                    <th className="text-left p-3">Categoría</th>
                    <th className="text-right p-3">Precio</th>
                    <th className="text-right p-3">Costo</th>
                    <th className="text-right p-3">Stock</th>
                    <th className="text-right p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.product_id} className="border-b hover:bg-slate-50">
                      <td className="p-3 flex items-center gap-2">
                        <img src={imagenSegura(p.image_url)} alt="" className="w-10 h-10 rounded object-cover" onError={(e) => (e.currentTarget.src = IMAGEN_FALLBACK)} />
                        <span className="font-medium">{p.name}</span>
                      </td>
                      <td className="p-3 text-slate-500">{p.category || '-'}</td>
                      <td className="p-3 text-right font-semibold">{formatoCOP(p.price)}</td>
                      <td className="p-3 text-right text-red-500">{formatoCOP(p.cost_price || 0)}</td>
                      <td className="p-3 text-right">{p.stock}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setShowForm(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => eliminar(p.product_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3">Pedido</th>
                    <th className="text-left p-3">Cliente</th>
                    <th className="text-left p-3">Fecha</th>
                    <th className="text-left p-3">Items</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-right p-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.order_id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">#{o.order_id.slice(0, 8)}</td>
                      <td className="p-3">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-slate-500">{o.customer_email}</div>
                      </td>
                      <td className="p-3 text-slate-500">{new Date(o.created_at).toLocaleDateString('es-CO')}</td>
                      <td className="p-3">{o.items?.length || 0}</td>
                      <td className="p-3 text-right font-semibold">{formatoCOP(o.total)}</td>
                      <td className="p-3 text-right"><Badge className="bg-teal-100 text-teal-800">{o.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <TabReportes stats={stats} configSitio={configSitio} onRefresh={loadStats} color={color} />
        </TabsContent>

        <TabsContent value="users">
          <TabClientes token={token} color={color} />
        </TabsContent>

        <TabsContent value="settings">
          <TabConfiguracion token={token} configSitio={configSitio} onActualizar={onActualizarConfig} color={color} />
        </TabsContent>
      </Tabs>

      <ProductFormDialog open={showForm} product={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={guardar} />
    </div>
  );
}

// =================== APP PRINCIPAL ===================
function App() {
  const auth = useAuth();
  const [view, setView] = useState('home');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productOpen, setProductOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [configSitio, setConfigSitio] = useState({ primary_color: '#0d9488', site_name: 'ErgoVision' });

  const colorPrimario = configSitio?.primary_color || '#0d9488';

  const loadConfig = useCallback(async () => {
    try {
      const c = await api('/settings');
      if (c?.site_name) setConfigSitio(c);
    } catch {}
  }, []);

  const loadProducts = useCallback(async () => {
    try { setProducts(await api('/products')); } catch (e) { console.error(e); }
  }, []);

  const loadCart = useCallback(async () => {
    if (!auth.token) return setCart([]);
    try { setCart(await api('/cart', { token: auth.token })); } catch (e) { console.error(e); }
  }, [auth.token]);

  const loadOrders = useCallback(async () => {
    if (!auth.token) return;
    try { setOrders(await api('/orders', { token: auth.token })); } catch (e) { console.error(e); }
  }, [auth.token]);

  useEffect(() => { loadConfig(); loadProducts(); }, [loadConfig, loadProducts]);
  useEffect(() => { loadCart(); }, [loadCart]);
  useEffect(() => { if (view === 'orders') loadOrders(); }, [view, loadOrders]);

  const addToCart = async (product) => {
    if (!auth.token) { setAuthOpen(true); toast.info('Inicia sesión para agregar al carrito'); return; }
    try {
      await api('/cart', { method: 'POST', body: { product_id: product.product_id, quantity: 1 }, token: auth.token });
      toast.success(`${product.name} agregado al carrito`);
      loadCart();
    } catch (e) { toast.error(e.message); }
  };

  const updateCart = async (id, qty) => {
    try {
      await api(`/cart/${id}`, { method: 'PUT', body: { quantity: qty }, token: auth.token });
      loadCart();
    } catch (e) { toast.error(e.message); }
  };

  const removeCart = async (id) => {
    try {
      await api(`/cart/${id}`, { method: 'DELETE', token: auth.token });
      loadCart();
      toast.success('Eliminado del carrito');
    } catch (e) { toast.error(e.message); }
  };

  const onCheckoutDone = (order) => {
    setLastOrder(order);
    setView('order-success');
    loadCart();
  };

  const cartCount = cart.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Work Sans, sans-serif' }}>
      <Header
        user={auth.user}
        cartCount={cartCount}
        onNav={(v) => setView(v)}
        onLogout={() => { auth.logout(); setView('home'); toast.success('Sesión cerrada'); }}
        onOpenAuth={() => setAuthOpen(true)}
        configSitio={configSitio}
      />

      {view === 'home' && (
        <>
          <Hero onShop={() => setView('catalog')} configSitio={configSitio} />
          <section className="container mx-auto px-4 py-12">
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Destacados</h2>
            <p className="text-slate-600 mb-6">Nuestros lentes más vendidos</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.product_id} product={p} onAdd={addToCart} color={colorPrimario} onView={(prod) => { setSelectedProduct(prod); setProductOpen(true); }} />
              ))}
            </div>
          </section>
        </>
      )}

      {view === 'catalog' && (
        <section className="container mx-auto px-4 py-10">
          <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Catálogo completo</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <ProductCard key={p.product_id} product={p} onAdd={addToCart} color={colorPrimario} onView={(prod) => { setSelectedProduct(prod); setProductOpen(true); }} />
            ))}
          </div>
        </section>
      )}

      {view === 'cart' && (
        <CartView items={cart} color={colorPrimario} onUpdate={updateCart} onRemove={removeCart} onCheckout={() => {
          if (!auth.token) { setAuthOpen(true); return; }
          if (cart.length === 0) { toast.error('Carrito vacío'); return; }
          setView('checkout');
        }} />
      )}

      {view === 'checkout' && (
        <CheckoutView items={cart} user={auth.user} token={auth.token} color={colorPrimario} onSuccess={onCheckoutDone} onBack={() => setView('cart')} />
      )}

      {view === 'order-success' && lastOrder && (
        <OrderSuccess order={lastOrder} color={colorPrimario} onContinue={() => setView('catalog')} />
      )}

      {view === 'orders' && <OrdersView orders={orders} color={colorPrimario} />}

      {view === 'admin' && auth.user?.role === 'admin' && (
        <AdminPanel token={auth.token} products={products} reloadProducts={loadProducts} configSitio={configSitio} onActualizarConfig={loadConfig} color={colorPrimario} />
      )}

      <footer className="bg-slate-900 text-slate-300 mt-16 py-10">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Glasses className="h-6 w-6" style={{ color: colorPrimario }} />
              <span className="text-xl font-bold text-white">{configSitio?.site_name || 'ErgoVision'}</span>
            </div>
            <p className="text-sm">Protege tu visión con la mejor tecnología anti luz azul.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Productos</h4>
            <p className="text-sm">Lentes para gaming, oficina y descanso.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Contacto</h4>
            <p className="text-sm">info@ergovision.com</p>
            <p className="text-sm">SENA · Proyecto Productivo 2025</p>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-6 border-t border-slate-800 text-xs text-center">
          © {new Date().getFullYear()} {configSitio?.site_name || 'ErgoVision'} — MVP
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLogin={(t, u) => auth.login(t, u)} />
      <ProductDetail product={selectedProduct} open={productOpen} onClose={() => setProductOpen(false)} onAdd={addToCart} color={colorPrimario} />
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
