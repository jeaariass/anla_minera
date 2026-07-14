// backend/scripts/add_es_demo.js
// ============================================================
// Agrega la columna esDemo a usuarios y titulos_mineros
// (SQL aditivo — NO usar `prisma db push`, la BD tiene drift).
// Idempotente: ADD COLUMN IF NOT EXISTS.
//
// Uso:
//   node scripts/add_es_demo.js
// ============================================================

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE titulos_mineros
    ADD COLUMN IF NOT EXISTS "esDemo" BOOLEAN NOT NULL DEFAULT false
  `);
  console.log("✅ titulos_mineros.esDemo lista");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS "esDemo" BOOLEAN NOT NULL DEFAULT false
  `);
  console.log("✅ usuarios.esDemo lista");
}

main()
  .catch((e) => {
    console.error("❌ Error agregando esDemo:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
