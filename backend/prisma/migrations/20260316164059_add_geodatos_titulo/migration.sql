ALTER TABLE "titulos_mineros" ADD COLUMN IF NOT EXISTS "etapa"         TEXT;
ALTER TABLE "titulos_mineros" ADD COLUMN IF NOT EXISTS "area_ha"       DECIMAL(12,4);
ALTER TABLE "titulos_mineros" ADD COLUMN IF NOT EXISTS "clasificacion" TEXT;
ALTER TABLE "titulos_mineros" ADD COLUMN IF NOT EXISTS "minerales"     TEXT;
ALTER TABLE "titulos_mineros" ADD COLUMN IF NOT EXISTS "modalidad"     TEXT;
ALTER TABLE "titulos_mineros" ADD COLUMN IF NOT EXISTS "centroid"      JSONB;
ALTER TABLE "titulos_mineros" ADD COLUMN IF NOT EXISTS "polygon"       JSONB;