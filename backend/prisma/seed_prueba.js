// ══════════════════════════════════════════════════════════════════
//  SEED GEOJSON — 7 títulos reales del catastro minero ANM
//  Uso: node prisma/seed-geojson.js
// ══════════════════════════════════════════════════════════════════
const { PrismaClient } = require('@prisma/client');
const bcrypt           = require('bcryptjs');
const prisma           = new PrismaClient();

function rand(min, max, dec = 0) {
  const v = Math.random() * (max - min) + min;
  return dec > 0 ? parseFloat(v.toFixed(dec)) : Math.round(v);
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function diasHabilesDelMes(año, mes, cantidad) {
  const hoy = new Date();
  const esActual = año === hoy.getFullYear() && mes === hoy.getMonth();
  const tope = esActual ? hoy.getDate() : new Date(año, mes + 1, 0).getDate();
  const cands = [];
  for (let d = 1; d <= tope; d++) {
    const dow = new Date(año, mes, d).getDay();
    if (dow !== 0 && dow !== 6) cands.push(d);
  }
  const n = Math.min(cantidad, cands.length);
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  return cands.slice(0, n).sort((a, b) => a - b);
}

function generarPeriodos() {
  const hoy = new Date(); const periodos = [];
  for (let i = 4; i >= 0; i--) {
    const ref = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const año = ref.getFullYear(), mes = ref.getMonth();
    const esActual = i === 0;
    const fechaCorte = esActual
      ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 0)
      : new Date(año, mes + 1, 0, 23, 59, 0);
    periodos.push({ año, mes, fechaCorte, estado: esActual ? 'BORRADOR' : 'ENVIADO' });
  }
  return periodos;
}
const PERIODOS = generarPeriodos();

