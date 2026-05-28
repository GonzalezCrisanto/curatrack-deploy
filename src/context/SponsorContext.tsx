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
  contact_phone: string | null;
  responsible_person: string | null;
  billing_details: string | null;
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
  resetBrandingToDefault: () => void;
};

const SponsorContext = createContext<Ctx | undefined>(undefined);

const LS_KEY = 'active_sponsor_slug';
const DEFAULT_SLUG = 'demo';
const DEFAULT_THEME = {
  primaryHsl: '217 89% 38%',
  secondaryHsl: '210 20% 96%',
  accentHsl: '142 71% 45%',
  primaryHex: '#1763D2',
  primaryHoverHex: '#1557BA',
};

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

function darkenHex(hex: string, percent = 10): string {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => `${c}${c}`).join('')
    : normalized;
  const num = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const factor = (100 - percent) / 100;
  const r = clamp(Math.round(((num >> 16) & 255) * factor));
  const g = clamp(Math.round(((num >> 8) & 255) * factor));
  const b = clamp(Math.round((num & 255) * factor));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function applyTheme(s: Sponsor) {
  const root = document.documentElement;
  const primary = hexToHslString(s.primary_color);
  const secondary = hexToHslString(s.secondary_color);
  const accent = hexToHslString(s.accent_color);
  const primaryHover = darkenHex(s.primary_color, 12);
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--sidebar-primary', primary);
  root.style.setProperty('--sidebar-ring', primary);
  root.style.setProperty('--brand-blue', primary);
  root.style.setProperty('--brand-green', accent);
  root.style.setProperty('--color-primary', s.primary_color);
  root.style.setProperty('--color-primary-hover', primaryHover);
  root.style.setProperty('--color-primary-hsl', primary);
  root.style.setProperty('--color-primary-hover-hsl', hexToHslString(primaryHover));
  // Keep secondary/accent semantic tokens as-is (light surfaces); only override sidebar accent for richer theming.
  root.style.setProperty('--sidebar-accent-foreground', primary);
  // Custom tokens for sponsor gradients
  root.style.setProperty('--sponsor-primary', primary);
  root.style.setProperty('--sponsor-secondary', secondary);
  root.style.setProperty('--sponsor-accent', accent);
  document.title = 'CuraTrack';
}

function applyDefaultTheme() {
  const root = document.documentElement;
  root.style.setProperty('--primary', DEFAULT_THEME.primaryHsl);
  root.style.setProperty('--ring', DEFAULT_THEME.primaryHsl);
  root.style.setProperty('--sidebar-primary', DEFAULT_THEME.primaryHsl);
  root.style.setProperty('--sidebar-ring', DEFAULT_THEME.primaryHsl);
  root.style.setProperty('--brand-blue', DEFAULT_THEME.primaryHsl);
  root.style.setProperty('--brand-green', DEFAULT_THEME.accentHsl);
  root.style.setProperty('--color-primary', DEFAULT_THEME.primaryHex);
  root.style.setProperty('--color-primary-hover', DEFAULT_THEME.primaryHoverHex);
  root.style.setProperty('--color-primary-hsl', DEFAULT_THEME.primaryHsl);
  root.style.setProperty('--color-primary-hover-hsl', DEFAULT_THEME.primaryHsl);
  root.style.setProperty('--sponsor-primary', DEFAULT_THEME.primaryHsl);
  root.style.setProperty('--sponsor-secondary', DEFAULT_THEME.secondaryHsl);
  root.style.setProperty('--sponsor-accent', DEFAULT_THEME.accentHsl);
  document.title = 'CuraTrack';
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
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;

    let list: Sponsor[] = [];
    if (!uid) {
      const { data } = await supabase
        .from('sponsors')
        .select('*')
        .eq('is_active', true)
        .order('sponsor_name');
      list = (data ?? []) as unknown as Sponsor[];
    } else {
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid);
      const roles = (roleRows ?? []).map((r: any) => r.role as string);
      const isSponsorOnly = roles.includes('sponsor') && !roles.includes('admin');

      if (isSponsorOnly) {
        const { data: mapped } = await supabase
          .from('user_sponsor')
          .select('sponsor_id, sponsors(*)')
          .eq('user_id', uid)
          .maybeSingle();
        const mappedSponsor = (mapped as any)?.sponsors as Sponsor | undefined;
        if (mappedSponsor) {
          list = [mappedSponsor];
        } else {
          const { data: uls } = await supabase
            .from('user_lab_sponsors')
            .select('lab_id')
            .eq('user_id', uid)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          if (uls?.lab_id) {
            const { data: sponsorByLab } = await supabase
              .from('sponsors')
              .select('*')
              .eq('lab_id', uls.lab_id)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();
            list = sponsorByLab ? [sponsorByLab as Sponsor] : [];
          } else {
            list = [];
          }
        }
      } else {
        const { data } = await supabase
          .from('sponsors')
          .select('*')
          .eq('is_active', true)
          .order('sponsor_name');
        list = (data ?? []) as Sponsor[];
      }
    }

    setSponsors(list);
    const slug = await resolveInitialSlug();
    const found = list.find(s => s.slug === slug) ?? list.find(s => s.slug === DEFAULT_SLUG) ?? list[0] ?? null;
    if (found) {
      setSponsor(found);
      applyTheme(found);
      localStorage.setItem(LS_KEY, found.slug);
    } else {
      setSponsor(null);
      applyDefaultTheme();
    }
    setLoading(false);
  }, [resolveInitialSlug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setSponsor(null);
        applyDefaultTheme();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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

  const resetBrandingToDefault = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setSponsor(null);
    applyDefaultTheme();
  }, []);

  return (
    <SponsorContext.Provider value={{ sponsor, sponsors, loading, setSponsorBySlug, refresh, resetBrandingToDefault }}>
      {children}
    </SponsorContext.Provider>
  );
}

export function useSponsor() {
  const ctx = useContext(SponsorContext);
  if (!ctx) throw new Error('useSponsor must be used within SponsorProvider');
  return ctx;
}
