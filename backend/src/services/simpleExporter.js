const ExcelJS = require('exceljs');

class SimpleExporter {

  // Exportar Producción - FORMATO EXACTO ANM
  async exportarProduccion(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro de Información');

    // ENCABEZADOS EXACTOS DEL FORMATO ANM
    worksheet.columns = [
      { header: 'Fecha_corte_informacion_reportada', key: 'fecha', width: 30 },
      { header: 'Mineral', key: 'mineral', width: 20 },
      { header: 'Titulo_minero', key: 'titulo', width: 15 },
      { header: 'Municipio_de_extraccion', key: 'municipio', width: 25 },
      { header: 'Codigo_Municipio_extraccion', key: 'codigo', width: 25 },
      { header: 'Horas_Operativas', key: 'horas', width: 18 },
      { header: 'Cantidad_produccion', key: 'cantidad', width: 20 },
      { header: 'Unidad_medida_produccion', key: 'unidad', width: 25 },
      { header: 'Cantidad_material_entra_Plantabeneficio', key: 'entra', width: 35 },
      { header: 'Cantidad_material_sale_Plantabeneficio', key: 'sale', width: 35 },
      { header: 'Masa_unitaria', key: 'masa', width: 15 }
    ];

    // AGREGAR DATOS
    datos.forEach(dato => {
      worksheet.addRow({
        fecha: new Date(dato.fechaCorte).toLocaleDateString('es-CO'),
        mineral: dato.mineral || '',
        titulo: dato.tituloMinero?.numeroTitulo || '',
        municipio: dato.tituloMinero?.municipio || '',
        codigo: dato.tituloMinero?.codigoMunicipio || '',
        horas: parseFloat(dato.horasOperativas) || 0,
        cantidad: parseFloat(dato.cantidadProduccion) || 0,
        unidad: dato.unidadMedida || '',
        entra: dato.materialEntraPlanta ? parseFloat(dato.materialEntraPlanta) : '',
        sale: dato.materialSalePlanta ? parseFloat(dato.materialSalePlanta) : '',
        masa: dato.masaUnitaria ? parseFloat(dato.masaUnitaria) : ''
      });
    });

    return workbook;
  }

  // Exportar Puntos de Actividad
  async exportarPuntosActividad(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro de Información');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 22 },
      { header: 'Titulo_minero_id', key: 'titulo_minero_id', width: 22 },
      { header: 'Categoria', key: 'categoria', width: 18 },
      { header: 'Descripcion', key: 'descripcion', width: 35 },
      { header: 'Latitud', key: 'latitud', width: 15 },
      { header: 'Longitud', key: 'longitud', width: 15 },
      { header: 'Maquinaria', key: 'maquinaria', width: 20 },
      { header: 'Volumen_m3', key: 'volumen_m3', width: 14 },
    ];

    datos.forEach(dato => {
      worksheet.addRow({
        fecha: new Date(dato.fecha).toLocaleString('es-CO'),
        titulo_minero_id: dato.titulo_minero_id,
        categoria: dato.categoria ?? '',
        descripcion: dato.descripcion ?? '',
        latitud: dato.latitud ?? '',
        longitud: dato.longitud ?? '',
        maquinaria: dato.maquinaria ?? '',
        volumen_m3: dato.volumen_m3 ?? '',
      });
    });

