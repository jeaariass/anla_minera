// backend/src/services/certificadoExcelService.js
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const TEMPLATE_PATH = path.join(
  __dirname,
  "../templates/certificado_origen.xlsx",
);
const FIRMA_PATH = path.join(__dirname, "../templates/firma.png");

function dato(ws, coord, valor) {
  ws.getCell(coord).value =
    valor !== null && valor !== undefined && valor !== "" ? valor : null;
}

function tachar(ws, coord) {
  const cell = ws.getCell(coord);
  const texto = typeof cell.value === "string" ? cell.value : "";
  cell.value = `X  ${texto}`;
  cell.font = { ...(cell.font || {}), bold: true };
}

function marcarX(ws, mapa, valorElegido) {
  const elegido = (valorElegido || "").toUpperCase().trim();
  Object.entries(mapa).forEach(([opcion, coord]) => {
    if (opcion.toUpperCase().trim() === elegido) tachar(ws, coord);
  });
}

function generarConsecutivo() {
  // Siempre tomar el momento actual ajustado a Colombia (UTC-5)
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

async function generarCertificadoExcel(datos) {
  const {
    id,
    fechaCertificado,
    mineralExplotado,
    cantidadM3,
    unidadMedida,
    titulo,
    cliente,
  } = datos;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const ws = workbook.getWorksheet("TITULARES-SOL-ARE-SUBCTO");

  const fecha = fechaCertificado ? new Date(fechaCertificado) : new Date();

  dato(ws, "C4", String(fecha.getUTCDate()).padStart(2, "0"));
  dato(ws, "D4", String(fecha.getUTCMonth() + 1).padStart(2, "0"));
  dato(ws, "E4", String(fecha.getUTCFullYear()));
  dato(ws, "H3", generarConsecutivo());

  tachar(ws, "F6");

  dato(ws, "F8", titulo?.numeroTitulo || "");
  dato(ws, "F9", titulo?.nombreTitular || "");

  marcarX(
    ws,
    {
      NIT: "F10",
      CÉDULA: "G10",
      "CÉDULA DE EXTRANJERÍA": "H10",
      RUT: "I10",
    },
    "CÉDULA",
  );

  dato(ws, "F11", titulo?.cedulaTitular || "");
  dato(ws, "F12", titulo?.departamento || "");
  dato(ws, "F13", titulo?.municipio || "");
  dato(ws, "F14", mineralExplotado || "");

  if (cantidadM3 !== null && cantidadM3 !== undefined && cantidadM3 !== "") {
    dato(ws, "F15", Number(cantidadM3));
  }

  dato(ws, "F16", unidadMedida || "");
  dato(ws, "F18", cliente?.nombre || "");

  marcarX(
    ws,
    {
      NIT: "F19",
      CÉDULA: "G19",
      "CÉDULA DE EXTRANJERÍA": "H19",
      RUT: "I19",
    },
    cliente?.tipoIdentificacion || "",
  );

  marcarX(
    ws,
    {
      COMERCIALIZADOR: "F20",
      CONSUMIDOR: "H20",
    },
    cliente?.tipoComprador || "",
  );

  dato(ws, "F21", cliente?.cedula || "");
  dato(ws, "F22", cliente?.rucom ? `RUCOM-${cliente.rucom}` : "");

  // ── Firma desde archivo en disco ─────────────────────────────────────────
  if (fs.existsSync(FIRMA_PATH)) {
    const imgId = workbook.addImage({
      filename: FIRMA_PATH,
      extension: "png",
    });
    ws.addImage(imgId, {
      tl: { col: 7, row: 22 }, // H23
      br: { col: 8, row: 23 }, // solo H23
      editAs: "oneCell",
    });
  }

  return workbook;
}

module.exports = { generarCertificadoExcel };
