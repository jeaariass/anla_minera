// ══════════════════════════════════════════════════════════════
// REPORT CONTROLLER — TU MINA / ANM-FRI
// ══════════════════════════════════════════════════════════════
const { PrismaClient } = require('@prisma/client');
const jwt     = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');   // npm install pdfkit
const fs   = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ── Verificar token ───────────────────────────────────────────
const verificarToken = (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res
        .status(401)
        .json({ success: false, message: "Token no proporcionado" });
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
  ],

  paradasActividad: [
    'Dia',
    'Usuario_id',
    'Motivo',
    'Motivo_otro',
    'Inicio',
    'Fin',
    'Minutos_paro',
    'Observaciones',
    'Estado'
  ],

  certificadosOrigen: [
    'Consecutivo',
    'Fecha_Certificado',
    'Mineral_Explotado',
    'Cliente_Nombre',
    'Cliente_Cedula',
    'Cantidad_M3',
    'Unidad_Medida',
    'Titulo_Minero_Id',
    'Creado_en'
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
      return Number(numero);  // ← Convierte Decimal → número nativo JS
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
          Volumen_m3: registro.volumen_m3 != null ? Number(registro.volumen_m3) : '',
          Latitud:    registro.latitud    != null ? Number(registro.latitud)    : '',
          Longitud:   registro.longitud   != null ? Number(registro.longitud)   : '',
        };


      
      case 'paradasActividad':
        return {
          Dia:           registro.dia
            ? new Date(registro.dia).toLocaleDateString('es-CO')
            : '',
          Usuario_id:    registro.usuario_id || '',
          Motivo:        registro.motivo_nombre || '',
          Motivo_otro:   registro.motivo_otro   || '',
          Inicio:        registro.inicio
            ? new Date(registro.inicio).toLocaleString('es-CO', {
                timeZone: 'America/Bogota',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
              })
            : '',
          Fin:           registro.fin
            ? new Date(registro.fin).toLocaleString('es-CO', {
                timeZone: 'America/Bogota',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
              })
            : '',
          Minutos_paro:  registro.minutos_paro != null ? Number(registro.minutos_paro) : '',
          Observaciones: registro.observaciones || '',
          Estado:        registro.estado || ''
        };

      case 'certificadosOrigen':
        return {
          Consecutivo:       registro.consecutivo || '',
          Fecha_Certificado: registro.fechaCertificado
            ? new Date(registro.fechaCertificado).toLocaleDateString('es-CO')
            : (registro.createdAt ? new Date(registro.createdAt).toLocaleDateString('es-CO') : ''),
          Mineral_Explotado: registro.mineralExplotado || '',
          Cliente_Nombre:    registro.clientes_compradores?.nombre || registro.clienteId || '',
          Cliente_Cedula:    registro.clientes_compradores?.cedula || '',
          Cantidad_M3:       registro.cantidadM3 != null ? Number(registro.cantidadM3) : 0,
          Unidad_Medida:     registro.unidadMedida || 'M3',
          Titulo_Minero_Id:  registro.tituloMineroId || '',
          Creado_en:         registro.createdAt
            ? new Date(registro.createdAt).toLocaleDateString('es-CO')
            : '',
        };

      default:
        return base;
    }
  });
};

