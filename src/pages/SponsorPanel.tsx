import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, Activity, ShoppingBag, Truck, TrendingUp, DollarSign, Target, Lightbulb, FileText, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { supabase } from '@/integrations/supabase/client';

function Kpi({ icon: Icon, label, value, hint, accent }: { icon: any; label: string; value: string | number; hint?: string; accent?: 'primary' | 'success' | 'warning' | 'info' }) {
  const cls = accent === 'success' ? 'text-success bg-success/10'
    : accent === 'warning' ? 'text-warning bg-warning/10'
    : accent === 'info' ? 'text-info bg-info/10'
    : 'text-primary bg-primary/10';
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="heading-display text-2xl mt-1">{value}</p>
            {hint && <p className="font-body text-[11px] text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cls}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(...stages.map(s => s.value), 1);
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const conv = i > 0 ? Math.round((s.value / stages[i-1].value) * 100) : 100;
        return (
          <div key={s.label} className="space-y-1">
            <div className="flex items-center justify-between font-body text-xs">
              <span className="text-foreground">{s.label}</span>
              <span className="text-muted-foreground">{s.value.toLocaleString('es-AR')} {i > 0 && <span className="ml-1">· {conv}%</span>}</span>
            </div>
            <div className="h-7 bg-muted/40 rounded overflow-hidden">
              <div className="h-full rounded transition-all"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SponsorPanel() {
  const { patients } = useApp();
  const { sponsor } = useSponsor();
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

  useEffect(() => {
    if (!sponsor?.lab_id) return;
    (async () => {
      const [p, o] = await Promise.all([
        supabase.from('lab_products').select('id', { count: 'exact', head: true }).eq('lab_id', sponsor.lab_id).eq('is_active', true),
        supabase.from('supply_orders').select('id', { count: 'exact', head: true }).eq('lab_id', sponsor.lab_id),
      ]);
      setProductsCount(p.count ?? 0);
      setOrdersCount(o.count ?? 0);
    })();
  }, [sponsor?.lab_id]);

  const real = useMemo(() => {
    const activeCases = patients.flatMap(p => p.cases).filter(c => c.status !== 'cerrado').length;
    const evolutions = patients.flatMap(p => p.cases.flatMap(c => c.evolutions)).length;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = patients.flatMap(p => p.cases.flatMap(c => c.evolutions)).filter(e => e.date === today).length;
    return { patients: patients.length, activeCases, evolutions, todayCount };
  }, [patients]);

  // Mocked but coherent funnel based on real activity
  const recommended = Math.max(real.evolutions * 3, 120);
  const viewed = Math.round(recommended * 0.62);
  const addedToCart = Math.round(viewed * 0.38);
  const requested = Math.round(addedToCart * 0.71) + ordersCount;
  const confirmed = Math.round(requested * 0.58);
  const estimatedValue = confirmed * 18500;

  const topProducts = [
    { name: 'Apósito de espuma multicapa', recos: 84, requests: 41 },
    { name: 'Hidrogel amorfo 15g', recos: 76, requests: 38 },
    { name: 'Apósito de plata antimicrobiano', recos: 62, requests: 29 },
    { name: 'Vendaje compresivo multicapa', recos: 55, requests: 24 },
    { name: 'Solución fisiológica 250ml', recos: 48, requests: 22 },
  ];

  const opportunities = [
    { title: 'Casos con exudado abundante sin apósito de plata', count: 7, action: 'Sugerir línea antimicrobiana' },
    { title: 'Pacientes con pie diabético sin descarga', count: 4, action: 'Recomendar offloading' },
    { title: 'Heridas venosas sin compresión multicapa', count: 9, action: 'Promocionar kit compresivo' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="heading-display text-3xl flex items-center gap-3">
              <Briefcase className="h-7 w-7 text-primary" />
              Panel Sponsor {sponsor?.sponsor_name}
            </h1>
            <p className="font-body text-muted-foreground mt-1">
              Métricas agregadas de adopción, demanda y oportunidades comerciales del programa.
            </p>
          </div>
          <Badge variant="outline" className="font-body text-xs gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Datos agregados · sin información identificable
          </Badge>
        </div>

        {/* Resumen ejecutivo */}
        <section className="space-y-3">
          <h2 className="heading-display text-sm uppercase tracking-wider text-muted-foreground">Resumen ejecutivo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={Users} label="Suscripciones activas" value={12} hint="Enfermeros financiados" />
            <Kpi icon={Activity} label="Pacientes impactados" value={real.patients} accent="info" />
            <Kpi icon={FileText} label="Curaciones registradas" value={real.evolutions} accent="success" />
            <Kpi icon={DollarSign} label="Valor estimado demanda" value={`$${(estimatedValue/1000).toFixed(0)}k`} hint="ARS · últimos 30 días" accent="warning" />
          </div>
        </section>

        {/* Adopción */}
        <section className="space-y-3">
          <h2 className="heading-display text-sm uppercase tracking-wider text-muted-foreground">Adopción de la plataforma</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={Users} label="Enfermeros activos" value={9} hint="Últimos 7 días" />
            <Kpi icon={Activity} label="Casos activos" value={real.activeCases} />
            <Kpi icon={ShoppingBag} label="Productos sponsor" value={productsCount} hint="En catálogo" />
            <Kpi icon={Truck} label="Solicitudes generadas" value={ordersCount + requested} hint="Reales + estimadas" />
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="heading-display text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Embudo comercial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Funnel stages={[
                { label: 'Productos recomendados', value: recommended },
                { label: 'Productos vistos', value: viewed },
                { label: 'Agregados a reposición', value: addedToCart },
                { label: 'Solicitudes enviadas', value: requested },
                { label: 'Pedidos confirmados', value: confirmed },
              ]} />
            </CardContent>
          </Card>

          {/* Top productos */}
          <Card>
            <CardHeader>
              <CardTitle className="heading-display text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Productos más recomendados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between p-2.5 rounded-md border border-border/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded bg-primary/10 text-primary font-display text-xs font-bold flex items-center justify-center shrink-0">
                      {i+1}
                    </div>
                    <span className="font-body text-sm truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="font-body text-[10px]">{p.recos} recos</Badge>
                    <span className="font-body text-xs text-muted-foreground">{p.requests} pedidos</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Oportunidades */}
        <Card>
          <CardHeader>
            <CardTitle className="heading-display text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" /> Oportunidades detectadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opportunities.map(o => (
              <div key={o.title} className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-warning/5">
                <Badge className="font-body bg-warning text-warning-foreground shrink-0">{o.count}</Badge>
                <div className="flex-1">
                  <p className="font-body text-sm font-medium">{o.title}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">{o.action}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reporte mensual */}
        <Card>
          <CardHeader>
            <CardTitle className="heading-display text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Reporte mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-sm text-muted-foreground mb-3">
              Generá un reporte ejecutivo agregado para compartir con el equipo comercial de {sponsor?.sponsor_name}.
            </p>
            <Button variant="outline" className="font-body" onClick={() => window.print()}>
              Exportar reporte ({new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })})
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
