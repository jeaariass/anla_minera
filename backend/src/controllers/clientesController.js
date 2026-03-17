// backend/src/controllers/clientesController.js
const { PrismaClient }              = require("@prisma/client");
const fs                            = require("fs");
const prisma                        = new PrismaClient();
const { generarCertificadoExcel }   = require("../services/certificadoExcelService");
const { generarCertificadoPdf }     = require("../services/certificadoPdfService");
const { resolverRuta }              = require("../services/storageService");

function generarConsecutivo() {
  const d   = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

async function resolverMineralNombre(codigo) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT nombre FROM puntos_items_catalogo
      WHERE codigo = ${codigo} AND categoria = 'inspeccion' LIMIT 1
    `;
    return rows?.[0]?.nombre || codigo;
  } catch { return codigo; }
}

async function cargarDatosCertificado(id) {
  const certs = await prisma.$queryRaw`
    SELECT id, "tituloMineroId", "clienteId", "mineralExplotado",
           "cantidadM3", "unidadMedida", consecutivo, "fechaCertificado", "createdAt"
    FROM certificados_origen WHERE id = ${id} LIMIT 1
  `;
  if (!certs || certs.length === 0) return null;
  const cert = certs[0];

  const titulos = await prisma.$queryRaw`
    SELECT id, "numeroTitulo", municipio, departamento, nit, "nombreTitular", "cedulaTitular"
    FROM titulos_mineros WHERE id = ${cert.tituloMineroId} LIMIT 1
  `;
  const clientes = await prisma.$queryRaw`
    SELECT id, cedula, nombre, "tipoIdentificacion", "tipoComprador", rucom
    FROM clientes_compradores WHERE id = ${cert.clienteId} LIMIT 1
  `;

  const titulo        = titulos[0]  || null;
  const cliente       = clientes[0] || null;
  const consecutivo   = cert.consecutivo || generarConsecutivo();
  const mineralNombre = await resolverMineralNombre(cert.mineralExplotado);

  return { cert, titulo, cliente, consecutivo, mineralNombre };
}

// ============================================
// GET /api/clientes/buscar
// ============================================
const buscarCliente = async (req, res) => {
  try {
    const { cedula, correo } = req.query;
    if (!cedula && !correo)
      return res.status(400).json({ success: false, message: "Debes enviar cedula o correo." });

    const rows = cedula
      ? await prisma.$queryRaw`
          SELECT id, cedula, nombre, correo, telefono, direccion,
                 "tipoIdentificacion", "tipoComprador", rucom
          FROM clientes_compradores WHERE cedula = ${String(cedula).trim()} LIMIT 1`
      : await prisma.$queryRaw`
          SELECT id, cedula, nombre, correo, telefono, direccion,
                 "tipoIdentificacion", "tipoComprador", rucom
          FROM clientes_compradores WHERE LOWER(correo) = LOWER(${String(correo).trim()}) LIMIT 1`;

    if (!rows || rows.length === 0)
      return res.status(404).json({ success: false, message: "No se encontró ningún cliente." });

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
    if (!cedula || !nombre)  return res.status(400).json({ success: false, message: "Cédula y nombre son obligatorios." });
    if (!tipoIdentificacion) return res.status(400).json({ success: false, message: "El tipo de identificación es obligatorio." });
    if (!tipoComprador)      return res.status(400).json({ success: false, message: "El tipo de comprador es obligatorio." });

    const existe = await prisma.$queryRaw`SELECT id FROM clientes_compradores WHERE cedula = ${String(cedula).trim()} LIMIT 1`;
    if (existe && existe.length > 0)
      return res.status(409).json({ success: false, message: "Ya existe un cliente con esa cédula." });

    const rows = await prisma.$queryRaw`
      INSERT INTO clientes_compradores (
        id, cedula, nombre, correo, telefono, direccion,
        "tipoIdentificacion", "tipoComprador", rucom, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${String(cedula).trim()}, ${String(nombre).trim()},
        ${correo    ? String(correo).trim()    : null},
        ${telefono  ? String(telefono).trim()  : null},
        ${direccion ? String(direccion).trim() : null},
        ${String(tipoIdentificacion).trim()}, ${String(tipoComprador).trim()},
        ${rucom ? String(rucom).trim() : null}, NOW(), NOW()
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
    if (!rows || rows.length === 0)
      return res.status(404).json({ success: false, message: "Cliente no encontrado." });
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
    if (!tituloMineroId || !clienteId || !mineralExplotado)
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });

    const consecutivo = generarConsecutivo();

    const rows = await prisma.$queryRaw`
      INSERT INTO certificados_origen (
        id, "tituloMineroId", "clienteId",
        "mineralExplotado", "cantidadM3", "unidadMedida",
        consecutivo, "usuarioId", "createdAt"
      ) VALUES (
        gen_random_uuid(), ${tituloMineroId}, ${clienteId},
        ${String(mineralExplotado)},
        ${cantidadM3 !== undefined && cantidadM3 !== null && cantidadM3 !== "" ? Number(cantidadM3) : null},
        ${unidadMedida || "M3"},
        ${consecutivo},
        ${req.user?.id || null}, NOW()
      )
      RETURNING id, "tituloMineroId", "clienteId", "mineralExplotado",
                "cantidadM3", "unidadMedida", consecutivo, "createdAt"
    `;
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error creando certificado:", error);
    res.status(500).json({ success: false, message: "Error al crear certificado", error: error.message });
  }
};