// ══════════════════════════════════════════════════════════════
// VISTA PREVIA
// ══════════════════════════════════════════════════════════════
exports.getPreview = async (req, res) => {
  try {
    const decoded = verificarToken(req, res);
    if (!decoded) return;

    const { tipo, fechaInicio, fechaFin, usuarioId, estado, mineral, tituloMineroId } = req.query;
    console.log('🔍 REQ.QUERY:', JSON.stringify(req.query));


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
      puntosActividad:    prisma.puntos_actividad,
      certificadosOrigen: prisma.certificados_origen,
    };

    const modelo = modelos[tipo];
    if (!modelo) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    // -- Manejo especial certificadosOrigen (getPreview) --
    if (tipo === 'certificadosOrigen') {
      try {
        const esGCert = ['ADMIN', 'ASESOR'].includes(decoded.rol);
        const filtroCert = {};
        const tituloPC = req.query.tituloMineroId || null;

        // tituloMineroId es camelCase en el schema Prisma
        if (esGCert && tituloPC)                        filtroCert.tituloMineroId = tituloPC;
        else if (!esGCert && decoded.tituloMineroId)    filtroCert.tituloMineroId = decoded.tituloMineroId;

        if (fechaInicio || fechaFin) {
          filtroCert.fechaCertificado = {};
          if (fechaInicio) filtroCert.fechaCertificado.gte = new Date(fechaInicio);
          if (fechaFin)    filtroCert.fechaCertificado.lte = new Date(fechaFin + 'T23:59:59');
        }
        if (mineral && mineral !== '')
          filtroCert.mineralExplotado = { contains: mineral, mode: 'insensitive' };

        const clienteId = req.query.clienteId || null;
        if (clienteId) filtroCert.clienteId = clienteId;

        console.log('[cert preview] filtros:', JSON.stringify(filtroCert));

        // queryRawUnsafe para evitar error de Prisma con cantidadM3 null en BD
        const wherePrev = ['1=1']; const paramsPrev = []; let pp = 1;
        if (filtroCert.tituloMineroId)            { wherePrev.push(`c."tituloMineroId" = $${pp++}`); paramsPrev.push(filtroCert.tituloMineroId); }
        if (filtroCert.clienteId)                 { wherePrev.push(`c."clienteId" = $${pp++}`);      paramsPrev.push(filtroCert.clienteId); }
        if (filtroCert.fechaCertificado?.gte)      { wherePrev.push(`c."fechaCertificado" >= $${pp++}`); paramsPrev.push(filtroCert.fechaCertificado.gte); }
        if (filtroCert.fechaCertificado?.lte)      { wherePrev.push(`c."fechaCertificado" <= $${pp++}`); paramsPrev.push(filtroCert.fechaCertificado.lte); }
        if (filtroCert.mineralExplotado?.contains) { wherePrev.push(`c."mineralExplotado" ILIKE $${pp++}`); paramsPrev.push('%' + filtroCert.mineralExplotado.contains + '%'); }

        const sqlPrev = `SELECT c.id, c."tituloMineroId", c."clienteId", c."mineralExplotado",
          COALESCE(c."cantidadM3"::numeric, 0) AS "cantidadM3",
          c."unidadMedida", c."fechaCertificado", c."usuarioId", c."createdAt", c.consecutivo,
          cl.nombre AS cliente_nombre, cl.cedula AS cliente_cedula
          FROM certificados_origen c
          LEFT JOIN clientes_compradores cl ON cl.id = c."clienteId"
          WHERE ${wherePrev.join(' AND ')}
          ORDER BY c."fechaCertificado" DESC LIMIT 200`;

        const rawPrev = await prisma.$queryRawUnsafe(sqlPrev, ...paramsPrev);
        const datosCertPrev = rawPrev.map(r => ({
          ...r, cantidadM3: r.cantidadM3 ?? 0,
          clientes_compradores: { nombre: r.cliente_nombre || '', cedula: r.cliente_cedula || '' }
        }));

        const columnasPrev  = getColumnas('certificadosOrigen');
        const registrosPrev = transformarDatos(datosCertPrev, 'certificadosOrigen');
        return res.json({ success: true, columnas: columnasPrev, registros: registrosPrev, total: registrosPrev.length });
      } catch (certErr) {
        console.error('[cert preview] error:', certErr.message);
        return res.status(500).json({ success: false, message: certErr.message });
      }
    }

    if (!modelo) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    // ✅ Campo fecha según el tipo
    const campoFecha =
      tipo === 'puntosActividad'  ? 'fecha' :
      tipo === 'paradasActividad' ? 'inicio' :
      'fechaCorte';

    // Filtros
    const filtros = {};

    // Rango fechas
    if (fechaInicio && fechaFin) {
      filtros[campoFecha] = { gte: new Date(fechaInicio), lte: new Date(fechaFin) };
    } else if (fechaInicio) {
      filtros[campoFecha] = { gte: new Date(fechaInicio) };
    } else if (fechaFin) {
      filtros[campoFecha] = { lte: new Date(fechaFin) };
    }

    const esGlobal = ["ADMIN", "ASESOR"].includes(decoded.rol);
    const tituloParam = req.query.tituloMineroId || null;

    // Filtro usuario: ADMIN puede filtrar por usuarioId del dropdown
    if (usuarioId && usuarioId !== '') {
      if (tipo === 'puntosActividad' || tipo === 'paradasActividad') filtros.usuario_id = usuarioId;
      else filtros.usuarioId = usuarioId;
    } else if (!esGlobal) {
      // No-admin sin filtro de usuario: ve solo los suyos
      if (tipo === 'puntosActividad' || tipo === 'paradasActividad') filtros.usuario_id = decoded.id;
      else filtros.usuarioId = decoded.id;
    }

    // Filtro título minero por rol (para puntosActividad)
    if (tipo === 'puntosActividad' && !filtros.usuario_id) {
      if (esGlobal && tituloParam) filtros.titulo_minero_id = tituloParam;
      else if (!esGlobal && decoded.tituloMineroId) filtros.titulo_minero_id = decoded.tituloMineroId;
    } else if (tipo !== 'puntosActividad' && tipo !== 'paradasActividad') {
      if (esGlobal && tituloParam) filtros.tituloMineroId = tituloParam;
      else if (!esGlobal && decoded.tituloMineroId) filtros.tituloMineroId = decoded.tituloMineroId;
    }

    // Filtro estado
    if (estado && estado !== '') filtros.estado = estado;

    // Filtro mineral
    if (mineral && mineral !== '' && tipo !== 'puntosActividad') {
      filtros.mineral = { contains: mineral, mode: 'insensitive' };
    }

    // Filtro título minero
    if (tituloMineroId && tituloMineroId !== '' && tipo !== 'puntosActividad') {
      filtros.tituloMineroId = parseInt(tituloMineroId, 10) || tituloMineroId;
    }

    console.log('📋 FILTROS FINALES getPreview:', JSON.stringify(filtros));

    // Query base
    const query = {
      where: filtros,
      orderBy: { [campoFecha]: 'desc' },
      take: 100
    };

    // ✅ Solo tablas FRI tienen relación tituloMinero
    if (tipo !== 'puntosActividad' && tipo !== 'paradasActividad') {
      query.include = { tituloMinero: true };
    }

    // Obtener datos
    const datos = await modelo.findMany(query);

    const columnas  = getColumnas(tipo);
    const registros = transformarDatos(datos, tipo);

    res.json({
      success: true,
      columnas,
      registros,
      total: registros.length
    });

  } catch (error) {
    console.error("Error en preview:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener datos",
      error: error.message,
    });
  }
};


