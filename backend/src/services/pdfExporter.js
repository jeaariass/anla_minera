// ============================================
// SERVICIO DE EXPORTACIÓN A PDF
// ============================================
// ✅ CREADO POR: María Camila (2025-02-15)
// ✅ PROPÓSITO: Generar reportes PDF formato horizontal con plantilla CTGlobal
// ============================================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFExporter {
  /**
   * Genera un PDF consolidado con datos de múltiples tipos de FRI
   */
  async generarPDFConPlantilla(datosPorTipo, filtros = {}) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Iniciando generación de PDF...');
      
      // Crear documento en formato horizontal (landscape)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 100, bottom: 50, left: 40, right: 40 }  // Más espacio arriba para el encabezado
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ============================================
      // GENERAR PÁGINAS POR TIPO (SIN PORTADA)
      // ============================================
      let esPrimeraPagina = true;

      if (datosPorTipo.produccion) {
        if (!esPrimeraPagina) doc.addPage();
        this.generarPaginaProduccion(doc, datosPorTipo.produccion, filtros);
        esPrimeraPagina = false;
      }

      if (datosPorTipo.inventarios) {
        if (!esPrimeraPagina) doc.addPage();
        this.generarPaginaInventarios(doc, datosPorTipo.inventarios, filtros);
        esPrimeraPagina = false;
      }

      if (datosPorTipo.paradas) {
        if (!esPrimeraPagina) doc.addPage();
        this.generarPaginaParadas(doc, datosPorTipo.paradas, filtros);
        esPrimeraPagina = false;
      }

      if (datosPorTipo.ejecucion) {
        if (!esPrimeraPagina) doc.addPage();
        this.generarPaginaEjecucion(doc, datosPorTipo.ejecucion, filtros);
        esPrimeraPagina = false;
      }

      if (datosPorTipo.maquinaria) {
        if (!esPrimeraPagina) doc.addPage();
        this.generarPaginaMaquinaria(doc, datosPorTipo.maquinaria, filtros);
        esPrimeraPagina = false;
      }

      if (datosPorTipo.regalias) {
        if (!esPrimeraPagina) doc.addPage();
        this.generarPaginaRegalias(doc, datosPorTipo.regalias, filtros);
        esPrimeraPagina = false;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

  generarPortada(doc, filtros) {
    const pageWidth = doc.page.width;
    
    // Fondo
    doc.rect(0, 0, pageWidth, doc.page.height).fill('#f0f4f8');
    doc.rect(0, 0, pageWidth, 120).fill('#2563eb');

    // Logo (si existe)
    const logoPath = path.join(__dirname, '../../public/logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, pageWidth / 2 - 30, 30, { width: 60, height: 50 });
      } catch (e) {
        doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold')
           .text('CTGlobal', 0, 50, { width: pageWidth, align: 'center' });
      }
    } else {
      doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold')
         .text('CTGlobal', 0, 50, { width: pageWidth, align: 'center' });
    }

    // Título
    doc.fillColor('#1e3a8a').fontSize(32).font('Helvetica-Bold')
       .text('REPORTE FRI - ANM', 0, 180, { width: pageWidth, align: 'center' });
    
    doc.fontSize(16).fillColor('#475569').font('Helvetica')
       .text('Formato de Reporte de Información', 0, 220, { width: pageWidth, align: 'center' });

    // Información de filtros
    let yPos = 280;
    if (filtros.fechaInicio || filtros.fechaFin) {
      const texto = `Período: ${filtros.fechaInicio || 'Inicio'} - ${filtros.fechaFin || 'Hoy'}`;
      doc.fontSize(12).fillColor('#334155')
         .text(texto, 0, yPos, { width: pageWidth, align: 'center' });
      yPos += 25;
    }

    // Fecha de generación
    doc.fontSize(11).fillColor('#64748b')
       .text(`Generado: ${new Date().toLocaleString('es-CO')}`, 0, yPos + 30, { 
         width: pageWidth, 
         align: 'center' 
       });
  }

  generarPaginaProduccion(doc, datos, filtros = {}) {
  this.dibujarEncabezado(doc, 'PRODUCCIÓN', '#4299e1', filtros);
  
  const headers = [
    'Fecha Corte',
    'Mineral', 
    'Título Minero',
    'Municipio',
    'Código Mun.',
    'Horas Op.',
    'Cantidad Prod.',
    'Unidad',
    'Material Entra',
    'Material Sale',
    'Masa Unit.'
  ];
  
  const rows = datos.map(d => [
    new Date(d.fechaCorte).toLocaleDateString('es-CO'),
    d.mineral || '-',
    d.tituloMinero?.numeroTitulo || '-',
    d.tituloMinero?.municipio || '-',
    d.tituloMinero?.codigoMunicipio || '-',
    d.horasOperativas || 0,
    d.cantidadProduccion || 0,
    d.unidadMedida || '-',
    d.materialEntraPlanta || '-',
    d.materialSalePlanta || '-',
    d.masaUnitaria || '-'
  ]);

  this.generarTabla(doc, headers, rows, 120);
}