// ─── 7 títulos reales de la ANM ───────────────────────────────────
// centroid: [lat, lon]  ·  polygon: [[lon, lat], ...]  (formato GeoJSON)
const CONFIG = [
  {
    id: "titulo-ggb_151", numeroTitulo: "GGB-151",
    municipio: "Charal\u00e1", departamento: "Santander",
    area_ha: 7.657, clasificacion: "Peque\u00f1a Miner\u00eda",
    etapa: "Explotaci\u00f3n", minerales: "Gravas",
    titular: "EDGAR ALEXANDER SARMIENTO BUENO",
    modalidad: "Contrato de Concesi\u00f3n (L 685)",
    expedicion: new Date(1208390400000), expiracion: new Date(2154988800000),
    metodo: "Aluvial",
    mineral_list: ["Gravas"],
    lat: 6.30068, lon: -73.14449,
    centroid: [6.30068, -73.14449], polygon: [[-73.14623826, 6.29650064], [-73.14533465, 6.29649902], [-73.14533011, 6.29903061], [-73.14256684, 6.30304906], [-73.14265394, 6.3048575], [-73.14342202, 6.30485888], [-73.14351653, 6.30255349], [-73.14401605, 6.30115298], [-73.14641444, 6.29903256], [-73.14623826, 6.29650064]],
    slug: "ggb_151",
  },
  {
    id: "titulo-iho_15451", numeroTitulo: "IHO-15451",
    municipio: "Los Patios", departamento: "Norte de Santander",
    area_ha: 80.5081, clasificacion: "Peque\u00f1a Miner\u00eda",
    etapa: "Explotaci\u00f3n", minerales: "Arcilla Común, Arcilla Ferruginosa, Arcillas Caoliniticas",
    titular: "CERAMICAS AMERICA S.A.",
    modalidad: "Contrato de Concesi\u00f3n (L 685)",
    expedicion: new Date(1244505600000), expiracion: new Date(2254262400000),
    metodo: "Cielo Abierto",
    mineral_list: ["Arcilla Común", "Arcilla Ferruginosa", "Arcillas Caoliniticas"],
    lat: 7.73893, lon: -72.52442,
    centroid: [7.73893, -72.52442], polygon: [[-72.5277193, 7.73434276], [-72.52774089, 7.73269755], [-72.52115266, 7.73270173], [-72.52109991, 7.74119923], [-72.52254082, 7.74119395], [-72.52255427, 7.74515404], [-72.5257986, 7.74514212], [-72.5277193, 7.73434276]],
    slug: "iho_15451",
  },
  {
    id: "titulo-ij1_15341", numeroTitulo: "IJ1-15341",
    municipio: "Acac\u00edas", departamento: "Meta",
    area_ha: 689.1031, clasificacion: "Mediana Miner\u00eda",
    etapa: "Explotaci\u00f3n", minerales: "Arenas de Río, Gravas de Río",
    titular: "HENRY ANDRES OLARTE",
    modalidad: "Contrato de Concesi\u00f3n (L 685)",
    expedicion: new Date(1245283200000), expiracion: new Date(2223504000000),
    metodo: "Aluvial",
    mineral_list: ["Arenas de Río", "Gravas de Río"],
    lat: 3.93214, lon: -73.83776,
    centroid: [3.93214, -73.83776], polygon: [[-73.82550595, 3.91420991], [-73.83444389, 3.91499487], [-73.83649645, 3.91611684], [-73.83648508, 3.95444568], [-73.8500186, 3.95444569], [-73.84965905, 3.92019008], [-73.83973889, 3.91259097], [-73.82724774, 3.90983085], [-73.82550595, 3.91420991]],
    slug: "ij1_15341",
  },
  {
    id: "titulo-ihg_15541", numeroTitulo: "IHG-15541",
    municipio: "Valledupar", departamento: "Cesar",
    area_ha: 348.8842, clasificacion: "Mediana Miner\u00eda",
    etapa: "Explotaci\u00f3n", minerales: "Recebo",
    titular: "ALVARO ROSALES BELTRAN",
    modalidad: "Contrato de Concesi\u00f3n (L 685)",
    expedicion: new Date(1273795200000), expiracion: new Date(2220480000000),
    metodo: "Aluvial",
    mineral_list: ["Recebo"],
    lat: 10.10268, lon: -73.73075,
    centroid: [10.10268, -73.73075], polygon: [[-73.72291656, 10.0936296], [-73.72163035, 10.09440044], [-73.72162115, 10.10266893], [-73.73073485, 10.11171956], [-73.73985868, 10.11172917], [-73.7398778, 10.09364763], [-73.72291656, 10.0936296]],
    slug: "ihg_15541",
  },
  {
    id: "titulo-ggb_111", numeroTitulo: "GGB-111",
    municipio: "La Pe\u00f1a", departamento: "Cundinamarca",
    area_ha: 599.3756, clasificacion: "Mediana Miner\u00eda",
    etapa: "Explotaci\u00f3n", minerales: "Esmeralda, Minerales de Cobre",
    titular: "JOSE MIGUEL RAMOS",
    modalidad: "Contrato de Concesi\u00f3n (L 685)",
    expedicion: new Date(1182915518000), expiracion: new Date(2129587200000),
    metodo: "Subterráneo",
    mineral_list: ["Esmeralda", "Minerales de Cobre"],
    lat: 5.25626, lon: -74.39774,
    centroid: [5.25626, -74.39774], polygon: [[-74.38420431, 5.24722408], [-74.38421299, 5.26530965], [-74.41127541, 5.265296], [-74.41126596, 5.24721048], [-74.38420431, 5.24722408]],
    slug: "ggb_111",
  },
  {
    id: "titulo-ihg_11282x", numeroTitulo: "IHG-11282X",
    municipio: "Tumaco", departamento: "Nari\u00f1o",
    area_ha: 39.7337, clasificacion: "Peque\u00f1a Miner\u00eda",
    etapa: "Explotaci\u00f3n", minerales: "Arenas, Gravas",
    titular: "SERGIO EDMUNDO CAICEDO HINCAPIE",
    modalidad: "Contrato de Concesi\u00f3n (L 685)",
    expedicion: new Date(1434099756000), expiracion: new Date(2380752000000),
    metodo: "Aluvial",
    mineral_list: ["Arenas", "Gravas"],
    lat: 1.4987, lon: -78.68534,
    centroid: [1.4987, -78.68534], polygon: [[-78.68208547, 1.4991124], [-78.68845809, 1.50448653], [-78.68958927, 1.50283635], [-78.68817363, 1.50101477], [-78.68713233, 1.49967551], [-78.68447369, 1.49747441], [-78.68435593, 1.49610226], [-78.68192718, 1.49297699], [-78.68208547, 1.4991124]],
    slug: "ihg_11282x",
  },
  {
    id: "titulo-lgd_10411", numeroTitulo: "LGD-10411",
    municipio: "Marip\u00ed", departamento: "Boyac\u00e1",
    area_ha: 22.0242, clasificacion: "Peque\u00f1a Miner\u00eda",
    etapa: "Exploraci\u00f3n", minerales: "Esmeralda",
    titular: "JULIO CESAR GOMEZ CIFUENTES",
    modalidad: "Contrato de Concesi\u00f3n (L 685)",
    expedicion: new Date(1732618216000), expiracion: new Date(2679303016000),
    metodo: "Subterráneo",
    mineral_list: ["Esmeralda"],
    lat: 5.6325, lon: -74.0445,
    centroid: [5.6325, -74.0445], polygon: [[-74.041, 5.633], [-74.041, 5.634], [-74.042, 5.634], [-74.043, 5.634], [-74.044, 5.634], [-74.045, 5.634], [-74.046, 5.634], [-74.047, 5.634], [-74.048, 5.634], [-74.048, 5.633], [-74.047, 5.633], [-74.047, 5.632], [-74.046, 5.632], [-74.046, 5.631], [-74.045, 5.631], [-74.044, 5.631], [-74.043, 5.631], [-74.042, 5.631], [-74.041, 5.631], [-74.041, 5.632], [-74.041, 5.633]],
    slug: "lgd_10411",
  },
];


