// backend/scripts/backfill_titulo_modulos.js
// ============================================================
// 1. Crea la tabla titulo_modulos si no existe (SQL aditivo —
//    NO usar `prisma db push`: la BD tiene columnas fuera del
//    schema como puntos_actividad.punto_actividad_id y push las
//    borraría).
// 2. Backfill: crea los módulos (activos) para cada título
//    minero que aún no tenga filas.
// Idempotente — se puede ejecutar varias veces sin duplicar.
//
// Uso (requiere `npx prisma generate` previo):
//   node scripts/backfill_titulo_modulos.js
// ============================================================

const { PrismaClient } = require("@prisma/client");
const { MODULOS } = require("../src/utils/modulos");

const prisma = new PrismaClient();

async function crearTabla() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS titulo_modulos (
      id TEXT PRIMARY KEY,
      "tituloMineroId" TEXT NOT NULL REFERENCES titulos_mineros(id) ON DELETE CASCADE,
      modulo TEXT NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      orden INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "titulo_modulos_tituloMineroId_modulo_key"
        UNIQUE ("tituloMineroId", modulo)
    )
  `);
  console.log("✅ Tabla titulo_modulos lista");
}

async function main() {
  await crearTabla();

  const titulos = await prisma.tituloMinero.findMany({
    select: { id: true, numeroTitulo: true },
  });

  let creadas = 0;
  for (const titulo of titulos) {
    const resultado = await prisma.tituloModulo.createMany({
      data: MODULOS.map((m) => ({
        tituloMineroId: titulo.id,
        modulo: m.id,
        activo: true,
        orden: m.orden,
      })),
      skipDuplicates: true,
    });
    if (resultado.count > 0) {
      console.log(`✅ ${titulo.numeroTitulo}: ${resultado.count} módulos creados`);
      creadas += resultado.count;
    }
  }

  console.log(`\nBackfill terminado. ${titulos.length} títulos revisados, ${creadas} filas creadas.`);
}

main()
  .catch((e) => {
    console.error("❌ Error en backfill:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
