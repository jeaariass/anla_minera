// backend/src/routes/androidRoutes.js
// Rutas para la aplicación Android de registro de producción

const express = require('express');
const router = express.Router();
const androidController = require('../controllers/androidController');

// Middleware de autenticación (usa el que ya tienes)
// Si tienes un archivo authMiddleware.js, impórtalo:
// const authMiddleware = require('../middleware/authMiddleware');
// router.use(authMiddleware);

// Por ahora, comentamos la autenticación para las pruebas
// Una vez que funcione, puedes descomentar la línea de arriba

// ============================================
// RUTAS PARA PUNTOS DE REFERENCIA
// ============================================

// GET /api/android/puntos/:tituloMineroId
// Obtener puntos de referencia por título minero
router.get('/puntos/:tituloMineroId', androidController.getPuntosReferencia);

// ============================================
// RUTAS PARA REGISTRO DE PRODUCCIÓN
// ============================================

// POST /api/android/iniciar-registro
// Iniciar sesión de registro de producción
router.post('/iniciar-registro', androidController.iniciarSesionRegistro);

// POST /api/android/registrar-ciclo
// Registrar un ciclo completado
router.post('/registrar-ciclo', androidController.registrarCiclo);

// POST /api/android/registrar-ciclos-batch
// Registrar múltiples ciclos (sincronización offline)
router.post('/registrar-ciclos-batch', androidController.registrarCiclosBatch);

// ============================================
// RUTAS PARA CONSULTAS Y ESTADÍSTICAS
// ============================================

// GET /api/android/ciclos-del-dia/:usuarioId/:tituloMineroId
// Obtener ciclos del día actual
router.get('/ciclos-del-dia/:usuarioId/:tituloMineroId', androidController.getCiclosDelDia);

// GET /api/android/estadisticas/:usuarioId/:tituloMineroId
// Obtener estadísticas de producción
// Query params opcionales: ?fechaInicio=2025-01-01&fechaFin=2025-01-31
router.get('/estadisticas/:usuarioId/:tituloMineroId', androidController.getEstadisticasProduccion);

module.exports = router;