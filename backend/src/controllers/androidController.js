// backend/src/controllers/androidController.js
// Controlador para la aplicación Android de registro de producción

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { puedeAccederATitulo, esRolGlobal } = require("../utils/permissions");

// ============================================
// 1. OBTENER PUNTOS DE REFERENCIA POR TÍTULO MINERO
// ============================================
const getPuntosReferencia = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;

    if (!puedeAccederATitulo(req.user, tituloMineroId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }

    const puntos = await prisma.puntoReferencia.findMany({
      where: {
        tituloMineroId: tituloMineroId,
        activo: true,
      },
      orderBy: {
        orden: "asc",
      },
    });

    res.json({
      success: true,
      data: puntos,
    });
  } catch (error) {
    console.error("Error al obtener puntos de referencia:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener puntos de referencia",
      error: error.message,
    });
  }
};

// ============================================
// 2. INICIAR SESIÓN DE REGISTRO
// ============================================
const iniciarSesionRegistro = async (req, res) => {
  try {
    const { tituloMineroId, tipoMaquina, capacidadMaxM3 } = req.body;
    const usuarioId = req.user.id; // nunca confiar en el body

    if (!puedeAccederATitulo(req.user, tituloMineroId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }

    const puntos = await prisma.puntoReferencia.findMany({
      where: { tituloMineroId, activo: true },
      orderBy: { orden: "asc" },
    });

    if (puntos.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Se requieren al menos 2 puntos de referencia (Recolección y Acopio)",
      });
    }

    const sesion = {
      usuarioId,
      tituloMineroId,
      tipoMaquina,
      capacidadMaxM3,
      fechaInicio: new Date(),
      puntos,
      numeroCiclosCompletados: 0,
    };

    res.json({
      success: true,
      message: "Sesión de registro iniciada",
      data: sesion,
    });
  } catch (error) {
    console.error("Error al iniciar sesión de registro:", error);
    res.status(500).json({
      success: false,
      message: "Error al iniciar sesión de registro",
      error: error.message,
    });
  }
};

// ============================================
// 3. REGISTRAR UN CICLO COMPLETADO
// ============================================
const registrarCiclo = async (req, res) => {
  try {
    const {
      tituloMineroId,
      tipoMaquina,
      capacidadMaxM3,
      numeroCiclo,
      horaInicioCiclo,
      horaFinCiclo,
      latitudInicio,
      longitudInicio,
      latitudFin,
      longitudFin,
      puntoRecoleccion,
      puntoAcopio,
      distanciaRecorrida,
      observaciones,
      fecha,
    } = req.body;
    const usuarioId = req.user.id; // nunca confiar en el body

    if (!puedeAccederATitulo(req.user, tituloMineroId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }

    // Calcular duración en minutos
    const inicio = new Date(horaInicioCiclo);
    const fin = new Date(horaFinCiclo);
    const duracionMinutos = (fin - inicio) / (1000 * 60);

    // Crear el registro del ciclo
    const ciclo = await prisma.registroCicloProduccion.create({
      data: {
        usuarioId,
        tituloMineroId,
        tipoMaquina,
        capacidadMaxM3: parseFloat(capacidadMaxM3),
        numeroCiclo: parseInt(numeroCiclo),
        horaInicioCiclo: new Date(horaInicioCiclo),
        horaFinCiclo: new Date(horaFinCiclo),
        duracionMinutos: parseFloat(duracionMinutos.toFixed(2)),
        latitudInicio: latitudInicio ? parseFloat(latitudInicio) : null,
        longitudInicio: longitudInicio ? parseFloat(longitudInicio) : null,
        latitudFin: latitudFin ? parseFloat(latitudFin) : null,
        longitudFin: longitudFin ? parseFloat(longitudFin) : null,
        puntoRecoleccion: puntoRecoleccion || null,
        puntoAcopio: puntoAcopio || null,
        distanciaRecorrida: distanciaRecorrida
          ? parseFloat(distanciaRecorrida)
          : null,
        estadoCiclo: "COMPLETADO",
        observaciones: observaciones || null,
        fecha: fecha ? new Date(fecha) : new Date(),
      },
    });

    res.json({
      success: true,
      message: "Ciclo registrado exitosamente",
      data: ciclo,
    });
  } catch (error) {
    console.error("Error al registrar ciclo:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar ciclo",
      error: error.message,
    });
  }
};

