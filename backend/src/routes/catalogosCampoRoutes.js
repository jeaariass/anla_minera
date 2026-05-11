// backend/src/routes/catalogosCampoRoutes.js
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  permisoMiddleware,
} = require("../middleware/authMiddleware");
const ctrl = require("../controllers/catalogosCampoController");

// ─── Items por proceso (extracción, acopio, procesamiento, inspección) ──
router.get(
  "/items",
  authMiddleware,
  permisoMiddleware("GESTIONAR_CATALOGOS_CAMPO"),
  ctrl.listarItems,
);
router.post(
  "/items",
  authMiddleware,
  permisoMiddleware("GESTIONAR_CATALOGOS_CAMPO"),
  ctrl.crearItem,
);
router.put(
  "/items/:id",
  authMiddleware,
  permisoMiddleware("GESTIONAR_CATALOGOS_CAMPO"),
  ctrl.editarItem,
);
router.delete(
  "/items/:id",
  authMiddleware,
  permisoMiddleware("GESTIONAR_CATALOGOS_CAMPO"),
  ctrl.eliminarItem,
);

// ─── Maquinaria ───────────────────────────────────────────────────────
router.get(
  "/maquinaria",
  authMiddleware,
  permisoMiddleware("GESTIONAR_CATALOGOS_CAMPO"),
  ctrl.listarMaquinaria,
);
router.post(
  "/maquinaria",
  authMiddleware,
  permisoMiddleware("GESTIONAR_CATALOGOS_CAMPO"),
  ctrl.crearMaquinaria,
);
router.put(
  "/maquinaria/:id",
  authMiddleware,
  permisoMiddleware("GESTIONAR_CATALOGOS_CAMPO"),
  ctrl.editarMaquinaria,
);
router.delete(
  "/maquinaria/:id",
  authMiddleware,
  permisoMiddleware("GESTIONAR_CATALOGOS_CAMPO"),
  ctrl.eliminarMaquinaria,
);

module.exports = router;
