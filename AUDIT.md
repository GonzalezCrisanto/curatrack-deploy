# CuraTrack — Audit de Base de Datos y Código

Resultado del análisis exhaustivo realizado sobre las 29 migraciones, las 22 tablas del schema,
el flujo de datos frontend↔Supabase, y la calidad del código en `src/`.

---

## Conexión a la base de datos

La aplicación está conectada a **una sola base de datos** — un proyecto Supabase en la nube con
ID `oqcvqgewoszurizglkmd`, alojado en Lovable. El cliente frontend usa dos variables de entorno:
`VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. No existe ningún backend Node propio ni
una segunda base de datos.

---

## Objetivo inmediato — Prueba con enfermeros reales

El objetivo a corto plazo es que entre 1 y 5 enfermeros puedan probar el flujo clínico real
ingresando con su propio email. El marketplace, el carrito y las órdenes de insumos pueden
quedar desactivados o rotos por ahora — no son parte de la prueba.

### Cómo crear las cuentas (sin tocar código)

1. Ir al dashboard de Supabase → **Authentication → Users → Invite user**
2. Cargar el email de cada enfermero
3. Supabase manda un magic link al email
4. Al hacer click, el usuario queda registrado y el trigger `handle_new_user` le asigna
   automáticamente el rol `professional` en `user_roles`

No hace falta código adicional para esto.

### Bugs que HAY QUE resolver antes de que prueben

Estos bugs rompen el flujo clínico normal. Sin arreglarlos, la experiencia de prueba no
tiene validez porque los datos no persisten correctamente.

| Prioridad | Bug | Qué rompe |
|---|---|---|
| 🔴 1 | Seguridad migración 28 — cualquier usuario puede escribir en la cuenta de otro | Con 5 usuarios reales, los datos se pueden cruzar entre enfermeros |
| 🔴 2 | Seguridad migración 29 — cualquier usuario puede modificar el catálogo | Riesgo sobre datos compartidos |
| 🔴 3 | C-5 — datos demo contaminan pacientes reales por coincidencia de nombre | Un paciente real puede mostrar historia clínica falsa |
| 🔴 4 | 3.2 — Evoluciones del formulario de `CaseDetail` son in-memory | Todo lo que el enfermero carga en el detalle del caso desaparece al recargar |
| 🔴 5 | C-6 — `patientToRow()` borra campos clínicos en cada guardado | Cada edición de paciente elimina datos ya cargados |
| 🟡 6 | 3.3 — Cierre de caso no persiste | Marcar un caso como resuelto no se guarda en la DB |

### Puede esperar (fuera del scope de la prueba)

- Todo lo relacionado con marketplace, carrito y órdenes de insumos
- Tablas muertas (cart_items, seller_assignments, etc.)
- Refactor de componentes dios
- types.ts desactualizado
- Analytics de sponsors

---

## Índice

1. [Mapa de Tablas — Qué guarda cada una](#1-mapa-de-tablas--qué-guarda-cada-una)
2. [Schema de Base de Datos](#2-schema-de-base-de-datos)
3. [Tablas y Columnas Sin Uso](#3-tablas-y-columnas-sin-uso)
4. [Flujo de Datos — Qué Se Pierde](#4-flujo-de-datos--qué-se-pierde)
5. [Bugs Críticos](#5-bugs-críticos)
6. [Bugs Altos](#6-bugs-altos)
7. [Deuda Técnica y Spaghetti](#7-deuda-técnica-y-spaghetti)
8. [Problemas Menores](#8-problemas-menores)
9. [Plan de Acción Priorizado](#9-plan-de-acción-priorizado)

---

## 1. Mapa de Tablas — Qué guarda cada una

### Dominio clínico

Estas son las tablas centrales de la app. Las 6 fueron creadas desde el dashboard de Supabase
y **nunca capturadas como migraciones SQL** (ver punto 2.1).

| Tabla | Propósito | ¿Tiene sentido? |
|---|---|---|
| `profiles` | Datos del profesional de salud: nombre, institución, matrícula. Se crea automáticamente al registrarse. | ✅ Sí |
| `patients` | Pacientes asignados a un profesional: datos demográficos, diagnóstico, frecuencia de curación. | ✅ Sí |
| `wound_cases` | Casos de herida vinculados a un paciente: tipo de herida, ubicación, estado, tratamiento. Un paciente puede tener múltiples casos. | ✅ Sí |
| `evolutions` | Evoluciones clínicas de un caso: fecha, procedimiento, materiales, próximo control. Una curación registrada en el tiempo. | ✅ Sí |
| `photos` | Fotos clínicas vinculadas a un caso o evolución. URL al archivo en Supabase Storage. | ✅ Sí |
| `user_roles` | Rol canónico del usuario en la app: `professional`, `sponsor` o `admin`. Es la única fuente de verdad para el control de acceso. | ✅ Sí |

---

### Dominio marketplace

Estas tablas soportan el catálogo de productos y el sistema de pedidos.

| Tabla | Propósito | ¿Tiene sentido? |
|---|---|---|
| `labs` | Laboratorios (fabricantes/proveedores) que ofrecen productos en el marketplace. | ✅ Sí |
| `lab_products` | Productos del catálogo: nombre, precio, stock, tipo de herida, categoría. Vinculados a un lab. | ✅ Sí |
| `lab_sellers` | Vendedores de cada lab: nombre, contacto, zona geográfica. Se asignan a órdenes. | ✅ Sí, pero nunca se muestran en UI (ver 3.2) |
| `product_categories` | Categorías del catálogo (apósitos, antisépticos, etc.). Solo se usa el `id` y `name` — el resto de columnas está sin uso. | ⚠️ Parcialmente |
| `supply_orders` | Pedidos generados por profesionales: estado, datos de entrega, totales, canal. | ✅ Sí |
| `supply_order_items` | Items de cada pedido: producto, cantidad, precio unitario, subtotal. | ✅ Sí |
| `user_lab_sponsors` | Qué lab puede ver cada usuario en el marketplace. Define el "sponsor asignado" de un profesional. | ✅ Sí |
| `seller_assignments` | Debería vincular vendedores a usuarios profesionales. **Nunca se usa en el frontend.** | ❌ Muerta — feature no implementada |
| `cart_items` | Iba a guardar el carrito de compras en la DB. El carrito usa `localStorage` en su lugar. **Nunca se escribe.** | ❌ Muerta — reemplazada por localStorage |
| `product_clinical_tags` | Tabla de tags clínicos para filtrar productos (ej: "antimicrobiano", "desbridante"). El filtrado por tags está hardcodeado como array vacío en el frontend. **Nunca se consulta.** | ❌ Muerta — feature abandonada |
| `product_recommendation_rules` | Reglas para recomendar productos según tipo de herida, exudado e infección. **Nunca se lee desde el frontend.** | ❌ Muerta — motor de recomendaciones no implementado |
| `product_interactions` | Debería registrar clicks y vistas de productos para analytics. **Nunca se escribe.** | ❌ Muerta — tracking no implementado |

---

### Dominio sponsor / white-label

Estas tablas soportan el modelo multi-tenant donde distintos labs tienen su propio branding.

| Tabla | Propósito | ¿Tiene sentido? |
|---|---|---|
| `sponsors` | Configuración de branding por sponsor: colores, logos, nombre de la app, datos de contacto. Permite white-labeling. | ✅ Sí |
| `user_sponsor` | Vínculo entre un usuario (sponsor) y su registro de sponsor. Define qué branding ve. | ✅ Sí |

---

### Dominio consentimiento y firmas

| Tabla | Propósito | ¿Tiene sentido? |
|---|---|---|
| `patient_consents` | Consentimientos firmados por el paciente: acepta historial digital, fotos, tracking. Incluye firma digital y datos del firmante. | ✅ Sí |
| `evolution_signatures` | Firmas del profesional y del paciente para cada evolución registrada. Trazabilidad legal. | ✅ Sí, pero nunca se leen de vuelta (ver 3.x) |

---

### Resumen rápido

- **16 tablas** tienen sentido y responden a una necesidad real del negocio
- **4 tablas completamente muertas**: `cart_items`, `seller_assignments`, `product_clinical_tags`, `product_recommendation_rules`
- **1 tabla write-only** sin UI de lectura: `product_interactions`
- **1 tabla parcialmente muerta**: `product_categories` (solo se usan 2 de sus 6 columnas)

---

## 2. Schema de Base de Datos

### 2.1 — Las 6 tablas core nunca fueron migradas

**Problema**
Las tablas `profiles`, `patients`, `wound_cases`, `evolutions`, `photos` y `user_roles`, el enum
`app_role`, y las funciones `handle_new_user`, `update_updated_at_column` y `has_role` fueron
creadas desde el dashboard de Supabase y nunca capturadas como SQL. Las 29 migraciones existentes
asumen que ya existen. No es posible provisionar una base de datos nueva desde cero usando solo las
migraciones.

**Solución**
Hacer reverse-engineering del schema live y crear una "migración 0" que contenga todos los
`CREATE TABLE`, `CREATE TYPE` y `CREATE FUNCTION` faltantes. Esto se puede hacer conectándose al
proyecto Supabase y ejecutando:

```sql
-- En el SQL editor de Supabase, exportar el schema actual:
SELECT pg_dump equivalente via supabase db dump --schema-only
```

O usando la CLI: `supabase db dump -f base_schema.sql --schema public`.

---

### 2.2 — Sistema de roles duplicado

**Problema**
Existen dos fuentes de verdad para el rol del usuario:
- `profiles.role` — TEXT, almacena `'enfermero'`
- `user_roles.role` — enum `app_role`, almacena `'professional'`

La función `has_role()` y todas las políticas RLS leen `user_roles`. `profiles.role` es vestigial,
usa un vocabulario distinto, y puede divergir. El contexto de la app todavía lo lee como fallback
(`AppContext.tsx:284`).

**Solución**
1. Eliminar la lectura de `profiles.role` en `AppContext.tsx` — usar solo `user_roles` vía `useAppRole`.
2. Crear una migración que elimine o compute `profiles.role` a partir de `user_roles`:

```sql
-- Opción A: eliminar la columna
ALTER TABLE public.profiles DROP COLUMN role;