// ============================================
// 4. OBTENER REGISTROS DE CICLOS DEL DÍA
// ============================================
const getCiclosDelDia = async (req, res) => {
  try {
    const { usuarioId, tituloMineroId } = req.params;

    if (!puedeAccederATitulo(req.user, tituloMineroId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }
    if (!esRolGlobal(req.user) && usuarioId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "No puedes consultar ciclos de otro usuario",
      });
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ciclos = await prisma.registroCicloProduccion.findMany({
      where: {
        usuarioId,
        tituloMineroId,
        fecha: {
          gte: hoy,
        },
      },
      orderBy: {
        numeroCiclo: "asc",
      },
    });

    res.json({
      success: true,
      totalCiclos: ciclos.length,
      data: ciclos,
    });
  } catch (error) {
    console.error("Error al obtener ciclos del día:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener ciclos del día",
      error: error.message,
    });
  }
};

// ============================================
// 5. OBTENER ESTADÍSTICAS DE PRODUCCIÓN
// ============================================
const getEstadisticasProduccion = async (req, res) => {
  try {
    const { usuarioId, tituloMineroId } = req.params;

    if (!puedeAccederATitulo(req.user, tituloMineroId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }
    if (!esRolGlobal(req.user) && usuarioId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "No puedes consultar ciclos de otro usuario",
      });
    }

    console.log("📊 Obteniendo estadísticas:", { usuarioId, tituloMineroId });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Usar Prisma
    const ciclos = await prisma.registroCicloProduccion.findMany({
      where: {
        usuarioId: usuarioId,
        tituloMineroId: tituloMineroId,
        fecha: {
          gte: hoy,
        },
        estadoCiclo: "COMPLETADO",
      },
    });

    const ciclosHoy = ciclos.length;
    const volumenHoy = ciclos.reduce(
      (sum, ciclo) => sum + parseFloat(ciclo.capacidadMaxM3 || 0),
      0,
    );

    console.log("📊 Estadísticas calculadas:", { ciclosHoy, volumenHoy });

    res.json({
      success: true,
      data: {
        ciclosHoy,
        volumenHoy: volumenHoy.toFixed(2),
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo estadísticas",
      error: error.message,
    });
  }
};

// ============================================
// 6. REGISTRAR MÚLTIPLES CICLOS (Batch)
// ============================================
const registrarCiclosBatch = async (req, res) => {
  try {
    const { ciclos } = req.body;

    if (!Array.isArray(ciclos) || ciclos.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Se requiere un array de ciclos" });
    }

    // Validar acceso a todos los títulos mineros del lote ANTES de insertar nada
    const titulosUnicos = [...new Set(ciclos.map((c) => c.tituloMineroId))];
    for (const t of titulosUnicos) {
      if (!puedeAccederATitulo(req.user, t)) {
        return res.status(403).json({
          success: false,
          message: `No tienes acceso al título minero ${t}`,
        });
      }
    }

    const ciclosCreados = await prisma.$transaction(
      ciclos.map((ciclo) => {
        const inicio = new Date(ciclo.horaInicioCiclo);
        const fin = new Date(ciclo.horaFinCiclo);
        const duracionMinutos = (fin - inicio) / (1000 * 60);

        return prisma.registroCicloProduccion.create({
          data: {
            usuarioId: req.user.id, // nunca confiar en el body
            tituloMineroId: ciclo.tituloMineroId,
            tipoMaquina: ciclo.tipoMaquina,
            capacidadMaxM3: parseFloat(ciclo.capacidadMaxM3),
            numeroCiclo: parseInt(ciclo.numeroCiclo),
            horaInicioCiclo: inicio,
            horaFinCiclo: fin,
            duracionMinutos: parseFloat(duracionMinutos.toFixed(2)),
            latitudInicio: parseFloat(ciclo.latitudInicio),
            longitudInicio: parseFloat(ciclo.longitudInicio),
            latitudFin: parseFloat(ciclo.latitudFin),
            longitudFin: parseFloat(ciclo.longitudFin),
            puntoRecoleccion: ciclo.puntoRecoleccion,
            puntoAcopio: ciclo.puntoAcopio,
            distanciaRecorrida: ciclo.distanciaRecorrida
              ? parseFloat(ciclo.distanciaRecorrida)
              : null,
            estadoCiclo: "COMPLETADO",
            observaciones: ciclo.observaciones || null,
            fecha: ciclo.fecha ? new Date(ciclo.fecha) : new Date(),
          },
        });
      }),
    );

    res.json({
      success: true,
      message: `${ciclosCreados.length} ciclos registrados exitosamente`,
      data: ciclosCreados,
    });
  } catch (error) {
    console.error("Error al registrar ciclos batch:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar ciclos batch",
      error: error.message,
    });
  }
};

module.exports = {
  getPuntosReferencia,
  iniciarSesionRegistro,
  registrarCiclo,
  getCiclosDelDia,
  getEstadisticasProduccion,
  registrarCiclosBatch,
};
