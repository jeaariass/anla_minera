// ══════════════════════════════════════════════════════════════
// REPORT CONTROLLER — TU MINA / ANM-FRI
// ══════════════════════════════════════════════════════════════
const { PrismaClient } = require('@prisma/client');
const jwt     = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');   // npm install pdfkit
const fs   = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ── Verificar token ───────────────────────────────────────────
const verificarToken = (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ success: false, message: 'Token no proporcionado' });
      return null;
    }
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido' });
    return null;
  }
};

// ── Modelo Prisma por tipo ────────────────────────────────────
const getModeloPorTipo = (tipo) => ({
  produccion:  prisma.fRIProduccion,
  inventarios: prisma.fRIInventarios,
  paradas:     prisma.fRIParadas,
  ejecucion:   prisma.fRIEjecucion,
  maquinaria:  prisma.fRIMaquinaria,
  regalias:    prisma.fRIRegalias,
}[tipo] || null);

// ── Construir filtros Prisma ──────────────────────────────────
// CORRECCIÓN: el controller subido solo filtraba por fecha.
// Ahora soporta: fecha, usuarioId (solo ADMIN), estado, mineral, tituloMineroId.
const construirFiltros = ({ decoded, fechaInicio, fechaFin, usuarioId, estado, tituloMineroId, mineral }) => {
  const where = {};

  if (fechaInicio && fechaFin) {
    where.fechaCorte = {
      gte: new Date(fechaInicio),
      lte: new Date(new Date(fechaFin).setHours(23, 59, 59, 999)),
    };
  }

  // Si no es ADMIN solo ve sus propios registros
  if (decoded.rol !== 'ADMIN') {
    where.usuarioId = decoded.id;
  } else if (usuarioId) {
    where.usuarioId = usuarioId;
  }

  if (estado)         where.estado         = estado;
  if (tituloMineroId) where.tituloMineroId = tituloMineroId;
  if (mineral)        where.mineral        = mineral;

  return where;
};

// ── Encabezados de tabla ──────────────────────────────────────
// CORRECCIÓN: los nombres anteriores usaban guiones bajos y eran
// muy largos (ej: 'Fecha_corte_informacion_reportada').
// Ahora son cortos y legibles en pantalla, Excel y PDF.
const getColumnas = (tipo) => ({
  produccion: [
    'Fecha Corte', 'Mineral', 'Título Minero', 'Municipio', 'Cód. Municipio',
    'Horas Op.', 'Cantidad', 'Unidad', 'Mat. Entra Planta', 'Mat. Sale Planta',
    'Masa Unitaria', 'Estado'
  ],
  inventarios: [
    'Fecha Corte', 'Mineral', 'Título Minero', 'Municipio', 'Cód. Municipio',
    'Unidad', 'Inv. Inicial', 'Inv. Final', 'Ingreso Acopio', 'Salida Acopio', 'Estado'
  ],
  paradas: [
    'Fecha Corte', 'Título Minero', 'Municipio', 'Cód. Municipio',
    'Tipo Parada', 'Fecha Inicio', 'Fecha Fin', 'Horas Paradas', 'Motivo', 'Estado'
  ],
  ejecucion: [
    'Fecha Corte', 'Mineral', 'Título Minero', 'Municipio', 'Cód. Municipio',
    'Frente', 'Latitud', 'Longitud', 'Método Explotación', 'Avance', 'Unidad Avance',
    'Volumen', 'Estado'
  ],
  maquinaria: [
    'Fecha Corte', 'Título Minero', 'Municipio', 'Cód. Municipio',
    'Tipo Maquinaria', 'Cantidad', 'Horas Operación', 'Cap. Transporte', 'Unidad Cap.', 'Estado'
  ],
  regalias: [
    'Fecha Corte', 'Mineral', 'Título Minero', 'Municipio', 'Cód. Municipio',
    'Cantidad Extraída', 'Unidad', 'Valor Declaración', 'Contraprestaciones',
    'Resolución UPME', 'Estado'
  ],
}[tipo] || []);

