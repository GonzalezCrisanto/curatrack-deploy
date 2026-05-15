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

interface LabRow { id: string; name: string; slug: string }
interface RoleRow { user_id: string; role: string }
interface UserLab { user_id: string; lab_id: string }

export default function AdminAccounts() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [stats, setStats] = useState<Record<string, AccountStats>>({});
  const [labs, setLabs] = useState<LabRow[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, string[]>>({});
  const [labByUser, setLabByUser] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: labRows }, { data: roleRows }, { data: ulRows }, { data: pats }, { data: ords }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('labs').select('id,name,slug').eq('is_active', true).order('name'),
      supabase.from('user_roles').select('user_id,role'),
      supabase.from('user_lab_sponsors').select('user_id,lab_id').eq('is_active', true),
      supabase.from('patients').select('user_id'),
      supabase.from('supply_orders').select('user_id'),
    ]);

    const all = (profs ?? []) as ProfileRow[];
    setProfiles(all);
    setLabs((labRows ?? []) as LabRow[]);

    const rmap: Record<string, string[]> = {};
    for (const r of (roleRows ?? []) as RoleRow[]) (rmap[r.user_id] ||= []).push(r.role);
    setRolesByUser(rmap);

    const lmap: Record<string, string> = {};
    for (const u of (ulRows ?? []) as UserLab[]) lmap[u.user_id] = u.lab_id;
    setLabByUser(lmap);

    const statsMap: Record<string, AccountStats> = {};
    for (const p of all) statsMap[p.user_id] = { user_id: p.user_id, patient_count: 0, order_count: 0 };
    for (const pt of (pats ?? []) as { user_id: string }[]) if (statsMap[pt.user_id]) statsMap[pt.user_id].patient_count++;
    for (const o of (ords ?? []) as { user_id: string }[]) if (statsMap[o.user_id]) statsMap[o.user_id].order_count++;
    setStats(statsMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.first_name} ${p.last_name} ${p.institution ?? ''}`.toLowerCase().includes(q);
  });

  const appRoleOf = (uid: string): 'admin' | 'sponsor' | 'professional' => {
    const rs = rolesByUser[uid] || [];
    if (rs.includes('admin')) return 'admin';
    if (rs.includes('sponsor')) return 'sponsor';
    return 'professional';
  };

  const setRole = async (uid: string, newRole: 'admin' | 'sponsor' | 'professional') => {
    setSavingId(uid);
    try {
      // Replace user's roles with the canonical one for this app
      await supabase.from('user_roles').delete().eq('user_id', uid);
      const dbRole = newRole === 'professional' ? 'professional' : newRole;
      await supabase.from('user_roles').insert({ user_id: uid, role: dbRole as any });
      toast({ title: 'Rol actualizado', description: `Nuevo rol: ${newRole}` });
      await load();
    } catch (e) {
      toast({ title: 'Error al actualizar rol', description: (e as Error).message, variant: 'destructive' });
    } finally { setSavingId(null); }
  };

  const setLab = async (uid: string, labId: string) => {
    setSavingId(uid);
    try {
      await supabase.from('user_lab_sponsors').delete().eq('user_id', uid);
      await supabase.from('user_lab_sponsors').insert({ user_id: uid, lab_id: labId, is_active: true });
      toast({ title: 'Laboratorio asignado' });
      await load();
    } catch (e) {
      toast({ title: 'Error al asignar laboratorio', description: (e as Error).message, variant: 'destructive' });
    } finally { setSavingId(null); }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Cuentas y permisos
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Asigná rol (profesional, sponsor, admin) y laboratorio sponsor a cada cuenta.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cuenta…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center"><p className="font-heading font-semibold">No se encontraron cuentas</p></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const s = stats[p.user_id];
              const ar = appRoleOf(p.user_id);
              const labId = labByUser[p.user_id] || '';
              const Icon = ar === 'admin' ? ShieldCheck : ar === 'sponsor' ? Briefcase : UserCog;
              return (
                <Card key={p.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-heading font-semibold text-sm">{p.first_name} {p.last_name}</p>
                        <Badge variant="outline" className="text-[10px] uppercase">{ar}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.institution ?? '—'} · Mat. {p.license ?? '—'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 md:items-center">
                    <Select value={ar} onValueChange={(v) => setRole(p.user_id, v as any)} disabled={savingId === p.user_id}>
                      <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Profesional</SelectItem>
                        <SelectItem value="sponsor">Sponsor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={labId} onValueChange={(v) => setLab(p.user_id, v)} disabled={savingId === p.user_id || labs.length === 0}>
                      <SelectTrigger className="w-[200px] h-9 text-xs">
                        <SelectValue placeholder="Sin laboratorio" />
                      </SelectTrigger>
                      <SelectContent>
                        {labs.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-right shrink-0 text-xs text-muted-foreground space-y-0.5 md:w-28">
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