-- Opción B: hacerla computed/view (si se necesita para reportes legacy)
-- Crear una vista que joinee profiles con user_roles
```

---

### 2.3 — Argumentos invertidos en `has_role()` dentro de `types.ts`

**Problema**
El archivo `src/integrations/supabase/types.ts` define la firma como `has_role(_role, _user_id)`,
pero todas las políticas RLS la llaman como `has_role(auth.uid(), 'role'::app_role)`. Cualquier
llamada RPC desde TypeScript usando los tipos generados pasaría los argumentos en orden incorrecto.

**Solución**
Regenerar `types.ts` con `supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts`.
Esto también resuelve las columnas faltantes de los puntos 1.4 y 3.x.

---

### 2.4 — `types.ts` desactualizado — 6 columnas faltantes

**Problema**
Tres migraciones recientes agregaron columnas que nunca se regeneraron en los tipos:

| Tabla | Columnas faltantes | Migración |
|---|---|---|
| `evolutions` | `next_control_time` | `20260531184000` |
| `patients` | `treating_doctor_name`, `treating_doctor_phone` | `20260601073000` |
| `sponsors` | `contact_phone`, `responsible_person`, `billing_details` | `20260528000500` |

El código usa `as any` como workaround en varios lugares.

**Solución**
Regenerar `types.ts` (ver 2.3). Luego eliminar todos los `as any` en los calls a esas tablas.

---

### 2.5 — Dos regresiones de seguridad activas en migraciones recientes

**Problema — Migración 28** (`20260601223002`)
Las políticas INSERT en tablas clínicas usan `WITH CHECK (auth.uid() IS NOT NULL)`. Esto permite
que cualquier usuario autenticado inserte registros con el `user_id` que quiera, escribiendo en la
cuenta de otro profesional.

**Problema — Migración 29** (`20260601223419`)
Las políticas INSERT/UPDATE/DELETE en `lab_products` tienen `USING (auth.uid() IS NOT NULL)`,
permitiendo que cualquier usuario autenticado corrompa el catálogo de productos.

**Solución**
Crear dos migraciones de hotfix que reemplacen las políticas permisivas:

```sql
-- Hotfix migración 28: restaurar check correcto en tablas clínicas
DROP POLICY IF EXISTS "..." ON public.patients;
CREATE POLICY "Users insert own patients"
  ON public.patients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Mismo patrón para wound_cases, evolutions, photos

