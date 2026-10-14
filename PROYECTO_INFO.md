# ErgoVision Ecommerce - Documentacion Tecnica

## Resumen del Proyecto

**ErgoVision** es una tienda online (ecommerce) especializada en la venta de lentes con filtro de luz azul. Esta diseñada para ofrecer una experiencia de compra completa con gestion de productos, carrito, checkout simulado, panel administrativo con reportes financieros y notificaciones por email.

**Objetivo:** Brindar una solucion completa de comercio electronico para la marca ErgoVision con funcionalidades para clientes y administradores.

**Tipo:** MVP (Producto Minimo Viable) - Proyecto Productivo SENA 2025

---

## 1. Stack Tecnologico

### Frontend
| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **Next.js** | 15.5.16 | Framework React full-stack (App Router) |
| **React** | 18.3.1 | Biblioteca de interfaz de usuario |
| **Tailwind CSS** | 3.4.1 | Framework de estilos utility-first |
| **shadcn/ui** | latest | Componentes UI reutilizables (Radix UI + Tailwind) |
| **Recharts** | 2.15.3 | Graficas (barras, pie chart) para reportes |
| **Lucide React** | 0.516.0 | Iconos vectoriales modernos |
| **Sonner** | 2.0.5 | Notificaciones toast |
| **jsPDF + autotable** | 6.x | Generacion de PDF financieros |

### Backend (API Routes Next.js)
| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **Next.js API Routes** | 15.5.16 | Endpoints REST en `/api/*` |
| **Supabase JS Client** | 2.108.2 | Cliente PostgreSQL via Supabase |
| **bcryptjs** | 3.0.3 | Hash de contrasenas |
| **jsonwebtoken** | 9.0.3 | Autenticacion JWT |
| **Resend** | 6.16.0 | Envio de emails transaccionales |

### Base de Datos
| Tecnologia | Proposito |
|------------|-----------|
| **Supabase (PostgreSQL)** | BD relacional en la nube |
| **Supabase Storage** | Almacenamiento de imagenes de productos |

