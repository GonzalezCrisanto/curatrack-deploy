
# Plan: Transformación a MVP SaaS white-label para laboratorios sponsor

Mantenemos intacta toda la lógica clínica (pacientes, casos, evoluciones, fotos, IA, PDF, firmas, consentimientos). El cambio es de **capa de presentación + identidad + métricas comerciales**, más una capa fina de configuración sponsor en DB.

---

## 1. Capa de Sponsor (DB + frontend)

### Migración
- Tabla `sponsors` (id, slug, sponsor_name, app_name, logo_url, primary_color, secondary_color, accent_color, catalog_name, sponsor_label, support_email, sales_contact_label, powered_by_label, legal_footer, lab_id FK→labs nullable, is_active).
- Tabla `user_sponsor` (user_id, sponsor_id) para asignar sponsor activo por usuario.
- RLS: `sponsors` lectura para `authenticated` + anónimos (necesario para Landing pre-login con `?sponsor=`); escritura solo `admin`. `user_sponsor` lectura propio + admin escribe.
- Seed de 3 sponsors demo: `bbraun`, `convatec`, `demo` con colores y `lab_id` mapeados (vinculado a `labs` existentes; si no existen, se crean en la misma migración).

### `SponsorContext` (`src/context/SponsorContext.tsx`)
- Resuelve sponsor activo en orden: `?sponsor=slug` (URL) → `user_sponsor` (si logueado) → localStorage → `demo`.
- Expone `sponsor`, `setSponsorBySlug(slug)`, `loading`.
- Inyecta CSS variables (`--primary`, `--secondary`, `--accent`) en `:root` al cambiar sponsor → todo el sistema de tokens existente se re-tematiza sin tocar componentes.
- Provider montado en `App.tsx` envolviendo el resto.

### Reglas white-label
- Hook `useSponsor()` para `appName`, `sponsorName`, `logoUrl`, `catalogName`, `supportEmail`, `legalFooter`.
- Reemplazar todos los strings hardcodeados (`<title>` en `index.html` se vuelve dinámico vía `<DocumentTitle>` component y `useEffect`).

---

## 2. Settings → selector de sponsor (modo demo)

- Nueva sección "Identidad de plataforma" en `Settings.tsx`.
- Dropdown con los 3 sponsors. Al elegir: upsert en `user_sponsor` + actualiza contexto + recarga tokens.
- Visible para todos los usuarios en demo; en producción real se ocultaría detrás de admin.

---

## 3. Rediseño visual global

### Tokens (`src/index.css`, `tailwind.config.ts`)
- Reemplazar `--brand-green` / `--brand-blue` hardcodeados por tokens `--primary`, `--secondary`, `--accent` controlados por `SponsorContext`.
- Mantener tipografías Montserrat / Open Sans.
- Definir tokens semánticos adicionales para cards comerciales, métricas KPI, badges sponsor.

### Sidebar (`src/components/AppSidebar.tsx`)
Reorganizar a 12 secciones pedidas:
1. Dashboard / 2. Pacientes / 3. Casos de heridas (vista nueva agregada) / 4. Nueva curación / 5. Agenda (nueva) / 6. Catálogo clínico (rename Marketplace) / 7. Solicitudes de reposición (rename Orders) / 8. Panel Sponsor (nueva) / 9. Estadísticas / 10. Asistente clínico / 11. Reportes (nueva, agregadora) / 12. Configuración.

Logo y `appName` desde `useSponsor()`.

---

## 4. Páginas nuevas / rediseñadas

### Landing (`src/pages/Landing.tsx`) — rediseño completo
- Lee `?sponsor=bbraun|convatec|demo` y aplica sponsor.
- Hero, problema, solución, "Para laboratorios", "Para enfermeros", métricas, seguridad, CTA demo.
- Logo + `appName` + colores del sponsor activo.

### Dashboard (`src/pages/Dashboard.tsx`) — rediseño
- KPIs clínicos + comerciales (productos sponsor recomendados, solicitudes generadas).
- Sección "Actividad reciente" + "Oportunidades detectadas".

### Panel Sponsor (`src/pages/SponsorPanel.tsx`) — nueva
- KPIs: reales (suscripciones, enfermeros, pacientes, curaciones, productos recomendados, solicitudes, valor estimado) + funnel/ranking mockeado.
- Secciones: resumen ejecutivo, adopción, productos más recomendados, embudo comercial, oportunidades, reporte mensual.
- Título dinámico: "Panel Sponsor {sponsorName}".
- Sin datos identificables de pacientes (solo agregados).

