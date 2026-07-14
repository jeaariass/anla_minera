// backend/src/routes/demoRoutes.js
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  permisoMiddleware,
} = require("../middleware/authMiddleware");
const { crearDemo, eliminarDemo } = require("../controllers/demoController");

// POST   /api/demos            — crear demo completo (solo ADMIN)
router.post("/", authMiddleware, permisoMiddleware("CREAR_DEMO"), crearDemo);

// DELETE /api/demos/:tituloId  — eliminar demo y todo lo asociado (solo ADMIN)
router.delete(
  "/:tituloId",
  authMiddleware,
  permisoMiddleware("ELIMINAR_DEMO"),
  eliminarDemo,
);

module.exports = router;
