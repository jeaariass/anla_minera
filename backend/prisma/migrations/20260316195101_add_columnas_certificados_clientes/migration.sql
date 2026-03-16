ALTER TABLE IF EXISTS "certificados_origen" ADD COLUMN IF NOT EXISTS "consecutivo" VARCHAR(20);
ALTER TABLE IF EXISTS "certificados_origen" ADD COLUMN IF NOT EXISTS "rutaPdf"     TEXT;
ALTER TABLE IF EXISTS "certificados_origen" ADD COLUMN IF NOT EXISTS "rutaXlsx"    TEXT;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'certificados_origen' 
    AND column_name = 'cantidadM3'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "certificados_origen" ALTER COLUMN "cantidadM3" DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS "clientes_compradores" ADD COLUMN IF NOT EXISTS "tipoIdentificacion" VARCHAR(30);
ALTER TABLE IF EXISTS "clientes_compradores" ADD COLUMN IF NOT EXISTS "tipoComprador"      VARCHAR(30);
ALTER TABLE IF EXISTS "clientes_compradores" ADD COLUMN IF NOT EXISTS "rucom"              VARCHAR(50);