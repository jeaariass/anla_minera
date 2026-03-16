// ══════════════════════════════════════════════════════════════════
//  SEED RESTO — 5 títulos demo (sin el 816-17)
//  Uso: node prisma/seed-resto.js
//  Ejecutar DESPUÉS de seed-816-17.js
// ══════════════════════════════════════════════════════════════════
const { PrismaClient } = require("@prisma/client");
const bcrypt           = require("bcryptjs");
const prisma           = new PrismaClient();

// ─── Utilidades ───────────────────────────────────────────────────
function rand(min, max, dec = 0) {
  const v = Math.random() * (max - min) + min;
  return dec > 0 ? parseFloat(v.toFixed(dec)) : Math.round(v);
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function diasHabilesDelMes(año, mes, cantidad) {
  const hoy      = new Date();
  const esActual = año === hoy.getFullYear() && mes === hoy.getMonth();
  const tope     = esActual ? hoy.getDate() : new Date(año, mes + 1, 0).getDate();
  const cands    = [];
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
  const hoy      = new Date();
  const periodos = [];
  for (let i = 4; i >= 0; i--) {
    const ref      = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const año      = ref.getFullYear();
    const mes      = ref.getMonth();
    const esActual = i === 0;
    const fechaCorte = esActual
      ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 0)
      : new Date(año, mes + 1, 0, 23, 59, 0);
    periodos.push({ año, mes, fechaCorte, estado: esActual ? "BORRADOR" : "ENVIADO" });
  }
  return periodos;
}
const PERIODOS = generarPeriodos();

// ─── 5 títulos demo ───────────────────────────────────────────────
const TITULO_IDS = [
  "titulo-ggb-091", "titulo-ihg-152", "titulo-kja-222",
  "titulo-lgd-314", "titulo-mng-445",
];

const CONFIG = [
  {
    id: TITULO_IDS[0], numeroTitulo:"GGB-091",
    municipio:"Segovia",  departamento:"Antioquia", codigoMunicipio:"05736",
    nit:"900123456-1", nombreTitular:"Minera Segovia S.A.S", cedulaTitular:"900123456",
    lat:7.0822, lon:-74.7025,
    minerales:["Oro","Plata"], mesesActivos:[0,1,2,3,4], metodo:"Subterráneo",
    etapa:"Explotación", area_ha:85.32, clasificacion:"Mediana Minería",
    mineralesTexto:"Oro, Plata", modalidad:"Contrato de Concesión (L 685)",
    centroid:[7.0822,-74.7025],
    polygon:[[-74.69512,7.08901],[-74.70841,7.08897],[-74.70855,7.07601],
             [-74.70102,7.07598],[-74.70098,7.08201],[-74.69508,7.08198],[-74.69512,7.08901]],
  },
  {
    id: TITULO_IDS[1], numeroTitulo:"IHG-152",
    municipio:"Marmato",  departamento:"Caldas",    codigoMunicipio:"17442",
    nit:"900234567-2", nombreTitular:"Oro Marmato Ltda", cedulaTitular:"900234567",
    lat:5.4724, lon:-75.606,
    minerales:["Oro","Plata","Cobre"], mesesActivos:[0,1,2,3,4], metodo:"Subterráneo",
    etapa:"Explotación", area_ha:64.85, clasificacion:"Pequeña Minería",
    mineralesTexto:"Oro, Plata, Cobre", modalidad:"Contrato de Concesión (L 685)",
    centroid:[5.4724,-75.606],
    polygon:[[-75.59812,5.48101],[-75.61204,5.48095],[-75.61218,5.46398],
             [-75.60541,5.46391],[-75.60535,5.47201],[-75.59806,5.47195],[-75.59812,5.48101]],
  },
  {
    id: TITULO_IDS[2], numeroTitulo:"KJA-222",
    municipio:"El Bagre", departamento:"Antioquia", codigoMunicipio:"05250",
    nit:"900345678-3", nombreTitular:"Extracción El Bagre S.A.", cedulaTitular:"900345678",
    lat:7.5866, lon:-74.8115,
    minerales:["Oro","Platino"], mesesActivos:[0,1,2,3], metodo:"Aluvial",
  },
  {
    id: TITULO_IDS[3], numeroTitulo:"LGD-314",
    municipio:"Quinchía", departamento:"Risaralda", codigoMunicipio:"66594",
    nit:"900456789-4", nombreTitular:"Mineros Quinchía S.A.S", cedulaTitular:"900456789",
    lat:5.3377, lon:-75.7218,
    minerales:["Carbón","Cobre"], mesesActivos:[1,2,3,4], metodo:"Cielo Abierto",
  },
  {
    id: TITULO_IDS[4], numeroTitulo:"MNG-445",
    municipio:"Buriticá", departamento:"Antioquia", codigoMunicipio:"05113",
    nit:"900567890-5", nombreTitular:"Buriticá Gold Corp", cedulaTitular:"900567890",
    lat:6.7257, lon:-75.9341,
    minerales:["Oro","Plata","Níquel"], mesesActivos:[2,3,4], metodo:"Cielo Abierto",
  },
];

