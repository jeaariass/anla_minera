// ══════════════════════════════════════════════════════════════════
//  SEED — TU MINA  v2
//  · 5 títulos con 2-3 minerales cada uno
//  · Formularios FRI variados por título (no todos tienen el mismo nº)
//  · 90+ certificados de origen distribuidos en el tiempo
//  · 50+ puntos de actividad por día de operación
// ══════════════════════════════════════════════════════════════════
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ─── Utilidades ───────────────────────────────────────────────────
function rand(min, max, decimals = 0) {
  const v = Math.random() * (max - min) + min;
  return decimals > 0 ? parseFloat(v.toFixed(decimals)) : Math.round(v);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Genera días hábiles (lun-vie) dentro de un mes, cantidad aleatoria.
// Si es el mes actual, solo incluye hasta hoy (no días futuros).
function diasHabilesDelMes(año, mes, cantidad) {
  const hoy = new Date();
  const esActual = año === hoy.getFullYear() && mes === hoy.getMonth();
  const diasEnMes = new Date(año, mes + 1, 0).getDate();
  const tope = esActual ? hoy.getDate() : diasEnMes; // no generar días futuros
  const candidatos = [];
  for (let d = 1; d <= tope; d++) {
    const dow = new Date(año, mes, d).getDay();
    if (dow !== 0 && dow !== 6) candidatos.push(d);
  }
  // Si hay menos días disponibles que la cantidad pedida, usar todos
  const n = Math.min(cantidad, candidatos.length);
  for (let i = candidatos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
  }
  return candidatos.slice(0, n).sort((a, b) => a - b);
}

// ─── Períodos — últimos 5 meses dinámicos desde hoy ──────────────
function generarPeriodos() {
  const hoy = new Date();
  const periodos = [];

  for (let i = 4; i >= 0; i--) {
    // mes relativo: i=4 → hace 4 meses, i=0 → mes actual
    const ref = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const año = ref.getFullYear();
    const mes = ref.getMonth(); // 0-based

    // Último día del mes
    const ultimoDia = new Date(año, mes + 1, 0);

    // El mes actual: fechaCorte = hoy, estado BORRADOR
    // Meses anteriores: fechaCorte = último día del mes, estado ENVIADO
    const esActual = i === 0;
    const fechaCorte = esActual
      ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 0)
      : new Date(año, mes + 1, 0, 23, 59, 0);

    periodos.push({
      año,
      mes,
      fechaCorte,
      ultimoDia: ultimoDia.getDate(),
      estado: esActual ? "BORRADOR" : "ENVIADO",
    });
  }
  return periodos;
}

const PERIODOS = generarPeriodos();

// ─── IDs fijos ────────────────────────────────────────────────────
const TITULO_IDS = [
  "titulo-ggb-091",
  "titulo-ihg-152",
  "titulo-kja-222",
  "titulo-lgd-314",
  "titulo-mng-445",
  "titulo-816-17",
];

