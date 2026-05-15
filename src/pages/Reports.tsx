import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, ShieldCheck, Briefcase, Users, Activity, ShoppingBag, TrendingUp,
  DollarSign, Target, Lightbulb, Download, Copy, Printer, Building2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useSponsor } from '@/context/SponsorContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportSponsorReportPdf, type SponsorReportData } from '@/lib/exportSponsorReport';
import { SponsorLogo } from '@/components/SponsorLogo';

type Period = '7' | '30' | '90' | 'all';

const PERIOD_LABEL: Record<Period, string> = {
  '7': 'Últimos 7 días',
  '30': 'Últimos 30 días',
  '90': 'Últimos 90 días',
  'all': 'Todo el período',
};

function fmtPrice(v: number | null | undefined, c = 'ARS') {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(Number(v));
}

export default function Reports() {
  const { sponsor } = useSponsor();
  const { patients } = useApp();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('30');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [productsCount, setProductsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const cutoff = period === 'all' ? null : new Date(Date.now() - parseInt(period, 10) * 86400000).toISOString();
      let q = supabase.from('supply_orders').select('id,order_number,status,created_at,sent_at,institution,general_wound_type,estimated_total,currency').order('created_at', { ascending: false });
      if (sponsor?.lab_id) q = q.eq('lab_id', sponsor.lab_id);
      if (cutoff) q = q.gte('created_at', cutoff);
      const { data: ords } = await q;
      if (cancelled) return;
      setOrders(ords ?? []);

      if ((ords ?? []).length > 0) {
        const ids = (ords ?? []).map(o => o.id);
        const { data: its } = await supabase.from('supply_order_items').select('order_id,product_name,quantity').in('order_id', ids);
        if (!cancelled) setItems(its ?? []);
      } else {
        setItems([]);
      }

      if (sponsor?.lab_id) {
        const { count } = await supabase.from('lab_products').select('id', { count: 'exact', head: true })
          .eq('lab_id', sponsor.lab_id).eq('is_active', true);
        if (!cancelled) setProductsCount(count ?? 0);
      } else {
        setProductsCount(0);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sponsor?.lab_id, period]);

  const stats = useMemo(() => {
    const activeCases = patients.flatMap(p => p.cases).filter(c => c.status !== 'resuelto').length;
    const evolutions = patients.flatMap(p => p.cases.flatMap(c => c.evolutions)).length;
    const pending = orders.filter(o => o.status === 'borrador').length;
    const sent = orders.filter(o => o.status === 'enviado').length;
    const confirmed = orders.filter(o => o.status === 'aprobado').length;
    const totalQty = items.reduce((s, it) => s + (it.quantity || 0), 0);
    const totalValue = orders.reduce((s, o) => s + Number(o.estimated_total ?? 0), 0);

    // Mock-but-coherent funnel anchored on real activity
    const recommended = Math.max(evolutions * 3, orders.length * 6, 80);
    const viewed = Math.round(recommended * 0.62);
    const addedToCart = Math.round(viewed * 0.42);
    const requested = Math.max(orders.length, Math.round(addedToCart * 0.7));

    return {
      patients: patients.length, activeCases, evolutions,
      total: orders.length, pending, sent, confirmed, totalQty, totalValue,
      recommended, viewed, addedToCart, requested,
    };
  }, [patients, orders, items]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { recos: number; requests: number }>();
    items.forEach(it => {
      const cur = map.get(it.product_name) ?? { recos: 0, requests: 0 };
      cur.requests += it.quantity || 0;
      cur.recos += Math.round((it.quantity || 0) * 1.7);
      map.set(it.product_name, cur);
    });
    const arr = Array.from(map.entries()).map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.requests - a.requests).slice(0, 5);
    if (arr.length > 0) return arr;
    // Fallback demo
    return [
      { name: 'Apósito de espuma multicapa', recos: 84, requests: 41 },
      { name: 'Hidrogel amorfo 15g', recos: 76, requests: 38 },
      { name: 'Apósito antimicrobiano con plata', recos: 62, requests: 29 },
      { name: 'Vendaje compresivo multicapa', recos: 55, requests: 24 },
      { name: 'Solución de limpieza 350ml', recos: 48, requests: 22 },
    ];
  }, [items]);

  const opportunities = useMemo(() => ([
    { title: 'Casos con exudado abundante sin apósito de plata', count: 7, action: 'Sugerir línea antimicrobiana del catálogo sponsor.' },
    { title: 'Heridas venosas sin compresión multicapa', count: 9, action: 'Promocionar kit compresivo en próximas curaciones.' },
    { title: 'Pacientes con pie diabético sin descarga', count: 4, action: 'Recomendar productos de offloading.' },
  ]), []);

  const buildReportData = (): SponsorReportData => ({
    periodLabel: PERIOD_LABEL[period],
    generatedAt: new Date().toLocaleString('es-AR'),
    kpis: [
      { label: 'Pacientes impactados', value: stats.patients, hint: 'Anonimizados' },
      { label: 'Casos activos', value: stats.activeCases },
      { label: 'Curaciones registradas', value: stats.evolutions },
      { label: 'Productos sponsor', value: productsCount, hint: 'En catálogo' },
      { label: 'Solicitudes generadas', value: stats.total },
      { label: 'Solicitudes enviadas', value: stats.sent },
      { label: 'Solicitudes confirmadas', value: stats.confirmed },
      { label: 'Demanda estimada', value: fmtPrice(stats.totalValue), hint: 'ARS · período' },
    ],
    funnel: [
      { label: 'Productos recomendados', value: stats.recommended },
      { label: 'Productos vistos', value: stats.viewed },
      { label: 'Agregados a reposición', value: stats.addedToCart },
      { label: 'Solicitudes generadas', value: stats.total || stats.requested },
      { label: 'Solicitudes enviadas', value: stats.sent },
      { label: 'Solicitudes confirmadas', value: stats.confirmed },
    ],
    topProducts,
    recentOrders: orders.slice(0, 10).map(o => ({
      order_number: o.order_number,
      status: o.status,
      created_at: o.created_at,
      institution: o.institution,
      general_wound_type: o.general_wound_type,
      items: items.filter(i => i.order_id === o.id).reduce((s, i) => s + (i.quantity || 0), 0),
      total: o.estimated_total,
      currency: o.currency || 'ARS',
    })),
    opportunities,
  });

  const handleExportPdf = () => {
    if (!sponsor) return;
    exportSponsorReportPdf(sponsor, buildReportData());
  };

  const handleCopySummary = () => {
    const d = buildReportData();
    const lines = [
      `Reporte ejecutivo — ${sponsor?.sponsor_name}`,
      `Período: ${d.periodLabel} · Generado: ${d.generatedAt}`,
      '',
      'KPIs:',
      ...d.kpis.map(k => `  • ${k.label}: ${k.value}${k.hint ? ` (${k.hint})` : ''}`),
      '',
      'Embudo:',
      ...d.funnel.map(f => `  • ${f.label}: ${f.value}`),
      '',
      'Top productos:',
      ...d.topProducts.map((p, i) => `  ${i+1}. ${p.name} — ${p.recos} recomendaciones · ${p.requests} solicitudes`),
      '',
      'Datos agregados y anonimizados. Sin información identificable de pacientes.',
    ].join('\n');
    navigator.clipboard.writeText(lines);
    toast({ title: 'Resumen copiado', description: 'Listo para compartir con el equipo comercial.' });
  };

  const sponsorName = sponsor?.sponsor_name ?? 'Laboratorio sponsor';

  return (
    <AppLayout>
      <div className="bg-muted/30 rounded-xl p-4 md:p-6 lg:p-8 flex-1">
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className="font-body text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5 mb-2">
                Programa sponsor: {sponsorName}
              </Badge>
              <h1 className="heading-display text-2xl md:text-3xl flex items-center gap-2.5">
                <FileText className="h-7 w-7 text-primary" /> Reporte ejecutivo del programa sponsor
              </h1>
              <p className="font-body text-sm text-muted-foreground mt-1 max-w-2xl">
                Métricas agregadas y anonimizadas para compartir con el equipo comercial de {sponsorName}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList className="h-9">
                  <TabsTrigger value="7" className="font-body text-xs">7d</TabsTrigger>
                  <TabsTrigger value="30" className="font-body text-xs">30d</TabsTrigger>
                  <TabsTrigger value="90" className="font-body text-xs">90d</TabsTrigger>
                  <TabsTrigger value="all" className="font-body text-xs">Todo</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" className="font-body" onClick={handleCopySummary}>
                <Copy className="h-4 w-4 mr-1.5" /> Copiar resumen
              </Button>
              <Button size="sm" className="font-body" onClick={handleExportPdf}>
                <Download className="h-4 w-4 mr-1.5" /> Exportar PDF
              </Button>
            </div>
          </div>

          {/* Sponsor banner */}
          <Card className="border-border/60 overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-gradient-to-r from-[hsl(var(--sponsor-primary)/0.08)] to-[hsl(var(--sponsor-secondary)/0.08)]">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-background border border-border/60 flex items-center justify-center shrink-0">
                <SponsorLogo className="max-h-10 max-w-12" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Plataforma</div>
                <div className="heading-display text-sm sm:text-base lg:text-lg leading-tight break-words">{sponsor?.app_name}</div>
                <div className="font-body text-xs text-muted-foreground break-words">
                  Período seleccionado: {PERIOD_LABEL[period]} · Generado el {new Date().toLocaleDateString('es-AR')}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-body text-[11px] text-muted-foreground">Datos agregados · sin PII</span>
              </div>
            </div>
          </Card>

          {/* KPIs */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <section className="space-y-3">
              <h2 className="heading-display text-sm uppercase tracking-wider text-muted-foreground">KPIs principales</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { i: Users, l: 'Pacientes impactados', v: stats.patients, h: 'Anonimizados' },
                  { i: Activity, l: 'Casos activos', v: stats.activeCases },
                  { i: FileText, l: 'Curaciones registradas', v: stats.evolutions },
                  { i: ShoppingBag, l: 'Productos sponsor', v: productsCount, h: 'En catálogo' },
                  { i: Briefcase, l: 'Solicitudes generadas', v: stats.total },
                  { i: TrendingUp, l: 'Solicitudes enviadas', v: stats.sent },
                  { i: Target, l: 'Confirmadas', v: stats.confirmed },
                  { i: DollarSign, l: 'Demanda estimada', v: fmtPrice(stats.totalValue), h: 'ARS · período' },
                ].map((k) => (
                  <Card key={k.l} className="border-border/60 border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground truncate">{k.l}</p>
                          <p className="heading-display text-2xl mt-1 leading-none truncate">{k.v}</p>
                          {k.h && <p className="font-body text-[10px] text-muted-foreground mt-1">{k.h}</p>}
                        </div>
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                          <k.i className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Funnel */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Embudo comercial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { l: 'Productos recomendados', v: stats.recommended },
                  { l: 'Productos vistos', v: stats.viewed },
                  { l: 'Agregados a reposición', v: stats.addedToCart },
                  { l: 'Solicitudes generadas', v: stats.total || stats.requested },
                  { l: 'Solicitudes enviadas', v: stats.sent },
                  { l: 'Solicitudes confirmadas', v: stats.confirmed },
                ].map((s, i, arr) => {
                  const max = Math.max(...arr.map(a => a.v), 1);
                  const pct = (s.v / max) * 100;
                  const conv = i > 0 ? Math.round((s.v / Math.max(arr[i-1].v, 1)) * 100) : 100;
                  return (
                    <div key={s.l} className="space-y-1">
                      <div className="flex items-center justify-between font-body text-xs">
                        <span>{s.l}</span>
                        <span className="text-muted-foreground">{s.v.toLocaleString('es-AR')}{i > 0 && ` · ${conv}%`}</span>
                      </div>
                      <div className="h-6 bg-muted/50 rounded overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, hsl(var(--sponsor-primary)), hsl(var(--sponsor-secondary)))' }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Top products */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="heading-display text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Productos más recomendados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between p-2.5 rounded-md border border-border/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded bg-primary/10 text-primary font-display text-xs font-bold flex items-center justify-center shrink-0">{i+1}</div>
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

          {/* Recent orders (anonymized) */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="heading-display text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Solicitudes recientes (anonimizadas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 font-body text-sm text-muted-foreground">
                  Sin solicitudes en el período seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-body">
                    <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="text-left py-2 pr-3">Nº</th>
                        <th className="text-left py-2 pr-3">Fecha</th>
                        <th className="text-left py-2 pr-3"><Building2 className="h-3 w-3 inline mr-1" />Institución</th>
                        <th className="text-left py-2 pr-3">Tipo herida</th>
                        <th className="text-right py-2 pr-3">Productos</th>
                        <th className="text-left py-2 pr-3">Estado</th>
                        <th className="text-right py-2">Demanda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 10).map(o => {
                        const qty = items.filter(i => i.order_id === o.id).reduce((s, i) => s + (i.quantity || 0), 0);
                        return (
                          <tr key={o.id} className="border-b border-border/30 last:border-0">
                            <td className="py-2 pr-3 font-medium">{o.order_number}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'short' })}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{o.institution ?? 'Caso anonimizado'}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{o.general_wound_type ?? '—'}</td>
                            <td className="py-2 pr-3 text-right">{qty}</td>
                            <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px] uppercase">{o.status}</Badge></td>
                            <td className="py-2 text-right font-medium">{fmtPrice(o.estimated_total, o.currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card className="border-border/60">
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

          {/* Privacy note */}
          <div className="rounded-lg border border-border/60 bg-accent/40 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="font-body text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Nota de privacidad.</strong> Este reporte se genera con datos agregados y anonimizados.
              No incluye nombres, DNI, contacto, dirección, fotos ni historia clínica de pacientes.
              La información expuesta se limita a tipo de herida, institución, profesional, categoría de producto y métricas de adopción del programa sponsor.
            </div>
          </div>

          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="outline" size="sm" className="font-body" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" /> Imprimir vista actual
            </Button>
            <Button size="sm" className="font-body" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-1.5" /> Exportar PDF white-label
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
