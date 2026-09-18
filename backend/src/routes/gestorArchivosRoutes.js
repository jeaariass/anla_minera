// backend/src/routes/gestorArchivosRoutes.js
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  permisoMiddleware,
} = require("../middleware/authMiddleware");
const { moduloMiddleware } = require("../middleware/moduloMiddleware");
const {
  listar,
  descargarArchivo,
  descargarMes,
} = require("../controllers/gestorArchivosController");

const moduloArchivos = moduloMiddleware("gestor_archivos");
const verGestorArchivos = permisoMiddleware("VER_GESTOR_ARCHIVOS");

router.get("/", authMiddleware, verGestorArchivos, moduloArchivos, listar);
router.get(
  "/descargar",
  authMiddleware,
  verGestorArchivos,
  moduloArchivos,
  descargarArchivo,
);
router.get(
  "/descargar-mes",
  authMiddleware,
  verGestorArchivos,
  moduloArchivos,
  descargarMes,
);

module.exports = router;
