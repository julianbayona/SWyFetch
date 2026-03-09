// ============================================================
//  GastoSmart – budget-form.js
//  Formulario de configuración de presupuesto mensual
// ============================================================

import { CATEGORIES } from './constants.js';
import { currentMonth, formatMoney } from './helpers.js';
import { budgetForMonth, saveBudgetMonth } from './expenses.js';
import { showToast, showAlert } from './ui.js';
import { renderDashboard } from './dashboard.js';

export function initBudgetForm() {
  const monthInp  = document.getElementById('inp-budget-month');
  const incomeInp = document.getElementById('inp-income');
  const form      = document.getElementById('budget-form');

  monthInp.value = currentMonth();
  renderCatBudgetInputs();
  loadBudgetIntoForm(currentMonth());

  monthInp.addEventListener('change', () => loadBudgetIntoForm(monthInp.value));
  incomeInp.addEventListener('input', updateAllocSummary);

  form.addEventListener('submit', evt => {
    evt.preventDefault();
    evt.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const month  = monthInp.value;
    const income = parseFloat(incomeInp.value) || 0;
    const cats   = {};
    document.querySelectorAll('.cat-inp').forEach(inp => {
      const v = parseFloat(inp.value) || 0;
      if (v > 0) cats[inp.dataset.cat] = v;
    });

    saveBudgetMonth(month, income, cats);

    showAlert('budget-alert', 'Presupuesto guardado correctamente.', 'success');
    showToast('Presupuesto guardado', 'success');
    form.classList.remove('was-validated');
    renderDashboard();
  });
}

function renderCatBudgetInputs() {
  const c = document.getElementById('cat-budget-inputs');
  c.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => `
    <div class="mb-2">
      <label class="form-label small mb-1">${cat.icon} ${cat.name}</label>
      <div class="input-group input-group-sm">
        <span class="input-group-text">$</span>
        <input type="number" class="form-control cat-inp" data-cat="${key}"
               placeholder="0.00" min="0" step="0.01">
      </div>
    </div>`).join('');

  document.querySelectorAll('.cat-inp').forEach(inp =>
    inp.addEventListener('input', updateAllocSummary)
  );
}

function loadBudgetIntoForm(month) {
  const b = budgetForMonth(month);
  document.getElementById('inp-income').value = b.income || '';
  document.querySelectorAll('.cat-inp').forEach(inp => {
    inp.value = b.categories[inp.dataset.cat] || '';
  });
  updateAllocSummary();
}

function updateAllocSummary() {
  const income  = parseFloat(document.getElementById('inp-income').value) || 0;
  let allocated = 0;
  document.querySelectorAll('.cat-inp').forEach(inp => {
    allocated += parseFloat(inp.value) || 0;
  });
  const unalloc = income - allocated;

  document.getElementById('lbl-allocated').textContent   = formatMoney(allocated);
  document.getElementById('lbl-unallocated').textContent = formatMoney(unalloc);

  const summary = document.getElementById('budget-alloc-summary');
  summary.className = allocated > income && income > 0
    ? 'alert alert-danger small mt-3'
    : 'alert alert-info small mt-3';
}
