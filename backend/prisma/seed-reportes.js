// ╔══════════════════════════════════════════════════════════════╗
// ║  seed-reportes-200.js — TU MINA / ANM-FRI                  ║
// ║  Genera ~200 registros FRI aleatorios para pruebas de       ║
// ║  filtros, exportación y vista previa en módulo Reportes.    ║
// ║                                                              ║
// ║  USO:                                                        ║
// ║    node backend/prisma/seed-reportes-200.js                 ║
// ║    node backend/prisma/seed-reportes-200.js --limpiar       ║
// ║                                                              ║
// ║  IMPORTANTE: NO crea nuevos usuarios ni títulos mineros.    ║
// ║  Lee los existentes de la BD y distribuye los registros     ║
// ║  entre todos ellos de forma aleatoria y equitativa.         ║
// ╚══════════════════════════════════════════════════════════════╝

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Helpers de aleatoriedad ───────────────────────────────────
const rand    = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick    = (arr)      => arr[Math.floor(Math.random() * arr.length)];

// Fecha aleatoria entre dos límites — siempre primer día del mes
// (igual que los FRI reales de ANM que reportan por mes)
const randFecha = (desde, hasta) => {
  const t = desde.getTime() + Math.random() * (hasta.getTime() - desde.getTime());
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const DESDE = new Date('2025-01-01');
const HASTA = new Date('2026-02-28');

// ── Catálogos de valores realistas para Colombia ──────────────
const MINERALES    = ['Carbón', 'Oro', 'Plata', 'Caliza', 'Arena', 'Arcilla', 'Cobre', 'Hierro'];
const ESTADOS      = ['BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO'];
const PESOS_ESTADO = [0.20, 0.25, 0.40, 0.15];  // más APROBADO que RECHAZADO
const UNIDADES     = ['toneladas', 'metros cúbicos', 'kilogramos', 'gramos'];
const METODOS      = ['Cielo Abierto', 'Subterráneo', 'Aluvial', 'Dragado', 'In-situ'];
const TIPOS_PARADA = ['Mantenimiento', 'Climática', 'Eléctrica', 'Legal', 'Operativa'];
const TIPOS_MAQ    = ['Excavadora', 'Volqueta', 'Bulldozer', 'Motoniveladora', 'Retroexcavadora', 'Compactadora'];
const RESOLUCIONES = ['UPME-2024-001', 'UPME-2024-023', 'UPME-2025-007', 'UPME-2025-018'];
const COORDS_COL   = [
  { lat: 5.570,  lon: -73.367 },   // Boyacá
  { lat: 6.250,  lon: -75.563 },   // Antioquia
  { lat: 10.391, lon: -75.479 },   // Bolívar
  { lat: 4.711,  lon: -74.072 },   // Cundinamarca
  { lat: 3.878,  lon: -76.303 },   // Valle del Cauca
];

// Estado ponderado — distribución realista de formularios
const estadoPonderado = () => {
  const r = Math.random(); let acc = 0;
  for (let i = 0; i < ESTADOS.length; i++) {
    acc += PESOS_ESTADO[i];
    if (r < acc) return ESTADOS[i];
  }
  return 'APROBADO';
};

// Tag para identificar y limpiar solo los registros de este seed
const TAG = '[SEED-200]';

// ════════════════════════════════════════════════════════════════
// GENERADORES POR TIPO DE FRI
// Reciben (usuario, titulo) → devuelven el objeto data para Prisma
// ════════════════════════════════════════════════════════════════

const genProduccion = (u, t) => ({
  fechaCorte:          randFecha(DESDE, HASTA),
  mineral:             pick(MINERALES),
  horasOperativas:     rand(40, 720),
  unidadMedida:        pick(UNIDADES),
  cantidadProduccion:  rand(100, 8000),
  materialEntraPlanta: rand(80, 7500),
  materialSalePlanta:  rand(60, 7000),
  masaUnitaria:        rand(0.8, 2.5),
  estado:              estadoPonderado(),
  observaciones:       TAG,
  usuarioId:           u.id,
  tituloMineroId:      t.id,
});

const genInventarios = (u, t) => ({
  fechaCorte:              randFecha(DESDE, HASTA),
  mineral:                 pick(MINERALES),
  unidadMedida:            pick(UNIDADES),
  inventarioInicialAcopio: rand(500, 5000),
  inventarioFinalAcopio:   rand(400, 4800),
  ingresoAcopio:           rand(100, 2000),
  salidaAcopio:            rand(100, 2000),
  estado:                  estadoPonderado(),
  observaciones:           TAG,
  usuarioId:               u.id,
  tituloMineroId:          t.id,
});

const genParadas = (u, t) => {
  const inicio = randFecha(DESDE, HASTA);
  const fin    = new Date(inicio.getTime() + randInt(1, 15) * 24 * 60 * 60 * 1000);
  return {
    fechaCorte:    randFecha(DESDE, HASTA),
    tipoParada:    pick(TIPOS_PARADA),
    fechaInicio:   inicio,
    fechaFin:      fin,
    horasParadas:  rand(4, 240),
    motivo:        `Parada ${pick(TIPOS_PARADA).toLowerCase()} sector ${randInt(1,5)} ${TAG}`,
    estado:        estadoPonderado(),
    observaciones: TAG,
    usuarioId:     u.id,
    tituloMineroId: t.id,
  };
};

const genEjecucion = (u, t) => {
  const c = pick(COORDS_COL);
  return {
    fechaCorte:         randFecha(DESDE, HASTA),
    mineral:            pick(MINERALES),
    denominacionFrente: `Frente ${pick(['Norte','Sur','Este','Oeste','Central'])} ${randInt(1,9)} ${TAG}`,
    latitud:            rand(c.lat - 0.05, c.lat + 0.05),
    longitud:           rand(c.lon - 0.05, c.lon + 0.05),
    metodoExplotacion:  pick(METODOS),
    avanceEjecutado:    rand(5, 200),
    unidadMedidaAvance: pick(['metros', 'metros cúbicos']),
    volumenEjecutado:   rand(50, 5000),
    estado:             estadoPonderado(),
    observaciones:      TAG,
    usuarioId:          u.id,
    tituloMineroId:     t.id,
  };
};

const genMaquinaria = (u, t) => ({
  fechaCorte:          randFecha(DESDE, HASTA),
  tipoMaquinaria:      pick(TIPOS_MAQ),
  cantidad:            randInt(1, 8),
  horasOperacion:      rand(40, 500),
  capacidadTransporte: rand(5, 40),
  unidadCapacidad:     pick(['toneladas', 'metros cúbicos']),
  estado:              estadoPonderado(),
  observaciones:       TAG,
  usuarioId:           u.id,
  tituloMineroId:      t.id,
});

const genRegalias = (u, t) => ({
  fechaCorte:              randFecha(DESDE, HASTA),
  mineral:                 pick(MINERALES),
  cantidadExtraida:        rand(100, 5000),
  unidadMedida:            pick(UNIDADES),
  valorDeclaracion:        rand(5_000_000, 500_000_000),
  valorContraprestaciones: rand(500_000,   50_000_000),
  resolucionUPME:          pick(RESOLUCIONES),
  estado:                  estadoPonderado(),
  observaciones:           TAG,
  usuarioId:               u.id,
  tituloMineroId:          t.id,
});

// ── Tabla de tipos [modelo, generador, cuántos crear] ────────
// 35+35+30+35+30+35 = 200 registros exactos
const TIPOS = [
  { modelo: prisma.fRIProduccion,  gen: genProduccion,  n: 35, nombre: 'Producción'  },
  { modelo: prisma.fRIInventarios, gen: genInventarios, n: 35, nombre: 'Inventarios' },
  { modelo: prisma.fRIParadas,     gen: genParadas,     n: 30, nombre: 'Paradas'     },
  { modelo: prisma.fRIEjecucion,   gen: genEjecucion,   n: 35, nombre: 'Ejecución'   },
  { modelo: prisma.fRIMaquinaria,  gen: genMaquinaria,  n: 30, nombre: 'Maquinaria'  },
  { modelo: prisma.fRIRegalias,    gen: genRegalias,    n: 35, nombre: 'Regalías'    },
];

// ════════════════════════════════════════════════════════════════
// SEMBRAR
// ════════════════════════════════════════════════════════════════
async function sembrar() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  🌱  SEED-REPORTES-200 — TU MINA             ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. Leer todos los usuarios activos y títulos mineros de la BD
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, email: true, rol: true, tituloMineroId: true },
  });

  const titulos = await prisma.tituloMinero.findMany({
    select: { id: true, numeroTitulo: true, municipio: true },
  });

  if (!usuarios.length) {
    console.error('❌ No hay usuarios activos. Corre el seed principal primero.');
    process.exit(1);
  }
  if (!titulos.length) {
    console.error('❌ No hay títulos mineros en la BD.');
    process.exit(1);
  }

  console.log(`👥 Usuarios encontrados: ${usuarios.length}`);
  usuarios.forEach(u => console.log(`   • [${u.rol.padEnd(10)}] ${u.nombre} — ${u.email}`));

  console.log(`\n📋 Títulos mineros: ${titulos.length}`);
  titulos.forEach(t => console.log(`   • ${t.numeroTitulo} — ${t.municipio}`));
  console.log('');

  // 2. Crear registros distribuyendo entre TODOS los usuarios
  let totalCreados = 0;

  for (const { modelo, gen, n, nombre } of TIPOS) {
    const promesas = [];

    for (let i = 0; i < n; i++) {
      // Rotación uniforme: i % length → todos los usuarios reciben
      // aproximadamente la misma cantidad de registros
      const usuario = usuarios[i % usuarios.length];

      // Título: usa el del usuario si tiene asignado, si no elige uno al azar
      // Esto refleja la realidad: operadores tienen su título fijo,
      // supervisores/admins pueden ver cualquier título
      const titulo = usuario.tituloMineroId
        ? titulos.find(t => t.id === usuario.tituloMineroId) || pick(titulos)
        : pick(titulos);

      promesas.push(modelo.create({ data: gen(usuario, titulo) }));
    }

    await Promise.all(promesas);
    totalCreados += n;
    console.log(`   ✅ FRI ${nombre.padEnd(12)} — ${n} registros`);
  }

  // 3. Resumen
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  ✅ ${totalCreados} registros creados correctamente     ║`);
  console.log(`╚══════════════════════════════════════════════╝`);

  // 4. Distribución por usuario (para verificar)
  console.log('\n📊 Distribución por usuario (Producción):');
  const stats = await prisma.fRIProduccion.groupBy({
    by: ['usuarioId'],
    where: { observaciones: { contains: TAG } },
    _count: true,
  });
  for (const s of stats) {
    const u = usuarios.find(x => x.id === s.usuarioId);
    console.log(`   • ${(u?.nombre || s.usuarioId).padEnd(25)} — ${s._count} registros`);
  }

  console.log('\n💡 Para probar en Reportes:');
  console.log('   - Sin filtros → verás los 35 más recientes de Producción');
  console.log('   - Filtra por usuario → solo sus registros');
  console.log('   - Filtra por estado APROBADO → ~40% del total');
  console.log('   - Filtra fechas ene-2025 → todo el año 2025');
  console.log('\n🧹 Para limpiar:');
  console.log('   node backend/prisma/seed-reportes-200.js --limpiar\n');
}

// ════════════════════════════════════════════════════════════════
// LIMPIAR — elimina SOLO los registros marcados con TAG
// NO toca datos reales, usuarios, ni títulos mineros
// ════════════════════════════════════════════════════════════════
async function limpiar() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  🧹  Limpiando datos seed-reportes-200       ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const filtro   = { where: { observaciones: { contains: TAG } } };
  const nombres  = ['Producción', 'Inventarios', 'Paradas', 'Ejecución', 'Maquinaria', 'Regalías'];

  const resultados = await Promise.all([
    prisma.fRIProduccion.deleteMany(filtro),
    prisma.fRIInventarios.deleteMany(filtro),
    prisma.fRIParadas.deleteMany(filtro),
    prisma.fRIEjecucion.deleteMany(filtro),
    prisma.fRIMaquinaria.deleteMany(filtro),
    prisma.fRIRegalias.deleteMany(filtro),
  ]);

  let total = 0;
  resultados.forEach((r, i) => {
    console.log(`   🗑  FRI ${nombres[i].padEnd(12)} — ${r.count} eliminados`);
    total += r.count;
  });

  console.log(`\n✅ ${total} registros de prueba eliminados.`);
  console.log('   Datos reales, usuarios y títulos: intactos.\n');
}

// ── Punto de entrada ──────────────────────────────────────────
(async () => {
  try {
    if (process.argv.includes('--limpiar')) {
      await limpiar();
    } else {
      await sembrar();
    }
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.code === 'P2003') console.error('   Clave foránea inválida — verifica usuarios y títulos.');
    if (err.code === 'P2002') console.error('   Registro duplicado — el seed ya fue cargado.');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();