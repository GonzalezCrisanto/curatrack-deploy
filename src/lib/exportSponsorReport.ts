import type { Sponsor } from '@/context/SponsorContext';

export type SponsorReportData = {
  periodLabel: string;
  generatedAt: string;
  kpis: { label: string; value: string | number; hint?: string }[];
  funnel: { label: string; value: number }[];
  topProducts: { name: string; recos: number; requests: number }[];
  recentOrders: {
    order_number: string;
    status: string;
    created_at: string;
    institution?: string | null;
    general_wound_type?: string | null;
    items: number;
    total: number | null;
    currency: string;
  }[];
  opportunities: { title: string; count: number; action: string }[];
};

function fmtPrice(v: number | null, c = 'ARS') {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_LABELS: Record<string, string> = {
  borrador: 'Pendiente', enviado: 'Enviada', aprobado: 'Confirmada',
  rechazado: 'Requiere revisión', cancelado: 'Cancelada',
};

export function exportSponsorReportPdf(sponsor: Sponsor, data: SponsorReportData) {
  const win = window.open('', '_blank');
  if (!win) return;

  const primary = sponsor.primary_color;
  const secondary = sponsor.secondary_color;

  const funnelMax = Math.max(...data.funnel.map(f => f.value), 1);

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Reporte ejecutivo — ${sponsor.sponsor_name}</title>
<style>
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 36px; font-size: 12.5px; line-height: 1.5; }
  .header { display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 14px; margin-bottom: 22px; border-bottom: 3px solid ${primary}; position: relative; }
  .header::after { content: ''; position: absolute; left: 0; right: 0; bottom: -3px; height: 3px; background: linear-gradient(90deg, ${primary}, ${secondary}); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { height: 38px; max-width: 160px; object-fit: contain; }
  .brand .name { font-weight: 700; font-size: 18px; color: ${primary}; }
  .brand .app { font-size: 11px; color: #666; }
  .meta { text-align: right; font-size: 11px; color: #666; }
  h1 { font-size: 20px; color: ${primary}; margin: 14px 0 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 18px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; margin: 22px 0 8px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .kpi { border: 1px solid #e5eaf2; border-left: 3px solid ${primary}; border-radius: 6px; padding: 10px 12px; }
  .kpi .l { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; }
  .kpi .v { font-size: 18px; font-weight: 700; color: #111; margin-top: 4px; }
  .kpi .h { font-size: 10px; color: #888; margin-top: 2px; }
  .funnel .row { margin-bottom: 6px; }
  .funnel .lbl { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
  .funnel .bar { height: 18px; background: #f0f3f7; border-radius: 3px; overflow: hidden; }
  .funnel .fill { height: 100%; background: linear-gradient(90deg, ${primary}, ${secondary}); }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 7px 8px; font-size: 11.5px; border-bottom: 1px solid #eef1f5; }
  th { color: #666; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
  .opp { border: 1px solid #f0e0c0; background: #fffaf0; padding: 9px 12px; border-radius: 6px; margin-bottom: 6px; display: flex; gap: 10px; align-items: center; }
  .opp .badge { background: ${primary}; color: white; border-radius: 99px; min-width: 26px; text-align: center; font-size: 11px; padding: 2px 8px; font-weight: 700; }
  .opp .body small { color: #888; display: block; }
  .privacy { margin-top: 26px; padding: 10px 12px; border-radius: 6px; background: #f5f8fc; border: 1px solid #e1e8f1; font-size: 10.5px; color: #555; }
  .footer { margin-top: 22px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eef1f5; padding-top: 10px; display:flex; align-items:center; justify-content:center; gap:10px; }
  .footer-logo { height: 18px; max-width: 80px; object-fit: contain; opacity: 0.8; }
  .pill { display: inline-block; font-size: 10px; padding: 1px 8px; border-radius: 99px; background: #eef3fb; color: ${primary}; font-weight: 600; }
</style></head>
<body>
  <div class="header">
    <div class="brand">
      ${sponsor.logo_url ? `<img src="${sponsor.logo_url}" alt="${sponsor.sponsor_name}"/>` : ''}
      <div>
        <div class="name">${sponsor.sponsor_name}</div>
        <div class="app">${sponsor.app_name}</div>
      </div>
    </div>
    <div class="meta">
      <div><strong>Reporte ejecutivo del programa sponsor</strong></div>
      <div>Período: ${data.periodLabel}</div>
      <div>Generado: ${data.generatedAt}</div>
    </div>
  </div>

  <h1>Resumen ejecutivo</h1>
  <p class="subtitle">Métricas agregadas y anonimizadas del programa <span class="pill">${sponsor.sponsor_name}</span> sobre ${sponsor.app_name}.</p>

  <div class="kpi-grid">
    ${data.kpis.map(k => `
      <div class="kpi">
        <div class="l">${k.label}</div>
        <div class="v">${k.value}</div>
        ${k.hint ? `<div class="h">${k.hint}</div>` : ''}
      </div>
    `).join('')}
  </div>

  <h2>Embudo comercial</h2>
  <div class="funnel">
    ${data.funnel.map((f, i) => {
      const pct = (f.value / funnelMax) * 100;
      const conv = i > 0 ? Math.round((f.value / Math.max(data.funnel[i-1].value, 1)) * 100) : 100;
      return `
        <div class="row">
          <div class="lbl"><span>${f.label}</span><span>${f.value.toLocaleString('es-AR')} ${i > 0 ? `· ${conv}%` : ''}</span></div>
          <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('')}
  </div>

  <h2>Productos más recomendados</h2>
  <table>
    <thead><tr><th>#</th><th>Producto</th><th>Recomendaciones</th><th>Solicitudes</th></tr></thead>
    <tbody>
      ${data.topProducts.map((p, i) => `
        <tr><td>${i+1}</td><td>${p.name}</td><td>${p.recos}</td><td>${p.requests}</td></tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Solicitudes recientes (anonimizadas)</h2>
  ${data.recentOrders.length === 0 ? `<p style="color:#999;font-style:italic;font-size:11px;">Sin solicitudes en el período.</p>` : `
  <table>
    <thead><tr><th>Nº</th><th>Fecha</th><th>Institución</th><th>Tipo de herida</th><th>Productos</th><th>Estado</th><th>Demanda</th></tr></thead>
    <tbody>
      ${data.recentOrders.map(o => `
        <tr>
          <td>${o.order_number}</td>
          <td>${fmtDate(o.created_at)}</td>
          <td>${o.institution ?? 'Caso anonimizado'}</td>
          <td>${o.general_wound_type ?? '—'}</td>
          <td>${o.items}</td>
          <td>${STATUS_LABELS[o.status] ?? o.status}</td>
          <td>${fmtPrice(o.total, o.currency)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>`}

  <h2>Oportunidades detectadas</h2>
  ${data.opportunities.map(o => `
    <div class="opp">
      <span class="badge">${o.count}</span>
      <div class="body"><strong>${o.title}</strong><small>${o.action}</small></div>
    </div>
  `).join('')}

  <div class="privacy">
    <strong>Nota de privacidad.</strong> Este reporte se genera con datos agregados y anonimizados.
    No incluye nombres, DNI, contacto, dirección, fotos ni historia clínica de pacientes.
    La información expuesta se limita a tipo de herida, institución, profesional, categoría de producto y métricas de adopción del programa sponsor.
  </div>

  <div class="footer">
    ${sponsor.logo_url ? `<img class="footer-logo" src="${sponsor.logo_url}" alt="${sponsor.sponsor_name}"/>` : ''}
    <span>${sponsor.legal_footer ?? `${sponsor.app_name} — Documento generado para el programa ${sponsor.sponsor_name}`}</span>
  </div>
  <script>window.onload = () => window.print();</script>
</body></html>`;

  win.document.write(html);
  win.document.close();
}
