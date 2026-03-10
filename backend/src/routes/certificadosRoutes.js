// backend/src/routes/certificadosRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  listarCertificados,
  crearCertificado,
  descargarExcel,
  descargarPdf,
} = require("../controllers/clientesController");

// GET  /api/certificados-origen?tituloMineroId=xxx
router.get("/",            authMiddleware, listarCertificados);

// POST /api/certificados-origen
router.post("/",           authMiddleware, crearCertificado);

// GET  /api/certificados-origen/:id/excel
router.get("/:id/excel",   authMiddleware, descargarExcel);

// GET  /api/certificados-origen/:id/pdf
router.get("/:id/pdf",     authMiddleware, descargarPdf);

module.exports = router;