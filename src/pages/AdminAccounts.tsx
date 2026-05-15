import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, ShieldCheck, Briefcase, UserCog } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProfileRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: string | null;
  institution: string | null;
  license: string | null;
  created_at: string;
}

interface AccountStats {
  user_id: string;
  patient_count: number;
  order_count: number;
}

export default function AdminAccounts() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [stats, setStats] = useState<Record<string, AccountStats>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Admin can read all profiles via RLS admin policy
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      const all = (profs ?? []) as ProfileRow[];
      setProfiles(all);

      // Gather per-user counts
      const statsMap: Record<string, AccountStats> = {};
      for (const p of all) {
        statsMap[p.user_id] = { user_id: p.user_id, patient_count: 0, order_count: 0 };
      }

      // Patient counts
      const { data: pats } = await supabase.from('patients').select('user_id');
      for (const pt of (pats ?? []) as { user_id: string }[]) {
        if (statsMap[pt.user_id]) statsMap[pt.user_id].patient_count++;
      }

      // Order counts
      const { data: ords } = await supabase.from('supply_orders').select('user_id');
      for (const o of (ords ?? []) as { user_id: string }[]) {
        if (statsMap[o.user_id]) statsMap[o.user_id].order_count++;
      }

      setStats(statsMap);
      setLoading(false);
    })();
  }, []);

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.first_name} ${p.last_name} ${p.institution ?? ''} ${p.role ?? ''}`.toLowerCase().includes(q);
  });

  const roleLabel = (r: string | null) => {
    switch (r) {
      case 'admin': return 'Administrador';
      case 'medico': return 'Médico/a';
      case 'enfermero': return 'Enfermero/a';
      default: return r ?? 'Profesional';
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-4xl">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Cuentas asociadas
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Profesionales registrados en la plataforma. Visualización de pacientes y pedidos por cuenta.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cuenta…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-heading font-semibold">No se encontraron cuentas</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const s = stats[p.user_id];
              return (
                <Card key={p.id} className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {p.role === 'admin' ? (
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    ) : (
                      <span className="font-heading font-bold text-primary text-sm">
                        {(p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-semibold text-sm">
                        {p.first_name} {p.last_name}
                      </p>
                      <Badge variant="outline" className="text-[10px]">{roleLabel(p.role)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.institution ?? '—'} · Mat. {p.license ?? '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted-foreground space-y-0.5">
                    <p>{s?.patient_count ?? 0} pacientes</p>
                    <p>{s?.order_count ?? 0} pedidos</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
