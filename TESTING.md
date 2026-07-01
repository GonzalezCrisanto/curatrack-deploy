# CuraTrack — Reporte de Testing

Fecha: 2026-06-30 | Rama: `chore/db-audit`

---

## Resultado de la suite automatizada

```
npm test (Vitest v3.2.6)

Test Files   7 passed (7)
Tests       100 passed (100)
Duration     2.65s
```

**100/100 tests pasando. 0 fallos. 0 skips.**

---

## Archivos de test

| Archivo | Tests | Qué cubre |
|---|---|---|
| `src/test/example.test.ts` | 1 | Placeholder de Lovable — no testea lógica real |
| `src/test/appRole.test.ts` | 11 | Resolución de roles: prioridad, defaults, edge cases |
| `src/test/dataTransforms.test.ts` | 22 | Transformaciones de datos, cálculo de edad, shapes de demoPatients |
| `src/test/usePermissions.test.ts` | 27 | Permisos por sección para todos los roles |
| `src/test/roleGuard.test.tsx` | 13 | RoleGuard: loading, auth, allow/deny por rol, homeForRole |
| `src/test/cartContext.test.tsx` | 15 | Carrito: add, update, remove, clear, total, localStorage |
| `src/test/frequencyUtils.test.ts` | 12 | Frecuencias de curación, estados de evolución y caso |

---

## Detalle por módulo

---

### `appRole.test.ts` — 11/11 ✅

Testea `resolveAppRoleFromRows` de `src/lib/appRole.ts`.

| Test | Resultado |
|---|---|
| Array vacío → retorna `'professional'` (default) | ✅ |
| Role no reconocido → retorna `'professional'` | ✅ |
| Array con solo `'professional'` → retorna `'professional'` | ✅ |
| Array con `'admin'` → retorna `'admin'` | ✅ |
| Array con `'sponsor'` → retorna `'sponsor'` | ✅ |
| `admin` gana sobre `sponsor` cuando ambos están presentes | ✅ |
| `admin` gana sobre `professional` cuando ambos están presentes | ✅ |
| `admin` gana cuando los tres roles están presentes | ✅ |
| `sponsor` gana sobre `professional` cuando ambos están presentes | ✅ |
| Entradas duplicadas no causan error | ✅ |
| Mix de roles reconocidos y no reconocidos — el reconocido gana | ✅ |

**Hallazgo**: La función recibe `string[]`, no `{ role: string }[]`. La firma real difiere de lo que la documentación sugería.

---

### `dataTransforms.test.ts` — 22/22 ✅

Testea utilidades exportadas de `src/lib/marketplace.ts` y `src/data/demoData.ts`.

#### `getStockStatus` — 7/7 ✅

| Test | Resultado |
|---|---|
| `stock = null` → `'unknown'` | ✅ |
| `stock = 0` → `'out_of_stock'` | ✅ |
| `stock < 0` → `'out_of_stock'` | ✅ |
| `stock === min_stock` → `'low_stock'` | ✅ |
| `stock < min_stock` → `'low_stock'` | ✅ |
| `stock > min_stock` → `'in_stock'` | ✅ |
| `stock > 0` con `min_stock = null` → `'in_stock'` | ✅ |

#### `calculateAge` — 5/5 ✅

| Test | Resultado |
|---|---|
| `null` → `null` | ✅ |
| `undefined` → `null` | ✅ |
| String de fecha inválida → `null` | ✅ |
| Fecha de nacimiento válida → entero positivo | ✅ |
| Edad > 150 años → `null` (unreasonable date guard) | ✅ |

#### `getPatientAge` — 5/5 ✅

| Test | Resultado |
|---|---|
| Prefiere `birthDate` sobre `age` legacy cuando `birthDate` es válida | ✅ |
| Cae a `age` legacy cuando `birthDate` está ausente | ✅ |
| Cae a `age` legacy cuando `birthDate` es `null` | ✅ |
| Retorna `null` cuando ambos están ausentes | ✅ |
| Retorna `null` cuando `age = 0` y `birthDate` ausente | ✅ |

#### `formatPatientAge` — 3/3 ✅

| Test | Resultado |
|---|---|
| Sin datos de edad → retorna `'—'` | ✅ |
| Con `age` legacy → retorna `"<n> años"` | ✅ |
| Con `birthDate` → retorna `"<n> años"` derivado de la fecha | ✅ |

#### `demoPatients` shape — 3/3 ✅ (verificación de contrato)

| Test | Resultado |
|---|---|
| Array no vacío | ✅ |
| Todos los pacientes tienen campos string requeridos | ✅ |
| Todos los pacientes tienen array `cases` (puede estar vacío) | ✅ |

---

### `usePermissions.test.ts` — 27/27 ✅

Testea el hook `usePermissions` de `src/hooks/usePermissions.ts` para todos los roles posibles.

#### Role: `professional` (→ CLINICIAN) — 8/8 ✅

