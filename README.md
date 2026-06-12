# BDC Control Mayoristas

PWA de control de ventas mayoristas para vigilantes de Bodegas del Canasto.

---

## Credenciales de prueba

| Cédula | Tienda | Contraseña |
|--------|--------|------------|
| 1020456789 | BDC-001 Bogotá Américas | bdc2024 |
| 52345678 | BDC-002 Bogotá Kennedy | bdc2024 |
| 71234567 | BDC-003 Medellín Itagüí | bdc2024 |

---

## Despliegue

### 1. Base de datos — Supabase

1. Ir a https://supabase.com → New project
2. Abrir SQL Editor
3. Pegar y ejecutar el contenido de `database/schema.sql`
4. Copiar la **Connection String (Transaction Pooler)** desde Settings → Database

---

### 2. Backend — Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Crear proyecto desde la carpeta backend/
cd backend
railway init
railway up
```

Variables de entorno en Railway:
```
DATABASE_URL=postgresql://...  (string de Supabase)
SECRET_KEY=genera-una-clave-larga-y-segura
CORS_ORIGINS=https://tu-app.vercel.app
```

---

### 3. Frontend — Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Desde la carpeta frontend/
cd frontend
npm install
vercel
```

Variable de entorno en Vercel:
```
VITE_API_URL=https://tu-backend.railway.app
```

---

## Desarrollo local

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # editar con tu DATABASE_URL local
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env   # editar VITE_API_URL=http://localhost:8000
npm run dev
```

---

## Estructura

```
bdc-mayoristas/
├── database/
│   └── schema.sql          # Ejecutar en Supabase
├── backend/                # FastAPI → Railway
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   └── vigilante.py
│   │   └── middleware/
│   │       └── security.py
│   ├── requirements.txt
│   └── railway.toml
└── frontend/               # React/Vite/Tailwind → Vercel
    ├── src/
    │   ├── components/
    │   │   ├── Login.jsx
    │   │   ├── AppShell.jsx
    │   │   ├── tabs/
    │   │   │   ├── TabPendientes.jsx
    │   │   │   ├── TabRegistrar.jsx
    │   │   │   └── TabAnomalia.jsx
    │   │   ├── detail/
    │   │   │   └── VentaDetalle.jsx
    │   │   └── flujos/
    │   │       └── FlujoRetiro.jsx
    │   ├── services/
    │   │   └── api.js
    │   └── store/
    │       └── useStore.js
    ├── package.json
    └── vercel.json
```

---

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /auth/login | Login del vigilante |
| POST | /auth/logout | Cierre de turno |
| GET | /vigilante/ventas-activas | Lista de ventas pendientes |
| GET | /vigilante/buscar?q= | Búsqueda por factura |
| GET | /vigilante/factura/{num} | Detalle completo |
| POST | /vigilante/ventas/registrar | Registrar nueva venta |
| POST | /vigilante/factura/{num}/confirmar-llegada | Paso 1 del retiro |
| POST | /vigilante/factura/{num}/confirmar-entrega | Sello digital |
| POST | /vigilante/factura/{num}/formato-adicional | GVM-001 adicional |
| POST | /vigilante/reportar-anomalia | Reporte de novedad |
| GET | /vigilante/clientes/buscar?q= | Búsqueda de clientes |
