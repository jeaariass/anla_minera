// backend/src/controllers/paradasController.js
const { puedeAccederATitulo, esRolGlobal } = require("../utils/permissions");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Helpers timezone Colombia (UTC-5, sin DST) ───────────────────────────────

/**
 * Convierte cualquier JS Date a un string "YYYY-MM-DD HH:MM:SS" en hora Colombia.
 * Ese string se pasa como ::TIMESTAMP a PostgreSQL para que lo guarde SIN conversión.
 */
const toColombiaStr = (date) => {
  // Colombia = UTC-5 → restar 5h al timestamp UTC
  const local = new Date(date.getTime() - 5 * 3600000);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const min = String(local.getUTCMinutes()).padStart(2, "0");
  const ss = String(local.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

/** Devuelve "YYYY-MM-DD" según hora Colombia de ahora mismo */
const colombiaToday = () => toColombiaStr(new Date()).split(" ")[0];

// ============================================
// GET /api/paradas/motivos
// ============================================
const getMotivos = async (req, res) => {
  try {
    const motivos = await prisma.$queryRaw`
      SELECT id::TEXT, codigo, nombre
      FROM paradas_motivos
      WHERE activo = TRUE
      ORDER BY nombre ASC
    `;
    res.json({ success: true, data: motivos });
  } catch (error) {
    console.error("❌ Error obteniendo motivos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener motivos",
      error: error.message,
    });
  }
};

// ============================================
// POST /api/paradas
// ============================================
const registrarParada = async (req, res) => {
  try {
    const {
      motivoId,
      motivoOtro,
      inicio,
      fin,
      observaciones,
      puntoActividadId,
    } = req.body;

    const usuarioId = req.user.id;
    const tituloMineroId = esRolGlobal(req.user)
      ? req.body.tituloMineroId || null
      : req.user.tituloMineroId || null;

    if (!tituloMineroId) {
      return res.status(400).json({
        success: false,
        message: esRolGlobal(req.user)
          ? "Debes seleccionar un título minero en el panel superior"
          : "Tu usuario no tiene un título minero asignado",
      });
    }

    if (!motivoId || !inicio || !fin) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios: motivoId, inicio, fin",
      });
    }

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      return res.status(400).json({
        success: false,
        message:
          "Formato de fecha inválido. Usa ISO 8601 (ej: 2025-02-24T10:30:00.000-05:00)",
      });
    }

    if (fechaFin <= fechaInicio) {
      return res.status(400).json({
        success: false,
        message: "La hora de fin debe ser posterior al inicio",
      });
    }

    // ── Strings Colombia para almacenar como TIMESTAMP naive ──────────────────
    const inicioStr = toColombiaStr(fechaInicio);
    const finStr = toColombiaStr(fechaFin);
    const diaStr = inicioStr.split(" ")[0]; // "YYYY-MM-DD"

    // Verificar motivo
    const motivoRow = await prisma.$queryRaw`
      SELECT codigo, nombre FROM paradas_motivos
      WHERE id = ${motivoId}::UUID LIMIT 1
    `;
    if (motivoRow.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "El motivo seleccionado no existe" });

    if (motivoRow[0].codigo === "OTRO" && (!motivoOtro || !motivoOtro.trim()))
      return res.status(400).json({
        success: false,
        message: 'Debes describir el motivo cuando seleccionas "Otro"',
      });

    const motivoNombre =
      motivoRow[0].codigo === "OTRO" ? motivoOtro.trim() : motivoRow[0].nombre;

    if (puntoActividadId) {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO paradas_actividad (
          usuario_id, titulo_minero_id,
          punto_actividad_id,
          motivo_id, motivo_nombre, motivo_otro,
          inicio, fin, dia,
          observaciones, estado, enviado_at
        ) VALUES (
          '${usuarioId}', '${tituloMineroId}',
          '${puntoActividadId}'::UUID,
          '${motivoId}'::UUID, $1, $2,
          '${inicioStr}'::TIMESTAMP, '${finStr}'::TIMESTAMP, '${diaStr}'::DATE,
          $3, 'ENVIADO', NOW()
        )
      `,
        motivoNombre,
        motivoOtro || null,
        observaciones || null,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO paradas_actividad (
          usuario_id, titulo_minero_id,
          motivo_id, motivo_nombre, motivo_otro,
          inicio, fin, dia,
          observaciones, estado, enviado_at
        ) VALUES (
          '${usuarioId}', '${tituloMineroId}',
          '${motivoId}'::UUID, $1, $2,
          '${inicioStr}'::TIMESTAMP, '${finStr}'::TIMESTAMP, '${diaStr}'::DATE,
          $3, 'ENVIADO', NOW()
        )
      `,
        motivoNombre,
        motivoOtro || null,
        observaciones || null,
      );
    }

    const minutos = Math.round((fechaFin - fechaInicio) / 60000);

    res.json({
      success: true,
      message: "🛑 Paro registrado exitosamente",
      data: { minutosRegistrados: minutos },
    });
  } catch (error) {
    console.error("❌ Error registrando parada:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar la parada",
      error: error.message,
    });
  }
};

