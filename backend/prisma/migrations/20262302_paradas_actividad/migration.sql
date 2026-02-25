-- ============================================
-- CATÁLOGO: motivos de paro (dropdown)
-- ============================================

CREATE TABLE IF NOT EXISTS paradas_motivos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      VARCHAR(50) UNIQUE NOT NULL,
  nombre      VARCHAR(120) NOT NULL,
  activo      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO paradas_motivos (codigo, nombre)
VALUES
  ('MANTENIMIENTO',  'Mantenimiento'),
  ('LUZ',            'Se fue la luz'),
  ('AGUA',           'Sin agua'),
  ('CORREA',         'Se salió la correa'),
  ('ALIMENTACION',   'Sin alimentación'),
  ('ATASCAMIENTO',   'Atascamiento Alimentador'),
  ('PIEDRA GAVIAN',  'Se llenó de piedra Gavián'),
  ('OTRO',           'Otro')
ON CONFLICT (codigo) DO NOTHING;

-- ── Tabla principal de paradas ───────────────────────────────
CREATE TABLE IF NOT EXISTS paradas_actividad (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id         VARCHAR(255) NOT NULL,
  titulo_minero_id   VARCHAR(255) NOT NULL,
  motivo_id          UUID        NOT NULL,
  motivo_nombre      VARCHAR(120) NULL,   
  motivo_otro        TEXT        NULL,
  inicio             TIMESTAMP   NOT NULL,
  fin                TIMESTAMP   NOT NULL,
  dia                DATE        NOT NULL DEFAULT CURRENT_DATE,
  minutos_paro       INT GENERATED ALWAYS AS (
                       (EXTRACT(EPOCH FROM (fin - inicio)) / 60)::INT
                     ) STORED,
  observaciones      TEXT        NULL,
  estado             VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  enviado_at         TIMESTAMP   NULL,
  created_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_fin_mayor_inicio  CHECK (fin >= inicio),
  CONSTRAINT chk_estado            CHECK (estado IN ('BORRADOR','ENVIADO')),
  CONSTRAINT chk_motivo_otro       CHECK (
    (motivo_otro IS NULL)
    OR (motivo_otro IS NOT NULL AND length(trim(motivo_otro)) > 0)
  ),
  CONSTRAINT fk_motivo             FOREIGN KEY (motivo_id)          REFERENCES paradas_motivos(id)
);

CREATE INDEX IF NOT EXISTS idx_paradas_inicio  ON paradas_actividad (inicio DESC);
CREATE INDEX IF NOT EXISTS idx_paradas_dia     ON paradas_actividad (dia);
CREATE INDEX IF NOT EXISTS idx_paradas_usuario ON paradas_actividad (usuario_id);
CREATE INDEX IF NOT EXISTS idx_paradas_titulo  ON paradas_actividad (titulo_minero_id);
CREATE INDEX IF NOT EXISTS idx_paradas_estado  ON paradas_actividad (estado);
CREATE INDEX IF NOT EXISTS idx_paradas_motivo  ON paradas_actividad (motivo_id);

-- Vista legible de paradas
CREATE OR REPLACE VIEW v_paradas_actividad AS
SELECT
  pa.id,
  pa.usuario_id,
  pa.titulo_minero_id,
  pa.motivo_id,
  pm.codigo     AS motivo_codigo,
  pm.nombre     AS motivo_catalogo,
  pa.motivo_nombre,
  pa.motivo_otro,
  CASE
    WHEN pm.codigo = 'OTRO' THEN pa.motivo_otro
    ELSE pm.nombre
  END           AS motivo_display,
  pa.inicio,
  pa.fin,
  pa.dia,
  pa.minutos_paro,
  pa.observaciones,
  pa.estado,
  pa.created_at
FROM paradas_actividad pa
JOIN paradas_motivos pm ON pm.id = pa.motivo_id;