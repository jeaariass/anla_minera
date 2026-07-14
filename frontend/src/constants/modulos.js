// frontend/src/constants/modulos.js
// ============================================================
// Definición central de MÓDULOS de la plataforma (tarjetas del
// Home). Cada título minero puede activar/desactivar módulos
// desde el modal "Editar Título" (pestaña Títulos en /usuarios).
//
// Espejo de:
//   backend/src/utils/modulos.js
//
// Mantener ambos archivos sincronizados manualmente.
// El campo `ruta` mapea cada módulo a su ruta de React Router.
// ============================================================

export const GRUPOS_MODULOS = [
  { id: "fri",          label: "Gestión FRI",          color: "#667eea" },
  { id: "operacion",    label: "Actividades en Campo", color: "#e74c3c" },
  { id: "certificados", label: "Certificados y Ventas", color: "#059669" },
  { id: "admin",        label: "Administración",       color: "#1e3a5f" },
];

export const MODULOS = [
  { id: "formularios_fri",     label: "Formularios FRI",           emoji: "📄",  grupo: "fri",          orden: 1,  ruta: "/formularios" },
  { id: "dashboard_fri",       label: "Estadísticas FRI",          emoji: "📊",  grupo: "fri",          orden: 2,  ruta: "/dashboard" },
  { id: "reportes",            label: "Exportar Reportes",         emoji: "📥",  grupo: "fri",          orden: 3,  ruta: "/reportes" },
  { id: "registrar_operacion", label: "Registrar Operación",       emoji: "🏗️", grupo: "operacion",    orden: 4,  ruta: "/formularios-operacion" },
  { id: "dashboard_operacion", label: "Estadísticas de Operación", emoji: "📈",  grupo: "operacion",    orden: 5,  ruta: "/dashboard-operacion" },
  { id: "mapa",                label: "Mapa de Actividades",       emoji: "🗺️", grupo: "operacion",    orden: 6,  ruta: "/mapa" },
  { id: "catalogos_campo",     label: "Catálogos de Campo",        emoji: "🧰",  grupo: "operacion",    orden: 7,  ruta: "/catalogos-campo" },
  { id: "certificado_origen",  label: "Certificado de Origen",     emoji: "📜",  grupo: "certificados", orden: 8,  ruta: "/certificado-origen" },
  { id: "gestor_archivos",     label: "Gestor de Archivos",        emoji: "🗂️", grupo: "certificados", orden: 9,  ruta: "/gestor-archivos" },
  { id: "usuarios",            label: "Gestión de Usuarios",       emoji: "👥",  grupo: "admin",        orden: 10, ruta: "/usuarios" },
];

export const MODULOS_VALIDOS = MODULOS.map((m) => m.id);
