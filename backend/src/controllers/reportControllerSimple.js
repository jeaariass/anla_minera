const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

// Verificar token
const verificarToken = (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ success: false, message: 'Token no proporcionado' });
      return null;
    }
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido' });
    return null;
  }
};

// Obtener columnas según tipo
// Obtener columnas según tipo (nombres exactos base de datos)
const getColumnas = (tipo) => {
  const columnas = {
    produccion: [
      'Fecha_corte_informacion_reportada',
      'Mineral',
      'Titulo_minero',
      'Municipio_de_extraccion',
      'Codigo_Municipio_extraccion',
      'Horas_Operativas',
      'Cantidad_produccion',
      'Unidad_medida_produccion',
      'Cantidad_material_entra_Plantabeneficio',
      'Cantidad_material_sale_Plantabeneficio',
      'Masa_unitaria',
      'Estado'
    ],
    inventarios: [
      'Fecha_corte_informacion_reportada',
      'Mineral',
      'Titulo_minero',
      'Municipio_de_extraccion',
      'Codigo_Municipio_extraccion',
      'Unidad_medida',
      'Inventario_Inicial_Acopio',
      'Inventario_Final_Acopio',
      'Ingreso_Acopio',
      'Salida_Acopio',
      'Estado'
    ],
    paradas: [
      'Fecha_corte_informacion_reportada',
      'Titulo_minero',
      'Municipio_de_extraccion',
      'Codigo_Municipio_extraccion',
      'Tipo_Parada',
      'Fecha_Inicio',
      'Fecha_Fin',
      'Horas_Paradas',
      'Motivo',
      'Estado'
    ],
    ejecucion: [
      'Fecha_corte_informacion_reportada',
      'Mineral',
      'Titulo_minero',
      'Municipio_de_extraccion',
      'Codigo_Municipio_extraccion',
      'Denominacion_Frente',
      'Latitud',
      'Longitud',
      'Metodo_Explotacion',
      'Avance_Ejecutado',
      'Unidad_medida_avance',
      'Volumen_Ejecutado',
      'Estado'
    ],
    maquinaria: [
      'Fecha_corte_informacion_reportada',
      'Titulo_minero',
      'Municipio_de_extraccion',
      'Codigo_Municipio_extraccion',
      'Tipo_Maquinaria',
      'Cantidad',
      'Horas_Operacion',
      'Capacidad_Transporte',
      'Unidad_Capacidad',
      'Estado'
    ],
    regalias: [
      'Fecha_corte_informacion_reportada',
      'Mineral',
      'Titulo_minero',
      'Municipio_de_extraccion',
      'Codigo_Municipio_extraccion',
      'Cantidad_Extraida',
      'Unidad_Medida',
      'Valor_Declaracion',
      'Valor_Contraprestaciones',
      'Resolucion_UPME',
      'Estado'
    ]
  };
  return columnas[tipo] || [];
};

