// ============================================================
//  GastoSmart – reports.js
//  Reportes mensuales filtrados por categoría
// ============================================================

import { CATEGORIES } from './constants.js';
import { currentMonth, formatMonth, formatMoney, formatDate, escapeHtml } from './helpers.js';
import { expensesByMonth, totalByCategory, budgetForMonth } from './expenses.js';
import { exportReportToExcel } from './excel-export.js';

let chartReport = null;

export function initReports() {
  document.getElementById('report-month').value = currentMonth();

  document.getElementById('btn-generate-report').addEventListener('click', generateReport);
  document.getElementById('btn-export-excel').addEventListener('click', exportReportToExcel);
}

// Se llama al cambiar de tab para no regenerar automáticamente
export function renderReports() {
  // No-op: el reporte solo se genera al pulsar el botón
}

function generateReport() {
  const month    = document.getElementById('report-month').value;
  const catFilter = document.getElementById('report-category').value; // "" = todas

  const allExpenses = expensesByMonth(month);
  const expenses    = catFilter ? allExpenses.filter(e => e.category === catFilter) : allExpenses;
  const budget      = budgetForMonth(month);
  const totals      = totalByCategory(expenses);
  const totalSpent  = expenses.reduce((s, e) => s + e.amount, 0);

  // Mostrar contenido, ocultar placeholder
  document.getElementById('report-content').classList.remove('d-none');
  document.getElementById('report-placeholder').classList.add('d-none');

  // Título
  const catLabel = catFilter ? `${CATEGORIES[catFilter].icon} ${CATEGORIES[catFilter].name}` : 'Todas las categorías';
  document.getElementById('report-title').textContent = `${formatMonth(month)} — ${catLabel}`;

  renderOverviewCards(expenses, budget, totalSpent, catFilter);
  renderChart(expenses, totals, budget, catFilter);
  renderExpenseList(expenses);

  // Tabla resumen solo cuando se muestran todas las categorías
  const summaryCard = document.getElementById('report-summary-card');
  if (catFilter) {
    summaryCard.classList.add('d-none');
  } else {
    summaryCard.classList.remove('d-none');
    renderCategoryTable(allExpenses, totals, budget, totalSpent);
  }
}

// ==================== OVERVIEW CARDS ====================

function renderOverviewCards(expenses, budget, totalSpent, catFilter) {
  const budgeted  = catFilter ? (budget.categories[catFilter] || 0) : budget.total;
  const income    = budget.income;
  const diff      = budgeted - totalSpent;
  const usagePct  = budgeted > 0 ? ((totalSpent / budgeted) * 100).toFixed(1) : 0;

  document.getElementById('report-overview').innerHTML = `
    <div class="col-6 col-md-3">
      <div class="card h-100 border-0 shadow-sm">
        <div class="card-body p-3 text-center">
          <div class="small text-muted">Total Gastado</div>
          <div class="fw-bold text-danger">${formatMoney(totalSpent)}</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card h-100 border-0 shadow-sm">
        <div class="card-body p-3 text-center">
          <div class="small text-muted">${catFilter ? 'Presupuesto Cat.' : 'Ingreso'}</div>
          <div class="fw-bold text-success">${formatMoney(catFilter ? budgeted : income)}</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card h-100 border-0 shadow-sm">
        <div class="card-body p-3 text-center">
          <div class="small text-muted">${diff >= 0 ? 'Restante' : 'Excedido'}</div>
          <div class="fw-bold ${diff >= 0 ? 'text-success' : 'text-danger'}">${formatMoney(Math.abs(diff))}</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card h-100 border-0 shadow-sm">
        <div class="card-body p-3 text-center">
          <div class="small text-muted">Uso del Presupuesto</div>
          <div class="fw-bold">${usagePct}%</div>
          <div class="small text-muted">${expenses.length} gasto${expenses.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>`;
}

// ==================== GRÁFICO ====================

function renderChart(expenses, totals, budget, catFilter) {
  const canvas = document.getElementById('chartReport');
  const empty  = document.getElementById('chartReport-empty');

  if (chartReport) { chartReport.destroy(); chartReport = null; }

  if (!expenses.length) {
    canvas.classList.add('d-none');
    empty.classList.remove('d-none');
    return;
  }
  canvas.classList.remove('d-none');
  empty.classList.add('d-none');

  if (catFilter) {
    // Una sola categoría → gráfico de barras por día
    renderDailyChart(canvas, expenses, catFilter);
  } else {
    // Todas → gráfico horizontal presupuesto vs gasto
    renderAllCategoriesChart(canvas, totals, budget);
  }
}