generarPaginaInventarios(doc, datos, filtros = {}) {
  this.dibujarEncabezado(doc, 'INVENTARIOS', '#10b981', filtros);
  
  const headers = [
    'Fecha Corte',
    'Mineral',
    'Título Minero',
    'Municipio',
    'Código Mun.',
    'Unidad',
    'Inv. Inicial',
    'Ingreso',
    'Salida',
    'Inv. Final'
  ];
  
  const rows = datos.map(d => [
    new Date(d.fechaCorte).toLocaleDateString('es-CO'),
    d.mineral || '-',
    d.tituloMinero?.numeroTitulo || '-',
    d.tituloMinero?.municipio || '-',
    d.tituloMinero?.codigoMunicipio || '-',
    d.unidadMedida || '-',
    d.inventarioInicialAcopio || 0,
    d.ingresoAcopio || 0,
    d.salidaAcopio || 0,
    d.inventarioFinalAcopio || 0
  ]);

  this.generarTabla(doc, headers, rows, 120);
}

generarPaginaParadas(doc, datos, filtros = {}) {
  this.dibujarEncabezado(doc, 'PARADAS DE PRODUCCIÓN', '#ef4444', filtros);
  
  const headers = [
    'Fecha Corte',
    'Título Minero',
    'Municipio',
    'Tipo Parada',
    'Fecha Inicio',
    'Fecha Fin',
    'Horas',
    'Motivo'
  ];
  
  const rows = datos.map(d => [
    new Date(d.fechaCorte).toLocaleDateString('es-CO'),
    d.tituloMinero?.numeroTitulo || '-',
    d.tituloMinero?.municipio || '-',
    d.tipoParada || '-',
    d.fechaInicio ? new Date(d.fechaInicio).toLocaleString('es-CO') : '-',
    d.fechaFin ? new Date(d.fechaFin).toLocaleString('es-CO') : 'En curso',
    d.horasParadas || 0,
    (d.motivo || '-').substring(0, 30)
  ]);

  this.generarTabla(doc, headers, rows, 120);
}

generarPaginaEjecucion(doc, datos, filtros = {}) {
  this.dibujarEncabezado(doc, 'EJECUCIÓN', '#f59e0b', filtros);
  
  const headers = [
    'Fecha Corte',
    'Mineral',
    'Título Minero',
    'Municipio',
    'Denominación Frente',
    'Método Explotación',
    'Avance Ejecutado',
    'Volumen Ejecutado'
  ];
  
  const rows = datos.map(d => [
    new Date(d.fechaCorte).toLocaleDateString('es-CO'),
    d.mineral || '-',
    d.tituloMinero?.numeroTitulo || '-',
    d.tituloMinero?.municipio || '-',
    d.denominacionFrente || '-',
    d.metodoExplotacion || '-',
    d.avanceEjecutado || 0,
    d.volumenEjecutado || 0
  ]);

  this.generarTabla(doc, headers, rows, 120);
}