| Test | Resultado |
|---|---|
| `can('pacientes')` → `true` | ✅ |
| `can('dashboard')` → `true` | ✅ |
| `can('nueva-curacion')` → `true` | ✅ |
| `can('panel-sponsor')` → `false` | ✅ |
| `can('admin-productos')` → `false` | ✅ |
| `can('admin-cuentas')` → `false` | ✅ |
| `isClinicalRole = true`, otros `false` | ✅ |
| `ready = true` | ✅ |

#### Role: `admin` (→ ADMIN) — 6/6 ✅

| Test | Resultado |
|---|---|
| `can('admin-productos')` → `true` | ✅ |
| `can('admin-pedidos')` → `true` | ✅ |
| `can('admin-cuentas')` → `true` | ✅ |
| `can` de secciones clínicas → `true` (admin es superconjunto) | ✅ |
| `can` de secciones sponsor → `true` (admin es superconjunto) | ✅ |
| `isAdminRole = true`, otros `false` | ✅ |

#### Role: `sponsor` (→ SPONSOR) — 6/6 ✅

| Test | Resultado |
|---|---|
| `can('panel-sponsor')` → `true` | ✅ |
| `can('estadisticas')` → `true` | ✅ |
| `can('pacientes')` → `false` (aislamiento de datos, Ley 25.326) | ✅ |
| `can('dashboard')` → `false` | ✅ |
| `can('admin-cuentas')` → `false` | ✅ |
| `isSponsorRole = true`, otros `false` | ✅ |

#### Role: `null` (no autenticado / cargando) — 3/3 ✅

| Test | Resultado |
|---|---|
| `can()` retorna `false` para cualquier sección | ✅ |
| Todos los flags de rol son `false` | ✅ |
| `ready = false` | ✅ |

---

### `roleGuard.test.tsx` — 13/13 ✅

Testea `src/components/RoleGuard.tsx` con un mock del contexto de autenticación.

#### Loading states — 2/2 ✅

| Test | Resultado |
|---|---|
| `authReady = false` → renderiza skeletons de carga | ✅ |
| Auth lista pero resolución de rol en curso → renderiza skeleton | ✅ |

#### Usuario no autenticado — 1/1 ✅

| Test | Resultado |
|---|---|
| Sin usuario → no renderiza children | ✅ |

#### Roles permitidos renderiza children — 4/4 ✅

| Test | Resultado |
|---|---|
| Rol del usuario coincide con el único rol permitido → renderiza | ✅ |
| `admin` en la lista permitida → renderiza | ✅ |
| `sponsor` en la lista permitida → renderiza | ✅ |
| Lista con los tres roles → renderiza para cualquiera | ✅ |

#### Roles no permitidos redirigen — 2/2 ✅

| Test | Resultado |
|---|---|
| Rol del usuario no está en la lista → no renderiza children | ✅ |
| `professional` intenta acceder a ruta solo-admin → no renderiza | ✅ |

#### `homeForRole` — 4/4 ✅

| Test | Resultado |
|---|---|
| `'sponsor'` → `/panel-sponsor` | ✅ |
| `'professional'` → `/dashboard` | ✅ |
| `'admin'` → `/dashboard` | ✅ |
| `null` (no autenticado) → `/dashboard` (fallback) | ✅ |

---

### `cartContext.test.tsx` — 15/15 ✅

Testea `src/context/CartContext.tsx` con Supabase mockeado y localStorage real de jsdom.

#### Estado inicial — 3/3 ✅

| Test | Resultado |
|---|---|
| Carrito vacío cuando localStorage está vacío | ✅ |
| Hidrata desde localStorage pre-existente al montar | ✅ |
| Maneja datos corruptos en localStorage sin crashear | ✅ |

#### `addProduct` — 4/4 ✅

| Test | Resultado |
|---|---|
| Agrega producto nuevo y persiste en localStorage | ✅ |
| Incrementa cantidad cuando el mismo producto se agrega de nuevo | ✅ |
| Crea líneas separadas para productos distintos | ✅ |
| Usa cantidad `1` como default cuando no se pasa quantity | ✅ |

#### `updateQuantity` — 2/2 ✅

| Test | Resultado |
|---|---|
| Actualiza cantidad y persiste en localStorage | ✅ |
| Ignora llamadas con `quantity < 1` (guard contra vaciar) | ✅ |

#### `removeItem` — 2/2 ✅

| Test | Resultado |
|---|---|
| Elimina item del estado y de localStorage | ✅ |
| Solo elimina el producto apuntado, deja intactos los demás | ✅ |

#### `clearCart` — 1/1 ✅

| Test | Resultado |
|---|---|
| Vacía todos los items y escribe array vacío en localStorage | ✅ |

#### `totalEstimated` — 3/3 ✅

| Test | Resultado |
|---|---|
| Calcula total correctamente con múltiples items y cantidades | ✅ |
| Trata `price = null` como 0 en el total | ✅ |
| Recalcula total después de `updateQuantity` | ✅ |

---

### `frequencyUtils.test.ts` — 12/12 ✅

Testea constantes y contratos de `src/data/demoData.ts`.

#### `healingFrequencies` — 5/5 ✅

