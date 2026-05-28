# CuraTrack — Claude Code Instructions

See [AGENTS.md](AGENTS.md) for full project context (architecture, roles, routes, DB schema, dev setup).

## Communication
- Respond in **Spanish**. Code, comments, and commit messages in **English**.

## Running the app
```powershell
npm run dev   # → http://localhost:8080
```
Demo logins available at `/login` (no account needed).

## Key conventions
- Minimize scope: fix only what was asked, no surrounding cleanup.
- No commits or pushes unless explicitly requested.
- UI strings stay in Spanish.
- Don't edit auto-generated files: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`.
- State and data fetching follow the existing Context + TanStack Query pattern — don't introduce new patterns.
- Imports use the `@/` alias (maps to `src/`).

## Testing
- Unit/integration: `npm test` (Vitest, jsdom)
- E2E: Playwright — `npx playwright test`

## What NOT to do
- Don't add Docker or a local Node backend — the app uses Supabase cloud.
- Don't store secrets in the frontend. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (public keys).
- Don't duplicate logic that belongs in Supabase RLS or Edge Functions.
