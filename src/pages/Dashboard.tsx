import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { useAppRole } from '@/hooks/useAppRole';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Activity, Users, AlertTriangle, CalendarClock, Clock, ShoppingBag,
  TrendingUp, Sparkles, Plus, ArrowRight, Stethoscope, Package,
  AlertCircle, CheckCircle2, Lightbulb, Pill, FileBarChart, ChevronLeft, ChevronRight, Search,
} from 'lucide-react';

const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SPANISH_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function todayLabel(d = new Date()) {
  return `${SPANISH_DAYS[d.getDay()]} ${d.getDate()} de ${SPANISH_MONTHS[d.getMonth()]}`;
}

function getGreeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromISO(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function addDays(iso: string, delta: number) {
  const next = fromISO(iso);
  next.setDate(next.getDate() + delta);
  return toISO(next);
}

function monthLabel(d: Date) {
  return `${SPANISH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function daysSince(dateIso?: string) {
  if (!dateIso) return null;
  const base = new Date(`${dateIso}T12:00:00`).getTime();
  if (Number.isNaN(base)) return null;
  return Math.max(0, Math.floor((Date.now() - base) / 86400000));
}

function statusPriority(status?: string) {
  if (status === 'critico') return 0;
  if (status === 'activo') return 1;
  if (status === 'en_mejoria') return 2;
  return 3;
}

function statusLabel(status?: string) {
  if (status === 'critico') return 'Crítico';
  if (status === 'activo') return 'Activo';
  if (status === 'en_mejoria') return 'En mejoría';
  return 'Estable';
}

function statusChipClasses(status?: string) {
  if (status === 'critico') return 'bg-destructive/10 text-destructive border-destructive/40';
  if (status === 'activo') return 'bg-warning/10 text-warning border-warning/40';
  if (status === 'en_mejoria') return 'bg-success/10 text-success border-success/40';
  return 'bg-muted text-muted-foreground border-border';
}

export default function Dashboard() {
  const { patients, currentUserName, patientsLoading } = useApp();
  const { sponsor } = useSponsor();
  const { role, ready: roleReady } = useAppRole();
  const navigate = useNavigate();
  const patientSearchRef = useRef<HTMLInputElement | null>(null);
  const [orderCount, setOrderCount] = useState({ total: 0, pending: 0, sent: 0 });
  const [recommendedProducts, setRecommendedProducts] = useState<Array<{ name: string; category?: string }>>([]);
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [focusedDate, setFocusedDate] = useState(() => toISO(new Date()));
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [selectedOpportunity, setSelectedOpportunity] = useState<{
    title: string;
    detail: string;
    suggestion: string;
    to: string;
  } | null>(null);
  const [patientQuery, setPatientQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const isProfessionalView = role === 'professional';

  useEffect(() => {
    if (isProfessionalView) {
      patientSearchRef.current?.focus();
    }
  }, [isProfessionalView]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = supabase.from('supply_orders').select('id,status,created_at');
      if (sponsor?.lab_id) q = q.eq('lab_id', sponsor.lab_id);
      const { data: ords } = await q;
      if (cancelled) return;
      const list = ords ?? [];
      setOrderCount({
        total: list.length,
        pending: list.filter((o: any) => o.status === 'borrador').length,
        sent: list.filter((o: any) => o.status === 'enviado').length,
      });
    })();
    (async () => {
      let pq = supabase
        .from('lab_products')
        .select('name')
        .eq('is_active', true)
        .limit(3);
      if (sponsor?.lab_id) pq = pq.eq('lab_id', sponsor.lab_id);
      const { data } = await pq;
      if (!cancelled) setRecommendedProducts((data ?? []) as any);
    })();
    return () => {
      cancelled = true;
    };
  }, [sponsor?.lab_id]);

  const allCases = useMemo(() => patients.flatMap(p => p.cases), [patients]);
  const allEvos = useMemo(() => allCases.flatMap(c => c.evolutions), [allCases]);
  const casesWithPatient = useMemo(
    () =>
      patients.flatMap((p) =>
        p.cases.map((c) => ({
          patientId: p.id,
          patientName: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Paciente sin identificar',
          caseId: c.id,
          woundType: c.woundType,
          caseStatus: c.status,
          pain: c.pain,
          evolutions: c.evolutions,
        })),
      ),
    [patients],
  );

  const today = toISO(new Date());
  const activeCases = allCases.filter(c => c.status === 'activo' || c.status === 'critico' || c.status === 'en_mejoria');
  const criticalCases = allCases.filter(c => c.status === 'critico');
  const agendaDate = selectedCalendarDate ?? today;

  const appointmentsByDate = casesWithPatient.flatMap(c =>
    c.evolutions
      .filter(e => !!e.nextControl)
      .map(e => ({
        evo: e,
        woundType: c.woundType,
        status: c.caseStatus,
        patientId: c.patientId,
        caseId: c.caseId,
        patientName: c.patientName,
        nextControl: e.nextControl!,
      })),
  );
  const agendaAppointments = appointmentsByDate.filter((a) => a.nextControl === agendaDate);

  const upcomingControls = allEvos.filter(e => e.nextControl && e.nextControl >= today).length;
  const overdueControls = allEvos.filter(e => e.nextControl && e.nextControl < today).length;
  const evosLast7Days = allEvos.filter(e => {
    const t = new Date(e.date + 'T12:00:00').getTime();
    return t >= Date.now() - 7 * 86400000;
  }).length;

  const alerts = useMemo(() => {
    const list: Array<{
      type: string;
      label: string;
      severity: 'destructive' | 'warning' | 'info';
      icon: typeof AlertTriangle;
      to?: string;
      patientName?: string;
      message?: string;
    }> = [];
    casesWithPatient.forEach((c) => {
      const caseDetail = `/patients/${c.patientId}/cases/${c.caseId}`;
      const patientDisplayName = c.patientName?.trim() || 'Paciente sin identificar';
      if (c.caseStatus === 'critico') {
        const message = `${c.woundType || 'Herida'} en estado crítico`;
        list.push({
          type: 'critical',
          label: `${patientDisplayName}: ${message}`,
          severity: 'destructive',
          icon: AlertTriangle,
          to: caseDetail,
          patientName: patientDisplayName,
          message,
        });
      }
      if (c.evolutions.some((e) => e.nextControl && e.nextControl < today)) {
        const message = 'control vencido';
        list.push({
          type: 'overdue',
          label: `${patientDisplayName}: ${message}`,
          severity: 'warning',
          icon: Clock,
          to: caseDetail,
          patientName: patientDisplayName,
          message,
        });
      }
      const last = c.evolutions.map(e => e.date).sort().slice(-1)[0];
      if (last && c.caseStatus !== 'resuelto') {
        const days = (Date.now() - new Date(last + 'T12:00:00').getTime()) / 86400000;
        if (days > 14) {
          const message = 'sin evolución en 14+ días';
          list.push({
            type: 'no-evo',
            label: `${patientDisplayName}: ${message}`,
            severity: 'warning',
            icon: AlertCircle,
            to: caseDetail,
            patientName: patientDisplayName,
            message,
          });
        }
      }
      if (Number(c.pain ?? 0) >= 7) {
        const message = 'dolor elevado (≥7)';
        list.push({
          type: 'pain',
          label: `${patientDisplayName}: ${message}`,
          severity: 'warning',
          icon: Activity,
          to: caseDetail,
          patientName: patientDisplayName,
          message,
        });
      }
    });
    if (list.length === 0) {
      list.push({ type: 'ok', label: 'Sin alertas activas. Buen seguimiento clínico.', severity: 'info', icon: CheckCircle2 });
    }
    return list.slice(0, 6);
  }, [casesWithPatient, today]);

  const orderedAlerts = useMemo(() => {
    const rank = (severity: 'destructive' | 'warning' | 'info') => {
      if (severity === 'destructive') return 0;
      if (severity === 'warning') return 1;
      return 2;
    };
    return [...alerts].sort((a, b) => rank(a.severity) - rank(b.severity));
  }, [alerts]);

  const visibleAlerts = useMemo(() => {
    if (showAllAlerts || orderedAlerts.length <= 5) return orderedAlerts;
    const criticalFirst = orderedAlerts.filter((a) => a.severity === 'destructive');
    const others = orderedAlerts.filter((a) => a.severity !== 'destructive');
    const keepOthers = Math.max(0, 5 - criticalFirst.length);
    return [...criticalFirst, ...others.slice(0, keepOthers)];
  }, [orderedAlerts, showAllAlerts]);

  const alertCaseCount = new Set(alerts.filter(a => a.to).map(a => a.to)).size;
  const criticalAlerts = alerts.filter((a) => a.type === 'critical' && a.to).slice(0, 3);

  const professionalPatientCards = useMemo(() => {
    const todayIso = toISO(new Date());
    const entries = patients.flatMap((patient) => {
      const patientName = `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || 'Paciente sin identificar';
      const activeOrScheduledCases = patient.cases.filter((c) => {
        const hasTodayControl = c.evolutions.some((e) => e.nextControl === todayIso);
        const isActiveCase = c.status === 'critico' || c.status === 'activo' || c.status === 'en_mejoria';
        return hasTodayControl || isActiveCase;
      });

      if (activeOrScheduledCases.length === 0) {
        return [];
      }

      const representative = [...activeOrScheduledCases].sort((a, b) => {
        const byStatus = statusPriority(a.status) - statusPriority(b.status);
        if (byStatus !== 0) return byStatus;
        const aLast = [...a.evolutions].sort((x, y) => y.date.localeCompare(x.date))[0]?.date;
        const bLast = [...b.evolutions].sort((x, y) => y.date.localeCompare(x.date))[0]?.date;
        return (daysSince(bLast) ?? -1) - (daysSince(aLast) ?? -1);
      })[0];

      const lastEvolutionDate = [...representative.evolutions].sort((a, b) => b.date.localeCompare(a.date))[0]?.date;

      return [{
        patientId: patient.id,
        patientName,
        patientDni: patient.dni || '',
        diagnosis: `${representative.woundType || 'Herida'}${representative.anatomicalLocation ? ` - ${representative.anatomicalLocation}` : ''}`,
        status: representative.status,
        caseId: representative.id,
        lastEvolutionDate,
        urgency: statusPriority(representative.status),
        ageLastCuracion: daysSince(lastEvolutionDate) ?? 0,
      }];
    });

    return entries
      .sort((a, b) => {
        if (a.urgency !== b.urgency) return a.urgency - b.urgency;
        return b.ageLastCuracion - a.ageLastCuracion;
      });
  }, [patients]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  const patientSuggestions = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter((p) => {
        const fullName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim().toLowerCase();
        const dni = (p.dni ?? '').toLowerCase();
        return fullName.includes(q) || dni.includes(q);
      })
      .slice(0, 6);
  }, [patients, patientQuery]);

  const opportunities = [
    {
      title: 'Demanda alta de apósitos',
      detail: 'Aumentó la frecuencia de uso en casos de úlceras por presión durante la última semana.',
      suggestion: 'Reforzar stock sugerido para la próxima reposición.',
      to: '/orders',
    },
    {
      title: 'Solicitudes de limpieza +18%',
      detail: 'Crecimiento sostenido en pedidos de soluciones de limpieza y gasas estériles.',
      suggestion: 'Crear solicitud consolidada para evitar quiebres.',
      to: '/marketplace',
    },
    {
      title: 'Brecha en recomendados sponsor',
      detail: 'Se detectan recomendaciones clínicas sin alternativa sponsor equivalente.',
      suggestion: 'Revisar catálogo clínico y sugerencias de sustitución.',
      to: '/marketplace',
    },
    {
      title: 'Curaciones con envío pendiente',
      detail: 'Casos frecuentes con reposición aún no enviada en el circuito comercial.',
      suggestion: 'Priorizar solicitudes en estado borrador o en curso.',
      to: '/orders',
    },
    {
      title: 'Patrón repetido en controles vencidos',
      detail: 'Se observan demoras de seguimiento en pacientes de mayor complejidad.',
      suggestion: 'Programar controles desde agenda para casos críticos.',
      to: '/agenda',
    },
  ];
  const visibleOpportunities = showAllOpportunities ? opportunities : opportunities.slice(0, 4);

  const recsThisWeek = Math.max(8, Math.round(activeCases.length * 1.3));
  const inCart = Math.round(recsThisWeek * 0.55);
  const conv = orderCount.total > 0 ? Math.round((orderCount.total / recsThisWeek) * 100) : 0;

  const kpis = [
    { k: 'Pacientes', v: patients.length, icon: Users, color: 'text-info', bg: 'bg-info/10', border: 'border-l-info', sub: 'Total en seguimiento', to: '/patients' },
    { k: 'Casos de heridas', v: activeCases.length, icon: Activity, color: 'text-warning', bg: 'bg-warning/10', border: 'border-l-warning', sub: `${criticalCases.length} críticos`, to: '/cases' },
    { k: 'Próximos controles', v: upcomingControls, icon: Clock, color: 'text-success', bg: 'bg-success/10', border: 'border-l-success', sub: `${overdueControls} vencidos`, to: '/agenda' },
    { k: 'Heridas con alerta', v: alertCaseCount, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-l-destructive', sub: 'Casos con riesgo clínico', to: '/cases' },
    { k: 'Evoluciones (7 días)', v: evosLast7Days, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', border: 'border-l-success', sub: 'Actividad reciente' },
    { k: 'Solicitudes pendientes', v: orderCount.pending, icon: ShoppingBag, color: 'text-info', bg: 'bg-info/10', border: 'border-l-info', sub: `${orderCount.total} totales`, to: '/orders' },
  ];

  const sponsorName = sponsor?.sponsor_name ?? 'Programa clínico';
  const showCommercialPanels = role === 'admin' || role === 'sponsor';
  const dashboardSubtitle = role === 'professional' ? 'Panel clínico' : 'Cabina de control clínico-comercial';
  const showSponsorBadgeInHeader = role !== 'professional';


  const controlsByDate = useMemo(() => {
    const map = new Map<string, {
      total: number;
      uniqueCases: Set<string>;
      statuses: Set<string>;
      hasOverdue: boolean;
    }>();
    casesWithPatient.forEach((c) => {
      c.evolutions.forEach((e) => {
        if (!e.nextControl) return;
        const key = e.nextControl;
        const item = map.get(key) ?? {
          total: 0,
          uniqueCases: new Set<string>(),
          statuses: new Set<string>(),
          hasOverdue: false,
        };
        item.total += 1;
        item.uniqueCases.add(c.caseId);
        item.statuses.add(c.caseStatus);
        if (key < today && c.caseStatus !== 'resuelto') item.hasOverdue = true;
        map.set(key, item);
      });
    });
    return map;
  }, [casesWithPatient, today]);

  const monthDays = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const startOffset = (monthStart.getDay() + 6) % 7;
    const cells: Array<{ date: Date; iso: string; inMonth: boolean }> = [];
    const firstGridDay = new Date(monthStart);
    firstGridDay.setDate(monthStart.getDate() - startOffset);
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstGridDay);
      d.setDate(firstGridDay.getDate() + i);
      cells.push({
        date: d,
        iso: toISO(d),
        inMonth: d >= monthStart && d <= monthEnd,
      });
    }
    return cells;
  }, [calendarMonth]);

  const handleCalendarKeyDown = (e: KeyboardEvent<HTMLButtonElement>, iso: string) => {
    let delta = 0;
    if (e.key === 'ArrowLeft') delta = -1;
    if (e.key === 'ArrowRight') delta = 1;
    if (e.key === 'ArrowUp') delta = -7;
    if (e.key === 'ArrowDown') delta = 7;
    if (delta !== 0) {
      e.preventDefault();
      const nextIso = addDays(iso, delta);
      setFocusedDate(nextIso);
      const nextDate = fromISO(nextIso);
      if (
        nextDate.getFullYear() !== calendarMonth.getFullYear() ||
        nextDate.getMonth() !== calendarMonth.getMonth()
      ) {
        setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedCalendarDate(iso);
    }
  };

  useEffect(() => {
    dayRefs.current[focusedDate]?.focus();
  }, [focusedDate, calendarMonth]);

  if (isProfessionalView) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-7xl flex-1">
          <div className="flex h-full flex-col gap-4 md:gap-5">
            <section className="rounded-2xl border border-border/70 bg-card p-4 md:p-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                <Button
                  size="lg"
                  className="h-20 w-full text-lg md:text-xl font-semibold shadow-sm active:scale-[0.99]"
                  style={sponsor?.primary_color ? { backgroundColor: sponsor.primary_color } : undefined}
                  onClick={() => navigate('/curation/new')}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Nueva curación
                </Button>

                <div className="sticky top-0 z-20 bg-card/95 py-1 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={patientSearchRef}
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      placeholder="Buscar paciente por nombre o DNI..."
                      className="h-12 pl-10 text-base"
                      aria-label="Buscar paciente por nombre o DNI"
                    />
                  </div>
                  {patientQuery.trim().length > 0 && (
                    <div className="mt-2 rounded-xl border border-border bg-background shadow-sm">
                      {patientSuggestions.length > 0 ? (
                        <div className="p-1">
                          {patientSuggestions.map((p) => {
                            const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setSelectedPatientId(p.id);
                                  setPatientQuery(name);
                                }}
                                className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <span className="font-body text-sm font-medium">{name || 'Paciente sin identificar'}</span>
                                <span className="font-body text-xs text-muted-foreground">{p.dni || 'Sin DNI'}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3">
                          <p className="font-body text-sm text-muted-foreground">No encontramos resultados.</p>
                          <Button
                            variant="link"
                            className="h-auto px-0 text-sm"
                            onClick={() => navigate('/patients?new=1')}
                          >
                            Crear nuevo paciente
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedPatient && (
                  <Button
                    variant="outline"
                    className="h-12 justify-start border-primary/40 text-sm font-medium"
                    onClick={() => navigate(`/curation/new?patientId=${selectedPatient.id}`)}
                  >
                    Nueva curación para {`${selectedPatient.firstName ?? ''} ${selectedPatient.lastName ?? ''}`.trim()}
                  </Button>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="heading-display text-xl">Pacientes activos hoy</h2>
                {professionalPatientCards.length > 6 && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
                    Ver todos los pacientes ({professionalPatientCards.length})
                  </Button>
                )}
              </div>

              {patientsLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/5" />
                          <Skeleton className="h-4 w-4/5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : professionalPatientCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-5 text-center">
                  <p className="font-body text-base font-medium">No hay pacientes activos hoy</p>
                  <p className="mt-1 font-body text-sm text-muted-foreground">Buscá un paciente o creá uno nuevo.</p>
                  <Button className="mt-4" onClick={() => navigate('/patients?new=1')}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Nuevo paciente
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {professionalPatientCards.slice(0, 6).map((entry) => {
                    const initials = entry.patientName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0]?.toUpperCase() ?? '')
                      .join('');
                    const lastDays = daysSince(entry.lastEvolutionDate);
                    return (
                      <button
                        key={`${entry.patientId}-${entry.caseId}`}
                        onClick={() => navigate(`/patients/${entry.patientId}/cases/${entry.caseId}`)}
                        className="group min-h-44 rounded-xl border border-border/70 bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                            {initials || 'P'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xl font-semibold leading-tight">{entry.patientName}</p>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{entry.diagnosis}</p>
                            <Badge variant="outline" className={`mt-2 text-xs ${statusChipClasses(entry.status)}`}>
                              {statusLabel(entry.status)}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {lastDays == null ? 'Sin curaciones previas' : `Última curación: hace ${lastDays} ${lastDays === 1 ? 'día' : 'días'}`}
                          </span>
                          <span className="font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">Abrir</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {criticalAlerts.length > 0 && (
              <section className="space-y-2">
                {criticalAlerts.map((a, idx) => (
                  <button
                    key={`${a.type}-${idx}`}
                    onClick={() => navigate(a.to!)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{a.label}</span>
                    <span className="font-medium underline underline-offset-2">Atender ahora</span>
                  </button>
                ))}
              </section>
            )}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 shadow-lg backdrop-blur md:hidden">
          <Button
            className="h-12 w-full text-base font-semibold active:scale-[0.99]"
            style={sponsor?.primary_color ? { backgroundColor: sponsor.primary_color } : undefined}
            onClick={() => navigate('/curation/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva curación
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-5 flex-1 min-h-0 h-[calc(100dvh-8rem)] overflow-hidden">
        <div className="animate-fade-in max-w-7xl mx-auto h-full flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              {showSponsorBadgeInHeader && (
                <Badge variant="outline" className="font-body text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5 mb-2">
                  Programa sponsor: {sponsorName}
                </Badge>
              )}
              <h1 className="heading-display text-2xl md:text-3xl">
                {getGreeting()}, {currentUserName || 'profesional'}
              </h1>
              <p className="font-body text-sm text-muted-foreground mt-1 capitalize">
                {todayLabel()} · {dashboardSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="outline" size="sm" className="font-body" onClick={() => navigate('/marketplace')}>
                <Package className="h-4 w-4 mr-1.5" /> Crear solicitud
              </Button>
              <Button size="sm" className="font-body" onClick={() => navigate('/curation/new')}>
                <Plus className="h-4 w-4 mr-1.5" /> Nueva curación
              </Button>
              {role === 'admin' && (
                <Button variant="outline" size="sm" className="font-body" onClick={() => navigate('/reports')}>
                  <FileBarChart className="h-4 w-4 mr-1.5" /> Generar reporte
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis.map((s) => (
              <Card
                key={s.k}
                role={s.to ? 'button' : undefined}
                tabIndex={s.to ? 0 : undefined}
                onClick={s.to ? () => navigate(s.to) : undefined}
                onKeyDown={(e) => {
                  if (!s.to) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(s.to);
                  }
                }}
                aria-label={`${s.k}: ${s.v}. ${s.sub}`}
                className={`rounded-xl border border-border/60 border-l-4 ${s.border} bg-card shadow-sm transition-all duration-200 ${s.to ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2' : ''}`}
              >
                <CardContent className="p-5 min-h-[84px]">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                      <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="heading-display text-3xl text-foreground leading-none">{s.v}</div>
                      <div className="font-body text-xs text-muted-foreground mt-1 font-medium">{s.k}</div>
                      <div className="font-body text-[11px] text-muted-foreground/80 mt-0.5 truncate">{s.sub}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-3 border-border/60 rounded-xl">
              <CardHeader className="p-5 pb-3 flex-row items-center justify-between">
                <div>
                  <CardTitle className="heading-display text-lg flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" /> Agenda clínica de hoy
                  </CardTitle>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    {selectedCalendarDate ? `Turnos para ${selectedCalendarDate}` : 'Próximas curaciones y controles programados'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="font-body" onClick={() => navigate('/agenda')}>
                  Ver agenda <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {selectedCalendarDate && (
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <p className="font-body text-xs text-primary">
                      Filtro activo: {selectedCalendarDate}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-body h-7 px-2"
                      onClick={() => setSelectedCalendarDate(null)}
                    >
                      Quitar filtro
                    </Button>
                  </div>
                )}
                {agendaAppointments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-background/50 p-4">
                    <p className="font-body text-sm text-muted-foreground">
                      {selectedCalendarDate ? `No hay curaciones programadas para ${selectedCalendarDate}.` : 'No hay curaciones programadas para hoy.'}
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-1">Podés crear un nuevo control desde agenda clínica.</p>
                    <Button size="sm" className="font-body mt-3" onClick={() => navigate('/agenda')}>
                      Programar control
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-[196px] overflow-y-auto space-y-2 pr-1">
                    {agendaAppointments.slice(0, 3).map((a, i) => (
                      <button
                        key={i}
                        onClick={() => navigate(`/patients/${a.patientId}/cases/${a.caseId}`)}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/60 hover:bg-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Stethoscope className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-body text-sm font-medium truncate">
                            {a.evo.time || 'Sin horario'} · {a.woundType || 'Curación'}
                          </div>
                          <div className="font-body text-xs text-muted-foreground truncate">
                            {a.patientName} · {a.evo.professional || 'Profesional asignado'}
                          </div>
                        </div>
                        <Badge variant="outline" className="font-body text-[10px] uppercase">
                          {a.status === 'critico' ? 'Crítico' : a.status === 'en_mejoria' ? 'En mejoría' : 'Activo'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-border/60 rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="heading-display text-lg flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" /> Turnos / Controles
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                      aria-label="Mes anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      aria-label="Mes siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="font-body text-xs text-muted-foreground mt-0.5 capitalize">
                  {monthLabel(calendarMonth)}
                </p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((w) => (
                    <div key={w} className="text-center font-body text-[10px] text-muted-foreground uppercase">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {monthDays.map(({ date, iso, inMonth }) => {
                    const item = controlsByDate.get(iso);
                    const isToday = iso === today;
                    const isSelected = selectedCalendarDate === iso;
                    const hasManyCases = (item?.uniqueCases.size ?? 0) > 1;
                    const statuses = item?.statuses ?? new Set<string>();
                    const ariaStatuses = Array.from(statuses).join(', ') || 'sin turnos';
                    return (
                      <button
                        key={iso}
                        ref={(el) => { dayRefs.current[iso] = el; }}
                        className={`relative h-10 rounded-lg border text-xs font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                          inMonth ? 'text-foreground border-border/60' : 'text-muted-foreground/60 border-border/30'
                        } ${isToday ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent/40'} ${
                          isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                        } ${item?.hasOverdue ? 'border-dashed border-warning' : ''}`}
                        onClick={() => setSelectedCalendarDate(iso)}
                        onFocus={() => setFocusedDate(iso)}
                        onKeyDown={(e) => handleCalendarKeyDown(e, iso)}
                        aria-label={`${iso}. ${isToday ? 'Hoy. ' : ''}${item?.total ?? 0} turnos. Estados: ${ariaStatuses}.`}
                      >
                        <span>{date.getDate()}</span>
                        {item && (
                          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                            {statuses.has('critico') && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
                            {statuses.has('activo') && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                            {statuses.has('en_mejoria') && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                            {statuses.has('resuelto') && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
                          </span>
                        )}
                        {hasManyCases && (
                          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-orange-500/90 ring-2 ring-orange-300" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div className="flex items-center gap-1.5 font-body text-[11px]"><span className="h-2 w-2 rounded-full bg-destructive" /> Crítico</div>
                  <div className="flex items-center gap-1.5 font-body text-[11px]"><span className="h-2 w-2 rounded-full bg-warning" /> Activo</div>
                  <div className="flex items-center gap-1.5 font-body text-[11px]"><span className="h-2 w-2 rounded-full bg-success" /> En mejoría</div>
                  <div className="flex items-center gap-1.5 font-body text-[11px]"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> Resuelto</div>
                  <div className="flex items-center gap-1.5 font-body text-[11px]"><span className="h-2 w-2 rounded-full bg-orange-500 ring-2 ring-orange-300" /> Varios casos</div>
                  <div className="flex items-center gap-1.5 font-body text-[11px]"><span className="h-2 w-3 border border-warning border-dashed rounded-sm" /> Vencido</div>
                </div>

                {selectedCalendarDate && (
                  <button
                    onClick={() => setSelectedCalendarDate(null)}
                    className="mt-3 font-body text-xs text-primary underline underline-offset-2"
                  >
                    Ver todos los turnos (quitar filtro {selectedCalendarDate})
                  </button>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/60 rounded-xl">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="heading-display text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" /> Alertas clínicas
              </CardTitle>
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                Casos que requieren atención
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-2">
              {visibleAlerts.map((a, i) => {
                const isCritical = a.severity === 'destructive';
                const isWarning = a.severity === 'warning';
                const role = isCritical ? 'alert' : 'status';
                const boxClasses = isCritical
                  ? 'border-l-4 border-l-destructive bg-destructive/10 border-destructive/30 text-destructive'
                  : isWarning
                    ? 'border-l-[3px] border-l-warning bg-warning/10 border-warning/30 text-warning'
                    : 'border-l-[3px] border-l-info bg-info/10 border-info/30 text-info';
                const iconSize = isCritical ? 'h-5 w-5' : 'h-4 w-4';
                const iconColor = isCritical
                  ? 'text-destructive'
                  : isWarning
                    ? 'text-warning'
                    : 'text-info';
                const IconComp = isCritical ? AlertTriangle : isWarning ? Clock : AlertCircle;

                const alertBody = (
                  <div className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg border ${boxClasses}`}>
                    <IconComp className={`${iconSize} shrink-0 mt-0.5 ${iconColor}`} />
                    <div className="font-body text-xs leading-relaxed">
                      {a.patientName ? (
                        <>
                          <span className={isCritical ? 'font-semibold text-foreground' : 'font-normal text-foreground'}>
                            {a.patientName}
                          </span>
                          {': '}
                          <span>{a.message ?? a.label}</span>
                        </>
                      ) : (
                        <span>{a.label}</span>
                      )}
                    </div>
                  </div>
                );

                if (!a.to) {
                  return (
                    <div key={i} role={role}>
                      {alertBody}
                    </div>
                  );
                }

                return (
                  <div key={i} role={role}>
                    <button
                      onClick={() => navigate(a.to!)}
                      className="w-full rounded-lg transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      aria-label={`Alerta ${isCritical ? 'crítica' : isWarning ? 'de advertencia' : 'informativa'}: ${a.label}`}
                    >
                      {alertBody}
                    </button>
                  </div>
                );
              })}
              {orderedAlerts.length > 5 && !showAllAlerts && (
                <button
                  onClick={() => setShowAllAlerts(true)}
                  className="font-body text-xs text-primary underline underline-offset-2"
                >
                  Ver todas las alertas ({orderedAlerts.length})
                </button>
              )}
              {orderedAlerts.length > 5 && showAllAlerts && (
                <button
                  onClick={() => setShowAllAlerts(false)}
                  className="font-body text-xs text-primary underline underline-offset-2"
                >
                  Ver menos alertas
                </button>
              )}
            </CardContent>
          </Card>

          {showCommercialPanels && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
              <Card className="border-border/60 rounded-xl">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="heading-display text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" /> Actividad sponsor
                  </CardTitle>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    Productos {sponsorName} y conversión a demanda
                  </p>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                        <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">Recomendados</div>
                        <div className="heading-display text-xl mt-1">{recsThisWeek}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                        <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">En reposición</div>
                        <div className="heading-display text-xl mt-1">{inCart}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                        <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">Solicitudes enviadas</div>
                        <div className="heading-display text-xl mt-1">{orderCount.sent}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/30">
                        <div className="font-body text-[10px] uppercase tracking-wide text-primary">Conversión</div>
                        <div className="heading-display text-3xl mt-1 text-primary leading-none">{conv}%</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                        Recomendados esta semana
                      </div>
                      <div className="space-y-1.5">
                        {recommendedProducts.length > 0 ? (
                          recommendedProducts.slice(0, 4).map((p, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-background border border-border/60">
                              <Pill className="h-4 w-4 text-primary shrink-0" />
                              <div className="font-body text-sm truncate flex-1">{p.name}</div>
                              {p.category && (
                                <Badge variant="secondary" className="font-body text-[10px]">{p.category}</Badge>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="font-body text-xs text-muted-foreground p-2 rounded-md border border-dashed border-border/70">
                            Sin productos recomendados para mostrar.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 rounded-xl">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="heading-display text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-warning" /> Oportunidades detectadas
                  </CardTitle>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    Insights clínicos y comerciales agregados
                  </p>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-2">
                  {visibleOpportunities.map((o, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedOpportunity(o)}
                      className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg bg-accent/30 border border-border/60 hover:bg-accent/45 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-body text-xs font-semibold">{o.title}</div>
                        <div className="font-body text-xs text-muted-foreground leading-relaxed mt-0.5">{o.detail}</div>
                      </div>
                    </button>
                  ))}
                  {opportunities.length > 4 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-body px-0"
                      onClick={() => setShowAllOpportunities((prev) => !prev)}
                    >
                      {showAllOpportunities ? 'Ver menos' : 'Ver más'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!selectedOpportunity} onOpenChange={(open) => !open && setSelectedOpportunity(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="heading-display text-xl flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              {selectedOpportunity?.title}
            </SheetTitle>
            <SheetDescription className="font-body">
              {selectedOpportunity?.detail}
            </SheetDescription>
          </SheetHeader>
          {selectedOpportunity && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-border/60 p-4 bg-muted/30">
                <p className="font-body text-xs uppercase tracking-wide text-muted-foreground mb-1">Acción sugerida</p>
                <p className="font-body text-sm">{selectedOpportunity.suggestion}</p>
              </div>
              <Button
                className="font-body w-full"
                onClick={() => {
                  navigate(selectedOpportunity.to);
                  setSelectedOpportunity(null);
                }}
              >
                Ir a la sección <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