-- Hotfix migración 29: restaurar políticas de lab_products
DROP POLICY IF EXISTS "..." ON public.lab_products;
CREATE POLICY "Admins manage products"
  ON public.lab_products FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Sponsor inserts own lab products"
  ON public.lab_products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_lab_sponsors
      WHERE user_id = auth.uid()
        AND lab_id = lab_products.lab_id
        AND is_active = true
    )
  );
```

---

### 2.6 — Sin FK constraints en columnas de referencia críticas

**Problema**
Las tablas `evolution_signatures` y `patient_consents` tienen columnas `patient_id`, `case_id`,
`evolution_id` que son UUIDs sin `REFERENCES`. La integridad referencial depende solo de la
aplicación. Ninguna tabla tiene FK desde `user_id` hacia `auth.users`, lo que deja filas
huérfanas si se elimina un usuario.

**Solución**

```sql
-- FKs en evolution_signatures
ALTER TABLE public.evolution_signatures
  ADD CONSTRAINT fk_evo_sig_evolution
    FOREIGN KEY (evolution_id) REFERENCES public.evolutions(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_evo_sig_patient
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_evo_sig_case
    FOREIGN KEY (case_id) REFERENCES public.wound_cases(id) ON DELETE CASCADE;

-- FKs en patient_consents
ALTER TABLE public.patient_consents
  ADD CONSTRAINT fk_consent_patient
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
```

Para el FK a `auth.users`, agregarlo con `ON DELETE CASCADE` para evitar filas huérfanas:

```sql
ALTER TABLE public.patients
  ADD CONSTRAINT fk_patients_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- Repetir para todas las tablas con user_id
```

---

### 2.7 — `user_roles` sin constraint UNIQUE por 23 migraciones

**Problema**
El constraint `UNIQUE(user_id)` en `user_roles` fue agregado recién en la migración 23, después de
que `handle_new_user` había estado insertando filas desde el inicio. La migración reconoce que
existían duplicados en producción y hace una limpieza CTE antes de agregar el constraint.

**Solución**
Este problema ya está mitigado por la migración 23. La deuda pendiente es verificar que
`handle_new_user` sea idempotente usando `ON CONFLICT (user_id) DO NOTHING`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'professional')
  ON CONFLICT (user_id) DO NOTHING;
  -- resto de la función
  RETURN NEW;
END;
$$;
```

---

### 2.8 — `patients.assigned_professional` y `evolutions.professional` son strings libres

**Problema**
No hay FK a `profiles`. El mismo profesional puede estar escrito de forma diferente en distintos
registros. Las columnas añadidas después (`treating_doctor_name`, `treating_doctor_phone`) repiten
el mismo anti-patrón.

**Solución a futuro**
Migrar estas columnas a referencias reales:

```sql
-- Agregar columna FK
ALTER TABLE public.patients
  ADD COLUMN assigned_professional_id uuid REFERENCES public.profiles(id);

-- Backfill: matchear por nombre (best-effort)
UPDATE public.patients p
SET assigned_professional_id = pr.id
FROM public.profiles pr
WHERE pr.first_name || ' ' || pr.last_name = p.assigned_professional;

-- Eventualmente deprecar la columna texto
```

---

### 2.9 — `wound_cases.status` sin CHECK constraint

**Problema**
Los valores válidos (`'activo'`, `'en_mejoria'`, `'critico'`, `'resuelto'`) solo están en los datos
de seed. A diferencia de `supply_orders.status`, no hay constraint que los enforcie en la DB.

**Solución**

```sql
ALTER TABLE public.wound_cases
  ADD CONSTRAINT chk_wound_case_status
    CHECK (status IN ('activo', 'en_mejoria', 'critico', 'resuelto'));
```

---

## 3. Tablas y Columnas Sin Uso

### 2.1 — 5 tablas completamente sin uso en el frontend

| Tabla | Estado | Detalle |
|---|---|---|
| `cart_items` | Muerta | El carrito usa `localStorage` exclusivamente |
| `seller_assignments` | Muerta | Definida, nunca consultada desde ningún archivo |
| `product_clinical_tags` | Muerta | El filtrado de tags es un array vacío hardcodeado |
| `product_recommendation_rules` | Muerta | Sin hook, sin página, sin query |
| `product_interactions` | Muerta | Sin tracking de clicks implementado |

**Solución**
Evaluar si estas features están en el roadmap. Si no lo están en el corto plazo, eliminar las tablas
con migraciones `DROP TABLE IF EXISTS` para reducir la superficie de la DB. Si están planeadas,
documentarlas como pendientes y no eliminarlas.

---

### 2.2 — Columnas en tablas activas que nunca se muestran en UI

| Tabla | Columnas nunca renderizadas |
|---|---|
| `lab_products` | `datasheet_url`, `usage_instructions`, `units_per_box`, `price_updated_at`, `price_valid_until`, `stock_updated_at` |
| `lab_sellers` | `full_name`, `email`, `phone`, `whatsapp`, `zone`, `avatar_url` (el vendedor se guarda en órdenes pero nunca se muestra) |
| `product_categories` | `slug`, `description`, `icon`, `sort_order` |
| `labs` | `description`, `logo_url` |

**Solución**
Estas columnas no necesitan eliminarse — pueden ser parte de features futuras (ficha de producto,
perfil de vendedor). Lo que sí hay que corregir es no hacer `select('*')` y descartar columnas;
en su lugar seleccionar solo lo necesario para reducir el payload.

---

### 2.3 — Feature a medio terminar: médico tratante

**Problema**
`patients.treating_doctor_name` y `treating_doctor_phone` fueron agregados el 2026-06-01. El
modelo `Patient` los tiene (`treatingDoctorName`, `treatingDoctorPhone`), pero `rowToPatient()`
los hardcodea a strings vacíos y `patientToRow()` nunca los escribe.

**Solución**
Completar la implementación o revertir la migración. Si se completa:

```typescript
// AppContext.tsx — rowToPatient()
treatingDoctorName: row.treating_doctor_name ?? '',
treatingDoctorPhone: row.treating_doctor_phone ?? '',

// AppContext.tsx — patientToRow()
treating_doctor_name: patient.treatingDoctorName || null,
treating_doctor_phone: patient.treatingDoctorPhone || null,
```

---

### 2.4 — `evolution_signatures` es write-only

**Problema**
Las firmas se insertan desde `CaseDetail.tsx` pero no existe ninguna página ni componente que las
lea de vuelta. No hay auditoría visible de firmas para ningún rol.

**Solución**
Crear una sección de "Historial de firmas" en `CaseDetail.tsx` o `PatientDetail.tsx` que consulte:

```typescript
const { data: signatures } = await supabase
  .from('evolution_signatures')
  .select('*')
  .eq('case_id', caseId)
  .order('created_at', { ascending: false });
```

---

## 4. Flujo de Datos — Qué Se Pierde

### 3.1 — `patientToRow()` descarta múltiples campos clínicos en cada guardado

**Problema** — Archivo: `src/context/AppContext.tsx:67–85`

Los formularios de paciente colectan estos campos, que `patientToRow()` silenciosamente descarta
antes de escribir a Supabase:

- `treatingDoctorName` / `treatingDoctorPhone`
- `allergies`
- `insurance`
- `emergencyContactName` / `emergencyContactPhone`
- `birthDate`

Estos campos no existen como columnas en la tabla `patients` de la DB — por eso `patientToRow()`
no los puede mapear. Los datos existen solo en el estado React y se pierden al recargar.

**Solución**
Dos opciones:

**Opción A** — Agregar las columnas faltantes a la DB:

```sql
ALTER TABLE public.patients
  ADD COLUMN birth_date date,
  ADD COLUMN allergies text,
  ADD COLUMN insurance text,
  ADD COLUMN emergency_contact_name text,
  ADD COLUMN emergency_contact_phone text;
```

Luego actualizar `patientToRow()` y `rowToPatient()` para incluir todos los campos.

**Opción B** — Consolidar en una columna JSONB `metadata`:

```sql
ALTER TABLE public.patients ADD COLUMN metadata jsonb DEFAULT '{}';
```

```typescript
// patientToRow()
metadata: {
  birthDate: patient.birthDate,
  allergies: patient.allergies,
  insurance: patient.insurance,
  emergencyContactName: patient.emergencyContactName,
  emergencyContactPhone: patient.emergencyContactPhone,
}
```

---

### 3.2 — Todo el formulario de evolución de `CaseDetail` es efímero

**Problema** — Archivo: `src/pages/CaseDetail.tsx:341–416`, `src/context/AppContext.tsx:403–426`

`addEvolution()` y `updateEvolution()` en `AppContext` son operaciones **solo en memoria**
(`setState`). Nunca llaman a Supabase. Los siguientes campos capturados en `CaseDetail` se pierden
al recargar:

- `painLevel`, `odor`, `exudateAmount`, `exudateType`, `exudateColor`
- `tissueTypes`, `edgeTypes`
- `woundLength`, `woundWidth`, `woundDepth`
- `hasInfectionSigns` y todos los flags `inf*`
- `bodyTemperature`, `evolutionStatus`, `healingFrequencyDays`
- `requiresMedicalOrder`, `medicalOrder`, `closedAt`

El único path que persiste evoluciones correctamente es `NewCuration.tsx`.

**Solución**
Reemplazar las llamadas a `addEvolution()`/`updateEvolution()` en `CaseDetail.tsx` por llamadas
directas a Supabase, o refactorizar `AppContext` para que esas funciones persistan:

```typescript
// AppContext.tsx — addEvolution() debería hacer:
const { data, error } = await supabase
  .from('evolutions')
  .insert(evolutionToRow(evolution))
  .select()
  .single();
if (error) throw error;
// luego actualizar el estado con el row real de la DB
```

Adicionalmente, agregar las columnas que faltan en `evolutions` para los campos ricos.

---

### 3.3 — El cierre de caso nunca se persiste

**Problema** — Archivo: `src/pages/CaseDetail.tsx:407`

Cuando `evolutionStatus === 'cicatrizada'`, se llama `updateCase(patient.id, { ...woundCase, status: 'resuelto' })`.
`updateCase()` en AppContext es in-memory. La tabla `wound_cases` en la DB nunca se actualiza.
Después de recargar, el caso reaparece como activo.

**Solución**

```typescript
// AppContext.tsx — updateCase() debería incluir:
const { error } = await supabase
  .from('wound_cases')
  .update({ status: updatedCase.status, updated_at: new Date().toISOString() })
  .eq('id', updatedCase.id)
  .eq('user_id', user.id);
if (error) throw error;
```

---

### 3.4 — Las fotos subidas desde `CaseDetail` nunca llegan a Supabase Storage

**Problema** — Archivo: `src/pages/CaseDetail.tsx:151–170`

En `handleFileUpload()`, los archivos se convierten a base64 y se guardan en estado React
(`evoPhotos`). Nunca se suben a Supabase Storage ni se insertan filas en la tabla `photos`.

Solo las fotos subidas desde `NewCuration.tsx` (que sí hace el upload correcto) persisten.

**Solución**
Consolidar la lógica de upload de fotos en una función compartida y usarla desde ambos paths:

```typescript
// src/lib/uploadPhoto.ts
export async function uploadPhoto(file: File, userId: string, caseId: string, evolutionId?: string) {
  const path = `${userId}/${caseId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('wound-photos')
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('wound-photos')
    .getPublicUrl(path);

  await supabase.from('photos').insert({
    user_id: userId,
    case_id: caseId,
    evolution_id: evolutionId ?? null,
    url: path,
    photo_date: new Date().toISOString().split('T')[0],
  });

  return publicUrl;
}
```

---

### 3.5 — `evolution_signatures` se intenta insertar con un FK inválido

**Problema** — Archivo: `src/pages/CaseDetail.tsx:380–398`

Cuando la evolución se crea desde `CaseDetail` (path B), su `id` se genera localmente como
`\`e${Date.now()}\`` — un string, no un UUID. Como esa evolución **nunca se escribe a Supabase**
(ver punto 3.2), el `evolution_id` que se pasa al insert de `evolution_signatures` no existe en la
tabla `evolutions`. El insert falla con error de foreign key violation garantizado.

**Solución**
Primero persistir la evolución en Supabase y obtener el UUID real generado por la DB antes de
insertar la firma:

```typescript
const { data: savedEvo, error } = await supabase
  .from('evolutions')
  .insert(evolutionPayload)
  .select('id')
  .single();
if (error) throw error;

// Ahora sí insertar la firma con el UUID real
await supabase.from('evolution_signatures').insert({
  evolution_id: savedEvo.id,
  // ...resto de campos
});
```

---

### 3.6 — Las órdenes de profesionales se guardan solo en `localStorage`

**Problema** — Archivos: `src/pages/Cart.tsx:24–49`, `src/pages/Orders.tsx:25–37`

`Cart.tsx` escribe a `localStorage` con la key `curatrack_orders`. No hay registro en Supabase.
`Orders.tsx` lee exclusivamente de `localStorage`. Si el usuario borra el storage o cambia de
dispositivo, pierde todo su historial de pedidos.

Existe un segundo flujo (`CartContext.confirmOrder()` vía `CheckoutDialog`) que sí escribe a
`supply_orders` en Supabase, pero es un path separado que el flujo principal de `Cart.tsx` no usa.

**Solución**
Unificar los dos flujos. `Cart.tsx` debería llamar a `CartContext.confirmOrder()` en lugar de
escribir a `localStorage`. `Orders.tsx` debería leer de Supabase:

```typescript
// Orders.tsx — reemplazar lectura de localStorage por:
const { data: orders } = await supabase
  .from('supply_orders')
  .select('*, supply_order_items(*)')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

---

### 3.7 — El AI Summary se regenera con una API call en cada recarga

**Problema** — Archivo: `src/pages/CaseDetail.tsx:313–327`

`updateCase()` con `aiSummary` es in-memory. El resumen generado por la IA no se persiste. En cada
recarga se hace una nueva API call.

**Solución**
Agregar columna a `wound_cases` y persistir:

```sql
ALTER TABLE public.wound_cases
  ADD COLUMN ai_summary text,
  ADD COLUMN ai_summary_updated_at timestamptz;
```

```typescript
// Luego en updateCase():
await supabase
  .from('wound_cases')
  .update({ ai_summary: summary, ai_summary_updated_at: new Date().toISOString() })
  .eq('id', caseId);
```

---

### 3.8 — `SponsorContext` expone datos de billing de todos los sponsors a profesionales

**Problema** — Archivo: `src/context/SponsorContext.tsx:199–215`

Para usuarios autenticados no-sponsor, se hace `select('*')` en `sponsors`. Esto retorna
`billing_details`, `responsible_person`, `contact_phone` de todos los sponsors. Un profesional
puede leer la información de facturación de sponsors que no son los suyos.

**Solución**
Usar `ANON_COLUMNS` también para usuarios no-sponsor, o crear una política RLS que restrinja
`billing_details` a solo los propios:

```sql
CREATE POLICY "Sponsors read own billing"
  ON public.sponsors FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR (
      has_role(auth.uid(), 'sponsor')
      AND id IN (
        SELECT sponsor_id FROM public.user_sponsor WHERE user_id = auth.uid()
      )
    )
  );