function zonaPorCategoria(cfg, cat) {
  const OFFSETS = {
    extraccion   : { dLat:  0.012, dLon:  0.000, sc: 0.0015 },
    acopio       : { dLat:  0.002, dLon:  0.015, sc: 0.0015 },
    procesamiento: { dLat: -0.010, dLon:  0.005, sc: 0.0012 },
  };
  const z = OFFSETS[cat] || { dLat:0, dLon:0, sc:0.002 };
  const n = () => (Math.random() - 0.5) * 2 * z.sc;
  return {
    lat: parseFloat((cfg.lat + z.dLat + n()).toFixed(8)),
    lon: parseFloat((cfg.lon + z.dLon + n()).toFixed(8)),
  };
}

const OPS_POR_TITULO = [10, 12, 11, 13, 15];
const NOMBRES_OP = [
  "Juan Pérez","Luis Gómez","Pedro Ramírez","Marcos Silva","Oscar Díaz",
  "Rodrigo Muñoz","Sebastián Castro","Alejandro Ríos","Daniel Suárez","Héctor Ortiz",
  "Miguel Pinto","David Torres","Jorge Vega","Andrés León","Felipe Mora",
];

// ─── Catálogos base ───────────────────────────────────────────────
const MOTIVOS_DEF = [
  { codigo:"MANTENIMIENTO", nombre:"Mantenimiento"              },
  { codigo:"LUZ",           nombre:"Se fue la luz"              },
  { codigo:"AGUA",          nombre:"Sin agua"                   },
  { codigo:"CORREA",        nombre:"Se salió la correa"         },
  { codigo:"ALIMENTACION",  nombre:"Sin alimentación"           },
  { codigo:"ATASCAMIENTO",  nombre:"Atascamiento Alimentador"   },
  { codigo:"PIEDRA_GAVIAN", nombre:"Se llenó de piedra Gavián"  },
  { codigo:"LLUVIA",        nombre:"Lluvia intensa"             },
  { codigo:"ACCIDENTE",     nombre:"Accidente / Incidente"      },
  { codigo:"OTRO",          nombre:"Otro"                       },
];

const MAQ_DEF = [
  { codigo:"CAT-336",    marca:"Caterpillar", modelo:"336"    },
  { codigo:"KOMA-PC200", marca:"Komatsu",     modelo:"PC200"  },
  { codigo:"VOLVO-A40",  marca:"Volvo",       modelo:"A40G"   },
  { codigo:"CAT-777",    marca:"Caterpillar", modelo:"777G"   },
  { codigo:"BELL-B40",   marca:"Bell",        modelo:"B40E"   },
  { codigo:"SAND-DD422", marca:"Sandvik",     modelo:"DD422i" },
];

