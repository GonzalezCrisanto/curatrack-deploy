import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Users, Activity, AlertTriangle, CheckCircle2, TrendingUp, Clock,
  ChevronRight, CalendarClock, ArrowUp, ArrowDown, ArrowRight, ChevronDown, ChevronUp,
  Search, X, Check,
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
  const { patients, currentUser } = useApp();
  const navigate = useNavigate();
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [attendedAlerts, setAttendedAlerts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [woundTypeFilter, setWoundTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lastEvo');

  const allCases = patients.flatMap(p => p.cases);
  const activeCases = allCases.filter(c => c.status === 'activo');
  const criticalCases = allCases.filter(c => c.status === 'critico').filter(c => !attendedAlerts.has(c.id));
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

  const recentEvolutions = allCases
    .flatMap(c => c.evolutions.map(e => ({ ...e, caseId: c.id, patientId: c.patientId, woundType: c.woundType, status: c.status })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const today = new Date().toISOString().split('T')[0];
  const upcomingAppointments = allCases
    .flatMap(c => c.evolutions.map(e => ({ ...e, caseId: c.id, patientId: c.patientId, woundType: c.woundType })))
    .filter(e => e.nextControl && e.nextControl.trim() !== '' && e.nextControl >= today)
    .sort((a, b) => a.nextControl.localeCompare(b.nextControl))
    .slice(0, 6);

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
    setActiveFilter(prev => (prev === key ? 'all' : key));
  };

  const markAlertAttended = (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAttendedAlerts(prev => {
      const next = new Set(prev);
      next.add(caseId);
      return next;
    });
    toast({ title: 'Alerta marcada como atendida', description: 'Se ocultó de la lista de alertas críticas.' });
  };

  return (
    <AppLayout>
      <div className="bg-muted/30 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 min-h-full">
        <div className="space-y-6 animate-fade-in">
          {/* Greeting Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <div>
              <h1 className="heading-display text-2xl md:text-3xl text-foreground">
                {getGreeting()}, {currentUser}
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
          {upcomingAppointments.length > 0 && (() => {
            const appointmentDates = upcomingAppointments.map(ap => {
              const caseData = allCases.find(c => c.id === ap.caseId);
              return { date: new Date(ap.nextControl + 'T12:00:00'), status: caseData?.status || 'activo' };
            });

            const modifiers = {
              critical: appointmentDates.filter(d => d.status === 'critico').map(d => d.date),
              active: appointmentDates.filter(d => d.status === 'activo').map(d => d.date),
              improving: appointmentDates.filter(d => d.status === 'en_mejoria').map(d => d.date),
              resolved: appointmentDates.filter(d => d.status === 'resuelto').map(d => d.date),
            };

            const modifiersStyles = {
              critical: { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))', borderRadius: '9999px' },
              active: { backgroundColor: 'hsl(var(--warning))', color: 'hsl(var(--warning-foreground))', borderRadius: '9999px' },
              improving: { backgroundColor: 'hsl(var(--success))', color: '#fff', borderRadius: '9999px' },
              resolved: { backgroundColor: 'hsl(var(--muted-foreground))', color: '#fff', borderRadius: '9999px' },
            };

            return (
              <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="heading-display text-lg flex items-center gap-2 text-foreground">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    Próximos Turnos / Controles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="shrink-0">
                      <Calendar
                        mode="multiple"
                        selected={appointmentDates.map(d => d.date)}
                        className="p-3 pointer-events-auto rounded-xl border border-border/60 bg-background"
                        modifiers={modifiers}
                        modifiersStyles={modifiersStyles}
                      />
                      <div className="flex flex-wrap gap-3 mt-3 px-1">
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
                      </div>
                    </div>

                    <div className="flex-1 grid sm:grid-cols-2 gap-3 content-start">
                      {upcomingAppointments.map(ap => {
                        const patient = patients.find(p => p.id === ap.patientId);
                        const caseData = allCases.find(c => c.id === ap.caseId);
                        const dotClass = statusDot[caseData?.status || 'activo'];
                        return (
                          <div
                            key={ap.id + '-apt'}
                            className="p-4 rounded-xl border border-border/60 hover:shadow-md transition-all cursor-pointer bg-card hover:-translate-y-0.5"
                            onClick={() => navigate(`/patients/${ap.patientId}/cases/${ap.caseId}`)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CalendarClock className="h-4 w-4 text-primary" />
                                <span className="font-body text-sm font-semibold text-primary">{ap.nextControl}</span>
                              </div>
                              <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`} />
                            </div>
                            <p className="font-body text-sm font-semibold text-foreground">{patient?.lastName}, {patient?.firstName}</p>
                            <p className="font-body text-xs text-muted-foreground mt-0.5">{ap.woundType}</p>
                            <p className="font-body text-xs text-muted-foreground mt-1">Prof: {ap.professional}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Critical alerts */}
            <Card className={`rounded-xl border shadow-sm ${criticalCases.length > 0 ? 'border-destructive/40 bg-destructive/[0.03]' : 'border-border/60 bg-card'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="heading-display text-lg flex items-center gap-2 text-foreground">
                  {criticalCases.length > 0 ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                    </span>
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                  Alertas Críticas
                  {criticalCases.length > 0 && (
                    <Badge variant="destructive" className="ml-1 font-body">{criticalCases.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {criticalCases.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <p className="font-body text-sm text-foreground font-medium">Sin alertas críticas hoy</p>
                  </div>
                ) : (
                  criticalCases.map(c => {
                    const patient = patients.find(p => p.id === c.patientId);
                    const lastEvo = [...c.evolutions].sort((a, b) => b.date.localeCompare(a.date))[0];
                    const days = lastEvo ? daysSince(lastEvo.date) : null;
                    return (
                      <div
                        key={c.id}
                        className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/60 border-l-4 border-l-destructive cursor-pointer hover:shadow-md transition-all"
                        onClick={() => navigate(`/patients/${c.patientId}/cases/${c.id}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-sm font-semibold text-foreground truncate">{patient?.firstName} {patient?.lastName}</p>
                          <p className="font-body text-xs text-muted-foreground truncate">
                            {c.woundType} · {c.anatomicalLocation}
                          </p>
                          {days !== null && (
                            <p className="font-body text-[11px] text-destructive mt-1 font-medium">
                              Última evolución {days === 0 ? 'hoy' : days === 1 ? 'hace 1 día' : `hace ${days} días`}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-body text-xs border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${c.patientId}`);
                            }}
                          >
                            Ver paciente
                            <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-body text-[11px] h-7 text-muted-foreground hover:text-success hover:bg-success/10"
                            onClick={(e) => markAlertAttended(c.id, e)}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Marcar atendida
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Recent activity — Timeline */}
            <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="heading-display text-lg text-foreground">Actividad Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6">
                  <span className="absolute left-2 top-1 bottom-1 w-px bg-border" aria-hidden />
                  <Collapsible open={showAllActivity} onOpenChange={setShowAllActivity}>
                    <ul className="space-y-1">
                      {recentEvolutions.slice(0, 3).map((ev, i) => {
                        const patient = patients.find(p => p.id === ev.patientId);
                        const dot = statusDot[ev.status as string] || 'bg-muted-foreground';
                        return (
                          <li
                            key={ev.id}
                            className={`relative cursor-pointer rounded-lg px-3 py-2.5 -ml-3 hover:bg-secondary/60 transition-colors ${i % 2 === 0 ? 'bg-secondary/30' : ''}`}
                            onClick={() => navigate(`/patients/${ev.patientId}/cases/${ev.caseId}`)}
                          >
                            <span
                              className={`absolute -left-[18px] top-3.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${dot}`}
                              aria-hidden
                            />
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-body text-sm font-semibold text-foreground truncate">
                                  {patient?.firstName} {patient?.lastName} <span className="text-muted-foreground font-normal">— {ev.woundType}</span>
                                </p>
                                <p className="font-body text-[11px] text-muted-foreground mt-0.5">
                                  {relativeDate(ev.date)} · {ev.professional}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                          </li>
                        );
                      })}
                      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                        <ul className="space-y-1">
                          {recentEvolutions.slice(3).map((ev, idx) => {
                            const i = idx + 3;
                            const patient = patients.find(p => p.id === ev.patientId);
                            const dot = statusDot[ev.status as string] || 'bg-muted-foreground';
                            return (
                              <li
                                key={ev.id}
                                className={`relative cursor-pointer rounded-lg px-3 py-2.5 -ml-3 hover:bg-secondary/60 transition-colors ${i % 2 === 0 ? 'bg-secondary/30' : ''}`}
                                onClick={() => navigate(`/patients/${ev.patientId}/cases/${ev.caseId}`)}
                              >
                                <span
                                  className={`absolute -left-[18px] top-3.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${dot}`}
                                  aria-hidden
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-body text-sm font-semibold text-foreground truncate">
                                      {patient?.firstName} {patient?.lastName} <span className="text-muted-foreground font-normal">— {ev.woundType}</span>
                                    </p>
                                    <p className="font-body text-[11px] text-muted-foreground mt-0.5">
                                      {relativeDate(ev.date)} · {ev.professional}
                                    </p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </CollapsibleContent>
                    </ul>
                  </Collapsible>
                  {recentEvolutions.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllActivity(v => !v)}
                      className="mt-3 inline-flex items-center gap-1 font-body text-sm text-primary hover:underline"
                    >
                      {showAllActivity ? (
                        <>Ver menos <ChevronUp className="h-3.5 w-3.5" /></>
                      ) : (
                        <>Ver toda la actividad <ChevronDown className="h-3.5 w-3.5" /></>
                      )}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick access patients */}
          <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="heading-display text-lg text-foreground">Pacientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} className="font-body text-sm">
                Ver todos <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {patients.slice(0, 6).map(p => {
                  const sev = patientSeverity(p);
                  return (
                    <div
                      key={p.id}
                      className="group p-4 rounded-xl border border-border/60 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer bg-card"
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className={`h-10 w-10 ${avatarColor(p.id)}`}>
                          <AvatarFallback className={`${avatarColor(p.id)} font-body font-semibold text-sm`}>
                            {getInitials(p.firstName, p.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-sm font-semibold text-foreground truncate">
                            {p.lastName}, {p.firstName}
                          </p>
                          <p className="font-body text-xs text-muted-foreground truncate mt-0.5">
                            {p.diagnosis}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                            <Badge variant="outline" className="font-body text-[10px]">
                              {p.cases.length} caso{p.cases.length !== 1 ? 's' : ''}
                            </Badge>
                            {statusBadge(sev)}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