```

---

## 5. Bugs Críticos

### C-1 — Fuga de datos entre sponsors en el marketplace

**Archivo:** `src/pages/NewCuration.tsx:~167`

**Problema**
El builder de Supabase es inmutable — `.eq()` retorna un nuevo objeto en lugar de mutar el
existente. El código hace `q.eq('lab_id', sponsor.lab_id)` sin asignar el resultado. La variable
`q` sigue apuntando al query sin filtrar. **Todos los sponsors ven los productos de todos los labs.**

```typescript
// BUG: resultado de .eq() descartado
let q = supabase.from('lab_products').select('...');
q.eq('lab_id', sponsor.lab_id); // ← no muta q
const { data } = await q;       // ← query sin filtro
```

**Solución**

```typescript
let q = supabase.from('lab_products').select('...');
if (sponsor?.lab_id) {
  q = q.eq('lab_id', sponsor.lab_id); // ← asignar el resultado
}
const { data } = await q;
```

---

### C-2 — Analytics fabricadas mostradas a sponsors como datos reales

**Archivo:** `src/pages/SponsorPanel.tsx:~106–111`

**Problema**
Las métricas del "Embudo comercial" se calculan multiplicando la cantidad real de evoluciones por
constantes arbitrarias:

```typescript
const recommended = realData.evolutions * 2;     // inventado
const viewed = recommended * 0.62;               // inventado
const addedToCart = viewed * 0.38;               // inventado
```

Estos números se presentan a sponsors pagos como business intelligence real. **Riesgo legal y
contractual.**

**Solución**
Eliminar el embudo comercial fabricado o reemplazarlo con datos reales desde `product_interactions`
(tabla que existe pero nunca se usa) y `supply_orders`. Mientras tanto, marcar claramente en la UI
que son estimaciones o eliminar la sección:

```typescript
// Opción mínima: eliminar la sección hasta tener datos reales
// Opción correcta: implementar tracking real con product_interactions
```

---

### C-3 — Race condition al crear paciente en `NewCuration`

**Archivo:** `src/pages/NewCuration.tsx:~280–294`

**Problema**
Después de `addPatient()` (que escribe a Supabase), se ejecuta inmediatamente un `SELECT` por DNI
para recuperar el ID del paciente recién creado. No hay garantía de que el INSERT haya commiteado
antes de que el SELECT corra. Si el SELECT retorna antes, `patientId` queda `undefined` y la
curación se crea sin paciente vinculado.

**Solución**

```typescript
// En lugar de hacer un SELECT separado, retornar el ID del INSERT:
const { data: newPatient, error } = await supabase
  .from('patients')
  .insert(patientPayload)
  .select('id')
  .single();
