// Ephemeral public demo mode: baseline data is read once from Supabase, but
// every mutation made during the session stays local to that browser tab
// (see DemoAppProvider). Enabled via env var on the dedicated demo deployment,
// with a `?demo=1` query override for local testing.
//
// The `?demo=1` param only needs to appear once — client-side redirects (e.g.
// "/" -> "/login") drop query strings, so we latch the flag into sessionStorage
// on first detection to keep it true for the rest of the tab session.
const DEMO_QUERY_FLAG_KEY = 'curatrack_demo_query_flag';

export function isDemoMode(): boolean {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return true;
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('demo') === '1') {
    sessionStorage.setItem(DEMO_QUERY_FLAG_KEY, '1');
    return true;
  }
  return sessionStorage.getItem(DEMO_QUERY_FLAG_KEY) === '1';
}
