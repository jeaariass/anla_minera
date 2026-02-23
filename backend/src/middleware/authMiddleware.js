const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

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
      // Distinguir si el token venció o si simplemente es inválido
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "La sesión ha expirado. Por favor inicia sesión nuevamente.",
          expired: true, // <-- El front usará esto para saber qué hacer
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

// Middleware de autorización por roles
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

module.exports = {
  authMiddleware,
  roleMiddleware,
};
