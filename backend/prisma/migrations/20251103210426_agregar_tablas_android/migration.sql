-- CreateTable
CREATE TABLE "puntos_referencia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tituloMineroId" TEXT NOT NULL,
    "latitud" DECIMAL(10,8) NOT NULL,
    "longitud" DECIMAL(11,8) NOT NULL,
    "radioInfluenciaM" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puntos_referencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_ciclos_produccion" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "tituloMineroId" TEXT NOT NULL,
    "tipoMaquina" TEXT NOT NULL,
    "capacidadMaxM3" DECIMAL(10,2) NOT NULL,
    "numeroCiclo" INTEGER NOT NULL,
    "horaInicioCiclo" TIMESTAMP(3) NOT NULL,
    "horaFinCiclo" TIMESTAMP(3) NOT NULL,
    "duracionMinutos" DECIMAL(10,2) NOT NULL,
    "latitudInicio" DECIMAL(10,8) NOT NULL,
    "longitudInicio" DECIMAL(11,8) NOT NULL,
    "latitudFin" DECIMAL(10,8) NOT NULL,
    "longitudFin" DECIMAL(11,8) NOT NULL,
    "puntoRecoleccion" TEXT NOT NULL,
    "puntoAcopio" TEXT NOT NULL,
    "distanciaRecorrida" DECIMAL(10,2),
    "estadoCiclo" TEXT NOT NULL DEFAULT 'COMPLETADO',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registro_ciclos_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "puntos_referencia_tituloMineroId_idx" ON "puntos_referencia"("tituloMineroId");

-- CreateIndex
CREATE INDEX "puntos_referencia_tipo_idx" ON "puntos_referencia"("tipo");

-- CreateIndex
CREATE INDEX "registro_ciclos_produccion_fecha_idx" ON "registro_ciclos_produccion"("fecha");

-- CreateIndex
CREATE INDEX "registro_ciclos_produccion_usuarioId_idx" ON "registro_ciclos_produccion"("usuarioId");

-- CreateIndex
CREATE INDEX "registro_ciclos_produccion_tituloMineroId_idx" ON "registro_ciclos_produccion"("tituloMineroId");

-- AddForeignKey
ALTER TABLE "puntos_referencia" ADD CONSTRAINT "puntos_referencia_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_ciclos_produccion" ADD CONSTRAINT "registro_ciclos_produccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_ciclos_produccion" ADD CONSTRAINT "registro_ciclos_produccion_tituloMineroId_fkey" FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
