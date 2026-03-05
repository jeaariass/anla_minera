-- CreateTable
CREATE TABLE "clientes_compradores" (
    "id" TEXT NOT NULL,
    "cedula" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "correo" VARCHAR(150),
    "telefono" VARCHAR(20),
    "direccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_compradores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_compradores_cedula_key" ON "clientes_compradores"("cedula");

-- CreateTable
CREATE TABLE "certificados_origen" (
    "id" TEXT NOT NULL,
    "tituloMineroId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "mineralExplotado" VARCHAR(100) NOT NULL,
    "cantidadM3" DECIMAL(15,4) NOT NULL,
    "unidadMedida" VARCHAR(10) NOT NULL DEFAULT 'M3',
    "fechaCertificado" DATE NOT NULL DEFAULT CURRENT_DATE,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificados_origen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificados_origen_tituloMineroId_idx" ON "certificados_origen"("tituloMineroId");

-- CreateIndex
CREATE INDEX "certificados_origen_clienteId_idx" ON "certificados_origen"("clienteId");

-- AddForeignKey
ALTER TABLE "certificados_origen" ADD CONSTRAINT "certificados_origen_tituloMineroId_fkey"
    FOREIGN KEY ("tituloMineroId") REFERENCES "titulos_mineros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_origen" ADD CONSTRAINT "certificados_origen_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "clientes_compradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE clientes_compradores
  ADD COLUMN IF NOT EXISTS "tipoIdentificacion" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "tipoComprador"      VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "rucom"              VARCHAR(50);    

 ALTER TABLE certificados_origen
  ALTER COLUMN "cantidadM3" DROP NOT NULL;

-- Agregar consecutivo (si no existe ya)
ALTER TABLE certificados_origen
  ADD COLUMN IF NOT EXISTS consecutivo VARCHAR(20);

-- Rutas de almacenamiento en disco
ALTER TABLE certificados_origen
  ADD COLUMN IF NOT EXISTS "rutaPdf"  TEXT,
  ADD COLUMN IF NOT EXISTS "rutaXlsx" TEXT;