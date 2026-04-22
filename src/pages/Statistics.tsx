import { useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { Activity, Users, CheckCircle2, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Patient, WoundCase, Evolution } from '@/data/demoData';

type StatusBucket = 'tratamiento' | 'mejorando' | 'deterioro' | 'cerradas';

const STATUS_BUCKETS: { key: StatusBucket; label: string; color: string }[] = [
  { key: 'tratamiento', label: 'En tratamiento', color: 'hsl(var(--info, 210 90% 50%))' },
  { key: 'mejorando', label: 'Mejorando', color: 'hsl(var(--success, 142 70% 45%))' },
  { key: 'deterioro', label: 'Deterioro', color: 'hsl(var(--destructive))' },
  { key: 'cerradas', label: 'Cerradas', color: 'hsl(var(--muted-foreground))' },
];

function bucketForCase(c: WoundCase): StatusBucket {
  if (c.status === 'resuelto') return 'cerradas';
  const latest = [...c.evolutions].sort((a, b) => b.date.localeCompare(a.date))[0];
  const ev = latest?.evolutionStatus;
  if (ev === 'cicatrizada') return 'cerradas';
  if (ev === 'deterioro' || c.status === 'critico') return 'deterioro';
  if (ev === 'mejoria_progresiva' || c.status === 'en_mejoria') return 'mejorando';
  return 'tratamiento';
}

// Naive material tokenizer: split by commas/semicolons, trim, drop quantities/units.
function extractMaterials(materials: string): string[] {
  if (!materials) return [];
  return materials
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean)
    // Strip trailing quantity descriptors like "10x10", "500ml", numbers
    .map(s => s.replace(/\s*\d+(\.\d+)?\s*(ml|cm|mg|g|x\s*\d+)?$/i, '').trim())
    .filter(s => s.length > 1);
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function evoArea(e: Evolution): number | null {
  if (typeof e.woundLength === 'number' && typeof e.woundWidth === 'number') {
    return +(e.woundLength * e.woundWidth).toFixed(2);
  }
  return null;
}

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

export default function Statistics() {
  const { patients } = useApp();
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const filteredPatients = useMemo(() => {
    return patientFilter === 'all'
      ? patients
      : patients.filter(p => p.id === patientFilter);
  }, [patients, patientFilter]);

  const allEvolutions = useMemo(() => {
    const out: { patient: Patient; case: WoundCase; evolution: Evolution }[] = [];
    filteredPatients.forEach(p => p.cases.forEach(c => c.evolutions.forEach(e => {
      if (fromDate && e.date < fromDate) return;
      if (toDate && e.date > toDate) return;
      out.push({ patient: p, case: c, evolution: e });
    })));
    return out;
  }, [filteredPatients, fromDate, toDate]);

  // Bar chart: top 10 most used materials in selected window
  const topMaterials = useMemo(() => {
    const counts = new Map<string, number>();
    allEvolutions.forEach(({ evolution }) => {
      extractMaterials(evolution.materials).forEach(m => {
        const key = m.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
    return [...counts.entries()]
      .map(([name, count]) => ({
        name: name.length > 28 ? name.slice(0, 26) + '…' : name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [allEvolutions]);

  // Pie chart: wounds by current status (uses ALL filtered patients regardless of date range)
  const statusData = useMemo(() => {
    const counts: Record<StatusBucket, number> = {
      tratamiento: 0, mejorando: 0, deterioro: 0, cerradas: 0,
    };
    filteredPatients.forEach(p => p.cases.forEach(c => {
      counts[bucketForCase(c)]++;
    }));
    return STATUS_BUCKETS.map(b => ({ name: b.label, value: counts[b.key], color: b.color }));
  }, [filteredPatients]);

  // Summary cards
  const summary = useMemo(() => {
    const activePatients = patients.filter(p => p.cases.some(c => c.status !== 'resuelto')).length;
    const activeWounds = patients.reduce((acc, p) =>
      acc + p.cases.filter(c => c.status !== 'resuelto').length, 0);
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let closedThisMonth = 0;
    patients.forEach(p => p.cases.forEach(c => {
      const closingEv = c.evolutions.find(e => e.evolutionStatus === 'cicatrizada' || e.healingDate);
      const closedDate = closingEv?.healingDate || closingEv?.date;
      if (c.status === 'resuelto' && closedDate && closedDate.startsWith(thisMonthKey)) {
        closedThisMonth++;
      } else if (c.status === 'resuelto' && !closedDate) {
        // best-effort: use updated/last evolution date if in current month
        const last = [...c.evolutions].sort((a, b) => b.date.localeCompare(a.date))[0];
        if (last?.date.startsWith(thisMonthKey)) closedThisMonth++;
      }
    }));
    return { activePatients, activeWounds, closedThisMonth };
  }, [patients]);

  // Line chart: wound area over time per patient (one line per patient/case)
  const areaSeries = useMemo(() => {
    // Build a sorted union of all dates that have area readings
    const dateSet = new Set<string>();
    const seriesByKey = new Map<string, { key: string; label: string; points: Map<string, number> }>();

    filteredPatients.forEach(p => p.cases.forEach(c => {
      const points = new Map<string, number>();
      c.evolutions.forEach(e => {
        if (fromDate && e.date < fromDate) return;
        if (toDate && e.date > toDate) return;
        const a = evoArea(e);
        if (a !== null) {
          points.set(e.date, a);
          dateSet.add(e.date);
        }
      });
      if (points.size > 0) {
        const key = `${p.id}-${c.id}`;
        seriesByKey.set(key, {
          key,
          label: `${p.firstName} ${p.lastName} — ${c.woundType}`,
          points,
        });
      }
    }));

    const dates = [...dateSet].sort();
    const data = dates.map(d => {
      const row: Record<string, string | number> = { date: d };
      seriesByKey.forEach(s => {
        if (s.points.has(d)) row[s.key] = s.points.get(d)!;
      });
      return row;
    });
    const series = [...seriesByKey.values()];
    return { data, series };
  }, [filteredPatients, fromDate, toDate]);

  // Aggregate top materials per month for richer CSV (used by export)
  const materialsPerMonthRows = useMemo(() => {
    const map = new Map<string, Map<string, number>>(); // month -> material -> count
    allEvolutions.forEach(({ evolution }) => {
      const mk = monthKey(evolution.date);
      if (!map.has(mk)) map.set(mk, new Map());
      extractMaterials(evolution.materials).forEach(m => {
        const inner = map.get(mk)!;
        const key = m.toLowerCase();
        inner.set(key, (inner.get(key) || 0) + 1);
      });
    });
    const rows: { month: string; material: string; count: number }[] = [];
    [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([m, inner]) => {
      [...inner.entries()].sort((a, b) => b[1] - a[1]).forEach(([material, count]) => {
        rows.push({ month: m, material, count });
      });
    });
    return rows;
  }, [allEvolutions]);

  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push('CuraTrack — Reporte de Estadísticas');
    lines.push(`Generado,${new Date().toISOString()}`);
    lines.push(`Paciente,${patientFilter === 'all' ? 'Todos' : patients.find(p => p.id === patientFilter)?.firstName + ' ' + patients.find(p => p.id === patientFilter)?.lastName}`);
    lines.push(`Desde,${fromDate || '—'}`);
    lines.push(`Hasta,${toDate || '—'}`);
    lines.push('');

    lines.push('Resumen');
    lines.push(toCsvRow(['Pacientes activos', summary.activePatients]));
    lines.push(toCsvRow(['Heridas activas', summary.activeWounds]));
    lines.push(toCsvRow(['Heridas cerradas este mes', summary.closedThisMonth]));
    lines.push('');

    lines.push('Heridas por estado');
    lines.push(toCsvRow(['Estado', 'Cantidad']));
    statusData.forEach(s => lines.push(toCsvRow([s.name, s.value])));
    lines.push('');

    lines.push('Top materiales (rango seleccionado)');
    lines.push(toCsvRow(['Material', 'Usos']));
    topMaterials.forEach(m => lines.push(toCsvRow([m.name, m.count])));
    lines.push('');

    lines.push('Materiales por mes');
    lines.push(toCsvRow(['Mes', 'Material', 'Usos']));
    materialsPerMonthRows.forEach(r => lines.push(toCsvRow([monthLabel(r.month), r.material, r.count])));
    lines.push('');

    lines.push('Evolución del área de heridas (cm²)');
    lines.push(toCsvRow(['Fecha', ...areaSeries.series.map(s => s.label)]));
    areaSeries.data.forEach(row => {
      lines.push(toCsvRow([
        String(row.date),
        ...areaSeries.series.map(s => (row[s.key] as number | undefined) ?? ''),
      ]));
    });

    downloadFile(`curatrack-estadisticas-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  };

  const handleExportPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const filterLabel = patientFilter === 'all'
      ? 'Todos los pacientes'
      : (() => {
          const p = patients.find(p => p.id === patientFilter);
          return p ? `${p.firstName} ${p.lastName}` : '—';
        })();

    const html = `
      <!doctype html><html><head><meta charset="utf-8"/>
      <title>CuraTrack — Estadísticas</title>
      <style>
        body{font-family:'Open Sans',Arial,sans-serif;color:#1f2937;padding:32px;max-width:900px;margin:0 auto;}
        h1{font-family:'Montserrat',Arial,sans-serif;color:#00965E;margin:0 0 4px;}
        .meta{color:#6b7280;font-size:12px;margin-bottom:24px;}
        h2{font-family:'Montserrat',Arial,sans-serif;color:#00965E;border-bottom:2px solid #00965E;padding-bottom:4px;margin-top:32px;}
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;}
        th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left;}
        th{background:#f0fdf4;}
        .summary{display:flex;gap:16px;margin-top:8px;}
        .card{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:16px;}
        .card .num{font-size:28px;font-weight:700;color:#00965E;font-family:'Montserrat',Arial,sans-serif;}
        .card .lbl{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;}
        @media print{button{display:none;}}
      </style></head><body>
        <h1>CuraTrack — Estadísticas de consumo</h1>
        <div class="meta">
          Generado: ${new Date().toLocaleString('es-AR')}<br/>
          Paciente: ${filterLabel}<br/>
          Rango: ${fromDate || '—'} a ${toDate || '—'}
        </div>

        <h2>Resumen</h2>
        <div class="summary">
          <div class="card"><div class="num">${summary.activePatients}</div><div class="lbl">Pacientes activos</div></div>
          <div class="card"><div class="num">${summary.activeWounds}</div><div class="lbl">Heridas activas</div></div>
          <div class="card"><div class="num">${summary.closedThisMonth}</div><div class="lbl">Cerradas este mes</div></div>
        </div>

        <h2>Heridas por estado</h2>
        <table><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead><tbody>
          ${statusData.map(s => `<tr><td>${s.name}</td><td>${s.value}</td></tr>`).join('')}
        </tbody></table>

        <h2>Top 10 materiales más utilizados</h2>
        <table><thead><tr><th>Material</th><th>Usos</th></tr></thead><tbody>
          ${topMaterials.length === 0 ? '<tr><td colspan="2">Sin datos en el rango seleccionado.</td></tr>'
            : topMaterials.map(m => `<tr><td>${m.name}</td><td>${m.count}</td></tr>`).join('')}
        </tbody></table>

        <h2>Evolución del área de heridas (cm²)</h2>
        ${areaSeries.series.length === 0 ? '<p>Sin mediciones de área en el rango.</p>' : `
          <table><thead><tr><th>Fecha</th>${areaSeries.series.map(s => `<th>${s.label}</th>`).join('')}</tr></thead>
          <tbody>${areaSeries.data.map(r => `<tr><td>${r.date}</td>${areaSeries.series.map(s => `<td>${(r[s.key] as number | undefined) ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
        `}

        <script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Estadísticas</h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Análisis de consumo, estado de heridas y evolución clínica.
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

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-body text-xs uppercase tracking-wide text-muted-foreground">Paciente</Label>
                <Select value={patientFilter} onValueChange={setPatientFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los pacientes</SelectItem>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs uppercase tracking-wide text-muted-foreground">Desde</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs uppercase tracking-wide text-muted-foreground">Hasta</Label>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard icon={<Users className="h-5 w-5" />} label="Pacientes activos" value={summary.activePatients} />
          <SummaryCard icon={<Activity className="h-5 w-5" />} label="Heridas activas" value={summary.activeWounds} />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Cerradas este mes" value={summary.closedThisMonth} />
        </div>

        {/* Bar + Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-heading text-base">Top 10 materiales más utilizados</CardTitle>
              <p className="font-body text-xs text-muted-foreground">
                Conteo de menciones en evoluciones del rango seleccionado.
              </p>
            </CardHeader>
            <CardContent>
              {topMaterials.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
                  Sin datos para los filtros seleccionados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topMaterials} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="name" type="category" width={140} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Estado actual de heridas</CardTitle>
              <p className="font-body text-xs text-muted-foreground">
                Distribución según última evolución registrada.
              </p>
            </CardHeader>
            <CardContent>
              {statusData.every(d => d.value === 0) ? (
                <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
                  Sin heridas registradas.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} label={(e) => `${e.value}`}>
                      {statusData.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Evolución del área de heridas (cm²)</CardTitle>
            <p className="font-body text-xs text-muted-foreground">
              Largo × ancho registrado por evolución, agrupado por paciente y caso.
            </p>
          </CardHeader>
          <CardContent>
            {areaSeries.series.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
                Aún no hay mediciones de tamaño (largo × ancho) registradas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={areaSeries.data} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit=" cm²" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {areaSeries.series.map((s, i) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={`hsl(${(i * 67) % 360} 70% 45%)`}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="font-heading text-3xl font-bold text-foreground mt-1">{value}</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
