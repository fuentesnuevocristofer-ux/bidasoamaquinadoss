/* ============================================================
   BIDASOA – operador.js
   Panel del Operador / Realizador
   ============================================================ */

'use strict';

// ── Render Mi Torno ──────────────────────────────────────────
function renderMiTorno() {
  const user = APP.currentUser;
  if (!user || user.rol !== 'operador') return;

  const torno = user.torno_asignado;
  const perms = safeParsePerms(user.permisos);

  document.getElementById('operador-torno-desc').textContent =
    `${torno} · Operador: ${user.nombre} · Trabajos ordenados por prioridad`;

  let trabajos = APP.trabajos
    .filter(t => t.torno_asignado === torno && t.estado !== 'Cancelado')
    .sort((a, b) => {
      if (a.estado === 'Terminado' && b.estado !== 'Terminado') return 1;
      if (a.estado !== 'Terminado' && b.estado === 'Terminado') return -1;
      return (a.prioridad || 99) - (b.prioridad || 99);
    });

  const container = document.getElementById('op-trabajos-list');

  if (trabajos.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa fa-check-circle" style="color:#16a34a"></i><p>No tienes trabajos asignados actualmente. ¡Todo en orden!</p></div>`;
    return;
  }

  container.innerHTML = trabajos.map((t, idx) => {
    const urgClass = t.urgencia === 'Urgente' ? 'urgente' : t.urgencia === 'Medianamente Urgente' ? 'media' : 'baja';
    const isTerminado = t.estado === 'Terminado';
    const rankNum = isTerminado ? '✓' : (idx + 1);

    return `
    <div class="op-trabajo-card ${urgClass} ${isTerminado ? 'terminado' : ''}" id="op-card-${t.id}">
      <div class="op-card-header">
        <div class="op-card-header-left">
          <div class="op-prioridad-badge" style="${isTerminado ? 'background:#16a34a' : ''}">${rankNum}</div>
          <div>
            <div class="op-card-id">${t.numero_maquinado}</div>
            <div class="op-card-title">${t.area_solicitante} – ${t.equipo_maquina}</div>
          </div>
        </div>
        <div class="op-card-actions">
          <span class="${getBadgeUrgencia(t.urgencia)}">${t.urgencia}</span>
          <span class="${getBadgeEstado(t.estado)}">${t.estado}</span>
          ${perms.ver_planos && t.planos_archivos && t.planos_archivos.length > 0 ?
            `<button class="btn-icon btn-icon-view" onclick="verDetalle('${t.id}')" title="Ver planos"><i class="fa fa-paperclip"></i></button>` : ''}
          <button class="btn-icon btn-icon-view" onclick="verDetalle('${t.id}')" title="Ver detalle"><i class="fa fa-eye"></i></button>
        </div>
      </div>
      <div class="op-card-body">
        <div class="op-card-grid">
          <div class="op-info-item">
            <label>Material</label>
            <span>${t.material || '–'}</span>
          </div>
          <div class="op-info-item">
            <label>F. Entrega</label>
            <span style="${isDueAlert(t.fecha_entrega, t.estado)}">${fmtDate(t.fecha_entrega)}</span>
          </div>
          <div class="op-info-item">
            <label>T. Estimado</label>
            <span>${t.tiempo_estimado ? t.tiempo_estimado + ' hrs' : '–'}</span>
          </div>
        </div>
        ${t.descripcion ? `
        <div class="op-card-desc">
          <label>Descripción del Trabajo</label>
          ${t.descripcion}
        </div>` : ''}
        ${t.observaciones ? `
        <div class="op-card-desc" style="margin-top:8px;background:#fef3c7;border-color:rgba(217,119,6,.2)">
          <label>Observaciones</label>
          ${t.observaciones}
        </div>` : ''}
        ${!isTerminado ? `
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
          ${perms.agregar_obs || perms.agregar_evidencia ? `
          <button class="btn-primary" onclick="abrirModalEvidencia('${t.id}')">
            <i class="fa fa-camera"></i> Evidencia / Observaciones
          </button>` : ''}
          <button class="btn-success" onclick="confirmarTerminar('${t.id}')">
            <i class="fa fa-check-circle"></i> Dar por Terminado
          </button>
        </div>` : `
        <div style="margin-top:12px;display:flex;align-items:center;gap:8px;color:#16a34a;font-weight:600;font-size:13px">
          <i class="fa fa-check-circle"></i> Trabajo terminado el ${fmtDate(t.fecha_terminado)}
        </div>`}
      </div>
    </div>`;
  }).join('');
}

