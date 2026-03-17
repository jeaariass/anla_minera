// backend/src/controllers/puntosActividadController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { puedeAccederATitulo, esRolGlobal } = require("../utils/permissions");

// ─── Helpers Colombia ─────────────────────────────────────────────────────────

/** "YYYY-MM-DD" según hora Colombia (UTC-5) ahora mismo */
const colombiaToday = () => {
  const local = new Date(Date.now() - 5 * 3600000);
  return local.toISOString().split("T")[0];
};

/**
 * Convierte un JS Date a string naívo Colombia "YYYY-MM-DD HH:MM:SS"
 * para guardar en columna TIMESTAMP WITHOUT TIME ZONE sin conversión.
 */
const toColombiaStr = (date) => {
  const local = new Date(date.getTime() - 5 * 3600000);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const min = String(local.getUTCMinutes()).padStart(2, "0");
  const ss = String(local.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

// ============================================
// 1. GET /api/actividad/items/:categoria
// ============================================
const getItems = async (req, res) => {
  try {
    const { categoria } = req.params;

    const CATEGORIAS_VALIDAS = [
      "extraccion",
      "acopio",
      "procesamiento",
      "inspeccion",
    ];
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return res.status(400).json({
        success: false,
        message: `Categoría inválida. Debe ser una de: ${CATEGORIAS_VALIDAS.join(", ")}`,
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
    console.error("❌ Error obteniendo ítems:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener ítems del catálogo",
      error: error.message,
    });
  }
};

// ============================================
// 2. GET /api/actividad/maquinaria
// ============================================
const getMaquinaria = async (req, res) => {
  try {
    const lista = await prisma.$queryRaw`
        SELECT id::TEXT, codigo, display, display AS nombre, orden
        FROM maquinaria_catalogo
        WHERE activo = TRUE
        ORDER BY orden ASC, display ASC
      `;
    res.json({ success: true, data: lista });
  } catch (error) {
    console.error("❌ Error obteniendo maquinaria:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener maquinaria",
      error: error.message,
    });
  }
};

// ============================================
// 3. POST /api/actividad/punto
// ============================================
const registrarPunto = async (req, res) => {
  try {
    const {
      latitud,
      longitud,
      categoria,
      itemId,
      itemOtro,
      maquinariaId,
      maquinariaOtro,
      descripcion,
      volumenM3,
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

    if (!latitud || !longitud || !categoria) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios: latitud, longitud, categoria",
      });
    }

    // Resolver item_nombre
    let itemNombre = null;
    if (itemId) {
      const itemRow = await prisma.$queryRaw`
          SELECT codigo, nombre FROM puntos_items_catalogo WHERE id = ${itemId}::UUID LIMIT 1
        `;
      if (itemRow.length > 0)
        itemNombre =
          itemRow[0].codigo === "OTRO" ? itemOtro || null : itemRow[0].nombre;
    }

    // Resolver maquinaria_nombre
    let maquinariaNombre = null;
    if (maquinariaId) {
      const maqRow = await prisma.$queryRaw`
          SELECT codigo, display AS nombre FROM maquinaria_catalogo WHERE id = ${maquinariaId}::UUID LIMIT 1
        `;
      if (maqRow.length > 0)
        maquinariaNombre =
          maqRow[0].codigo === "OTRO"
            ? maquinariaOtro || null
            : maqRow[0].nombre;
    }

    // Timestamp Colombia para columna TIMESTAMP WITHOUT TIME ZONE
    const fechaColombiaStr = toColombiaStr(new Date());
    const diaStr = fechaColombiaStr.split(" ")[0]; // "YYYY-MM-DD"

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO puntos_actividad (
          usuario_id, titulo_minero_id,
          latitud, longitud, categoria,
          item_id, item_nombre, item_otro,
          maquinaria_id, maquinaria_nombre, maquinaria_otro,
          descripcion, volumen_m3,
          fecha, dia
        ) VALUES (
          '${usuarioId}', '${tituloMineroId}',
          ${latitud}, ${longitud}, '${categoria}',
          ${itemId ? `'${itemId}'::UUID` : "NULL"},
          $1, $2,
          ${maquinariaId ? `'${maquinariaId}'::UUID` : "NULL"},
          $3, $4,
          $5, ${volumenM3 ?? null},
          '${fechaColombiaStr}'::TIMESTAMP, '${diaStr}'::DATE
        )
      `,
      itemNombre,
      itemOtro || null,
      maquinariaNombre,
      maquinariaOtro || null,
      descripcion || null,
    );

    res.json({ success: true, message: "📍 Punto registrado exitosamente" });
  } catch (error) {
    console.error("❌ Error registrando punto:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar punto",
      error: error.message,
    });
  }
};

// ============================================
// 4. GET /api/actividad/puntos/:tituloMineroId
// ============================================
const getPuntos = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;

    if (!puedeAccederATitulo(req.user, tituloMineroId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }

    const filtroOperario =
      req.user.rol === "OPERARIO" ? `AND pa.usuario_id = '${req.user.id}'` : "";

    const puntos = await prisma.$queryRawUnsafe(`
        SELECT
          pa.id::TEXT                                           AS id,
          pa.usuario_id                                         AS "usuarioId",
          pa.titulo_minero_id                                   AS "tituloMineroId",
          pa.latitud,
          pa.longitud,
          pa.categoria,
          pa.item_id::TEXT                                      AS "itemId",
          pa.item_nombre                                        AS "itemNombre",
          pa.item_otro                                          AS "itemOtro",
          COALESCE(
            CASE WHEN pic.codigo = 'OTRO' THEN pa.item_otro ELSE pic.nombre END,
            pa.item_nombre
          )                                                     AS "itemDisplay",
          pa.maquinaria_id::TEXT                                AS "maquinariaId",
          pa.maquinaria_nombre                                  AS "maquinariaNombre",
          pa.maquinaria_otro                                    AS "maquinariaOtro",
          pa.descripcion,
          pa.volumen_m3                                         AS "volumenM3",
          TO_CHAR(pa.fecha, 'YYYY-MM-DD"T"HH24:MI:SS')         AS fecha,
          TO_CHAR(pa.dia,   'YYYY-MM-DD')                       AS dia
        FROM puntos_actividad pa
        LEFT JOIN puntos_items_catalogo pic ON pic.id = pa.item_id
        WHERE pa.titulo_minero_id = '${tituloMineroId}'
        ${filtroOperario}
        ORDER BY pa.fecha DESC
      `);

    res.json({ success: true, data: puntos, total: puntos.length });
  } catch (error) {
    console.error("❌ Error obteniendo puntos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener puntos",
      error: error.message,
    });
  }
};

// ============================================
// 5. GET /api/actividad/estadisticas/:tituloMineroId
// ============================================
const getEstadisticas = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;

    if (!puedeAccederATitulo(req.user, tituloMineroId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }

    const esOperario = req.user.rol === "OPERARIO";

    const stats = esOperario
      ? await prisma.$queryRaw`
            SELECT
              COUNT(*)::INTEGER                     AS "totalPuntos",
              COALESCE(SUM(volumen_m3), 0)::NUMERIC AS "volumenTotal",
              1::INTEGER                            AS "usuariosActivos"
            FROM puntos_actividad
            WHERE titulo_minero_id = ${tituloMineroId}
              AND usuario_id = ${req.user.id}
          `
      : await prisma.$queryRaw`
            SELECT
              COUNT(*)::INTEGER                     AS "totalPuntos",
              COALESCE(SUM(volumen_m3), 0)::NUMERIC AS "volumenTotal",
              COUNT(DISTINCT usuario_id)::INTEGER   AS "usuariosActivos"
            FROM puntos_actividad
            WHERE titulo_minero_id = ${tituloMineroId}
          `;

    const result = stats[0] || {
      totalPuntos: 0,
      volumenTotal: 0,
      usuariosActivos: 0,
    };
    res.json({
      success: true,
      estadisticas: {
        totalPuntos: Number(result.totalPuntos) || 0,
        volumenTotal: Number(result.volumenTotal) || 0,
        usuariosActivos: Number(result.usuariosActivos) || 0,
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
      error: error.message,
    });
  }
};

// ============================================
// 6. PUT /api/actividad/:id
// Solo editable si es del mismo día Colombia
// ============================================
const editarPunto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoria,
      itemId,
      itemOtro,
      maquinariaId,
      maquinariaOtro,
      descripcion,
      volumenM3,
    } = req.body;

    if (!categoria) {
      return res
        .status(400)
        .json({ success: false, message: "La categoría es obligatoria." });
    }

    // Verificar que existe y obtener su día
    const existing = await prisma.$queryRaw`
      SELECT id, usuario_id, TO_CHAR(dia, 'YYYY-MM-DD') AS dia
      FROM puntos_actividad WHERE id = ${id}::UUID LIMIT 1
    `;
    if (existing.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Punto no encontrado." });

    // 2. Verificar propiedad
    const puedeModificar =
      req.user.rol === "ADMIN" ||
      req.user.rol === "ASESOR" ||
      existing[0].usuario_id === req.user.id;

    if (!puedeModificar) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para modificar este registro. Solo el operario que lo creó, un Admin o un Asesor pueden hacerlo.",
      });
    }

    const diaRegistro = String(existing[0].dia).split("T")[0];
    if (diaRegistro !== colombiaToday()) {
      return res.status(403).json({
        success: false,
        message: "Solo se pueden editar puntos registrados hoy.",
      });
    }

    // Resolver item_nombre
    let itemNombre = null;
    if (itemId) {
      const itemRow = await prisma.$queryRaw`
          SELECT codigo, nombre FROM puntos_items_catalogo WHERE id = ${itemId}::UUID LIMIT 1
        `;
      if (itemRow.length > 0)
        itemNombre =
          itemRow[0].codigo === "OTRO" ? itemOtro || null : itemRow[0].nombre;
    }

    // Resolver maquinaria_nombre
    let maquinariaNombre = null;
    if (maquinariaId) {
      const maqRow = await prisma.$queryRaw`
          SELECT codigo, display AS nombre FROM maquinaria_catalogo WHERE id = ${maquinariaId}::UUID LIMIT 1
        `;
      if (maqRow.length > 0)
        maquinariaNombre =
          maqRow[0].codigo === "OTRO"
            ? maquinariaOtro || null
            : maqRow[0].nombre;
    }

    const updatedAtStr = toColombiaStr(new Date());

    await prisma.$executeRawUnsafe(
      `
        UPDATE puntos_actividad SET
          categoria         = '${categoria}',
          item_id           = ${itemId ? `'${itemId}'::UUID` : "NULL"},
          item_nombre       = $1,
          item_otro         = $2,
          maquinaria_id     = ${maquinariaId ? `'${maquinariaId}'::UUID` : "NULL"},
          maquinaria_nombre = $3,
          maquinaria_otro   = $4,
          descripcion       = $5,
          volumen_m3        = ${volumenM3 ?? null},
          updated_at        = '${updatedAtStr}'::TIMESTAMP
        WHERE id = '${id}'::UUID
      `,
      itemNombre,
      itemOtro || null,
      maquinariaNombre,
      maquinariaOtro || null,
      descripcion || null,
    );

    res.json({ success: true, message: "✅ Punto actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error editando punto:", error);
    res.status(500).json({
      success: false,
      message: "Error al editar el punto",
      error: error.message,
    });
  }
};

// ============================================
// 7. DELETE /api/actividad/:id
// Solo eliminable si es del mismo día Colombia
// ============================================
const eliminarPunto = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.$queryRaw`
      SELECT id, usuario_id, TO_CHAR(dia, 'YYYY-MM-DD') AS dia
      FROM puntos_actividad WHERE id = ${id}::UUID LIMIT 1
    `;
    if (existing.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Punto no encontrado." });

    // Después de obtener el registro existente:
    const puedeModificar =
      req.user.rol === "ADMIN" ||
      req.user.rol === "ASESOR" ||
      existing[0].usuario_id === req.user.id;

    if (!puedeModificar) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para modificar este registro. Solo el operario que lo creó, un Admin o un Asesor pueden hacerlo.",
      });
    }

    const diaRegistro = String(existing[0].dia).split("T")[0];
    if (diaRegistro !== colombiaToday()) {
      return res.status(403).json({
        success: false,
        message: "Solo se pueden eliminar puntos registrados hoy.",
      });
    }

    await prisma.$executeRaw`
        DELETE FROM puntos_actividad WHERE id = ${id}::UUID
      `;

    res.json({ success: true, message: "🗑️ Punto eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error eliminando punto:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el punto",
      error: error.message,
    });
  }
};

module.exports = {
  getItems,
  getMaquinaria,
  registrarPunto,
  getPuntos,
  getEstadisticas,
  editarPunto,
  eliminarPunto,
};
