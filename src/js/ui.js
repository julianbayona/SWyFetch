// ============================================================
//  GastoSmart – ui.js
//  Notificaciones toast y alertas inline
// ============================================================

import { escapeHtml } from './helpers.js';

export function showToast(msg, type = 'info') {
  const el   = document.getElementById('app-toast');
  const body = document.getElementById('toast-body');
  const colorMap = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning text-dark', info: 'bg-info' };
  body.textContent = msg;
  el.className = `toast align-items-center border-0 text-white ${colorMap[type] || 'bg-secondary'}`;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 }).show();
}

export function showAlert(containerId, msg, type) {
  const c = document.getElementById(containerId);
  c.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show py-2 small" role="alert">
      ${escapeHtml(msg)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>`;
  setTimeout(() => { c.innerHTML = ''; }, 5000);
}
