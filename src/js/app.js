// ============================================================
//  GastoSmart – app.js
//  PWA para control de gastos con presupuestos y gráficos
// ============================================================

'use strict';

// ==================== SERVICE WORKER ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[App] SW registrado. Scope:', reg.scope);

        // Notificar cuando hay una actualización disponible
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

    // Recargar cuando el SW toma control (sin pedir permiso)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

// ==================== CONECTIVIDAD ====================
window.addEventListener('online',  () => {
  document.getElementById('offline-banner').classList.add('d-none');
  showToast('Conexión restaurada', 'success');
});
window.addEventListener('offline', () => {
  document.getElementById('offline-banner').classList.remove('d-none');
  showToast('Sin conexión – modo offline activo', 'warning');
});

// ==================== CONSTANTES ====================
const CATEGORIES = {
  comida:     { name: 'Comida',     icon: '🍔', color: '#e63946' },
  transporte: { name: 'Transporte', icon: '🚗', color: '#457b9d' },
  ocio:       { name: 'Ocio',       icon: '🎮', color: '#f4a261' },
  salud:      { name: 'Salud',      icon: '💊', color: '#2a9d8f' },
  educacion:  { name: 'Educación',  icon: '📚', color: '#9b5de5' },
  hogar:      { name: 'Hogar',      icon: '🏠', color: '#e9c46a' },
  ropa:       { name: 'Ropa',       icon: '👗', color: '#f15bb5' },
  trabajo:    { name: 'Trabajo',    icon: '💼', color: '#0077b6' },
  otros:      { name: 'Otros',      icon: '💰', color: '#8d99ae' }
};

const KEYS = {
  EXPENSES: 'gastosmart_expenses',
  BUDGETS:  'gastosmart_budgets'
};

// ==================== PERSISTENCIA ====================
function loadExpenses() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.EXPENSES) || '[]');
  } catch {
    console.error('[App] Error al leer gastos del storage');
    return [];
  }
}

function saveExpenses(list) {
  try {
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(list));
  } catch (err) {
    showToast('Almacenamiento lleno. No se pudo guardar.', 'danger');
    console.error('[App] Error al guardar gastos:', err);
  }
}

function loadBudgets() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.BUDGETS) || '{}');
  } catch {
    console.error('[App] Error al leer presupuestos del storage');
    return {};
  }
}

function saveBudgets(data) {
  try {
    localStorage.setItem(KEYS.BUDGETS, JSON.stringify(data));
  } catch (err) {
    showToast('Almacenamiento lleno. No se pudo guardar.', 'danger');
    console.error('[App] Error al guardar presupuestos:', err);
  }
}

