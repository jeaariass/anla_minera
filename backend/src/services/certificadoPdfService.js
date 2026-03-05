// backend/src/services/certificadoPdfService.js
// Estructura y colores extraídos EXACTAMENTE del HTML de referencia (PhpSpreadsheet export)
// #548135 = verde oscuro (headers de sección, firma label)
// #A9CD90 = verde claro (fecha, consecutivo, explotador opciones, comprador labels)
// #FFFFFF = blanco (labels productor, área firma)
// white   = celdas de datos

const fs   = require("fs");
const path = require("path");

const FIRMA_PATH = path.join(__dirname, "../templates/firma.png");
const LOGO_B64   = "/9j/4AAQSkZJRgABAQEA3ADcAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCADAARADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9+KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiigkDqaACikVgwJBBxS0AFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFF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fwI8BReLI/EXh6Gz8UBdZsNPaO/tWaKOZvtdzHu323kR4jXC/Zsk5egD9gv2E/2qdL/ba/ZA+HXxU0hoja+NdEgv5o442jW1utuy6t8MSf3VwksecsD5eQzAhj61X5i/8GyH7Kv7Sn7DH7Pfjn4W/HjwLJ4V8P2Gqx6x4RuG16w1NmNwri9tsW1zL5UaPFDKo2qC9zOck1+nVABRRRQAUfhRRQAdO1FFFABRRRQAfhRRRQAfhRRRQAUUUUAFFFFAB16iiiigA/CiiigAooooAKMe1FFAB+FFFFAB+FGAe3SiigAxjoKPwoooAKKKKAD8KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/Z";

function firmaB64() {
  if (!fs.existsSync(FIRMA_PATH)) return null;
  return "data:image/png;base64," + fs.readFileSync(FIRMA_PATH).toString("base64");
}

// Checkbox: cuadro pequeño + texto. Si activo muestra ✓ verde.
function chk(activo, texto) {
  const box = activo
    ? `<span style="display:inline-block;width:10px;height:10px;background:#548135;border:1px solid #333;vertical-align:middle;text-align:center;line-height:10px;font-size:8px;color:#fff;margin-right:3px">&#10003;</span>`
    : `<span style="display:inline-block;width:10px;height:10px;background:#fff;border:1px solid #333;vertical-align:middle;margin-right:3px"></span>`;
  return box + texto;
}

