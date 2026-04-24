import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Users, Activity, AlertTriangle, CheckCircle2, TrendingUp, Clock,
  ChevronRight, CalendarClock, ArrowUp, ArrowDown, ArrowRight,
  Search, X, AlertCircle,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import AppLayout from '@/components/AppLayout';

// ---- Helpers ----
const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SPANISH_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatTodaySpanish(d = new Date()) {
  return `${SPANISH_DAYS[d.getDay()]} ${d.getDate()} de ${SPANISH_MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

function getGreeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function getInitials(first: string, last: string) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

function daysSince(dateStr: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function relativeDate(dateStr: string) {
  const diff = daysSince(dateStr);
  if (diff === null) return dateStr;
  if (diff <= 0) return 'hoy';
  if (diff === 1) return 'ayer';
  return `hace ${diff} días`;
}

// Color palette for avatar circles
const AVATAR_PALETTE = [
  'bg-info/15 text-info',
  'bg-primary/15 text-primary',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-destructive/15 text-destructive',
  'bg-accent text-accent-foreground',
];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export default function Dashboard() {
  const { patients, currentUserName } = useApp();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [woundTypeFilter, setWoundTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lastEvo');
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'overdue'>('upcoming');
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });

  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const allCases = patients.flatMap(p => p.cases);
  const activeCases = allCases.filter(c => c.status === 'activo');
  const criticalCases = allCases.filter(c => c.status === 'critico');
  const improvingCases = allCases.filter(c => c.status === 'en_mejoria');
  const resolvedCases = allCases.filter(c => c.status === 'resuelto');
  const totalEvolutions = allCases.reduce((sum, c) => sum + c.evolutions.length, 0);

  // Trend: compare evolutions in last 7 days vs previous 7 days
  const now = Date.now();
  const inLastDays = (dateStr: string, from: number, to: number) => {
    const t = new Date(dateStr + 'T12:00:00').getTime();
    const ageDays = (now - t) / (1000 * 60 * 60 * 24);
    return ageDays >= from && ageDays < to;
  };
  const allEvos = allCases.flatMap(c => c.evolutions);
  const evosLast7 = allEvos.filter(e => inLastDays(e.date, 0, 7)).length;
  const evosPrev7 = allEvos.filter(e => inLastDays(e.date, 7, 14)).length;
  const evoTrend = evosLast7 - evosPrev7;



  const today = new Date().toISOString().split('T')[0];
  const allAppointments = allCases
    .flatMap(c => c.evolutions.map(e => ({ ...e, caseId: c.id, patientId: c.patientId, woundType: c.woundType })))
    .filter(e => e.nextControl && e.nextControl.trim() !== '');
  // NOTE: do NOT slice these — the calendar modifiers and the day-filter rely on the full list.
  // The visible list is sliced later, after the day filter is applied.
  const upcomingAppointments = allAppointments
    .filter(e => e.nextControl >= today)
    .sort((a, b) => a.nextControl.localeCompare(b.nextControl));
  const pastAppointments = allAppointments
    .filter(e => e.nextControl < today)
    .sort((a, b) => b.nextControl.localeCompare(a.nextControl));

  // Stat cards config — clinical palette with semantic tokens
  type Trend = { value: string; dir: 'up' | 'down' | 'flat' };
  const stats: Array<{
    key: string;
    label: string;
    value: number;
    icon: typeof Users;
    accent: string;        // left border color class
    iconBg: string;        // icon background class
    iconColor: string;     // icon color class
    trend?: Trend;
  }> = [
    {
      key: 'patients',
      label: 'Pacientes',
      value: patients.length,
      icon: Users,
      accent: 'border-l-info',
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
      trend: { value: 'Total registrados', dir: 'flat' },
    },
    {
      key: 'active',
      label: 'Casos activos',
      value: activeCases.length,
      icon: Activity,
      accent: 'border-l-warning',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      trend: { value: `${activeCases.length} en seguimiento`, dir: 'flat' },
    },
    {
      key: 'critical',
      label: 'Críticos',
      value: criticalCases.length,
      icon: AlertTriangle,
      accent: 'border-l-destructive',
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      trend: criticalCases.length > 0
        ? { value: 'Requieren atención', dir: 'up' }
        : { value: 'Sin alertas', dir: 'down' },
    },
    {
      key: 'improving',
      label: 'En mejoría',
      value: improvingCases.length,
      icon: TrendingUp,
      accent: 'border-l-success',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      trend: { value: 'Evolución favorable', dir: 'up' },
    },
    {
      key: 'resolved',
      label: 'Resueltos',
      value: resolvedCases.length,
      icon: CheckCircle2,
      accent: 'border-l-[hsl(180_60%_40%)]',
      iconBg: 'bg-[hsl(180_60%_40%/0.10)]',
      iconColor: 'text-[hsl(180_60%_35%)]',
      trend: { value: 'Histórico cerrado', dir: 'flat' },
    },
    {
      key: 'evolutions',
      label: 'Evoluciones',
      value: totalEvolutions,
      icon: Clock,
      accent: 'border-l-[hsl(265_70%_55%)]',
      iconBg: 'bg-[hsl(265_70%_55%/0.10)]',
      iconColor: 'text-[hsl(265_70%_50%)]',
      trend: {
        value: `${evosLast7} esta semana`,
        dir: evoTrend > 0 ? 'up' : evoTrend < 0 ? 'down' : 'flat',
      },
    },
  ];

  // Status helpers
  const statusDot: Record<string, string> = {
    critico: 'bg-destructive',
    activo: 'bg-warning',
    en_mejoria: 'bg-success',
    resuelto: 'bg-muted-foreground',
  };
  const statusBadge = (status?: string) => {
    if (status === 'critico') return <Badge variant="destructive" className="font-body text-[10px] uppercase tracking-wide">Crítico</Badge>;
    if (status === 'en_mejoria') return <Badge className="bg-success text-white hover:bg-success/90 font-body text-[10px] uppercase tracking-wide">En mejoría</Badge>;
    if (status === 'activo') return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90 font-body text-[10px] uppercase tracking-wide">Activo</Badge>;
    if (status === 'resuelto') return <Badge variant="secondary" className="font-body text-[10px] uppercase tracking-wide">Resuelto</Badge>;
    return <Badge variant="secondary" className="font-body text-[10px] uppercase tracking-wide">Estable</Badge>;
  };

  const patientSeverity = (p: typeof patients[number]) => {
    if (p.cases.some(c => c.status === 'critico')) return 'critico';
    if (p.cases.some(c => c.status === 'en_mejoria')) return 'en_mejoria';
    if (p.cases.some(c => c.status === 'activo')) return 'activo';
    return 'estable';
  };

  // Map of stat key -> patient predicate
  const filterPredicates: Record<string, (p: typeof patients[number]) => boolean> = {
    all: () => true,
    patients: () => true,
    active: (p) => p.cases.some(c => c.status === 'activo' || c.status === 'critico' || c.status === 'en_mejoria'),
    critical: (p) => p.cases.some(c => c.status === 'critico'),
    improving: (p) => p.cases.some(c => c.status === 'en_mejoria'),
    resolved: (p) => p.cases.length > 0 && p.cases.every(c => c.status === 'resuelto'),
    evolutions: (p) => p.cases.some(c => c.evolutions.length > 0),
  };

  // Available wound types from data
  const availableWoundTypes = useMemo(
    () => Array.from(new Set(allCases.map(c => c.woundType))).sort(),
    [allCases]
  );

  // Last evolution date per patient
  const lastEvoDate = (p: typeof patients[number]) => {
    const dates = p.cases.flatMap(c => c.evolutions.map(e => e.date));
    return dates.length ? dates.sort().slice(-1)[0] : '';
  };

  const filteredPatients = useMemo(() => {
    const pred = filterPredicates[activeFilter] || filterPredicates.all;
    const q = searchQuery.trim().toLowerCase();
    let list = patients.filter(pred);
    if (q) {
      list = list.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        `${p.lastName} ${p.firstName}`.toLowerCase().includes(q)
      );
    }
    if (woundTypeFilter !== 'all') {
      list = list.filter(p => p.cases.some(c => c.woundType === woundTypeFilter));
    }
    if (sortBy === 'lastEvo') {
      list = [...list].sort((a, b) => lastEvoDate(b).localeCompare(lastEvoDate(a)));
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.lastName.localeCompare(b.lastName));
    } else if (sortBy === 'cases') {
      list = [...list].sort((a, b) => b.cases.length - a.cases.length);
    }
    return list;
  }, [patients, activeFilter, searchQuery, woundTypeFilter, sortBy]);

  const handleStatClick = (key: string) => {
    navigate(`/patients?filter=${key}`);
  };

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-6 animate-fade-in">
          {/* Greeting Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <div>
              <h1 className="heading-display text-2xl md:text-3xl text-foreground">
                {getGreeting()}, {currentUserName}
              </h1>
              <p className="font-body text-muted-foreground text-sm mt-1 capitalize">
                {formatTodaySpanish()}
              </p>
            </div>
            <div className="font-body text-xs text-muted-foreground">
              Resumen general del seguimiento de heridas
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map(s => {
              const TrendIcon = s.trend?.dir === 'up' ? ArrowUp : s.trend?.dir === 'down' ? ArrowDown : ArrowRight;
              const trendColor = s.trend?.dir === 'up'
                ? 'text-success'
                : s.trend?.dir === 'down'
                  ? 'text-destructive'
                  : 'text-muted-foreground';
              const isActive = activeFilter === s.key;
              return (
                <Card
                  key={s.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleStatClick(s.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStatClick(s.key); } }}
                  className={`rounded-xl border border-border/60 border-l-4 ${s.accent} bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'ring-2 ring-primary/60 shadow-md -translate-y-0.5 bg-primary/[0.03]' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                        <s.icon className={`h-4.5 w-4.5 ${s.iconColor}`} />
                      </div>
                      {isActive && (
                        <span className="font-body text-[10px] uppercase tracking-wide text-primary font-semibold">Filtro</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="heading-display text-3xl text-foreground leading-none">{s.value}</div>
                      <div className="font-body text-xs text-muted-foreground mt-1.5 font-medium">{s.label}</div>
                      {s.trend && (
                        <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
                          <TrendIcon className="h-3 w-3" />
                          <span className="font-body text-[11px]">{s.trend.value}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator className="bg-border/60" />

          {/* Próximos Turnos con Calendario */}
          {(() => {
            const showUpcoming = appointmentFilter === 'all' || appointmentFilter === 'upcoming';
            const showOverdue = appointmentFilter === 'all' || appointmentFilter === 'overdue';

            const selectedISO = selectedDay ? toISODate(selectedDay) : null;
            // When no day filter is active, cap the rendered list to keep the card compact.
            // When a day is selected, show ALL turns for that day.
            const VISIBLE_LIMIT = 6;
            const visibleUpcoming = (showUpcoming ? upcomingAppointments : [])
              .filter(ap => !selectedISO || ap.nextControl === selectedISO)
              .slice(0, selectedISO ? undefined : VISIBLE_LIMIT);
            const visiblePast = (showOverdue ? pastAppointments : [])
              .filter(ap => !selectedISO || ap.nextControl === selectedISO)
              .slice(0, selectedISO ? undefined : VISIBLE_LIMIT);

            // Bucket appointments by date so multiple wounds/patients on the same day
            // render as a single multi-color (conic-gradient) marker instead of
            // overwriting each other.
            const STATUS_COLORS: Record<string, string> = {
              critico: 'hsl(var(--destructive))',
              activo: 'hsl(var(--warning))',
              en_mejoria: 'hsl(var(--success))',
              resuelto: 'hsl(var(--muted-foreground))',
            };

            type DayBucket = { date: Date; statuses: Set<string> };
            const upcomingByDay = new Map<string, DayBucket>();
            (showUpcoming ? upcomingAppointments : []).forEach(ap => {
              const caseData = allCases.find(c => c.id === ap.caseId);
              const status = caseData?.status || 'activo';
              const key = ap.nextControl;
              const existing = upcomingByDay.get(key);
              if (existing) {
                existing.statuses.add(status);
              } else {
                upcomingByDay.set(key, { date: new Date(key + 'T12:00:00'), statuses: new Set([status]) });
              }
            });

            const overdueByDay = new Map<string, Date>();
            (showOverdue ? pastAppointments : []).forEach(ap => {
              if (!overdueByDay.has(ap.nextControl)) {
                overdueByDay.set(ap.nextControl, new Date(ap.nextControl + 'T12:00:00'));
              }
            });

            const modifiers: Record<string, Date[]> = {
              overdue: Array.from(overdueByDay.values()),
            };
            const modifiersStyles: Record<string, React.CSSProperties> = {
              overdue: {
                backgroundColor: 'transparent',
                color: 'hsl(var(--destructive))',
                border: '1.5px dashed hsl(var(--destructive))',
                borderRadius: '9999px',
                opacity: 0.85,
              },
            };

            // Single-status days grouped by status; multi-status days each get a
            // unique conic-gradient modifier.
            const singleByStatus: Record<string, Date[]> = {};
            let multiIdx = 0;
            upcomingByDay.forEach(bucket => {
              const statuses = Array.from(bucket.statuses);
              if (statuses.length === 1) {
                const s = statuses[0];
                (singleByStatus[s] ??= []).push(bucket.date);
              } else {
                const key = `multi_${multiIdx++}`;
                modifiers[key] = [bucket.date];
                const colors = statuses.map(s => STATUS_COLORS[s] || STATUS_COLORS.activo);
                const slice = 100 / colors.length;
                const stops = colors
                  .map((col, i) => `${col} ${i * slice}% ${(i + 1) * slice}%`)
                  .join(', ');
                modifiersStyles[key] = {
                  background: `conic-gradient(${stops})`,
                  color: '#fff',
                  borderRadius: '9999px',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
                  fontWeight: 600,
                };
              }
            });

            const STATUS_STYLE: Record<string, React.CSSProperties> = {
              critico: { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))', borderRadius: '9999px' },
              activo: { backgroundColor: 'hsl(var(--warning))', color: 'hsl(var(--warning-foreground))', borderRadius: '9999px' },
              en_mejoria: { backgroundColor: 'hsl(var(--success))', color: '#fff', borderRadius: '9999px' },
              resuelto: { backgroundColor: 'hsl(var(--muted-foreground))', color: '#fff', borderRadius: '9999px' },
            };
            Object.entries(singleByStatus).forEach(([status, dates]) => {
              modifiers[status] = dates;
              modifiersStyles[status] = STATUS_STYLE[status] || STATUS_STYLE.activo;
            });

            // ---- Scheduling warnings ----
            // Assumptions: each curación dura 30 min; entre pacientes distintos hace
            // falta un buffer mínimo de 30 min entre el fin de una y el inicio de la siguiente;
            // entre turnos consecutivos del MISMO paciente, lo ideal es que sean inmediatos
            // (sin huecos > 0 min) — un hueco se reporta como "tiempo muerto" sugerido a corregir.
            const PROCEDURE_MIN = 30;
            const INTER_PATIENT_BUFFER_MIN = 30;
            const parseHHMM = (t?: string): number | null => {
              if (!t) return null;
              const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
              if (!m) return null;
              const h = Number(m[1]);
              const mm = Number(m[2]);
              if (!isFinite(h) || !isFinite(mm)) return null;
              return h * 60 + mm;
            };
            const minutesToHHMM = (mins: number) => {
              const h = Math.floor(mins / 60);
              const mm = mins % 60;
              return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
            };

            type SchedWarning = {
              kind: 'gap-same-patient' | 'overlap-different-patient' | 'tight-different-patient';
              message: string;
              aptIds: string[]; // evolution ids involved
            };
            const warningsByApt = new Map<string, SchedWarning[]>();
            const pushWarn = (id: string, w: SchedWarning) => {
              const list = warningsByApt.get(id) ?? [];
              list.push(w);
              warningsByApt.set(id, list);
            };

            // Group ALL future appointments (not only the visible 6) by date
            const allByDate = new Map<string, typeof upcomingAppointments>();
            upcomingAppointments.forEach(ap => {
              const arr = allByDate.get(ap.nextControl) ?? [];
              arr.push(ap);
              allByDate.set(ap.nextControl, arr);
            });

            allByDate.forEach((apts) => {
              const timed = apts
                .map(a => ({ ap: a, start: parseHHMM(a.time) }))
                .filter((x): x is { ap: typeof apts[number]; start: number } => x.start !== null)
                .sort((a, b) => a.start - b.start);

              for (let i = 1; i < timed.length; i++) {
                const prev = timed[i - 1];
                const curr = timed[i];
                const prevEnd = prev.start + PROCEDURE_MIN;
                const gap = curr.start - prevEnd; // minutos libres entre fin del anterior e inicio del actual
                const samePatient = prev.ap.patientId === curr.ap.patientId;

                if (samePatient) {
                  if (gap > 0) {
                    pushWarn(curr.ap.id, {
                      kind: 'gap-same-patient',
                      aptIds: [prev.ap.id, curr.ap.id],
                      message: `Hueco de ${gap} min entre curaciones del mismo paciente (${minutesToHHMM(prev.start)}–${minutesToHHMM(prevEnd)} → ${minutesToHHMM(curr.start)}). Sugerido: encadenar a las ${minutesToHHMM(prevEnd)}.`,
                    });
                  }
                } else {
                  if (gap < 0) {
                    pushWarn(curr.ap.id, {
                      kind: 'overlap-different-patient',
                      aptIds: [prev.ap.id, curr.ap.id],
                      message: `Se solapa con turno previo (${minutesToHHMM(prev.start)}–${minutesToHHMM(prevEnd)}). Mover a las ${minutesToHHMM(prevEnd + INTER_PATIENT_BUFFER_MIN)} o más tarde.`,
                    });
                  } else if (gap < INTER_PATIENT_BUFFER_MIN) {
                    pushWarn(curr.ap.id, {
                      kind: 'tight-different-patient',
                      aptIds: [prev.ap.id, curr.ap.id],
                      message: `Solo ${gap} min entre pacientes (mínimo recomendado: ${INTER_PATIENT_BUFFER_MIN} min). Sugerido: mover a las ${minutesToHHMM(prevEnd + INTER_PATIENT_BUFFER_MIN)}.`,
                    });
                  }
                }
              }
            });

            const renderApt = (ap: typeof upcomingAppointments[number], opts: { past?: boolean } = {}) => {
              const patient = patients.find(p => p.id === ap.patientId);
              const caseData = allCases.find(c => c.id === ap.caseId);
              const dotClass = statusDot[caseData?.status || 'activo'];
              const warns = warningsByApt.get(ap.id) ?? [];
              const hasWarn = warns.length > 0;
              return (
                <div
                  key={ap.id + (opts.past ? '-past' : '-apt')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                    opts.past
                      ? 'border-destructive/30 bg-destructive/[0.03]'
                      : hasWarn
                        ? 'border-warning/50 bg-warning/[0.04]'
                        : 'border-border/60 bg-card'
                  }`}
                  onClick={() => navigate(`/patients/${ap.patientId}/cases/${ap.caseId}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CalendarClock className={`h-4 w-4 ${opts.past ? 'text-destructive' : 'text-primary'}`} />
                      <span className={`font-body text-sm font-semibold ${opts.past ? 'text-destructive' : 'text-primary'}`}>
                        {ap.nextControl}
                      </span>
                      {ap.time && (
                        <span className="font-body text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {ap.time}
                        </span>
                      )}
                      {opts.past && (
                        <span className="font-body text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold">
                          Vencido
                        </span>
                      )}
                    </div>
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`} />
                  </div>
                  <p className="font-body text-sm font-semibold text-foreground">{patient?.lastName}, {patient?.firstName}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">{ap.woundType}</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">Prof: {ap.professional}</p>
                  {hasWarn && (
                    <div className="mt-2.5 space-y-1.5">
                      {warns.map((w, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1.5 rounded-md bg-warning/10 border border-warning/30 px-2 py-1.5"
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                          <p className="font-body text-[11px] leading-snug text-warning-foreground">
                            {w.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="heading-display text-lg flex items-center gap-2 text-foreground">
                      <CalendarClock className="h-5 w-5 text-primary" />
                      Turnos / Controles
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="shrink-0">
                      <Calendar
                        mode="single"
                        selected={selectedDay}
                        onSelect={setSelectedDay}
                        className="p-3 pointer-events-auto rounded-xl border border-border/60 bg-background"
                        modifiers={modifiers}
                        modifiersStyles={modifiersStyles}
                      />
                      {selectedDay && (
                        <button
                          type="button"
                          onClick={() => setSelectedDay(undefined)}
                          className="mt-3 inline-flex items-center gap-1 font-body text-xs text-primary hover:underline"
                        >
                          <X className="h-3 w-3" /> Ver todos los turnos (quitar filtro {toISODate(selectedDay)})
                        </button>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 px-1 w-full max-w-[280px]">
                        {[
                          { c: 'bg-destructive', l: 'Crítico' },
                          { c: 'bg-warning', l: 'Activo' },
                          { c: 'bg-success', l: 'En mejoría' },
                          { c: 'bg-muted-foreground', l: 'Resuelto' },
                        ].map(x => (
                          <div key={x.l} className="flex items-center gap-1.5">
                            <span className={`h-2.5 w-2.5 rounded-full ${x.c}`} />
                            <span className="font-body text-xs text-muted-foreground">{x.l}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: 'conic-gradient(hsl(var(--warning)) 0 50%, hsl(var(--destructive)) 50% 100%)' }}
                          />
                          <span className="font-body text-xs text-muted-foreground">Varios casos</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-destructive" />
                          <span className="font-body text-xs text-muted-foreground">Vencido</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-5">
                      {showUpcoming && (
                        <div>
                          <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Próximos turnos ({visibleUpcoming.length})
                          </h3>
                          {visibleUpcoming.length > 0 ? (
                            <div className="grid sm:grid-cols-2 gap-3 content-start">
                              {visibleUpcoming.map(ap => renderApt(ap))}
                            </div>
                          ) : (
                            <div className="min-h-[140px] flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-6">
                              <CalendarClock className="h-10 w-10 text-muted-foreground/60 mb-3" />
                              <p className="font-body text-sm font-semibold text-foreground">No hay próximos turnos</p>
                              <p className="font-body text-xs text-muted-foreground mt-1">Cuando programes controles, aparecerán aquí.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {showOverdue && visiblePast.length > 0 && (
                        <div>
                          <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-destructive mb-2">
                            Controles vencidos ({visiblePast.length})
                          </h3>
                          <div className="grid sm:grid-cols-2 gap-3 content-start">
                            {visiblePast.map(ap => renderApt(ap, { past: true }))}
                          </div>
                        </div>
                      )}

                      {!showUpcoming && !showOverdue && (
                        <div className="min-h-[140px] flex items-center justify-center text-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-6">
                          <p className="font-body text-sm text-muted-foreground">Sin resultados para el filtro seleccionado.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

        </div>
      </div>
    </AppLayout>
  );
}
