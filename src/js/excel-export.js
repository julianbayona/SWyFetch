// ============================================================
//  GastoSmart – excel-export.js
//  Genera y descarga un archivo Excel (.xlsx) del reporte mensual
//  Usa la librería SheetJS (XLSX) cargada globalmente desde CDN
// ============================================================

import { CATEGORIES } from './constants.js';
import { formatMonth, formatDate } from './helpers.js';
import { expensesByMonth, totalByCategory, budgetForMonth } from './expenses.js';
import { showToast } from './ui.js';

/**
 * Exporta el reporte del mes seleccionado (y categoría si aplica)
 * a un archivo .xlsx con hasta dos hojas:
 * "Resumen por Categoría" (solo modo Todas) y "Detalle de Gastos".
 */
export function exportReportToExcel() {
  const month     = document.getElementById('report-month').value;
  const catFilter = document.getElementById('report-category').value; // "" = todas

  const allExpenses = expensesByMonth(month);
  const expenses    = catFilter ? allExpenses.filter(e => e.category === catFilter) : allExpenses;
  const budget      = budgetForMonth(month);
  const totals      = totalByCategory(expenses);
  const totalSpent  = expenses.reduce((s, e) => s + e.amount, 0);

  if (!expenses.length) {
    showToast('No hay gastos para exportar con este filtro.', 'warning');
    return;
  }

  const wb = XLSX.utils.book_new();

  // ===== Hoja 1: Resumen por Categoría (solo modo "Todas") =====
  if (!catFilter) {
    const summaryRows = buildSummaryRows(totals, budget, totalSpent, month);
    const wsSummary   = XLSX.utils.aoa_to_sheet(summaryRows);
    applyColumnWidths(wsSummary, [22, 16, 16, 16, 14]);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Categoría');
  }

  // ===== Hoja 2 (o 1 si categoría filtrada): Detalle de Gastos =====
  const detailRows = buildDetailRows(expenses);
  const wsDetail   = XLSX.utils.aoa_to_sheet(detailRows);
  applyColumnWidths(wsDetail, [14, 18, 16, 30, 14]);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle de Gastos');

  // Descargar
  const catSuffix = catFilter ? `_${CATEGORIES[catFilter].name}` : '';
  const filename  = `GastoSmart_Reporte_${month}${catSuffix}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`Reporte exportado: ${filename}`, 'success');
}

// ==================== HOJA RESUMEN ====================

function buildSummaryRows(totals, budget, totalSpent, month) {
  const rows = [];

  // Encabezado del reporte
  rows.push(['GastoSmart – Reporte Mensual']);
  rows.push(['Mes:', formatMonth(month)]);
  rows.push(['Ingreso:', budget.income]);
  rows.push(['Total Gastado:', totalSpent]);
  rows.push(['Disponible:', budget.income - totalSpent]);
  rows.push([]); // fila vacía

  // Encabezados de tabla
  rows.push(['Categoría', 'Gastado', 'Presupuesto', 'Diferencia', '% del Total']);

  // Filas por categoría
  const catKeys = Object.keys(CATEGORIES);
  const dataRows = catKeys
    .map(key => {
      const spent    = totals[key] || 0;
      const budgeted = budget.categories[key] || 0;
      const diff     = budgeted - spent;
      const pct      = totalSpent > 0 ? parseFloat(((spent / totalSpent) * 100).toFixed(1)) : 0;
      return { key, spent, budgeted, diff, pct };
    })
    .filter(r => r.spent > 0 || r.budgeted > 0)
    .sort((a, b) => b.spent - a.spent);

  for (const r of dataRows) {
    rows.push([CATEGORIES[r.key].name, r.spent, r.budgeted, r.diff, r.pct + '%']);
  }

  // Fila de totales
  const totalBudgeted = dataRows.reduce((s, r) => s + r.budgeted, 0);
  rows.push([]);
  rows.push(['TOTAL', totalSpent, totalBudgeted, totalBudgeted - totalSpent, '100%']);

  return rows;
}

// ==================== HOJA DETALLE ====================

function buildDetailRows(expenses) {
  const rows = [];

  rows.push(['Fecha', 'Categoría', 'Monto', 'Descripción', 'ID']);

  const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const e of sorted) {
    rows.push([
      formatDate(e.date),
      CATEGORIES[e.category]?.name || e.category,
      e.amount,
      e.description || '',
      e.id
    ]);
  }

  return rows;
}

// ==================== UTILIDADES ====================

function applyColumnWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}
