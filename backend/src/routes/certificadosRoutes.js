// backend/src/routes/certificadosRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  crearCertificado,
  descargarExcel,
  descargarPdf,
} = require("../controllers/clientesController");

router.post("/",           authMiddleware, crearCertificado);
router.get("/:id/excel",   authMiddleware, descargarExcel);
router.get("/:id/pdf",     authMiddleware, descargarPdf);

module.exports = router;