// ─── Configuración por título ─────────────────────────────────────
// mesesActivos: índices de PERIODOS en los que operó (variados por título)
const CONFIG_TITULOS = [
  {
    id: TITULO_IDS[0],
    numeroTitulo: "GGB-091",
    municipio: "Segovia",
    departamento: "Antioquia",
    codigoMunicipio: "05736",
    nit: "900123456-1",
    nombreTitular: "Minera Segovia S.A.S",
    cedulaTitular: "900123456",
    lat: 7.0822,
    lon: -74.7025,
    minerales: ["Oro", "Plata"],
    mesesActivos: [0, 1, 2, 3, 4],
    metodo: "Subterráneo",
    // ── Geodatos ──
    etapa: "Explotación",
    area_ha: 85.32,
    clasificacion: "Mediana Minería",
    mineralesTexto: "Oro, Plata",
    modalidad: "Contrato de Concesión (L 685)",
    centroid: [7.0822, -74.7025],
    polygon: [
      [-74.69512, 7.08901],
      [-74.70841, 7.08897],
      [-74.70855, 7.07601],
      [-74.70102, 7.07598],
      [-74.70098, 7.08201],
      [-74.69508, 7.08198],
      [-74.69512, 7.08901],
    ],
  },
  {
    id: TITULO_IDS[1],
    numeroTitulo: "IHG-152",
    municipio: "Marmato",
    departamento: "Caldas",
    codigoMunicipio: "17442",
    nit: "900234567-2",
    nombreTitular: "Oro Marmato Ltda",
    cedulaTitular: "900234567",
    lat: 5.4724,
    lon: -75.606,
    minerales: ["Oro", "Plata", "Cobre"],
    mesesActivos: [0, 1, 2, 3, 4],
    metodo: "Subterráneo",
    // ── Geodatos ──
    etapa: "Explotación",
    area_ha: 64.85,
    clasificacion: "Pequeña Minería",
    mineralesTexto: "Oro, Plata, Cobre",
    modalidad: "Contrato de Concesión (L 685)",
    centroid: [5.4724, -75.606],
    polygon: [
      [-75.59812, 5.48101],
      [-75.61204, 5.48095],
      [-75.61218, 5.46398],
      [-75.60541, 5.46391],
      [-75.60535, 5.47201],
      [-75.59806, 5.47195],
      [-75.59812, 5.48101],
    ],
  },
  {
    id: TITULO_IDS[2],
    numeroTitulo: "KJA-222",
    municipio: "El Bagre",
    departamento: "Antioquia",
    codigoMunicipio: "05250",
    nit: "900345678-3",
    nombreTitular: "Extracción El Bagre S.A.",
    cedulaTitular: "900345678",
    lat: 7.5866,
    lon: -74.8115,
    minerales: ["Oro", "Platino"],
    mesesActivos: [0, 1, 2, 3], // 4 meses (no marzo)
    metodo: "Aluvial",
  },
  {
    id: TITULO_IDS[3],
    numeroTitulo: "LGD-314",
    municipio: "Quinchía",
    departamento: "Risaralda",
    codigoMunicipio: "66594",
    nit: "900456789-4",
    nombreTitular: "Mineros Quinchía S.A.S",
    cedulaTitular: "900456789",
    lat: 5.3377,
    lon: -75.7218,
    minerales: ["Carbón", "Cobre"],
    mesesActivos: [1, 2, 3, 4], // arrancó en diciembre
    metodo: "Cielo Abierto",
  },
  {
    id: TITULO_IDS[4],
    numeroTitulo: "MNG-445",
    municipio: "Buriticá",
    departamento: "Antioquia",
    codigoMunicipio: "05113",
    nit: "900567890-5",
    nombreTitular: "Buriticá Gold Corp",
    cedulaTitular: "900567890",
    lat: 6.7257,
    lon: -75.9341,
    minerales: ["Oro", "Plata", "Níquel"],
    mesesActivos: [2, 3, 4], // operación nueva, 3 meses
    metodo: "Cielo Abierto",
  },
  {
    id: "titulo-816-17",
    numeroTitulo: "816-17",
    municipio: "Viterbo",
    departamento: "Caldas",
    codigoMunicipio: "17877",
    nit: null,
    nombreTitular: "ALVARO GOMEZ BOTERO",
    cedulaTitular: null,
    lat: 5.0646,
    lon: -75.8839,
    minerales: ["Arenas", "Gravas"],
    mesesActivos: [0, 1, 2, 3, 4],
    metodo: "Aluvial",
    fechaInicio: new Date("2006-11-08T00:00:00Z"),
    fechaVencimiento: new Date("2036-11-07T00:00:00Z"),
    observaciones: "Título minero de prueba para desarrollo",
    createdAt: new Date("2025-11-19T22:58:05.326Z"),
    // ── Geodatos ──
    etapa: "Explotación",
    area_ha: 123.5147,
    clasificacion: "Mediana Minería",
    mineralesTexto: "Arenas, Gravas",
    modalidad: "Contrato de Concesión (L 685)",
    centroid: [5.07804, -75.85707],
    polygon: [
      [-75.851064, 5.086797],
      [-75.863123, 5.086754],
      [-75.863166, 5.069356],
      [-75.858317, 5.069313],
      [-75.858274, 5.07953],
      [-75.850936, 5.086455],
      [-75.851064, 5.086797],
    ],
  },
];

// ─── Zonas geográficas fijas por categoría ───────────────────────
// Cada título tiene 3 zonas con centro fijo y scatter pequeño (~150m)
// Los offsets se calculan sobre la lat/lon base del título.
// extraccion  → zona norte  (+0.012 lat)
// acopio      → zona este   (+0.015 lon)
// procesamiento → zona sur  (-0.010 lat, +0.005 lon)
// Scatter dentro de la zona: ±0.0015 (≈ 150m) → puntos muy agrupados
function zonaPorCategoria(cfg, categoria) {
  const OFFSETS = {
    extraccion: { dLat: 0.012, dLon: 0.0, scatter: 0.0015 },
    acopio: { dLat: 0.002, dLon: 0.015, scatter: 0.0015 },
    procesamiento: { dLat: -0.01, dLon: 0.005, scatter: 0.0012 },
  };
  const z = OFFSETS[categoria] || { dLat: 0, dLon: 0, scatter: 0.002 };
  const noise = () => (Math.random() - 0.5) * 2 * z.scatter;
  return {
    lat: parseFloat((cfg.lat + z.dLat + noise()).toFixed(8)),
    lon: parseFloat((cfg.lon + z.dLon + noise()).toFixed(8)),
  };
}

