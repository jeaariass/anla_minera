// tu-mina-mobile/src/utils/categorias.js
// ============================================================
// Definición central de categorías de "Actividades en Campo".
// Importa desde aquí — NO declares arrays locales en pantallas.
//
// Espejo de:
//   backend/src/utils/categorias.js
//   frontend/src/constants/categorias.js
// ============================================================

export const CATEGORIAS = [
  { id: 'extraccion',      label: 'Extracción',      emoji: '⛏️', color: '#e74c3c', orden: 1, esCampo: true  },
  { id: 'acopio',          label: 'Acopio',          emoji: '📦', color: '#3498db', orden: 2, esCampo: true  },
  { id: 'procesamiento',   label: 'Procesamiento',   emoji: '⚙️', color: '#f39c12', orden: 3, esCampo: true  },
  { id: 'reprocesamiento', label: 'Reprocesamiento', emoji: '♻️', color: '#14b8a6', orden: 4, esCampo: true  },
  { id: 'inspeccion',      label: 'Inspección',      emoji: '🔍', color: '#27ae60', orden: 5, esCampo: false },
];

export const CATEGORIAS_VALIDAS = CATEGORIAS.map((c) => c.id);
export const CATEGORIAS_CAMPO   = CATEGORIAS.filter((c) => c.esCampo);

export const byId          = (id) => CATEGORIAS.find((c) => c.id === id) || null;
export const colorDe       = (id) => byId(id)?.color ?? '#94a3b8';
export const labelDe       = (id) => byId(id)?.label ?? id;
export const emojiDe       = (id) => byId(id)?.emoji ?? '📍';
export const labelConEmoji = (id) => { const c = byId(id); return c ? `${c.emoji} ${c.label}` : id; };

export const CATEGORIA_COLORS = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.color]));
export const CATEGORIA_LABELS = Object.fromEntries(CATEGORIAS.map((c) => [c.id, labelConEmoji(c.id)]));
export const CATEGORIA_LABELS_SIN_EMOJI = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.label]));
