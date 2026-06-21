/* ============================================================
   BIDASOA – app.js  (Core: Auth, Navigation, Clock, State)
   ============================================================ */

'use strict';

// ── Global State ───────────────────────────────────────────
const APP = {
  currentUser: null,
  trabajos: [],
  usuarios: [],
  tornoActivo: 'Torno 1',
  editingTrabajoId: null,
  editingUsuarioId: null,
  pendingEvidenciaId: null
};

// ── Default Credentials (stored in localStorage) ───────────
const DEFAULT_USERS = [
  {
    id: 'admin-001',
    nombre: 'Administrador Bidasoa',
    username: 'admin',
    password: 'admin123',
    rol: 'admin',
    torno_asignado: 'Todos',
    activo: true,
    permisos: JSON.stringify({ ver_planos: true, descargar_planos: true, ver_otros_tornos: true, agregar_obs: true, agregar_evidencia: true, descargar_reportes: true })
  },
  {
    id: 'op-torno1',
    nombre: 'Operador Torno 1',
    username: 'torno1',
    password: 'torno1',
    rol: 'operador',
    torno_asignado: 'Torno 1',
    activo: true,
    permisos: JSON.stringify({ ver_planos: true, descargar_planos: false, ver_otros_tornos: false, agregar_obs: true, agregar_evidencia: true, descargar_reportes: false })
  },
  {
    id: 'op-torno2',
    nombre: 'Operador Torno 2',
    username: 'torno2',
    password: 'torno2',
    rol: 'operador',
    torno_asignado: 'Torno 2',
    activo: true,
    permisos: JSON.stringify({ ver_planos: true, descargar_planos: false, ver_otros_tornos: false, agregar_obs: true, agregar_evidencia: true, descargar_reportes: false })
  },
  {
    id: 'op-torno3',
    nombre: 'Operador Torno 3',
    username: 'torno3',
    password: 'torno3',
    rol: 'operador',
    torno_asignado: 'Torno 3',
    activo: true,
    permisos: JSON.stringify({ ver_planos: true, descargar_planos: false, ver_otros_tornos: false, agregar_obs: true, agregar_evidencia: true, descargar_reportes: false })
  },
  {
    id: 'op-torno4',
    nombre: 'Operador Torno 4',
    username: 'torno4',
    password: 'torno4',
    rol: 'operador',
    torno_asignado: 'Torno 4',
    activo: true,
    permisos: JSON.stringify({ ver_planos: true, descargar_planos: false, ver_otros_tornos: false, agregar_obs: true, agregar_evidencia: true, descargar_reportes: false })
  }
];

// ── Storage Helpers ─────────────────────────────────────────
function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem('bidasoa_' + key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem('bidasoa_' + key, JSON.stringify(val)); } catch {}
}

function initStorage() {
  if (!lsGet('users')) lsSet('users', DEFAULT_USERS);
  if (!lsGet('trabajos')) lsSet('trabajos', []);
  APP.usuarios = lsGet('users') || DEFAULT_USERS;
  APP.trabajos = lsGet('trabajos') || [];
}

function saveTrabatos() { lsSet('trabajos', APP.trabajos); }
function saveUsuarios() { lsSet('users', APP.usuarios); }

// ── Clock ───────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    const dateEl = document.getElementById('current-date');
    const timeEl = document.getElementById('current-time');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

// ── Login ───────────────────────────────────────────────────
function setupLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value.trim();
    const errorEl = document.getElementById('login-error');

    const users = lsGet('users') || DEFAULT_USERS;
    const user = users.find(u => u.username === username && u.password === password && u.activo);

    if (user) {
      APP.currentUser = user;
      errorEl.classList.add('hidden');
      showApp();
    } else {
      errorEl.classList.remove('hidden');
      document.getElementById('login-pass').value = '';
    }
  });
}

function showApp() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('login-screen').style.display = 'none';
  document.body.classList.remove('login-page');
  const app = document.getElementById('app');
  app.classList.remove('hidden');
  app.style.display = 'flex';

  // Set role class on body
  document.body.classList.remove('role-admin', 'role-operador');
  document.body.classList.add('role-' + (APP.currentUser.rol === 'admin' ? 'admin' : 'operador'));

  // Sidebar user info
  document.getElementById('sidebar-username').textContent = APP.currentUser.nombre;
  document.getElementById('sidebar-role').textContent = APP.currentUser.rol === 'admin' ? 'Administrador' : 'Operador – ' + APP.currentUser.torno_asignado;

  // Navigate to first panel
  const firstPanel = APP.currentUser.rol === 'admin' ? 'dashboard' : 'mi-torno';
  navigateTo(firstPanel);

  startClock();
}

