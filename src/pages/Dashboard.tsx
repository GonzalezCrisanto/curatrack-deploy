import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { useAppRole } from '@/hooks/useAppRole';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Activity, Users, AlertTriangle, CalendarClock, Clock, ShoppingBag,
  TrendingUp, Sparkles, Plus, ArrowRight, Stethoscope, Package,
  AlertCircle, CheckCircle2, Lightbulb, Pill, FileBarChart, ChevronLeft, ChevronRight, Search,
  UserPlus, CalendarPlus,
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

export default function Dashboard() {
  const { patients, currentUserName, patientsLoading, turnos, createTurno } = useApp();
  const { sponsor } = useSponsor();
  const { role, ready: roleReady } = useAppRole();
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [selectedAgendaDay, setSelectedAgendaDay] = useState<Date | undefined>(() => new Date());
  const isProfessionalView = role === 'professional';
  const [newTurnoOpen, setNewTurnoOpen] = useState(false);
  const [turnoDate, setTurnoDate] = useState('');
  const [turnoTime, setTurnoTime] = useState('');
  const [turnoPatientQuery, setTurnoPatientQuery] = useState('');
  const [turnoSelectedPatient, setTurnoSelectedPatient] = useState<{ id: string; name: string } | null>(null);

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
          evolutions: c.evolutions,
        })),
      ),
    [patients],
  );

  const today = toISO(new Date());
  const activeCases = allCases.filter(c => c.status === 'activo' || c.status === 'critico' || c.status === 'en_mejoria');
  const criticalCases = allCases.filter(c => c.status === 'critico');
  const agendaDate = selectedCalendarDate ?? today;

  const activeTurnos = useMemo(() => turnos.filter(t => t.status !== 'cancelado'), [turnos]);

  const agendaAppointments = useMemo(
    () =>
      activeTurnos
        .filter((t) => t.date === agendaDate)
        .map((t) => {
          const caseInfo = casesWithPatient.find((c) => c.caseId === t.caseId);
          return {
            time: t.time || '',
            notes: t.notes,
            woundType: caseInfo?.woundType || '',
            status: caseInfo?.caseStatus,
            patientId: t.patientId,
            caseId: t.caseId,
            patientName: caseInfo?.patientName || 'Paciente sin identificar',
          };
        }),
    [activeTurnos, casesWithPatient, agendaDate],
  );

  const upcomingControls = activeTurnos.filter(t => t.status === 'programado' && t.date >= today).length;
  const overdueControls = activeTurnos.filter(t => t.status === 'vencido').length;
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
      if (activeTurnos.some((t) => t.caseId === c.caseId && t.status === 'vencido')) {
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
    });
    if (list.length === 0) {
      list.push({ type: 'ok', label: 'Sin alertas activas. Buen seguimiento clínico.', severity: 'info', icon: CheckCircle2 });
    }
    return list.slice(0, 6);
  }, [casesWithPatient, today, activeTurnos]);

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
        const hasTodayControl = activeTurnos.some((t) => t.caseId === c.id && t.date === todayIso);
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
  }, [patients, activeTurnos]);

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

  const turnoPatientSuggestions = useMemo(() => {
    const q = turnoPatientQuery.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter((p) => {
        const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim().toLowerCase();
        return name.includes(q) || (p.dni ?? '').toLowerCase().includes(q);
      })
      .slice(0, 6);
  }, [patients, turnoPatientQuery]);

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
    { k: 'Pacientes', v: patients.length, icon: Users, color: 'text-info', bg: 'bg-info/10', border: 'border-l-info', sub: 'Total en seguimiento', to: '/dashboard' },
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
    activeTurnos.forEach((t) => {
      const key = t.date;
      const caseInfo = casesWithPatient.find((c) => c.caseId === t.caseId);
      const item = map.get(key) ?? {
        total: 0,
        uniqueCases: new Set<string>(),
        statuses: new Set<string>(),
        hasOverdue: false,
      };
      item.total += 1;
      item.uniqueCases.add(t.caseId);
      if (caseInfo) item.statuses.add(caseInfo.caseStatus);
      if (t.status === 'vencido') item.hasOverdue = true;
      map.set(key, item);
    });
    return map;
  }, [activeTurnos, casesWithPatient]);

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

  if (!roleReady) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }


  if (isProfessionalView) {
    const todayIso = toISO(new Date());
    const patientById = new Map(patients.map((p) => [p.id, p]));
    // A turno covers the whole patient visit now, so its "status" badge shows
    // the most severe active wound of the patient rather than one specific case.
    const mostSevereActiveCase = (patient?: (typeof patients)[number]) =>
      patient?.cases
        .filter(c => c.status !== 'resuelto')
        .sort((a, b) => statusPriority(a.status) - statusPriority(b.status))[0];

    const todayAgenda = activeTurnos
      .filter((t) => t.date === todayIso)
      .map((t) => {
        const patient = patientById.get(t.patientId);
        const woundCase = t.caseId ? patient?.cases.find((c) => c.id === t.caseId) : mostSevereActiveCase(patient);
        return {
          key: t.id,
          time: t.time || '',
          patientId: t.patientId,
          caseId: t.caseId,
          patientName: patient ? `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || 'Paciente sin identificar' : 'Paciente sin identificar',
          address: patient?.address || '',
          status: woundCase?.status,
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));

    const query = patientQuery.trim().toLowerCase();
    const recentPatients = [...patients]
      .sort((a, b) => {
        const latestEvo = (p: typeof a) =>
          p.cases.flatMap(c => c.evolutions).map(e => e.date).sort().at(-1) ?? '';
        return latestEvo(b).localeCompare(latestEvo(a));
      })
      .slice(0, 5);
    const filteredPatients = query.length === 0
      ? recentPatients
      : patients.filter((p) =>
          `${p.firstName ?? ''} ${p.lastName ?? ''} ${p.dni ?? ''}`.toLowerCase().includes(query),
        );

    const allAppointments = activeTurnos.map((t) => {
      const patient = patientById.get(t.patientId);
      const woundCase = t.caseId ? patient?.cases.find((c) => c.id === t.caseId) : mostSevereActiveCase(patient);
      return {
        key: t.id,
        date: t.date,
        time: t.time || '',
        patientId: t.patientId,
        caseId: t.caseId,
        patientName: patient ? `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || 'Paciente sin identificar' : 'Paciente sin identificar',
        address: patient?.address || '',
        status: woundCase?.status,
      };
    });

    const appointmentDates = Array.from(new Set(allAppointments.map((a) => a.date))).map((iso) =>
      fromISO(iso),
    );

    const selectedIso = selectedAgendaDay ? toISO(selectedAgendaDay) : todayIso;
    const selectedDayAgenda = allAppointments
      .filter((a) => a.date === selectedIso)
      .sort((a, b) => a.time.localeCompare(b.time));

    const openNewCuration = (patientId: string) => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient) return;
      if (patient.cases.length === 1) {
        navigate(
          `/curation/new?patientId=${encodeURIComponent(patientId)}&caseId=${encodeURIComponent(patient.cases[0].id)}&step=2`,
        );
      } else {
        navigate(`/curation/new?patientId=${encodeURIComponent(patientId)}`);
      }
    };

    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-5xl flex-1">
          <div className="flex h-full flex-col gap-5 p-4 md:p-6 lg:p-8">
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Nueva curación', Icon: Stethoscope, onClick: () => navigate('/curation/new') },
                  { label: 'Nuevo paciente', Icon: UserPlus, onClick: () => navigate('/patients/new') },
                  { label: 'Nuevo turno', Icon: CalendarPlus, onClick: () => {
                    setTurnoDate(toISO(new Date()));
                    setTurnoTime('');
                    setTurnoPatientQuery('');
                    setTurnoSelectedPatient(null);
                    setNewTurnoOpen(true);
                  } },
                ].map(({ label, Icon, onClick }) => (
                  <Button
                    key={label}
                    size="lg"
                    className="h-16 w-full justify-between text-xl font-semibold shadow-sm active:scale-[0.99] px-5"
                    style={sponsor?.primary_color ? { backgroundColor: sponsor.primary_color } : undefined}
                    onClick={onClick}
                  >
                    {label}
                    <Icon className="h-5 w-5 shrink-0" />
                  </Button>
                ))}
              </div>
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Agenda de hoy
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, idx) => (
                      <Skeleton key={idx} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : todayAgenda.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground">Sin turnos para hoy.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {todayAgenda.map((a) => (
                      <li key={a.key}>
                        <button
                          onClick={() => openNewCuration(a.patientId)}
                          className="flex min-h-12 w-full items-center gap-3 py-2 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2"
                        >
                          <span className="w-14 shrink-0 font-mono text-sm font-semibold text-primary">
                            {a.time || '--:--'}
                          </span>
                          <span className="flex-1 truncate text-base font-medium">{a.patientName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Pacientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={patientSearchRef}
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="Buscar por nombre o DNI..."
                    className="h-11 pl-10 text-base"
                    aria-label="Buscar paciente por nombre o DNI"
                  />
                </div>

                {patientsLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, idx) => (
                      <Skeleton key={idx} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <p className="font-body text-sm text-muted-foreground">
                      {patients.length === 0 ? 'Todavía no hay pacientes.' : 'No encontramos resultados.'}
                    </p>
                    <Button
                      variant="link"
                      className="mt-1 h-auto px-0 text-sm"
                      onClick={() => navigate('/patients/new')}
                    >
                      Crear nuevo paciente
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredPatients.map((p) => {
                      const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Paciente sin identificar';
                      return (
                        <li key={p.id}>
                          <button
                            onClick={() => navigate(`/patients/${p.id}`)}
                            className="flex min-h-12 w-full flex-col gap-1 py-2 px-2 text-left rounded-md hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-3"
                          >
                            <span className="flex-1 truncate text-base font-medium">{name}</span>
                            <span className="flex-1 truncate text-sm text-muted-foreground">
                              {p.address || 'Sin domicilio'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Calendario de turnos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                  <Calendar
                    mode="single"
                    selected={selectedAgendaDay}
                    onSelect={setSelectedAgendaDay}
                    modifiers={{ hasAppointments: appointmentDates }}
                    modifiersClassNames={{
                      hasAppointments: 'bg-primary/15 text-primary font-semibold rounded-md',
                    }}
                    className="rounded-lg border border-border/50 p-3"
                  />
                  <div className="min-w-0">
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      {selectedAgendaDay
                        ? `Turnos del ${selectedAgendaDay.getDate()} de ${SPANISH_MONTHS[selectedAgendaDay.getMonth()]}`
                        : 'Seleccioná un día'}
                    </h3>
                    {selectedDayAgenda.length === 0 ? (
                      <p className="font-body text-sm text-muted-foreground">Sin turnos para este día.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {selectedDayAgenda.map((a) => (
                          <li key={a.key}>
                            <button
                              onClick={() => navigate(a.caseId ? `/patients/${a.patientId}/cases/${a.caseId}` : `/patients/${a.patientId}`)}
                              className="flex min-h-12 w-full items-center gap-3 py-2 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2"
                            >
                              <span className="w-14 shrink-0 font-mono text-sm font-semibold text-primary">
                                {a.time || '--:--'}
                              </span>
                              <span className="flex-1 truncate text-base font-medium">{a.patientName}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={newTurnoOpen} onOpenChange={setNewTurnoOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="heading-display text-xl">Nuevo turno</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Fecha</Label>
                  <Input
                    type="date"
                    value={turnoDate}
                    onChange={e => setTurnoDate(e.target.value)}
                    className="font-body"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Hora</Label>
                  <div className="flex gap-1 items-center">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      placeholder="hh"
                      value={turnoTime ? parseInt(turnoTime.split(':')[0], 10) : ''}
                      onChange={e => {
                        const mins = turnoTime ? (turnoTime.split(':')[1] ?? '00') : '00';
                        if (e.target.value === '') { setTurnoTime(''); return; }
                        const h = Math.min(23, Math.max(0, parseInt(e.target.value, 10)));
                        setTurnoTime(`${String(h).padStart(2, '0')}:${mins}`);
                      }}
                      className="font-body h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <span className="text-muted-foreground font-body">:</span>
                    <select
                      value={turnoTime ? (turnoTime.split(':')[1] ?? '00') : ''}
                      onChange={e => {
                        const hrs = turnoTime ? (turnoTime.split(':')[0] ?? '00') : '00';
                        setTurnoTime(e.target.value ? `${hrs}:${e.target.value}` : '');
                      }}
                      className="font-body h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">mm</option>
                      {['00', '15', '30', '45'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-sm">Paciente</Label>
                {turnoSelectedPatient ? (
                  <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
                    <span className="font-body text-sm font-medium">{turnoSelectedPatient.name}</span>
                    <button
                      onClick={() => { setTurnoSelectedPatient(null); setTurnoPatientQuery(''); }}
                      className="font-body text-xs text-muted-foreground hover:text-foreground ml-2"
                      aria-label="Quitar paciente seleccionado"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={turnoPatientQuery}
                        onChange={e => setTurnoPatientQuery(e.target.value)}
                        placeholder="Buscar por nombre o DNI..."
                        className="font-body pl-9"
                        autoFocus
                      />
                    </div>
                    {turnoPatientSuggestions.length > 0 && (
                      <ul className="mt-1 w-full rounded-md border border-border bg-background max-h-40 overflow-y-auto">
                        {turnoPatientSuggestions.map(p => {
                          const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Paciente sin identificar';
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => { setTurnoSelectedPatient({ id: p.id, name }); setTurnoPatientQuery(''); }}
                                className="w-full text-left px-3 py-2 font-body text-sm hover:bg-accent/50 focus-visible:bg-accent/50 outline-none"
                              >
                                <span className="font-medium">{name}</span>
                                {p.dni && <span className="ml-2 text-xs text-muted-foreground">DNI {p.dni}</span>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
                {turnoSelectedPatient && !patients.find(p => p.id === turnoSelectedPatient.id)?.cases.length && (
                  <p className="font-body text-sm text-destructive">
                    No se puede agendar un turno: este paciente no tiene heridas cargadas.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" className="font-body" onClick={() => setNewTurnoOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="font-body"
                disabled={
                  !turnoDate ||
                  !turnoSelectedPatient ||
                  !patients.find(p => p.id === turnoSelectedPatient?.id)?.cases.length
                }
                onClick={async () => {
                  const turnoId = await createTurno({
                    patientId: turnoSelectedPatient!.id,
                    date: turnoDate,
                    time: turnoTime,
                  });
                  if (!turnoId) {
                    toast({ title: 'Error al guardar el turno', description: 'Intentá nuevamente.', variant: 'destructive' });
                    return;
                  }
                  toast({ title: 'Turno guardado', description: `${turnoSelectedPatient!.name} — ${turnoDate}` });
                  setNewTurnoOpen(false);
                  setTurnoDate('');
                  setTurnoTime('');
                  setTurnoPatientQuery('');
                  setTurnoSelectedPatient(null);
                }}
              >
                Confirmar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1 min-h-0 h-[calc(100dvh-8rem)] overflow-hidden">
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
                            {a.time || 'Sin horario'} · {a.woundType || 'Curación'}
                          </div>
                          <div className="font-body text-xs text-muted-foreground truncate">
                            {a.patientName} · {a.notes || 'Profesional asignado'}
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
