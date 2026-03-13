// ============================================================
//  GastoSmart – app.js
//  Punto de entrada: Service Worker, conectividad e inicio
// ============================================================

import { formatMonth, currentMonth } from './helpers.js';
import { showToast } from './ui.js';
import { renderDashboard } from './dashboard.js';
import { initExpenseForm } from './expense-form.js';
import { initBudgetForm } from './budget-form.js';
import { initHistory, renderHistory } from './history.js';
import { initReports, renderReports } from './reports.js';

// ==================== SERVICE WORKER ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[App] SW registrado. Scope:', reg.scope);

        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('Nueva versión disponible. Recargue la página.', 'info');
            }
          });
        });
      })
      .catch(err => console.error('[App] Error al registrar SW:', err));

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

// ==================== CONECTIVIDAD ====================
window.addEventListener('online', () => {
  document.getElementById('offline-banner').classList.add('d-none');
  showToast('Conexión restaurada', 'success');
});
window.addEventListener('offline', () => {
  document.getElementById('offline-banner').classList.remove('d-none');
  showToast('Sin conexión – modo offline activo', 'warning');
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('lbl-month').textContent = formatMonth(currentMonth());

  if (!navigator.onLine) {
    document.getElementById('offline-banner').classList.remove('d-none');
  }

  initExpenseForm();
  initBudgetForm();
  initHistory();
  initReports();
  renderDashboard();

  document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab =>
    tab.addEventListener('shown.bs.tab', evt => {
      const target = evt.target.getAttribute('data-bs-target');
      if (target === '#tab-dashboard') renderDashboard();
      if (target === '#tab-history')   renderHistory();
      if (target === '#tab-reports')   renderReports();
    })
  );
});
