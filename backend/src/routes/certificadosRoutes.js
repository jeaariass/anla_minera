// anla_minera/backend/src/routes/certificadosRoutes.js
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  permisoMiddleware,
} = require("../middleware/authMiddleware");
const {
  buscarCliente,
  crearCliente,
  actualizarCliente,
} = require("../controllers/clientesController");

const puedeGestionarClientes = permisoMiddleware("GESTIONAR_CLIENTES");

router.get("/buscar", authMiddleware, puedeGestionarClientes, buscarCliente);
router.post("/", authMiddleware, puedeGestionarClientes, crearCliente);
router.put("/:id", authMiddleware, puedeGestionarClientes, actualizarCliente);

module.exports = router;
