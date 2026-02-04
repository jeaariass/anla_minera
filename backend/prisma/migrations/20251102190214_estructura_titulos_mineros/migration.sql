/*
  Warnings:

  - You are about to drop the column `empresaId` on the `fri_capacidad` table. All the data in the column will be lost.
  - You are about to drop the column `tituloMinero` on the `fri_capacidad` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `fri_ejecucion` table. All the data in the column will be lost.
  - You are about to drop the column `tituloMinero` on the `fri_ejecucion` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `fri_inventario_maquinaria` table. All the data in the column will be lost.
  - You are about to drop the column `tituloMinero` on the `fri_inventario_maquinaria` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `fri_inventarios` table. All the data in the column will be lost.
  - You are about to drop the column `tituloMinero` on the `fri_inventarios` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `fri_maquinaria` table. All the data in the column will be lost.
  - You are about to drop the column `tituloMinero` on the `fri_maquinaria` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `fri_paradas` table. All the data in the column will be lost.
  - You are about to drop the column `tituloMinero` on the `fri_paradas` table. All the data in the column will be lost.
  - You are about to drop the column `codigoMunicipio` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `municipio` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `tituloMinero` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `fri_proyecciones` table. All the data in the column will be lost.
  - You are about to drop the column `tituloMinero` on the `fri_proyecciones` table. All the data in the column will be lost.
  - You are about to drop the column `codigoMunicipio` on the `fri_regalias` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `fri_regalias` table. All the data in the column will be lost.
  - You are about to drop the column `municipio` on the `fri_regalias` table. All the data in the column will be lost.
  - You are about to drop the column `tituloMinero` on the `fri_regalias` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the `empresas` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `tituloMineroId` to the `fri_capacidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloMineroId` to the `fri_ejecucion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloMineroId` to the `fri_inventario_maquinaria` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloMineroId` to the `fri_inventarios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloMineroId` to the `fri_maquinaria` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloMineroId` to the `fri_paradas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloMineroId` to the `fri_produccion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloMineroId` to the `fri_proyecciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloMineroId` to the `fri_regalias` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."fri_capacidad" DROP CONSTRAINT "fri_capacidad_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."fri_ejecucion" DROP CONSTRAINT "fri_ejecucion_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."fri_inventario_maquinaria" DROP CONSTRAINT "fri_inventario_maquinaria_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."fri_inventarios" DROP CONSTRAINT "fri_inventarios_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."fri_maquinaria" DROP CONSTRAINT "fri_maquinaria_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."fri_paradas" DROP CONSTRAINT "fri_paradas_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."fri_produccion" DROP CONSTRAINT "fri_produccion_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."fri_proyecciones" DROP CONSTRAINT "fri_proyecciones_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."fri_regalias" DROP CONSTRAINT "fri_regalias_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."usuarios" DROP CONSTRAINT "usuarios_empresaId_fkey";

-- DropIndex
DROP INDEX "public"."fri_produccion_tituloMinero_idx";

-- AlterTable
ALTER TABLE "fri_capacidad" DROP COLUMN "empresaId",
DROP COLUMN "tituloMinero",
ADD COLUMN     "tituloMineroId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fri_ejecucion" DROP COLUMN "empresaId",
DROP COLUMN "tituloMinero",
ADD COLUMN     "tituloMineroId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fri_inventario_maquinaria" DROP COLUMN "empresaId",
DROP COLUMN "tituloMinero",
ADD COLUMN     "tituloMineroId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fri_inventarios" DROP COLUMN "empresaId",
DROP COLUMN "tituloMinero",
ADD COLUMN     "tituloMineroId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fri_maquinaria" DROP COLUMN "empresaId",
DROP COLUMN "tituloMinero",
ADD COLUMN     "tituloMineroId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fri_paradas" DROP COLUMN "empresaId",
DROP COLUMN "tituloMinero",
ADD COLUMN     "tituloMineroId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fri_produccion" DROP COLUMN "codigoMunicipio",
DROP COLUMN "empresaId",
DROP COLUMN "municipio",
DROP COLUMN "tituloMinero",
ADD COLUMN     "tituloMineroId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fri_proyecciones" DROP COLUMN "empresaId",
DROP COLUMN "tituloMinero",
ADD COLUMN     "tituloMineroId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fri_regalias" DROP COLUMN "codigoMunicipio",
DROP COLUMN "empresaId",
DROP COLUMN "municipio",
DROP COLUMN "tituloMinero",
ADD COLUMN     "tituloMineroId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "empresaId",
ADD COLUMN     "tituloMineroId" TEXT;

-- DropTable
DROP TABLE "public"."empresas";

-- CreateTable
CREATE TABLE "titulos_mineros" (
    "id" TEXT NOT NULL,
    "numeroTitulo" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "codigoMunicipio" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaInicio" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titulos_mineros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "titulos_mineros_numeroTitulo_key" ON "titulos_mineros"("numeroTitulo");

-- CreateIndex
CREATE INDEX "fri_produccion_fechaCorte_idx" ON "fri_produccion"("fechaCorte");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_produccion" ADD CONSTRAINT "fri_produccion_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_inventarios" ADD CONSTRAINT "fri_inventarios_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_paradas" ADD CONSTRAINT "fri_paradas_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_ejecucion" ADD CONSTRAINT "fri_ejecucion_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_maquinaria" ADD CONSTRAINT "fri_maquinaria_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_regalias" ADD CONSTRAINT "fri_regalias_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_inventario_maquinaria" ADD CONSTRAINT "fri_inventario_maquinaria_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_capacidad" ADD CONSTRAINT "fri_capacidad_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_proyecciones" ADD CONSTRAINT "fri_proyecciones_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