### Catálogo clínico (`src/pages/Marketplace.tsx`) — rediseño
- Filtra `lab_products` por `sponsor.lab_id`.
- Ficha con indicaciones, heridas relacionadas, badge "Producto sponsor", botones "Agregar a reposición" y "Solicitar al vendedor".

### Solicitudes de reposición (`src/pages/Orders.tsx`) — rediseño visual
- Tabla con fecha, profesional, institución, productos, estado, acciones (ver, copiar, exportar PDF).
- Header con sponsor activo.

### Estadísticas (`src/pages/Statistics.tsx`) — tabs
- Tab "Clínicas agregadas" (ya existe, adaptar).
- Tab "Comerciales para laboratorio" (nuevo): adopción, demanda, funnel, productos, sin PII.
- Filtros: período, tipo herida, categoría producto, profesional, institución.

### Agenda (`src/pages/Agenda.tsx`) — nueva, simple
- Vista calendario/lista de próximos controles derivados de `evolutions.next_control`.

### Reportes (`src/pages/Reports.tsx`) — nueva, agregadora
- Lista de reportes disponibles (clínico por paciente, comercial sponsor mensual).

---

## 5. Reportes PDF white-label

`src/lib/exportPdf.ts` y demás generadores en `CaseDetail.tsx`, `Assistant.tsx`, `Statistics.tsx`:
- Header con `logoUrl`, `appName`, `sponsorName`.
- Footer con `legalFooter`.
- Reportes comerciales sin PII.

---

## 6. Asistente IA

- Renombrar UI a "Asistente clínico" (`src/pages/Assistant.tsx`). System prompt en edge function sin cambios funcionales; solo textos visibles.

---

## 7. Limpieza white-label

- `index.html` → `<title>` dinámico desde sponsor (componente `DocumentTitle` que use `useSponsor`).
- Reemplazar `<title>CuraTrack — …</title>` en `Statistics.tsx` y otros window.print por `${appName}`.
- Cualquier mención visible queda parametrizada.

---

## Detalles técnicos

**Archivos nuevos**
- `supabase/migrations/<ts>_sponsors.sql`
- `src/context/SponsorContext.tsx`
- `src/hooks/useSponsor.ts`
- `src/components/DocumentTitle.tsx`
- `src/components/SponsorLogo.tsx`
- `src/components/sponsor/KpiCard.tsx`, `Funnel.tsx`, `OpportunityList.tsx`
- `src/pages/SponsorPanel.tsx`
- `src/pages/Agenda.tsx`
- `src/pages/Reports.tsx`
- `src/lib/sponsorMetrics.ts` (mezcla real+mock)

**Archivos modificados**
- `src/App.tsx` (provider + rutas nuevas)
- `src/components/AppSidebar.tsx`
- `src/pages/Landing.tsx`, `Dashboard.tsx`, `Marketplace.tsx`, `Orders.tsx`, `Statistics.tsx`, `Settings.tsx`, `Assistant.tsx`
- `src/lib/exportPdf.ts`
- `src/index.css`, `tailwind.config.ts` (tokens dinámicos)
- `index.html` (title genérico, se sobreescribe en runtime)

**No se toca**
- `src/integrations/supabase/client.ts`, `types.ts`, `.env`
- Schemas existentes de `patients`, `wound_cases`, `evolutions`, `photos`, `evolution_signatures`, `patient_consents`
- RLS existentes
- Lógica de auth, demo-login, edge functions clínicas

---

## Orden de ejecución

1. Migración `sponsors` + `user_sponsor` + seed (B. Braun, Convatec, Demo) + mapeo a `labs`.
2. `SponsorContext` + tokens CSS dinámicos + selector en Settings.
3. Sidebar nuevo + rutas nuevas (placeholders).
4. Landing rediseñada con `?sponsor=`.
5. Dashboard + Panel Sponsor + Estadísticas tab comercial.
6. Marketplace filtrado por `lab_id` + Solicitudes rediseñadas.
7. Reportes PDF white-label + Agenda + Reports page.
8. QA visual por sponsor (los 3) y verificación de que el flujo clínico sigue intacto.
