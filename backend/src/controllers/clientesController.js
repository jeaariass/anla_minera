// backend/src/controllers/clientesController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { generarCertificadoExcel } = require("../services/certificadoExcelService");

// ============================================
// GET /api/clientes/buscar?cedula= | ?correo=
// ============================================
const buscarCliente = async (req, res) => {
  try {
    const { cedula, correo } = req.query;

    if (!cedula && !correo) {
      return res.status(400).json({
        success: false,
        message: "Debes enviar cedula o correo como parámetro de búsqueda.",
      });
    }

    let rows;
    if (cedula) {
      rows = await prisma.$queryRaw`
        SELECT id, cedula, nombre, correo, telefono, direccion,
               "tipoIdentificacion", "tipoComprador", rucom
        FROM clientes_compradores
        WHERE cedula = ${String(cedula).trim()}
        LIMIT 1
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT id, cedula, nombre, correo, telefono, direccion,
               "tipoIdentificacion", "tipoComprador", rucom
        FROM clientes_compradores
        WHERE LOWER(correo) = LOWER(${String(correo).trim()})
        LIMIT 1
      `;
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "No se encontró ningún cliente con ese dato." });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error buscando cliente:", error);
    res.status(500).json({ success: false, message: "Error al buscar cliente", error: error.message });
  }
};

// ============================================
// POST /api/clientes
// ============================================
const crearCliente = async (req, res) => {
  try {
    const { cedula, nombre, correo, telefono, direccion, tipoIdentificacion, tipoComprador, rucom } = req.body;

    if (!cedula || !nombre)        return res.status(400).json({ success: false, message: "Cédula y nombre son obligatorios." });
    if (!tipoIdentificacion)       return res.status(400).json({ success: false, message: "El tipo de identificación es obligatorio." });
    if (!tipoComprador)            return res.status(400).json({ success: false, message: "El tipo de comprador es obligatorio." });

    const existe = await prisma.$queryRaw`SELECT id FROM clientes_compradores WHERE cedula = ${String(cedula).trim()} LIMIT 1`;
    if (existe && existe.length > 0) return res.status(409).json({ success: false, message: "Ya existe un cliente con esa cédula." });

    const rows = await prisma.$queryRaw`
      INSERT INTO clientes_compradores (
        id, cedula, nombre, correo, telefono, direccion,
        "tipoIdentificacion", "tipoComprador", rucom, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        ${String(cedula).trim()}, ${String(nombre).trim()},
        ${correo    ? String(correo).trim()    : null},
        ${telefono  ? String(telefono).trim()  : null},
        ${direccion ? String(direccion).trim() : null},
        ${String(tipoIdentificacion).trim()}, ${String(tipoComprador).trim()},
        ${rucom ? String(rucom).trim() : null},
        NOW(), NOW()
      )
      RETURNING id, cedula, nombre, correo, telefono, direccion,
                "tipoIdentificacion", "tipoComprador", rucom
    `;

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error creando cliente:", error);
    res.status(500).json({ success: false, message: "Error al crear cliente", error: error.message });
  }
};

// ============================================
// PUT /api/clientes/:id
// ============================================
const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, telefono, direccion, tipoIdentificacion, tipoComprador, rucom } = req.body;

    if (!nombre)             return res.status(400).json({ success: false, message: "El nombre es obligatorio." });
    if (!tipoIdentificacion) return res.status(400).json({ success: false, message: "El tipo de identificación es obligatorio." });
    if (!tipoComprador)      return res.status(400).json({ success: false, message: "El tipo de comprador es obligatorio." });

    const rows = await prisma.$queryRaw`
      UPDATE clientes_compradores
      SET nombre               = ${String(nombre).trim()},
          correo               = ${correo    ? String(correo).trim()    : null},
          telefono             = ${telefono  ? String(telefono).trim()  : null},
          direccion            = ${direccion ? String(direccion).trim() : null},
          "tipoIdentificacion" = ${String(tipoIdentificacion).trim()},
          "tipoComprador"      = ${String(tipoComprador).trim()},
          rucom                = ${rucom ? String(rucom).trim() : null},
          "updatedAt"          = NOW()
      WHERE id = ${id}
      RETURNING id, cedula, nombre, correo, telefono, direccion,
                "tipoIdentificacion", "tipoComprador", rucom
    `;

    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: "Cliente no encontrado." });

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error actualizando cliente:", error);
    res.status(500).json({ success: false, message: "Error al actualizar cliente", error: error.message });
  }
};

