/* ============================================================
   BIDASOA – reportes.js
   Generación de Reportes en PDF, Excel y Word
   ============================================================ */

'use strict';

// ── Setup Reportes ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.btn-report').forEach(btn => {
    btn.addEventListener('click', function() {
      const tipo = this.dataset.tipo;
      const formato = this.dataset.formato;
      generarReporte(tipo, formato);
    });
  });
});

function generarReporte(tipo, formato) {
  const user = APP.currentUser;
  const ahora = new Date();
  let datos = [...APP.trabajos];

  // Filtrar por tipo
  if (tipo === 'diario') {
    const hoy = ahora.toISOString().slice(0, 10);
    datos = datos.filter(t => t.fecha_ingreso === hoy || t.updated_at >= new Date(hoy).getTime());
  } else if (tipo === 'semanal') {
    const inicio = new Date(ahora); inicio.setDate(ahora.getDate() - 7);
    datos = datos.filter(t => t.created_at >= inicio.getTime());
  } else if (tipo === 'mensual') {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
    datos = datos.filter(t => t.created_at >= inicio);
  } else if (tipo === 'mi-torno' && user?.torno_asignado) {
    datos = datos.filter(t => t.torno_asignado === user.torno_asignado);
  }
  // 'general' uses all data

  if (formato === 'excel') generarExcel(tipo, datos);
  else if (formato === 'pdf') generarPDF(tipo, datos);
  else if (formato === 'word') generarWord(tipo, datos);
}

