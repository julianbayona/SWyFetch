// ============================================================
//  GastoSmart – expense-form.js
//  Formulario de registro de gastos y categorías rápidas
// ============================================================

import { CATEGORIES } from './constants.js';
import { today, formatMoney } from './helpers.js';
import { addExpense } from './expenses.js';
import { showToast, showAlert } from './ui.js';
import { renderDashboard } from './dashboard.js';
import { renderHistory } from './history.js';

export function initExpenseForm() {
  const form    = document.getElementById('expense-form');
  const dateInp = document.getElementById('inp-date');

  dateInp.value = today();
  renderQuickCategories();

  form.addEventListener('submit', evt => {
    evt.preventDefault();
    evt.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const amount = document.getElementById('inp-amount').value;
    const cat    = document.getElementById('inp-category').value;
    const desc   = document.getElementById('inp-description').value;
    const date   = document.getElementById('inp-date').value;

    if (parseFloat(amount) <= 0) {
      showAlert('expense-alert', 'El monto debe ser mayor a 0.', 'danger');
      return;
    }

    addExpense(amount, cat, desc, date);

    form.reset();
    form.classList.remove('was-validated');
    dateInp.value = today();

    showAlert('expense-alert', `Gasto de ${formatMoney(parseFloat(amount))} registrado correctamente.`, 'success');
    showToast('Gasto registrado', 'success');

    renderDashboard();
    renderHistory();
  });
}

function renderQuickCategories() {
  const c = document.getElementById('quick-categories');
  c.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => `
    <div class="col-4">
      <button type="button" class="btn btn-outline-secondary w-100 py-2 quick-btn" data-cat="${key}">
        <span class="fs-5 d-block">${cat.icon}</span>
        <small>${cat.name}</small>
      </button>
    </div>`).join('');

  c.querySelectorAll('.quick-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      document.getElementById('inp-category').value = btn.dataset.cat;
      document.getElementById('inp-amount').focus();
    })
  );
}
