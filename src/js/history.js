// ============================================================
//  GastoSmart – history.js
//  Historial de gastos con filtros y resumen mensual
// ============================================================

import { CATEGORIES } from './constants.js';
import { currentMonth, formatMoney, formatDate, escapeHtml } from './helpers.js';
import { expensesByMonth, deleteExpense, budgetForMonth } from './expenses.js';
import { showToast } from './ui.js';
import { renderDashboard } from './dashboard.js';

let pendingDeleteId = null;

export function initHistory() {
  const monthInp = document.getElementById('hist-month');
  const catSel   = document.getElementById('hist-category');

  monthInp.value = currentMonth();
  monthInp.addEventListener('change', renderHistory);
  catSel.addEventListener('change',   renderHistory);

  document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    if (!pendingDeleteId) return;
    deleteExpense(pendingDeleteId);
    pendingDeleteId = null;
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    showToast('Gasto eliminado', 'warning');
    renderHistory();
    renderDashboard();
  });

  renderHistory();
}

export function renderHistory() {
  const month = document.getElementById('hist-month').value;
  const cat   = document.getElementById('hist-category').value;

  let list = expensesByMonth(month);
  if (cat) list = list.filter(e => e.category === cat);

  renderMonthlySummary(month);

  const ul = document.getElementById('history-list');
  document.getElementById('hist-count').textContent = list.length;

  if (!list.length) {
    ul.innerHTML = '<li class="list-group-item text-center text-muted py-4">Sin gastos para este período</li>';
    return;
  }

  const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

  ul.innerHTML = sorted.map(e => `
    <li class="list-group-item py-2">
      <div class="d-flex justify-content-between align-items-start">
        <div class="d-flex gap-2">
          <span class="fs-5 mt-1">${CATEGORIES[e.category]?.icon || '💰'}</span>
          <div>
            <div class="fw-semibold">${formatMoney(e.amount)}</div>
            <div class="small text-muted">${escapeHtml(e.description || CATEGORIES[e.category]?.name)}</div>
            <div class="small text-muted">${formatDate(e.date)} · ${CATEGORIES[e.category]?.name}</div>
          </div>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm del-btn" data-id="${e.id}"
                aria-label="Eliminar gasto">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    </li>`).join('');

  ul.querySelectorAll('.del-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      pendingDeleteId = btn.dataset.id;
      bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteModal')).show();
    })
  );
}

function renderMonthlySummary(month) {
  const expenses = expensesByMonth(month);
  const budget   = budgetForMonth(month);
  const spent    = expenses.reduce((s, e) => s + e.amount, 0);
  const avail    = (budget.income || 0) - spent;

  document.getElementById('monthly-summary').innerHTML = `
    <div class="col-4">
      <div class="border rounded p-2">
        <div class="small text-muted">Gastos</div>
        <div class="fw-bold text-danger small">${formatMoney(spent)}</div>
      </div>
    </div>
    <div class="col-4">
      <div class="border rounded p-2">
        <div class="small text-muted">Disponible</div>
        <div class="fw-bold small ${avail >= 0 ? 'text-success' : 'text-danger'}">${formatMoney(avail)}</div>
      </div>
    </div>
    <div class="col-4">
      <div class="border rounded p-2">
        <div class="small text-muted">Registros</div>
        <div class="fw-bold small">${expenses.length}</div>
      </div>
    </div>`;
}
