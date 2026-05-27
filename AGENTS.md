# CuraTrack — Contexto del repositorio

Documento de contexto para desarrollo local y para agentes de IA. Última actualización: mayo 2026.

## Qué es este repositorio

**CuraTrack** es una aplicación de salud para el seguimiento clínico de heridas complejas (úlceras por presión, pie diabético, quirúrgicas). Proyecto generado con **Lovable** (low-code).

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| Estado / datos | TanStack Query + React Context |
| Backend | **Supabase** (auth, DB, RLS, Edge Functions) |
| Auth OAuth | `@lovable.dev/cloud-auth-js` (Google, etc.) |

No hay backend propio en Node: todo pasa por **Supabase en la nube** (proyecto `oqcvqgewoszurizglkmd`). El frontend solo necesita las variables `VITE_SUPABASE_*` en `.env`.

## Arquitectura funcional

```
Navegador (localhost:8080)
  └── Vite + React
        ├── AppContext / SponsorContext / CartContext
        └── Supabase Cloud
              ├── Auth + OAuth
              ├── PostgreSQL + RLS
              └── Edge Functions (Deno)
```

### Módulos principales

1. **Landing** (`/`) — marketing white-label por sponsor (Convatec, B. Braun, demo).
2. **Auth** (`/login`, `/register`) — email/contraseña, Google, o **login demo** vía Edge Functions.
3. **Clínico** (rol `professional` o `admin`) — pacientes, casos de herida, evoluciones, agenda, asistente IA.
4. **Sponsor** (rol `sponsor`) — panel, reportes, estadísticas.
5. **Marketplace** — catálogo de insumos del laboratorio, carrito, pedidos.
6. **Admin** — productos, pedidos, cuentas.

### Roles

- **`user_roles`** (rol de app): `admin` | `sponsor` | `professional`
- **`profiles.role`** (especialidad clínica): `enfermero` | `medico` | `admin`

`RoleGuard` (`src/components/RoleGuard.tsx`) protege rutas según el rol de app.

### Rutas protegidas (resumen)

| Grupo | Rutas | Roles |
|-------|-------|-------|
| Clínico | `/dashboard`, `/patients`, `/cases`, `/curation/new`, `/agenda`, `/assistant` | `professional`, `admin` |
| Sponsor | `/sponsor`, `/reports`, `/statistics` | `sponsor`, `admin` |
| Compartido | `/marketplace`, `/orders`, `/settings` | todos los autenticados |
| Admin | `/admin/products`, `/admin/orders`, `/admin/accounts` | `admin` |

### Datos y migración

- **Pacientes, casos, evoluciones, pedidos, marketplace** → Supabase (tablas con RLS).
- **`src/data/demoUsers.ts`** — legado de demo en localStorage; la app ya migró auth y pacientes a Supabase (**Fase 1** en `src/context/AppContext.tsx`). Casos/evoluciones también se cargan desde Supabase cuando hay sesión.
- **`src/data/demoData.ts`** — seeds de datos demo para UI.

Comentario en `AppContext.tsx`: Fase 1 = auth + patients en Supabase; el comentario original mencionaba casos en memoria, pero el código actual también consulta `wound_cases` y `evolutions`.

### White-label (sponsors)

`SponsorContext` carga sponsors desde Supabase, aplica tema CSS por colores del laboratorio y persiste `active_sponsor_slug` en localStorage.

URLs con sponsor: `/login?sponsor=convatec`, `/login?sponsor=bbraun`, `/?sponsor=demo`.

### Edge Functions (`supabase/functions/`)

| Función | Uso |
|---------|-----|
| `demo-login` | Cuenta demo profesional (rotación de password server-side, devuelve tokens) |
| `demo-admin-login` | Cuenta demo laboratorio/sponsor |
| `nurse-assistant` | Chat IA en `/assistant` |
| `generate-evolution-summary` | Resúmenes de evoluciones |

## Desarrollo local

### Requisitos

- Node.js 18+ (probado con v22)
- npm

### Comandos

```powershell
cd c:\dev\care-platform-v4
npm install
npm run dev
```

- **Puerto:** `8080` (definido en `vite.config.ts`)
- **URL local:** http://localhost:8080/

Otros scripts: `npm run build`, `npm run preview`, `npm test` (vitest).

### Variables de entorno (`.env`)

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

Sin estas variables el cliente en `src/integrations/supabase/client.ts` no funciona.

