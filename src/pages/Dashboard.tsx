import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, Users, AlertTriangle, CalendarClock, Clock, ShoppingBag,
  TrendingUp, Sparkles, Plus, ArrowRight, Stethoscope, FileText,
  Package, BarChart3, ChevronRight, AlertCircle, CheckCircle2, Lightbulb,
  CalendarPlus, UserPlus, Calendar, ListChecks, FileBarChart, Pill,
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

type Period = 'today' | '7' | '30';

export default function Dashboard() {
  const { patients, currentUserName } = useApp();
  const { sponsor } = useSponsor();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('7');
  const [orderCount, setOrderCount] = useState({ total: 0, pending: 0, sent: 0 });
  const [recommendedProducts, setRecommendedProducts] = useState<Array<{ name: string; category?: string }>>([]);

  // Load sponsor-related orders count and a sample of products
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
    return () => { cancelled = true; };
  }, [sponsor?.lab_id]);

  const allCases = useMemo(() => patients.flatMap(p => p.cases), [patients]);
  const allEvos = useMemo(() => allCases.flatMap(c => c.evolutions), [allCases]);

  const periodDays = period === 'today' ? 1 : period === '7' ? 7 : 30;
  const periodCutoff = Date.now() - periodDays * 86400000;

  const today = toISO(new Date());
  const in7 = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    in7.add(toISO(d));
  }

  const activeCases = allCases.filter(c => c.status === 'activo' || c.status === 'critico' || c.status === 'en_mejoria');
  const criticalCases = allCases.filter(c => c.status === 'critico');

  const todayAppointments = allCases.flatMap(c =>
    c.evolutions
      .filter(e => e.nextControl === today)
      .map(e => ({ evo: e, woundType: c.woundType, status: c.status }))
  );

  const upcomingControls = allEvos.filter(e => e.nextControl && e.nextControl >= today).length;
  const overdueControls = allEvos.filter(e => e.nextControl && e.nextControl < today).length;
  const evosPeriod = allEvos.filter(e => {
    const t = new Date(e.date + 'T12:00:00').getTime();
    return t >= periodCutoff;
  }).length;

  // Alerts
  const alerts = useMemo(() => {
    const list: Array<{ type: string; label: string; severity: 'destructive' | 'warning' | 'info'; icon: typeof AlertTriangle }> = [];
    if (criticalCases.length > 0) {
      list.push({ type: 'critical', label: `${criticalCases.length} herida(s) en estado crítico`, severity: 'destructive', icon: AlertTriangle });
    }
    if (overdueControls > 0) {
      list.push({ type: 'overdue', label: `${overdueControls} control(es) vencido(s)`, severity: 'warning', icon: Clock });
    }
    const noEvoLately = patients.filter(p => {
      const last = p.cases.flatMap(c => c.evolutions.map(e => e.date)).sort().slice(-1)[0];
      if (!last) return false;
      const days = (Date.now() - new Date(last + 'T12:00:00').getTime()) / 86400000;
      return days > 14 && p.cases.some(c => c.status !== 'resuelto');
    }).length;
    if (noEvoLately > 0) {
      list.push({ type: 'no-evo', label: `${noEvoLately} paciente(s) sin evolución en 14+ días`, severity: 'warning', icon: AlertCircle });
    }
    const painCases = allCases.filter(c => Number(c.pain ?? 0) >= 7).length;
    if (painCases > 0) {
      list.push({ type: 'pain', label: `${painCases} caso(s) con dolor elevado (≥7)`, severity: 'warning', icon: Activity });
    }
    if (list.length === 0) {
      list.push({ type: 'ok', label: 'Sin alertas activas. Buen seguimiento clínico.', severity: 'info', icon: CheckCircle2 });
    }
    return list;
  }, [criticalCases, overdueControls, patients, allCases]);

  // Mock opportunities (commercial insights — sponsor-aware)
  const opportunities = [
    'Alta demanda de apósitos en úlceras por presión esta semana.',
    'Aumentaron las solicitudes de soluciones de limpieza un 18%.',
    'Hay productos recomendados sin equivalente sponsor asociado.',
    'Curaciones frecuentes con reposición pendiente de envío.',
  ];

  // Mock conversion (sponsor activity)
  const recsThisWeek = Math.max(8, Math.round(activeCases.length * 1.3));
  const inCart = Math.round(recsThisWeek * 0.55);
  const conv = orderCount.total > 0 ? Math.round((orderCount.total / recsThisWeek) * 100) : 0;

  // KPI cards
  const kpis = [
    { k: 'Pacientes activos', v: patients.length, icon: Users, color: 'text-info', bg: 'bg-info/10', border: 'border-l-info', sub: 'Total en seguimiento', to: '/patients' },
    { k: 'Casos de heridas', v: activeCases.length, icon: Activity, color: 'text-warning', bg: 'bg-warning/10', border: 'border-l-warning', sub: `${criticalCases.length} críticos`, to: '/cases' },
    { k: 'Curaciones hoy', v: todayAppointments.length, icon: CalendarClock, color: 'text-primary', bg: 'bg-primary/10', border: 'border-l-primary', sub: todayLabel(), to: '/agenda' },
    { k: 'Próximos controles', v: upcomingControls, icon: Clock, color: 'text-success', bg: 'bg-success/10', border: 'border-l-success', sub: `${overdueControls} vencidos`, to: '/agenda' },
    { k: 'Heridas con alerta', v: criticalCases.length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-l-destructive', sub: 'Requieren atención', to: '/cases' },
    { k: 'Evoluciones', v: evosPeriod, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', border: 'border-l-success', sub: `Últimos ${periodDays} días` },
    { k: 'Recomendados sponsor', v: recommendedProducts.length || 0, icon: Pill, color: 'text-primary', bg: 'bg-primary/10', border: 'border-l-primary', sub: 'Productos sugeridos', to: '/marketplace' },
    { k: 'Solicitudes', v: orderCount.total, icon: ShoppingBag, color: 'text-info', bg: 'bg-info/10', border: 'border-l-info', sub: `${orderCount.pending} pendientes`, to: '/orders' },
  ];

  const sponsorName = sponsor?.sponsor_name ?? 'Programa clínico';

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className="font-body text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5 mb-2">
                Programa sponsor: {sponsorName}
              </Badge>
              <h1 className="heading-display text-2xl md:text-3xl">
                {getGreeting()}, {currentUserName || 'profesional'}
              </h1>
              <p className="font-body text-sm text-muted-foreground mt-1 capitalize">
                {todayLabel()} · Cabina de control clínico-comercial
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList className="h-9">
                  <TabsTrigger value="today" className="text-xs">Hoy</TabsTrigger>
                  <TabsTrigger value="7" className="text-xs">7 días</TabsTrigger>
                  <TabsTrigger value="30" className="text-xs">30 días</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" className="font-body" onClick={() => navigate('/orders')}>
                <ShoppingBag className="h-4 w-4 mr-1.5" /> Ver solicitudes
              </Button>
              <Button size="sm" className="font-body" onClick={() => navigate('/curation/new')}>
                <Plus className="h-4 w-4 mr-1.5" /> Nueva curación
              </Button>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            {kpis.map((s) => (
              <Card
                key={s.k}
                role={s.to ? 'button' : undefined}
                tabIndex={s.to ? 0 : undefined}
                onClick={s.to ? () => navigate(s.to!) : undefined}
                className={`rounded-xl border border-border/60 border-l-4 ${s.border} bg-card shadow-sm transition-all duration-200 ${s.to ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.bg}`}>
                      <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                    </div>
                    {s.to && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="mt-3">
                    <div className="heading-display text-2xl text-foreground leading-none">{s.v}</div>
                    <div className="font-body text-xs text-muted-foreground mt-1.5 font-medium">{s.k}</div>
                    <div className="font-body text-[11px] text-muted-foreground/80 mt-1">{s.sub}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Two-column: Agenda + Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Agenda hoy */}
            <Card className="lg:col-span-2 border-border/60">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <div>
                  <CardTitle className="heading-display text-lg flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" /> Agenda clínica de hoy
                  </CardTitle>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    Próximas curaciones y controles programados
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="font-body" onClick={() => navigate('/agenda')}>
                  Ver agenda <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground font-body">
                    No hay curaciones programadas para hoy.
                  </div>
                ) : (
                  todayAppointments.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/60 hover:bg-accent/30 transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-sm font-medium truncate">
                          {a.evo.time || 'Sin horario'} · {a.woundType || 'Curación'}
                        </div>
                        <div className="font-body text-xs text-muted-foreground truncate">
                          {a.evo.professional || 'Profesional asignado'}
                        </div>
                      </div>
                      <Badge variant="outline" className="font-body text-[10px] uppercase">
                        {a.status === 'critico' ? 'Crítico' : a.status === 'en_mejoria' ? 'En mejoría' : 'Activo'}
                      </Badge>
                      <Button size="sm" variant="ghost" className="font-body text-xs">
                        Registrar
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Alertas */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="heading-display text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" /> Alertas clínicas
                </CardTitle>
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  Casos que requieren atención
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {alerts.map((a, i) => {
                  const colorMap = {
                    destructive: 'bg-destructive/10 text-destructive border-destructive/30',
                    warning: 'bg-warning/10 text-warning border-warning/30',
                    info: 'bg-success/10 text-success border-success/30',
                  } as const;
                  return (
                    <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${colorMap[a.severity]}`}>
                      <a.icon className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="font-body text-xs leading-relaxed">{a.label}</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Sponsor activity + opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <div>
                  <CardTitle className="heading-display text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" /> Actividad sponsor
                  </CardTitle>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    Productos {sponsorName} y conversión a demanda
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="font-body" onClick={() => navigate('/sponsor')}>
                  Panel <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">Recomendados / sem.</div>
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
                    <div className="heading-display text-xl mt-1 text-primary">{conv}%</div>
                  </div>
                </div>
                {recommendedProducts.length > 0 && (
                  <div>
                    <div className="font-body text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                      Recomendados esta semana
                    </div>
                    <div className="space-y-1.5">
                      {recommendedProducts.slice(0, 3).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-background border border-border/60">
                          <Pill className="h-4 w-4 text-primary shrink-0" />
                          <div className="font-body text-sm truncate flex-1">{p.name}</div>
                          {p.category && (
                            <Badge variant="secondary" className="font-body text-[10px]">{p.category}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="heading-display text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-warning" /> Oportunidades detectadas
                </CardTitle>
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  Insights clínicos y comerciales agregados
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {opportunities.map((o, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-accent/30 border border-border/60">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="font-body text-xs leading-relaxed">{o}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="heading-display text-lg">Accesos rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { l: 'Nueva curación', i: CalendarPlus, to: '/curation/new' },
                  { l: 'Nuevo paciente', i: UserPlus, to: '/patients' },
                  { l: 'Ver agenda', i: Calendar, to: '/agenda' },
                  { l: 'Catálogo clínico', i: Package, to: '/marketplace' },
                  { l: 'Crear solicitud', i: ListChecks, to: '/marketplace' },
                  { l: 'Panel Sponsor', i: BarChart3, to: '/sponsor' },
                  { l: 'Generar reporte', i: FileBarChart, to: '/reports' },
                ].map((q) => (
                  <button
                    key={q.l}
                    onClick={() => navigate(q.to)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-border/60 bg-background hover:bg-accent/40 hover:border-primary/40 transition-all"
                  >
                    <q.i className="h-5 w-5 text-primary" />
                    <span className="font-body text-[11px] text-center leading-tight">{q.l}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