// ============================================
// GET /api/certificados-origen/:id/excel
// Descarga Excel (template oficial) + guarda PDF en disco
// ============================================
const descargarExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = await cargarDatosCertificado(id);
    if (!datos) return res.status(404).json({ success: false, message: "Certificado no encontrado." });

    const { cert, titulo, cliente, consecutivo, mineralNombre } = datos;

    // 1. Generar Excel desde template y guardar en disco
    const { fullPath: xlsxPath, relativa: xlsxRel } = resolverRuta(
      titulo?.numeroTitulo || "SIN_TITULO", consecutivo, "xlsx"
    );
    const workbook = await generarCertificadoExcel({
      id,
      fechaCertificado: cert.fechaCertificado || cert.createdAt,
      mineralExplotado: mineralNombre,
      cantidadM3:  cert.cantidadM3,
      unidadMedida: cert.unidadMedida,
      titulo,
      cliente,
    });
    await workbook.xlsx.writeFile(xlsxPath);
    await prisma.$queryRaw`UPDATE certificados_origen SET "rutaXlsx" = ${xlsxRel} WHERE id = ${id}`;

    // 2. Guardar PDF silenciosamente en disco
    try {
      const { fullPath: pdfPath, relativa: pdfRel } = resolverRuta(
        titulo?.numeroTitulo || "SIN_TITULO", consecutivo, "pdf"
      );
      await generarCertificadoPdf({
        consecutivo,
        fecha:            cert.fechaCertificado || cert.createdAt,
        mineralExplotado: mineralNombre,
        cantidadM3:       cert.cantidadM3,
        unidadMedida:     cert.unidadMedida,
        titulo,
        cliente,
      }, pdfPath);
      await prisma.$queryRaw`UPDATE certificados_origen SET "rutaPdf" = ${pdfRel} WHERE id = ${id}`;
    } catch (pdfErr) {
      console.warn("⚠️  PDF guardado fallido (no bloquea):", pdfErr.message);
    }

    // 3. Enviar Excel al operario
    const nombre = `Certificado_Origen_${consecutivo}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    fs.createReadStream(xlsxPath).pipe(res);

  } catch (error) {
    console.error("❌ Error generando Excel:", error);
    res.status(500).json({ success: false, message: "Error al generar el Excel", error: error.message });
  }
};

// ============================================
// GET /api/certificados-origen/:id/pdf
// Genera y guarda PDF (siempre). También guarda Excel si no existe.
// ============================================
const descargarPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = await cargarDatosCertificado(id);
    if (!datos) return res.status(404).json({ success: false, message: "Certificado no encontrado." });

    const { cert, titulo, cliente, consecutivo, mineralNombre } = datos;

    const datosCert = {
      consecutivo,
      fecha:            cert.fechaCertificado || cert.createdAt,
      mineralExplotado: mineralNombre,
      cantidadM3:       cert.cantidadM3,
      unidadMedida:     cert.unidadMedida,
      titulo,
      cliente,
    };

    // 1. Generar y guardar PDF (siempre, para tener la versión más reciente)
    const { fullPath: pdfPath, relativa: pdfRel } = resolverRuta(
      titulo?.numeroTitulo || "SIN_TITULO", consecutivo, "pdf"
    );
    await generarCertificadoPdf(datosCert, pdfPath);
    await prisma.$queryRaw`UPDATE certificados_origen SET "rutaPdf" = ${pdfRel} WHERE id = ${id}`;

    // 2. Guardar Excel silenciosamente si no existe aún
    try {
      const { fullPath: xlsxPath, relativa: xlsxRel } = resolverRuta(
        titulo?.numeroTitulo || "SIN_TITULO", consecutivo, "xlsx"
      );
      if (!fs.existsSync(xlsxPath)) {
        const workbook = await generarCertificadoExcel({ id, ...datosCert });
        await workbook.xlsx.writeFile(xlsxPath);
        await prisma.$queryRaw`UPDATE certificados_origen SET "rutaXlsx" = ${xlsxRel} WHERE id = ${id}`;
      }
    } catch (xlsxErr) {
      console.warn("⚠️  Excel guardado fallido (no bloquea):", xlsxErr.message);
    }

    // 3. Enviar PDF al usuario
    const nombre = `Certificado_Origen_${consecutivo}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    fs.createReadStream(pdfPath).pipe(res);

  } catch (error) {
    console.error("❌ Error generando PDF:", error);
    res.status(500).json({ success: false, message: "Error al generar PDF", error: error.message });
  }
};


// ============================================
// GET /api/certificados-origen?tituloMineroId=
// ============================================
const listarCertificados = async (req, res) => {
  try {
    const { tituloMineroId, limit = 200 } = req.query;

    const where = tituloMineroId ? `WHERE co."tituloMineroId" = '${tituloMineroId}'` : '';

    const certs = await prisma.$queryRawUnsafe(`
      SELECT
        co.id,
        co."tituloMineroId",
        co."clienteId",
        co."mineralExplotado",
        co."cantidadM3",
        co."unidadMedida",
        co.consecutivo,
        co."fechaCertificado",
        co."createdAt",
        cc.nombre  AS cliente_nombre,
        cc.cedula  AS cliente_cedula
      FROM certificados_origen co
      LEFT JOIN clientes_compradores cc ON cc.id = co."clienteId"
      ${where}
      ORDER BY co."createdAt" DESC
      LIMIT ${parseInt(limit, 10) || 200}
    `);

    // Formatear para el frontend
    const data = certs.map(c => ({
      ...c,
      clientes_compradores: { nombre: c.cliente_nombre, cedula: c.cliente_cedula },
    }));

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error("❌ Error listando certificados:", error);
    res.status(500).json({ success: false, message: "Error al listar certificados", error: error.message });
  }
};

module.exports = {
  buscarCliente, crearCliente, actualizarCliente,
  crearCertificado, descargarExcel, descargarPdf, listarCertificados,
};