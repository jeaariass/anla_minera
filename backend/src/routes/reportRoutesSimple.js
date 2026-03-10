const express = require('express');
const router  = express.Router();
const reportController = require('../controllers/reportControllerSimple');

// Vista previa (soporta GET y POST para compatibilidad)
router.get('/preview',  reportController.getPreview);
router.post('/preview', reportController.getPreview);

// Exportar Excel
router.get('/export',   reportController.exportarExcel);
router.post('/export',  reportController.exportarExcel);

// Exportar PDF
//router.get('/pdf',      reportController.exportarPDF);
//router.post('/pdf',     reportController.exportarPDF);

module.exports = router;