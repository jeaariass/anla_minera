// backend/src/controllers/gestorArchivosController.js
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");
const {
  listarArbol,
  resolverAbsoluta,
  resolverCarpetaMes,
} = require("../services/storageService");

// ============================================
// GET /api/archivos
// Devuelve el árbol completo de archivos
// ============================================
const listar = async (req, res) => {
  try {
    const { tituloMineroId } = req.query;

    let tituloFiltro = null;
    if (tituloMineroId) {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      const titulo = await prisma.tituloMinero.findUnique({
        where: { id: tituloMineroId },
        select: { numeroTitulo: true },
      });
      if (titulo) tituloFiltro = titulo.numeroTitulo;
    }

    const arbol = listarArbol(tituloFiltro);
    res.json({ success: true, data: arbol });
  } catch (error) {
    console.error("❌ Error listando archivos:", error);
    res.status(500).json({
      success: false,
      message: "Error al listar archivos",
      error: error.message,
    });
  }
};

// ============================================
// GET /api/archivos/descargar?ruta=titulo/yyyy/mm/CO_xxx.pdf
// Descarga un archivo individual
// ============================================
const descargarArchivo = async (req, res) => {
  try {
    const { ruta } = req.query;
    if (!ruta)
      return res
        .status(400)
        .json({ success: false, message: "Falta el parámetro ruta." });

    // Sanitizar — evitar path traversal
    const rutaSanitizada = ruta.replace(/\.\./g, "").replace(/^\/+/, "");
    const absPath = resolverAbsoluta(rutaSanitizada);

    if (!fs.existsSync(absPath)) {
      return res
        .status(404)
        .json({ success: false, message: "Archivo no encontrado." });
    }

    const nombre = path.basename(absPath);
    const ext = path.extname(nombre).slice(1).toLowerCase();
    const mime =
      ext === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    fs.createReadStream(absPath).pipe(res);
  } catch (error) {
    console.error("❌ Error descargando archivo:", error);
    res.status(500).json({
      success: false,
      message: "Error al descargar",
      error: error.message,
    });
  }
};

// ============================================
// GET /api/archivos/descargar-mes?titulo=X&anio=2026&mes=03
// Descarga todos los archivos del mes como ZIP
// ============================================
const descargarMes = async (req, res) => {
  try {
    const { titulo, anio, mes } = req.query;
    if (!titulo || !anio || !mes) {
      return res.status(400).json({
        success: false,
        message: "Faltan parámetros: titulo, anio, mes.",
      });
    }

    const carpeta = resolverCarpetaMes(titulo, anio, mes);
    if (!fs.existsSync(carpeta)) {
      return res
        .status(404)
        .json({ success: false, message: "Carpeta no encontrada." });
    }

    const archivos = fs.readdirSync(carpeta).filter((f) => f.startsWith("CO_"));
    if (archivos.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No hay archivos en ese mes." });
    }

    const zipNombre = `Certificados_${titulo}_${anio}_${mes}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipNombre}"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(res);

    archivos.forEach((archivo) => {
      archive.file(path.join(carpeta, archivo), { name: archivo });
    });

    await archive.finalize();
  } catch (error) {
    console.error("❌ Error generando ZIP:", error);
    res.status(500).json({
      success: false,
      message: "Error al generar ZIP",
      error: error.message,
    });
  }
};

module.exports = { listar, descargarArchivo, descargarMes };
