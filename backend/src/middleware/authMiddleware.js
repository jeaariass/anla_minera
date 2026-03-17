// authMiddleware.js

const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { tienePermiso, puedeAccederATitulo } = require("../utils/permissions");

const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token no proporcionado",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "La sesión ha expirado. Por favor inicia sesión nuevamente.",
          expired: true,
        });
      }
      return res.status(401).json({
        success: false,
        message: "Token inválido",
        expired: false,
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
    });

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: "Usuario desactivado",
      });
    }

    req.user = usuario;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

const roleMiddleware = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: "No autorizado",
      });
    }
    next();
  };
};

// -------------------------------------------------------
// En lugar de pasar una lista de roles, se pasa el nombre
// semántico de la acción definida en permissions.js.
//
// Uso en rutas:
//   router.post('/fri', authMiddleware, permisoMiddleware('CREAR_FRI'), handler)
//
// Ventaja: si en el futuro cambia qué roles pueden crear FRIs,
// solo se edita permissions.js, no cada ruta.
// -------------------------------------------------------
const permisoMiddleware = (accion) => {
  return (req, res, next) => {
    if (!tienePermiso(req.user, accion)) {
      return res.status(403).json({
        success: false,
        message: `No tienes permiso para realizar esta acción: ${accion}`,
      });
    }
    next();
  };
};

// -------------------------------------------------------
// Verifica que el usuario pueda acceder al título minero
// indicado en req.params.tituloId o req.body.tituloMineroId.
//
// Uso en rutas:
//   router.get('/titulos/:tituloId/fris', authMiddleware, tituloMiddleware, handler)
//
// Roles globales (ADMIN, ASESOR) siempre pasan.
// Roles locales solo pasan si el tituloId coincide con el suyo.
// -------------------------------------------------------
const tituloMiddleware = (req, res, next) => {
  // El ID del título puede venir como parámetro de ruta o en el body
  const tituloId = req.params.tituloId || req.body.tituloMineroId;

  // Si no hay ID de título en la petición, dejamos pasar
  // (la validación de existencia la hace el handler)
  if (!tituloId) {
    return next();
  }

  if (!puedeAccederATitulo(req.user, tituloId)) {
    return res.status(403).json({
      success: false,
      message: "No tienes acceso a este título minero",
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  roleMiddleware,
  permisoMiddleware, // nuevo — reemplaza a roleMiddleware en rutas nuevas
  tituloMiddleware, // nuevo — filtra acceso por título minero
};
