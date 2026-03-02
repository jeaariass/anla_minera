// ============================================================
// permissions.js
// Sistema central de permisos y roles
// ============================================================

// -------------------------------------------------------
// DEFINICIÓN DE ROLES
// Estos deben coincidir exactamente con el enum Rol en schema.prisma
// -------------------------------------------------------
const ROLES = {
  ADMIN: "ADMIN",
  ASESOR: "ASESOR",
  TITULAR: "TITULAR",
  JEFE_PLANTA: "JEFE_PLANTA",
  OPERARIO: "OPERARIO",
};

// -------------------------------------------------------
// ROLES GLOBALES
// Estos roles pueden ver TODOS los títulos mineros.
// Los demás roles solo pueden ver su propio título minero.
//
// NOTA FUTURA: Si en el futuro los asesores necesitan
// estar asignados a títulos específicos, solo debes:
// 1. Quitar ASESOR de este array
// 2. Crear una tabla "asesor_titulos" en la BD
// 3. Actualizar la función puedeAccederATitulo() más abajo
// -------------------------------------------------------
const ROLES_GLOBALES = [ROLES.ADMIN, ROLES.ASESOR];

// -------------------------------------------------------
// PERMISOS POR ACCIÓN
// Define qué roles pueden realizar cada acción en el sistema.
// Si un rol no aparece en la lista de una acción, no puede hacerla.
// -------------------------------------------------------
const PERMISOS = {
  // ---------- USUARIOS ----------
  // Crear usuarios (admins crean cualquiera, asesores solo operarios)
  CREAR_USUARIO: [ROLES.ADMIN, ROLES.JEFE_PLANTA],
  // Editar datos de un usuario
  EDITAR_USUARIO: [ROLES.ADMIN, ROLES.JEFE_PLANTA],
  // Desactivar/activar un usuario
  CAMBIAR_ESTADO_USUARIO: [ROLES.ADMIN, ROLES.JEFE_PLANTA],
  // Ver listado de usuarios
  VER_USUARIOS: [ROLES.ADMIN, ROLES.ASESOR, ROLES.JEFE_PLANTA],
  // Asignar roles a usuarios
  ASIGNAR_ROL: [ROLES.ADMIN],

  // ---------- TÍTULOS MINEROS ----------
  CREAR_TITULO: [ROLES.ADMIN],
  EDITAR_TITULO: [ROLES.ADMIN],
  VER_TITULOS: [
    ROLES.ADMIN,
    ROLES.ASESOR,
    ROLES.TITULAR,
    ROLES.JEFE_PLANTA,
    ROLES.OPERARIO,
  ],

  // ---------- FORMULARIOS FRI ----------
  // Crear cualquier formulario FRI
  CREAR_FRI: [ROLES.ADMIN, ROLES.ASESOR],
  // Ver formularios FRI
  VER_FRI: [ROLES.ADMIN, ROLES.ASESOR, ROLES.TITULAR, ROLES.JEFE_PLANTA],
  // Editar un FRI (solo si está en BORRADOR o REVISION)
  EDITAR_FRI: [ROLES.ADMIN, ROLES.ASESOR],
  // Eliminar un FRI
  ELIMINAR_FRI: [ROLES.ADMIN],
  // Cambiar estado de un FRI (aprobar, rechazar, etc.)
  CAMBIAR_ESTADO_FRI: [ROLES.ADMIN, ROLES.ASESOR],
  // Enviar borradores
  ENVIAR_FRI: [ROLES.ADMIN, ROLES.ASESOR],

  // ---------- PUNTOS DE ACTIVIDAD ----------
  CREAR_PUNTO_ACTIVIDAD: [
    ROLES.ADMIN,
    ROLES.ASESOR,
    ROLES.JEFE_PLANTA,
    ROLES.OPERARIO,
  ],
  VER_PUNTO_ACTIVIDAD: [
    ROLES.ADMIN,
    ROLES.ASESOR,
    ROLES.JEFE_PLANTA,
    ROLES.OPERARIO,
  ],
  EDITAR_PUNTO_ACTIVIDAD: [
    ROLES.ADMIN,
    ROLES.ASESOR,
    ROLES.JEFE_PLANTA,
    ROLES.OPERARIO,
  ],
  APROBAR_PUNTO_ACTIVIDAD: [ROLES.ADMIN, ROLES.ASESOR, ROLES.JEFE_PLANTA],

  // ---------- REPORTES ----------
  EXPORTAR_REPORTE: [
    ROLES.ADMIN,
    ROLES.ASESOR,
    ROLES.TITULAR,
    ROLES.JEFE_PLANTA,
  ],

  // ---------- ESTADÍSTICAS ----------
  // Ver estadísticas globales (todos los títulos)
  VER_ESTADISTICAS_GLOBALES: [ROLES.ADMIN, ROLES.ASESOR],
  // Ver estadísticas de un título específico
  VER_ESTADISTICAS_TITULO: [
    ROLES.ADMIN,
    ROLES.ASESOR,
    ROLES.TITULAR,
    ROLES.JEFE_PLANTA,
  ],

  // ---------- FORMULARIOS OPERATIVOS (puntos y paradas) ----------
  // Crear formularios operativos
  CREAR_FORMULARIO_OPERATIVO: [ROLES.ADMIN, ROLES.JEFE_PLANTA, ROLES.OPERARIO],
  // Ver formularios operativos
  VER_FORMULARIO_OPERATIVO: [
    ROLES.ADMIN,
    ROLES.ASESOR, // puede ver pero no crear ni editar
    ROLES.TITULAR,
    ROLES.JEFE_PLANTA,
    ROLES.OPERARIO,
  ],
  // Editar formularios operativos propios (solo si están en estado editable)
  EDITAR_FORMULARIO_OPERATIVO: [ROLES.ADMIN, ROLES.JEFE_PLANTA, ROLES.OPERARIO],
  // Eliminar formularios operativos (no operarios)
  ELIMINAR_FORMULARIO_OPERATIVO: [ROLES.ADMIN, ROLES.JEFE_PLANTA],
  // Aprobar o rechazar formularios operativos enviados por operarios
  APROBAR_FORMULARIO_OPERATIVO: [ROLES.ADMIN, ROLES.JEFE_PLANTA],
  // Ver estadísticas operativas (puntos y paradas)
  // OPERARIO ve solo las suyas — esa restricción se aplica en el controller
  VER_ESTADISTICAS_OPERATIVAS: [
    ROLES.ADMIN,
    ROLES.ASESOR, // puede ver estadísticas pero no operar
    ROLES.TITULAR,
    ROLES.JEFE_PLANTA,
    ROLES.OPERARIO,
  ],
};

