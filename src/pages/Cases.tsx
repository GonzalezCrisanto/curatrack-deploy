import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Activity, Search, MapPin, Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Cases() {
  const { patients } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'activo' | 'en_mejoria' | 'critico' | 'resuelto'>('all');

  const allCases = useMemo(() => {
    return patients.flatMap(p =>
      p.cases.map(c => ({ ...c, patient: p }))
    );
  }, [patients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCases.filter(c => {
      if (status !== 'all' && c.status !== status) return false;
      if (!q) return true;
      const blob = `${c.woundType} ${c.anatomicalLocation} ${c.patient.firstName} ${c.patient.lastName}`.toLowerCase();
      return blob.includes(q);
    });
  }, [allCases, search, status]);

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      activo: { label: 'Activo', cls: 'bg-info/10 text-info border-info/30' },
      en_mejoria: { label: 'En mejoría', cls: 'bg-success/10 text-success border-success/30' },
      critico: { label: 'Crítico', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
      resuelto: { label: 'Resuelto', cls: 'bg-muted text-muted-foreground border-border' },
    };
    const m = map[s] ?? map.activo;
    return <Badge variant="outline" className={`${m.cls} font-body text-xs`}>{m.label}</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="heading-display text-3xl flex items-center gap-3">
              <Activity className="h-7 w-7 text-primary" />
              Casos de heridas
            </h1>
            <p className="font-body text-muted-foreground mt-1">
              Vista global de todas las heridas en seguimiento.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(['all','activo','en_mejoria','critico','resuelto'] as const).map(s => (
              <Button key={s} size="sm" variant={status===s?'default':'outline'} onClick={()=>setStatus(s)} className="font-body text-xs">
                {s==='all'?'Todos':s==='en_mejoria'?'En mejoría':s.charAt(0).toUpperCase()+s.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por paciente, tipo o ubicación..." className="pl-9 font-body" />
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-body text-muted-foreground">No se encontraron casos.</p>
          </CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={()=>navigate(`/patients/${c.patient.id}/cases/${c.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="heading-display text-base">{c.woundType}</CardTitle>
                    {statusBadge(c.status)}
                  </div>
                  <p className="font-body text-sm text-muted-foreground">{c.patient.lastName}, {c.patient.firstName}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 font-body text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {c.anatomicalLocation || '—'}
                  </div>
                  <div className="flex items-center gap-2 font-body text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> {c.evolutions.length} evoluciones
                  </div>
                  <div className="flex justify-end pt-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
