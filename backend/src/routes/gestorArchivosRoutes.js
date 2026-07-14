// backend/src/routes/gestorArchivosRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware }  = require("../middleware/authMiddleware");
const { moduloMiddleware } = require("../middleware/moduloMiddleware");
const { listar, descargarArchivo, descargarMes } = require("../controllers/gestorArchivosController");

const moduloArchivos = moduloMiddleware("gestor_archivos");

router.get("/",               authMiddleware, moduloArchivos, listar);
router.get("/descargar",      authMiddleware, moduloArchivos, descargarArchivo);
router.get("/descargar-mes",  authMiddleware, moduloArchivos, descargarMes);

module.exports = router;
