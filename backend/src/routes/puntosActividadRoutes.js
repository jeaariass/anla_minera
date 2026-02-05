const express = require('express');
const router = express.Router();
const controller = require('../controllers/puntosActividadController');

// Rutas de actividad (sin middleware de auth por ahora para debugging)
router.post('/punto', controller.registrarPunto);
router.get('/puntos/:tituloMineroId', controller.getPuntos);
router.get('/estadisticas/:tituloMineroId', controller.getEstadisticas);

module.exports = router;