// ── Transformar datos BD → filas para tabla/Excel/PDF ─────────
// IMPORTANTE: el orden de propiedades en cada objeto devuelto
// debe coincidir exactamente con el orden de getColumnas(tipo),
// porque el frontend y el Excel usan Object.values(registro).
const transformarDatos = (datos, tipo) => {
  const fecha = (f) => f ? new Date(f).toLocaleDateString('es-CO') : '';
  const num   = (v) => (v === null || v === undefined) ? '' : v;

  return datos.map(r => {
    const titulo   = r.tituloMinero?.numeroTitulo    || '';
    const municipio = r.tituloMinero?.municipio      || '';
    const codMun   = r.tituloMinero?.codigoMunicipio || '';
    const est      = r.estado || '';

    switch (tipo) {
      case 'produccion': return {
        fechaCorte: fecha(r.fechaCorte), mineral: r.mineral || '',
        tituloMinero: titulo, municipio, codigoMunicipio: codMun,
        horasOperativas: num(r.horasOperativas), cantidadProduccion: num(r.cantidadProduccion),
        unidadMedida: r.unidadMedida || '',
        materialEntraPlanta: num(r.materialEntraPlanta), materialSalePlanta: num(r.materialSalePlanta),
        masaUnitaria: num(r.masaUnitaria), estado: est,
      };
      case 'inventarios': return {
        fechaCorte: fecha(r.fechaCorte), mineral: r.mineral || '',
        tituloMinero: titulo, municipio, codigoMunicipio: codMun,
        unidadMedida: r.unidadMedida || '',
        inventarioInicialAcopio: num(r.inventarioInicialAcopio),
        inventarioFinalAcopio: num(r.inventarioFinalAcopio),
        ingresoAcopio: num(r.ingresoAcopio), salidaAcopio: num(r.salidaAcopio), estado: est,
      };
      case 'paradas': return {
        fechaCorte: fecha(r.fechaCorte), tituloMinero: titulo, municipio, codigoMunicipio: codMun,
        tipoParada: r.tipoParada || '', fechaInicio: fecha(r.fechaInicio), fechaFin: fecha(r.fechaFin),
        horasParadas: num(r.horasParadas), motivo: r.motivo || '', estado: est,
      };
      case 'ejecucion': return {
        fechaCorte: fecha(r.fechaCorte), mineral: r.mineral || '',
        tituloMinero: titulo, municipio, codigoMunicipio: codMun,
        denominacionFrente: r.denominacionFrente || '',
        latitud: num(r.latitud), longitud: num(r.longitud),
        metodoExplotacion: r.metodoExplotacion || '',
        avanceEjecutado: num(r.avanceEjecutado), unidadMedidaAvance: r.unidadMedidaAvance || '',
        volumenEjecutado: num(r.volumenEjecutado), estado: est,
      };
      case 'maquinaria': return {
        fechaCorte: fecha(r.fechaCorte), tituloMinero: titulo, municipio, codigoMunicipio: codMun,
        tipoMaquinaria: r.tipoMaquinaria || '', cantidad: num(r.cantidad),
        horasOperacion: num(r.horasOperacion), capacidadTransporte: num(r.capacidadTransporte),
        unidadCapacidad: r.unidadCapacidad || '', estado: est,
      };
      case 'regalias': return {
        fechaCorte: fecha(r.fechaCorte), mineral: r.mineral || '',
        tituloMinero: titulo, municipio, codigoMunicipio: codMun,
        cantidadExtraida: num(r.cantidadExtraida), unidadMedida: r.unidadMedida || '',
        valorDeclaracion: num(r.valorDeclaracion),
        valorContraprestaciones: num(r.valorContraprestaciones),
        resolucionUPME: r.resolucionUPME || '', estado: est,
      };
      default: return { fechaCorte: fecha(r.fechaCorte), tituloMinero: titulo, estado: est };
    }
  });
};

