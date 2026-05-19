// backend/src/controllers/catalogosCampoController.js
// CRUD del administrador para los catálogos usados en
// "Actividades en Campo": ítems por proceso (extracción, acopio,
// procesamiento, inspección) y maquinaria.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Fuente única de categorías — ver backend/src/utils/categorias.js.
const { CATEGORIAS_VALIDAS, esCategoriaValida } = require("../utils/categorias");
const validarCategoria = esCategoriaValida;

// ─────────────────────────────────────────────────────────────
// ITEMS DE PROCESOS  (puntos_items_catalogo)
// ─────────────────────────────────────────────────────────────

// GET /api/catalogos-campo/items?categoria=extraccion
const listarItems = async (req, res) => {
  try {
    const { categoria, soloActivos } = req.query;

    let where = "";
    const params = [];
    if (categoria) {
      if (!validarCategoria(categoria)) {
        return res.status(400).json({
          success: false,
          message: `Categoría inválida. Debe ser: ${CATEGORIAS_VALIDAS.join(", ")}`,
        });
      }
      params.push(categoria.toLowerCase());
      where += ` WHERE categoria = $${params.length}`;
    }
    if (soloActivos === "true") {
      where += where ? " AND activo = TRUE" : " WHERE activo = TRUE";
    }

    const items = await prisma.$queryRawUnsafe(
      `
        SELECT id::TEXT, categoria, codigo, nombre, activo, orden,
               TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt"
          FROM puntos_items_catalogo
          ${where}
         ORDER BY categoria ASC, orden ASC, nombre ASC
      `,
      ...params,
    );

    res.json({ success: true, data: items, total: items.length });
  } catch (error) {
    console.error("❌ Error listando items:", error);
    res.status(500).json({
      success: false,
      message: "Error al listar items",
      error: error.message,
    });
  }
};

// POST /api/catalogos-campo/items
const crearItem = async (req, res) => {
  try {
    const { categoria, codigo, nombre, orden, activo } = req.body;

    if (!categoria || !codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: "Categoría, código y nombre son obligatorios",
      });
    }

    if (!validarCategoria(categoria)) {
      return res.status(400).json({
        success: false,
        message: `Categoría inválida. Debe ser: ${CATEGORIAS_VALIDAS.join(", ")}`,
      });
    }

    const codigoUpper = String(codigo).trim().toUpperCase();
    const nombreTrim = String(nombre).trim();

    const existe = await prisma.$queryRaw`
        SELECT id FROM puntos_items_catalogo
         WHERE categoria = ${categoria.toLowerCase()}
           AND codigo = ${codigoUpper}
         LIMIT 1
      `;
    if (existe.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Ya existe un ítem con ese código en la categoría",
      });
    }

    const inserted = await prisma.$queryRaw`
        INSERT INTO puntos_items_catalogo (categoria, codigo, nombre, orden, activo)
        VALUES (
          ${categoria.toLowerCase()},
          ${codigoUpper},
          ${nombreTrim},
          ${Number(orden) || 0},
          ${activo === false ? false : true}
        )
        RETURNING id::TEXT, categoria, codigo, nombre, activo, orden
      `;

    res.status(201).json({
      success: true,
      message: "✅ Ítem creado correctamente",
      data: inserted[0],
    });
  } catch (error) {
    console.error("❌ Error creando ítem:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear ítem",
      error: error.message,
    });
  }
};