// -------------------------------------------------------
// FUNCIÓN: tienePermiso
// Verifica si un usuario tiene permiso para realizar una acción.
//
// Uso: tienePermiso(req.user, 'CREAR_FRI')
// Retorna: true o false
// -------------------------------------------------------
const tienePermiso = (usuario, accion) => {
  // Si la acción no existe en los permisos, nadie puede hacerla
  if (!PERMISOS[accion]) {
    return false;
  }
  return PERMISOS[accion].includes(usuario.rol);
};

// -------------------------------------------------------
// FUNCIÓN: esRolGlobal
// Verifica si el usuario tiene acceso a todos los títulos mineros.
//
// Uso: esRolGlobal(req.user)
// Retorna: true (ADMIN o ASESOR) o false (los demás roles)
// -------------------------------------------------------
const esRolGlobal = (usuario) => {
  return ROLES_GLOBALES.includes(usuario.rol);
};

// -------------------------------------------------------
// FUNCIÓN: puedeAccederATitulo
// La función más importante del sistema.
// Verifica si un usuario puede acceder a un título minero específico.
//
// Reglas:
// - ADMIN y ASESOR: siempre pueden (son roles globales)
// - Los demás roles: solo si su tituloMineroId coincide con el solicitado
//
// Uso: puedeAccederATitulo(req.user, '123-abc-456')
// Retorna: true o false
//
// NOTA FUTURA: Para asignar asesores a títulos específicos,
// esta función deberá ser async y consultar la BD.
// -------------------------------------------------------
const puedeAccederATitulo = (usuario, tituloMineroId) => {
  // Los roles globales siempre tienen acceso
  if (esRolGlobal(usuario)) {
    return true;
  }

  // Para roles locales, el usuario debe estar vinculado a ese título
  if (!usuario.tituloMineroId) {
    return false; // Usuario local sin título asignado: sin acceso
  }

  return usuario.tituloMineroId === tituloMineroId;
};

// -------------------------------------------------------
// FUNCIÓN: puedeGestionarUsuario
// Verifica si un usuario puede crear/editar a otro usuario.
// Tiene reglas adicionales más allá del simple permiso de rol:
//
// - ADMIN: puede gestionar a cualquiera
// - ASESOR: solo puede crear/editar OPERARIOS
// - JEFE_PLANTA: solo puede gestionar usuarios de su mismo título minero
// -------------------------------------------------------
const puedeGestionarUsuario = (usuarioActual, usuarioObjetivo) => {
  // Admin puede gestionar a cualquiera
  if (usuarioActual.rol === ROLES.ADMIN) {
    return true;
  }

  // Asesor solo puede gestionar operarios
  if (usuarioActual.rol === ROLES.ASESOR) {
    return usuarioObjetivo.rol === ROLES.OPERARIO;
  }

  // Jefe de planta solo puede gestionar usuarios de su título minero
  if (usuarioActual.rol === ROLES.JEFE_PLANTA) {
    const mismoTitulo =
      usuarioActual.tituloMineroId === usuarioObjetivo.tituloMineroId;
    // Además, no puede gestionar a otros jefes de planta ni roles superiores
    const rolesGestionables = [ROLES.OPERARIO];
    return mismoTitulo && rolesGestionables.includes(usuarioObjetivo.rol);
  }

  return false;
};

// -------------------------------------------------------
// FUNCIÓN: puedeCambiarRol
// Verifica si un usuario puede asignar un determinado rol a otro.
// Solo el ADMIN puede asignar cualquier rol.
// -------------------------------------------------------
const puedeCambiarRol = (usuarioActual, nuevoRol) => {
  if (usuarioActual.rol === ROLES.ADMIN) {
    return true;
  }
  // Ningún otro rol puede cambiar roles
  return false;
};

// -------------------------------------------------------
// EXPORTACIONES
// Esto hace que las funciones estén disponibles en otros archivos
// cuando hagan: const { tienePermiso } = require('./utils/permissions')
// -------------------------------------------------------
module.exports = {
  ROLES,
  PERMISOS,
  tienePermiso,
  esRolGlobal,
  puedeAccederATitulo,
  puedeGestionarUsuario,
  puedeCambiarRol,
};