// ============================================
// POST /api/certificados-origen
// ============================================
const crearCertificado = async (req, res) => {
  try {
    const { tituloMineroId, clienteId, mineralExplotado, cantidadM3, unidadMedida } = req.body;

    if (!tituloMineroId || !clienteId || !mineralExplotado) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios: tituloMineroId, clienteId, mineralExplotado.",
      });
    }

    const rows = await prisma.$queryRaw`
      INSERT INTO certificados_origen (
        id, "tituloMineroId", "clienteId",
        "mineralExplotado", "cantidadM3", "unidadMedida",
        "usuarioId", "createdAt"
      ) VALUES (
        gen_random_uuid(),
        ${tituloMineroId}, ${clienteId},
        ${String(mineralExplotado)},
        ${cantidadM3 ? Number(cantidadM3) : null},
        ${unidadMedida || "M3"},
        ${req.user?.id || null},
        NOW()
      )
      RETURNING id, "tituloMineroId", "clienteId", "mineralExplotado",
                "cantidadM3", "unidadMedida", "fechaCertificado", "createdAt"
    `;

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error creando certificado:", error);
    res.status(500).json({ success: false, message: "Error al crear certificado de origen", error: error.message });
  }
};

// ============================================
// GET /api/certificados-origen/:id/excel
// ============================================
const descargarExcel = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Certificado
    const certs = await prisma.$queryRaw`
      SELECT id, "tituloMineroId", "clienteId", "mineralExplotado",
             "cantidadM3", "unidadMedida", "fechaCertificado", "createdAt"
      FROM certificados_origen WHERE id = ${id} LIMIT 1
    `;
    if (!certs || certs.length === 0) {
      return res.status(404).json({ success: false, message: "Certificado no encontrado." });
    }
    const cert = certs[0];

    // 2. Título minero
    const titulos = await prisma.$queryRaw`
      SELECT id, "numeroTitulo", municipio, departamento,
             nit, "nombreTitular", "cedulaTitular"
      FROM titulos_mineros WHERE id = ${cert.tituloMineroId} LIMIT 1
    `;

    // 3. Cliente
    const clientes = await prisma.$queryRaw`
      SELECT id, cedula, nombre, correo, telefono, direccion,
            "tipoIdentificacion", "tipoComprador", rucom
      FROM clientes_compradores WHERE id = ${cert.clienteId} LIMIT 1
    `;

    // 4. Nombre del mineral desde el catálogo (código → nombre legible)
    const minerales = await prisma.$queryRaw`
      SELECT nombre FROM puntos_items_catalogo
      WHERE codigo = ${cert.mineralExplotado}
      AND categoria = 'inspeccion'
      LIMIT 1
    `;
    const mineralNombre = minerales?.[0]?.nombre || cert.mineralExplotado;

    // 5. Generar workbook
    const workbook = await generarCertificadoExcel({
      id:               cert.id,
      fechaCertificado: cert.fechaCertificado || cert.createdAt,
      mineralExplotado: mineralNombre,          // ← nombre legible
      cantidadM3:       cert.cantidadM3,
      unidadMedida:     cert.unidadMedida,
      titulo:           titulos[0]  || null,
      cliente:          clientes[0] || null,
    });

    // 6. Enviar
    const fecha  = new Date().toISOString().split("T")[0];
    const nombre = `Certificado_Origen_${fecha}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("❌ Error generando Excel:", error);
    res.status(500).json({ success: false, message: "Error al generar el Excel", error: error.message });
  }
};

module.exports = { buscarCliente, crearCliente, actualizarCliente, crearCertificado, descargarExcel };