// PUT /api/catalogos-campo/items/:id
const editarItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria, codigo, nombre, orden, activo } = req.body;

    const existe = await prisma.$queryRaw`
        SELECT id FROM puntos_items_catalogo WHERE id = ${id}::UUID LIMIT 1
      `;
    if (existe.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Ítem no encontrado" });
    }

    if (categoria && !validarCategoria(categoria)) {
      return res.status(400).json({
        success: false,
        message: `Categoría inválida. Debe ser: ${CATEGORIAS_VALIDAS.join(", ")}`,
      });
    }

    const codigoUpper =
      codigo !== undefined ? String(codigo).trim().toUpperCase() : null;

    if (categoria && codigoUpper) {
      const dup = await prisma.$queryRaw`
          SELECT id FROM puntos_items_catalogo
           WHERE categoria = ${categoria.toLowerCase()}
             AND codigo = ${codigoUpper}
             AND id <> ${id}::UUID
           LIMIT 1
        `;
      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Ya existe otro ítem con ese código en la categoría",
        });
      }
    }

    const actualizado = await prisma.$queryRaw`
        UPDATE puntos_items_catalogo SET
          categoria = COALESCE(${categoria ? categoria.toLowerCase() : null}, categoria),
          codigo    = COALESCE(${codigoUpper}, codigo),
          nombre    = COALESCE(${nombre ? String(nombre).trim() : null}, nombre),
          orden     = COALESCE(${orden !== undefined ? Number(orden) : null}, orden),
          activo    = COALESCE(${activo === undefined ? null : Boolean(activo)}, activo)
        WHERE id = ${id}::UUID
        RETURNING id::TEXT, categoria, codigo, nombre, activo, orden
      `;

    res.json({
      success: true,
      message: "✅ Ítem actualizado correctamente",
      data: actualizado[0],
    });
  } catch (error) {
    console.error("❌ Error editando ítem:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar ítem",
      error: error.message,
    });
  }
};

// DELETE /api/catalogos-campo/items/:id
// Si el ítem está en uso, se desactiva (soft-delete).
// Si no está en uso, se elimina físicamente.
const eliminarItem = async (req, res) => {
  try {
    const { id } = req.params;

    const enUso = await prisma.$queryRaw`
        SELECT COUNT(*)::INTEGER AS total
          FROM puntos_actividad WHERE item_id = ${id}::UUID
      `;
    const referencias = Number(enUso[0]?.total) || 0;

    if (referencias > 0) {
      await prisma.$executeRaw`
          UPDATE puntos_items_catalogo
             SET activo = FALSE
           WHERE id = ${id}::UUID
        `;
      return res.json({
        success: true,
        message: `Ítem desactivado (estaba siendo usado en ${referencias} registro${referencias > 1 ? "s" : ""}).`,
        soft: true,
      });
    }

    const result = await prisma.$executeRaw`
        DELETE FROM puntos_items_catalogo WHERE id = ${id}::UUID
      `;

    if (result === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Ítem no encontrado" });
    }

    res.json({ success: true, message: "🗑️ Ítem eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error eliminando ítem:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar ítem",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// MAQUINARIA  (maquinaria_catalogo)
// ─────────────────────────────────────────────────────────────

// GET /api/catalogos-campo/maquinaria?soloActivos=true
const listarMaquinaria = async (req, res) => {
  try {
    const { soloActivos } = req.query;
    const where = soloActivos === "true" ? "WHERE activo = TRUE" : "";

    const data = await prisma.$queryRawUnsafe(`
        SELECT id::TEXT, codigo, marca, modelo, display, activo, orden,
               TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt"
          FROM maquinaria_catalogo
          ${where}
         ORDER BY orden ASC, display ASC
      `);

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error("❌ Error listando maquinaria:", error);
    res.status(500).json({
      success: false,
      message: "Error al listar maquinaria",
      error: error.message,
    });
  }
};

// POST /api/catalogos-campo/maquinaria
const crearMaquinaria = async (req, res) => {
  try {
    const { codigo, marca, modelo, orden, activo } = req.body;

    if (!codigo || !marca || !modelo) {
      return res.status(400).json({
        success: false,
        message: "Código, marca y modelo son obligatorios",
      });
    }

    const codigoUpper = String(codigo).trim().toUpperCase();
    const marcaTrim = String(marca).trim();
    const modeloTrim = String(modelo).trim();

    const existe = await prisma.$queryRaw`
        SELECT id FROM maquinaria_catalogo WHERE codigo = ${codigoUpper} LIMIT 1
      `;
    if (existe.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Ya existe maquinaria con ese código",
      });
    }

    const inserted = await prisma.$queryRaw`
        INSERT INTO maquinaria_catalogo (codigo, marca, modelo, orden, activo)
        VALUES (
          ${codigoUpper},
          ${marcaTrim},
          ${modeloTrim},
          ${Number(orden) || 0},
          ${activo === false ? false : true}
        )
        RETURNING id::TEXT, codigo, marca, modelo, display, activo, orden
      `;

    res.status(201).json({
      success: true,
      message: "✅ Maquinaria creada correctamente",
      data: inserted[0],
    });
  } catch (error) {
    console.error("❌ Error creando maquinaria:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear maquinaria",
      error: error.message,
    });
  }
};

// PUT /api/catalogos-campo/maquinaria/:id
const editarMaquinaria = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, marca, modelo, orden, activo } = req.body;

    const existe = await prisma.$queryRaw`
        SELECT id FROM maquinaria_catalogo WHERE id = ${id}::UUID LIMIT 1
      `;
    if (existe.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Maquinaria no encontrada" });
    }

    const codigoUpper =
      codigo !== undefined ? String(codigo).trim().toUpperCase() : null;

    if (codigoUpper) {
      const dup = await prisma.$queryRaw`
          SELECT id FROM maquinaria_catalogo
           WHERE codigo = ${codigoUpper} AND id <> ${id}::UUID
           LIMIT 1
        `;
      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Ya existe otra maquinaria con ese código",
        });
      }
    }

    const actualizado = await prisma.$queryRaw`
        UPDATE maquinaria_catalogo SET
          codigo = COALESCE(${codigoUpper}, codigo),
          marca  = COALESCE(${marca ? String(marca).trim() : null},  marca),
          modelo = COALESCE(${modelo ? String(modelo).trim() : null}, modelo),
          orden  = COALESCE(${orden !== undefined ? Number(orden) : null}, orden),
          activo = COALESCE(${activo === undefined ? null : Boolean(activo)}, activo)
        WHERE id = ${id}::UUID
        RETURNING id::TEXT, codigo, marca, modelo, display, activo, orden
      `;

    res.json({
      success: true,
      message: "✅ Maquinaria actualizada correctamente",
      data: actualizado[0],
    });
  } catch (error) {
    console.error("❌ Error editando maquinaria:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar maquinaria",
      error: error.message,
    });
  }
};