if (error) throw error;
const patientId = newPatient.id; // UUID garantizado del INSERT
```

---

### C-4 — Orden huérfana si el insert de items falla

**Archivo:** `src/context/CartContext.tsx:~210–264`

**Problema**
`confirmOrder` inserta la fila en `supply_orders` y luego, en una llamada separada, inserta las
filas en `supply_order_items`. Si la segunda llamada falla, queda una orden sin items en la DB sin
posibilidad de rollback.

**Solución**
Usar una función RPC en Supabase que ejecute ambas operaciones en una transacción:

```sql
CREATE OR REPLACE FUNCTION create_supply_order(
  p_order jsonb,
  p_items jsonb[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id uuid;
BEGIN
  INSERT INTO supply_orders (...) VALUES (...) RETURNING id INTO v_order_id;
  INSERT INTO supply_order_items (order_id, ...)
    SELECT v_order_id, ... FROM jsonb_array_elements(p_items);
  RETURN v_order_id;
END;
$$;
```

---

### C-5 — Datos clínicos de demo contaminan pacientes reales

**Archivo:** `src/context/AppContext.tsx:~265–273`

**Problema**
Al cargar pacientes de la DB, se verifica si el `first_name + last_name` coincide con alguna
entrada en el array `demoPatients`. Si hay match, se mezclan datos clínicos ficticios en el
registro real del paciente.

```typescript
// Ejemplo del bug:
const demoMatch = demoPatients.find(
  d => d.firstName === row.first_name && d.lastName === row.last_name
);
if (demoMatch) {
  // se mergeean wound cases ficticios al paciente real
}
```

**Solución**
Eliminar completamente esta lógica de merge. Los datos demo deben existir solo en la DB (via seed)
o en un contexto aislado, nunca mezclados con datos reales:

```typescript
// Eliminar el bloque de merge con demoPatients en rowToPatient()
// Los datos demo deben vivir en user_id específicos del ambiente de demo
```

---

### C-6 — `patientToRow()` borra campos clínicos en cada guardado

*(Ver punto 3.1 — mismo problema, clasificado también como bug crítico por la pérdida de datos)*

---

## 6. Bugs Altos

### H-1 — IIFE de 100 líneas en `AppContext` sin `try/catch`

**Archivo:** `src/context/AppContext.tsx:~177–279`

**Problema**
El bloque async que carga profile → patients → wound cases → evolutions no tiene `try/catch`.
Cualquier excepción deja `setPatientsLoading(false)` sin llamar — el spinner cuelga para siempre.

**Solución**

```typescript
useEffect(() => {
  (async () => {
    try {
      // ... toda la lógica de carga
    } catch (err) {
      console.error('Failed to load app data:', err);
      setLoadError(true);
    } finally {
      setPatientsLoading(false);
    }
  })();
}, [user]);
```

---

### H-2 — Error de profile silenciosamente asigna rol `'enfermero'`

**Archivo:** `src/context/AppContext.tsx:~181–186`

**Problema**
```typescript
const { data: prof } = await supabase.from('profiles').select('*')...
// error descartado: si la query falla, prof es null
// y se asigna role = 'enfermero' por default
```
Un admin o sponsor cuya query de perfil falle queda sin acceso a sus vistas autorizadas.

**Solución**

```typescript
const { data: prof, error: profError } = await supabase.from('profiles').select('*')...
if (profError) {
  setLoadError(true);
  return;
}
```

---

### H-3 — Documento clínico imprimible muestra texto `"undefined"`

**Archivo:** `src/pages/CaseDetail.tsx:~596–599`

**Problema**
```typescript
// La función escape() acepta string pero recibe string | undefined
escape(woundCase.size)      // → "undefined" si está vacío
escape(woundCase.depth)     // → "undefined"
escape(woundCase.exudate)   // → "undefined"
escape(woundCase.infection) // → "undefined"
```

**Solución**

```typescript
const safeEscape = (value: string | undefined) => escape(value ?? '');
// O con un dash:
const printValue = (value: string | undefined) => value?.trim() || '—';
```

---

### H-4 — `marked.parse` puede retornar una `Promise` que se imprime como `[object Promise]`

**Archivo:** `src/pages/CaseDetail.tsx:~474`

**Problema**
```typescript
marked.parse(summary, { async: false }) as string
// En marked v5+, async: false está deprecado.
// Si retorna Promise, DOMPurify.sanitize() recibe un objeto Promise.
```

**Solución**

```typescript
import { marked } from 'marked';
// Forzar modo síncrono con el lexer directo:
const html = marked.parse(summary) as string;
// O usar marked.parseInline() para evitar el problema de tipos:
const html = String(await marked.parse(summary));
const clean = DOMPurify.sanitize(html);
```

---

### H-5 — `PatientConsentCard` re-sube la firma existente en cada edición

**Archivo:** `src/components/PatientConsentCard.tsx:~99–123`

**Problema**
`signatureDataUrl` se inicializa con la URL firmada de Supabase (HTTPS). Cuando el usuario guarda
sin redibujar la firma, `handleSave` hace `fetch(signatureDataUrl).blob()` sobre esa URL y la
re-sube a Storage, creando un duplicado. Si la URL firmada expiró (TTL: 3600s), el fetch falla y se
guarda `signature_url = null`.

**Solución**
Trackear si la firma fue modificada:

```typescript
const [signatureModified, setSignatureModified] = useState(false);

// En el canvas de firma, marcar como modificado
const handleSignatureEnd = () => setSignatureModified(true);

// En handleSave:
if (signatureModified) {
  // re-subir solo si el usuario dibujó una firma nueva
  const blob = await dataUrlToBlob(signatureDataUrl);
  // upload...
} else {
  // usar la URL existente tal como está
  signatureUrl = existingConsent.signature_url;
}
```

---

### H-6 — `useAppRole` hace un SELECT a la DB en cada mount sin caché

**Archivo:** `src/hooks/useAppRole.tsx:~16–34`

**Problema**
Cada componente que llama `useAppRole` emite un `SELECT` a `user_roles`. `Dashboard`, `AppSidebar`
y `ProtectedRoute` usan este hook → 3 queries paralelas por navegación. El rol ya está disponible
en `AppContext`.

**Solución**
Leer el rol desde `AppContext` en lugar de hacer queries independientes:

```typescript
// useAppRole.tsx
export function useAppRole() {
  const { profile } = useApp(); // ya está cargado en AppContext
  return profile?.role ?? 'professional';
}
```

---

### H-7 — `toast` llamado en el render body, no en `useEffect`

**Archivo:** `src/components/ProtectedRoute.tsx:~46–52`

**Problema**
El toast de "acceso denegado" se llama durante la fase de render. React 18 en StrictMode renderiza
los componentes dos veces, disparando el toast dos veces antes de que `warnedRef.current` lo guarde.

**Solución**

```typescript
useEffect(() => {
  if (accessDenied && !warnedRef.current) {
    warnedRef.current = true;
    toast.error('No tenés acceso a esta sección.');
  }
}, [accessDenied]);
```

---

### H-8 — `useState` inicializado con side effects en `Login.tsx`

**Archivo:** `src/pages/Login.tsx:~107–112`

**Problema**
```typescript
// Usa lazy initializer de useState para ejecutar side effects — incorrecto
useState(() => {
  localStorage.setItem(...);
  applyConvatecTheme();
  return null;
});
```
Bajo StrictMode, el initializer se ejecuta dos veces.

**Solución**

```typescript
useLayoutEffect(() => {
  localStorage.setItem(...);
  applyConvatecTheme();
}, []); // solo una vez al montar
```

---

### H-9 — Delete-then-insert en `user_roles` sin transacción

**Archivo:** `src/pages/AdminAccounts.tsx:~100–102`

**Problema**
Si el delete tiene éxito y el insert falla, el usuario queda sin ningún rol en la DB. No hay
rollback ni manejo de este caso.

**Solución**
Usar upsert:

```typescript
await supabase
  .from('user_roles')
  .upsert({ user_id: uid, role: dbRole }, { onConflict: 'user_id' });
```

---

### H-10 — `SponsorContext.refresh()` sin manejo de errores en 5 queries

**Archivo:** `src/context/SponsorContext.tsx:~157–230`

**Problema**
Las 5 queries secuenciales no verifican `error`. En caso de falla de red, el sponsor queda en
`null`, el tema no se aplica, y el usuario ve la app sin branding ni acceso correcto.

**Solución**

```typescript
const { data, error } = await supabase.from('sponsors').select(...);
if (error) {
  console.error('Failed to load sponsors:', error);
  setRefreshError(error.message);
  return;
}
```

---

### H-11 — Tres `onAuthStateChange` independientes crean race conditions

**Archivos:** `AppContext.tsx`, `SponsorContext.tsx`, `CartContext.tsx`

**Problema**
Tres contextos se suscriben independientemente a los cambios de auth. El orden en que se ejecutan
sus callbacks no está garantizado. SponsorContext puede intentar resolver el sponsor antes de que
AppContext termine de cargar el perfil.

**Solución**
Centralizar el auth listener en `AppContext` y emitir eventos/callbacks a los demás contextos, o
hacer que `SponsorContext` y `CartContext` reaccionen al estado de AppContext en lugar de escuchar
directamente a Supabase auth.

---

## 7. Deuda Técnica y Spaghetti

### M-1 — Tres componentes dios de +1300 líneas

| Archivo | Líneas | Responsabilidades mezcladas |
|---|---|---|
| `PatientDetail.tsx` | 1517 | Info de paciente, calendario, scheduling, WoundForm, fotos, consentimientos |
| `CaseDetail.tsx` | 1527 | Timeline, formulario de evolución, AI summary, impresión, foto management, firma |
| `Dashboard.tsx` | 1369 | Vista profesional, vista sponsor, alertas, calendario, appointments |

**Solución**
Extraer por dominio. Ejemplo para `CaseDetail.tsx`:

```
src/pages/CaseDetail/
  index.tsx          ← orquestador liviano
  EvolutionTimeline.tsx
  EvolutionForm.tsx
  AISummary.tsx
  WoundPhotoGallery.tsx
  MedicalOrder.tsx
  SignatureCapture.tsx
```

---

### M-2 — Lógica de frecuencia duplicada en 3 archivos

**Archivos:** `PatientDetail.tsx:~244`, `CaseDetail.tsx`, `Dashboard.tsx:~626`

**Problema**
El mapa de `'Diaria' → 1`, `'Cada 48hs' → 2`, `'Semanal' → 7`, etc. está repetido tres veces.

**Solución**

```typescript
// src/lib/frequency.ts
export const FREQUENCY_OPTIONS = ['Diaria', 'Cada 48hs', 'Cada 72hs', 'Semanal', 'A demanda'] as const;
export type FrequencyOption = typeof FREQUENCY_OPTIONS[number];

export const frequencyToDays: Record<FrequencyOption, number> = {
  'Diaria': 1,
  'Cada 48hs': 2,
  'Cada 72hs': 3,
  'Semanal': 7,
  'A demanda': 0,
};
```

---

### M-3 — `hexToHslString` y `darkenHex` duplicados en dos archivos

**Archivos:** `Login.tsx:~33–67`, `SponsorContext.tsx`

**Solución**

```typescript
// src/lib/colorUtils.ts
export function hexToHslString(hex: string): string { ... }
export function darkenHex(hex: string, amount: number): string { ... }
```

---

### M-4 — `setEField` con `as never` elimina toda type-safety del formulario de evolución

**Archivo:** `src/pages/CaseDetail.tsx:~509`

**Problema**
```typescript
const setEField = (key: string, value: unknown) =>
  setEvoForm(prev => ({ ...prev, [key]: value as never }));
```
Un typo en `key` o un tipo incorrecto en `value` no se detecta en compile-time ni en runtime.

**Solución**

```typescript
function setEField<K extends keyof EvoFormState>(key: K, value: EvoFormState[K]) {
  setEvoForm(prev => ({ ...prev, [key]: value }));
}
```

---

### M-5 — `document.title` hardcodeado a `'CuraTrack'` en `applyTheme()`

**Archivo:** `src/context/SponsorContext.tsx:~106`

**Problema**
El white-label nunca funciona en la pestaña del browser. Todos los sponsors ven "CuraTrack" como
título de la pestaña.

**Solución**

```typescript
document.title = sponsor.app_name ?? 'CuraTrack';
```

---

### M-6 — Oportunidades detectadas hardcodeadas con datos falsos

**Archivo:** `src/pages/Dashboard.tsx:~364–395`

**Problema**
El panel "Oportunidades detectadas" muestra un array estático con textos de placeholder y
porcentajes inventados. Se ve como contenido real.

**Solución**
Eliminar o reemplazar con insights calculados a partir de datos reales (gaps en fechas de control,
casos sin evolución reciente, etc.).

---

### M-7 — `AdminOrders` escribe `updated_at` del lado del cliente

**Archivo:** `src/pages/AdminOrders.tsx:~96`

**Problema**
```typescript
await supabase.from('supply_orders')
  .update({ status, updated_at: new Date().toISOString() }) // ← reloj del cliente
```
El reloj del cliente puede diferir del servidor. En su lugar, dejar que el trigger de DB maneje
`updated_at`.

**Solución**

```typescript
await supabase.from('supply_orders')
  .update({ status }) // updated_at lo maneja el trigger update_updated_at_column
  .eq('id', orderId);
```

---

### M-8 — `select('*')` sin paginación en `AdminOrders`

**Archivo:** `src/pages/AdminOrders.tsx:~73`

**Problema**
A medida que crezca el volumen de órdenes, este query va a traer miles de filas.

**Solución**

```typescript
const { data, count } = await supabase
  .from('supply_orders')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

---

### M-9 — Dos stacks de Markdown para el mismo contenido

**Archivo:** `src/pages/CaseDetail.tsx`

**Problema**
El AI summary se renderiza con `ReactMarkdown` en pantalla y con `marked` + `DOMPurify` para
imprimir. Dos parsers con comportamientos potencialmente distintos para el mismo texto.

**Solución**
Unificar en uno. Para la vista de impresión, usar `ReactDOM.renderToStaticMarkup()` sobre el mismo
componente `ReactMarkdown`, o usar `marked` para ambos contextos.

---

### M-10 — `sharedCount = 0` — variable hardcodeada nunca actualizada

**Archivo:** `src/pages/PatientDetail.tsx:~192`

**Solución**
Implementar la feature o eliminar la variable y la UI que la consume.

---

## 8. Problemas Menores

| ID | Archivo | Problema | Solución |
|---|---|---|---|
| L-1 | Múltiples | Strings de frecuencia magic en 4 archivos | Constante `FREQUENCY_OPTIONS` compartida (ver M-2) |
| L-2 | `Dashboard.tsx:~364` | Panel de oportunidades con datos falsos | Eliminar o usar datos reales |
| L-3 | `CaseDetail.tsx:~111` | Signed URLs de fotos con TTL de 365 días | Reducir a 1-2 horas con re-fetch lazy |
| L-4 | `Dashboard.tsx:~173,510` | `today` calculado dos veces en el mismo render | Calcular una vez al inicio del componente |
| L-5 | `CaseDetail.tsx:~76–83` | Objetos default re-creados en cada render | Moverlos a constantes de módulo |
| L-6 | `AdminOrders.tsx:~73` | `select('*')` sin límite en órdenes | Agregar paginación (ver M-8) |
| L-7 | `lib/appRole.ts` | Error en query de roles retorna `'professional'` silenciosamente | Propagar el error |
| L-8 | `AppContext.tsx` | Flash de contenido vacío entre `authReady=true` y `patientsLoading=true` | Inicializar `patientsLoading` en `true` |
| L-9 | Múltiples | Dos sistemas de toast: Sonner y shadcn use-toast mezclados | Unificar en uno (recomendado: Sonner) |
| L-10 | `CartContext.tsx:~118` | `CartItemWithProduct.id` usa `product.id` como ID de item de carrito | Usar un ID único de carrito separado |

---

## 9. Plan de Acción Priorizado

### Fase 1 — Hotfixes de seguridad y datos (hacer primero)

1. **Hotfix migración 29** — restaurar políticas de `lab_products` (C-1 extendido, punto 2.5)
2. **Hotfix migración 28** — restaurar `WITH CHECK (user_id = auth.uid())` en tablas clínicas (punto 2.5)
3. **C-1** — `NewCuration.tsx:167` — asignar resultado de `.eq()` al filtrar por lab
4. **C-2** — `SponsorPanel.tsx` — eliminar o marcar el embudo comercial fabricado
5. **C-5** — `AppContext.tsx` — eliminar merge de datos demo con pacientes reales

### Fase 2 — Persistencia de datos críticos

6. **3.1 + C-6** — `patientToRow()` / `rowToPatient()` — campos clínicos perdidos (requiere columnas nuevas en DB o columna JSONB)
7. **3.2** — `CaseDetail.tsx` — hacer que `addEvolution()`/`updateEvolution()` persistan en Supabase
8. **3.3** — `CaseDetail.tsx` — hacer que `updateCase()` persista el cierre de caso
9. **3.4** — `CaseDetail.tsx` — upload de fotos a Supabase Storage
10. **3.5** — `CaseDetail.tsx` — evolution_signatures con FK real (requiere 3.2 primero)

### Fase 3 — Integridad del schema y tipos

11. **1.1** — Reverse-engineer base migration para las 6 tablas core
12. **1.3 + 1.4** — `supabase gen types typescript` — regenerar tipos
13. **1.5** — FK constraints en `evolution_signatures` y `patient_consents`
14. **1.2** — Unificar sistema de roles (deprecar `profiles.role`)
15. **1.9** — CHECK constraint en `wound_cases.status`

### Fase 4 — Bugs de estabilidad

16. **H-1** — Wrappear el IIFE de AppContext en try/catch/finally
17. **H-2** — Manejar error de query de profile correctamente
18. **H-3** — `printValue()` para campos opcionales en documentos clínicos
19. **H-5** — No re-subir firma existente en PatientConsentCard
20. **H-6** — `useAppRole` sin query extra (leer de AppContext)
21. **H-9** — Upsert en lugar de delete+insert para `user_roles`

### Fase 5 — Refactor y deuda técnica

22. **M-1** — Dividir los tres componentes dios en sub-componentes
23. **M-2 + M-3** — Extraer utilidades compartidas (frecuencia, colores)
24. **3.6** — Unificar flujo de órdenes (Cart.tsx → Supabase)
25. **2.4** — UI de auditoría de firmas
26. **2.1** — Evaluar y limpiar las 5 tablas sin uso

---

*Generado el 2026-06-30 — rama `chore/db-audit`*