// EXPORTAR - Generar Excel
exports.exportarExcel = async (req, res) => {
  try {
    const decoded = verificarToken(req, res);
    if (!decoded) return;

    const { tipo, fechaInicio, fechaFin, usuarioId, estado, mineral, tituloMineroId } = req.query;
    console.log('🔍 REQ.QUERY:', JSON.stringify(req.query));
    

    // 🔍 DEBUG — ver exactamente qué llega del frontend
    console.log('\n══════ PREVIEW REQUEST ══════');
    console.log('query params:', JSON.stringify(req.query, null, 2));
    console.log('decoded.id:', decoded.id, '| tipo:', typeof decoded.id);
    console.log('decoded.rol:', decoded.rol);
    console.log('usuarioId recibido:', usuarioId, '| tipo:', typeof usuarioId);
    console.log('parseInt(usuarioId):', parseInt(usuarioId, 10));
    console.log('estado:', estado);
    console.log('mineral:', mineral);
    console.log('═════════════════════════════\n');

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
      puntosActividad:    prisma.puntos_actividad,
      paradasActividad:   prisma.paradas_actividad,
      certificadosOrigen: prisma.certificados_origen,
    };

    const modelo = modelos[tipo];
    if (!modelo) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    // -- Manejo especial certificadosOrigen (exportarExcel) --
    if (tipo === 'certificadosOrigen') {
      try {
        const esGCertExp = ['ADMIN', 'ASESOR'].includes(decoded.rol);
        const filtroCertExp = {};
        const tituloPCExp = req.query.tituloMineroId || null;

        if (esGCertExp && tituloPCExp)                      filtroCertExp.tituloMineroId = tituloPCExp;
        else if (!esGCertExp && decoded.tituloMineroId)     filtroCertExp.tituloMineroId = decoded.tituloMineroId;

        if (fechaInicio || fechaFin) {
          filtroCertExp.fechaCertificado = {};
          if (fechaInicio) filtroCertExp.fechaCertificado.gte = new Date(fechaInicio);
          if (fechaFin)    filtroCertExp.fechaCertificado.lte = new Date(fechaFin + 'T23:59:59');
        }
        if (mineral && mineral !== '')
          filtroCertExp.mineralExplotado = { contains: mineral, mode: 'insensitive' };
        const clienteIdExp = req.query.clienteId || null;
        if (clienteIdExp) filtroCertExp.clienteId = clienteIdExp;

        const whereExp = ['1=1']; const paramsExp = []; let pe = 1;
        if (filtroCertExp.tituloMineroId)            { whereExp.push(`c."tituloMineroId" = $${pe++}`); paramsExp.push(filtroCertExp.tituloMineroId); }
        if (filtroCertExp.clienteId)                 { whereExp.push(`c."clienteId" = $${pe++}`);      paramsExp.push(filtroCertExp.clienteId); }
        if (filtroCertExp.fechaCertificado?.gte)      { whereExp.push(`c."fechaCertificado" >= $${pe++}`); paramsExp.push(filtroCertExp.fechaCertificado.gte); }
        if (filtroCertExp.fechaCertificado?.lte)      { whereExp.push(`c."fechaCertificado" <= $${pe++}`); paramsExp.push(filtroCertExp.fechaCertificado.lte); }
        if (filtroCertExp.mineralExplotado?.contains) { whereExp.push(`c."mineralExplotado" ILIKE $${pe++}`); paramsExp.push('%' + filtroCertExp.mineralExplotado.contains + '%'); }

        const sqlExp = `SELECT c.id, c."tituloMineroId", c."clienteId", c."mineralExplotado",
          COALESCE(c."cantidadM3"::numeric, 0) AS "cantidadM3",
          c."unidadMedida", c."fechaCertificado", c."usuarioId", c."createdAt", c.consecutivo,
          cl.nombre AS cliente_nombre, cl.cedula AS cliente_cedula
          FROM certificados_origen c
          LEFT JOIN clientes_compradores cl ON cl.id = c."clienteId"
          WHERE ${whereExp.join(' AND ')}
          ORDER BY c."fechaCertificado" DESC`;

        const rawExp = await prisma.$queryRawUnsafe(sqlExp, ...paramsExp);
        const datosCertExp = rawExp.map(r => ({
          ...r, cantidadM3: r.cantidadM3 ?? 0,
          clientes_compradores: { nombre: r.cliente_nombre || '', cedula: r.cliente_cedula || '' }
        }));

        if (datosCertExp.length === 0)
          return res.status(404).json({ success: false, message: 'No hay certificados para exportar' });

        const wbCert = new ExcelJS.Workbook();
        const wsCert = wbCert.addWorksheet('Certificados de Origen');
        const colsCert = getColumnas('certificadosOrigen');
        wsCert.columns = colsCert.map(col => ({ header: col, key: col, width: 22 }));
        wsCert.getRow(1).font = { bold: true };
        wsCert.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        transformarDatos(datosCertExp, 'certificadosOrigen').forEach(r => wsCert.addRow(Object.values(r)));
        wsCert.eachRow(row => row.eachCell(cell => {
          cell.border = { top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'} };
        }));
        const nombreCertExp = `Certificados_Origen_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreCertExp}"`);
        await wbCert.xlsx.write(res);
        return res.end();
      } catch (certExpErr) {
        console.error('[cert export] error:', certExpErr.message);
        return res.status(500).json({ success: false, message: certExpErr.message });
      }
    }


    // Filtros
    const filtros = {};

    // Campo fecha según el tipo
    const campoFecha =
      tipo === 'puntosActividad'  ? 'fecha' :
      tipo === 'paradasActividad' ? 'inicio' :
      'fechaCorte';

    // Rango fechas
    if (fechaInicio && fechaFin) {
      filtros[campoFecha] = { gte: new Date(fechaInicio), lte: new Date(fechaFin) };
    } else if (fechaInicio) {
      filtros[campoFecha] = { gte: new Date(fechaInicio) };
    } else if (fechaFin) {
      filtros[campoFecha] = { lte: new Date(fechaFin) };
    }

    const esGlobal = ["ADMIN", "ASESOR"].includes(decoded.rol);
    const tituloParam = req.query.tituloMineroId || null;

    if (tipo === "puntosActividad" || tipo === "paradasActividad") {
      // Filtro usuario (OPERARIO ve solo los suyos)
      if (usuarioId && usuarioId !== '') {
        filtros.usuario_id = usuarioId;
      } else if (decoded.rol === "OPERARIO") {
        filtros.usuario_id = decoded.id;
      }
      // Solo puntosActividad tiene titulo_minero_id
      if (tipo === "puntosActividad" && esGlobal && tituloParam) {
        filtros.titulo_minero_id = tituloParam;
      }
    } else {
      if (esGlobal) {
        if (tituloParam) filtros.tituloMineroId = tituloParam;
      } else if (decoded.tituloMineroId) {
        filtros.tituloMineroId = decoded.tituloMineroId;
      }
    }


    // Filtro estado
    if (estado) filtros.estado = estado;

    // Filtro mineral
    if (mineral && tipo !== 'puntosActividad' && tipo !== 'paradasActividad') {
      filtros.mineral = { contains: mineral, mode: 'insensitive' };
    }

    // Filtro título minero
    if (tituloMineroId && tipo !== 'puntosActividad' && tipo !== 'paradasActividad') {
      const tid = parseInt(tituloMineroId, 10);
      if (!isNaN(tid)) filtros.tituloMineroId = tid;
    }

    // 🔍 DEBUG
    console.log('📋 FILTROS FINALES exportarExcel:', JSON.stringify(filtros, null, 2));

    // Obtener datos
    const query = {
      where: filtros,
      orderBy: { [campoFecha]: 'asc' }
    };

    // Solo las tablas FRI tienen relación tituloMinero
    if (tipo !== 'puntosActividad' && tipo !== 'paradasActividad') {
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