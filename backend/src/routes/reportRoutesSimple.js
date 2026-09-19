// backend/src/routes/reportRoutesSimple.js
const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportControllerSimple");
const {
  authMiddleware,
  permisoMiddleware,
} = require("../middleware/authMiddleware");

const puedeExportar = permisoMiddleware("EXPORTAR_REPORTE");

// Vista previa (soporta GET y POST para compatibilidad)
router.get(
  "/preview",
  authMiddleware,
  puedeExportar,
  reportController.getPreview,
);
router.post(
  "/preview",
  authMiddleware,
  puedeExportar,
  reportController.getPreview,
);

// Exportar Excel
router.get(
  "/export",
  authMiddleware,
  puedeExportar,
  reportController.exportarExcel,
);
router.post(
  "/export",
  authMiddleware,
  puedeExportar,
  reportController.exportarExcel,
);

module.exports = router;