const ITEMS_DEF = [
  { categoria:"extraccion",    codigo:"EXT_001", nombre:"Frente de Arranque",       orden:0 },
  { categoria:"extraccion",    codigo:"EXT_002", nombre:"Zona de Cargue",           orden:1 },
  { categoria:"acopio",        codigo:"ACO_001", nombre:"Punto de Acopio",          orden:0 },
  { categoria:"acopio",        codigo:"ACO_002", nombre:"Patio de Almacenamiento",  orden:1 },
  { categoria:"procesamiento", codigo:"PRO_001", nombre:"Planta de Beneficio",      orden:0 },
  { categoria:"procesamiento", codigo:"PRO_002", nombre:"Piscina de Sedimentación", orden:1 },
  { categoria:"procesamiento", codigo:"PRO_003", nombre:"Tolva de Alimentación",    orden:2 },
];

// Clientes con los nuevos campos tipoComprador y tipoIdentificacion
const CLIENTES_DEF = [
  { id:"cliente-001", cedula:"12345678", nombre:"Metales del Norte S.A.S",        tipoIdentificacion:"NIT", tipoComprador:"COMERCIALIZADOR" },
  { id:"cliente-002", cedula:"87654321", nombre:"Comercializadora Aurífera Ltda", tipoIdentificacion:"NIT", tipoComprador:"COMERCIALIZADOR" },
  { id:"cliente-003", cedula:"11223344", nombre:"Gold Trading Colombia",           tipoIdentificacion:"NIT", tipoComprador:"CONSUMIDOR"      },
  { id:"cliente-004", cedula:"55667788", nombre:"Minerales y Metales S.A",        tipoIdentificacion:"NIT", tipoComprador:"COMERCIALIZADOR" },
  { id:"cliente-005", cedula:"99001122", nombre:"Exportadora Mineral SAS",        tipoIdentificacion:"NIT", tipoComprador:"CONSUMIDOR"      },
  { id:"cliente-006", cedula:"22334455", nombre:"Inversiones Mineras del Caribe", tipoIdentificacion:"NIT", tipoComprador:"COMERCIALIZADOR" },
  { id:"cliente-007", cedula:"66778899", nombre:"Precious Metals Colombia",       tipoIdentificacion:"NIT", tipoComprador:"CONSUMIDOR"      },
  { id:"cliente-008", cedula:"33445566", nombre:"Minerales Andinos Ltda",         tipoIdentificacion:"NIT", tipoComprador:"COMERCIALIZADOR" },
  { id:"cliente-009", cedula:"77889900", nombre:"Grupo Extractivo del Pacífico",  tipoIdentificacion:"NIT", tipoComprador:"CONSUMIDOR"      },
  { id:"cliente-010", cedula:"44556677", nombre:"Compañía Aurífera Central S.A",  tipoIdentificacion:"NIT", tipoComprador:"COMERCIALIZADOR" },
];

// Listas para datos FRI aleatorios
const AREAS_PROD  = ["Zona A","Zona B","Galería Principal","Corte Norte","Frente Sur"];
const TECNO_LISTA = [
  "Explosivos controlados","Retroexcavadora hidráulica",
  "Perforación rotativa","Minería selectiva","Dragado aluvial",
];
const ESTADOS_OP  = ["OPERATIVA","EN_MANTENIMIENTO","FUERA_DE_SERVICIO"];
const MARCAS_MAQ2 = ["Caterpillar","Komatsu","Volvo","Bell","Sandvik"];
const TIPOS_MAQ   = ["Excavadora","Volqueta","Perforadora","Cargador","Motoniveladora"];

