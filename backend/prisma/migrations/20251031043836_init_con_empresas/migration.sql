/*
  Warnings:

  - You are about to drop the column `año` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `cantidadProducida` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `equiposUtilizados` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `latitudPuntoA` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `latitudPuntoB` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `longitudPuntoA` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `longitudPuntoB` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `mes` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `metodologiaExtraccion` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `numeroCiclos` on the `fri_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `sincronizado` on the `fri_produccion` table. All the data in the column will be lost.
  - Added the required column `cantidadProduccion` to the `fri_produccion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `fri_produccion` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."fri_produccion_mes_año_idx";

-- AlterTable
ALTER TABLE "fri_produccion" DROP COLUMN "año",
DROP COLUMN "cantidadProducida",
DROP COLUMN "equiposUtilizados",
DROP COLUMN "latitudPuntoA",
DROP COLUMN "latitudPuntoB",
DROP COLUMN "longitudPuntoA",
DROP COLUMN "longitudPuntoB",
DROP COLUMN "mes",
DROP COLUMN "metodologiaExtraccion",
DROP COLUMN "numeroCiclos",
DROP COLUMN "sincronizado",
ADD COLUMN     "cantidadProduccion" DECIMAL(15,4) NOT NULL,
ADD COLUMN     "codigoMunicipio" TEXT,
ADD COLUMN     "empresaId" TEXT NOT NULL,
ADD COLUMN     "masaUnitaria" DECIMAL(15,4),
ADD COLUMN     "materialEntraPlanta" DECIMAL(15,4),
ADD COLUMN     "materialSalePlanta" DECIMAL(15,4),
ALTER COLUMN "estado" SET DEFAULT 'APROBADO';

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "empresaId" TEXT;

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fri_produccion_tituloMinero_idx" ON "fri_produccion"("tituloMinero");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_produccion" ADD CONSTRAINT "fri_produccion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
