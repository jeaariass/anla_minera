// backend/src/controllers/paradasController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    console.error('❌ Error obteniendo motivos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener motivos', error: error.message });
  }
};

// ============================================
// POST /api/paradas
// ============================================
const registrarParada = async (req, res) => {
  try {
    const {
      usuarioId,
      tituloMineroId,
      motivoId,
      motivoOtro,
      inicio,
      fin,
      observaciones,
      puntoActividadId,
    } = req.body;

    if (!usuarioId || !tituloMineroId || !motivoId || !inicio || !fin) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: usuarioId, tituloMineroId, motivoId, inicio, fin'
      });
    }

    const fechaInicio = new Date(inicio);
    const fechaFin    = new Date(fin);

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Usa ISO 8601 (ej: 2025-02-24T10:30:00.000Z)'
      });
    }

    if (fechaFin <= fechaInicio) {
      return res.status(400).json({
        success: false,
        message: 'La hora de fin debe ser posterior al inicio'
      });
    }

    // Verificar motivo y obtener nombre
    const motivoRow = await prisma.$queryRaw`
      SELECT codigo, nombre FROM paradas_motivos
      WHERE id = ${motivoId}::UUID LIMIT 1
    `;

    if (motivoRow.length === 0) {
      return res.status(400).json({ success: false, message: 'El motivo seleccionado no existe' });
    }

    if (motivoRow[0].codigo === 'OTRO' && (!motivoOtro || !motivoOtro.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Debes describir el motivo cuando seleccionas "Otro"'
      });
    }

    // Nombre legible para guardar denormalizado
    const motivoNombre = motivoRow[0].codigo === 'OTRO'
      ? motivoOtro.trim()
      : motivoRow[0].nombre;

    if (puntoActividadId) {
      await prisma.$executeRaw`
        INSERT INTO paradas_actividad (
          usuario_id, titulo_minero_id,
          punto_actividad_id,
          motivo_id, motivo_nombre, motivo_otro,
          inicio, fin, dia,
          observaciones, estado, enviado_at
        ) VALUES (
          ${usuarioId}, ${tituloMineroId},
          ${puntoActividadId}::UUID,
          ${motivoId}::UUID, ${motivoNombre}, ${motivoOtro || null},
          ${fechaInicio}, ${fechaFin}, ${fechaInicio}::DATE,
          ${observaciones || null}, 'ENVIADO', NOW()
        )
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO paradas_actividad (
          usuario_id, titulo_minero_id,
          motivo_id, motivo_nombre, motivo_otro,
          inicio, fin, dia,
          observaciones, estado, enviado_at
        ) VALUES (
          ${usuarioId}, ${tituloMineroId},
          ${motivoId}::UUID, ${motivoNombre}, ${motivoOtro || null},
          ${fechaInicio}, ${fechaFin}, ${fechaInicio}::DATE,
          ${observaciones || null}, 'ENVIADO', NOW()
        )
      `;
    }

    const minutos = Math.round((fechaFin - fechaInicio) / 60000);

    res.json({
      success: true,
      message: '🛑 Paro registrado exitosamente',
      data: { minutosRegistrados: minutos }
    });
  } catch (error) {
    console.error('❌ Error registrando parada:', error);
    res.status(500).json({ success: false, message: 'Error al registrar la parada', error: error.message });
  }
};

