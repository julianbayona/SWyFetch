// ============================================================
//  GastoSmart – expenses.js
//  Operaciones CRUD de gastos y presupuestos (capa de datos)
// ============================================================

import { loadExpenses, saveExpenses, loadBudgets, saveBudgets } from './storage.js';

// ==================== GASTOS ====================

export function addExpense(amount, category, description, date) {
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

export function deleteExpense(id) {
  saveExpenses(loadExpenses().filter(e => e.id !== id));
}

export function expensesByMonth(month) {
  return loadExpenses().filter(e => e.month === month);
}

export function totalByCategory(expenses) {
  return expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
}

// ==================== PRESUPUESTOS ====================

export function budgetForMonth(month) {
  return loadBudgets()[month] || { income: 0, categories: {}, total: 0 };
}

export function saveBudgetMonth(month, income, categories) {
  const all   = loadBudgets();
  const total = Object.values(categories).reduce((s, v) => s + v, 0);
  all[month]  = { income: parseFloat(income) || 0, categories, total };
  saveBudgets(all);
}
