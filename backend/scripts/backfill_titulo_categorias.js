// backend/scripts/backfill_titulo_categorias.js
// ============================================================
// 1. Crea la tabla titulo_categorias si no existe (SQL aditivo —
//    NO usar `prisma db push`: la BD tiene columnas fuera del
//    schema como puntos_actividad.punto_actividad_id y push las
//    borraría).
// 2. Backfill: crea las 5 categorías (activas) para cada título
//    minero que aún no tenga filas.
// Idempotente — se puede ejecutar varias veces sin duplicar.
//
// Uso (requiere `npx prisma generate` previo):
//   node scripts/backfill_titulo_categorias.js
// ============================================================

const { PrismaClient } = require("@prisma/client");
const { CATEGORIAS } = require("../src/utils/categorias");

const prisma = new PrismaClient();

async function crearTabla() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS titulo_categorias (
      id TEXT PRIMARY KEY,
      "tituloMineroId" TEXT NOT NULL REFERENCES titulos_mineros(id) ON DELETE CASCADE,
      categoria TEXT NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      orden INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "titulo_categorias_tituloMineroId_categoria_key"
        UNIQUE ("tituloMineroId", categoria)
    )
  `);
  console.log("✅ Tabla titulo_categorias lista");
}

async function main() {
  await crearTabla();

  const titulos = await prisma.tituloMinero.findMany({
    select: { id: true, numeroTitulo: true },
  });

  let creadas = 0;
  for (const titulo of titulos) {
    const resultado = await prisma.tituloCategoria.createMany({
      data: CATEGORIAS.map((c) => ({
        tituloMineroId: titulo.id,
        categoria: c.id,
        activo: true,
        orden: c.orden,
      })),
      skipDuplicates: true,
    });
    if (resultado.count > 0) {
      console.log(`✅ ${titulo.numeroTitulo}: ${resultado.count} categorías creadas`);
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
