import { useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ChevronRight, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getNextControlTime } from '@/lib/appointments';
import { useNavigate } from 'react-router-dom';

export default function Agenda() {
  const { patients } = useApp();
  const navigate = useNavigate();

  const upcoming = useMemo(() => {
    const items: { date: string; time?: string; patient: any; caseId: string; woundType: string }[] = [];
    patients.forEach(p => {
      p.cases.forEach(c => {
        c.evolutions.forEach(e => {
          if (e.nextControl) {
            items.push({ date: e.nextControl, time: getNextControlTime(e), patient: p, caseId: c.id, woundType: c.woundType });
          }
        });
      });
    });
    return items.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  }, [patients]);

  const today = new Date().toISOString().slice(0, 10);
  const groups = useMemo(() => {
    const g: Record<string, typeof upcoming> = {};
    upcoming.forEach(it => {
      g[it.date] = g[it.date] || [];
      g[it.date].push(it);
    });
    return Object.entries(g).slice(0, 30);
  }, [upcoming]);

  const labelFor = (date: string) => {
    if (date === today) return 'Hoy';
    const d = new Date(date + 'T00:00:00');
    const t = new Date(today + 'T00:00:00');
    const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
    if (diff === 1) return 'Mañana';
    if (diff < 0) return `Vencido (${Math.abs(diff)} d)`;
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-6 max-w-5xl mx-auto w-full">
        <div>
          <h1 className="heading-display text-3xl flex items-center gap-3">
            <Calendar className="h-7 w-7 text-primary" /> Agenda
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Próximos controles programados para los pacientes en seguimiento.
          </p>
        </div>

        {groups.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-body text-muted-foreground">No hay controles programados.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {groups.map(([date, items]) => (
              <Card key={date}>
                <CardHeader className="pb-3">
                  <CardTitle className="heading-display text-base flex items-center justify-between">
                    <span className="capitalize">{labelFor(date)}</span>
                    <Badge variant="outline" className="font-body text-xs">{items.length} turnos</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((it, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/patients/${it.patient.id}/cases/${it.caseId}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-md border border-border/60 hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 font-body text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{it.patient.lastName}, {it.patient.firstName}</span>
                          {it.time && <span className="text-muted-foreground">· {it.time}</span>}
                        </div>
                        <div className="font-body text-xs text-muted-foreground truncate">{it.woundType}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </AppLayout>
  );
}
