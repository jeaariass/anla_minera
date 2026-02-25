// backend/src/routes/paradasRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getMotivos,
  registrarParada,
  getParadas,
  getResumenDia,
  editarParada,        // ✅ NUEVO
} = require('../controllers/paradasController');

// GET  /api/paradas/motivos
router.get('/motivos', getMotivos);

// POST /api/paradas
router.post('/', registrarParada);

// PUT  /api/paradas/:id      ← editar (solo mismo día)
router.put('/:id', editarParada);

// GET  /api/paradas/resumen/:tituloMineroId
router.get('/resumen/:tituloMineroId', getResumenDia);

// GET  /api/paradas/:tituloMineroId
router.get('/:tituloMineroId', getParadas);

module.exports = router;