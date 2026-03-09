// ============================================================
//  GastoSmart – helpers.js
//  Funciones auxiliares de fecha, formato y utilidades
// ============================================================

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function formatMonth(mm) {          // "2025-03" → "Marzo 2025"
  const [y, m] = mm.split('-');
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

export function formatDate(d) {            // "2025-03-08" → "08/03/2025"
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

export function formatMoney(n) {           // 1234.5 → "$1,234.50"
  const v = parseFloat(n) || 0;
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}