function categoriasParaTitulo(cfg) {
  return cfg.etapa === 'Exploración' ? ['extraccion'] : ['extraccion','acopio','procesamiento'];
}
function zonaPorCategoria(cfg, cat) {
  const OFFSETS = {
    extraccion   : { dLat:  0.012, dLon:  0.000, sc: 0.0015 },
    acopio       : { dLat:  0.002, dLon:  0.015, sc: 0.0015 },
    procesamiento: { dLat: -0.010, dLon:  0.005, sc: 0.0012 },
  };
  const z = OFFSETS[cat] || { dLat:0, dLon:0, sc:0.002 };
  const n = () => (Math.random() - 0.5) * 2 * z.sc;
  return { lat: parseFloat((cfg.lat+z.dLat+n()).toFixed(8)), lon: parseFloat((cfg.lon+z.dLon+n()).toFixed(8)) };
}

const MOTIVOS_DEF = [
  { codigo:'MANTENIMIENTO', nombre:'Mantenimiento'             },
  { codigo:'LUZ',           nombre:'Se fue la luz'             },
  { codigo:'AGUA',          nombre:'Sin agua'                  },
  { codigo:'CORREA',        nombre:'Se salió la correa'        },
  { codigo:'ALIMENTACION',  nombre:'Sin alimentación'          },
  { codigo:'ATASCAMIENTO',  nombre:'Atascamiento Alimentador'  },
  { codigo:'PIEDRA_GAVIAN', nombre:'Se llenó de piedra Gavián' },
  { codigo:'LLUVIA',        nombre:'Lluvia intensa'            },
  { codigo:'ACCIDENTE',     nombre:'Accidente / Incidente'     },
  { codigo:'OTRO',          nombre:'Otro'                      },
];
const MAQ_DEF = [
  { codigo:'CAT-336',    marca:'Caterpillar', modelo:'336'    },
  { codigo:'KOMA-PC200', marca:'Komatsu',     modelo:'PC200'  },
  { codigo:'VOLVO-A40',  marca:'Volvo',       modelo:'A40G'   },
  { codigo:'CAT-777',    marca:'Caterpillar', modelo:'777G'   },
  { codigo:'BELL-B40',   marca:'Bell',        modelo:'B40E'   },
  { codigo:'SAND-DD422', marca:'Sandvik',     modelo:'DD422i' },
];
const ITEMS_DEF = [
  { categoria:'extraccion',    codigo:'EXT_001', nombre:'Frente de Arranque',       orden:0 },
  { categoria:'extraccion',    codigo:'EXT_002', nombre:'Zona de Cargue',           orden:1 },
  { categoria:'acopio',        codigo:'ACO_001', nombre:'Punto de Acopio',          orden:0 },
  { categoria:'acopio',        codigo:'ACO_002', nombre:'Patio de Almacenamiento',  orden:1 },
  { categoria:'procesamiento', codigo:'PRO_001', nombre:'Planta de Beneficio',      orden:0 },
  { categoria:'procesamiento', codigo:'PRO_002', nombre:'Piscina de Sedimentación', orden:1 },
  { categoria:'procesamiento', codigo:'PRO_003', nombre:'Tolva de Alimentación',    orden:2 },
];
const CLIENTES_DEF = [
  { id:'cli-geo-001', cedula:'31100001', nombre:'Materiales del Caribe S.A.S',   tipoIdentificacion:'NIT', tipoComprador:'COMERCIALIZADOR' },
  { id:'cli-geo-002', cedula:'31100002', nombre:'Constructora Piedras y Arenas',  tipoIdentificacion:'NIT', tipoComprador:'CONSUMIDOR'      },
  { id:'cli-geo-003', cedula:'31100003', nombre:'Arcillas y Refractarios Ltda',   tipoIdentificacion:'NIT', tipoComprador:'COMERCIALIZADOR' },
  { id:'cli-geo-004', cedula:'31100004', nombre:'Esmeraldas del Occidente SAS',   tipoIdentificacion:'NIT', tipoComprador:'CONSUMIDOR'      },
  { id:'cli-geo-005', cedula:'31100005', nombre:'Mineria Sostenible Colombia',    tipoIdentificacion:'NIT', tipoComprador:'COMERCIALIZADOR' },
];