**No commitear** secretos (`SERVICE_ROLE_KEY`, etc.). Solo claves públicas/anónimas en el frontend.

### Probar la app sin cuenta propia

1. Abrir http://localhost:8080/login
2. Usar tarjetas de demo por laboratorio:
   - **Profesional** → invoca `demo-login` → dashboard clínico
   - **Laboratorio** → invoca `demo-admin-login` → `/admin/orders`

También: email/contraseña o Google (`loginWithGoogle` vía `src/integrations/lovable`).

### Qué NO hace falta para dev local habitual

- No hay `docker-compose` en el repo.
- No es obligatorio Supabase local: el proyecto apunta al **Supabase remoto de Lovable**.

### Supabase 100% local (opcional, avanzado)

Requiere Docker + Supabase CLI:

```powershell
supabase start
supabase db reset   # aplica supabase/migrations/
# Desplegar functions y configurar secrets (SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, etc.)
```

Hay que reconfigurar `.env` con URL local y desplegar Edge Functions.

## Estructura del código

```
src/
  pages/          # Pantallas (Dashboard, Patients, Marketplace, etc.)
  components/     # UI + layout (AppSidebar, RoleGuard, SharePatientDialog, etc.)
  context/        # AppContext, SponsorContext, CartContext
  integrations/   # supabase/client, lovable auth
  data/           # demoData, demoUsers (seeds / legado)
  hooks/          # useAppRole, use-mobile, use-toast
  lib/            # utils, exportPdf, patientStatus, etc.
supabase/
  migrations/     # Esquema PostgreSQL (patients, wound_cases, labs, sponsors, orders, etc.)
  functions/      # Edge Functions Deno
  config.toml     # project_id del proyecto Supabase
public/           # favicon, assets estáticos
.lovable/memory/  # Memoria de diseño/features del proyecto Lovable (no es runtime)
```

## Archivos clave

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/App.tsx` | Rutas y `RoleGuard` |
| `src/context/AppContext.tsx` | Auth Supabase, pacientes, casos, evoluciones |
| `src/context/SponsorContext.tsx` | Tema y sponsor activo |
| `src/context/CartContext.tsx` | Carrito y pedidos marketplace |
| `src/pages/Login.tsx` | Login, demo, Google, forgot password |
| `src/hooks/useAppRole.tsx` | Rol canónico desde `user_roles` |
| `src/integrations/supabase/client.ts` | Cliente Supabase (auto-generado, no editar a mano) |
| `src/integrations/lovable/index.ts` | OAuth Lovable → sesión Supabase |

## Tablas Supabase (principales)

Definidas en `supabase/migrations/`:

- **Clínico:** `profiles`, `patients`, `wound_cases`, `evolutions`, `patient_consents`, `evolution_signatures`
- **Roles:** `user_roles`
- **Sponsors:** `sponsors`, `user_sponsor`, `labs`, `user_lab_sponsors`
- **Marketplace:** `lab_products`, `product_categories`, `cart_items`, `supply_orders`, `supply_order_items`, `lab_sellers`, `seller_assignments`

## Branding (desde `.lovable/memory`)

- Marca: **CuraTrack**
- Logo: `src/assets/curatrack-logo.png`
- Paleta: azul primario `hsl(217 89% 38%)`, verde `hsl(142 71% 45%)`
- Tipografía: Montserrat (títulos), Open Sans (cuerpo)

## Convenciones para contribuir

- Alias de imports: `@/` → `src/`
- UI: componentes en `src/components/ui/` (shadcn)
- Idioma de la UI: español
- No editar `src/integrations/supabase/client.ts` ni types generados sin regenerar
- Minimizar scope en cambios; seguir patrones existentes de Context + supabase queries
- Commits/PRs solo cuando el usuario lo pida explícitamente

## Problemas conocidos

- Warning CSS en dev: `@import` de Google Fonts después de `@tailwind` en `src/index.css` (no bloquea la app).
- `README.md` en raíz está vacío (TODO Lovable); este `AGENTS.md` es la fuente de contexto operativo.

## Resumen rápido

| Pregunta | Respuesta |
|----------|-----------|
| ¿Qué es? | Plataforma clínica multi-sponsor para heridas + marketplace de insumos |
| ¿Cómo corre local? | `npm install` + `npm run dev` → puerto **8080** |
| ¿Qué backend? | Supabase remoto (`.env` con `VITE_SUPABASE_*`) |
| ¿Entrar sin cuenta? | Botones **Profesional** / **Laboratorio** en `/login` |
