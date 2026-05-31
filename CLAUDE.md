# CuraTrack — Claude Code Instructions

See [AGENTS.md](AGENTS.md) for full project context (architecture, roles, routes, DB schema, dev setup).

## Communication
- Respond in **Spanish**. Code, comments, and commit messages in **English**.
- UI strings (labels, buttons, messages visible to the user) must stay in **Spanish**; all identifiers, comments, and logic in **English**.

## Running the app
```powershell
npm run dev   # → http://localhost:8080
```
Demo logins available at `/login` (no account needed).

## Route / Role access matrix

| Group | Routes | Roles allowed |
|-------|--------|---------------|
| Clinical | `/dashboard`, `/patients`, `/cases`, `/curation/new`, `/agenda`, `/assistant` | `professional`, `admin` |
| Sponsor | `/sponsor`, `/reports`, `/statistics` | `sponsor`, `admin` |
| Shared | `/marketplace`, `/orders`, `/settings` | all authenticated |
| Admin | `/admin/products`, `/admin/orders`, `/admin/accounts` | `admin` |

`RoleGuard` (`src/components/RoleGuard.tsx`) enforces these rules. `useAppRole` reads the canonical role from the `user_roles` table.

## Key conventions
- Minimize scope: fix only what was asked, no surrounding cleanup.
- No commits or pushes unless explicitly requested.
- UI strings stay in Spanish; all code identifiers and comments in English.
- Don't edit auto-generated files: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`.
- State and data fetching follow the existing Context + TanStack Query pattern — don't introduce new patterns.
  - `Dashboard.tsx` fetches appointments and patients via `AppContext` (React Context) + TanStack Query hooks; follow the same pattern for any new data on that page.
- Imports use the `@/` alias (maps to `src/`).
- Every UI change must be responsive: consider mobile layout in the same implementation.
  On mobile, elements should stack vertically, text should be readable, and touch targets
  should be large enough. Never leave mobile layout as an afterthought.

## Testing
- Unit/integration: `npm test` (Vitest, jsdom)
- E2E: Playwright — `npx playwright test`

## What NOT to do
- Don't add Docker or a local Node backend — the app uses Supabase cloud.
- Don't store secrets in the frontend. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (public keys).
- Don't duplicate logic that belongs in Supabase RLS or Edge Functions.