function generarHTML(datos) {
  const { consecutivo, fecha, mineralExplotado, cantidadM3, unidadMedida, titulo, cliente } = datos;

  const f  = fecha ? new Date(fecha) : new Date();
  const dd = String(f.getDate()).padStart(2,"0");
  const mm = String(f.getMonth()+1).padStart(2,"0");
  const aa = String(f.getFullYear());

  const idTitular  = "CÉDULA";
  const idCliente  = (cliente?.tipoIdentificacion||"").toUpperCase().trim();
  const tipoComp   = (cliente?.tipoComprador||"").toUpperCase().trim();
  const firma      = firmaB64();
  const cant       = (cantidadM3!=null&&cantidadM3!==undefined&&cantidadM3!=="") ? String(cantidadM3) : "";

  // ─── estilos exactos del HTML de referencia ────────────────────────────────
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<style>
html { font-family:'Calibri',Arial,sans-serif; font-size:11pt; background:#fff; }
* { margin:0; padding:0; box-sizing:border-box; }
body { padding:10px 14px; }

/* anchos de columna (pt → %) de referencia:
   col0=40 col1=26 col2=26 col3=24 col4=38 col5=64 col6=60 col7=106 col8=67
   Total ≈ 453pt → normalizado a 100%
*/
table { width:100%; border-collapse:collapse; table-layout:fixed; }
col.c0 { width:8.8%  }
col.c1 { width:5.8%  }
col.c2 { width:5.8%  }
col.c3 { width:5.4%  }
col.c4 { width:8.4%  }
col.c5 { width:14.2% }
col.c6 { width:13.2% }
col.c7 { width:23.5% }
col.c8 { width:14.9% }

td { vertical-align:middle; font-family:'Calibri',Arial,sans-serif; font-size:8pt; padding:1px 3px; overflow:hidden; }

/* ── Estilos de sección verde oscuro ── */
.s-dark  { background:#548135; color:#fff; font-weight:bold; font-size:10pt;
            border-top:2px solid #000; border-bottom:1px solid #000;
            border-left:2px solid #000; border-right:2px solid #000;
            text-align:center; }
/* ── Verde claro ── */
.s-light { background:#A9CD90; color:#000; font-size:8pt;
            border:1px solid #000; }
.s-light-bold { background:#A9CD90; color:#000; font-size:8pt; font-weight:bold;
            border:1px solid #000; }
/* ── Blanco con borde (labels productor) ── */
.s-white { background:#FFFFFF; color:#000; font-size:8pt;
            border-top:1px solid #000; border-bottom:1px solid #000;
            border-left:2px solid #000; border-right:1px solid #000; }
.s-white-b2 { background:#FFFFFF; color:#000; font-size:8pt;
            border-top:1px solid #000; border-bottom:2px solid #000;
            border-left:2px solid #000; border-right:1px solid #000; }
/* ── Celdas de datos (valor) ── */
.s-val  { background:white; color:#000; font-size:8pt;
            border-top:1px solid #000; border-bottom:1px solid #000;
            border-left:1px solid #000; border-right:2px solid #000; }
.s-val-grey { background:white; color:#BFBFBF; font-size:8pt;
            border-top:1px solid #000; border-bottom:1px solid #000;
            border-left:1px solid #000; border-right:2px solid #000; }
.s-val-b2 { background:white; color:#000; font-size:8pt;
            border-top:1px solid #000; border-bottom:2px solid #000;
            border-left:1px solid #000; border-right:2px solid #000; }
/* ── Firma label ── */
.s-firma-lbl { background:#548135; color:#fff; font-weight:bold; font-size:8pt;
            border-top:1px solid #000; border-bottom:2px solid #000;
            border-left:2px solid #000; border-right:1px solid #000;
            text-align:center; }
/* ── Área de firma ── */
.s-firma-area { background:#FFFFFF; color:#000; font-size:10pt; font-weight:bold;
            border-top:1px solid #000; border-bottom:2px solid #000; }
.s-firma-area-r { background:#FFFFFF; color:#000; font-size:10pt; font-weight:bold;
            border-top:1px solid #000; border-bottom:2px solid #000;
            border-right:2px solid #000; }
/* ── Logo / institución ── */
.s-logo { border-top:2px solid #000; border-bottom:2px solid #000;
           border-left:2px solid #000; text-align:center; vertical-align:middle; padding:4px; }
.s-inst { border-top:2px solid #000; border-bottom:2px solid #000;
           border-right:2px solid #000; vertical-align:middle; padding:3px 6px; }
/* ── Fila 23: borde inferior ── */
.s-bot-l { border-left:2px solid #000; border-bottom:2px solid #000; height:6px; }
.s-bot-m { border-bottom:2px solid #000; height:6px; }
.s-bot-r { border-right:2px solid #000; border-bottom:2px solid #000; height:6px; }
/* ── Rows altura ── */
.row0  { height:36pt }
.row1  { height:15pt }
.row23 { height:15.75pt }
.row34 { height:18.75pt }
.row7  { height:15.75pt }
.row8  { height:29.25pt }
.row9  { height:23.25pt }
.row10 { height:20.25pt }
.row11 { height:21.75pt }
.row12 { height:22.5pt  }
.row13 { height:15.75pt }
.row14 { height:15.75pt }
.row15 { height:15.75pt }
.row17 { height:15.75pt }
.row18 { height:23.25pt }
.row19 { height:24pt    }
.row20 { height:15.75pt }
.row21 { height:15.75pt }
.row22 { height:22.5pt  }
.logo-img { max-height:30px; display:block; margin:auto; }
.firma-img { max-height:50px; max-width:180px; display:block; margin:auto; }
</style></head>
<body>
<table>
<col class="c0"><col class="c1"><col class="c2"><col class="c3"><col class="c4">
<col class="c5"><col class="c6"><col class="c7"><col class="c8">
<tbody>

<!-- ═══ FILA 0: Logo + Institución ═══ -->
<tr class="row0">
  <td colspan="4" class="s-logo">
    <img class="logo-img" src="data:image/jpeg;base64,${LOGO_B64}" alt="ANM"/>
  </td>
  <td colspan="5" class="s-inst">
    <span style="font-weight:bold;font-size:8pt">VICEPRESIDENCIA DE SEGUIMIENTO CONTROL Y SEGURIDAD MINERA</span><br/>
    <span style="font-size:8pt">Grupo de Regalías y Contraprestaciones Económicas</span>
  </td>
</tr>

<!-- ═══ FILA 1: Título certificado ═══ -->
<tr class="row1">
  <td colspan="9" class="s-dark" style="font-size:10pt">CERTIFICADO DE ORIGEN EXPLOTADOR MINERO AUTORIZADO</td>
</tr>

<!-- ═══ FILAS 2-3: Fecha + Consecutivo ═══ -->
<tr class="row23">
  <td colspan="2" rowspan="2" class="s-light" style="text-align:center;font-weight:bold;border-left:2px solid #000;border-bottom:2px solid #000;">FECHA</td>
  <td class="s-light" style="text-align:center;border-top:1px solid #000;border-bottom:none;border-right:1px solid #000;border-left:1px solid #000;">DD</td>
  <td class="s-light" style="text-align:center;border-top:1px solid #000;border-bottom:none;border-right:1px solid #000;border-left:1px solid #000;">MM</td>
  <td class="s-light" style="text-align:center;border-top:1px solid #000;border-bottom:none;border-right:1px solid #000;border-left:1px solid #000;">AAAA</td>
  <td colspan="2" rowspan="2" class="s-light" style="text-align:center;border-left:1px solid #000;border-bottom:2px solid #000;">&nbsp;No. Consecutivo del certificado de origen</td>
  <td colspan="2" rowspan="2" class="s-val-grey" style="text-align:center;font-size:8pt;">${consecutivo||""}</td>
</tr>
<tr style="height:13.5pt">
  <td class="s-light" style="text-align:center;font-weight:bold;font-size:10pt;border-top:none;border-bottom:2px solid #000;border-left:1px solid #000;border-right:1px solid #000;">${dd}</td>
  <td class="s-light" style="text-align:center;font-weight:bold;font-size:10pt;border-top:none;border-bottom:2px solid #000;border-left:1px solid #000;border-right:1px solid #000;">${mm}</td>
  <td class="s-light" style="text-align:center;font-weight:bold;font-size:10pt;border-top:none;border-bottom:2px solid #000;border-left:1px solid #000;border-right:1px solid #000;">${aa}</td>
</tr>

<!-- ═══ FILA 4: Encabezado productor ═══ -->
<tr style="height:12.75pt">
  <td colspan="9" class="s-dark">INFORMACIÓN DEL PRODUCTOR DEL MINERAL</td>
</tr>

<!-- ═══ FILAS 5-6: Tipo explotador + opciones ═══ -->
<tr class="row34">
  <td colspan="5" rowspan="2" class="s-light-bold" style="border-left:2px solid #000;border-bottom:2px solid #000;">EXPLOTADOR MINERO AUTORIZADO<br/><span style="font-weight:normal;font-size:8pt">(Seleccione una opción)</span></td>
  <td colspan="2" class="s-light-bold" style="border-top:1px solid #000;border-bottom:none;border-left:1px solid #000;border-right:1px solid #000;">${chk(true,"Titular Minero")}</td>
  <td colspan="2" class="s-light-bold" style="border-top:1px solid #000;border-bottom:none;border-left:none;border-right:1px solid #000;">${chk(false,"Beneficiario de Área de Reserva Especial")}</td>
</tr>
<tr class="row34">
  <td colspan="2" class="s-light-bold" style="border-top:1px solid #000;border-bottom:2px solid #000;border-left:1px solid #000;border-right:1px solid #000;">${chk(false,"Solicitante de Legalización")}</td>
  <td colspan="2" class="s-light-bold" style="border-top:1px solid #000;border-bottom:2px solid #000;border-left:none;border-right:1px solid #000;">${chk(false,"Subcontrato de Formalización")}</td>
</tr>

<!-- ═══ FILA 7: Código expediente ═══ -->
<tr class="row7">
  <td colspan="5" class="s-white">CÓDIGO EXPEDIENTE</td>
  <td colspan="4" class="s-val-grey" style="text-align:left;color:#000">${titulo?.numeroTitulo||""}</td>
</tr>

<!-- ═══ FILA 8: Nombres titular ═══ -->
<tr class="row8">
  <td colspan="5" class="s-white">NOMBRES Y APELLIDOS O RAZON SOCIAL DEL EXPLOTADOR MINERO AUTORIZADO</td>
  <td colspan="4" class="s-val">${titulo?.nombreTitular||""}</td>
</tr>

<!-- ═══ FILA 9: Tipo ID titular ═══ -->
<tr class="row9">
  <td colspan="5" class="s-white">TIPO DE IDENTIFICACIÓN DEL EXPLOTADOR MINERO AUTORIZADO</td>
  <td class="s-val" style="text-align:center">${chk(idTitular==="NIT","NIT")}</td>
  <td class="s-val" style="text-align:center">${chk(idTitular==="CÉDULA","CÉDULA")}</td>
  <td class="s-val" style="text-align:center">${chk(idTitular==="CÉDULA DE EXTRANJERÍA","CÉDULA DE<br/>EXTRANJERÍA")}</td>
  <td class="s-val" style="text-align:center;border-right:2px solid #000">${chk(idTitular==="RUT","RUT")}</td>
</tr>

<!-- ═══ FILA 10: No. documento titular ═══ -->
<tr class="row10">
  <td colspan="5" class="s-white">No. DOCUMENTO DE IDENTIDAD DEL EXPLOTADOR MINERO AUTORIZADO</td>
  <td colspan="4" class="s-val">${titulo?.cedulaTitular||""}</td>
</tr>

<!-- ═══ FILA 11: Departamento ═══ -->
<tr class="row11">
  <td colspan="5" class="s-white">DEPARTAMENTO (S) DONDE REALIZA LA EXPLOTACIÓN</td>
  <td colspan="4" class="s-val">${titulo?.departamento||""}</td>
</tr>

<!-- ═══ FILA 12: Municipio ═══ -->
<tr class="row12">
  <td colspan="5" class="s-white">MUNICIPIO(S) DONDE SE REALIZA LA EXPLOTACION</td>
  <td colspan="4" class="s-val">${titulo?.municipio||""}</td>
</tr>

<!-- ═══ FILA 13: Mineral ═══ -->
<tr class="row13">
  <td colspan="5" class="s-white">MINERAL EXPLOTADO</td>
  <td colspan="4" class="s-val">${mineralExplotado||""}</td>
</tr>

<!-- ═══ FILA 14: Cantidad ═══ -->
<tr class="row14">
  <td colspan="5" class="s-white">CANTIDAD MINERAL COMERCIALIZADO</td>
  <td colspan="4" class="s-val">${cant}</td>
</tr>

<!-- ═══ FILA 15: Unidad ═══ -->
<tr class="row15">
  <td colspan="5" class="s-white-b2">UNIDAD DE MEDIDA</td>
  <td colspan="4" class="s-val-b2">${unidadMedida||""}</td>
</tr>

<!-- ═══ FILA 16: Encabezado comprador ═══ -->
<tr style="height:12.75pt">
  <td colspan="9" class="s-dark">INFORMACIÓN DEL COMPRADOR DEL MINERAL</td>
</tr>

<!-- ═══ FILA 17: Nombres comprador ═══ -->
<tr class="row17">
  <td colspan="5" class="s-light" style="border-left:2px solid #000;border-right:1px solid #000;">NOMBRES Y APELLIDOS O RAZON SOCIAL</td>
  <td colspan="4" class="s-val">${cliente?.nombre||""}</td>
</tr>

<!-- ═══ FILA 18: Tipo ID comprador ═══ -->
<tr class="row18">
  <td colspan="5" class="s-light" style="border-left:2px solid #000;border-right:1px solid #000;">TIPO DE IDENTIFICACIÓN</td>
  <td class="s-val" style="text-align:center">${chk(idCliente==="NIT","NIT")}</td>
  <td class="s-val" style="text-align:center">${chk(idCliente==="CÉDULA","CÉDULA")}</td>
  <td class="s-val" style="text-align:center">${chk(idCliente==="CÉDULA DE EXTRANJERÍA","CÉDULA DE<br/>EXTRANJERÍA")}</td>
  <td class="s-val" style="text-align:center;border-right:2px solid #000">${chk(idCliente==="RUT","RUT")}</td>
</tr>

<!-- ═══ FILA 19: Tipo comprador ═══ -->
<tr class="row19">
  <td colspan="5" class="s-light" style="border-left:2px solid #000;border-right:1px solid #000;">COMPRADOR<br/>(Seleccione una opción)</td>
  <td colspan="2" class="s-val" style="text-align:center">${chk(tipoComp==="COMERCIALIZADOR","COMERCIALIZADOR")}</td>
  <td colspan="2" class="s-val" style="text-align:center;border-right:2px solid #000">${chk(tipoComp==="CONSUMIDOR","CONSUMIDOR")}</td>
</tr>

<!-- ═══ FILA 20: No. documento comprador ═══ -->
<tr class="row20">
  <td colspan="5" class="s-light" style="border-left:2px solid #000;border-right:1px solid #000;">No. DOCUMENTO DE IDENTIDAD</td>
  <td colspan="4" class="s-val">${cliente?.cedula||""}</td>
</tr>

<!-- ═══ FILA 21: RUCOM ═══ -->
<tr class="row21">
  <td colspan="5" class="s-light" style="border-left:2px solid #000;border-right:1px solid #000;">No. RUCOM</td>
  <td colspan="4" class="s-val" style="text-align:left">${cliente?.rucom?"RUCOM-"+cliente.rucom:"RUCOM-"}</td>
</tr>

<!-- ═══ FILA 22: Firma ═══ -->
<tr class="row22">
  <td colspan="5" class="s-firma-lbl">FIRMA DEL EXPLOTADOR MINERO AUTORIZADO</td>
  <td class="s-firma-area"></td>
  <td class="s-firma-area"></td>
  <td class="s-firma-area" style="text-decoration:underline">
    ${firma?`<img class="firma-img" src="${firma}" alt="Firma"/>`:"&nbsp;"}
  </td>
  <td class="s-firma-area-r"></td>
</tr>

<!-- ═══ FILA 23: Borde inferior ═══ -->
<tr style="height:6px">
  <td class="s-bot-l"></td>
  <td class="s-bot-m"></td>
  <td class="s-bot-m"></td>
  <td class="s-bot-m"></td>
  <td class="s-bot-m"></td>
  <td class="s-bot-m"></td>
  <td class="s-bot-m"></td>
  <td class="s-bot-m"></td>
  <td class="s-bot-r"></td>
</tr>

</tbody>
</table>
<div style="margin-top:4px;font-size:6.5pt;color:#888;text-align:center">
  Generado: ${new Date().toLocaleString("es-CO",{timeZone:"America/Bogota"})} &nbsp;|&nbsp; CTGlobal — TU MINA
</div>
</body></html>`;
}

async function generarCertificadoPdf(datos, outputPath) {
  const puppeteer = require("puppeteer");
  const html = generarHTML(datos);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPath,
      format: "Letter",
      margin: { top:"8mm", bottom:"8mm", left:"10mm", right:"10mm" },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
  return outputPath;
}

module.exports = { generarCertificadoPdf };