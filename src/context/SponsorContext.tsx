import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Sponsor = {
  id: string;
  slug: string;
  sponsor_name: string;
  app_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  catalog_name: string;
  sponsor_label: string;
  support_email: string | null;
  sales_contact_label: string | null;
  powered_by_label: string | null;
  legal_footer: string | null;
  lab_id: string | null;
};

type Ctx = {
  sponsor: Sponsor | null;
  sponsors: Sponsor[];
  loading: boolean;
  setSponsorBySlug: (slug: string, persistToUser?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const SponsorContext = createContext<Ctx | undefined>(undefined);

const LS_KEY = 'active_sponsor_slug';
const DEFAULT_SLUG = 'demo';

// Convert "#00965E" to "0 100% 29%" approx HSL string for CSS var token.
function hexToHslString(hex: string): string {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hH = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hH = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hH = (b - r) / d + 2; break;
      case b: hH = (r - g) / d + 4; break;
    }
    hH /= 6;
  }
  return `${Math.round(hH * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(s: Sponsor) {
  const root = document.documentElement;
  const primary = hexToHslString(s.primary_color);
  const secondary = hexToHslString(s.secondary_color);
  const accent = hexToHslString(s.accent_color);
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--sidebar-primary', primary);
  root.style.setProperty('--sidebar-ring', primary);
  root.style.setProperty('--brand-blue', primary);
  root.style.setProperty('--brand-green', accent);
  // Keep secondary/accent semantic tokens as-is (light surfaces); only override sidebar accent for richer theming.
  root.style.setProperty('--sidebar-accent-foreground', primary);
  // Custom tokens for sponsor gradients
  root.style.setProperty('--sponsor-primary', primary);
  root.style.setProperty('--sponsor-secondary', secondary);
  root.style.setProperty('--sponsor-accent', accent);
  document.title = s.app_name;
}

export function SponsorProvider({ children }: { children: ReactNode }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveInitialSlug = useCallback(async (): Promise<string> => {
    // 1. URL param
    const url = new URL(window.location.href);
    const param = url.searchParams.get('sponsor');
    if (param) {
      localStorage.setItem(LS_KEY, param);
      return param;
    }
    // 2. user_sponsor (if logged)
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session?.user?.id) {
      const { data } = await supabase
        .from('user_sponsor')
        .select('sponsor_id, sponsors(slug)')
        .eq('user_id', sess.session.user.id)
        .maybeSingle();
      const slug = (data as any)?.sponsors?.slug;
      if (slug) return slug;
    }
    // 3. localStorage
    const ls = localStorage.getItem(LS_KEY);
    if (ls) return ls;
    return DEFAULT_SLUG;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sponsors')
      .select('*')
      .eq('is_active', true)
      .order('sponsor_name');
    const list = (data ?? []) as Sponsor[];
    setSponsors(list);
    const slug = await resolveInitialSlug();
    const found = list.find(s => s.slug === slug) ?? list.find(s => s.slug === DEFAULT_SLUG) ?? list[0] ?? null;
    if (found) {
      setSponsor(found);
      applyTheme(found);
      localStorage.setItem(LS_KEY, found.slug);
    }
    setLoading(false);
  }, [resolveInitialSlug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSponsorBySlug = useCallback(async (slug: string, persistToUser = true) => {
    const found = sponsors.find(s => s.slug === slug);
    if (!found) return;
    setSponsor(found);
    applyTheme(found);
    localStorage.setItem(LS_KEY, slug);
    if (persistToUser) {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        await supabase
          .from('user_sponsor')
          .upsert({ user_id: uid, sponsor_id: found.id }, { onConflict: 'user_id' });
      }
    }
  }, [sponsors]);

  return (
    <SponsorContext.Provider value={{ sponsor, sponsors, loading, setSponsorBySlug, refresh }}>
      {children}
    </SponsorContext.Provider>
  );
}

export function useSponsor() {
  const ctx = useContext(SponsorContext);
  if (!ctx) throw new Error('useSponsor must be used within SponsorProvider');
  return ctx;
}
