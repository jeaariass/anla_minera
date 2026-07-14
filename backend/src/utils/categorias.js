// backend/src/utils/categorias.js
// ============================================================
// Definición central de categorías de "Actividades en Campo".
// Cualquier controller que valide o liste categorías debe importar
// desde aquí — NO declarar arrays locales.
//
// Para agregar una categoría nueva:
// 1. Añadir entrada al array CATEGORIAS abajo.
// 2. Replicar el mismo objeto en:
//      frontend/src/constants/categorias.js
//      tu-mina-mobile/src/utils/categorias.js
// 3. (Opcional) agregar CSS para badges/chips si la UI los usa.
// ============================================================

const CATEGORIAS = [
  { id: "extraccion",      label: "Extracción",      emoji: "⛏️", color: "#e74c3c", orden: 1, esCampo: true  },
  { id: "acopio",          label: "Acopio",          emoji: "📦", color: "#3498db", orden: 2, esCampo: true  },
  { id: "procesamiento",   label: "Procesamiento",   emoji: "⚙️", color: "#f39c12", orden: 3, esCampo: true  },
  { id: "reprocesamiento", label: "Reprocesamiento", emoji: "♻️", color: "#14b8a6", orden: 4, esCampo: true  },
  { id: "inspeccion",      label: "Inspección",      emoji: "🔍", color: "#27ae60", orden: 5, esCampo: false },
];

// Ids válidos para validación de input (incluye inspeccion porque
// el catálogo de minerales del Certificado de Origen vive ahí).
const CATEGORIAS_VALIDAS = CATEGORIAS.map((c) => c.id);

// Subset que se muestra en formularios operativos (excluye inspeccion).
const CATEGORIAS_CAMPO = CATEGORIAS.filter((c) => c.esCampo);

const byId           = (id) => CATEGORIAS.find((c) => c.id === id) || null;
const colorDe        = (id) => byId(id)?.color ?? "#94a3b8";
const labelDe        = (id) => byId(id)?.label ?? id;
const emojiDe        = (id) => byId(id)?.emoji ?? "📍";
const labelConEmoji  = (id) => { const c = byId(id); return c ? `${c.emoji} ${c.label}` : id; };
const esCategoriaValida = (id) =>
  CATEGORIAS_VALIDAS.includes(String(id || "").toLowerCase());

module.exports = {
  CATEGORIAS,
  CATEGORIAS_VALIDAS,
  CATEGORIAS_CAMPO,
  byId,
  colorDe,
  labelDe,
  emojiDe,
  labelConEmoji,
  esCategoriaValida,
};
