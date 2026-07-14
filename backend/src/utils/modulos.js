// backend/src/utils/modulos.js
// ============================================================
// Definición central de MÓDULOS de la plataforma (tarjetas del
// Home web). Cada título minero puede activar/desactivar módulos
// desde el modal "Editar Título" (tabla titulo_modulos).
//
// Espejo de:
//   frontend/src/constants/modulos.js
//
// Mantener ambos archivos sincronizados manualmente.
// ============================================================

const GRUPOS_MODULOS = [
  { id: "fri",          label: "Gestión FRI" },
  { id: "operacion",    label: "Actividades en Campo" },
  { id: "certificados", label: "Certificados y Ventas" },
  { id: "admin",        label: "Administración" },
];

const MODULOS = [
  { id: "formularios_fri",     label: "Formularios FRI",           emoji: "📄",  grupo: "fri",          orden: 1  },
  { id: "dashboard_fri",       label: "Estadísticas FRI",          emoji: "📊",  grupo: "fri",          orden: 2  },
  { id: "reportes",            label: "Exportar Reportes",         emoji: "📥",  grupo: "fri",          orden: 3  },
  { id: "registrar_operacion", label: "Registrar Operación",       emoji: "🏗️", grupo: "operacion",    orden: 4  },
  { id: "dashboard_operacion", label: "Estadísticas de Operación", emoji: "📈",  grupo: "operacion",    orden: 5  },
  { id: "mapa",                label: "Mapa de Actividades",       emoji: "🗺️", grupo: "operacion",    orden: 6  },
  { id: "catalogos_campo",     label: "Catálogos de Campo",        emoji: "🧰",  grupo: "operacion",    orden: 7  },
  { id: "certificado_origen",  label: "Certificado de Origen",     emoji: "📜",  grupo: "certificados", orden: 8  },
  { id: "gestor_archivos",     label: "Gestor de Archivos",        emoji: "🗂️", grupo: "certificados", orden: 9  },
  { id: "usuarios",            label: "Gestión de Usuarios",       emoji: "👥",  grupo: "admin",        orden: 10 },
];

const MODULOS_VALIDOS = MODULOS.map((m) => m.id);

module.exports = { MODULOS, MODULOS_VALIDOS, GRUPOS_MODULOS };
