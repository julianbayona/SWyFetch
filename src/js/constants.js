// ============================================================
//  GastoSmart – constants.js
//  Categorías y claves de almacenamiento
// ============================================================

export const CATEGORIES = {
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

export const KEYS = {
  EXPENSES: 'gastosmart_expenses',
  BUDGETS:  'gastosmart_budgets'
};
