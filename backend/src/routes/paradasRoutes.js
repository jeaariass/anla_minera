// backend/src/routes/paradasRoutes.js
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  permisoMiddleware,
} = require("../middleware/authMiddleware");
const {
  getMotivos,
  registrarParada,
  getParadas,
  getResumenDia,
  editarParada,
  eliminarParada,
} = require("../controllers/paradasController");

// Catálogo de motivos — cualquier usuario autenticado puede consultarlo
router.get("/motivos", authMiddleware, getMotivos);

// Registrar parada
router.post(
  "/",
  authMiddleware,
  permisoMiddleware("CREAR_FORMULARIO_OPERATIVO"),
  registrarParada,
);

// Editar parada (solo mismo día)
router.put(
  "/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FORMULARIO_OPERATIVO"),
  editarParada,
);

// Eliminar parada (solo mismo día)
router.delete(
  "/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FORMULARIO_OPERATIVO"),
  eliminarParada,
);

// Resumen del día
router.get(
  "/resumen/:tituloMineroId",
  authMiddleware,
  permisoMiddleware("VER_ESTADISTICAS_OPERATIVAS"),
  getResumenDia,
);

// Historial de paradas
router.get(
  "/:tituloMineroId",
  authMiddleware,
  permisoMiddleware("VER_FORMULARIO_OPERATIVO"),
  getParadas,
);

module.exports = router;
