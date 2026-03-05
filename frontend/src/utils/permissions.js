// frontend/src/utils/permissions.js
// ============================================================
// Sistema de permisos del lado del cliente.
// Úsalo para mostrar/ocultar elementos según el rol del usuario.
// ============================================================

export const getUsuarioActual = () => {
  try {
    const userStr = localStorage.getItem("usuario");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const ROLES_GLOBALES = ["ADMIN", "ASESOR"];

export const esRolGlobal = (usuario) => {
  if (!usuario) return false;
  return ROLES_GLOBALES.includes(usuario.rol);
};

const PERMISOS = {
  // Usuarios
  CREAR_USUARIO: ["ADMIN", "JEFE_PLANTA"],
  EDITAR_USUARIO: ["ADMIN", "JEFE_PLANTA"],
  CAMBIAR_ESTADO_USUARIO: ["ADMIN", "JEFE_PLANTA"],
  VER_USUARIOS: ["ADMIN", "ASESOR", "JEFE_PLANTA"],
  ASIGNAR_ROL: ["ADMIN"],

  // Títulos mineros
  CREAR_TITULO: ["ADMIN"],
  EDITAR_TITULO: ["ADMIN"],
  VER_TITULOS: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA", "OPERARIO"],

  // Formularios FRI
  CREAR_FRI: ["ADMIN", "ASESOR"],
  VER_FRI: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA"],
  EDITAR_FRI: ["ADMIN", "ASESOR"],
  ELIMINAR_FRI: ["ADMIN"],
  CAMBIAR_ESTADO_FRI: ["ADMIN", "ASESOR"],
  ENVIAR_FRI: ["ADMIN", "ASESOR"],

  // Reportes
  EXPORTAR_REPORTE: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA"],

  // Estadísticas
  VER_ESTADISTICAS_GLOBALES: ["ADMIN", "ASESOR"],
  VER_ESTADISTICAS_TITULO: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA"],

  // Navegación — qué páginas puede ver cada rol
  VER_PAGINA_FORMULARIOS: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA"],
  VER_PAGINA_REPORTES: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA"],
  VER_PAGINA_DASHBOARD: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA"],
  VER_PAGINA_MAPA: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA", "OPERARIO"],
  VER_PAGINA_USUARIOS: ["ADMIN", "ASESOR", "JEFE_PLANTA"],

  // Certificado de Origen — todos los roles
  VER_PAGINA_CERTIFICADO_ORIGEN: [
    "ADMIN",
    "ASESOR",
    "TITULAR",
    "JEFE_PLANTA",
    "OPERARIO",
  ],

  // Gestor de Archivos — todos los roles
  VER_GESTOR_ARCHIVOS: [
    "ADMIN",
    "ASESOR",
    "TITULAR",
    "JEFE_PLANTA",
    "OPERARIO",
  ],

  // Formularios operativos
  CREAR_FORMULARIO_OPERATIVO: ["ADMIN", "JEFE_PLANTA", "OPERARIO"],
  VER_FORMULARIO_OPERATIVO: [
    "ADMIN",
    "ASESOR",
    "TITULAR",
    "JEFE_PLANTA",
    "OPERARIO",
  ],
  EDITAR_FORMULARIO_OPERATIVO: ["ADMIN", "JEFE_PLANTA", "OPERARIO"],
  ELIMINAR_FORMULARIO_OPERATIVO: ["ADMIN", "JEFE_PLANTA"],
  APROBAR_FORMULARIO_OPERATIVO: ["ADMIN", "JEFE_PLANTA"],
  VER_ESTADISTICAS_OPERATIVAS: [
    "ADMIN",
    "ASESOR",
    "TITULAR",
    "JEFE_PLANTA",
    "OPERARIO",
  ],

  VER_PAGINA_OPERACION: [
    "ADMIN",
    "ASESOR",
    "TITULAR",
    "JEFE_PLANTA",
    "OPERARIO",
  ],
};

export const tienePermiso = (accion) => {
  const usuario = getUsuarioActual();
  if (!usuario) return false;
  if (!PERMISOS[accion]) return false;
  return PERMISOS[accion].includes(usuario.rol);
};

export const puedeAccederATitulo = (tituloMineroId) => {
  const usuario = getUsuarioActual();
  if (!usuario) return false;
  if (esRolGlobal(usuario)) return true;
  return (
    usuario.tituloMineroId === tituloMineroId ||
    usuario.tituloMinero?.id === tituloMineroId
  );
};
