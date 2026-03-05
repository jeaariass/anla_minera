// backend/src/routes/gestorArchivosRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware }  = require("../middleware/authMiddleware");
const { listar, descargarArchivo, descargarMes } = require("../controllers/gestorArchivosController");

router.get("/",               authMiddleware, listar);
router.get("/descargar",      authMiddleware, descargarArchivo);
router.get("/descargar-mes",  authMiddleware, descargarMes);

module.exports = router;