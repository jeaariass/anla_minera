// backend/src/routes/clientesRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  buscarCliente,
  crearCliente,
  crearCertificado,
  actualizarCliente,
} = require("../controllers/clientesController");

// Buscar cliente por cédula o correo
// GET /api/clientes/buscar?cedula=123 | ?correo=a@b.com
router.get("/buscar", authMiddleware, buscarCliente);

// Crear cliente nuevo
// POST /api/clientes
router.post("/", authMiddleware, crearCliente);

// Actualizar cliente 
// PUT /api/clientes
router.put("/:id", authMiddleware, actualizarCliente);

module.exports = router;