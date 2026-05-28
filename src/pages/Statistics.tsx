import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useSponsor } from '@/context/SponsorContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Activity, Package, Download, FileText, FileSpreadsheet,
  ShieldCheck, TrendingUp, ShoppingBag, Calendar,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Period = '7' | '30' | '90' | 'all';

const CHART_PALETTE = [
  'hsl(var(--primary))',
  'hsl(210 80% 55%)',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(280 60% 55%)',
  'hsl(30 85% 55%)',
  'hsl(180 60% 45%)',
];

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsvRow(values: (string | number)[]) {
  return values.map(v => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

const PERIOD_TO_DAYS: Record<Period, number | null> = {
  '7': 7,
  '30': 30,
  '90': 90,
  'all': null,
};

export default function Statistics() {
  const { sponsor } = useSponsor();
  const [period, setPeriod] = useState<Period>('30');
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: ords } = await supabase.rpc(
        'get_sponsor_orders_anon' as never,
        { p_period_days: PERIOD_TO_DAYS[period] } as never,
      );
      const safeOrders = (ords ?? []) as any[];
      setOrders(safeOrders);

      const orderIds = safeOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        const { data: ordItems } = await supabase.rpc(
          'get_sponsor_order_items_anon' as never,
          { p_order_ids: orderIds } as never,
        );
        setItems((ordItems ?? []) as any[]);
      } else {
        setItems([]);
      }
      setLoading(false);
    })();
  }, [period]);

  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const sentOrders = orders.filter((o) => o.status === 'enviado').length;
    const confirmedOrders = orders.filter((o) => o.status === 'aprobado').length;
    const totalValue = orders.reduce((acc, o) => acc + Number(o.estimated_total ?? 0), 0);
    const totalUnits = items.reduce((acc, i) => acc + (i.quantity ?? 0), 0);
    const conversion = sentOrders > 0 ? Math.round((confirmedOrders / sentOrders) * 100) : 0;
    return { totalOrders, sentOrders, confirmedOrders, totalValue, totalUnits, conversion };
  }, [orders, items]);

  const woundTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => {
      const key = o.general_wound_type || 'Sin clasificar';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  const productUsageData = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((it) => {
      const key = it.product_name || 'Producto sin nombre';
      counts.set(key, (counts.get(key) ?? 0) + (it.quantity ?? 0));
    });
    return [...counts.entries()]
      .map(([name, value]) => ({ name: name.length > 30 ? `${name.slice(0, 27)}...` : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items]);

  const monthlyData = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => {
      const d = String(o.created_at || '').slice(0, 7);
      if (!d) return;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, value]) => ({ month: k, value }));
  }, [orders]);

  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push('Reporte de Estadísticas Sponsor');
    lines.push(`Generado,${new Date().toISOString()}`);
    lines.push(`Sponsor,${sponsor?.sponsor_name ?? '—'}`);
    lines.push(`Periodo,${period}`);
    lines.push('');
    lines.push('Resumen');
    lines.push(toCsvRow(['Pedidos', summary.totalOrders]));
    lines.push(toCsvRow(['Pedidos enviados', summary.sentOrders]));
    lines.push(toCsvRow(['Pedidos confirmados', summary.confirmedOrders]));
    lines.push(toCsvRow(['Unidades solicitadas', summary.totalUnits]));
    lines.push(toCsvRow(['Demanda estimada ARS', summary.totalValue]));
    lines.push('');

    lines.push('Uso por tipo de herida (agregado)');
    lines.push(toCsvRow(['Tipo de herida', 'Solicitudes']));
    woundTypeData.forEach((r) => lines.push(toCsvRow([r.name, r.value])));
    lines.push('');

    lines.push('Uso por producto (agregado)');
    lines.push(toCsvRow(['Producto', 'Unidades']));
    productUsageData.forEach((r) => lines.push(toCsvRow([r.name, r.value])));

    downloadFile(`curatrack-estadisticas-sponsor-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  };

  const handleExportPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const tableHtml = (title: string, headers: string[], rows: (string | number)[][]) => `
      <h2>${esc(title)}</h2>
      <table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.length === 0 ? `<tr><td colspan="${headers.length}">Sin datos.</td></tr>`
          : rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;

    const html = `
      <!doctype html><html><head><meta charset="utf-8"/>
      <title>Estadísticas sponsor</title>
      <style>
        body{font-family:'Open Sans',Arial,sans-serif;color:#1f2937;padding:32px;max-width:900px;margin:0 auto;}
        h1{font-family:'Montserrat',Arial,sans-serif;color:#00965E;margin:0 0 4px;}
        .meta{color:#6b7280;font-size:12px;margin-bottom:24px;}
        h2{font-family:'Montserrat',Arial,sans-serif;color:#00965E;border-bottom:2px solid #00965E;padding-bottom:4px;margin-top:32px;font-size:15px;}
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}
        th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;}
        th{background:#f0fdf4;}
        .summary{display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;}
        .card{flex:1;min-width:140px;border:1px solid #e5e7eb;border-radius:8px;padding:12px;}
        .card .num{font-size:24px;font-weight:700;color:#00965E;font-family:'Montserrat',Arial,sans-serif;}
        .card .lbl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;}
        @media print{button{display:none;}}
      </style></head><body>
        <h1>Estadísticas sponsor</h1>
        <div class="meta">
          Generado: ${esc(new Date().toLocaleString('es-AR'))}<br/>
          Sponsor: ${esc(sponsor?.sponsor_name ?? '—')}<br/>
          Período: ${esc(period)}
        </div>

        <h2>Resumen</h2>
        <div class="summary">
          <div class="card"><div class="num">${summary.totalOrders}</div><div class="lbl">Pedidos</div></div>
          <div class="card"><div class="num">${summary.sentOrders}</div><div class="lbl">Enviados</div></div>
          <div class="card"><div class="num">${summary.confirmedOrders}</div><div class="lbl">Confirmados</div></div>
          <div class="card"><div class="num">${summary.totalUnits}</div><div class="lbl">Unidades</div></div>
          <div class="card"><div class="num">${summary.conversion}%</div><div class="lbl">Conversión</div></div>
          <div class="card"><div class="num">${summary.totalValue}</div><div class="lbl">Demanda ARS</div></div>
        </div>

        ${tableHtml('Uso por tipo de herida', ['Tipo de herida', 'Solicitudes'], woundTypeData.map(d => [d.name, d.value]))}
        ${tableHtml('Uso por producto', ['Producto', 'Unidades'], productUsageData.map(d => [d.name, d.value]))}
        ${tableHtml('Actividad mensual', ['Mes', 'Solicitudes'], monthlyData.map(d => [d.month, d.value]))}

        <p style="margin-top:16px;font-size:11px;color:#6b7280;">
          Este documento contiene exclusivamente datos agregados y anonimizados. No incluye nombres de pacientes, DNI, fotos, direcciones ni datos de contacto.
        </p>

        <script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  const tooltipStyle: React.CSSProperties = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Estadísticas sponsor</h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Métricas agregadas del laboratorio sobre uso de productos, tipo de herida y frecuencia de reposición.
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Descargar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
                <FileText className="h-4 w-4" /> Descargar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Alcance y privacidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="font-body text-sm text-muted-foreground">
                Datos filtrados automáticamente por sponsor activo: <strong>{sponsor?.sponsor_name ?? '—'}</strong>.
                Solo se exponen estadísticas agregadas, sin identificadores de pacientes.
              </p>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList className="h-9">
                  <TabsTrigger value="7" className="font-body text-xs">7d</TabsTrigger>
                  <TabsTrigger value="30" className="font-body text-xs">30d</TabsTrigger>
                  <TabsTrigger value="90" className="font-body text-xs">90d</TabsTrigger>
                  <TabsTrigger value="all" className="font-body text-xs">Todo</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard icon={<ShoppingBag className="h-5 w-5" />} label="Pedidos" value={summary.totalOrders} />
          <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="Enviados" value={summary.sentOrders} />
          <SummaryCard icon={<Activity className="h-5 w-5" />} label="Confirmados" value={summary.confirmedOrders} />
          <SummaryCard icon={<Package className="h-5 w-5" />} label="Unidades" value={summary.totalUnits} />
          <SummaryCard icon={<Calendar className="h-5 w-5" />} label="Conversión" value={summary.conversion} suffix="%" />
          <SummaryCard icon={<FileText className="h-5 w-5" />} label="Demanda ARS" value={Math.round(summary.totalValue)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Uso por tipo de herida" subtitle="Pedidos agregados por tipología, sin datos individuales.">
            {loading || woundTypeData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={woundTypeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={160} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Uso por producto" subtitle="Top productos del sponsor por unidades solicitadas.">
            {loading || productUsageData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={productUsageData} dataKey="value" nameKey="name" outerRadius={100} label={(e) => `${e.value}`}>
                    {productUsageData.map((s, idx) => <Cell key={s.name} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Actividad por mes" subtitle="Solicitudes por mes del sponsor logueado.">
          {loading || monthlyData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </AppLayout>
  );
}

function SummaryCard({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight break-words">
              {label}
            </p>
            <p className="font-heading text-3xl font-bold text-foreground mt-2 leading-none">{value}{suffix ?? ''}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base">{title}</CardTitle>
        {subtitle && <p className="font-body text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">
      Sin datos agregados para el período seleccionado.
    </div>
  );
}
