// backend/src/routes/certificadosRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { crearCertificado, descargarExcel } = require("../controllers/clientesController");

router.post("/",           authMiddleware, crearCertificado);
router.get("/:id/excel",   authMiddleware, descargarExcel);

module.exports = router;