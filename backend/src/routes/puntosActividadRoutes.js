// backend/src/routes/puntosActividadRoutes.js
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  permisoMiddleware,
} = require("../middleware/authMiddleware");
const controller = require("../controllers/puntosActividadController");

// Catálogos — cualquier usuario autenticado puede consultarlos
router.get("/items/:categoria", authMiddleware, controller.getItems);
router.get("/maquinaria", authMiddleware, controller.getMaquinaria);

// Registrar punto
router.post(
  "/punto",
  authMiddleware,
  permisoMiddleware("CREAR_FORMULARIO_OPERATIVO"),
  controller.registrarPunto,
);

// Editar punto (solo mismo día)
router.put(
  "/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FORMULARIO_OPERATIVO"),
  controller.editarPunto,
);

// Eliminar punto (solo mismo día)
router.delete(
  "/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FORMULARIO_OPERATIVO"),
  controller.eliminarPunto,
);

// Historial de puntos
router.get(
  "/puntos/:tituloMineroId",
  authMiddleware,
  permisoMiddleware("VER_FORMULARIO_OPERATIVO"),
  controller.getPuntos,
);

// Estadísticas
router.get(
  "/estadisticas/:tituloMineroId",
  authMiddleware,
  permisoMiddleware("VER_ESTADISTICAS_OPERATIVAS"),
  controller.getEstadisticas,
);

module.exports = router;