// ══════════════════════════════════════════════════════════════════
async function main() {
  console.log("\n🌱  Seed RESTO — 5 títulos demo...\n");
  const pwd = await bcrypt.hash("TuMina2024!", 10);

  // ── 1. Títulos ────────────────────────────────────────────────
  console.log("  📍 Títulos (5)...");
  for (const t of CONFIG) {
    const base = {
      id: t.id, numeroTitulo: t.numeroTitulo,
      municipio: t.municipio, departamento: t.departamento,
      codigoMunicipio: t.codigoMunicipio,
      nit: t.nit, nombreTitular: t.nombreTitular, cedulaTitular: t.cedulaTitular,
      estado: "ACTIVO",
      fechaInicio     : new Date("2020-01-15"),
      fechaVencimiento: new Date("2030-01-15"),
    };
    const geo = t.centroid ? {
      etapa: t.etapa, area_ha: t.area_ha,
      clasificacion: t.clasificacion, minerales: t.mineralesTexto,
      modalidad: t.modalidad, centroid: t.centroid, polygon: t.polygon,
    } : {};
    await prisma.tituloMinero.upsert({
      where: { id: t.id }, update: { ...geo }, create: { ...base, ...geo },
    });
  }

  // ── 2. Admins demo ────────────────────────────────────────────
  console.log("  👤 Admins...");
  for (const u of [
    { id:"user-admin-001", nombre:"Carlos Martínez", email:"admin1@tumina.co" },
    { id:"user-admin-002", nombre:"Diana Herrera",   email:"admin2@tumina.co" },
    { id:"user-admin-003", nombre:"Fernando López",  email:"admin3@tumina.co" },
  ]) {
    await prisma.usuario.upsert({
      where: { email: u.email }, update: {},
      create: { ...u, password: pwd, rol: "ADMIN", activo: true },
    });
  }

  // ── 3. Asesores ───────────────────────────────────────────────
  console.log("  👤 Asesores...");
  for (const u of [
    { id:"user-asesor-001", nombre:"Paola Rincón",   email:"asesor1@tumina.co" },
    { id:"user-asesor-002", nombre:"Andrés Vargas",  email:"asesor2@tumina.co" },
    { id:"user-asesor-003", nombre:"Camila Torres",  email:"asesor3@tumina.co" },
    { id:"user-asesor-004", nombre:"Jhon Morales",   email:"asesor4@tumina.co" },
    { id:"user-asesor-005", nombre:"Valentina Cruz", email:"asesor5@tumina.co" },
  ]) {
    await prisma.usuario.upsert({
      where: { email: u.email }, update: {},
      create: { ...u, password: pwd, rol: "ASESOR", activo: true },
    });
  }

  // ── 4. Titulares ──────────────────────────────────────────────
  console.log("  👤 Titulares...");
  for (let i = 0; i < CONFIG.length; i++) {
    await prisma.usuario.upsert({
      where: { email: `titular${i+1}@tumina.co` }, update: {},
      create: {
        id: `user-titular-00${i+1}`,
        nombre: `Titular ${CONFIG[i].municipio}`,
        email: `titular${i+1}@tumina.co`,
        password: pwd, rol: "TITULAR", activo: true,
        tituloMineroId: TITULO_IDS[i],
      },
    });
  }

  // ── 5. Jefes de Planta ────────────────────────────────────────
  console.log("  👤 Jefes de Planta...");
  const JEFE_IDS = CONFIG.map((_, i) => `user-jefe-00${i+1}`);
  for (let i = 0; i < CONFIG.length; i++) {
    await prisma.usuario.upsert({
      where: { email: `jefe${i+1}@tumina.co` }, update: {},
      create: {
        id: JEFE_IDS[i],
        nombre: `Jefe Planta ${CONFIG[i].municipio}`,
        email: `jefe${i+1}@tumina.co`,
        password: pwd, rol: "JEFE_PLANTA", activo: true,
        tituloMineroId: TITULO_IDS[i],
      },
    });
  }

  // ── 6. Operarios ──────────────────────────────────────────────
  console.log("  👤 Operarios...");
  const OP_IDS = [];
  for (let t = 0; t < CONFIG.length; t++) {
    const ids = [];
    for (let o = 0; o < OPS_POR_TITULO[t]; o++) {
      const id = `user-op-t${t+1}-${String(o+1).padStart(2,"0")}`;
      ids.push(id);
      await prisma.usuario.upsert({
        where: { email: `op.t${t+1}.${o+1}@tumina.co` }, update: {},
        create: {
          id,
          nombre: `${NOMBRES_OP[o % NOMBRES_OP.length]} (T${t+1})`,
          email: `op.t${t+1}.${o+1}@tumina.co`,
          password: pwd, rol: "OPERARIO", activo: true,
          tituloMineroId: TITULO_IDS[t],
        },
      });
    }
    OP_IDS.push(ids);
  }

  // ── 7. Catálogos base ─────────────────────────────────────────
  console.log("  📚 Catálogos (motivos · items · maquinaria · clientes)...");

  for (const m of MOTIVOS_DEF) {
    await prisma.paradas_motivos.upsert({
      where: { codigo: m.codigo }, update: {},
      create: { codigo: m.codigo, nombre: m.nombre, activo: true },
    });
  }
  const MOTIVOS = await prisma.paradas_motivos.findMany({
    where: { codigo: { in: MOTIVOS_DEF.map(m => m.codigo) } },
  });

  for (const item of ITEMS_DEF) {
    try {
      await prisma.puntos_items_catalogo.upsert({
        where: { categoria_codigo: { categoria: item.categoria, codigo: item.codigo } },
        update: {}, create: { ...item, activo: true },
      });
    } catch (_) {}
  }
  const ITEMS_CAT = await prisma.puntos_items_catalogo.findMany();

  for (const m of MAQ_DEF) {
    try {
      await prisma.maquinaria_catalogo.upsert({
        where: { codigo: m.codigo }, update: {},
        create: { codigo: m.codigo, marca: m.marca, modelo: m.modelo, activo: true, orden: 0 },
      });
    } catch (_) {}
  }
  const MAQ_CAT = await prisma.maquinaria_catalogo.findMany();

  for (const c of CLIENTES_DEF) {
    try {
      await prisma.clientes_compradores.upsert({
        where: { cedula: c.cedula }, update: {},
        create: { ...c, updatedAt: new Date() },
      });
    } catch (_) {}
  }

  // ── 8. FRI — exactamente los campos del schema ────────────────
  console.log("  📋 Formularios FRI...");
  const tot = { prod:0,inv:0,par:0,eje:0,maq:0,reg:0,invMaq:0,cap:0,proy:0 };

  for (let t = 0; t < CONFIG.length; t++) {
    const cfg    = CONFIG[t];
    const jefeId = JEFE_IDS[t];

    for (const idxMes of cfg.mesesActivos) {
      const { año, mes, fechaCorte, estado } = PERIODOS[idxMes];

      for (const mineral of cfg.minerales) {
        const entraPlanta = rand(400, 1800, 4);

        // FRIProduccion
        await prisma.fRIProduccion.create({ data: {
          fechaCorte, mineral,
          horasOperativas    : rand(120, 240, 2),
          cantidadProduccion : rand(500, 2500, 4),
          unidadMedida       : "Toneladas",
          materialEntraPlanta: entraPlanta,
          materialSalePlanta : rand(300, Math.floor(entraPlanta), 4),
          masaUnitaria       : rand(1.2, 4.0, 4),
          estado, tituloMineroId: cfg.id, usuarioId: jefeId,
        }}); tot.prod++;

        // FRIInventarios
        const invIni  = rand(100, 500, 4);
        const ingreso = rand(200, 800, 4);
        const salida  = rand(100, Math.floor(invIni + ingreso), 4);
        await prisma.fRIInventarios.create({ data: {
          fechaCorte, mineral, unidadMedida: "Toneladas",
          inventarioInicialAcopio: invIni,
          ingresoAcopio          : ingreso,
          salidaAcopio           : salida,
          inventarioFinalAcopio  : parseFloat((invIni + ingreso - salida).toFixed(4)),
          estado, tituloMineroId: cfg.id, usuarioId: jefeId,
        }}); tot.inv++;

        // FRIEjecucion
        await prisma.fRIEjecucion.create({ data: {
          fechaCorte, mineral,
          denominacionFrente : `Frente ${pick(["Norte","Sur","Este","Oeste","Central"])}`,
          latitud            : cfg.lat,
          longitud           : cfg.lon,
          metodoExplotacion  : cfg.metodo,
          avanceEjecutado    : rand(10, 80, 2),
          unidadMedidaAvance : "Metros",
          volumenEjecutado   : rand(200, 2000, 4),
          estado, tituloMineroId: cfg.id, usuarioId: jefeId,
        }}); tot.eje++;

        // FRIRegalias — campos del schema actual:
        //   cantidadExtraida · unidadMedida · valorDeclaracion
        //   valorContraprestaciones · resolucionUPME
        await prisma.fRIRegalias.create({ data: {
          fechaCorte, mineral,
          cantidadExtraida        : rand(500, 2500, 4),
          unidadMedida            : "Toneladas",
          valorDeclaracion        : rand(5000000, 50000000, 2),
          valorContraprestaciones : rand(500000, 5000000, 2),
          resolucionUPME          : `UPME-${año}-${rand(100, 999)}`,
          estado, tituloMineroId: cfg.id, usuarioId: jefeId,
        }}); tot.reg++;
      }

      // FRIParadas (1 por mes)
      const inicioP = new Date(año, mes, rand(1, 20), rand(6, 14), 0, 0);
      const finP    = new Date(inicioP);
      finP.setHours(inicioP.getHours() + rand(2, 8));
      await prisma.fRIParadas.create({ data: {
        fechaCorte,
        tipoParada  : pick(["PROGRAMADA","NO_PROGRAMADA","MANTENIMIENTO"]),
        fechaInicio : inicioP,
        fechaFin    : finP,
        horasParadas: rand(2, 8, 2),
        motivo      : "Mantenimiento preventivo programado",
        estado, tituloMineroId: cfg.id, usuarioId: jefeId,
      }}); tot.par++;

      // FRIMaquinaria (1 por mes)
      await prisma.fRIMaquinaria.create({ data: {
        fechaCorte,
        tipoMaquinaria     : pick(TIPOS_MAQ),
        cantidad           : rand(1, 5),
        horasOperacion     : rand(100, 240, 2),
        capacidadTransporte: rand(10, 50, 2),
        unidadCapacidad    : "Toneladas",
        estado, tituloMineroId: cfg.id, usuarioId: jefeId,
      }}); tot.maq++;

      // FRIInventarioMaquinaria — campos exactos del schema:
      //   tipoMaquinaria · marca · modelo · a_oFabricacion (→ añoFabricacion en BD)
      //   capacidad · estadoOperativo
      await prisma.fRIInventarioMaquinaria.create({ data: {
        fechaCorte,
        tipoMaquinaria : pick(TIPOS_MAQ),
        marca          : pick(MARCAS_MAQ2),
        modelo         : `${rand(300, 500)}`,
        a_oFabricacion : rand(2010, 2022),
        capacidad      : rand(20, 80, 2),
        estadoOperativo: pick(ESTADOS_OP),
        estado, tituloMineroId: cfg.id, usuarioId: jefeId,
      }}); tot.invMaq++;

      // FRICapacidad — campos exactos del schema:
      //   areaProduccion · tecnologiaUtilizada · capacidadInstalada
      //   unidadMedida · personalCapacitado · certificaciones
      await prisma.fRICapacidad.create({ data: {
        fechaCorte,
        areaProduccion     : pick(AREAS_PROD),
        tecnologiaUtilizada: pick(TECNO_LISTA),
        capacidadInstalada : rand(1000, 5000, 4),
        unidadMedida       : "Toneladas/Mes",
        personalCapacitado : rand(5, 30),
        certificaciones    : `ISO-9001, NTC-${rand(1000, 9999)}`,
        estado, tituloMineroId: cfg.id, usuarioId: jefeId,
      }}); tot.cap++;

      // FRIProyecciones (1 por mes)
      await prisma.fRIProyecciones.create({ data: {
        fechaCorte,
        metodoExplotacion   : cfg.metodo,
        mineral             : cfg.minerales[0],
        capacidadExtraccion : rand(800, 3000, 4),
        capacidadTransporte : rand(600, 2500, 4),
        capacidadBeneficio  : rand(500, 2000, 4),
        cantidadProyectada  : rand(1000, 4000, 4),
        densidadManto       : rand(2.5, 4.5, 4),
        proyeccionTopografia: `Topografía ${cfg.municipio} ${mes+1}/${año}`,
        estado, tituloMineroId: cfg.id, usuarioId: jefeId,
      }}); tot.proy++;
    }
  }

  // ── 9. Puntos de actividad demo ───────────────────────────────
  console.log("  📍 Puntos de actividad demo (10-12/día/título)...");
  let totPuntos = 0;

  for (let t = 0; t < CONFIG.length; t++) {
    const cfg = CONFIG[t];
    const ops = OP_IDS[t];
    for (const idxMes of cfg.mesesActivos) {
      const { año, mes } = PERIODOS[idxMes];
      const dias = diasHabilesDelMes(año, mes, rand(12, 18));
      for (const dia of dias) {
        for (let p = 0; p < rand(10, 12); p++) {
          const opId  = ops[(dia + p) % ops.length];
          const fecha = new Date(año, mes, dia, rand(6, 17), rand(0, 59), 0);
          const item  = pick(ITEMS_CAT);
          const maq   = pick(MAQ_CAT);
          const cat   = item.categoria;
          const zona  = zonaPorCategoria(cfg, cat);
          await prisma.puntos_actividad.create({ data: {
            usuario_id       : opId,
            titulo_minero_id : cfg.id,
            latitud          : zona.lat,
            longitud         : zona.lon,
            categoria        : cat,
            item_id          : item.id,
            item_nombre      : item.nombre,
            maquinaria_id    : maq.id,
            maquinaria_nombre: `${maq.marca} ${maq.modelo}`,
            descripcion      : `${item.nombre} — ${cfg.municipio} ${dia}/${mes+1}/${año}`,
            volumen_m3       : rand(15, 250, 2),
            fecha,
            dia              : new Date(año, mes, dia),
          }});
          totPuntos++;
        }
      }
    }
  }

  // ── 10. Paradas de actividad demo ─────────────────────────────
  console.log("  ⏸️  Paradas de actividad demo...");
  let totParadas = 0;

  for (let t = 0; t < CONFIG.length; t++) {
    const cfg = CONFIG[t];
    const ops = OP_IDS[t];
    for (const idxMes of cfg.mesesActivos) {
      const { año, mes, estado } = PERIODOS[idxMes];
      for (let p = 0; p < rand(3, 5); p++) {
        const opId   = ops[p % ops.length];
        const hoy    = new Date();
        const tope   = año === hoy.getFullYear() && mes === hoy.getMonth() ? hoy.getDate() : 26;
        const diaP   = rand(1, tope);
        const inicio = new Date(año, mes, diaP, rand(6, 14), 0, 0);
        const fin    = new Date(inicio);
        fin.setMinutes(inicio.getMinutes() + rand(30, 300));
        const motivo = pick(MOTIVOS);
        await prisma.paradas_actividad.create({ data: {
          usuario_id      : opId,
          titulo_minero_id: cfg.id,
          motivo_id       : motivo.id,
          motivo_nombre   : motivo.nombre,
          inicio, fin,
          dia             : new Date(año, mes, diaP),
          observaciones   : `${motivo.nombre} — ${cfg.municipio}`,
          estado,
        }});
        totParadas++;
      }
    }
  }

  // ── 11. Certificados de origen demo ───────────────────────────
  console.log("  📜 Certificados de origen demo (90+)...");
  let certCont = 0;

  for (let t = 0; t < CONFIG.length; t++) {
    const cfg = CONFIG[t];
    for (const idxMes of cfg.mesesActivos) {
      const { año, mes } = PERIODOS[idxMes];
      for (let c = 0; c < rand(4, 6); c++) {
        certCont++;
        const mineral = pick(cfg.minerales);
        const cliente = CLIENTES_DEF[certCont % CLIENTES_DEF.length];
        const hoy     = new Date();
        const tope    = año === hoy.getFullYear() && mes === hoy.getMonth() ? hoy.getDate() : 27;
        await prisma.certificados_origen.create({ data: {
          id              : `cert-${String(certCont).padStart(4,"0")}`,
          tituloMineroId  : cfg.id,
          clienteId       : cliente.id,
          mineralExplotado: mineral,
          cantidadM3      : rand(30, 800, 4),
          unidadMedida    : "M3",
          fechaCertificado: new Date(año, mes, rand(1, tope)),
          usuarioId       : JEFE_IDS[t],
          consecutivo     : `${cfg.numeroTitulo}-${String(certCont).padStart(4,"0")}`,
        }});
      }
    }
  }

  // ── Resumen ───────────────────────────────────────────────────
  const totalOps = OPS_POR_TITULO.reduce((a, b) => a + b, 0);
  console.log("\n✅  Seed RESTO completado!");
  console.log("════════════════════════════════════════════════════════════");
  console.log(" RESUMEN — 5 títulos demo");
  console.log("════════════════════════════════════════════════════════════");
  CONFIG.forEach(c =>
    console.log(`   ${c.numeroTitulo.padEnd(10)} ${c.municipio.padEnd(12)} | ${c.minerales.join(", ").padEnd(26)} | ${c.mesesActivos.length} meses`)
  );
  console.log(`\n 👥 USUARIOS:`);
  console.log(`   Admins    : 3    admin1-3@tumina.co`);
  console.log(`   Asesores  : 5    asesor1-5@tumina.co`);
  console.log(`   Titulares : 5    titular1-5@tumina.co`);
  console.log(`   Jefes     : 5    jefe1-5@tumina.co`);
  console.log(`   Operarios : ${totalOps}    op.tX.Y@tumina.co`);
  console.log(`   TOTAL     : ${3+5+5+5+totalOps}`);
  console.log(`\n 📋 FRI por modelo:`);
  console.log(`   Producción       : ${tot.prod}`);
  console.log(`   Inventarios      : ${tot.inv}`);
  console.log(`   Ejecución        : ${tot.eje}`);
  console.log(`   Regalías         : ${tot.reg}`);
  console.log(`   Paradas FRI      : ${tot.par}`);
  console.log(`   Maquinaria       : ${tot.maq}`);
  console.log(`   Inv. Maquinaria  : ${tot.invMaq}`);
  console.log(`   Capacidad        : ${tot.cap}`);
  console.log(`   Proyecciones     : ${tot.proy}`);
  console.log(`\n 🗺️  OPERACIÓN:`);
  console.log(`   Puntos actividad : ~${totPuntos}  (10-12/día/título)`);
  console.log(`   Paradas actividad: ${totParadas}  (3-5/mes/título)`);
  console.log(`   Certificados     : ${certCont}  (4-6/mes/título · con consecutivo)`);
  console.log("────────────────────────────────────────────────────────────");
  console.log(" Contraseña: TuMina2024!");
  console.log("════════════════════════════════════════════════════════════\n");
}

main()
  .catch(e => { console.error("❌ Error en seed-resto:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());