// backend/src/utils/excelSanitize.js
// Neutraliza el "CSV/Excel Formula Injection": si un texto libre empieza
// con =, +, -, o @, Excel puede interpretarlo como fórmula al abrirlo.
// Anteponer un apóstrofe fuerza a que se trate siempre como texto plano.

function sanitizarCelda(valor) {
  if (typeof valor !== "string") return valor; // números/fechas/null pasan igual, sin tocar
  if (/^[=+\-@]/.test(valor)) {
    return "'" + valor;
  }
  return valor;
}

// Sanitiza todos los valores de texto de un objeto de una sola vez —
// útil para envolver el objeto que se le pasa a worksheet.addRow({...}).
function sanitizarFila(fila) {
  const limpia = {};
  for (const [key, val] of Object.entries(fila)) {
    limpia[key] = sanitizarCelda(val);
  }
  return limpia;
}

module.exports = { sanitizarCelda, sanitizarFila };