generarPaginaMaquinaria(doc, datos, filtros = {}) {
  this.dibujarEncabezado(doc, 'MAQUINARIA', '#8b5cf6', filtros);
  
  const headers = [
    'Fecha Corte',
    'Título Minero',
    'Tipo Maquinaria',
    'Cantidad',
    'Horas Operación',
    'Capacidad Transporte'
  ];
  
  const rows = datos.map(d => [
    new Date(d.fechaCorte).toLocaleDateString('es-CO'),
    d.tituloMinero?.numeroTitulo || '-',
    d.tipoMaquinaria || '-',
    d.cantidad || 0,
    d.horasOperacion || 0,
    d.capacidadTransporte || '-'
  ]);

  this.generarTabla(doc, headers, rows, 120);
}

generarPaginaRegalias(doc, datos, filtros = {}) {
  this.dibujarEncabezado(doc, 'REGALÍAS', '#ec4899', filtros);
  
  const headers = [
    'Fecha Corte',
    'Mineral',
    'Título Minero',
    'Cantidad Extraída',
    'Unidad',
    'Valor Declaración'
  ];
  
  const rows = datos.map(d => [
    new Date(d.fechaCorte).toLocaleDateString('es-CO'),
    d.mineral || '-',
    d.tituloMinero?.numeroTitulo || '-',
    d.cantidadExtraida || 0,
    d.unidadMedida || '-',
    this.formatearMoneda(d.valorDeclaracion)
  ]);

  this.generarTabla(doc, headers, rows, 120);
}

  dibujarEncabezado(doc, titulo, color, filtros = {}) {
  const pageWidth = doc.page.width;
  
  // Barra superior con color
  doc.rect(0, 0, pageWidth, 90).fill(color);
  
  // Logo (si existe)
  const logoPath = path.join(__dirname, '../../public/logo.png');
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 40, 20, { width: 50, height: 50 });
    } catch (e) {
      // Si falla, no pasa nada
    }
  }
  
  // Título del formulario
  doc.fillColor('#ffffff')
     .fontSize(24)
     .font('Helvetica-Bold')
     .text(titulo, 100, 25);
  
  // Subtítulo "FRI - ANM"
  doc.fontSize(12)
     .font('Helvetica')
     .text('Formato de Reporte de Información - ANM', 100, 55);
  
  // Información de filtros y fecha (lado derecho)
  const rightX = pageWidth - 250;
  doc.fontSize(9).fillColor('#ffffff');
  
  if (filtros.fechaInicio || filtros.fechaFin) {
    const periodo = `${filtros.fechaInicio || 'Inicio'} - ${filtros.fechaFin || 'Hoy'}`;
    doc.text(`Período: ${periodo}`, rightX, 30, { width: 240, align: 'right' });
  }
  
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, rightX, 50, { 
    width: 240, 
    align: 'right' 
  });
}

generarTabla(doc, headers, rows, startY) {
  const pageWidth = doc.page.width - 80;
  const colWidth = pageWidth / headers.length;  // Dividir equitativamente
  let y = startY;

  // Headers con fondo azul
  doc.fillColor('#1e3a8a').fontSize(8).font('Helvetica-Bold');  // Letra más pequeña
  headers.forEach((header, i) => {
    doc.text(header, 40 + (i * colWidth), y, { 
      width: colWidth - 4, 
      align: 'center' 
    });
  });
  y += 18;

  // Línea separadora
  doc.moveTo(40, y).lineTo(pageWidth + 40, y).stroke('#cbd5e1');
  y += 8;

  // Filas
  doc.font('Helvetica').fontSize(7).fillColor('#334155');  // Letra más pequeña
  rows.forEach((row, rowIndex) => {
    // Si no cabe, nueva página
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 80;
    }

    // Fondo alternado
    if (rowIndex % 2 === 0) {
      doc.rect(40, y - 4, pageWidth, 16).fill('#f8fafc');
    }

    row.forEach((cell, i) => {
      doc.fillColor('#334155').text(
        String(cell), 
        40 + (i * colWidth), 
        y, 
        { 
          width: colWidth - 4, 
          align: 'center',
          ellipsis: true  // Truncar texto largo
        }
      );
    });
    y += 16;
  });
}

  formatearMoneda(valor) {
    if (!valor) return '$0';
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(valor);
  }
}

module.exports = new PDFExporter();