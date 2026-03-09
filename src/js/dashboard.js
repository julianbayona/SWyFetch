// ============================================================
//  GastoSmart – dashboard.js
//  Renderizado del dashboard, gráficos y progreso
// ============================================================

import { CATEGORIES } from './constants.js';
import { formatMoney, formatDate, currentMonth, escapeHtml } from './helpers.js';
import { expensesByMonth, totalByCategory, budgetForMonth } from './expenses.js';

let chartCat = null;
let chartBar = null;

export function renderDashboard() {
  const month    = currentMonth();
  const expenses = expensesByMonth(month);
  const budget   = budgetForMonth(month);
  const spent    = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget.income - spent;

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