### Servicios Externos
| Servicio | Uso |
|----------|-----|
| **Supabase** | Base de datos PostgreSQL + Storage |
| **Resend** | Envio de correos de confirmacion de pedido |

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                  NAVEGADOR (Cliente)                     │
│  - HTML + CSS + JavaScript (React)                       │
│  - localStorage (token JWT)                              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────┐
│           NEXT.JS (Frontend + Backend)                   │
│  ┌──────────────────────┐  ┌───────────────────────┐   │
│  │  PAGES (React SPA)   │  │  API ROUTES (/api/*)  │   │
│  │  - Home/Catalogo     │  │  - Auth (login/reg)   │   │
│  │  - Carrito           │  │  - Productos CRUD     │   │
│  │  - Checkout          │  │  - Carrito            │   │
│  │  - Panel Admin       │  │  - Ordenes            │   │
│  └──────────────────────┘  │  - Stats/Reportes     │   │
│                            │  - Settings           │   │
│                            │  - Usuarios           │   │
│                            └──────────┬────────────┘   │
└─────────────────────────────┬─────────┼────────────────┘
                              │         │
         ┌────────────────────┘         └──────────────┐
         ▼                                              ▼
┌─────────────────────┐                    ┌──────────────────────┐
│  SUPABASE (PostgreSQL) │                 │   RESEND (Email API)  │
│  - users               │                 │   - SMTP transactional│
│  - products            │                 │   - Templates HTML    │
│  - cart_items          │                 └──────────────────────┘
│  - orders              │
│  - order_items         │
│  - site_settings       │
│  - Storage (bucket)    │
└─────────────────────┘
```

**Patron arquitectonico:** SPA (Single Page Application) + REST API + BD relacional en la nube

---

## 3. Estructura de la Base de Datos

### Tabla `users` (Usuarios)
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `user_id` | UUID (PK) | Identificador unico |
| `email` | VARCHAR(255) UNIQUE | Email del usuario |
| `name` | VARCHAR(255) | Nombre completo |
| `password_hash` | VARCHAR(255) | Hash bcrypt de la contrasena |
| `role` | VARCHAR(50) | `customer` o `admin` |
| `picture` | VARCHAR(500) | URL de foto de perfil (opcional) |
| `created_at` | TIMESTAMP | Fecha de registro |

### Tabla `products` (Productos)
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `product_id` | UUID (PK) | Identificador unico |
| `name` | VARCHAR(255) | Nombre del producto |
| `description` | TEXT | Descripcion detallada |
| `price` | INTEGER | Precio de venta (en COP) |
| `cost_price` | INTEGER | **Costo unitario (para reportes)** |
| `image_url` | VARCHAR(500) | URL de la imagen |
| `category` | VARCHAR(100) | Categoria |
| `stock` | INTEGER | Unidades disponibles |
| `created_at` | TIMESTAMP | Fecha de creacion |
| `updated_at` | TIMESTAMP | Fecha de ultima actualizacion |

### Tabla `cart_items` (Items del Carrito)
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `cart_item_id` | UUID (PK) | Identificador unico |
| `user_id` | UUID (FK -> users) | Dueño del carrito |
| `product_id` | UUID (FK -> products) | Producto agregado |
| `quantity` | INTEGER | Cantidad |
| `created_at` | TIMESTAMP | Fecha de adicion |

### Tabla `orders` (Pedidos)
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `order_id` | UUID (PK) | Identificador unico |
| `user_id` | UUID (FK -> users) | Cliente que hizo el pedido |
| `total` | INTEGER | Total en COP |
| `status` | VARCHAR(50) | `pending`, `completed`, `cancelled` |
| `customer_email` | VARCHAR(255) | Email para confirmacion |
| `customer_name` | VARCHAR(255) | Nombre del cliente |
| `created_at` | TIMESTAMP | Fecha del pedido |

### Tabla `order_items` (Detalle de Pedidos)
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `order_item_id` | UUID (PK) | Identificador unico |
| `order_id` | UUID (FK -> orders) | Pedido al que pertenece |
| `product_id` | UUID (FK -> products) | Producto vendido |
| `product_name` | VARCHAR(255) | Nombre (snapshot) |
| `quantity` | INTEGER | Unidades vendidas |
| `price` | INTEGER | Precio al momento de venta |

### Tabla `site_settings` (Personalizacion)
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `setting_id` | UUID (PK) | Identificador unico |
| `site_name` | VARCHAR(100) | Nombre del ecommerce |
| `primary_color` | VARCHAR(7) | Color primario (#hex) |
| `font_family_heading` | VARCHAR(100) | Tipografia titulos |
| `font_family_body` | VARCHAR(100) | Tipografia cuerpo |
| `logo_url` | VARCHAR(500) | URL del logo |
| `updated_at` | TIMESTAMP | Ultima actualizacion |

### Diagrama de Relaciones (DER)

```
  users 1 ─────< N cart_items >───── 1 products
    │                                   │
    │ 1                               1 │
    │                                   │
    └────< N orders >───── N order_items ──┘
                          (snapshot del producto)
```

---

## 4. Componentes y Modulos del Sistema

### 4.1 Modulo Publico (sin login)
- **Landing Page (Hero):** Banner principal con call-to-action y mensaje de marca
- **Catalogo de Productos:** Grid responsivo con todos los productos
- **Vista Detalle:** Modal con descripcion completa y opcion "Agregar al carrito"
- **Autenticacion:** Modal con login y registro

### 4.2 Modulo Cliente (rol customer)
- **Carrito de Compras:** Lista de items, modificar cantidad, eliminar
- **Checkout:** Formulario de datos + simulacion de pago con tarjeta
- **Confirmacion:** Pantalla de exito con resumen del pedido
- **Email automatico:** Confirmacion enviada al correo del cliente
- **Mis Pedidos:** Historial de compras realizadas

### 4.3 Modulo Administrador (rol admin)
**Dashboard KPI:**
- Total de productos
- Total de pedidos
- Ingresos acumulados

**5 Pestañas funcionales:**

1. **Productos**
   - Tabla con todos los productos (imagen, nombre, categoria, precio, costo, stock)
   - Crear nuevo producto (con upload de imagen local o URL)
   - Editar producto existente
   - Eliminar producto (con confirmacion)
   - Indicador de margen de ganancia en tiempo real

2. **Pedidos**
   - Lista completa de pedidos de todos los clientes
   - Detalle: cliente, email, fecha, items, total, estado

3. **Reportes Financieros**
   - **KPIs financieros:** Ingresos, Costos, Ganancia, Margen %
   - **Grafico de barras:** Top 8 productos mas vendidos (unidades)
   - **Grafico circular:** Distribucion de ingresos por producto
   - **Tabla de ganancia:** Producto, unidades, ingresos, costos, ganancia neta
   - **Descarga PDF:** Reporte quincenal completo en formato PDF profesional

4. **Clientes**
   - Lista de todos los usuarios registrados
   - Crear nuevo usuario (cliente o admin)
   - Eliminar usuarios (excepto el propio admin)

5. **Configuracion**
   - Modificar nombre del ecommerce
   - Cambiar color primario (paleta predefinida + selector custom)
   - Modificar tipografias (titulos y body)
   - Subir logo personalizado
   - Vista previa en vivo

---

## 5. API REST Endpoints

### Autenticacion
| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registrar usuario | Publico |
| POST | `/api/auth/login` | Login con email/password | Publico |
| GET | `/api/auth/me` | Obtener usuario actual | JWT |

### Productos
| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/api/products` | Listar todos los productos | Publico |
| GET | `/api/products/:id` | Obtener un producto | Publico |
| POST | `/api/admin/products` | Crear producto | Admin |
| PUT | `/api/admin/products/:id` | Actualizar producto | Admin |
| DELETE | `/api/admin/products/:id` | Eliminar producto | Admin |

### Carrito
| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/api/cart` | Listar items del carrito | JWT |
| POST | `/api/cart` | Agregar producto al carrito | JWT |
| PUT | `/api/cart/:id` | Actualizar cantidad | JWT |
| DELETE | `/api/cart/:id` | Eliminar item | JWT |

### Pedidos
| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | `/api/orders` | Crear pedido (checkout + email) | JWT |
| GET | `/api/orders` | Mis pedidos | JWT |
| GET | `/api/admin/orders` | Todos los pedidos | Admin |

### Administracion
| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/users` | Listar usuarios | Admin |
| POST | `/api/admin/users` | Crear usuario | Admin |
| DELETE | `/api/admin/users/:id` | Eliminar usuario | Admin |
| GET | `/api/admin/stats` | Estadisticas para reportes | Admin |
| GET | `/api/settings` | Configuracion publica | Publico |
| PUT | `/api/admin/settings` | Actualizar configuracion | Admin |

---

## 6. Flujos Principales (User Flows)

### Flujo: Cliente realiza una compra
1. Cliente entra al sitio → ve catalogo
2. Hace clic en "Agregar" en un producto
3. Si no esta logueado → modal de login/registro
4. Sistema agrega al carrito (POST `/api/cart`)
5. Cliente va al carrito y revisa items
6. Cliente da clic en "Proceder al pago" → checkout
7. Llena datos y simula pago con tarjeta
8. Sistema crea orden (POST `/api/orders`):
   - Inserta `orders` con total
   - Inserta `order_items` con cada producto
   - Vacia `cart_items` del usuario
   - Envia email de confirmacion via Resend
9. Cliente ve pantalla de exito con detalle
10. Cliente recibe email con factura HTML

### Flujo: Admin gestiona productos
1. Admin inicia sesion
2. Va a panel Admin → pestaña Productos
3. Hace clic en "Nuevo producto"
4. Llena formulario:
   - Nombre, descripcion, categoria
   - Precio de venta y costo unitario (para reportes)
   - Stock
   - Imagen (sube archivo local o pega URL)
5. Al subir imagen local:
   - Cliente convierte a base64
   - Backend recibe en POST `/api/admin/products`
   - Backend sube a Supabase Storage
   - Guarda URL publica en `products.image_url`
6. Producto aparece automaticamente en el catalogo publico

### Flujo: Admin descarga reporte quincenal
1. Admin va a Reportes
2. Sistema carga estadisticas (GET `/api/admin/stats`)
3. Muestra KPIs y graficos
4. Admin hace clic en "Descargar PDF Quincenal"
5. Frontend genera PDF con jsPDF:
   - Encabezado con marca
   - Resumen ejecutivo (ingresos, costos, ganancia, margen)
   - Top productos vendidos con ganancia neta
   - Detalle de pedidos
6. Archivo se descarga automaticamente al PC del admin

---

## 7. Seguridad

- **Contrasenas:** Hash bcrypt con factor 10 (no se guardan en texto plano)
- **Autenticacion:** JWT con expiracion de 7 dias
- **Autorizacion:** Middleware verifica rol `admin` en endpoints sensibles
- **CORS:** Configurado para aceptar peticiones del frontend
- **Variables sensibles:** En archivo `.env` (excluido de git)
- **SQL Injection:** Protegido por Supabase Client (parametrizado)
- **XSS:** React escapa automaticamente el HTML renderizado

---

## 8. Caracteristicas Tecnicas Destacadas

### Diseño Responsive
- Mobile-first con Tailwind CSS
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Grid adaptable: 1 columna en mobile → 4 en desktop

### Personalizacion Dinamica
- Colores se aplican dinamicamente desde la BD via `style={{ backgroundColor: color }}`
- El nombre del sitio, logo, y colores se actualizan en tiempo real al guardar configuracion

### Sistema de Reportes Financieros
- Calcula margen de ganancia por producto
- Identifica productos top por unidades vendidas
- Genera PDF profesional listo para imprimir
- Calculos: `Ingresos = sum(price * qty)`, `Costos = sum(cost_price * qty)`, `Ganancia = Ingresos - Costos`

### Notificaciones por Email
- Email HTML responsive con la marca del ecommerce
- Tabla con detalle de productos comprados
- Total destacado en el color primario del sitio
- Footer con copyright dinamico

### Upload de Imagenes
- Frontend convierte archivo a base64
- Backend detecta formato `data:image/...` y sube a Supabase Storage
- Crea bucket `product-images` automaticamente la primera vez
- Genera URLs publicas accesibles desde cualquier navegador

---

## 9. Credenciales y Datos de Prueba

### Usuarios pre-cargados
| Email | Contrasena | Rol |
|-------|------------|-----|
| `admin@ergovision.com` | `admin123` | admin |
| `cliente@test.com` | `cliente123` | customer |

### Productos de muestra
- 8 productos pre-cargados en Supabase
- Imagenes de Unsplash
- Precios entre $69.000 y $190.000 COP
- Stock variable de 5 a 25 unidades

### Tarjeta de prueba (checkout)
- Numero: `4242 4242 4242 4242`
- CVV: `123`
- Expiracion: `12/27`

---

## 10. Posibles Mejoras Futuras

- Integracion con pasarela real de pagos (Wompi, PayU, Stripe)
- Sistema de descuentos y cupones
- Reseñas y valoraciones de productos
- Recuperacion de contrasena por email
- Filtros avanzados de busqueda en el catalogo
- Notificaciones push para pedidos
- Dashboard con graficos temporales (ventas por mes)
- Multi-idioma (i18n)
- App movil con React Native

---

## 11. Metodologia de Desarrollo

**Metodologia:** Agil con enfoque MVP (Producto Minimo Viable)

**Fases:**
1. Analisis de requerimientos
2. Diseño de base de datos (DER)
3. Desarrollo iterativo backend → frontend
4. Pruebas funcionales
5. Documentacion

**Herramientas usadas:**
- VS Code (IDE)
- Git/GitHub (control de versiones)
- Supabase Studio (gestion de BD)
- Resend Dashboard (emails)
- Postman/curl (pruebas API)

---

## 12. Conclusion

ErgoVision representa una solucion completa de comercio electronico que integra:
- Una experiencia de usuario moderna y profesional
- Un sistema robusto de gestion administrativa
- Reportes financieros de calidad empresarial
- Comunicacion automatizada via email
- Personalizacion completa de la marca

El uso de **Next.js + Supabase + Resend** permite tener una arquitectura **serverless, escalable y con bajo costo de mantenimiento**, ideal para startups y proyectos en crecimiento.

---

**Autor:** Proyecto Productivo SENA  
**Año:** 2025  
**Marca:** ErgoVision - Lentes con filtro de luz azul
