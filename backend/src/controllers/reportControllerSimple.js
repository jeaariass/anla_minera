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
    ],
    puntosActividad: [
    'Fecha',
    'Usuario_id',
    'Titulo_minero_id',
    'Categoria',
    'Descripcion',
    'Maquinaria',
    'Volumen_m3',
    'Latitud',
    'Longitud'
  ]

  };
  return columnas[tipo] || [];
};

// Transformar datos para vista previa y exportación
const transformarDatos = (datos, tipo) => {
  return datos.map(registro => {
    const formatearFecha = (fecha) => {
      if (!fecha) return '';
      return new Date(fecha).toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
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
          Latitud: registro.latitud != null ? Number(registro.latitud) : '',
          Longitud: registro.longitud != null ? Number(registro.longitud) : '',
          Metodo_Explotacion: registro.metodoExplotacion || '',
          Avance_Ejecutado: registro.avanceEjecutado != null ? Number(registro.avanceEjecutado) : '',
          Unidad_medida_avance: registro.unidadMedidaAvance || '',
          Volumen_Ejecutado: registro.volumenEjecutado != null ? Number(registro.volumenEjecutado) : '',
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
      case 'puntosActividad':
        return {
          Fecha: registro.fecha
            ? new Date(registro.fecha).toLocaleString('es-CO', {
                timeZone: 'America/Bogota',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })
            : '',
          Usuario_id: registro.usuario_id || '',
          Titulo_minero_id: registro.titulo_minero_id || '',
          Categoria: registro.categoria || '',
          Descripcion: registro.descripcion || '',
          Maquinaria: registro.maquinaria || '',
          Volumen_m3: (registro.volumen_m3 === null || registro.volumen_m3 === undefined)
            ? ''
            : registro.volumen_m3,
          Latitud: (registro.latitud === null || registro.latitud === undefined)
            ? ''
            : registro.latitud,
          Longitud: (registro.longitud === null || registro.longitud === undefined)
            ? ''
            : registro.longitud
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
      regalias: prisma.fRIRegalias,
      puntosActividad: prisma.puntos_actividad
    };

    const modelo = modelos[tipo];
    if (!modelo) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    // ✅ Campo fecha según el tipo
    const campoFecha = (tipo === 'puntosActividad') ? 'fecha' : 'fechaCorte';

    // Filtros
    const filtros = {};

    // ✅ Rango fechas (usa campoFecha correcto)
    if (fechaInicio && fechaFin) {
      filtros[campoFecha] = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      };
    } else if (fechaInicio) {
      filtros[campoFecha] = { gte: new Date(fechaInicio) };
    } else if (fechaFin) {
      filtros[campoFecha] = { lte: new Date(fechaFin) };
    }

    // ✅ Si no es admin, solo sus registros (usuarioId vs usuario_id)
    if (decoded.rol !== 'ADMIN') {
      if (tipo === 'puntosActividad') filtros.usuario_id = decoded.id;
      else filtros.usuarioId = decoded.id;
    }

    // ✅ Query base
    const query = {
      where: filtros,
      orderBy: { [campoFecha]: 'desc' },
      take: 100
    };

    // ✅ Solo tablas FRI tienen relación tituloMinero
    if (tipo !== 'puntosActividad') {
      query.include = { tituloMinero: true };
    }

    // Obtener datos
    const datos = await modelo.findMany(query);

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
      regalias: prisma.fRIRegalias,
      puntosActividad: prisma.puntos_actividad
    };

    const modelo = modelos[tipo];
    if (!modelo) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    // Filtros
    const filtros = {};

    // Campo fecha según el tipo
    const campoFecha = (tipo === 'puntosActividad') ? 'fecha' : 'fechaCorte';

    // Rango fechas
    if (fechaInicio && fechaFin) {
      filtros[campoFecha] = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      };
    }

    // Usuario según el tipo
    if (decoded.rol !== 'ADMIN') {
      if (tipo === 'puntosActividad') {
        filtros.usuario_id = decoded.id;     // tabla puntos_actividad
      } else {
        filtros.usuarioId = decoded.id;      // tablas FRI
      }
    }

    // Obtener datos
    const query = {
      where: filtros,
      orderBy: { [campoFecha]: 'asc' }
    };

    // Solo las tablas FRI tienen relación tituloMinero
    if (tipo !== 'puntosActividad') {
      query.include = { tituloMinero: true };
    }

    const datos = await modelo.findMany(query);


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