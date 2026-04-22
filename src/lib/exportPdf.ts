import { Patient, getStatusLabel } from '@/data/demoData';

export function exportPatientPdf(patient: Patient) {
  const win = window.open('', '_blank');
  if (!win) return;

  const statusLabels: Record<string, string> = {
    activo: 'Activo',
    en_mejoria: 'En mejoría',
    critico: 'Crítico',
    resuelto: 'Resuelto',
  };

  const casesHtml = patient.cases.map(c => `
    <div class="case">
      <h2>${c.woundType} — ${c.anatomicalLocation}</h2>
      <table class="info-table">
        <tr><td class="label">Estado</td><td><span class="badge badge-${c.status}">${statusLabels[c.status] || c.status}</span></td></tr>
        <tr><td class="label">Fecha de inicio</td><td>${c.startDate}</td></tr>
        <tr><td class="label">Tamaño</td><td>${c.size}</td></tr>
        <tr><td class="label">Profundidad</td><td>${c.depth}</td></tr>
        <tr><td class="label">Exudado</td><td>${c.exudate}</td></tr>
        <tr><td class="label">Infección</td><td>${c.infection}</td></tr>
        <tr><td class="label">Dolor</td><td>${c.pain}</td></tr>
        <tr><td class="label">Tratamiento</td><td>${c.treatment}</td></tr>
      </table>

      ${c.evolutions.length > 0 ? `
        <h3>Evoluciones Clínicas</h3>
        ${c.evolutions.map((ev, i) => `
          <div class="evolution">
            <div class="evo-header">
              <strong>Evolución ${i + 1}</strong> — ${ev.date} ${ev.time} hs · ${ev.professional}
            </div>
            <table class="info-table">
              <tr><td class="label">Descripción clínica</td><td>${ev.description}</td></tr>
              <tr><td class="label">Procedimiento</td><td>${ev.procedure}</td></tr>
              ${ev.materials ? `<tr><td class="label">Material de curación</td><td>${ev.materials}</td></tr>` : ''}
              ${ev.healingFrequency ? `<tr><td class="label">Frecuencia de curación</td><td>${ev.healingFrequency}</td></tr>` : ''}
              ${ev.observations ? `<tr><td class="label">Observaciones</td><td>${ev.observations}</td></tr>` : ''}
              <tr><td class="label">Próximo control</td><td>${ev.nextControl}</td></tr>
            </table>
            ${ev.photos.length > 0 ? `
              <div class="photos">
                ${ev.photos.map(ph => `<img src="${ph.url}" alt="${ph.caption}" />`).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      ` : '<p class="empty">Sin evoluciones registradas</p>'}

      ${c.photos.length > 0 ? `
        <h3>Galería de Fotos del Caso</h3>
        <div class="photos">
          ${c.photos.map(ph => `<img src="${ph.url}" alt="${ph.caption}" />`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Historia Clínica — ${patient.lastName}, ${patient.firstName}</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 40px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: end; border-bottom: 3px solid #1763D2; padding-bottom: 16px; margin-bottom: 24px; position: relative; }
    .header::after { content: ''; position: absolute; left: 0; right: 0; bottom: -3px; height: 3px; background: linear-gradient(90deg, #1763D2 0%, #22C55E 100%); }
    .header h1 { font-size: 22px; color: #1763D2; }
    .header .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
    .header .brand { font-size: 20px; font-weight: 700; background: linear-gradient(90deg, #1763D2, #22C55E); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: -0.3px; }
    .patient-info { background: #f1f6fd; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #dbe7f7; }
    .patient-info h2 { font-size: 16px; color: #1763D2; margin-bottom: 12px; }
    .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .patient-grid .item { display: flex; gap: 8px; }
    .patient-grid .label { font-weight: 600; color: #555; min-width: 120px; }
    .case { border: 1px solid #dbe7f7; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
    .case h2 { font-size: 16px; color: #1763D2; margin-bottom: 12px; border-bottom: 1px solid #dbe7f7; padding-bottom: 8px; }
    .case h3 { font-size: 14px; color: #1763D2; margin: 16px 0 8px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .info-table td { padding: 4px 8px; border-bottom: 1px solid #eef3fb; font-size: 12px; }
    .info-table .label { font-weight: 600; color: #555; width: 160px; }
    .badge { padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-activo { background: #dbeafe; color: #1e40af; }
    .badge-en_mejoria { background: #dcfce7; color: #166534; }
    .badge-critico { background: #fee2e2; color: #991b1b; }
    .badge-resuelto { background: #f3f4f6; color: #6b7280; }
    .evolution { background: #f6faff; border-left: 3px solid #1763D2; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 6px 6px 0; }
    .evo-header { font-size: 13px; margin-bottom: 8px; color: #333; }
    .photos { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .photos img { width: 120px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #dbe7f7; }
    .empty { color: #999; font-style: italic; font-size: 12px; }
    .footer { margin-top: 32px; border-top: 1px solid #dbe7f7; padding-top: 12px; font-size: 11px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Historia Clínica</h1>
      <div class="subtitle">Informe generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
    <div class="brand">CuraTrack</div>
  </div>

  <div class="patient-info">
    <h2>${patient.lastName}, ${patient.firstName}</h2>
    <div class="patient-grid">
      <div class="item"><span class="label">DNI:</span><span>${patient.dni}</span></div>
      <div class="item"><span class="label">Edad:</span><span>${patient.age} años · ${patient.gender}</span></div>
      <div class="item"><span class="label">Teléfono:</span><span>${patient.phone}</span></div>
      <div class="item"><span class="label">Email:</span><span>${patient.email}</span></div>
      <div class="item"><span class="label">Dirección:</span><span>${patient.address}</span></div>
      <div class="item"><span class="label">Ingreso:</span><span>${patient.admissionDate}</span></div>
      <div class="item"><span class="label">Diagnóstico:</span><span>${patient.diagnosis}</span></div>
      <div class="item"><span class="label">Profesional:</span><span>${patient.assignedProfessional}</span></div>
      ${patient.observations ? `<div class="item" style="grid-column:1/-1"><span class="label">Observaciones:</span><span>${patient.observations}</span></div>` : ''}
      <div class="item"><span class="label">Intervalo control:</span><span>Cada ${patient.controlIntervalDays} días</span></div>
    </div>
  </div>

  <h2 style="font-size:18px;color:#1763D2;margin-bottom:16px;">Casos Clínicos (${patient.cases.length})</h2>
  ${casesHtml}

  <div class="footer">
    CuraTrack · Sistema de Gestión de Heridas Complejas · Documento confidencial — Uso exclusivo del equipo de salud
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
