ALTER TABLE "certificados_origen"  ADD COLUMN IF NOT EXISTS "consecutivo" VARCHAR(20);
ALTER TABLE "certificados_origen"  ADD COLUMN IF NOT EXISTS "rutaPdf"     TEXT;
ALTER TABLE "certificados_origen"  ADD COLUMN IF NOT EXISTS "rutaXlsx"    TEXT;
ALTER TABLE "certificados_origen"  ALTER COLUMN "cantidadM3" DROP NOT NULL;

ALTER TABLE "clientes_compradores" ADD COLUMN IF NOT EXISTS "tipoIdentificacion" VARCHAR(30);
ALTER TABLE "clientes_compradores" ADD COLUMN IF NOT EXISTS "tipoComprador"      VARCHAR(30);
ALTER TABLE "clientes_compradores" ADD COLUMN IF NOT EXISTS "rucom"              VARCHAR(50);