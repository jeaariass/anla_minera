// backend/src/routes/mobileVersionRoutes.js
// ============================================================
// Endpoint público que la app mobile consulta al inicio para decidir
// si pedir al usuario descargar APK nuevo.
//
// Config editable en: backend/storage/mobile-version.json
// Para forzar actualización: subir `minimum` por encima de la versión
// instalada en los dispositivos. Para sugerir (sin bloquear): solo
// subir `latest` y dejar `minimum` igual.
// ============================================================

const express = require("express");
const fs      = require("fs");
const path    = require("path");
const router  = express.Router();

const CONFIG_PATH = path.join(__dirname, "../../storage/mobile-version.json");

const DEFAULTS = {
  latest:       "1.0.0",
  minimum:      "1.0.0",
  apkUrl:       "https://intranet.ctglobal.com.co/documentos/",
  releaseNotes: "",
};

// GET /api/mobile/version — público (sin auth)
router.get("/version", (_req, res) => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      const cfg = { ...DEFAULTS, ...JSON.parse(raw) };
      return res.json({ success: true, ...cfg });
    }
    return res.json({ success: true, ...DEFAULTS });
  } catch (e) {
    console.error("Error leyendo mobile-version.json:", e.message);
    return res.json({ success: true, ...DEFAULTS });
  }
});

module.exports = router;
