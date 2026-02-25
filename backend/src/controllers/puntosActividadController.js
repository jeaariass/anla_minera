// backend/src/controllers/puntosActividadController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// 1. GET /api/actividad/items/:categoria
// ============================================
const getItems = async (req, res) => {
  try {
    const { categoria } = req.params;
    const CATEGORIAS_VALIDAS = ['extraccion', 'acopio', 'procesamiento', 'inspeccion'];

    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return res.status(400).json({
        success: false,
        message: `Categoría inválida. Debe ser una de: ${CATEGORIAS_VALIDAS.join(', ')}`
      });
    }

    const items = await prisma.$queryRaw`
      SELECT id::TEXT, categoria, codigo, nombre, orden
      FROM puntos_items_catalogo
      WHERE categoria = ${categoria} AND activo = TRUE
      ORDER BY orden ASC, nombre ASC
    `;

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('❌ Error obteniendo ítems:', error);
    res.status(500).json({ success: false, message: 'Error al obtener ítems', error: error.message });
  }
};

// ============================================
// 2. GET /api/actividad/maquinaria
// Catálogo completo de maquinaria
// ============================================
const getMaquinaria = async (req, res) => {
  try {
    const maquinaria = await prisma.$queryRaw`
      SELECT
        id::TEXT,
        codigo,
        marca,
        modelo,
        display,
        orden
      FROM maquinaria_catalogo
      WHERE activo = TRUE
      ORDER BY orden ASC
    `;

    res.json({ success: true, data: maquinaria });
  } catch (error) {
    console.error('❌ Error obteniendo maquinaria:', error);
    res.status(500).json({ success: false, message: 'Error al obtener maquinaria', error: error.message });
  }
};

// ============================================
// 3. POST /api/actividad/punto
// ============================================
const registrarPunto = async (req, res) => {
  try {
    const {
      usuarioId,
      tituloMineroId,
      latitud,
      longitud,
      categoria,
      // Ítem
      itemId,
      itemOtro,
      // Maquinaria
      maquinariaId,
      maquinariaOtro,
      // Extras
      descripcion,
      volumenM3,
    } = req.body;

    // ── Validaciones ──────────────────────────────────────────
    if (!usuarioId || !tituloMineroId || !latitud || !longitud || !categoria) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: usuarioId, tituloMineroId, latitud, longitud, categoria'
      });
    }

    // ── Resolver item_nombre ──────────────────────────────────
    let itemNombre = null;
    if (itemId) {
      const itemRow = await prisma.$queryRaw`
        SELECT codigo, nombre FROM puntos_items_catalogo
        WHERE id = ${itemId}::UUID LIMIT 1
      `;
      if (itemRow.length === 0) {
        return res.status(400).json({ success: false, message: 'El ítem seleccionado no existe' });
      }
      if (itemRow[0].codigo === 'OTRO') {
        if (!itemOtro?.trim()) {
          return res.status(400).json({ success: false, message: 'Debes describir el ítem cuando seleccionas "Otro"' });
        }
        itemNombre = itemOtro.trim();
      } else {
        itemNombre = itemRow[0].nombre;
      }
    }

    // ── Resolver maquinaria_nombre ────────────────────────────
    let maquinariaNombre = null;
    if (maquinariaId) {
      const maqRow = await prisma.$queryRaw`
        SELECT codigo, display FROM maquinaria_catalogo
        WHERE id = ${maquinariaId}::UUID LIMIT 1
      `;
      if (maqRow.length === 0) {
        return res.status(400).json({ success: false, message: 'La maquinaria seleccionada no existe' });
      }
      if (maqRow[0].codigo === 'OTRO') {
        if (!maquinariaOtro?.trim()) {
          return res.status(400).json({ success: false, message: 'Describe la maquinaria cuando seleccionas "Otro"' });
        }
        maquinariaNombre = maquinariaOtro.trim();
      } else {
        maquinariaNombre = maqRow[0].display;
      }
    }

    // ── Insertar ──────────────────────────────────────────────
    await prisma.$executeRaw`
      INSERT INTO puntos_actividad (
        usuario_id, titulo_minero_id,
        latitud, longitud,
        categoria,
        item_id, item_nombre, item_otro,
        maquinaria_id, maquinaria_nombre, maquinaria_otro,
        descripcion, volumen_m3
      ) VALUES (
        ${usuarioId}, ${tituloMineroId},
        ${latitud}, ${longitud},
        ${categoria},
        ${itemId        ? itemId        : null}::UUID,
        ${itemNombre},
        ${itemOtro      ? itemOtro      : null},
        ${maquinariaId  ? maquinariaId  : null}::UUID,
        ${maquinariaNombre},
        ${maquinariaOtro ? maquinariaOtro : null},
        ${descripcion   ? descripcion   : null},
        ${volumenM3     ? volumenM3     : null}
      )
    `;

    res.json({ success: true, message: '📍 Punto registrado exitosamente' });
  } catch (error) {
    console.error('❌ Error registrando punto:', error);
    res.status(500).json({ success: false, message: 'Error al registrar punto', error: error.message });
  }
};

