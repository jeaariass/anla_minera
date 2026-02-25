// backend/src/routes/puntosActividadRoutes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/puntosActividadController');

// GET  /api/actividad/items/:categoria  → catálogo de ítems por categoría
router.get('/items/:categoria', controller.getItems);

// GET  /api/actividad/maquinaria        → catálogo de maquinaria
router.get('/maquinaria', controller.getMaquinaria);

// POST /api/actividad/punto             → registrar punto
router.post('/punto', controller.registrarPunto);

// PUT  /api/actividad/:id               → editar punto (solo mismo día)
router.put('/:id', controller.editarPunto);

// DELETE /api/actividad/:id             → eliminar punto (solo mismo día)
router.delete('/:id', controller.eliminarPunto);

// GET  /api/actividad/puntos/:id        → historial de puntos
router.get('/puntos/:tituloMineroId', controller.getPuntos);

// GET  /api/actividad/estadisticas/:id  → estadísticas
router.get('/estadisticas/:tituloMineroId', controller.getEstadisticas);

module.exports = router;