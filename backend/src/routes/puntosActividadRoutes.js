// backend/src/routes/puntosActividadRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/puntosActividadController');

// GET  /api/actividad/items/:categoria  → catálogo de ítems por categoría
router.get('/items/:categoria', controller.getItems);

// GET  /api/actividad/maquinaria        → catálogo de maquinaria ✅ NUEVO
router.get('/maquinaria', controller.getMaquinaria);

// POST /api/actividad/punto             → registrar punto
router.post('/punto', controller.registrarPunto);

// GET  /api/actividad/puntos/:id        → historial de puntos
router.get('/puntos/:tituloMineroId', controller.getPuntos);

// GET  /api/actividad/estadisticas/:id  → estadísticas
router.get('/estadisticas/:tituloMineroId', controller.getEstadisticas);

module.exports = router;