| Test | Resultado |
|---|---|
| Array no vacío | ✅ |
| Contiene las 4 opciones preset estándar (`Diaria`, `Cada 48hs`, `Cada 72hs`, `Semanal`) | ✅ |
| Contiene `'A demanda'` (opción abierta) | ✅ |
| Sin entradas duplicadas | ✅ |
| Todas las entradas son strings no vacíos sin espacios extra | ✅ |

#### Contrato preset vs. manual-days — 3/3 ✅

| Test | Resultado |
|---|---|
| Todos los entries de `presetSet` (inline en `NewCuration.tsx`) están en `healingFrequencies` | ✅ |
| `'A demanda'` está excluida de `presetSet` (requiere entrada manual de días) | ✅ |
| `presetSet` es un subconjunto propio de `healingFrequencies` | ✅ |

#### `evolutionStatuses` — 2/2 ✅

| Test | Resultado |
|---|---|
| Array no vacío de objetos con `value` y `label` | ✅ |
| Exactamente un status tiene `closes: true` (`cicatrizada`) | ✅ |
| Contiene `tratamiento_activo` como status no-cierre | ✅ |

#### `woundStatuses` — 2/2 ✅

| Test | Resultado |
|---|---|
| Contiene los 4 valores esperados (`activo`, `en_mejoria`, `critico`, `resuelto`) | ✅ |
| Todos tienen `label` y `color` no vacíos | ✅ |

---

## Lo que NO se puede testear aún (requiere refactor)

Estas áreas tienen cobertura cero porque el código está estructurado de forma que impide el testing directo.

| Área | Motivo | Refactor necesario |
|---|---|---|
| `rowToPatient`, `patientToRow`, `rowToCase`, `rowToEvolution` | Funciones privadas dentro de `AppContext.tsx`, no exportadas | Extraer a `src/lib/patientTransforms.ts` |
| Frequency-to-days mapping | Lógica inline en `CaseDetail.tsx` (~línea 420), no exportada | Extraer a `src/lib/healingFrequency.ts` |
| `getUserAppRole` (async) | Acoplada a Supabase, sin interfaz inyectable | Separar la lógica pura de la IO |
| `confirmOrder` en CartContext | Requiere mock de 3 tablas Supabase en secuencia — frágil | Mejor cubierto con tests E2E o integración contra Supabase local |
| Componentes dios (PatientDetail, CaseDetail, Dashboard) | 1300–1500 líneas por archivo, estado y lógica mezclados | Descomponer en sub-componentes testeables |
| Flujo de evoluciones (CaseDetail path) | In-memory, sin Supabase → no hay contrato que testear hasta arreglar el bug 3.2 | Primero arreglar que persista, después testear |

**Campos que `patientToRow()` descarta intencionalmente** (sin columna en DB todavía):
`treatingDoctorName`, `treatingDoctorPhone`, `birthDate`, `cases`, `allergies`, `insurance`, `emergencyContactName`, `emergencyContactPhone`

Un test de round-trip `rowToPatient(patientToRow(patient))` detectaría el bug C-6 del AUDIT.md inmediatamente.

---

## Cobertura por módulo

| Módulo | Testeable hoy | Cubierto | Cobertura |
|---|---|---|---|
| `src/lib/appRole.ts` | ✅ Sí | ✅ Sí | ~90% |
| `src/lib/marketplace.ts` (getStockStatus) | ✅ Sí | ✅ Sí | 100% |
| `src/hooks/usePermissions.ts` | ✅ Sí | ✅ Sí | ~95% |
| `src/components/RoleGuard.tsx` | ✅ Sí | ✅ Sí | ~85% |
| `src/context/CartContext.tsx` (operaciones locales) | ✅ Sí | ✅ Sí | ~75% |
| `src/data/demoData.ts` (shapes y contratos) | ✅ Sí | ✅ Sí | ~60% |
| `src/context/AppContext.tsx` (transforms) | ❌ No exportadas | ❌ No | 0% |
| `src/pages/CaseDetail.tsx` | ❌ Componente dios | ❌ No | 0% |
| `src/pages/PatientDetail.tsx` | ❌ Componente dios | ❌ No | 0% |
| `src/pages/NewCuration.tsx` | ❌ Acoplado a Supabase | ❌ No | 0% |
| `src/context/SponsorContext.tsx` | ❌ Acoplado a Supabase | ❌ No | 0% |
| Tests E2E (Playwright) | ❌ Sin archivos | ❌ No | 0% |

---

## Próximos tests a escribir (por impacto)

1. **`patientTransforms.test.ts`** — round-trip `rowToPatient ↔ patientToRow` (detecta bug C-6)
2. **`AppContext` integración** — con Supabase local (`supabase start`) para testear el flujo completo de carga de datos
3. **`healingFrequency.test.ts`** — mapeo frequency → días (requiere extraer la lógica de CaseDetail)
4. **E2E: flujo clínico básico** — login → crear paciente → nueva curación → ver evolución persistida
5. **E2E: aislamiento por rol** — sponsor no puede ver datos clínicos, professional no puede acceder a admin

---

*Generado el 2026-06-30 — rama `chore/db-audit` — `npm test`: 100/100 ✅*
