// ============================================================
//  GastoSmart – storage.js
//  Persistencia en localStorage
// ============================================================

import { KEYS } from './constants.js';
import { showToast } from './ui.js';

export function loadExpenses() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.EXPENSES) || '[]');
  } catch {
    console.error('[App] Error al leer gastos del storage');
    return [];
  }
}

export function saveExpenses(list) {
  try {
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(list));
  } catch (err) {
    showToast('Almacenamiento lleno. No se pudo guardar.', 'danger');
    console.error('[App] Error al guardar gastos:', err);
  }
}

export function loadBudgets() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.BUDGETS) || '{}');
  } catch {
    console.error('[App] Error al leer presupuestos del storage');
    return {};
  }
}

export function saveBudgets(data) {
  try {
    localStorage.setItem(KEYS.BUDGETS, JSON.stringify(data));
  } catch (err) {
    showToast('Almacenamiento lleno. No se pudo guardar.', 'danger');
    console.error('[App] Error al guardar presupuestos:', err);
  }
}