// ============================================
// GET /api/paradas/:tituloMineroId
// Retorna inicio/fin como strings Colombia (sin Z)
// ============================================
const getParadas = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;
    const { dia, usuarioId } = req.query;

    if (!puedeAccederATitulo(req.user, tituloMineroId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }

    let whereExtra = "";
    if (dia) whereExtra += ` AND pa.dia = '${dia}'::DATE`;
    if (usuarioId) whereExtra += ` AND pa.usuario_id = '${usuarioId}'`;

    // OPERARIO solo ve sus propios registros
    if (req.user.rol === "OPERARIO") {
      whereExtra += ` AND pa.usuario_id = '${req.user.id}'`;
    }

    const paradas = await prisma.$queryRawUnsafe(`
      SELECT
        pa.id::TEXT                  AS id,
        pa.usuario_id                AS "usuarioId",
        pa.titulo_minero_id          AS "tituloMineroId",
        pa.motivo_id::TEXT           AS "motivoId",
        pm.codigo                    AS "motivoCodigo",
        pa.motivo_nombre             AS "motivoNombre",
        pa.motivo_otro               AS "motivoOtro",
        CASE
          WHEN pm.codigo = 'OTRO' THEN pa.motivo_otro
          ELSE pa.motivo_nombre
        END                          AS "motivoDisplay",
        TO_CHAR(pa.inicio, 'YYYY-MM-DD"T"HH24:MI:SS') AS inicio,
        TO_CHAR(pa.fin,    'YYYY-MM-DD"T"HH24:MI:SS') AS fin,
        TO_CHAR(pa.dia,    'YYYY-MM-DD')               AS dia,
        pa.minutos_paro              AS "minutesParo",
        pa.observaciones,
        pa.estado,
        TO_CHAR(pa.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt"
      FROM paradas_actividad pa
      JOIN paradas_motivos pm ON pm.id = pa.motivo_id
      WHERE pa.titulo_minero_id = '${tituloMineroId}'
      ${whereExtra}
      ORDER BY pa.inicio DESC
    `);

    res.json({ success: true, data: paradas, total: paradas.length });
  } catch (error) {
    console.error("❌ Error obteniendo paradas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener paradas",
      error: error.message,
    });
  }
};

// ============================================
// GET /api/paradas/resumen/:tituloMineroId
// ============================================
const getResumenDia = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;
    const { dia } = req.query;

    // Al inicio del handler, antes de la consulta:
    if (!puedeAccederATitulo(req.user, tituloMineroId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }

    // Si no viene `dia`, usa la fecha Colombia de hoy
    const fecha = dia || colombiaToday();

    const resumen = await prisma.$queryRaw`
      SELECT
        COUNT(*)::INTEGER                      AS "totalParadas",
        COALESCE(SUM(minutos_paro), 0)::INTEGER AS "totalMinutos"
      FROM paradas_actividad
      WHERE titulo_minero_id = ${tituloMineroId}
        AND dia = ${fecha}::DATE
    `;

    const r = resumen[0] || { totalParadas: 0, totalMinutos: 0 };

    res.json({
      success: true,
      resumen: {
        totalParadas: Number(r.totalParadas) || 0,
        totalMinutos: Number(r.totalMinutos) || 0,
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo resumen:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener resumen",
      error: error.message,
    });
  }
};

