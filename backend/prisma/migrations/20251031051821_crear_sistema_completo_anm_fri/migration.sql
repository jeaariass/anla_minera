-- AlterTable
ALTER TABLE "fri_produccion" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';

-- CreateTable
CREATE TABLE "fri_inventarios" (
    "id" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "mineral" TEXT NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "inventarioInicialAcopio" DECIMAL(15,4) NOT NULL,
    "inventarioFinalAcopio" DECIMAL(15,4) NOT NULL,
    "ingresoAcopio" DECIMAL(15,4) NOT NULL,
    "salidaAcopio" DECIMAL(15,4) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "fri_inventarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fri_paradas" (
    "id" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "tipoParada" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "horasParadas" DECIMAL(8,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "fri_paradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fri_ejecucion" (
    "id" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "mineral" TEXT NOT NULL,
    "denominacionFrente" TEXT NOT NULL,
    "latitud" DECIMAL(10,8) NOT NULL,
    "longitud" DECIMAL(11,8) NOT NULL,
    "metodoExplotacion" TEXT NOT NULL,
    "avanceEjecutado" DECIMAL(10,2) NOT NULL,
    "unidadMedidaAvance" TEXT NOT NULL,
    "volumenEjecutado" DECIMAL(15,4) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "fri_ejecucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fri_maquinaria" (
    "id" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "tipoMaquinaria" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "horasOperacion" DECIMAL(8,2) NOT NULL,
    "capacidadTransporte" DECIMAL(10,2),
    "unidadCapacidad" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "fri_maquinaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fri_regalias" (
    "id" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "mineral" TEXT NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "codigoMunicipio" TEXT,
    "cantidadExtraida" DECIMAL(15,4) NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "valorDeclaracion" DECIMAL(15,2) NOT NULL,
    "valorContraprestaciones" DECIMAL(15,2),
    "resolucionUPME" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "fri_regalias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fri_inventario_maquinaria" (
    "id" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "tipoMaquinaria" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "añoFabricacion" INTEGER,
    "capacidad" DECIMAL(10,2),
    "estadoOperativo" TEXT NOT NULL,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "fri_inventario_maquinaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fri_capacidad" (
    "id" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "areaProduccion" TEXT NOT NULL,
    "tecnologiaUtilizada" TEXT NOT NULL,
    "capacidadInstalada" DECIMAL(15,4) NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "personalCapacitado" INTEGER NOT NULL,
    "certificaciones" TEXT,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "fri_capacidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fri_proyecciones" (
    "id" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "tituloMinero" TEXT NOT NULL,
    "metodoExplotacion" TEXT NOT NULL,
    "mineral" TEXT NOT NULL,
    "capacidadExtraccion" DECIMAL(15,4) NOT NULL,
    "capacidadTransporte" DECIMAL(15,4) NOT NULL,
    "capacidadBeneficio" DECIMAL(15,4) NOT NULL,
    "proyeccionTopografia" TEXT,
    "densidadManto" DECIMAL(10,4),
    "cantidadProyectada" DECIMAL(15,4) NOT NULL,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "fri_proyecciones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fri_inventarios" ADD CONSTRAINT "fri_inventarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_inventarios" ADD CONSTRAINT "fri_inventarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_paradas" ADD CONSTRAINT "fri_paradas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_paradas" ADD CONSTRAINT "fri_paradas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_ejecucion" ADD CONSTRAINT "fri_ejecucion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_ejecucion" ADD CONSTRAINT "fri_ejecucion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_maquinaria" ADD CONSTRAINT "fri_maquinaria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_maquinaria" ADD CONSTRAINT "fri_maquinaria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_regalias" ADD CONSTRAINT "fri_regalias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_regalias" ADD CONSTRAINT "fri_regalias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_inventario_maquinaria" ADD CONSTRAINT "fri_inventario_maquinaria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_inventario_maquinaria" ADD CONSTRAINT "fri_inventario_maquinaria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_capacidad" ADD CONSTRAINT "fri_capacidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_capacidad" ADD CONSTRAINT "fri_capacidad_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_proyecciones" ADD CONSTRAINT "fri_proyecciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fri_proyecciones" ADD CONSTRAINT "fri_proyecciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
