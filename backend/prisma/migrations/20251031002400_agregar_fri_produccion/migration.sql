-- CreateTable
CREATE TABLE "fri_produccion" (
    "id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "año" INTEGER NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "mineral" TEXT NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "horasOperativas" DECIMAL(8,2) NOT NULL,
    "cantidadProducida" DECIMAL(15,4) NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "metodologiaExtraccion" TEXT,
    "equiposUtilizados" TEXT,
    "latitudPuntoA" DECIMAL(10,8),
    "longitudPuntoA" DECIMAL(11,8),
    "latitudPuntoB" DECIMAL(10,8),
    "longitudPuntoB" DECIMAL(11,8),
    "numeroCiclos" INTEGER DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "sincronizado" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "fri_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fri_produccion_mes_año_idx" ON "fri_produccion"("mes", "año");

-- CreateIndex
CREATE INDEX "fri_produccion_mineral_idx" ON "fri_produccion"("mineral");

-- AddForeignKey
ALTER TABLE "fri_produccion" ADD CONSTRAINT "fri_produccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
