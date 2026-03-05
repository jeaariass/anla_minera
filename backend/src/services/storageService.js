// backend/src/services/storageService.js
const fs   = require("fs");
const path = require("path");

// Raíz de almacenamiento: backend/storage/certificados/
const STORAGE_ROOT = path.join(__dirname, "../../storage/certificados");

// ─── Asegura que exista la carpeta ────────────────────────────────────────────
function mkdirSafe(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Genera la ruta y nombre de archivo ──────────────────────────────────────
// Estructura: storage/certificados/{numeroTitulo}/{YYYY}/{MM}/CO_{consecutivo}.{ext}
function resolverRuta(numeroTitulo, consecutivo, ext) {
  const [fechaParte] = consecutivo.split("-"); // "20260305"
  const yyyy = fechaParte.slice(0, 4);
  const mm   = fechaParte.slice(4, 6);

  // Sanitizar el número de título para usarlo como nombre de carpeta
  const tituloCarpeta = (numeroTitulo || "SIN_TITULO")
    .replace(/[^a-zA-Z0-9_\-]/g, "_").toUpperCase();

  const dir  = path.join(STORAGE_ROOT, tituloCarpeta, yyyy, mm);
  mkdirSafe(dir);

  const nombre   = `CO_${consecutivo}.${ext}`;
  const fullPath = path.join(dir, nombre);
  // Ruta relativa para guardar en BD
  const relativa = path.join(tituloCarpeta, yyyy, mm, nombre).replace(/\\/g, "/");

  return { fullPath, relativa, dir };
}

// ─── Listar árbol de archivos ─────────────────────────────────────────────────
// Devuelve estructura: { titulo, años: [{ año, meses: [{ mes, archivos: [] }] }] }
function listarArbol() {
  if (!fs.existsSync(STORAGE_ROOT)) return [];

  const titulos = fs.readdirSync(STORAGE_ROOT).filter(
    (f) => fs.statSync(path.join(STORAGE_ROOT, f)).isDirectory()
  );

  return titulos.map((titulo) => {
    const tituloPath = path.join(STORAGE_ROOT, titulo);
    const años = fs.readdirSync(tituloPath)
      .filter((f) => fs.statSync(path.join(tituloPath, f)).isDirectory())
      .sort((a, b) => b.localeCompare(a)) // más reciente primero
      .map((anio) => {
        const anioPath = path.join(tituloPath, titulo === titulo ? anio : anio);
        const meses = fs.readdirSync(path.join(tituloPath, anio))
          .filter((f) => fs.statSync(path.join(tituloPath, anio, f)).isDirectory())
          .sort((a, b) => b.localeCompare(a))
          .map((mes) => {
            const mesPath = path.join(tituloPath, anio, mes);
            const archivos = fs.readdirSync(mesPath)
              .filter((f) => f.startsWith("CO_"))
              .sort((a, b) => b.localeCompare(a))
              .map((nombre) => {
                const filePath = path.join(mesPath, nombre);
                const stat     = fs.statSync(filePath);
                const ext      = path.extname(nombre).slice(1).toLowerCase();
                return {
                  nombre,
                  ext,
                  tamaño:    stat.size,
                  tamañoStr: formatBytes(stat.size),
                  fechaMod:  stat.mtime.toISOString(),
                  rutaRel:   `${titulo}/${anio}/${mes}/${nombre}`,
                };
              });
            return { mes, mesNombre: nombreMes(mes), archivos };
          });
        return { anio, meses };
      });
    return { titulo, años };
  });
}

// ─── Resolver ruta absoluta desde relativa ────────────────────────────────────
function resolverAbsoluta(rutaRel) {
  return path.join(STORAGE_ROOT, rutaRel);
}

// ─── Ruta absoluta de una carpeta de mes ─────────────────────────────────────
function resolverCarpetaMes(titulo, anio, mes) {
  return path.join(STORAGE_ROOT, titulo, anio, mes);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function nombreMes(mm) {
  return MESES[parseInt(mm, 10) - 1] || mm;
}

module.exports = {
  resolverRuta,
  resolverAbsoluta,
  resolverCarpetaMes,
  listarArbol,
  STORAGE_ROOT,
};