const AREAS_PROD  = ['Zona A','Zona B','Galería Principal','Corte Norte','Frente Sur'];
const TECNO_LISTA = ['Explosivos controlados','Retroexcavadora hidráulica','Perforación rotativa','Minería selectiva','Dragado aluvial'];
const ESTADOS_OP  = ['OPERATIVA','EN_MANTENIMIENTO','FUERA_DE_SERVICIO'];
const MARCAS_MAQ  = ['Caterpillar','Komatsu','Volvo','Bell','Sandvik'];
const TIPOS_MAQ   = ['Excavadora','Volqueta','Perforadora','Cargador','Motoniveladora'];
const NOMBRES_OP  = ['Carlos Mendoza','Ana Rodríguez','Pedro Vargas','Luisa Peña','Omar Guerrero','Nelly Ríos','Diego Morales'];

// ══════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n🌱  Seed GeoJSON — 7 títulos reales ANM...\n');
  const pwd = await bcrypt.hash('TuMina2024!', 10);

  // ── 1. Títulos reales ────────────────────────────────────────
  console.log('  📍 Títulos (7 reales)...');
  for (const t of CONFIG) {
    await prisma.tituloMinero.upsert({
      where : { id: t.id },
      update: { etapa:t.etapa, area_ha:t.area_ha, clasificacion:t.clasificacion,
                minerales:t.minerales, modalidad:t.modalidad, centroid:t.centroid, polygon:t.polygon },
      create: {
        id:t.id, numeroTitulo:t.numeroTitulo,
        municipio:t.municipio, departamento:t.departamento,
        estado:'ACTIVO', fechaInicio:t.expedicion, fechaVencimiento:t.expiracion,
        nombreTitular:t.titular, modalidad:t.modalidad,
        etapa:t.etapa, area_ha:t.area_ha, clasificacion:t.clasificacion,
        minerales:t.minerales, centroid:t.centroid, polygon:t.polygon,
      },
    });
    console.log(`     ✓ ${t.numeroTitulo} — ${t.municipio}, ${t.departamento} (${t.etapa}, ${t.area_ha} ha)`);
  }

  // ── 2. JEFE_PLANTA + TITULAR por título ───────────────────────
  console.log('\n  👤 Usuarios (jefe + titular por título)...');
  const JEFE_IDS = {};
  for (const t of CONFIG) {
    const jefeId = `user-jefe-${t.slug}`;
    JEFE_IDS[t.id] = jefeId;
    await prisma.usuario.upsert({
      where : { email: `jefe.${t.slug}@tumina.co` }, update: {},
      create: { id:jefeId, nombre:`Jefe Planta ${t.municipio}`,
                email:`jefe.${t.slug}@tumina.co`,
                password:pwd, rol:'JEFE_PLANTA', activo:true, tituloMineroId:t.id },
    });
    await prisma.usuario.upsert({
      where : { email: `titular.${t.slug}@tumina.co` }, update: {},
      create: { id:`user-titular-${t.slug}`, nombre:t.titular,
                email:`titular.${t.slug}@tumina.co`,
                password:pwd, rol:'TITULAR', activo:true, tituloMineroId:t.id },
    });
  }

  // ── 3. 3 Operarios por título ─────────────────────────────────
  console.log('  👤 Operarios (3 por título)...');
  const OP_IDS = {};
  for (let t = 0; t < CONFIG.length; t++) {
    const cfg = CONFIG[t]; const ids = [];
    for (let o = 0; o < 3; o++) {
      const id = `user-op-${cfg.slug}-0${o+1}`; ids.push(id);
      await prisma.usuario.upsert({
        where : { email: `op.${cfg.slug}.${o+1}@tumina.co` }, update: {},
        create: { id, nombre:`${NOMBRES_OP[o]} (${cfg.municipio})`,
                  email:`op.${cfg.slug}.${o+1}@tumina.co`,
                  password:pwd, rol:'OPERARIO', activo:true, tituloMineroId:cfg.id },
      });
    }
    OP_IDS[cfg.id] = ids;
  }

  // ── 4. Catálogos ─────────────────────────────────────────────
  console.log('  📚 Catálogos...');
  for (const m of MOTIVOS_DEF) {
    await prisma.paradas_motivos.upsert({ where:{ codigo:m.codigo }, update:{}, create:{ codigo:m.codigo, nombre:m.nombre, activo:true } });
  }
  const MOTIVOS = await prisma.paradas_motivos.findMany({ where:{ codigo:{ in:MOTIVOS_DEF.map(m=>m.codigo) } } });

  for (const item of ITEMS_DEF) {
    try { await prisma.puntos_items_catalogo.upsert({ where:{ categoria_codigo:{ categoria:item.categoria, codigo:item.codigo } }, update:{}, create:{ ...item, activo:true } }); } catch(_) {}
  }
  const ITEMS_CAT = await prisma.puntos_items_catalogo.findMany();

  for (const m of MAQ_DEF) {
    try { await prisma.maquinaria_catalogo.upsert({ where:{ codigo:m.codigo }, update:{}, create:{ codigo:m.codigo, marca:m.marca, modelo:m.modelo, activo:true, orden:0 } }); } catch(_) {}
  }
  const MAQ_CAT = await prisma.maquinaria_catalogo.findMany();

  for (const c of CLIENTES_DEF) {
    try { await prisma.clientes_compradores.upsert({ where:{ cedula:c.cedula }, update:{}, create:{ ...c, updatedAt:new Date() } }); } catch(_) {}
  }

  // ── 5. FRI ────────────────────────────────────────────────────
  console.log('  📋 Formularios FRI...');
  let totFRI = 0;

  for (const cfg of CONFIG) {
    const jefeId = JEFE_IDS[cfg.id];
    const mesesActivos = cfg.etapa === 'Exploración' ? [3,4] : [0,1,2,3,4];

    for (const idxMes of mesesActivos) {
      const { año, mes, fechaCorte, estado } = PERIODOS[idxMes];

      for (const mineral of cfg.mineral_list) {
        const entraPlanta = rand(400, 1800, 4);
        await prisma.fRIProduccion.create({ data:{ fechaCorte, mineral,
          horasOperativas:rand(120,240,2), cantidadProduccion:rand(500,2500,4),
          unidadMedida:'Toneladas', materialEntraPlanta:entraPlanta,
          materialSalePlanta:rand(300,Math.floor(entraPlanta),4), masaUnitaria:rand(1.2,4.0,4),
          estado, tituloMineroId:cfg.id, usuarioId:jefeId } }); totFRI++;

        const invIni=rand(100,500,4), ing=rand(200,800,4), sal=rand(100,Math.floor(invIni+ing),4);
        await prisma.fRIInventarios.create({ data:{ fechaCorte, mineral, unidadMedida:'Toneladas',
          inventarioInicialAcopio:invIni, ingresoAcopio:ing, salidaAcopio:sal,
          inventarioFinalAcopio:parseFloat((invIni+ing-sal).toFixed(4)),
          estado, tituloMineroId:cfg.id, usuarioId:jefeId } }); totFRI++;

        await prisma.fRIEjecucion.create({ data:{ fechaCorte, mineral,
          denominacionFrente:`Frente ${pick(['Norte','Sur','Este','Oeste','Central'])}`,
          latitud:cfg.lat, longitud:cfg.lon, metodoExplotacion:cfg.metodo,
          avanceEjecutado:rand(10,80,2), unidadMedidaAvance:'Metros',
          volumenEjecutado:rand(200,2000,4),
          estado, tituloMineroId:cfg.id, usuarioId:jefeId } }); totFRI++;

        await prisma.fRIRegalias.create({ data:{ fechaCorte, mineral,
          cantidadExtraida:rand(500,2500,4), unidadMedida:'Toneladas',
          valorDeclaracion:rand(5000000,50000000,2),
          valorContraprestaciones:rand(500000,5000000,2),
          resolucionUPME:`UPME-${año}-${rand(100,999)}`,
          estado, tituloMineroId:cfg.id, usuarioId:jefeId } }); totFRI++;
      }

      const inicioP=new Date(año,mes,rand(1,20),rand(6,14),0,0), finP=new Date(inicioP);
      finP.setHours(inicioP.getHours()+rand(2,8));
      await prisma.fRIParadas.create({ data:{ fechaCorte,
        tipoParada:pick(['PROGRAMADA','NO_PROGRAMADA','MANTENIMIENTO']),
        fechaInicio:inicioP, fechaFin:finP, horasParadas:rand(2,8,2),
        motivo:'Mantenimiento preventivo', estado, tituloMineroId:cfg.id, usuarioId:jefeId } }); totFRI++;

      await prisma.fRIMaquinaria.create({ data:{ fechaCorte, tipoMaquinaria:pick(TIPOS_MAQ),
        cantidad:rand(1,5), horasOperacion:rand(100,240,2),
        capacidadTransporte:rand(10,50,2), unidadCapacidad:'Toneladas',
        estado, tituloMineroId:cfg.id, usuarioId:jefeId } }); totFRI++;

      await prisma.fRIInventarioMaquinaria.create({ data:{ fechaCorte,
        tipoMaquinaria:pick(TIPOS_MAQ), marca:pick(MARCAS_MAQ), modelo:`${rand(300,500)}`,
        a_oFabricacion:rand(2010,2022), capacidad:rand(20,80,2),
        estadoOperativo:pick(ESTADOS_OP),
        estado, tituloMineroId:cfg.id, usuarioId:jefeId } }); totFRI++;

      await prisma.fRICapacidad.create({ data:{ fechaCorte,
        areaProduccion:pick(AREAS_PROD), tecnologiaUtilizada:pick(TECNO_LISTA),
        capacidadInstalada:rand(500,4000,4), unidadMedida:'Toneladas/Mes',
        personalCapacitado:rand(3,25), certificaciones:`ISO-9001, NTC-${rand(1000,9999)}`,
        estado, tituloMineroId:cfg.id, usuarioId:jefeId } }); totFRI++;

      await prisma.fRIProyecciones.create({ data:{ fechaCorte,
        metodoExplotacion:cfg.metodo, mineral:cfg.mineral_list[0],
        capacidadExtraccion:rand(800,3000,4), capacidadTransporte:rand(600,2500,4),
        capacidadBeneficio:rand(500,2000,4), cantidadProyectada:rand(1000,4000,4),
        densidadManto:rand(2.5,4.5,4),
        proyeccionTopografia:`Topografía ${cfg.municipio} ${mes+1}/${año}`,
        estado, tituloMineroId:cfg.id, usuarioId:jefeId } }); totFRI++;
    }
  }

  // ── 6. Puntos de actividad ────────────────────────────────────
  console.log('  📍 Puntos de actividad (8-12/día/título)...');
  let totPuntos = 0;

  for (const cfg of CONFIG) {
    const ops = OP_IDS[cfg.id];
    const cats = categoriasParaTitulo(cfg);
    const mesesActivos = cfg.etapa === 'Exploración' ? [3,4] : [0,1,2,3,4];
    const itemsFilt = ITEMS_CAT.filter(i => cats.includes(i.categoria));

    for (const idxMes of mesesActivos) {
      const { año, mes } = PERIODOS[idxMes];
      const dias = diasHabilesDelMes(año, mes, rand(10, 15));
      for (const dia of dias) {
        for (let p = 0; p < rand(8, 12); p++) {
          const opId = ops[(dia+p)%ops.length];
          const fecha = new Date(año, mes, dia, rand(6,17), rand(0,59), 0);
          const item  = pick(itemsFilt.length ? itemsFilt : ITEMS_CAT);
          const maq   = pick(MAQ_CAT);
          const zona  = zonaPorCategoria(cfg, item.categoria);
          await prisma.puntos_actividad.create({ data:{
            usuario_id:opId, titulo_minero_id:cfg.id,
            latitud:zona.lat, longitud:zona.lon,
            categoria:item.categoria, item_id:item.id, item_nombre:item.nombre,
            maquinaria_id:maq.id, maquinaria_nombre:`${maq.marca} ${maq.modelo}`,
            descripcion:`${item.nombre} — ${cfg.municipio} ${dia}/${mes+1}/${año}`,
            volumen_m3:rand(10,200,2), fecha, dia:new Date(año,mes,dia),
          } });
          totPuntos++;
        }
      }
    }
  }

  // ── 7. Paradas de actividad ───────────────────────────────────
  console.log('  ⏸️  Paradas de actividad...');
  let totParadas = 0;

  for (const cfg of CONFIG) {
    const ops = OP_IDS[cfg.id];
    const mesesActivos = cfg.etapa === 'Exploración' ? [3,4] : [0,1,2,3,4];
    for (const idxMes of mesesActivos) {
      const { año, mes, estado } = PERIODOS[idxMes];
      for (let p = 0; p < rand(2,4); p++) {
        const opId = ops[p%ops.length];
        const hoy = new Date();
        const tope = año===hoy.getFullYear()&&mes===hoy.getMonth() ? hoy.getDate() : 26;
        const diaP = rand(1,tope);
        const inicio=new Date(año,mes,diaP,rand(6,14),0,0), fin=new Date(inicio);
        fin.setMinutes(inicio.getMinutes()+rand(30,240));
        const motivo = pick(MOTIVOS);
        await prisma.paradas_actividad.create({ data:{
          usuario_id:opId, titulo_minero_id:cfg.id,
          motivo_id:motivo.id, motivo_nombre:motivo.nombre,
          inicio, fin, dia:new Date(año,mes,diaP),
          observaciones:`${motivo.nombre} — ${cfg.municipio}`, estado,
        } });
        totParadas++;
      }
    }
  }

  // ── 8. Certificados de origen (solo Explotación) ──────────────
  console.log('  📜 Certificados de origen...');
  let certCont = 0;

  for (const cfg of CONFIG) {
    if (cfg.etapa !== 'Explotación') continue;
    for (const idxMes of [0,1,2,3,4]) {
      const { año, mes } = PERIODOS[idxMes];
      for (let c = 0; c < rand(3,5); c++) {
        certCont++;
        const mineral = pick(cfg.mineral_list);
        const cliente = CLIENTES_DEF[certCont % CLIENTES_DEF.length];
        const hoy = new Date();
        const tope = año===hoy.getFullYear()&&mes===hoy.getMonth() ? hoy.getDate() : 27;
        await prisma.certificados_origen.create({ data:{
          id              : `cert-geo-${String(certCont).padStart(4,'0')}`,
          tituloMineroId  : cfg.id,
          clienteId       : cliente.id,
          mineralExplotado: mineral,
          cantidadM3      : rand(20, 600, 4),
          unidadMedida    : 'M3',
          fechaCertificado: new Date(año, mes, rand(1,tope)),
          usuarioId       : JEFE_IDS[cfg.id],
          consecutivo     : `${cfg.numeroTitulo}-${String(certCont).padStart(4,'0')}`,
        } });
      }
    }
  }

  // ── Resumen ───────────────────────────────────────────────────
  console.log('\n✅  Seed GeoJSON completado!');
  console.log('════════════════════════════════════════════════════════════');
  console.log(' TÍTULOS REALES ANM');
  console.log('════════════════════════════════════════════════════════════');
  CONFIG.forEach(c => {
    const icon = c.etapa === 'Exploración' ? '🔍' : '⛏️ ';
    console.log(`  ${icon} ${c.numeroTitulo.padEnd(14)} ${c.municipio.padEnd(14)} ${c.departamento.padEnd(22)} ${String(c.area_ha.toFixed(2)).padStart(9)} ha`);
  });
  console.log(`\n  Usuarios      : ${CONFIG.length * 5}  (1 jefe + 1 titular + 3 operarios × 7)`);
  console.log(`  FRI           : ${totFRI} formularios`);
  console.log(`  Puntos activ. : ~${totPuntos}`);
  console.log(`  Paradas       : ${totParadas}`);
  console.log(`  Certificados  : ${certCont}  (sólo los 6 títulos en Explotación)`);
  console.log('────────────────────────────────────────────────────────────');
  console.log(' Contraseña: TuMina2024!');
  console.log(' Emails: jefe.<slug>@tumina.co  ·  titular.<slug>@tumina.co');
  console.log('         op.<slug>.1-3@tumina.co');
  console.log(' Slugs:');
  CONFIG.forEach(c => console.log(`   ${c.numeroTitulo.padEnd(14)} → ${c.slug}`));
  console.log('════════════════════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Error en seed-geojson:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());