// ── EXCEL ─────────────────────────────────────────────────────
function generarExcel(tipo, datos) {
  showLoading();
  try {
    const tituloMap = { diario: 'Reporte Diario', semanal: 'Reporte Semanal', mensual: 'Reporte Mensual', general: 'Informe General', 'mi-torno': 'Informe de Mi Torno' };
    const titulo = tituloMap[tipo] || 'Reporte';
    const fecha = new Date().toLocaleDateString('es-MX');

    // Hoja 1: Resumen KPI
    const kpiData = calcularKPIs(datos);
    const kpiSheet = [
      ['BIDASOA – Manufacturera de Papel'],
      ['Taller: MAQUINADOS'],
      [titulo],
      [`Generado el: ${fecha}`],
      [],
      ['INDICADORES CLAVE DE DESEMPEÑO (KPIs)', ''],
      ['Total de Trabajos', kpiData.total],
      ['Trabajos Terminados', kpiData.terminados],
      ['Trabajos En Proceso', kpiData.proceso],
      ['Trabajos Pendientes', kpiData.pendientes],
      ['Trabajos Urgentes', kpiData.urgentes],
      ['Tasa de Terminación', kpiData.tasaTerminacion + '%'],
      ['Tiempo Promedio Estimado', kpiData.tiempoPromEst + ' hrs'],
      [],
      ['DESGLOSE POR TORNO', ''],
      ['Torno 1 – Trabajos activos', datos.filter(t => t.torno_asignado === 'Torno 1' && t.estado !== 'Terminado').length],
      ['Torno 2 – Trabajos activos', datos.filter(t => t.torno_asignado === 'Torno 2' && t.estado !== 'Terminado').length],
      ['Torno 3 – Trabajos activos', datos.filter(t => t.torno_asignado === 'Torno 3' && t.estado !== 'Terminado').length],
      ['Torno 4 – Trabajos activos', datos.filter(t => t.torno_asignado === 'Torno 4' && t.estado !== 'Terminado').length],
    ];

    // Hoja 2: Detalle de Trabajos
    const headers = ['N° Maquinado', 'Solicitante', 'Área', 'Equipo/Máquina', 'Torno', 'Material',
                     'Urgencia', 'F. Ingreso', 'F. Entrega', 'F. Terminado', 'Prioridad',
                     'Estado', 'Operador', 'T. Estimado (hrs)', 'T. Real (hrs)', 'Observaciones'];

    const rows = datos.map(t => [
      t.numero_maquinado, t.solicitante, t.area_solicitante, t.equipo_maquina,
      t.torno_asignado, t.material, t.urgencia, t.fecha_ingreso, t.fecha_entrega,
      t.fecha_terminado || '', t.prioridad, t.estado, t.operador_asignado,
      t.tiempo_estimado || 0, t.tiempo_real || 0, t.observaciones || ''
    ]);

    const wsKPI = XLSX.utils.aoa_to_sheet(kpiSheet);
    const wsDetalle = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Estilo de anchos de columna
    wsDetalle['!cols'] = headers.map((_, i) => ({ wch: [20,18,20,22,10,16,20,12,12,12,10,12,18,12,10,30][i] || 16 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsKPI, 'Resumen Ejecutivo');
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle de Trabajos');

    const fname = `Bidasoa_${titulo.replace(/ /g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    showToast(`Excel "${fname}" descargado.`, 'success');
  } catch(e) {
    showToast('Error generando Excel.', 'error');
    console.error(e);
  }
  hideLoading();
}

// ── PDF ───────────────────────────────────────────────────────
function generarPDF(tipo, datos) {
  showLoading();
  try {
    const tituloMap = { diario: 'Reporte Diario', semanal: 'Reporte Semanal', mensual: 'Reporte Mensual', general: 'Informe General del Proyecto', 'mi-torno': 'Informe de Mi Torno' };
    const titulo = tituloMap[tipo] || 'Reporte';
    const kpis = calcularKPIs(datos);
    const fecha = new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    const htmlContent = buildPDFHTML(titulo, fecha, kpis, datos);

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      hideLoading();
    }, 800);
  } catch(e) {
    hideLoading();
    showToast('Error generando PDF.', 'error');
    console.error(e);
  }
}

function buildPDFHTML(titulo, fecha, kpis, datos) {
  const rows = datos.map(t => `
    <tr class="${t.urgencia === 'Urgente' ? 'row-urgente' : t.urgencia === 'Medianamente Urgente' ? 'row-media' : ''}">
      <td>${t.numero_maquinado}</td>
      <td>${t.area_solicitante}</td>
      <td>${t.torno_asignado}</td>
      <td>${t.material}</td>
      <td>${t.urgencia}</td>
      <td>${fmtDate(t.fecha_entrega)}</td>
      <td><strong>${t.estado}</strong></td>
      <td>${t.observaciones || '–'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Bidasoa – ${titulo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1f2937; background:#fff; }
  .header { background: linear-gradient(135deg, #091e4f, #0d2a6b); color:#fff; padding:24px 32px; display:flex; align-items:center; justify-content:space-between; }
  .header-left h1 { font-size:22px; font-weight:800; letter-spacing:1px; }
  .header-left p { font-size:11px; opacity:.75; margin-top:4px; }
  .header-right { text-align:right; font-size:11px; opacity:.75; }
  .report-title { padding:20px 32px 10px; border-bottom:2px solid #0d2a6b; }
  .report-title h2 { font-size:17px; font-weight:700; color:#0d2a6b; }
  .report-title p { font-size:11px; color:#6b7280; margin-top:3px; }
  .kpi-section { display:flex; gap:12px; padding:16px 32px; background:#f4f6f9; flex-wrap:wrap; }
  .kpi-box { flex:1; min-width:100px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:12px 14px; text-align:center; }
  .kpi-box .val { font-size:24px; font-weight:800; color:#0d2a6b; display:block; }
  .kpi-box .lbl { font-size:9px; color:#6b7280; text-transform:uppercase; letter-spacing:.4px; margin-top:3px; display:block; }
  .kpi-box.urgente .val { color:#dc2626; }
  .kpi-box.terminado .val { color:#16a34a; }
  table { width:calc(100% - 64px); margin:16px 32px; border-collapse:collapse; }
  th { background:#0d2a6b; color:#fff; padding:8px 10px; font-size:10px; text-align:left; text-transform:uppercase; letter-spacing:.4px; }
  td { padding:7px 10px; border-bottom:1px solid #f0f2f5; }
  tr:hover td { background:#f9fafb; }
  .row-urgente td { border-left:3px solid #dc2626; }
  .row-media td { border-left:3px solid #d97706; }
  .section-title { padding:12px 32px 6px; font-size:13px; font-weight:700; color:#0d2a6b; border-top:1px solid #e5e7eb; margin-top:8px; }
  .footer { margin-top:20px; padding:12px 32px; border-top:2px solid #0d2a6b; display:flex; justify-content:space-between; font-size:9px; color:#9ca3af; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .header { background: #0d2a6b !important; }
    table { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>BIDASOA</h1>
    <p>Manufacturera de Papel · Taller MAQUINADOS</p>
  </div>
  <div class="header-right">
    <div>Sistema de Control de Maquinados</div>
    <div>${fecha}</div>
  </div>
</div>

<div class="report-title">
  <h2>${titulo}</h2>
  <p>Informe ejecutivo generado automáticamente · Total de registros: ${datos.length}</p>
</div>

<div class="kpi-section">
  <div class="kpi-box"><span class="val">${kpis.total}</span><span class="lbl">Total Trabajos</span></div>
  <div class="kpi-box terminado"><span class="val">${kpis.terminados}</span><span class="lbl">Terminados</span></div>
  <div class="kpi-box"><span class="val">${kpis.proceso}</span><span class="lbl">En Proceso</span></div>
  <div class="kpi-box"><span class="val">${kpis.pendientes}</span><span class="lbl">Pendientes</span></div>
  <div class="kpi-box urgente"><span class="val">${kpis.urgentes}</span><span class="lbl">Urgentes</span></div>
  <div class="kpi-box"><span class="val">${kpis.tasaTerminacion}%</span><span class="lbl">Tasa Terminación</span></div>
  <div class="kpi-box"><span class="val">${kpis.tiempoPromEst}h</span><span class="lbl">T. Prom. Est.</span></div>
</div>

<div class="section-title">DETALLE DE TRABAJOS</div>
<table>
  <thead>
    <tr>
      <th>N° Maquinado</th><th>Área</th><th>Torno</th><th>Material</th>
      <th>Urgencia</th><th>F. Entrega</th><th>Estado</th><th>Observaciones</th>
    </tr>
  </thead>
  <tbody>
    ${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#9ca3af">Sin registros en este período</td></tr>'}
  </tbody>
</table>

<div class="section-title">DISTRIBUCIÓN POR TORNO</div>
<table>
  <thead><tr><th>Torno</th><th>Total</th><th>Activos</th><th>Terminados</th><th>Urgentes</th></tr></thead>
  <tbody>
    ${['Torno 1','Torno 2','Torno 3','Torno 4'].map(torno => {
      const td = datos.filter(t => t.torno_asignado === torno);
      return `<tr>
        <td><strong>${torno}</strong></td>
        <td>${td.length}</td>
        <td>${td.filter(t => t.estado !== 'Terminado').length}</td>
        <td>${td.filter(t => t.estado === 'Terminado').length}</td>
        <td>${td.filter(t => t.urgencia === 'Urgente').length}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>

<div class="footer">
  <span>BIDASOA – Manufacturera de Papel · Sistema de Control de Maquinados</span>
  <span>Generado: ${new Date().toLocaleString('es-MX')} · Documento Confidencial</span>
</div>
</body>
</html>`;
}

// ── WORD (HTML descargable) ───────────────────────────────────
function generarWord(tipo, datos) {
  showLoading();
  try {
    const tituloMap = { diario: 'Reporte Diario', semanal: 'Reporte Semanal', mensual: 'Reporte Mensual', general: 'Informe General del Proyecto', 'mi-torno': 'Informe de Mi Torno' };
    const titulo = tituloMap[tipo] || 'Reporte';
    const kpis = calcularKPIs(datos);
    const fecha = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' });

    const content = buildWordContent(titulo, fecha, kpis, datos);
    const blob = new Blob(['\ufeff' + content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bidasoa_${titulo.replace(/ /g,'_')}_${new Date().toISOString().slice(0,10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Documento Word descargado.', 'success');
  } catch(e) {
    showToast('Error generando Word.', 'error');
    console.error(e);
  }
  hideLoading();
}

function buildWordContent(titulo, fecha, kpis, datos) {
  const rows = datos.map(t => `
    <tr>
      <td>${t.numero_maquinado}</td>
      <td>${t.solicitante}</td>
      <td>${t.area_solicitante}</td>
      <td>${t.torno_asignado}</td>
      <td>${t.material}</td>
      <td>${t.urgencia}</td>
      <td>${fmtDate(t.fecha_ingreso)}</td>
      <td>${fmtDate(t.fecha_entrega)}</td>
      <td>${t.estado}</td>
      <td>${t.observaciones || ''}</td>
    </tr>`).join('');

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset="utf-8"><title>Bidasoa – ${titulo}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size:11pt; color:#1f2937; margin:2cm; }
  h1 { color:#0d2a6b; font-size:20pt; border-bottom:3px solid #0d2a6b; padding-bottom:8pt; }
  h2 { color:#0d2a6b; font-size:14pt; margin-top:20pt; }
  h3 { color:#374151; font-size:12pt; margin-top:14pt; }
  .header-info { background:#f4f6f9; padding:12pt; border-radius:4pt; margin-bottom:16pt; }
  .kpi-table { width:100%; border-collapse:collapse; margin:12pt 0; }
  .kpi-table th { background:#0d2a6b; color:#fff; padding:6pt 10pt; font-size:10pt; }
  .kpi-table td { padding:5pt 10pt; border:1pt solid #e5e7eb; font-size:10pt; }
  .kpi-table tr:nth-child(even) td { background:#f9fafb; }
  table { width:100%; border-collapse:collapse; margin:12pt 0; font-size:9pt; }
  th { background:#0d2a6b; color:#fff; padding:6pt 8pt; }
  td { padding:4pt 8pt; border:0.5pt solid #e5e7eb; }
  tr:nth-child(even) td { background:#f4f6f9; }
  .footer { margin-top:30pt; border-top:1pt solid #0d2a6b; padding-top:8pt; font-size:9pt; color:#9ca3af; }
  .badge-urgente { color:#dc2626; font-weight:bold; }
  .badge-media { color:#d97706; font-weight:bold; }
  .badge-baja { color:#16a34a; }
</style>
</head>
<body>
<h1>BIDASOA – Manufacturera de Papel</h1>
<div class="header-info">
  <strong>Taller:</strong> MAQUINADOS &nbsp;|&nbsp; <strong>Informe:</strong> ${titulo}<br>
  <strong>Fecha de Generación:</strong> ${fecha}<br>
  <strong>Total de Registros:</strong> ${datos.length}
</div>

<h2>1. Indicadores Clave de Desempeño (KPIs)</h2>
<table class="kpi-table">
  <tr><th>Indicador</th><th>Valor</th></tr>
  <tr><td>Total de Trabajos</td><td>${kpis.total}</td></tr>
  <tr><td>Trabajos Terminados</td><td>${kpis.terminados}</td></tr>
  <tr><td>Trabajos En Proceso</td><td>${kpis.proceso}</td></tr>
  <tr><td>Trabajos Pendientes</td><td>${kpis.pendientes}</td></tr>
  <tr><td>Trabajos Urgentes Activos</td><td>${kpis.urgentes}</td></tr>
  <tr><td>Tasa de Terminación</td><td>${kpis.tasaTerminacion}%</td></tr>
  <tr><td>Tiempo Promedio Estimado</td><td>${kpis.tiempoPromEst} horas</td></tr>
</table>

<h2>2. Distribución por Torno</h2>
<table>
  <tr><th>Torno</th><th>Total</th><th>Activos</th><th>Terminados</th><th>Urgentes</th></tr>
  ${['Torno 1','Torno 2','Torno 3','Torno 4'].map(torno => {
    const td = datos.filter(t => t.torno_asignado === torno);
    return `<tr>
      <td><strong>${torno}</strong></td>
      <td>${td.length}</td>
      <td>${td.filter(t => t.estado !== 'Terminado').length}</td>
      <td>${td.filter(t => t.estado === 'Terminado').length}</td>
      <td>${td.filter(t => t.urgencia === 'Urgente').length}</td>
    </tr>`;
  }).join('')}
</table>

<h2>3. Detalle de Trabajos</h2>
<table>
  <thead>
    <tr>
      <th>N° Maquinado</th><th>Solicitante</th><th>Área</th><th>Torno</th>
      <th>Material</th><th>Urgencia</th><th>F. Ingreso</th><th>F. Entrega</th>
      <th>Estado</th><th>Observaciones</th>
    </tr>
  </thead>
  <tbody>
    ${rows || '<tr><td colspan="10">Sin registros en este período</td></tr>'}
  </tbody>
</table>

<div class="footer">
  BIDASOA – Manufacturera de Papel · Taller MAQUINADOS · Sistema de Control de Maquinados<br>
  Documento generado el ${new Date().toLocaleString('es-MX')} · Información Confidencial
</div>
</body></html>`;
}

// ── KPI Calculator ────────────────────────────────────────────
function calcularKPIs(datos) {
  const total = datos.length;
  const terminados = datos.filter(t => t.estado === 'Terminado').length;
  const proceso = datos.filter(t => t.estado === 'En Proceso').length;
  const pendientes = datos.filter(t => t.estado === 'Pendiente').length;
  const urgentes = datos.filter(t => t.urgencia === 'Urgente' && t.estado !== 'Terminado').length;
  const tasaTerminacion = total > 0 ? Math.round((terminados / total) * 100) : 0;
  const tiemposEst = datos.filter(t => t.tiempo_estimado > 0).map(t => t.tiempo_estimado);
  const tiempoPromEst = tiemposEst.length > 0 ? (tiemposEst.reduce((a, b) => a + b, 0) / tiemposEst.length).toFixed(1) : 0;
  return { total, terminados, proceso, pendientes, urgentes, tasaTerminacion, tiempoPromEst };
}