const TIPOS_PARADA = ["PROGRAMADA", "NO_PROGRAMADA", "MANTENIMIENTO"];
const TIPOS_MAQ = [
  "Excavadora",
  "Volqueta",
  "Perforadora",
  "Cargador",
  "Motoniveladora",
];
const FRENTES = ["Norte", "Sur", "Este", "Oeste", "Central"];
const AREAS_PROD = [
  "Zona de Explotación A",
  "Zona de Explotación B",
  "Galería Principal",
];
const CATEGORIAS_PA = ["extraccion", "acopio", "procesamiento"]; // 3 cats que usa el dashboard

const OPS_POR_TITULO = [10, 12, 11, 13, 15, 11]; // 6 títulos
const NOMBRES_OP = [
  "Juan Pérez",
  "Luis Gómez",
  "Pedro Ramírez",
  "Marcos Silva",
  "Oscar Díaz",
  "Rodrigo Muñoz",
  "Sebastián Castro",
  "Alejandro Ríos",
  "Daniel Suárez",
  "Héctor Ortiz",
  "Miguel Pinto",
  "David Torres",
  "Jorge Vega",
  "Andrés León",
  "Felipe Mora",
];

const MOTIVOS_DEF = [
  { codigo: "MANTENIMIENTO", nombre: "Mantenimiento" },
  { codigo: "LUZ", nombre: "Se fue la luz" },
  { codigo: "AGUA", nombre: "Sin agua" },
  { codigo: "CORREA", nombre: "Se salió la correa" },
  { codigo: "ALIMENTACION", nombre: "Sin alimentación" },
  { codigo: "ATASCAMIENTO", nombre: "Atascamiento Alimentador" },
  { codigo: "PIEDRA_GAVIAN", nombre: "Se llenó de piedra Gavián" },
  { codigo: "LLUVIA", nombre: "Lluvia intensa" },
  { codigo: "ACCIDENTE", nombre: "Accidente / Incidente" },
  { codigo: "OTRO", nombre: "Otro" },
];

const MAQ_DEF = [
  { codigo: "CAT-336", marca: "Caterpillar", modelo: "336" },
  { codigo: "KOMA-PC200", marca: "Komatsu", modelo: "PC200" },
  { codigo: "VOLVO-A40", marca: "Volvo", modelo: "A40G" },
  { codigo: "CAT-777", marca: "Caterpillar", modelo: "777G" },
  { codigo: "BELL-B40", marca: "Bell", modelo: "B40E" },
  { codigo: "SAND-DD422", marca: "Sandvik", modelo: "DD422i" },
];

const ITEMS_DEF = [
  { categoria: "extraccion", codigo: "EXT_001", nombre: "Frente de Arranque" },
  { categoria: "extraccion", codigo: "EXT_002", nombre: "Zona de Cargue" },
  { categoria: "acopio", codigo: "ACO_001", nombre: "Punto de Acopio" },
  { categoria: "acopio", codigo: "ACO_002", nombre: "Patio de Almacenamiento" },
  {
    categoria: "procesamiento",
    codigo: "PRO_001",
    nombre: "Planta de Beneficio",
  },
  {
    categoria: "procesamiento",
    codigo: "PRO_002",
    nombre: "Piscina de Sedimentación",
  },
  {
    categoria: "procesamiento",
    codigo: "PRO_003",
    nombre: "Tolva de Alimentación",
  },
];

const CLIENTES_DEF = [
  { id: "cliente-001", cedula: "12345678", nombre: "Metales del Norte S.A.S" },
  {
    id: "cliente-002",
    cedula: "87654321",
    nombre: "Comercializadora Aurífera Ltda",
  },
  { id: "cliente-003", cedula: "11223344", nombre: "Gold Trading Colombia" },
  { id: "cliente-004", cedula: "55667788", nombre: "Minerales y Metales S.A" },
  { id: "cliente-005", cedula: "99001122", nombre: "Exportadora Mineral SAS" },
  {
    id: "cliente-006",
    cedula: "22334455",
    nombre: "Inversiones Mineras del Caribe",
  },
  { id: "cliente-007", cedula: "66778899", nombre: "Precious Metals Colombia" },
  { id: "cliente-008", cedula: "33445566", nombre: "Minerales Andinos Ltda" },
  {
    id: "cliente-009",
    cedula: "77889900",
    nombre: "Grupo Extractivo del Pacífico",
  },
  {
    id: "cliente-010",
    cedula: "44556677",
    nombre: "Compañía Aurífera Central S.A",
  },
];

