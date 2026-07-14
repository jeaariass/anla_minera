// backend/src/routes/certificadosRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { moduloMiddleware } = require("../middleware/moduloMiddleware");
const {
  listarCertificados,
  crearCertificado,
  descargarExcel,
  descargarPdf,
} = require("../controllers/clientesController");

const moduloCertificado = moduloMiddleware("certificado_origen");

// GET  /api/certificados-origen?tituloMineroId=xxx
router.get("/",            authMiddleware, moduloCertificado, listarCertificados);

// POST /api/certificados-origen
router.post("/",           authMiddleware, moduloCertificado, crearCertificado);

// GET  /api/certificados-origen/:id/excel
router.get("/:id/excel",   authMiddleware, moduloCertificado, descargarExcel);

// GET  /api/certificados-origen/:id/pdf
router.get("/:id/pdf",     authMiddleware, moduloCertificado, descargarPdf);

module.exports = router;