// Transformar datos para vista previa y exportación
const transformarDatos = (datos, tipo) => {
  return datos.map(registro => {
    const formatearFecha = (fecha) => {
      if (!fecha) return '';
      return new Date(fecha).toLocaleDateString('es-CO');
    };

    const formatearNumero = (numero) => {
      if (numero === null || numero === undefined) return '';
      return numero;
    };

    const base = {
      Fecha_corte_informacion_reportada: formatearFecha(registro.fechaCorte),
      Titulo_minero: registro.tituloMinero?.numeroTitulo || '',
      Municipio_de_extraccion: registro.tituloMinero?.municipio || '',
      Codigo_Municipio_extraccion: registro.tituloMinero?.codigoMunicipio || '',
      Estado: registro.estado || ''
    };

    switch(tipo) {
      case 'produccion':
        return {
          Fecha_corte_informacion_reportada: base.Fecha_corte_informacion_reportada,
          Mineral: registro.mineral || '',
          Titulo_minero: base.Titulo_minero,
          Municipio_de_extraccion: base.Municipio_de_extraccion,
          Codigo_Municipio_extraccion: base.Codigo_Municipio_extraccion,
          Horas_Operativas: formatearNumero(registro.horasOperativas),
          Cantidad_produccion: formatearNumero(registro.cantidadProduccion),
          Unidad_medida_produccion: registro.unidadMedida || '',
          Cantidad_material_entra_Plantabeneficio: formatearNumero(registro.materialEntraPlanta),
          Cantidad_material_sale_Plantabeneficio: formatearNumero(registro.materialSalePlanta),
          Masa_unitaria: formatearNumero(registro.masaUnitaria),
          Estado: base.Estado
        };
      
      case 'inventarios':
        return {
          Fecha_corte_informacion_reportada: base.Fecha_corte_informacion_reportada,
          Mineral: registro.mineral || '',
          Titulo_minero: base.Titulo_minero,
          Municipio_de_extraccion: base.Municipio_de_extraccion,
          Codigo_Municipio_extraccion: base.Codigo_Municipio_extraccion,
          Unidad_medida: registro.unidadMedida || '',
          Inventario_Inicial_Acopio: formatearNumero(registro.inventarioInicialAcopio),
          Inventario_Final_Acopio: formatearNumero(registro.inventarioFinalAcopio),
          Ingreso_Acopio: formatearNumero(registro.ingresoAcopio),
          Salida_Acopio: formatearNumero(registro.salidaAcopio),
          Estado: base.Estado
        };
      
      case 'paradas':
        return {
          Fecha_corte_informacion_reportada: base.Fecha_corte_informacion_reportada,
          Titulo_minero: base.Titulo_minero,
          Municipio_de_extraccion: base.Municipio_de_extraccion,
          Codigo_Municipio_extraccion: base.Codigo_Municipio_extraccion,
          Tipo_Parada: registro.tipoParada || '',
          Fecha_Inicio: formatearFecha(registro.fechaInicio),
          Fecha_Fin: formatearFecha(registro.fechaFin),
          Horas_Paradas: formatearNumero(registro.horasParadas),
          Motivo: registro.motivo || '',
          Estado: base.Estado
        };
      
      case 'ejecucion':
        return {
          Fecha_corte_informacion_reportada: base.Fecha_corte_informacion_reportada,
          Mineral: registro.mineral || '',
          Titulo_minero: base.Titulo_minero,
          Municipio_de_extraccion: base.Municipio_de_extraccion,
          Codigo_Municipio_extraccion: base.Codigo_Municipio_extraccion,
          Denominacion_Frente: registro.denominacionFrente || '',
          Latitud: formatearNumero(registro.latitud),
          Longitud: formatearNumero(registro.longitud),
          Metodo_Explotacion: registro.metodoExplotacion || '',
          Avance_Ejecutado: formatearNumero(registro.avanceEjecutado),
          Unidad_medida_avance: registro.unidadMedidaAvance || '',
          Volumen_Ejecutado: formatearNumero(registro.volumenEjecutado),
          Estado: base.Estado
        };
      
      case 'maquinaria':
        return {
          Fecha_corte_informacion_reportada: base.Fecha_corte_informacion_reportada,
          Titulo_minero: base.Titulo_minero,
          Municipio_de_extraccion: base.Municipio_de_extraccion,
          Codigo_Municipio_extraccion: base.Codigo_Municipio_extraccion,
          Tipo_Maquinaria: registro.tipoMaquinaria || '',
          Cantidad: formatearNumero(registro.cantidad),
          Horas_Operacion: formatearNumero(registro.horasOperacion),
          Capacidad_Transporte: formatearNumero(registro.capacidadTransporte),
          Unidad_Capacidad: registro.unidadCapacidad || '',
          Estado: base.Estado
        };
      
      case 'regalias':
        return {
          Fecha_corte_informacion_reportada: base.Fecha_corte_informacion_reportada,
          Mineral: registro.mineral || '',
          Titulo_minero: base.Titulo_minero,
          Municipio_de_extraccion: base.Municipio_de_extraccion,
          Codigo_Municipio_extraccion: base.Codigo_Municipio_extraccion,
          Cantidad_Extraida: formatearNumero(registro.cantidadExtraida),
          Unidad_Medida: registro.unidadMedida || '',
          Valor_Declaracion: formatearNumero(registro.valorDeclaracion),
          Valor_Contraprestaciones: formatearNumero(registro.valorContraprestaciones),
          Resolucion_UPME: registro.resolucionUPME || '',
          Estado: base.Estado
        };
      
      default:
        return base;
    }
  });
};