    return workbook;
  }




  // Exportar Inventarios - FORMATO EXACTO ANM
  async exportarInventarios(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro de Información');

    worksheet.columns = [
      { header: 'Fecha_corte_informacion_reportada', key: 'fecha', width: 30 },
      { header: 'Mineral', key: 'mineral', width: 20 },
      { header: 'Titulo_minero', key: 'titulo', width: 15 },
      { header: 'Municipio_de_extraccion', key: 'municipio', width: 25 },
      { header: 'Codigo_Municipio_extraccion', key: 'codigo', width: 25 },
      { header: 'Unidad_medida', key: 'unidad', width: 15 },
      { header: 'Inventario_inicial_acopio', key: 'inicial', width: 25 },
      { header: 'Ingreso_acopio', key: 'ingreso', width: 20 },
      { header: 'Salida_acopio', key: 'salida', width: 20 },
      { header: 'Inventario_final_acopio', key: 'final', width: 25 }
    ];

    datos.forEach(dato => {
      worksheet.addRow({
        fecha: new Date(dato.fechaCorte).toLocaleDateString('es-CO'),
        mineral: dato.mineral || '',
        titulo: dato.tituloMinero?.numeroTitulo || '',
        municipio: dato.tituloMinero?.municipio || '',
        codigo: dato.tituloMinero?.codigoMunicipio || '',
        unidad: dato.unidadMedida || '',
        inicial: parseFloat(dato.inventarioInicialAcopio) || 0,
        ingreso: parseFloat(dato.ingresoAcopio) || 0,
        salida: parseFloat(dato.salidaAcopio) || 0,
        final: parseFloat(dato.inventarioFinalAcopio) || 0
      });
    });

    return workbook;
  }

  // Exportar Paradas
  async exportarParadas(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro de Información');

    worksheet.columns = [
      { header: 'Fecha_corte_informacion_reportada', key: 'fecha', width: 30 },
      { header: 'Titulo_minero', key: 'titulo', width: 15 },
      { header: 'Municipio_de_extraccion', key: 'municipio', width: 25 },
      { header: 'Tipo_parada', key: 'tipo', width: 20 },
      { header: 'Fecha_inicio', key: 'inicio', width: 20 },
      { header: 'Fecha_fin', key: 'fin', width: 20 },
      { header: 'Horas_paradas', key: 'horas', width: 18 },
      { header: 'Motivo', key: 'motivo', width: 40 }
    ];

    datos.forEach(dato => {
      worksheet.addRow({
        fecha: new Date(dato.fechaCorte).toLocaleDateString('es-CO'),
        titulo: dato.tituloMinero?.numeroTitulo || '',
        municipio: dato.tituloMinero?.municipio || '',
        tipo: dato.tipoParada || '',
        inicio: new Date(dato.fechaInicio).toLocaleString('es-CO'),
        fin: dato.fechaFin ? new Date(dato.fechaFin).toLocaleString('es-CO') : 'En curso',
        horas: parseFloat(dato.horasParadas) || 0,
        motivo: dato.motivo || ''
      });
    });

    return workbook;
  }

  // Exportar Ejecución
  async exportarEjecucion(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro de Información');

    worksheet.columns = [
      { header: 'Fecha_corte_informacion_reportada', key: 'fecha', width: 30 },
      { header: 'Mineral', key: 'mineral', width: 20 },
      { header: 'Titulo_minero', key: 'titulo', width: 15 },
      { header: 'Municipio_de_extraccion', key: 'municipio', width: 25 },
      { header: 'Frente_explotacion', key: 'frente', width: 25 },
      { header: 'Metodo_explotacion', key: 'metodo', width: 25 },
      { header: 'Avance_metros', key: 'avance', width: 18 },
      { header: 'Volumen_explotado', key: 'volumen', width: 20 }
    ];

    datos.forEach(dato => {
      worksheet.addRow({
        fecha: new Date(dato.fechaCorte).toLocaleDateString('es-CO'),
        mineral: dato.mineral || '',
        titulo: dato.tituloMinero?.numeroTitulo || '',
        municipio: dato.tituloMinero?.municipio || '',
        frente: dato.frenteExplotacion || '',
        metodo: dato.metodoExplotacion || '',
        avance: parseFloat(dato.avanceMetros) || 0,
        volumen: parseFloat(dato.volumenExplotado) || 0
      });
    });

    return workbook;
  }

  // Exportar Maquinaria
  async exportarMaquinaria(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro de Información');

    worksheet.columns = [
      { header: 'Fecha_corte_informacion_reportada', key: 'fecha', width: 30 },
      { header: 'Titulo_minero', key: 'titulo', width: 15 },
      { header: 'Tipo_maquinaria', key: 'tipo', width: 25 },
      { header: 'Cantidad', key: 'cantidad', width: 15 },
      { header: 'Horas_utilizadas', key: 'horas', width: 20 },
      { header: 'Capacidad', key: 'capacidad', width: 18 }
    ];

    datos.forEach(dato => {
      worksheet.addRow({
        fecha: new Date(dato.fechaCorte).toLocaleDateString('es-CO'),
        titulo: dato.tituloMinero?.numeroTitulo || '',
        tipo: dato.tipoMaquinaria || '',
        cantidad: parseInt(dato.cantidad) || 0,
        horas: parseFloat(dato.horasUtilizadas) || 0,
        capacidad: parseFloat(dato.capacidad) || 0
      });
    });

    return workbook;
  }

  // Exportar Regalías
  async exportarRegalias(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro de Información');

    worksheet.columns = [
      { header: 'Fecha_corte_informacion_reportada', key: 'fecha', width: 30 },
      { header: 'Mineral', key: 'mineral', width: 20 },
      { header: 'Titulo_minero', key: 'titulo', width: 15 },
      { header: 'Cantidad', key: 'cantidad', width: 20 },
      { header: 'Unidad_medida', key: 'unidad', width: 18 },
      { header: 'Valor_declaracion', key: 'valor', width: 20 }
    ];

    datos.forEach(dato => {
      worksheet.addRow({
        fecha: new Date(dato.fechaCorte).toLocaleDateString('es-CO'),
        mineral: dato.mineral || '',
        titulo: dato.tituloMinero?.numeroTitulo || '',
        cantidad: parseFloat(dato.cantidad) || 0,
        unidad: dato.unidadMedida || '',
        valor: parseFloat(dato.valorDeclaracion) || 0
      });
    });

    return workbook;
  }

  // Exportar múltiples hojas
  async exportarMultiples(datosPorTipo) {
    const workbook = new ExcelJS.Workbook();

    if (datosPorTipo.produccion?.length > 0) {
      const wb = await this.exportarProduccion(datosPorTipo.produccion);
      const sheet = wb.worksheets[0];
      workbook.addWorksheet(sheet, 'PRODUCCIÓN');
    }

    if (datosPorTipo.inventarios?.length > 0) {
      const wb = await this.exportarInventarios(datosPorTipo.inventarios);
      const sheet = wb.worksheets[0];
      workbook.addWorksheet(sheet, 'INVENTARIOS');
    }

    if (datosPorTipo.paradas?.length > 0) {
      const wb = await this.exportarParadas(datosPorTipo.paradas);
      const sheet = wb.worksheets[0];
      workbook.addWorksheet(sheet, 'PARADAS');
    }

    if (datosPorTipo.ejecucion?.length > 0) {
      const wb = await this.exportarEjecucion(datosPorTipo.ejecucion);
      const sheet = wb.worksheets[0];
      workbook.addWorksheet(sheet, 'EJECUCIÓN');
    }

    if (datosPorTipo.maquinaria?.length > 0) {
      const wb = await this.exportarMaquinaria(datosPorTipo.maquinaria);
      const sheet = wb.worksheets[0];
      workbook.addWorksheet(sheet, 'MAQUINARIA');
    }

    if (datosPorTipo.regalias?.length > 0) {
      const wb = await this.exportarRegalias(datosPorTipo.regalias);
      const sheet = wb.worksheets[0];
      workbook.addWorksheet(sheet, 'REGALÍAS');
    }

    if (datosPorTipo.puntosActividad?.length > 0) {
      const wb = await this.exportarPuntosActividad(datosPorTipo.puntosActividad);
      const sheet = wb.worksheets[0];
      workbook.addWorksheet(sheet, 'PUNTOS ACTIVIDAD');
    }

    return workbook;
  }
}

module.exports = new SimpleExporter();