// ══════════════════════════════════════════════════════════════════
async function main() {
  console.log("\n🌱  Iniciando seed de TuMina v2...\n");
  const pwd = await bcrypt.hash("TuMina2024!", 10);

  // ── 1. Títulos Mineros ─────────────────────────────────────────
  console.log("  📍 Títulos mineros...");
  for (const t of CONFIG_TITULOS) {
    // Datos base que siempre se incluyen
    const dataBase = {
      id: t.id,
      numeroTitulo: t.numeroTitulo,
      municipio: t.municipio,
      departamento: t.departamento,
      codigoMunicipio: t.codigoMunicipio,
      nit: t.nit || null,
      nombreTitular: t.nombreTitular || null,
      cedulaTitular: t.cedulaTitular || null,
      estado: "ACTIVO",
      observaciones: t.observaciones || null,
      fechaInicio: t.fechaInicio ?? new Date("2020-01-15"),
      fechaVencimiento: t.fechaVencimiento ?? new Date("2030-01-15"),
    };

    // Geodatos — solo se incluyen si el título los tiene definidos
    const dataGeo = t.centroid
      ? {
          etapa: t.etapa || null,
          area_ha: t.area_ha || null,
          clasificacion: t.clasificacion || null,
          minerales: t.mineralesTexto || null,
          modalidad: t.modalidad || null,
          centroid: t.centroid,
          polygon: t.polygon,
        }
      : {};

    await prisma.tituloMinero.upsert({
      where: { id: t.id },
      update: { ...dataGeo }, // si ya existe, actualiza solo los geodatos
      create: { ...dataBase, ...dataGeo }, // si es nuevo, crea con todo
    });
  }

  // ── 2. Admins ──────────────────────────────────────────────────
  console.log("  👤 Administradores...");
  for (const u of [
    {
      id: "user-admin-001",
      nombre: "Carlos Martínez",
      email: "admin1@tumina.co",
    },
    {
      id: "user-admin-002",
      nombre: "Diana Herrera",
      email: "admin2@tumina.co",
    },
    {
      id: "user-admin-003",
      nombre: "Fernando López",
      email: "admin3@tumina.co",
    },
  ]) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: pwd, rol: "ADMIN", activo: true },
    });
  }

  // ── 3. Asesores ────────────────────────────────────────────────
  console.log("  👤 Asesores...");
  for (const u of [
    {
      id: "user-asesor-001",
      nombre: "Paola Rincón",
      email: "asesor1@tumina.co",
    },
    {
      id: "user-asesor-002",
      nombre: "Andrés Vargas",
      email: "asesor2@tumina.co",
    },
    {
      id: "user-asesor-003",
      nombre: "Camila Torres",
      email: "asesor3@tumina.co",
    },
    {
      id: "user-asesor-004",
      nombre: "Jhon Morales",
      email: "asesor4@tumina.co",
    },
    {
      id: "user-asesor-005",
      nombre: "Valentina Cruz",
      email: "asesor5@tumina.co",
    },
  ]) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: pwd, rol: "ASESOR", activo: true },
    });
  }

  // ── 4. Titulares ───────────────────────────────────────────────
  console.log("  👤 Titulares...");
  for (let i = 0; i < CONFIG_TITULOS.length; i++) {
    await prisma.usuario.upsert({
      where: { email: `titular${i + 1}@tumina.co` },
      update: {},
      create: {
        id: `user-titular-00${i + 1}`,
        nombre: `Titular ${CONFIG_TITULOS[i].municipio}`,
        email: `titular${i + 1}@tumina.co`,
        password: pwd,
        rol: "TITULAR",
        activo: true,
        tituloMineroId: TITULO_IDS[i],
      },
    });
  }

  // ── 5. Jefes de Planta ─────────────────────────────────────────
  console.log("  👤 Jefes de planta...");
  const JEFE_IDS = CONFIG_TITULOS.map((_, i) => `user-jefe-00${i + 1}`);
  for (let i = 0; i < CONFIG_TITULOS.length; i++) {
    await prisma.usuario.upsert({
      where: { email: `jefe${i + 1}@tumina.co` },
      update: {},
      create: {
        id: JEFE_IDS[i],
        nombre: `Jefe Planta ${CONFIG_TITULOS[i].municipio}`,
        email: `jefe${i + 1}@tumina.co`,
        password: pwd,
        rol: "JEFE_PLANTA",
        activo: true,
        tituloMineroId: TITULO_IDS[i],
      },
    });
  }

  // ── 6. Operarios ───────────────────────────────────────────────
  console.log("  👤 Operarios...");
  const OP_IDS_POR_TITULO = [];
  for (let t = 0; t < CONFIG_TITULOS.length; t++) {
    const ids = [];
    for (let o = 0; o < OPS_POR_TITULO[t]; o++) {
      const id = `user-op-t${t + 1}-${String(o + 1).padStart(2, "0")}`;
      ids.push(id);
      await prisma.usuario.upsert({
        where: { email: `op.t${t + 1}.${o + 1}@tumina.co` },
        update: {},
        create: {
          id,
          nombre: `${NOMBRES_OP[o % NOMBRES_OP.length]} (T${t + 1})`,
          email: `op.t${t + 1}.${o + 1}@tumina.co`,
          password: pwd,
          rol: "OPERARIO",
          activo: true,
          tituloMineroId: TITULO_IDS[t],
        },
      });
    }
    OP_IDS_POR_TITULO.push(ids);
  }

  // ── 7. Catálogos ───────────────────────────────────────────────
  console.log("  📚 Catálogos...");

  for (const m of MOTIVOS_DEF) {
    await prisma.paradas_motivos.upsert({
      where: { codigo: m.codigo },
      update: {},
      create: { codigo: m.codigo, nombre: m.nombre, activo: true },
    });
  }
  const MOTIVOS = await prisma.paradas_motivos.findMany({
    where: { codigo: { in: MOTIVOS_DEF.map((m) => m.codigo) } },
  });

  for (const item of ITEMS_DEF) {
    try {
      await prisma.puntos_items_catalogo.upsert({
        where: {
          categoria_codigo: { categoria: item.categoria, codigo: item.codigo },
        },
        update: {},
        create: { ...item, activo: true, orden: 0 },
      });
    } catch (_) {}
  }
  const ITEMS_CAT = await prisma.puntos_items_catalogo.findMany();

  for (const m of MAQ_DEF) {
    try {
      await prisma.maquinaria_catalogo.upsert({
        where: { codigo: m.codigo },
        update: {},
        create: {
          codigo: m.codigo,
          marca: m.marca,
          modelo: m.modelo,
          activo: true,
          orden: 0,
        },
      });
    } catch (_) {}
  }
  const MAQ_CAT = await prisma.maquinaria_catalogo.findMany();

  for (const c of CLIENTES_DEF) {
    try {
      await prisma.clientes_compradores.upsert({
        where: { cedula: c.cedula },
        update: {},
        create: { ...c, updatedAt: new Date() },
      });
    } catch (_) {}
  }

  // ── 8. FRI — varía por título (1 FRI por mineral por mes activo) ─
  console.log("  📋 Formularios FRI (1 por mineral × mes activo)...");
  const totalFRI = {
    produccion: 0,
    inventarios: 0,
    paradas: 0,
    ejecucion: 0,
    maquinaria: 0,
    regalias: 0,
    invMaq: 0,
    capacidad: 0,
    proyecciones: 0,
  };

  for (let t = 0; t < CONFIG_TITULOS.length; t++) {
    const cfg = CONFIG_TITULOS[t];
    const jefeId = JEFE_IDS[t];

    for (const idxMes of cfg.mesesActivos) {
      const { año, mes, fechaCorte, estado } = PERIODOS[idxMes];

      // Por cada mineral → Producción, Inventarios, Ejecución, Regalías
      for (const mineral of cfg.minerales) {
        const entraPlanta = rand(400, 1800, 4);
        await prisma.fRIProduccion.create({
          data: {
            fechaCorte,
            mineral,
            horasOperativas: rand(120, 240, 2),
            cantidadProduccion: rand(500, 2500, 4),
            unidadMedida: "Toneladas",
            materialEntraPlanta: entraPlanta,
            materialSalePlanta: rand(300, Math.floor(entraPlanta), 4),
            masaUnitaria: rand(1.2, 4.0, 4),
            estado,
            tituloMineroId: cfg.id,
            usuarioId: jefeId,
          },
        });
        totalFRI.produccion++;

        const invInicial = rand(100, 500, 4);
        const ingreso = rand(200, 800, 4);
        const salida = rand(100, Math.floor(invInicial + ingreso), 4);
        await prisma.fRIInventarios.create({
          data: {
            fechaCorte,
            mineral,
            unidadMedida: "Toneladas",
            inventarioInicialAcopio: invInicial,
            ingresoAcopio: ingreso,
            salidaAcopio: salida,
            inventarioFinalAcopio: parseFloat(
              (invInicial + ingreso - salida).toFixed(4),
            ),
            estado,
            tituloMineroId: cfg.id,
            usuarioId: jefeId,
          },
        });
        totalFRI.inventarios++;

        await prisma.fRIEjecucion.create({
          data: {
            fechaCorte,
            mineral,
            denominacionFrente: `Frente ${pick(FRENTES)} - ${mineral}`,
            latitud: parseFloat(
              (cfg.lat + (Math.random() - 0.5) * 0.005).toFixed(8),
            ),
            longitud: parseFloat(
              (cfg.lon + (Math.random() - 0.5) * 0.005).toFixed(8),
            ),
            metodoExplotacion: cfg.metodo,
            avanceEjecutado: rand(10, 90, 2),
            unidadMedidaAvance: "Metros",
            volumenEjecutado: rand(200, 1500, 4),
            estado,
            tituloMineroId: cfg.id,
            usuarioId: jefeId,
          },
        });
        totalFRI.ejecucion++;

        await prisma.fRIRegalias.create({
          data: {
            fechaCorte,
            mineral,
            cantidadExtraida: rand(400, 2000, 4),
            unidadMedida: "Toneladas",
            valorDeclaracion: rand(50_000_000, 250_000_000, 2),
            valorContraprestaciones: rand(5_000_000, 25_000_000, 2),
            resolucionUPME: `UPME-${año}-T${t + 1}-${mineral.substring(0, 3).toUpperCase()}`,
            estado,
            tituloMineroId: cfg.id,
            usuarioId: jefeId,
          },
        });
        totalFRI.regalias++;
      }

      // Uno por mes (independiente del mineral)
      const diaP = new Date(año, mes, 5, 8, 0, 0);
      const finP = new Date(diaP);
      finP.setHours(diaP.getHours() + rand(4, 16));
      await prisma.fRIParadas.create({
        data: {
          fechaCorte,
          tipoParada: pick(TIPOS_PARADA),
          fechaInicio: diaP,
          fechaFin: finP,
          horasParadas: rand(4, 24, 2),
          motivo: pick(MOTIVOS_DEF).nombre,
          estado,
          tituloMineroId: cfg.id,
          usuarioId: jefeId,
        },
      });
      totalFRI.paradas++;

      await prisma.fRIMaquinaria.create({
        data: {
          fechaCorte,
          tipoMaquinaria: pick(TIPOS_MAQ),
          cantidad: rand(2, 8),
          horasOperacion: rand(80, 220, 2),
          capacidadTransporte: rand(15, 50, 2),
          unidadCapacidad: "Toneladas",
          estado,
          tituloMineroId: cfg.id,
          usuarioId: jefeId,
        },
      });
      totalFRI.maquinaria++;

      await prisma.fRIInventarioMaquinaria.create({
        data: {
          fechaCorte,
          tipoMaquinaria: pick(TIPOS_MAQ),
          marca: pick(MAQ_DEF).marca,
          modelo: pick(MAQ_DEF).modelo,
          a_oFabricacion: rand(2015, 2023),
          capacidad: rand(20, 60, 2),
          estadoOperativo: pick(["OPERATIVO", "EN_MANTENIMIENTO", "OPERATIVO"]),
          estado,
          tituloMineroId: cfg.id,
          usuarioId: jefeId,
        },
      });
      totalFRI.invMaq++;

      await prisma.fRICapacidad.create({
        data: {
          fechaCorte,
          areaProduccion: pick(AREAS_PROD),
          tecnologiaUtilizada: cfg.metodo,
          capacidadInstalada: rand(1000, 5000, 4),
          unidadMedida: "Toneladas/Mes",
          personalCapacitado: rand(5, 30),
          certificaciones: `ISO-9001, NTC-${rand(1000, 9999)}`,
          estado,
          tituloMineroId: cfg.id,
          usuarioId: jefeId,
        },
      });
      totalFRI.capacidad++;

      await prisma.fRIProyecciones.create({
        data: {
          fechaCorte,
          metodoExplotacion: cfg.metodo,
          mineral: cfg.minerales[0],
          capacidadExtraccion: rand(800, 3000, 4),
          capacidadTransporte: rand(600, 2500, 4),
          capacidadBeneficio: rand(500, 2000, 4),
          cantidadProyectada: rand(1000, 4000, 4),
          densidadManto: rand(2.5, 4.5, 4),
          proyeccionTopografia: `Topografía ${cfg.municipio} ${mes + 1}/${año}`,
          estado,
          tituloMineroId: cfg.id,
          usuarioId: jefeId,
        },
      });
      totalFRI.proyecciones++;
    }
  }

  // ── 9. Puntos de actividad — 50+ por día de operación ─────────
  // Estrategia: 12-18 días hábiles por mes × 10-12 puntos/día/título
  // Con 5 títulos activos al mismo tiempo = 50-60 puntos ese día en total
  console.log("  📍 Puntos de actividad (10-12 por día por título)...");
  let totalPuntos = 0;

  for (let t = 0; t < CONFIG_TITULOS.length; t++) {
    const cfg = CONFIG_TITULOS[t];
    const ops = OP_IDS_POR_TITULO[t];

    for (const idxMes of cfg.mesesActivos) {
      const { año, mes } = PERIODOS[idxMes];
      const diasOp = diasHabilesDelMes(año, mes, rand(12, 18));

      for (const dia of diasOp) {
        // 10-12 puntos por título por día → con 5 títulos = 50-60 por día total
        const puntosHoy = rand(10, 12);

        for (let p = 0; p < puntosHoy; p++) {
          const opId = ops[(dia + p) % ops.length];
          const fecha = new Date(año, mes, dia, rand(6, 17), rand(0, 59), 0);
          const item = pick(ITEMS_CAT);
          const maq = pick(MAQ_CAT);
          const cat = item.categoria;

          const zona = zonaPorCategoria(cfg, cat);
          await prisma.puntos_actividad.create({
            data: {
              usuario_id: opId,
              titulo_minero_id: cfg.id,
              latitud: zona.lat,
              longitud: zona.lon,
              categoria: cat,
              item_id: item.id,
              item_nombre: item.nombre,
              maquinaria_id: maq.id,
              maquinaria_nombre: `${maq.marca} ${maq.modelo}`,
              descripcion: `${item.nombre} — ${cfg.municipio} ${dia}/${mes + 1}/${año}`,
              volumen_m3: rand(15, 250, 2),
              fecha,
              dia: new Date(año, mes, dia),
            },
          });
          totalPuntos++;
        }
      }
    }
  }

  // ── 10. Paradas de actividad — 3-5 por mes por título ─────────
  console.log("  ⏸️  Paradas de actividad...");
  let totalParadasAct = 0;

  for (let t = 0; t < CONFIG_TITULOS.length; t++) {
    const cfg = CONFIG_TITULOS[t];
    const ops = OP_IDS_POR_TITULO[t];

    for (const idxMes of cfg.mesesActivos) {
      const { año, mes, estado } = PERIODOS[idxMes];
      const nParadas = rand(3, 5);

      for (let p = 0; p < nParadas; p++) {
        const opId = ops[p % ops.length];
        const hoyRef = new Date();
        const topeP =
          año === hoyRef.getFullYear() && mes === hoyRef.getMonth()
            ? hoyRef.getDate()
            : 26;
        const dia = rand(1, topeP);
        const inicio = new Date(año, mes, dia, rand(6, 14), 0, 0);
        const fin = new Date(inicio);
        fin.setMinutes(inicio.getMinutes() + rand(30, 300));
        const motivo = pick(MOTIVOS);

        await prisma.paradas_actividad.create({
          data: {
            usuario_id: opId,
            titulo_minero_id: cfg.id,
            motivo_id: motivo.id,
            motivo_nombre: motivo.nombre,
            inicio,
            fin,
            dia: new Date(año, mes, dia),
            observaciones: `${motivo.nombre} — ${cfg.municipio}`,
            estado,
          },
        });
        totalParadasAct++;
      }
    }
  }

  // ── 11. Certificados de origen — 90+ bien distribuidos ────────
  // 3-5 certs por título por mes activo × varios minerales y clientes
  console.log("  📜 Certificados de origen (90+)...");
  let certContador = 0;

  for (let t = 0; t < CONFIG_TITULOS.length; t++) {
    const cfg = CONFIG_TITULOS[t];

    for (const idxMes of cfg.mesesActivos) {
      const { año, mes } = PERIODOS[idxMes];
      const nCerts = rand(4, 6); // 4-6 por mes → mínimo 4×4=16 por título con 4 meses

      for (let c = 0; c < nCerts; c++) {
        certContador++;
        const mineral = pick(cfg.minerales);
        const cliente = CLIENTES_DEF[certContador % CLIENTES_DEF.length];
        const hoyRef2 = new Date();
        const topeC =
          año === hoyRef2.getFullYear() && mes === hoyRef2.getMonth()
            ? hoyRef2.getDate()
            : 27;
        const dia = rand(1, topeC);

        await prisma.certificados_origen.create({
          data: {
            id: `cert-${String(certContador).padStart(4, "0")}`,
            tituloMineroId: cfg.id,
            clienteId: cliente.id,
            mineralExplotado: mineral,
            cantidadM3: rand(30, 800, 4),
            unidadMedida: "M3",
            fechaCertificado: new Date(año, mes, dia),
            usuarioId: JEFE_IDS[t],
          },
        });
      }
    }
  }

  // ── Resumen ────────────────────────────────────────────────────
  const totalOps = OPS_POR_TITULO.reduce((a, b) => a + b, 0);
  console.log("\n✅  Seed v2 completado!\n");
  console.log("════════════════════════════════════════════════════════════");
  console.log(" RESUMEN DE DATOS GENERADOS");
  console.log("════════════════════════════════════════════════════════════");

  console.log("\n 📌 TÍTULOS Y MINERALES:");
  CONFIG_TITULOS.forEach((c) => {
    console.log(
      `   ${c.numeroTitulo.padEnd(10)} ${c.municipio.padEnd(12)} | ${c.minerales.join(", ").padEnd(25)} | ${c.mesesActivos.length} meses`,
    );
  });

  console.log("\n 👥 USUARIOS:");
  console.log(`   Administradores : 3`);
  console.log(`   Asesores        : 5`);
  console.log(`   Titulares       : 5`);
  console.log(`   Jefes de Planta : 5`);
  console.log(
    `   Operarios       : ${totalOps}  (${OPS_POR_TITULO.join(" / ")} por título)`,
  );
  console.log(`   TOTAL           : ${3 + 5 + 5 + 5 + totalOps}`);

  const totalMineralMes = CONFIG_TITULOS.reduce(
    (acc, c) => acc + c.mesesActivos.length * c.minerales.length,
    0,
  );
  const totalMes = CONFIG_TITULOS.reduce(
    (acc, c) => acc + c.mesesActivos.length,
    0,
  );
  console.log("\n 📋 FORMULARIOS FRI:");
  console.log(
    `   Producción      : ${totalFRI.produccion}  (1 por mineral × mes activo)`,
  );
  console.log(`   Inventarios     : ${totalFRI.inventarios}`);
  console.log(`   Ejecución       : ${totalFRI.ejecucion}`);
  console.log(`   Regalías        : ${totalFRI.regalias}`);
  console.log(`   Paradas FRI     : ${totalFRI.paradas}  (1 por mes activo)`);
  console.log(`   Maquinaria      : ${totalFRI.maquinaria}`);
  console.log(`   Inv. Maquinaria : ${totalFRI.invMaq}`);
  console.log(`   Capacidad       : ${totalFRI.capacidad}`);
  console.log(`   Proyecciones    : ${totalFRI.proyecciones}`);

  console.log("\n 🗺️  OPERACIÓN:");
  console.log(
    `   Puntos actividad  : ~${totalPuntos}  (10-12/día/título → 50-60 por día en total)`,
  );
  console.log(
    `   Paradas actividad : ${totalParadasAct}  (3-5 por mes por título)`,
  );
  console.log(
    `   Certificados      : ${certContador}  (4-6 por mes por título, multi-mineral y cliente)`,
  );

  console.log("\n════════════════════════════════════════════════════════════");
  console.log(" CREDENCIALES — Password: TuMina2024!");
  console.log("────────────────────────────────────────────────────────────");
  console.log(" ADMIN    : admin1@tumina.co      (admin2, admin3)");
  console.log(" ASESOR   : asesor1@tumina.co     (asesor2 … asesor5)");
  console.log(" TITULAR  : titular1@tumina.co    (titular2 … titular5)");
  console.log(" JEFE     : jefe1@tumina.co       (jefe2 … jefe5)");
  console.log(" OPERARIO : op.t1.1@tumina.co     (op.tX.Y — hasta op.t5.15)");
  console.log("════════════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