// PREVIEW - Obtener datos para vista previa
exports.getPreview = async (req, res) => {
  try {
    const decoded = verificarToken(req, res);
    if (!decoded) return;

    const { tipo, fechaInicio, fechaFin } = req.query;

    if (!tipo) {
      return res.status(400).json({ success: false, message: 'Tipo de formulario requerido' });
    }

    // Modelos
    const modelos = {
      produccion: prisma.fRIProduccion,
      inventarios: prisma.fRIInventarios,
      paradas: prisma.fRIParadas,
      ejecucion: prisma.fRIEjecucion,
      maquinaria: prisma.fRIMaquinaria,
      regalias: prisma.fRIRegalias
    };

    const modelo = modelos[tipo];
    if (!modelo) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    // Filtros
    const filtros = {};
    if (fechaInicio && fechaFin) {
      filtros.fechaCorte = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      };
    }

    // Si no es admin, solo sus registros
    if (decoded.rol !== 'ADMIN') {
      filtros.usuarioId = decoded.id;
    }

    // Obtener datos
    const datos = await modelo.findMany({
      where: filtros,
      include: {
        tituloMinero: true
      },
      orderBy: { fechaCorte: 'desc' },
      take: 100 // Límite de 100 para preview
    });

    const columnas = getColumnas(tipo);
    const registros = transformarDatos(datos, tipo);

    res.json({
      success: true,
      columnas,
      registros,
      total: registros.length
    });

  } catch (error) {
    console.error('Error en preview:', error);
    res.status(500).json({ success: false, message: 'Error al obtener datos', error: error.message });
  }
};

// EXPORTAR - Generar Excel
exports.exportarExcel = async (req, res) => {
  try {
    const decoded = verificarToken(req, res);
    if (!decoded) return;

    const { tipo, fechaInicio, fechaFin } = req.query;

    if (!tipo) {
      return res.status(400).json({ success: false, message: 'Tipo de formulario requerido' });
    }

    // Modelos
    const modelos = {
      produccion: prisma.fRIProduccion,
      inventarios: prisma.fRIInventarios,
      paradas: prisma.fRIParadas,
      ejecucion: prisma.fRIEjecucion,
      maquinaria: prisma.fRIMaquinaria,
      regalias: prisma.fRIRegalias
    };

    const modelo = modelos[tipo];
    if (!modelo) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    // Filtros
    const filtros = {};
    if (fechaInicio && fechaFin) {
      filtros.fechaCorte = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      };
    }

    if (decoded.rol !== 'ADMIN') {
      filtros.usuarioId = decoded.id;
    }

    // Obtener datos
    const datos = await modelo.findMany({
      where: filtros,
      include: {
        tituloMinero: true
      },
      orderBy: { fechaCorte: 'asc' }
    });

    if (datos.length === 0) {
      return res.status(404).json({ success: false, message: 'No hay datos para exportar' });
    }

    // Crear Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Datos');

    // Columnas
    const columnas = getColumnas(tipo);
    sheet.columns = columnas.map(col => ({ 
      header: col, 
      key: col.toLowerCase().replace(/ /g, '_'), 
      width: 20 
    }));

    // Estilo encabezado (sin color)
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Agregar datos
    const registros = transformarDatos(datos, tipo);
    registros.forEach(registro => {
      sheet.addRow(Object.values(registro));
    });

    // Bordes
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });


    // Enviar archivo
    const nombreArchivo = `FRI_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exportando:', error);
    res.status(500).json({ success: false, message: 'Error al exportar', error: error.message });
  }
};