// ==================== HELPERS DE FECHA ====================
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatMonth(mm) {          // "2025-03" → "Marzo 2025"
  const [y, m] = mm.split('-');
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

function formatDate(d) {            // "2025-03-08" → "08/03/2025"
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

function formatMoney(n) {           // 1234.5 → "$1,234.50"
  const v = parseFloat(n) || 0;
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==================== OPERACIONES GASTOS ====================
function addExpense(amount, category, description, date) {
  const expense = {
    id:          Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    amount:      parseFloat(amount),
    category,
    description: description.trim(),
    date,
    month:       date.slice(0, 7)
  };
  const list = loadExpenses();
  list.unshift(expense);
  saveExpenses(list);
  return expense;
}

function deleteExpense(id) {
  saveExpenses(loadExpenses().filter(e => e.id !== id));
}

function expensesByMonth(month) {
  return loadExpenses().filter(e => e.month === month);
}

function totalByCategory(expenses) {
  return expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
}

// ==================== OPERACIONES PRESUPUESTO ====================
function budgetForMonth(month) {
  return loadBudgets()[month] || { income: 0, categories: {}, total: 0 };
}

function saveBudgetMonth(month, income, categories) {
  const all = loadBudgets();
  const total = Object.values(categories).reduce((s, v) => s + v, 0);
  all[month] = { income: parseFloat(income) || 0, categories, total };
  saveBudgets(all);
}

// ==================== TOAST ====================
function showToast(msg, type = 'info') {
  const el  = document.getElementById('app-toast');
  const body = document.getElementById('toast-body');
  const colorMap = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning text-dark', info: 'bg-info' };
  body.textContent = msg;
  el.className = `toast align-items-center border-0 text-white ${colorMap[type] || 'bg-secondary'}`;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 }).show();
}

// ==================== ALERT INLINE ====================
function showAlert(containerId, msg, type) {
  const c = document.getElementById(containerId);
  c.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show py-2 small" role="alert">
      ${escapeHtml(msg)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>`;
  setTimeout(() => { c.innerHTML = ''; }, 5000);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}

// ==================== DASHBOARD ====================
let chartCat = null;
let chartBar = null;

function renderDashboard() {
  const month    = currentMonth();
  const expenses = expensesByMonth(month);
  const budget   = budgetForMonth(month);
  const spent    = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget.income - spent;

  // Cards
  document.getElementById('card-income').textContent    = formatMoney(budget.income);
  document.getElementById('card-spent').textContent     = formatMoney(spent);
  document.getElementById('card-budgeted').textContent  = formatMoney(budget.total);
  document.getElementById('card-remaining').textContent = formatMoney(remaining);

  renderBudgetProgress(expenses, budget);
  renderCategoryChart(expenses);
  renderBudgetChart(expenses, budget);
  renderRecentExpenses(expenses.slice(0, 6));
}

function renderBudgetProgress(expenses, budget) {
  const container = document.getElementById('budget-progress-container');
  const totals    = totalByCategory(expenses);
  const entries   = Object.entries(budget.categories).filter(([, v]) => v > 0);

  if (!entries.length) {
    container.innerHTML = '<p class="text-muted text-center small mb-0">Configure su presupuesto mensual</p>';
    return;
  }

  container.innerHTML = entries.map(([cat, budgeted]) => {
    const spent = totals[cat] || 0;
    const pct   = Math.min((spent / budgeted) * 100, 100).toFixed(1);
    const cls   = parseFloat(pct) >= 100 ? 'bg-danger' : parseFloat(pct) >= 80 ? 'bg-warning' : 'bg-success';
    return `
      <div class="mb-2">
        <div class="d-flex justify-content-between small mb-1">
          <span>${CATEGORIES[cat].icon} ${CATEGORIES[cat].name}</span>
          <span>${formatMoney(spent)} / ${formatMoney(budgeted)}</span>
        </div>
        <div class="progress" style="height:8px;" role="progressbar"
             aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar ${cls}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

function renderCategoryChart(expenses) {
  const totals  = totalByCategory(expenses);
  const catKeys = Object.keys(totals);
  const canvas  = document.getElementById('chartCategory');
  const empty   = document.getElementById('chartCategory-empty');

  if (chartCat) { chartCat.destroy(); chartCat = null; }

  if (!catKeys.length) {
    canvas.classList.add('d-none');
    empty.classList.remove('d-none');
    return;
  }
  canvas.classList.remove('d-none');
  empty.classList.add('d-none');

  chartCat = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels:   catKeys.map(k => `${CATEGORIES[k].icon} ${CATEGORIES[k].name}`),
      datasets: [{
        data:            catKeys.map(k => totals[k]),
        backgroundColor: catKeys.map(k => CATEGORIES[k].color),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${formatMoney(ctx.raw)}` } }
      }
    }
  });
}

function renderBudgetChart(expenses, budget) {
  const totals = totalByCategory(expenses);
  const cats   = Object.keys(CATEGORIES);

  if (chartBar) { chartBar.destroy(); chartBar = null; }

  chartBar = new Chart(
    document.getElementById('chartBudgetVsActual').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels: cats.map(k => `${CATEGORIES[k].icon}\n${CATEGORIES[k].name}`),
        datasets: [
          {
            label: 'Presupuesto',
            data:  cats.map(k => budget.categories[k] || 0),
            backgroundColor: 'rgba(54,162,235,0.75)',
            borderColor:     'rgba(54,162,235,1)',
            borderWidth: 1
          },
          {
            label: 'Gasto real',
            data:  cats.map(k => totals[k] || 0),
            backgroundColor: 'rgba(230,57,70,0.75)',
            borderColor:     'rgba(230,57,70,1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => formatMoney(v), font: { size: 10 } }
          },
          x: { ticks: { font: { size: 9 } } }
        },
        plugins: {
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}` } }
        }
      }
    }
  );
}

function renderRecentExpenses(expenses) {
  const ul = document.getElementById('recent-list');
  if (!expenses.length) {
    ul.innerHTML = '<li class="list-group-item text-center text-muted py-3">Sin gastos registrados este mes</li>';
    return;
  }
  ul.innerHTML = expenses.map(e => `
    <li class="list-group-item d-flex justify-content-between align-items-center py-2">
      <div>
        <span class="me-2">${CATEGORIES[e.category]?.icon || '💰'}</span>
        <strong>${formatMoney(e.amount)}</strong>
        <br>
        <small class="text-muted">${escapeHtml(e.description || CATEGORIES[e.category]?.name)} · ${formatDate(e.date)}</small>
      </div>
      <span class="badge rounded-pill" style="background:${CATEGORIES[e.category]?.color};">${CATEGORIES[e.category]?.name}</span>
    </li>`).join('');
}

// ==================== FORMULARIO GASTO ====================
function initExpenseForm() {
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

    const amount  = document.getElementById('inp-amount').value;
    const cat     = document.getElementById('inp-category').value;
    const desc    = document.getElementById('inp-description').value;
    const date    = document.getElementById('inp-date').value;

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

// ==================== FORMULARIO PRESUPUESTO ====================
function initBudgetForm() {
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

    const month    = monthInp.value;
    const income   = parseFloat(incomeInp.value) || 0;
    const cats     = {};
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
  const income    = parseFloat(document.getElementById('inp-income').value) || 0;
  let allocated   = 0;
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

// ==================== HISTORIAL ====================
let pendingDeleteId = null;

function initHistory() {
  const monthInp = document.getElementById('hist-month');
  const catSel   = document.getElementById('hist-category');

  monthInp.value = currentMonth();
  monthInp.addEventListener('change', renderHistory);
  catSel.addEventListener('change',   renderHistory);

  // Confirmar borrado
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

function renderHistory() {
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

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  // Mostrar mes actual en la barra
  document.getElementById('lbl-month').textContent = formatMonth(currentMonth());

  // Estado offline inicial
  if (!navigator.onLine) {
    document.getElementById('offline-banner').classList.remove('d-none');
  }

  // Inicializar cada sección
  initExpenseForm();
  initBudgetForm();
  initHistory();
  renderDashboard();

  // Refrescar al cambiar de pestaña
  document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab =>
    tab.addEventListener('shown.bs.tab', evt => {
      const target = evt.target.getAttribute('data-bs-target');
      if (target === '#tab-dashboard') renderDashboard();
      if (target === '#tab-history')   renderHistory();
    })
  );
});
