const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportControllerSimple');

// Vista previa
router.get('/preview', reportController.getPreview);

// Exportar Excel
router.get('/export', reportController.exportarExcel);

module.exports = router;