// ============================================
// GET /api/paradas/:tituloMineroId
// Devuelve los campos exactos que usa HistorialParadasScreen
// ============================================
const getParadas = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;
    const { dia, usuarioId } = req.query;

    let whereExtra = '';

    if (dia) {
      // Filtra por día específico: ?dia=2025-02-24
      whereExtra += ` AND pa.dia = '${dia}'::DATE`;
    }

    if (usuarioId) {
      whereExtra += ` AND pa.usuario_id = '${usuarioId}'`;
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
        pa.inicio,
        pa.fin,
        pa.dia,
        pa.minutos_paro              AS "minutesParo",
        pa.observaciones,
        pa.estado,
        pa.created_at                AS "createdAt"
      FROM paradas_actividad pa
      JOIN paradas_motivos pm ON pm.id = pa.motivo_id
      WHERE pa.titulo_minero_id = '${tituloMineroId}'
      ${whereExtra}
      ORDER BY pa.inicio DESC
    `);

    res.json({
      success: true,
      data:    paradas,
      total:   paradas.length,
    });
  } catch (error) {
    console.error('❌ Error obteniendo paradas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener paradas', error: error.message });
  }
};

// ============================================
// GET /api/paradas/resumen/:tituloMineroId
// Resumen del día para el dashboard
// ============================================
const getResumenDia = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;
    const { dia } = req.query;

    const fecha = dia || new Date().toISOString().split('T')[0];

    const resumen = await prisma.$queryRaw`
      SELECT
        COUNT(*)::INTEGER           AS "totalParadas",
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
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo resumen:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen', error: error.message });
  }
};


// ============================================
// PUT /api/paradas/:id
// Solo editable si es del mismo día
// ============================================
const editarParada = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivoId, motivoOtro, inicio, fin, observaciones } = req.body;

    if (!motivoId || !inicio || !fin) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
    }

    // Verificar que existe
    const existing = await prisma.$queryRaw`
      SELECT id, dia FROM paradas_actividad WHERE id = ${id}::UUID LIMIT 1
    `;
    if (existing.length === 0)
      return res.status(404).json({ success: false, message: 'Paro no encontrado.' });

    // Verificar que es del día de hoy
    const diaRegistro = new Date(existing[0].dia);
    const hoy = new Date();
    const esHoy =
      diaRegistro.getFullYear() === hoy.getFullYear() &&
      diaRegistro.getMonth()    === hoy.getMonth()    &&
      diaRegistro.getDate()     === hoy.getDate();

    if (!esHoy) {
      return res.status(403).json({
        success: false,
        message: 'Solo se pueden editar paros registrados hoy.'
      });
    }

    const fechaInicio = new Date(inicio);
    const fechaFin    = new Date(fin);

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime()))
      return res.status(400).json({ success: false, message: 'Formato de fecha inválido.' });
    if (fechaFin <= fechaInicio)
      return res.status(400).json({ success: false, message: 'El fin debe ser posterior al inicio.' });

    // Verificar motivo y recalcular nombre denormalizado
    const motivoRow = await prisma.$queryRaw`
      SELECT codigo, nombre FROM paradas_motivos WHERE id = ${motivoId}::UUID LIMIT 1
    `;
    if (motivoRow.length === 0)
      return res.status(400).json({ success: false, message: 'Motivo no encontrado.' });

    if (motivoRow[0].codigo === 'OTRO' && (!motivoOtro || !motivoOtro.trim()))
      return res.status(400).json({ success: false, message: 'Describe el motivo "Otro".' });

    const motivoNombre = motivoRow[0].codigo === 'OTRO'
      ? motivoOtro.trim()
      : motivoRow[0].nombre;

    await prisma.$executeRaw`
      UPDATE paradas_actividad SET
        motivo_id     = ${motivoId}::UUID,
        motivo_nombre = ${motivoNombre},
        motivo_otro   = ${motivoOtro || null},
        inicio        = ${fechaInicio},
        fin           = ${fechaFin},
        dia           = ${fechaInicio}::DATE,
        observaciones = ${observaciones || null},
        updated_at    = NOW()
      WHERE id = ${id}::UUID
    `;

    const minutos = Math.round((fechaFin - fechaInicio) / 60000);
    res.json({ success: true, message: '✅ Paro actualizado', data: { minutosRegistrados: minutos } });

  } catch (error) {
    console.error('❌ Error editando parada:', error);
    res.status(500).json({ success: false, message: 'Error al editar el paro', error: error.message });
  }
};

module.exports = { getMotivos, registrarParada, getParadas, getResumenDia, editarParada };