function renderDailyChart(canvas, expenses, catKey) {
  // Agrupar gastos por fecha
  const byDate = {};
  for (const e of expenses) {
    byDate[e.date] = (byDate[e.date] || 0) + e.amount;
  }
  const dates  = Object.keys(byDate).sort();
  const values = dates.map(d => byDate[d]);
  const cat    = CATEGORIES[catKey];

  chartReport = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: dates.map(d => formatDate(d)),
      datasets: [{
        label: `${cat.icon} ${cat.name}`,
        data: values,
        backgroundColor: cat.color + 'CC',
        borderColor: cat.color,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => formatMoney(v), font: { size: 10 } }
        },
        x: { ticks: { font: { size: 10 } } }
      },
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${formatMoney(ctx.raw)}` } }
      }
    }
  });
}

function renderAllCategoriesChart(canvas, totals, budget) {
  const catKeys = Object.keys(CATEGORIES).filter(k => (totals[k] || 0) > 0 || (budget.categories[k] || 0) > 0);

  chartReport = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: catKeys.map(k => `${CATEGORIES[k].icon} ${CATEGORIES[k].name}`),
      datasets: [
        {
          label: 'Presupuesto',
          data: catKeys.map(k => budget.categories[k] || 0),
          backgroundColor: 'rgba(54,162,235,0.6)',
          borderColor: 'rgba(54,162,235,1)',
          borderWidth: 1
        },
        {
          label: 'Gasto Real',
          data: catKeys.map(k => totals[k] || 0),
          backgroundColor: catKeys.map(k => CATEGORIES[k].color + 'CC'),
          borderColor: catKeys.map(k => CATEGORIES[k].color),
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: v => formatMoney(v), font: { size: 10 } }
        },
        y: { ticks: { font: { size: 11 } } }
      },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}` } }
      }
    }
  });
}

// ==================== TABLA RESUMEN (TODAS) ====================

function renderCategoryTable(allExpenses, totals, budget, totalSpent) {
  const tbody = document.getElementById('report-table-body');
  const tfoot = document.getElementById('report-table-foot');

  const rows = Object.keys(CATEGORIES)
    .map(key => {
      const cat      = CATEGORIES[key];
      const spent    = totals[key] || 0;
      const budgeted = budget.categories[key] || 0;
      const diff     = budgeted - spent;
      const pct      = totalSpent > 0 ? ((spent / totalSpent) * 100).toFixed(1) : 0;
      const count    = allExpenses.filter(e => e.category === key).length;
      return { key, cat, spent, budgeted, diff, pct, count };
    })
    .filter(r => r.spent > 0 || r.budgeted > 0)
    .sort((a, b) => b.spent - a.spent);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Sin datos</td></tr>`;
    tfoot.innerHTML = '';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const diffClass = r.diff >= 0 ? 'text-success' : 'text-danger';
    const barPct    = r.budgeted > 0 ? Math.min((r.spent / r.budgeted) * 100, 100).toFixed(0) : (r.spent > 0 ? 100 : 0);
    const barColor  = barPct >= 100 ? 'bg-danger' : barPct >= 80 ? 'bg-warning' : 'bg-success';
    return `
      <tr>
        <td>
          <span class="me-1">${r.cat.icon}</span>
          <span class="fw-semibold">${r.cat.name}</span>
          <span class="badge bg-secondary ms-1">${r.count}</span>
        </td>
        <td class="text-end fw-semibold">${formatMoney(r.spent)}</td>
        <td class="text-end">${formatMoney(r.budgeted)}</td>
        <td class="text-end ${diffClass}">${formatMoney(r.diff)}</td>
        <td class="text-center">${r.pct}%</td>
        <td style="min-width:80px;">
          <div class="progress" style="height:6px;">
            <div class="progress-bar ${barColor}" style="width:${barPct}%"></div>
          </div>
        </td>
      </tr>`;
  }).join('');

  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0);
  const totalDiff     = totalBudgeted - totalSpent;
  tfoot.innerHTML = `
    <tr class="table-light fw-bold">
      <td>Total</td>
      <td class="text-end">${formatMoney(totalSpent)}</td>
      <td class="text-end">${formatMoney(totalBudgeted)}</td>
      <td class="text-end ${totalDiff >= 0 ? 'text-success' : 'text-danger'}">${formatMoney(totalDiff)}</td>
      <td class="text-center">100%</td>
      <td></td>
    </tr>`;
}

// ==================== LISTA DE GASTOS ====================

function renderExpenseList(expenses) {
  const ul = document.getElementById('report-expense-list');
  document.getElementById('report-expense-count').textContent = expenses.length;

  if (!expenses.length) {
    ul.innerHTML = '<li class="list-group-item text-center text-muted py-4">Sin gastos para este filtro</li>';
    return;
  }

  const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  ul.innerHTML = sorted.map(e => `
    <li class="list-group-item py-2">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <span class="me-1">${CATEGORIES[e.category]?.icon || '💰'}</span>
          <strong>${formatMoney(e.amount)}</strong>
          <br>
          <small class="text-muted">${escapeHtml(e.description || CATEGORIES[e.category]?.name)} · ${formatDate(e.date)}</small>
        </div>
        <span class="badge rounded-pill" style="background:${CATEGORIES[e.category]?.color};">${CATEGORIES[e.category]?.name}</span>
      </div>
    </li>`).join('');
}