// ============================================
// 4. GET /api/actividad/puntos/:tituloMineroId
// ============================================
const getPuntos = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;

    const puntos = await prisma.$queryRaw`
      SELECT
        pa.id,
        pa.usuario_id                           AS "usuarioId",
        pa.titulo_minero_id                     AS "tituloMineroId",
        pa.latitud,
        pa.longitud,
        pa.categoria,
        pa.item_id::TEXT                        AS "itemId",
        pa.item_nombre                          AS "itemNombre",
        pa.item_otro                            AS "itemOtro",
        COALESCE(
          CASE WHEN pic.codigo = 'OTRO' THEN pa.item_otro ELSE pic.nombre END,
          pa.item_nombre
        )                                       AS "itemDisplay",
        pa.maquinaria_id::TEXT                  AS "maquinariaId",
        pa.maquinaria_nombre                    AS "maquinariaNombre",
        pa.maquinaria_otro                      AS "maquinariaOtro",
        COALESCE(
          CASE WHEN mc.codigo = 'OTRO' THEN pa.maquinaria_otro ELSE pa.maquinaria_nombre END,
          pa.maquinaria_nombre
        )                                       AS "maquinariaDisplay",
        pa.descripcion,
        pa.volumen_m3                           AS "volumenM3",
        pa.fecha
      FROM puntos_actividad pa
      LEFT JOIN puntos_items_catalogo  pic ON pic.id = pa.item_id
      LEFT JOIN maquinaria_catalogo     mc  ON mc.id  = pa.maquinaria_id
      WHERE pa.titulo_minero_id = ${tituloMineroId}
      ORDER BY pa.fecha DESC
    `;

    res.json({ success: true, data: puntos, total: puntos.length });
  } catch (error) {
    console.error('❌ Error obteniendo puntos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener puntos', error: error.message });
  }
};

// ============================================
// 5. GET /api/actividad/estadisticas/:tituloMineroId
// ============================================
const getEstadisticas = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;

    const stats = await prisma.$queryRaw`
      SELECT
        COUNT(*)::INTEGER                     AS "totalPuntos",
        COALESCE(SUM(volumen_m3), 0)::NUMERIC AS "volumenTotal",
        COUNT(DISTINCT usuario_id)::INTEGER   AS "usuariosActivos"
      FROM puntos_actividad
      WHERE titulo_minero_id = ${tituloMineroId}
    `;

    const result = stats[0] || { totalPuntos: 0, volumenTotal: 0, usuariosActivos: 0 };
    res.json({
      success: true,
      estadisticas: {
        totalPuntos:      Number(result.totalPuntos)     || 0,
        volumenTotal:     Number(result.volumenTotal)    || 0,
        usuariosActivos:  Number(result.usuariosActivos) || 0,
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
  }
};

module.exports = {
  getItems,
  getMaquinaria,
  registrarPunto,
  getPuntos,
  getEstadisticas,
};