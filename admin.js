/* ============================================================
   BIDASOA – admin.js
   Panel Administrador: Trabajos, Priorización, Importar, Usuarios
   ============================================================ */

'use strict';

// ── TABLA DE TRABAJOS ────────────────────────────────────────
function renderTablaTrabatos() {
  const tbody = document.getElementById('tbody-trabajos');
  let data = [...APP.trabajos];

  const filTorno = document.getElementById('filter-torno')?.value || '';
  const filEstado = document.getElementById('filter-estado')?.value || '';
  const filUrgencia = document.getElementById('filter-urgencia')?.value || '';
  const search = (document.getElementById('search-trabajos')?.value || '').toLowerCase();

  if (filTorno) data = data.filter(t => t.torno_asignado === filTorno);
  if (filEstado) data = data.filter(t => t.estado === filEstado);
  if (filUrgencia) data = data.filter(t => t.urgencia === filUrgencia);
  if (search) data = data.filter(t =>
    (t.numero_maquinado || '').toLowerCase().includes(search) ||
    (t.solicitante || '').toLowerCase().includes(search) ||
    (t.area_solicitante || '').toLowerCase().includes(search) ||
    (t.equipo_maquina || '').toLowerCase().includes(search)
  );

  data.sort((a, b) => (a.prioridad || 99) - (b.prioridad || 99));

  if (data.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="12"><i class="fa fa-inbox"></i> No hay trabajos que coincidan con los filtros</td></tr>`;
    return;
  }

  const isAdmin = APP.currentUser?.rol === 'admin';

  tbody.innerHTML = data.map(t => `
    <tr data-id="${t.id}">
      <td><strong>${t.numero_maquinado}</strong></td>
      <td>${t.solicitante || '–'}</td>
      <td>${t.area_solicitante || '–'}</td>
      <td>${t.equipo_maquina || '–'}</td>
      <td><span class="badge badge-proceso" style="background:#e0f2fe;color:#0284c7">${t.torno_asignado || '–'}</span></td>
      <td>${t.material || '–'}</td>
      <td>${fmtDate(t.fecha_ingreso)}</td>
      <td>${fmtDate(t.fecha_entrega)}</td>
      <td><strong>#${t.prioridad || '–'}</strong></td>
      <td><span class="${getBadgeUrgencia(t.urgencia)}">${t.urgencia || '–'}</span></td>
      <td><span class="${getBadgeEstado(t.estado)}">${t.estado || '–'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-icon-view" onclick="verDetalle('${t.id}')" title="Ver detalle"><i class="fa fa-eye"></i></button>
          ${isAdmin ? `<button class="btn-icon btn-icon-edit" onclick="editarTrabajo('${t.id}')" title="Editar"><i class="fa fa-edit"></i></button>` : ''}
          ${isAdmin ? `<button class="btn-icon btn-icon-delete" onclick="eliminarTrabajo('${t.id}')" title="Eliminar"><i class="fa fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

// ── FILTROS ──────────────────────────────────────────────────
function setupFiltros() {
  ['filter-torno', 'filter-estado', 'filter-urgencia'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderTablaTrabatos);
  });
  document.getElementById('search-trabajos')?.addEventListener('input', renderTablaTrabatos);
}

// ── MODAL NUEVO / EDITAR TRABAJO ─────────────────────────────
function setupModalTrabajo() {
  document.getElementById('btn-nuevo-trabajo')?.addEventListener('click', () => {
    APP.editingTrabajoId = null;
    document.getElementById('modal-trabajo-title').innerHTML = '<i class="fa fa-plus"></i> Nuevo Trabajo de Maquinado';
    resetFormTrabajo();
    // Default fecha ingreso = hoy
    document.getElementById('ft-fecha-ingreso').value = new Date().toISOString().slice(0, 10);
    openModal('modal-trabajo');
  });

  document.getElementById('modal-trabajo-close')?.addEventListener('click', () => closeModal('modal-trabajo'));
  document.getElementById('btn-cancelar-trabajo')?.addEventListener('click', () => closeModal('modal-trabajo'));
  document.getElementById('modal-overlay-trabajo')?.addEventListener('click', () => closeModal('modal-trabajo'));

  document.getElementById('btn-guardar-trabajo')?.addEventListener('click', guardarTrabajo);

  // File upload preview
  document.getElementById('ft-archivos')?.addEventListener('change', function() {
    renderArchivosPreview(this.files, 'archivos-preview');
  });

  // Upload zone drag
  setupUploadZoneDrag('upload-zone', 'ft-archivos', 'archivos-preview');
}

function resetFormTrabajo() {
  ['ft-numero','ft-solicitante','ft-area','ft-equipo','ft-material','ft-operador',
   'ft-fecha-ingreso','ft-fecha-entrega','ft-descripcion','ft-tiempo-est'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('ft-torno').value = '';
  document.getElementById('ft-urgencia').value = '';
  document.getElementById('ft-estado').value = 'Pendiente';
  document.getElementById('archivos-preview').innerHTML = '';
}

function guardarTrabajo() {
  const numero = document.getElementById('ft-numero').value.trim();
  const solicitante = document.getElementById('ft-solicitante').value.trim();
  const area = document.getElementById('ft-area').value.trim();
  const equipo = document.getElementById('ft-equipo').value.trim();
  const torno = document.getElementById('ft-torno').value;
  const material = document.getElementById('ft-material').value.trim();
  const urgencia = document.getElementById('ft-urgencia').value;
  const fechaIngreso = document.getElementById('ft-fecha-ingreso').value;
  const fechaEntrega = document.getElementById('ft-fecha-entrega').value;
  const descripcion = document.getElementById('ft-descripcion').value.trim();
  const tiempoEst = parseFloat(document.getElementById('ft-tiempo-est').value) || 0;
  const estado = document.getElementById('ft-estado').value;
  const operador = document.getElementById('ft-operador').value.trim();

  if (!numero || !solicitante || !area || !equipo || !torno || !material || !urgencia || !fechaIngreso || !fechaEntrega) {
    showToast('Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  // Validar número único
  const existingNum = APP.trabajos.find(t => t.numero_maquinado === numero && t.id !== APP.editingTrabajoId);
  if (existingNum) {
    showToast('El N° de Maquinado ya existe. Usa un identificador único.', 'error');
    return;
  }

  if (APP.editingTrabajoId) {
    // Editar
    const idx = APP.trabajos.findIndex(t => t.id === APP.editingTrabajoId);
    if (idx >= 0) {
      APP.trabajos[idx] = {
        ...APP.trabajos[idx],
        numero_maquinado: numero, solicitante, area_solicitante: area,
        equipo_maquina: equipo, torno_asignado: torno, material, urgencia,
        fecha_ingreso: fechaIngreso, fecha_entrega: fechaEntrega,
        descripcion, tiempo_estimado: tiempoEst, estado, operador_asignado: operador,
        updated_at: Date.now()
      };
    }
    showToast('Trabajo actualizado correctamente.', 'success');
  } else {
    // Nuevo
    const tornoTrabatos = APP.trabajos.filter(t => t.torno_asignado === torno);
    const maxPrio = tornoTrabatos.length > 0 ? Math.max(...tornoTrabatos.map(t => t.prioridad || 0)) : 0;
    const newTrabajo = {
      id: uid(), numero_maquinado: numero, solicitante, area_solicitante: area,
      equipo_maquina: equipo, torno_asignado: torno, material, urgencia,
      fecha_ingreso: fechaIngreso, fecha_entrega: fechaEntrega,
      descripcion, tiempo_estimado: tiempoEst, tiempo_real: 0,
      estado, operador_asignado: operador,
      prioridad: maxPrio + 1,
      planos_archivos: [], evidencias: [],
      observaciones: '',
      fecha_terminado: '',
      created_at: Date.now(), updated_at: Date.now()
    };
    APP.trabajos.push(newTrabajo);
    showToast('Trabajo registrado exitosamente.', 'success');
  }

  saveTrabatos();
  closeModal('modal-trabajo');
  renderTablaTrabatos();
  renderDashboard();
}

function editarTrabajo(id) {
  const t = APP.trabajos.find(x => x.id === id);
  if (!t) return;
  APP.editingTrabajoId = id;
  document.getElementById('modal-trabajo-title').innerHTML = '<i class="fa fa-edit"></i> Editar Trabajo de Maquinado';
  document.getElementById('ft-numero').value = t.numero_maquinado || '';
  document.getElementById('ft-solicitante').value = t.solicitante || '';
  document.getElementById('ft-area').value = t.area_solicitante || '';
  document.getElementById('ft-equipo').value = t.equipo_maquina || '';
  document.getElementById('ft-torno').value = t.torno_asignado || '';
  document.getElementById('ft-material').value = t.material || '';
  document.getElementById('ft-urgencia').value = t.urgencia || '';
  document.getElementById('ft-fecha-ingreso').value = t.fecha_ingreso || '';
  document.getElementById('ft-fecha-entrega').value = t.fecha_entrega || '';
  document.getElementById('ft-descripcion').value = t.descripcion || '';
  document.getElementById('ft-tiempo-est').value = t.tiempo_estimado || '';
  document.getElementById('ft-estado').value = t.estado || 'Pendiente';
  document.getElementById('ft-operador').value = t.operador_asignado || '';
  openModal('modal-trabajo');
}

function eliminarTrabajo(id) {
  if (!confirm('¿Seguro que deseas eliminar este trabajo? Esta acción no se puede deshacer.')) return;
  APP.trabajos = APP.trabajos.filter(t => t.id !== id);
  saveTrabatos();
  renderTablaTrabatos();
  renderDashboard();
  showToast('Trabajo eliminado.', 'warning');
}

// ── VER DETALLE ──────────────────────────────────────────────
function verDetalle(id) {
  const t = APP.trabajos.find(x => x.id === id);
  if (!t) return;
  const isAdmin = APP.currentUser?.rol === 'admin';

  const urgColor = t.urgencia === 'Urgente' ? '#dc2626' : t.urgencia === 'Medianamente Urgente' ? '#d97706' : '#16a34a';

  document.getElementById('detalle-content').innerHTML = `
    <div style="border-left: 5px solid ${urgColor}; background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size:22px;font-weight:800;color:#0d2a6b;">${t.numero_maquinado}</div>
      <div style="color:#6b7280;font-size:13px;">${t.area_solicitante} · ${t.torno_asignado} · Prioridad #${t.prioridad}</div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <span class="${getBadgeUrgencia(t.urgencia)}">${t.urgencia || '–'}</span>
        <span class="${getBadgeEstado(t.estado)}">${t.estado || '–'}</span>
      </div>
    </div>
    <div class="detalle-grid">
      <div class="detalle-field"><label>Solicitante</label><span>${t.solicitante || '–'}</span></div>
      <div class="detalle-field"><label>Equipo / Máquina</label><span>${t.equipo_maquina || '–'}</span></div>
      <div class="detalle-field"><label>Material Requerido</label><span>${t.material || '–'}</span></div>
      <div class="detalle-field"><label>Operador Asignado</label><span>${t.operador_asignado || '–'}</span></div>
      <div class="detalle-field"><label>Fecha de Ingreso</label><span>${fmtDate(t.fecha_ingreso)}</span></div>
      <div class="detalle-field"><label>Fecha de Entrega</label><span>${fmtDate(t.fecha_entrega)}</span></div>
      <div class="detalle-field"><label>Tiempo Estimado</label><span>${t.tiempo_estimado ? t.tiempo_estimado + ' hrs' : '–'}</span></div>
      <div class="detalle-field"><label>Tiempo Real</label><span>${t.tiempo_real ? t.tiempo_real + ' hrs' : '–'}</span></div>
      ${t.fecha_terminado ? `<div class="detalle-field"><label>Fecha Terminado</label><span>${fmtDate(t.fecha_terminado)}</span></div>` : ''}
    </div>
    ${t.descripcion ? `<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Descripción</div><div style="background:#f0f2f5;border-radius:8px;padding:12px;font-size:13px;color:#374151">${t.descripcion}</div></div>` : ''}
    ${t.observaciones ? `<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Observaciones del Operador</div><div style="background:#fef3c7;border-radius:8px;padding:12px;font-size:13px;color:#374151;border:1px solid rgba(217,119,6,.2)">${t.observaciones}</div></div>` : ''}
    ${(t.planos_archivos && t.planos_archivos.length > 0) ? `<div><div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Archivos Adjuntos (${t.planos_archivos.length})</div><div style="display:flex;flex-wrap:wrap;gap:8px">${t.planos_archivos.map(f => `<span class="archivo-chip"><i class="fa fa-paperclip"></i>${f}</span>`).join('')}</div></div>` : ''}
  `;

  const btnEditar = document.getElementById('btn-editar-desde-detalle');
  if (isAdmin) {
    btnEditar.style.display = 'inline-flex';
    btnEditar.onclick = () => { closeModal('modal-detalle'); editarTrabajo(id); };
  } else {
    btnEditar.style.display = 'none';
  }

  openModal('modal-detalle');
}

// (modal-detalle close events are registered in DOMContentLoaded below)

// ── PRIORIZACIÓN DRAG & DROP ──────────────────────────────────
let sortableInstance = null;

function renderPriorizacion() {
  const torno = APP.tornoActivo;
  const lista = document.getElementById('prioridad-lista');

  let data = APP.trabajos
    .filter(t => t.torno_asignado === torno && t.estado !== 'Terminado')
    .sort((a, b) => (a.prioridad || 99) - (b.prioridad || 99));

  if (data.length === 0) {
    lista.innerHTML = `<div class="empty-state"><i class="fa fa-inbox"></i><p>No hay trabajos activos para ${torno}</p></div>`;
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    return;
  }

  lista.innerHTML = data.map((t, idx) => {
    const urgClass = t.urgencia === 'Urgente' ? 'urgente' : t.urgencia === 'Medianamente Urgente' ? 'media' : 'baja';
    return `
      <div class="prio-card ${urgClass}" data-id="${t.id}">
        <div class="prio-num">${idx + 1}</div>
        <div class="prio-info">
          <div class="pi-id">${t.numero_maquinado}</div>
          <div class="pi-title">${t.area_solicitante} – ${t.equipo_maquina}</div>
          <div class="pi-meta">${t.material} · Entrega: ${fmtDate(t.fecha_entrega)} · <span class="${getBadgeUrgencia(t.urgencia)}">${t.urgencia}</span></div>
        </div>
        <span class="${getBadgeEstado(t.estado)}">${t.estado}</span>
        <i class="fa fa-grip-vertical prio-drag-icon"></i>
      </div>`;
  }).join('');

  // Destroy previous
  if (sortableInstance) sortableInstance.destroy();

  const isAdmin = APP.currentUser?.rol === 'admin';
  if (!isAdmin) return; // Solo admin puede arrastrar

  sortableInstance = Sortable.create(lista, {
    animation: 180,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    handle: '.fa-grip-vertical',
    onEnd: function() {
      const cards = lista.querySelectorAll('.prio-card[data-id]');
      cards.forEach((card, idx) => {
        const id = card.dataset.id;
        const tj = APP.trabajos.find(t => t.id === id);
        if (tj) {
          tj.prioridad = idx + 1;
          tj.updated_at = Date.now();
          card.querySelector('.prio-num').textContent = idx + 1;
        }
      });
      saveTrabatos();
      showToast('Prioridades actualizadas.', 'success');
    }
  });
}

function setupPriorizacion() {
  document.querySelectorAll('.torno-tab').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.torno-tab').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      APP.tornoActivo = this.dataset.torno;
      renderPriorizacion();
    });
  });
}

// ── IMPORTACIÓN MASIVA ────────────────────────────────────────
let importData = [];

function setupImportar() {
  const input = document.getElementById('import-file-input');
  const dropzone = document.getElementById('import-dropzone');

  // Click on dropzone
  dropzone?.addEventListener('click', () => input?.click());

  // Drag & Drop on dropzone
  dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone?.addEventListener('drop', e => {
    e.preventDefault(); dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) processImportFile(e.dataTransfer.files[0]);
  });

  input?.addEventListener('change', function() {
    if (this.files.length) processImportFile(this.files[0]);
  });

  document.getElementById('btn-cancelar-import')?.addEventListener('click', cancelImport);
  document.getElementById('btn-confirmar-import')?.addEventListener('click', confirmarImport);
  document.getElementById('btn-download-template')?.addEventListener('click', downloadTemplate);
}

function processImportFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    showToast('Solo se admiten archivos .xlsx, .xls o .csv para importación de datos. Los PDF y DOCX se usan como adjuntos.', 'warning');
    return;
  }

  showLoading();
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      importData = rows;
      hideLoading();
      renderImportPreview(rows);
    } catch (err) {
      hideLoading();
      showToast('Error al procesar el archivo. Verifica el formato.', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderImportPreview(rows) {
  if (!rows || rows.length === 0) {
    showToast('El archivo no contiene datos.', 'warning');
    return;
  }

  const cols = Object.keys(rows[0]);
  document.getElementById('import-count').textContent = `${rows.length} registros encontrados`;

  document.getElementById('import-thead').innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
  document.getElementById('import-tbody').innerHTML = rows.slice(0, 20).map(row =>
    `<tr>${cols.map(c => `<td>${row[c]}</td>`).join('')}</tr>`
  ).join('');

  document.getElementById('import-dropzone').classList.add('hidden');
  document.getElementById('import-preview').classList.remove('hidden');
}

function cancelImport() {
  importData = [];
  document.getElementById('import-dropzone').classList.remove('hidden');
  document.getElementById('import-preview').classList.add('hidden');
  document.getElementById('import-file-input').value = '';
}

function confirmarImport() {
  if (!importData.length) return;
  showLoading();
  let count = 0;

  importData.forEach(row => {
    const torno = row['torno_asignado'] || row['Torno'] || row['torno'] || '';
    const validTorno = ['Torno 1', 'Torno 2', 'Torno 3', 'Torno 4'].includes(torno) ? torno : 'Torno 1';
    const tornoTrabatos = APP.trabajos.filter(t => t.torno_asignado === validTorno);
    const maxPrio = tornoTrabatos.length > 0 ? Math.max(...tornoTrabatos.map(t => t.prioridad || 0)) : 0;

    const num = String(row['numero_maquinado'] || row['N° Maquinado'] || row['numero'] || '').trim();
    if (!num) return;

    // Skip duplicates
    if (APP.trabajos.find(t => t.numero_maquinado === num)) return;

    APP.trabajos.push({
      id: uid(),
      numero_maquinado: num,
      solicitante: row['solicitante'] || row['Solicitante'] || '',
      area_solicitante: row['area_solicitante'] || row['Área'] || row['Area'] || '',
      equipo_maquina: row['equipo_maquina'] || row['Equipo'] || '',
      torno_asignado: validTorno,
      material: row['material'] || row['Material'] || '',
      urgencia: row['urgencia'] || row['Urgencia'] || 'Poco Urgente',
      fecha_ingreso: row['fecha_ingreso'] || row['F. Ingreso'] || new Date().toISOString().slice(0,10),
      fecha_entrega: row['fecha_entrega'] || row['F. Entrega'] || '',
      descripcion: row['descripcion'] || row['Descripción'] || '',
      estado: row['estado'] || row['Estado'] || 'Pendiente',
      operador_asignado: row['operador_asignado'] || row['Operador'] || '',
      prioridad: maxPrio + 1 + count,
      planos_archivos: [], evidencias: [], observaciones: '',
      tiempo_estimado: parseFloat(row['tiempo_estimado'] || 0) || 0,
      tiempo_real: 0, fecha_terminado: '',
      created_at: Date.now(), updated_at: Date.now()
    });
    count++;
  });

  saveTrabatos();
  hideLoading();
  cancelImport();
  showToast(`Se importaron ${count} trabajos correctamente.`, 'success');
}

function downloadTemplate() {
  const headers = [
    ['numero_maquinado', 'solicitante', 'area_solicitante', 'equipo_maquina', 'torno_asignado',
     'material', 'urgencia', 'fecha_ingreso', 'fecha_entrega', 'descripcion', 'estado', 'operador_asignado', 'tiempo_estimado']
  ];
  const example = [
    ['MAQ-2026-001', 'Juan Pérez', 'Mantenimiento', 'Bomba P-101', 'Torno 1',
     'Acero 1045', 'Urgente', '2026-06-18', '2026-06-20', 'Eje principal', 'Pendiente', 'Operador 1', '4']
  ];
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trabajos');
  XLSX.writeFile(wb, 'Plantilla_Importacion_Bidasoa.xlsx');
  showToast('Plantilla descargada.', 'success');
}

// ── USUARIOS ─────────────────────────────────────────────────
function renderUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  const users = APP.usuarios;

  if (!users.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><i class="fa fa-inbox"></i> No hay usuarios</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.nombre}</strong></td>
      <td>${u.username}</td>
      <td><span class="badge ${u.rol === 'admin' ? 'badge-proceso' : 'badge-baja'}">${u.rol === 'admin' ? 'Administrador' : 'Operador'}</span></td>
      <td>${u.torno_asignado || '–'}</td>
      <td><span class="badge ${u.activo ? 'badge-terminado' : 'badge-cancelado'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td style="font-size:11px;color:#6b7280">${u.rol === 'admin' ? 'Acceso total' : permsResumen(u.permisos)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-icon-edit" onclick="editarUsuario('${u.id}')" title="Editar"><i class="fa fa-edit"></i></button>
          ${u.id !== 'admin-001' ? `<button class="btn-icon btn-icon-delete" onclick="eliminarUsuario('${u.id}')" title="Eliminar"><i class="fa fa-trash"></i></button>` : ''}
          ${u.rol === 'operador' ? `<button class="btn-icon btn-icon-view" onclick="configurarPermisos('${u.id}')" title="Permisos"><i class="fa fa-shield-alt"></i></button>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

function permsResumen(permsStr) {
  try {
    const p = JSON.parse(permsStr || '{}');
    const activos = Object.keys(p).filter(k => p[k]);
    return activos.length + ' permisos activos';
  } catch { return '–'; }
}

function setupModalUsuario() {
  document.getElementById('btn-nuevo-usuario')?.addEventListener('click', () => {
    APP.editingUsuarioId = null;
    document.getElementById('modal-usuario-title').innerHTML = '<i class="fa fa-user-plus"></i> Nuevo Usuario';
    resetFormUsuario();
    openModal('modal-usuario');
  });
  document.getElementById('modal-usuario-close')?.addEventListener('click', () => closeModal('modal-usuario'));
  document.getElementById('btn-cancelar-usuario')?.addEventListener('click', () => closeModal('modal-usuario'));
  document.getElementById('modal-overlay-usuario')?.addEventListener('click', () => closeModal('modal-usuario'));
  document.getElementById('btn-guardar-usuario')?.addEventListener('click', guardarUsuario);

  document.getElementById('fu-rol')?.addEventListener('change', function() {
    const isOp = this.value === 'operador';
    document.getElementById('fu-torno-group').style.display = isOp ? 'flex' : 'none';
    document.getElementById('fu-permisos-group').style.display = isOp ? 'block' : 'none';
  });
}

function resetFormUsuario() {
  document.getElementById('fu-nombre').value = '';
  document.getElementById('fu-username').value = '';
  document.getElementById('fu-password').value = '';
  document.getElementById('fu-rol').value = '';
  document.getElementById('fu-torno').value = 'Todos';
  document.getElementById('fu-torno-group').style.display = 'none';
  document.getElementById('fu-permisos-group').style.display = 'none';
  document.querySelectorAll('#fu-permisos-group input[type=checkbox]').forEach(c => { c.checked = true; });
}

function guardarUsuario() {
  const nombre = document.getElementById('fu-nombre').value.trim();
  const username = document.getElementById('fu-username').value.trim();
  const password = document.getElementById('fu-password').value.trim();
  const rol = document.getElementById('fu-rol').value;
  const torno = document.getElementById('fu-torno').value;

  if (!nombre || !username || !rol) {
    showToast('Completa los campos obligatorios.', 'warning');
    return;
  }
  if (!APP.editingUsuarioId && !password) {
    showToast('La contraseña es obligatoria para nuevos usuarios.', 'warning');
    return;
  }

  const dupl = APP.usuarios.find(u => u.username === username && u.id !== APP.editingUsuarioId);
  if (dupl) { showToast('Ese nombre de usuario ya está en uso.', 'error'); return; }

  const permisos = {};
  document.querySelectorAll('#fu-permisos-group input[name=perm]').forEach(c => { permisos[c.value] = c.checked; });

  if (APP.editingUsuarioId) {
    const idx = APP.usuarios.findIndex(u => u.id === APP.editingUsuarioId);
    if (idx >= 0) {
      APP.usuarios[idx] = { ...APP.usuarios[idx], nombre, username, rol, torno_asignado: torno, permisos: JSON.stringify(permisos) };
      if (password) APP.usuarios[idx].password = password;
    }
    showToast('Usuario actualizado.', 'success');
  } else {
    APP.usuarios.push({ id: uid(), nombre, username, password, rol, torno_asignado: torno, activo: true, permisos: JSON.stringify(permisos) });
    showToast('Usuario creado.', 'success');
  }

  saveUsuarios();
  closeModal('modal-usuario');
  renderUsuarios();
}

function editarUsuario(id) {
  const u = APP.usuarios.find(x => x.id === id);
  if (!u) return;
  APP.editingUsuarioId = id;
  document.getElementById('modal-usuario-title').innerHTML = '<i class="fa fa-user-edit"></i> Editar Usuario';
  document.getElementById('fu-nombre').value = u.nombre;
  document.getElementById('fu-username').value = u.username;
  document.getElementById('fu-password').value = '';
  document.getElementById('fu-rol').value = u.rol;
  document.getElementById('fu-torno').value = u.torno_asignado || 'Todos';
  const isOp = u.rol === 'operador';
  document.getElementById('fu-torno-group').style.display = isOp ? 'flex' : 'none';
  document.getElementById('fu-permisos-group').style.display = isOp ? 'block' : 'none';
  try {
    const p = JSON.parse(u.permisos || '{}');
    document.querySelectorAll('#fu-permisos-group input[name=perm]').forEach(c => { c.checked = !!p[c.value]; });
  } catch {}
  openModal('modal-usuario');
}

function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  APP.usuarios = APP.usuarios.filter(u => u.id !== id);
  saveUsuarios();
  renderUsuarios();
  showToast('Usuario eliminado.', 'warning');
}

function configurarPermisos(id) {
  editarUsuario(id);
}

// ── FILE UPLOAD HELPERS ───────────────────────────────────────
function renderArchivosPreview(files, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const chips = Array.from(files).map(f => `
    <span class="archivo-chip">
      <i class="fa ${getFileIcon(f.name)}"></i>
      ${f.name}
    </span>`).join('');
  container.innerHTML = chips;
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'fa-file-pdf';
  if (['jpg','jpeg','png','webp'].includes(ext)) return 'fa-file-image';
  if (['dwg','dxf'].includes(ext)) return 'fa-drafting-compass';
  if (['step','iges'].includes(ext)) return 'fa-cube';
  return 'fa-file';
}

function setupUploadZoneDrag(zoneId, inputId, previewId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) renderArchivosPreview(e.dataTransfer.files, previewId);
  });
}

// ── Init Admin ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  setupFiltros();
  setupModalTrabajo();
  setupPriorizacion();
  setupImportar();
  setupModalUsuario();

  // Modal detalle close events
  document.getElementById('modal-detalle-close')?.addEventListener('click', () => closeModal('modal-detalle'));
  document.getElementById('btn-cerrar-detalle')?.addEventListener('click', () => closeModal('modal-detalle'));
  document.getElementById('modal-overlay-detalle')?.addEventListener('click', () => closeModal('modal-detalle'));
});