// DELETE /api/catalogos-campo/maquinaria/:id
const eliminarMaquinaria = async (req, res) => {
  try {
    const { id } = req.params;

    const enUso = await prisma.$queryRaw`
        SELECT COUNT(*)::INTEGER AS total
          FROM puntos_actividad WHERE maquinaria_id = ${id}::UUID
      `;
    const referencias = Number(enUso[0]?.total) || 0;

    if (referencias > 0) {
      await prisma.$executeRaw`
          UPDATE maquinaria_catalogo
             SET activo = FALSE
           WHERE id = ${id}::UUID
        `;
      return res.json({
        success: true,
        message: `Maquinaria desactivada (estaba siendo usada en ${referencias} registro${referencias > 1 ? "s" : ""}).`,
        soft: true,
      });
    }

    const result = await prisma.$executeRaw`
        DELETE FROM maquinaria_catalogo WHERE id = ${id}::UUID
      `;

    if (result === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Maquinaria no encontrada" });
    }

    res.json({
      success: true,
      message: "🗑️ Maquinaria eliminada correctamente.",
    });
  } catch (error) {
    console.error("❌ Error eliminando maquinaria:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar maquinaria",
      error: error.message,
    });
  }
};

module.exports = {
  CATEGORIAS_VALIDAS,
  listarItems,
  crearItem,
  editarItem,
  eliminarItem,
  listarMaquinaria,
  crearMaquinaria,
  editarMaquinaria,
  eliminarMaquinaria,
};
