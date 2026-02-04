const express = require('express');
const router = express.Router();
const puntosController = require('../controllers/puntosActividadController');

router.post('/punto', puntosController.registrarPunto);
router.get('/puntos/:tituloMineroId', puntosController.getPuntos);
router.get('/puntos/:tituloMineroId/estadisticas', puntosController.getEstadisticas);

module.exports = router;