// ============================================
// PUT /api/paradas/:id
// Solo editable si el paro es del mismo día Colombia
// ============================================
const editarParada = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivoId, motivoOtro, inicio, fin, observaciones } = req.body;

    if (!motivoId || !inicio || !fin)
      return res
        .status(400)
        .json({ success: false, message: "Faltan campos obligatorios." });

    // Verificar que existe
    const existing = await prisma.$queryRaw`
      SELECT id, TO_CHAR(dia, 'YYYY-MM-DD') AS dia
      FROM paradas_actividad
      WHERE id = ${id}::UUID LIMIT 1
    `;
    if (existing.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Paro no encontrado." });

    // Después de obtener el registro existente, antes de la verificación del día:
    if (req.user.rol === "OPERARIO" && existing[0].usuario_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Solo puedes editar tus propios registros",
      });
    }

    // Comparar día Colombia con hoy Colombia
    const diaRegistro = String(existing[0].dia).split("T")[0];
    if (diaRegistro !== colombiaToday()) {
      return res.status(403).json({
        success: false,
        message: "Solo se pueden editar paros registrados hoy.",
      });
    }

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime()))
      return res
        .status(400)
        .json({ success: false, message: "Formato de fecha inválido." });
    if (fechaFin <= fechaInicio)
      return res.status(400).json({
        success: false,
        message: "El fin debe ser posterior al inicio.",
      });

    // Strings Colombia para el UPDATE
    const inicioStr = toColombiaStr(fechaInicio);
    const finStr = toColombiaStr(fechaFin);
    const diaStr = inicioStr.split(" ")[0];

    // Verificar motivo
    const motivoRow = await prisma.$queryRaw`
      SELECT codigo, nombre FROM paradas_motivos WHERE id = ${motivoId}::UUID LIMIT 1
    `;
    if (motivoRow.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Motivo no encontrado." });

    if (motivoRow[0].codigo === "OTRO" && (!motivoOtro || !motivoOtro.trim()))
      return res
        .status(400)
        .json({ success: false, message: 'Describe el motivo "Otro".' });

    const motivoNombre =
      motivoRow[0].codigo === "OTRO" ? motivoOtro.trim() : motivoRow[0].nombre;

    await prisma.$executeRawUnsafe(
      `
      UPDATE paradas_actividad SET
        motivo_id     = '${motivoId}'::UUID,
        motivo_nombre = $1,
        motivo_otro   = $2,
        inicio        = '${inicioStr}'::TIMESTAMP,
        fin           = '${finStr}'::TIMESTAMP,
        dia           = '${diaStr}'::DATE,
        observaciones = $3,
        updated_at    = NOW()
      WHERE id = '${id}'::UUID
    `,
      motivoNombre,
      motivoOtro || null,
      observaciones || null,
    );

    const minutos = Math.round((fechaFin - fechaInicio) / 60000);
    res.json({
      success: true,
      message: "✅ Paro actualizado",
      data: { minutosRegistrados: minutos },
    });
  } catch (error) {
    console.error("❌ Error editando parada:", error);
    res.status(500).json({
      success: false,
      message: "Error al editar el paro",
      error: error.message,
    });
  }
};

// ============================================
// DELETE /api/paradas/:id
// Solo eliminable si es del mismo día Colombia
// ============================================
const eliminarParada = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.$queryRaw`
      SELECT id, TO_CHAR(dia, 'YYYY-MM-DD') AS dia
      FROM paradas_actividad
      WHERE id = ${id}::UUID LIMIT 1
    `;
    if (existing.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Paro no encontrado." });

    const diaRegistro = String(existing[0].dia).split("T")[0];
    if (diaRegistro !== colombiaToday()) {
      return res.status(403).json({
        success: false,
        message: "Solo se pueden eliminar paros registrados hoy.",
      });
    }

    await prisma.$executeRaw`
      DELETE FROM paradas_actividad WHERE id = ${id}::UUID
    `;

    res.json({ success: true, message: "🗑️ Paro eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error eliminando parada:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el paro",
      error: error.message,
    });
  }
};

module.exports = {
  getMotivos,
  registrarParada,
  getParadas,
  getResumenDia,
  editarParada,
  eliminarParada,
};
