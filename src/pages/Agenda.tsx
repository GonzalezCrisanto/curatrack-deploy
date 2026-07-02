import { useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, ChevronRight, User, MoreVertical } from 'lucide-react';
import { useApp, type Turno } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { TurnoActionsDialog } from '@/components/TurnoActionsDialog';

type AgendaFilter = 'proximos' | 'completados' | 'cancelados';

const AGENDA_FILTERS: { value: AgendaFilter; label: string; matches: (s: Turno['status']) => boolean }[] = [
  { value: 'proximos', label: 'Próximos', matches: (s) => s === 'programado' || s === 'vencido' },
  { value: 'completados', label: 'Completados', matches: (s) => s === 'completado' },
  { value: 'cancelados', label: 'Cancelados', matches: (s) => s === 'cancelado' },
];

function turnoStatusLabel(status: Turno['status']) {
  if (status === 'completado') return 'Completado';
  if (status === 'cancelado') return 'Cancelado';
  if (status === 'vencido') return 'Vencido';
  return 'Programado';
}

function turnoStatusChipClasses(status: Turno['status']) {
  if (status === 'completado') return 'bg-success/10 text-success border-success/40';
  if (status === 'cancelado') return 'bg-muted text-muted-foreground border-border';
  if (status === 'vencido') return 'bg-destructive/10 text-destructive border-destructive/40';
  return 'bg-warning/10 text-warning border-warning/40';
}

export default function Agenda() {
  const { patients, turnos } = useApp();
  const navigate = useNavigate();
  const [turnoActionsTarget, setTurnoActionsTarget] = useState<{ turno: Turno; patientName: string } | null>(null);
  const [filter, setFilter] = useState<AgendaFilter>('proximos');

  const patientById = useMemo(() => {
    const map: Record<string, (typeof patients)[number]> = {};
    patients.forEach(p => { map[p.id] = p; });
    return map;
  }, [patients]);

  const allTurnos = useMemo(() => {
    const items: { id: string; date: string; time?: string; patient: (typeof patients)[number]; caseId: string | null; activeWoundCount: number; status: Turno['status'] }[] = [];
    turnos.forEach(t => {
      const patient = patientById[t.patientId];
      if (!patient) return;
      items.push({
        id: t.id,
        date: t.date,
        time: t.time || undefined,
        patient,
        caseId: t.caseId,
        activeWoundCount: patient.cases.filter(c => c.status !== 'resuelto').length,
        status: t.status,
      });
    });
    return items;
  }, [turnos, patientById]);

  const activeFilter = AGENDA_FILTERS.find((f) => f.value === filter)!;
  const filterCounts = useMemo(() => {
    const counts: Record<AgendaFilter, number> = { proximos: 0, completados: 0, cancelados: 0 };
    allTurnos.forEach((t) => {
      AGENDA_FILTERS.forEach((f) => { if (f.matches(t.status)) counts[f.value]++; });
    });
    return counts;
  }, [allTurnos]);

  const upcoming = useMemo(() => {
    const filtered = allTurnos.filter((it) => activeFilter.matches(it.status));
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    // Historical views (completados/cancelados) read better most-recent-first.
    return filter === 'proximos' ? sorted : sorted.reverse();
  }, [allTurnos, activeFilter, filter]);

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
    if (diff < 0 && filter === 'proximos') return `Vencido (${Math.abs(diff)} d)`;
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const emptyMessage = filter === 'proximos'
    ? 'No hay controles programados.'
    : filter === 'completados'
      ? 'Todavía no hay turnos completados.'
      : 'No hay turnos cancelados.';

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-6 max-w-5xl mx-auto w-full">
        <div>
          <h1 className="heading-display text-[26px] flex items-center gap-3">
            <Calendar className="h-7 w-7 text-primary" /> Agenda
          </h1>
          <p className="font-body text-base text-muted-foreground mt-1">
            Turnos programados para los pacientes en seguimiento.
          </p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as AgendaFilter)}>
          <TabsList className="font-body">
            {AGENDA_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="font-body text-sm">
                {f.label}
                <Badge variant="secondary" className="ml-2 font-body text-sm">{filterCounts[f.value]}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {groups.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-body text-base text-muted-foreground">{emptyMessage}</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {groups.map(([date, items]) => (
              <Card key={date}>
                <CardHeader className="pb-3">
                  <CardTitle className="heading-display text-lg flex items-center justify-between">
                    <span className="capitalize">{labelFor(date)}</span>
                    <Badge variant="outline" className="font-body text-sm">{items.length} turnos</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((it, i) => (
                    <div
                      key={i}
                      className="w-full flex items-center gap-1 rounded-md border border-border/60 hover:bg-accent/50 transition-colors"
                    >
                      <button
                        onClick={() => navigate(it.caseId ? `/patients/${it.patient.id}/cases/${it.caseId}` : `/patients/${it.patient.id}`)}
                        className="flex-1 min-w-0 flex items-center gap-3 p-3 text-left"
                      >
                        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 font-body text-base">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{it.patient.lastName}, {it.patient.firstName}</span>
                            {it.time && <span className="text-muted-foreground">· {it.time}</span>}
                          </div>
                          <div className="font-body text-sm text-muted-foreground truncate">
                            {it.activeWoundCount} herida{it.activeWoundCount !== 1 ? 's' : ''} activa{it.activeWoundCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <Badge variant="outline" className={`font-body text-[12px] uppercase shrink-0 ${turnoStatusChipClasses(it.status)}`}>
                          {turnoStatusLabel(it.status)}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 mr-2"
                        aria-label="Acciones del turno"
                        onClick={() => {
                          const t = turnos.find(x => x.id === it.id);
                          if (t) setTurnoActionsTarget({ turno: t, patientName: `${it.patient.firstName} ${it.patient.lastName}` });
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>

      <TurnoActionsDialog
        turno={turnoActionsTarget?.turno ?? null}
        patientName={turnoActionsTarget?.patientName}
        open={!!turnoActionsTarget}
        onOpenChange={(o) => { if (!o) setTurnoActionsTarget(null); }}
      />
    </AppLayout>
  );
}