function logout() {
  APP.currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-screen').classList.add('active');
  document.body.classList.add('login-page');
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}

// ── Navigation ──────────────────────────────────────────────
function navigateTo(panelId) {
  // Deactivate all
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

  // Activate panel
  const panel = document.getElementById('panel-' + panelId);
  if (panel) panel.classList.add('active');

  // Activate nav
  const navItem = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
  if (navItem) navItem.classList.add('active');

  // Update topbar title
  const titles = {
    dashboard: 'Dashboard General',
    trabajos: 'Gestión de Trabajos',
    priorizacion: 'Priorización de Trabajos',
    importar: 'Importación Masiva',
    reportes: 'Módulo de Reportes',
    usuarios: 'Usuarios y Permisos',
    'mi-torno': 'Mi Torno – Vista de Operador',
    'op-reportes': 'Mis Reportes'
  };
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[panelId] || 'Panel';

  // Refresh panel data
  if (panelId === 'dashboard') renderDashboard();
  if (panelId === 'trabajos') renderTablaTrabatos();
  if (panelId === 'priorizacion') renderPriorizacion();
  if (panelId === 'usuarios') renderUsuarios();
  if (panelId === 'mi-torno') renderMiTorno();

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
}

function setupNavigation() {
  document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      navigateTo(this.dataset.panel);
    });
  });

  document.getElementById('btn-logout').addEventListener('click', logout);

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

// ── KPI Dashboard ────────────────────────────────────────────
function renderDashboard() {
  const t = APP.trabajos;
  document.getElementById('kpi-total').textContent = t.length;
  document.getElementById('kpi-proceso').textContent = t.filter(x => x.estado === 'En Proceso').length;
  document.getElementById('kpi-urgentes').textContent = t.filter(x => x.urgencia === 'Urgente' && x.estado !== 'Terminado').length;
  document.getElementById('kpi-terminados').textContent = t.filter(x => x.estado === 'Terminado').length;

  // Tornos status
  const tornos = ['Torno 1', 'Torno 2', 'Torno 3', 'Torno 4'];
  const container = document.getElementById('tornos-status');
  const maxPerTorno = Math.max(...tornos.map(t2 => APP.trabajos.filter(x => x.torno_asignado === t2 && x.estado !== 'Terminado').length), 1);

  container.innerHTML = tornos.map(torno => {
    const activos = APP.trabajos.filter(x => x.torno_asignado === torno && x.estado !== 'Terminado').length;
    const total = APP.trabajos.filter(x => x.torno_asignado === torno).length;
    const pct = maxPerTorno > 0 ? Math.round((activos / maxPerTorno) * 100) : 0;
    return `
      <div class="torno-status-item">
        <div class="ts-header">
          <span class="ts-name">${torno}</span>
          <span class="ts-count">${activos} activos / ${total} total</span>
        </div>
        <div class="torno-bar"><div class="torno-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');

  // Recent
  const recent = [...APP.trabajos].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, 6);
  const recentEl = document.getElementById('recent-trabajos');
  if (recent.length === 0) {
    recentEl.innerHTML = `<div class="empty-state" style="padding:30px"><i class="fa fa-inbox"></i><p>No hay trabajos registrados</p></div>`;
  } else {
    recentEl.innerHTML = recent.map(w => `
      <div class="recent-item">
        <div>
          <div class="ri-id">${w.numero_maquinado}</div>
          <div class="ri-info">${w.area_solicitante} · ${w.torno_asignado}</div>
        </div>
        <span class="badge ${getBadgeUrgencia(w.urgencia)}">${w.urgencia || '–'}</span>
      </div>`).join('');
  }
}

// ── Badge Helpers ────────────────────────────────────────────
function getBadgeUrgencia(urgencia) {
  if (urgencia === 'Urgente') return 'badge badge-urgente';
  if (urgencia === 'Medianamente Urgente') return 'badge badge-media';
  return 'badge badge-baja';
}
function getBadgeEstado(estado) {
  if (estado === 'Pendiente') return 'badge badge-pendiente';
  if (estado === 'En Proceso') return 'badge badge-proceso';
  if (estado === 'Terminado') return 'badge badge-terminado';
  if (estado === 'Cancelado') return 'badge badge-cancelado';
  return 'badge';
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa ${icons[type] || icons.info}"></i><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Loading ──────────────────────────────────────────────────
function showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

// ── Modal helpers ────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ── Format date ──────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '–';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── UID ──────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initStorage();
  setupLogin();
  setupNavigation();
});
