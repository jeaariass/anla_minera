// backend/src/middleware/moduloMiddleware.js
// ============================================================
// Bloquea endpoints de un módulo cuando el título minero lo
// tiene desactivado (tabla titulo_modulos).
//
// Uso en rutas (SIEMPRE después de authMiddleware, necesita req.user):
//   router.get("/", authMiddleware, moduloMiddleware("certificado_origen"), handler)
//
// Reglas:
// - ADMIN siempre pasa (si no, podría bloquearse a sí mismo).
// - Roles locales: se evalúa contra su usuario.tituloMineroId.
// - Roles globales (ASESOR): se evalúa contra el tituloMineroId
//   del query/body; sin título en el request, pasa (el handler
//   filtra por título igual).
// - Título sin filas en titulo_modulos (legacy, pre-backfill) o
//   módulo sin fila → activo.
// ============================================================

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const moduloMiddleware = (moduloId) => async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next(); // sin authMiddleware previo — no validar aquí
    if (user.rol === "ADMIN") return next();

    const tituloId =
      user.tituloMineroId ||
      req.query?.tituloMineroId ||
      req.body?.tituloMineroId;
    if (!tituloId) return next();

    const fila = await prisma.tituloModulo.findUnique({
      where: {
        tituloMineroId_modulo: { tituloMineroId: tituloId, modulo: moduloId },
      },
      select: { activo: true },
    });

    if (fila && !fila.activo) {
      return res.status(403).json({
        success: false,
        message: "Este módulo no está activo para tu título minero",
        moduloInactivo: moduloId,
      });
    }

    next();
  } catch (error) {
    // Un fallo del chequeo no debe tumbar el endpoint (la tabla
    // puede no existir aún antes del backfill).
    console.error(`moduloMiddleware(${moduloId}):`, error.message);
    next();
  }
};

module.exports = { moduloMiddleware };
