const ExcelJS = require('exceljs');

class ExcelReportService {
  
  // Generar reporte de producción
  async generarReporteProduccion(datos, filtros = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Producción');

    // Configurar propiedades del libro
    workbook.creator = 'Sistema ANM-FRI - CTGLOBAL';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ENCABEZADO
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '📊 REPORTE DE PRODUCCIÓN - CTGLOBAL';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF667eea' }
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Información de filtros
    let row = 2;
    if (filtros.fechaInicio || filtros.fechaFin) {
      worksheet.mergeCells(`A${row}:H${row}`);
      worksheet.getCell(`A${row}`).value = `📅 Período: ${filtros.fechaInicio || 'Inicio'} - ${filtros.fechaFin || 'Fin'}`;
      worksheet.getCell(`A${row}`).font = { italic: true };
      row++;
    }

    if (filtros.mineral) {
      worksheet.mergeCells(`A${row}:H${row}`);
      worksheet.getCell(`A${row}`).value = `⛏️ Mineral: ${filtros.mineral}`;
      worksheet.getCell(`A${row}`).font = { italic: true };
      row++;
    }

    worksheet.mergeCells(`A${row}:H${row}`);
    worksheet.getCell(`A${row}`).value = `📅 Generado: ${new Date().toLocaleString('es-CO')}`;
    worksheet.getCell(`A${row}`).font = { italic: true, size: 10 };
    row++;

    // Espacio
    row++;

    // CABECERAS DE LA TABLA
    const headers = [
      'Fecha',
      'Mineral',
      'Título Minero',
      'Municipio',
      'Horas Operativas',
      'Cantidad',
      'Unidad',
      'Estado'
    ];

    const headerRow = worksheet.getRow(row);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4a5568' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 25;
    row++;

    // DATOS
    datos.forEach((item, index) => {
      const dataRow = worksheet.getRow(row);
      
      dataRow.getCell(1).value = new Date(item.fechaCorte).toLocaleDateString('es-CO');
      dataRow.getCell(2).value = item.mineral;
      dataRow.getCell(3).value = item.tituloMinero?.numeroTitulo || 'N/A';
      dataRow.getCell(4).value = item.tituloMinero?.municipio || 'N/A';
      dataRow.getCell(5).value = parseFloat(item.horasOperativas);
      dataRow.getCell(6).value = parseFloat(item.cantidadProduccion);
      dataRow.getCell(7).value = item.unidadMedida;
      dataRow.getCell(8).value = item.estado;

      // Estilo alternado de filas
      const fillColor = index % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
      dataRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
        cell.alignment = { vertical: 'middle' };
      });

      // Color según estado
      const estadoCell = dataRow.getCell(8);
      switch (item.estado) {
        case 'APROBADO':
          estadoCell.font = { color: { argb: 'FF28a745' }, bold: true };
          break;
        case 'RECHAZADO':
          estadoCell.font = { color: { argb: 'FFdc3545' }, bold: true };
          break;
        case 'ENVIADO':
          estadoCell.font = { color: { argb: 'FF17a2b8' }, bold: true };
          break;
        case 'BORRADOR':
          estadoCell.font = { color: { argb: 'FFffc107' }, bold: true };
          break;
      }

      row++;
    });

    // TOTALES
    row++;
    const totalRow = worksheet.getRow(row);
    totalRow.getCell(1).value = 'TOTALES';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(5).value = datos.reduce((sum, item) => sum + parseFloat(item.horasOperativas), 0);
    totalRow.getCell(6).value = datos.reduce((sum, item) => sum + parseFloat(item.cantidadProduccion), 0);
    
    totalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFe9ecef' }
      };
    });

    // Ajustar anchos de columna
    worksheet.columns = [
      { width: 12 },  // Fecha
      { width: 15 },  // Mineral
      { width: 15 },  // Título
      { width: 15 },  // Municipio
      { width: 15 },  // Horas
      { width: 15 },  // Cantidad
      { width: 12 },  // Unidad
      { width: 12 }   // Estado
    ];

    return workbook;
  }

  // Generar reporte consolidado de todos los FRIs
  async generarReporteConsolidado(datos) {
    const workbook = new ExcelJS.Workbook();

    // Hoja de resumen
    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.getCell('A1').value = '📊 RESUMEN GENERAL - SISTEMA ANM-FRI';
    summarySheet.getCell('A1').font = { size: 16, bold: true };
    summarySheet.mergeCells('A1:D1');

    let row = 3;
    summarySheet.getCell(`A${row}`).value = 'Tipo de Formulario';
    summarySheet.getCell(`B${row}`).value = 'Total Registros';
    summarySheet.getCell(`C${row}`).value = 'Borradores';
    summarySheet.getCell(`D${row}`).value = 'Enviados';

    // Estilo cabecera
    for (let col = 1; col <= 4; col++) {
      const cell = summarySheet.getRow(row).getCell(col);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF667eea' }
      };
    }

    row++;

    // Datos de resumen
    const tiposFormulario = [
      { nombre: 'Producción', datos: datos.produccion },
      { nombre: 'Inventarios', datos: datos.inventarios },
      { nombre: 'Paradas', datos: datos.paradas },
      { nombre: 'Ejecución', datos: datos.ejecucion },
      { nombre: 'Maquinaria', datos: datos.maquinaria },
      { nombre: 'Regalías', datos: datos.regalias }
    ];

    tiposFormulario.forEach(tipo => {
      if (tipo.datos && tipo.datos.length > 0) {
        summarySheet.getCell(`A${row}`).value = tipo.nombre;
        summarySheet.getCell(`B${row}`).value = tipo.datos.length;
        summarySheet.getCell(`C${row}`).value = tipo.datos.filter(d => d.estado === 'BORRADOR').length;
        summarySheet.getCell(`D${row}`).value = tipo.datos.filter(d => d.estado === 'ENVIADO').length;
        row++;
      }
    });

    // Ajustar anchos
    summarySheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    return workbook;
  }
}

module.exports = new ExcelReportService();