function isDueAlert(fechaStr, estado) {
  if (!fechaStr || estado === 'Terminado') return '';
  const fecha = new Date(fechaStr + 'T00:00:00');
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const diff = Math.floor((fecha - hoy) / (1000*60*60*24));
  if (diff < 0) return 'color:#dc2626;font-weight:700'; // vencido
  if (diff <= 2) return 'color:#d97706;font-weight:600'; // por vencer
  return '';
}

function safeParsePerms(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

// ── Modal Evidencia ──────────────────────────────────────────
function abrirModalEvidencia(id) {
  const t = APP.trabajos.find(x => x.id === id);
  if (!t) return;
  APP.pendingEvidenciaId = id;

  document.getElementById('evidencia-trabajo-info').innerHTML = `
    <strong>${t.numero_maquinado} – ${t.area_solicitante}</strong>
    <span>${t.equipo_maquina} · ${t.torno_asignado}</span>
  `;

  document.getElementById('ev-observaciones').value = t.observaciones || '';
  document.getElementById('ev-fotos-preview').innerHTML = '';
  document.getElementById('ev-fotos').value = '';
  openModal('modal-evidencia');
}

function setupModalEvidencia() {
  document.getElementById('modal-evidencia-close')?.addEventListener('click', () => { closeModal('modal-evidencia'); APP.pendingEvidenciaId = null; });
  document.getElementById('btn-cancelar-evidencia')?.addEventListener('click', () => { closeModal('modal-evidencia'); APP.pendingEvidenciaId = null; });
  document.getElementById('modal-overlay-evidencia')?.addEventListener('click', () => { closeModal('modal-evidencia'); APP.pendingEvidenciaId = null; });

  document.getElementById('ev-fotos')?.addEventListener('change', function() {
    renderArchivosPreview(this.files, 'ev-fotos-preview');
  });

  document.getElementById('btn-terminar-trabajo')?.addEventListener('click', guardarEvidenciaYTerminar);
}

function guardarEvidenciaYTerminar() {
  const id = APP.pendingEvidenciaId;
  if (!id) return;
  const t = APP.trabajos.find(x => x.id === id);
  if (!t) return;

  const obs = document.getElementById('ev-observaciones').value.trim();
  const fotosInput = document.getElementById('ev-fotos');
  const fotos = fotosInput ? Array.from(fotosInput.files).map(f => f.name) : [];

  const perms = safeParsePerms(APP.currentUser?.permisos);

  if (perms.agregar_obs) t.observaciones = obs;
  if (perms.agregar_evidencia && fotos.length > 0) {
    t.evidencias = [...(t.evidencias || []), ...fotos];
  }

  t.estado = 'Terminado';
  t.fecha_terminado = new Date().toISOString().slice(0, 10);
  t.updated_at = Date.now();

  saveTrabatos();
  closeModal('modal-evidencia');
  APP.pendingEvidenciaId = null;
  showToast('¡Trabajo marcado como terminado!', 'success');
  renderMiTorno();
  renderDashboard();
}

function confirmarTerminar(id) {
  if (!confirm('¿Marcar este trabajo como TERMINADO?')) return;
  const t = APP.trabajos.find(x => x.id === id);
  if (!t) return;
  t.estado = 'Terminado';
  t.fecha_terminado = new Date().toISOString().slice(0, 10);
  t.updated_at = Date.now();
  saveTrabatos();
  showToast('¡Trabajo marcado como terminado!', 'success');
  renderMiTorno();
  renderDashboard();
}

// ── Init Operador ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  setupModalEvidencia();
});
