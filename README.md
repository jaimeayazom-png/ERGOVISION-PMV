# ErgoVision Ecommerce - Guia de instalacion local

Ecommerce de lentes con filtro de luz azul, construido en Next.js 15 + Supabase + Resend.

## Requisitos previos

- **Node.js** 18 o superior ([descargar](https://nodejs.org))
- **Yarn** (instalar con `npm install -g yarn`)
- **Visual Studio Code** ([descargar](https://code.visualstudio.com))
- **Git** ([descargar](https://git-scm.com))
- Cuenta de **Supabase** (ya configurada en este proyecto)
- Cuenta de **Resend** para emails (ya configurada en este proyecto)

## Paso a paso para correr en LOCAL desde Visual Studio Code

### 1. Clonar el repositorio

Abre una terminal en VS Code (`Ctrl + ` ` `) y ejecuta:

```bash
git clone https://github.com/jaimeayazom-png/ergovision-ecommerce.git
cd ergovision-ecommerce
```

O si ya descargaste el proyecto adaptado, navega a la carpeta `/app` que contiene el codigo Next.js.

### 2. Abrir el proyecto en VS Code

```bash
code .
```

O desde VS Code: **File > Open Folder...** y selecciona la carpeta del proyecto.

### 3. Crear archivo `.env` en la raiz

En VS Code, crea un archivo nuevo llamado `.env` en la raiz del proyecto con este contenido:

```env
NEXT_PUBLIC_SUPABASE_URL=https://haczrmylftnxwlkwqqzl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhY3pybXlsZnRueHdsa3dxcXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzkzMzUsImV4cCI6MjA5MDY1NTMzNX0.ZTONPCJACR5gbBsl2ZG1iclJx8H73ERUnS9BC6rY3b8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhY3pybXlsZnRueHdsa3dxcXpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3OTMzNSwiZXhwIjoyMDkwNjU1MzM1fQ.E9oqj1lgYUGNB_r6uo6EXAJjjKVulZ2vPMW7aWG9JE0
JWT_SECRET=ergovision-super-secret-key-2025
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=ErgoVision <onboarding@resend.dev>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Instalar dependencias

En la terminal de VS Code:

```bash
yarn install
```

Esto instalara: Next.js, React, Tailwind, shadcn/ui, supabase-js, resend, jspdf, recharts, etc.

### 5. Ejecutar el SQL de migracion en Supabase (solo la primera vez)

Ve a tu proyecto en https://supabase.com -> **SQL Editor** -> New query y ejecuta:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price INTEGER DEFAULT 0;
UPDATE products SET cost_price = ROUND(price * 0.6) WHERE cost_price IS NULL OR cost_price = 0;
```

### 6. Iniciar el servidor de desarrollo

En la terminal de VS Code:

```bash
yarn dev
```

Veras algo como:
```
  ▲ Next.js 15.5.16
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000
  ✓ Ready in 2s
```

### 7. Abrir el navegador

Abre http://localhost:3000 en Chrome, Firefox o Edge.

### 8. Credenciales de prueba

**Administrador:**
- Email: `admin@ergovision.com`
- Contrasena: `admin123`

**Cliente:**
- Email: `cliente@test.com`
- Contrasena: `cliente123`

## Comandos utiles

| Comando | Descripcion |
|---------|-------------|
| `yarn dev` | Inicia servidor de desarrollo en http://localhost:3000 |
| `yarn build` | Construye version optimizada de produccion |
| `yarn start` | Inicia servidor de produccion (despues de build) |

## Solucion de problemas

### Error: "Cannot find module"
```bash
rm -rf node_modules .next
yarn install
yarn dev
```

### Error: "Port 3000 already in use"
Windows:
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```
Linux/Mac:
```bash
lsof -ti:3000 | xargs kill -9
```

### Error de conexion a Supabase
- Verifica que el archivo `.env` exista en la raiz del proyecto
- Confirma que las claves de Supabase sean correctas
- Reinicia el servidor con `Ctrl+C` y `yarn dev`

## Estructura del proyecto

```
ergovision-ecommerce/
├── app/
│   ├── page.js              # Pagina principal (SPA)
│   ├── layout.js            # Layout raiz
│   ├── providers.js         # Providers React
│   ├── globals.css          # Estilos globales
│   └── api/
│       └── [[...path]]/
│           └── route.js     # API backend (todas las rutas /api/*)
├── lib/
│   ├── supabase.js          # Cliente Supabase
│   ├── auth-helpers.js      # JWT, bcrypt, autenticacion
│   ├── email.js             # Envio de emails con Resend
│   └── storage.js           # Subida de imagenes a Supabase Storage
├── components/ui/           # Componentes shadcn/ui
├── .env                     # Variables de entorno (NO subir a git)
├── package.json
└── README.md
```

## Soporte

Proyecto desarrollado para sustentacion SENA - Proyecto Productivo 2025