// ══════════════════════════════════════════════════════════════
// VISTA PREVIA
// ══════════════════════════════════════════════════════════════
exports.getPreview = async (req, res) => {
  try {
    const decoded = verificarToken(req, res);
    if (!decoded) return;

    const { tipo, fechaInicio, fechaFin, usuarioId, estado, tituloMineroId, mineral } = req.query;
    if (!tipo) return res.status(400).json({ success: false, message: 'Tipo de formulario requerido' });

    const modelo = getModeloPorTipo(tipo);
    if (!modelo)  return res.status(400).json({ success: false, message: 'Tipo inválido' });

    const where = construirFiltros({ decoded, fechaInicio, fechaFin, usuarioId, estado, tituloMineroId, mineral });

    const datos = await modelo.findMany({
      where,
      include: {
        tituloMinero: true,
        // Solo en preview — para mostrar quién creó cada registro visualmente.
        // NO se incluye en exportarExcel ni exportarPDF para no contaminar los datos.
        usuario: { select: { nombre: true } },
      },
      orderBy: { fechaCorte: 'desc' },
      take: 100,
    });

    const columnas  = getColumnas(tipo);
    const registros = transformarDatos(datos, tipo);

    // creadoPor: array paralelo a registros (mismo índice).
    // El frontend lo muestra como columna visual; los exports nunca lo usan.
    const creadoPor = datos.map(d => d.usuario?.nombre || '—');

    res.json({ success: true, columnas, registros, creadoPor, total: registros.length });

  } catch (error) {
    console.error('Error en preview:', error);
    res.status(500).json({ success: false, message: 'Error al obtener datos', error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// EXPORTAR EXCEL
// Formato mínimo: cabecera en negrita, datos planos sin colores.
// El usuario puede aplicar su propio formato en Excel.
// ══════════════════════════════════════════════════════════════
exports.exportarExcel = async (req, res) => {
  try {
    const decoded = verificarToken(req, res);
    if (!decoded) return;

    const { tipo, fechaInicio, fechaFin, usuarioId, estado, tituloMineroId, mineral } = req.query;
    if (!tipo) return res.status(400).json({ success: false, message: 'Tipo requerido' });

    const modelo = getModeloPorTipo(tipo);
    if (!modelo)  return res.status(400).json({ success: false, message: 'Tipo inválido' });

    const where = construirFiltros({ decoded, fechaInicio, fechaFin, usuarioId, estado, tituloMineroId, mineral });

    const datos = await modelo.findMany({
      where,
      include: { tituloMinero: true },
      orderBy: { fechaCorte: 'asc' },
    });

    if (!datos.length) return res.status(404).json({ success: false, message: 'No hay datos para exportar' });

    const columnas  = getColumnas(tipo);
    const registros = transformarDatos(datos, tipo);

    const workbook = new ExcelJS.Workbook();
    const sheet    = workbook.addWorksheet('Datos');

    // Columnas con cabeceras legibles
    sheet.columns = columnas.map((col, i) => ({ header: col, key: `c${i}`, width: 20 }));
    sheet.getRow(1).font      = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Filas de datos usando el orden de Object.values
    registros.forEach(reg => sheet.addRow(Object.values(reg)));

    const nombre = `FRI_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exportando Excel:', error);
    res.status(500).json({ success: false, message: 'Error al exportar Excel', error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// EXPORTAR PDF
// Usa pdfkit — dibuja el PDF como canvas, sin puppeteer.
// Transmite directamente al response con doc.pipe(res).
// ══════════════════════════════════════════════════════════════
exports.exportarPDF = async (req, res) => {
  try {
    const decoded = verificarToken(req, res);
    if (!decoded) return;

    const { tipo, fechaInicio, fechaFin, usuarioId, estado, tituloMineroId, mineral } = req.query;
    if (!tipo) return res.status(400).json({ success: false, message: 'Tipo requerido' });

    const modelo = getModeloPorTipo(tipo);
    if (!modelo)  return res.status(400).json({ success: false, message: 'Tipo inválido' });

    const where = construirFiltros({ decoded, fechaInicio, fechaFin, usuarioId, estado, tituloMineroId, mineral });

    const datos = await modelo.findMany({
      where,
      include: { tituloMinero: true },
      orderBy: { fechaCorte: 'asc' },
    });

    if (!datos.length) return res.status(404).json({ success: false, message: 'No hay datos para exportar' });

    const registros = transformarDatos(datos, tipo);
    const columnas  = getColumnas(tipo);

    const TITULOS = {
      produccion: 'FRI — Producción',  inventarios: 'FRI — Inventarios',
      paradas:    'FRI — Paradas',     ejecucion:   'FRI — Ejecución',
      maquinaria: 'FRI — Maquinaria',  regalias:    'FRI — Regalías',
    };

    // ── Colores ───────────────────────────────────────────────
    const NEGRO      = '#111827';
    const GRIS       = '#6B7280';
    const GRIS_CLARO = '#E5E7EB';
    const AZUL_BG    = '#DBEAFE';
    const AZUL_TXT   = '#1D4ED8';
    const FILA_PAR   = '#F9FAFB';
    const BLANCO     = '#FFFFFF';

    // ── Documento ─────────────────────────────────────────────
    const doc = new PDFDocument({
      size: 'A4', layout: 'landscape',
      margins: { top: 45, bottom: 45, left: 30, right: 30 },
      bufferPages: true,
    });

    const nombre = `FRI_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    doc.pipe(res);

    // ── Medidas ───────────────────────────────────────────────
    const ML    = doc.page.margins.left;
    const MT    = doc.page.margins.top;
    const PW    = doc.page.width  - doc.page.margins.left - doc.page.margins.right;
    const PH    = doc.page.height - doc.page.margins.top  - doc.page.margins.bottom;
    const COL_W = Math.floor(PW / columnas.length);
    const HDR_H = 22;
    const PIE_H = 20;

    // ── Logo ──────────────────────────────────────────────────
    const logoCandidatos = [
      path.resolve(process.cwd(), 'assets', 'logo.png'),
      path.join(__dirname, '..', 'assets', 'logo.png'),
      path.join(__dirname, '..', '..', 'assets', 'logo.png'),
    ];
    const logoPath = logoCandidatos.find(p => fs.existsSync(p)) || null;
    console.log('🖼  Logo PDF:', logoPath ?? '❌ no encontrado en: ' + logoCandidatos.join(', '));

    // ── Chips de filtros ──────────────────────────────────────
    const chips = [
      fechaInicio ? `Desde: ${fechaInicio}` : null,
      fechaFin    ? `Hasta: ${fechaFin}`    : null,
      estado      ? `Estado: ${estado}`     : null,
      mineral     ? `Mineral: ${mineral}`   : null,
    ].filter(Boolean);

    // ── Altura de fila dinámica (todo en 1 página) ────────────
    const ENCABEZADO_H = 64;
    const CHIPS_H      = chips.length ? 20 : 0;
    const TOTAL_H      = 12;
    const DISPONIBLE   = PH - ENCABEZADO_H - CHIPS_H - TOTAL_H - HDR_H - PIE_H;
    const ROW_H = registros.length > 0
      ? Math.max(14, Math.min(20, Math.floor(DISPONIBLE / registros.length)))
      : 18;

    let y = MT;

    // ── Encabezado (se repite en cada página) ─────────────────
    const dibujarEncabezado = () => {
      y = MT;
      if (logoPath) doc.image(logoPath, ML, y, { width: 40, height: 40 });
      const txtX = logoPath ? ML + 48 : ML;

      doc.fontSize(15).font('Helvetica-Bold').fillColor(NEGRO).text('TU MINA', txtX, y, { lineBreak: false });
      doc.fontSize(8).font('Helvetica').fillColor(GRIS).text('Sistema ANM-FRI  •  CTGlobal', txtX, y + 19);
      doc.fontSize(12).font('Helvetica-Bold').fillColor(NEGRO)
         .text(TITULOS[tipo] || `FRI — ${tipo}`, ML, y, { align: 'right', width: PW, lineBreak: false });
      doc.fontSize(8).font('Helvetica').fillColor(GRIS)
         .text(`Generado: ${new Date().toLocaleString('es-CO')}`, ML, y + 16, { align: 'right', width: PW });

      y += 48;
      doc.moveTo(ML, y).lineTo(ML + PW, y).strokeColor(GRIS_CLARO).lineWidth(0.8).stroke();
      y += 8;
    };

    dibujarEncabezado();

    // ── Chips ─────────────────────────────────────────────────
    if (chips.length) {
      let chipX = ML;
      chips.forEach(chip => {
        const w = doc.widthOfString(chip, { size: 8 }) + 14;
        doc.roundedRect(chipX, y, w, 15, 7).fillColor(AZUL_BG).fill();
        doc.fontSize(8).font('Helvetica').fillColor(AZUL_TXT).text(chip, chipX + 7, y + 4, { lineBreak: false });
        chipX += w + 5;
      });
      y += 20;
    }

    doc.fontSize(8).font('Helvetica').fillColor(GRIS).text(`Total de registros: ${registros.length}`, ML, y);
    y += 12;

    // ── Cabecera de tabla ─────────────────────────────────────
    const dibujarCabecera = () => {
      doc.rect(ML, y, PW, HDR_H).fillColor(NEGRO).fill();
      columnas.forEach((col, i) => {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor(BLANCO)
           .text(col, ML + i * COL_W + 3, y + 7, { width: COL_W - 5, lineBreak: false, ellipsis: true });
      });
      y += HDR_H;
    };

    dibujarCabecera();

    // ── Filas ─────────────────────────────────────────────────
    registros.forEach((registro, idx) => {
      if (y + ROW_H > MT + PH) {
        doc.addPage();
        dibujarEncabezado();
        dibujarCabecera();
      }
      doc.rect(ML, y, PW, ROW_H).fillColor(idx % 2 === 0 ? FILA_PAR : BLANCO).fill();
      doc.rect(ML, y, PW, ROW_H).strokeColor(GRIS_CLARO).lineWidth(0.3).stroke();

      Object.values(registro).forEach((val, i) => {
        doc.fontSize(6.5).font('Helvetica').fillColor(NEGRO)
           .text(val !== null && val !== undefined ? String(val) : '—',
                 ML + i * COL_W + 3, y + 5,
                 { width: COL_W - 5, lineBreak: false, ellipsis: true });
      });
      y += ROW_H;
    });

    // ── Pie de página (pieY DENTRO del margen — evita página extra) ──
    const totalPaginas = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPaginas; i++) {
      doc.switchToPage(i);
      const pieY = doc.page.height - doc.page.margins.bottom - 12;
      doc.fontSize(7).font('Helvetica').fillColor(GRIS)
         .text(
           `TU MINA — Sistema ANM-FRI  •  ${new Date().toLocaleDateString('es-CO')}  •  Página ${i + 1} de ${totalPaginas}`,
           ML, pieY, { align: 'center', width: PW },
         );
    }

    doc.end();

  } catch (error) {
    console.error('❌ Error exportando PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error al exportar PDF', error: error.message });
    }
  }
};