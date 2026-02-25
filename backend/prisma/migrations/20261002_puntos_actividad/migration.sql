-- ============================================================
-- 1. CATÁLOGO DE ÍTEMS POR CATEGORÍA
-- ============================================================

CREATE TABLE puntos_items_catalogo (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria  VARCHAR(50)  NOT NULL,
  codigo     VARCHAR(100) NOT NULL,
  nombre     VARCHAR(150) NOT NULL,
  activo     BOOLEAN      NOT NULL DEFAULT TRUE,
  orden      INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (categoria, codigo)
);

-- Ítems de EXTRACCIÓN
INSERT INTO puntos_items_catalogo (categoria, codigo, nombre, orden) VALUES
  ('extraccion', 'FRENTE_EXPLOTACION', 'Frente de explotación', 1),
  ('extraccion', 'ACOPIO',             'Acopio',                2),
  ('extraccion', 'BARRA',              'Barra',                 3),
  ('extraccion', 'PISCINA',            'Piscina',               4),
  ('extraccion', 'OTRO',               'Otro',                  99)
ON CONFLICT (categoria, codigo) DO NOTHING;

-- Ítems de ACOPIO
INSERT INTO puntos_items_catalogo (categoria, codigo, nombre, orden) VALUES
  ('acopio', 'ARENA',                  'Arena',                       1),
  ('acopio', 'ARENON',                 'Arenón',                      2),
  ('acopio', 'CONO_1_5',               'Cono 1½"',                    3),
  ('acopio', 'CONO_3_4',               'Cono ¾"',                     4),
  ('acopio', 'CONO_ARENA',             'Cono arena',                  5),
  ('acopio', 'CONO_ARENON',            'Cono arenón',                 6),
  ('acopio', 'CRUDO',                  'Crudo',                       7),
  ('acopio', 'DESCONE',                'Descone',                     8),
  ('acopio', 'FRENTE_EXPLOTACION',     'Frente de explotación',       9),
  ('acopio', 'TOLVA',                  'Tolva',                       10),
  ('acopio', 'TRITURADO_3_4',          'Triturado ¾"',                11),
  ('acopio', 'SUBBASE',                'Subbase',                     12),
  ('acopio', 'ARENON_LAVADO',          'Arenón Lavado',               13),
  ('acopio', 'MATERIAL_LLENANTE',      'Material Llenante',           14),
  ('acopio', 'PIEDRA_GAVION',          'Piedra Gavión',               15),
  ('acopio', 'ARENA_MEZCLADA_ARENON',  'Arena mezclada con arenón',   16),
  ('acopio', 'TRITURADO_1_5',          'Triturado 1½"',               17),
  ('acopio', 'BASE',                   'Base',                        18),
  ('acopio', 'TRITURADO_1',            'Triturado 1"',                19),
  ('acopio', 'GRAVILLA',               'Gravilla',                    20),
  ('acopio', 'ARENA_TRITURADA',        'Arena Triturada',             21),
  ('acopio', 'SUBBASE_GRANULAR',       'Subbase Granular',            22),
  ('acopio', 'GRAVA',                  'Grava',                       23),
  ('acopio', 'BASE_GRANULAR',          'Base Granular',               24),
  ('acopio', 'OTRO',                   'Otro',                        99)
ON CONFLICT (categoria, codigo) DO NOTHING;

-- Ítems de PROCESAMIENTO
INSERT INTO puntos_items_catalogo (categoria, codigo, nombre, orden) VALUES
  ('procesamiento', 'ALIMENTACION',        'Alimentación',          1),
  ('procesamiento', 'ALIMENTACION_CRUDO',  'Alimentación crudo',    2),
  ('procesamiento', 'TOLVA',               'Tolva',                 3),
  ('procesamiento', 'FRENTE_EXPLOTACION',  'Frente de explotación', 4),
  ('procesamiento', 'ALIMENTACION_ACOPIO', 'Alimentación acopio',   5),
  ('procesamiento', 'OTRO',                'Otro',                  99)
ON CONFLICT (categoria, codigo) DO NOTHING;

-- Ítems de INSPECCIÓN
INSERT INTO puntos_items_catalogo (categoria, codigo, nombre, orden) VALUES
  ('inspeccion', 'BASCULA',               'Báscula',                   1),
  ('inspeccion', 'FRENTE_EXPLOTACION',    'Frente de explotación',     2),
  ('inspeccion', 'ACOPIO',                'Acopio',                    3),
  ('inspeccion', 'ARENA',                 'Arena',                     4),
  ('inspeccion', 'ARENON',                'Arenón',                    5),
  ('inspeccion', 'CONO_1_5',              'Cono 1½"',                  6),
  ('inspeccion', 'CONO_3_4',              'Cono ¾"',                   7),
  ('inspeccion', 'CONO_ARENA',            'Cono arena',                8),
  ('inspeccion', 'CONO_ARENON',           'Cono arenón',               9),
  ('inspeccion', 'CRUDO',                 'Crudo',                     10),
  ('inspeccion', 'DESCONE',               'Descone',                   11),
  ('inspeccion', 'TOLVA',                 'Tolva',                     12),
  ('inspeccion', 'TRITURADO_3_4',         'Triturado ¾"',              13),
  ('inspeccion', 'SUBBASE',               'Subbase',                   14),
  ('inspeccion', 'ARENON_LAVADO',         'Arenón Lavado',             15),
  ('inspeccion', 'MATERIAL_LLENANTE',     'Material Llenante',         16),
  ('inspeccion', 'PIEDRA_GAVION',         'Piedra Gavión',             17),
  ('inspeccion', 'ARENA_MEZCLADA_ARENON', 'Arena mezclada con arenón', 18),
  ('inspeccion', 'TRITURADO_1_5',         'Triturado 1½"',             19),
  ('inspeccion', 'BASE',                  'Base',                      20),
  ('inspeccion', 'TRITURADO_1',           'Triturado 1"',              21),
  ('inspeccion', 'GRAVILLA',              'Gravilla',                  22),
  ('inspeccion', 'ARENA_TRITURADA',       'Arena Triturada',           23),
  ('inspeccion', 'SUBBASE_GRANULAR',      'Subbase Granular',          24),
  ('inspeccion', 'GRAVA',                 'Grava',                     25),
  ('inspeccion', 'BASE_GRANULAR',         'Base Granular',             26),
  ('inspeccion', 'BARRA',                 'Barra',                     27),
  ('inspeccion', 'PISCINA',               'Piscina',                   28),
  ('inspeccion', 'OTRO',                  'Otro',                      99)
ON CONFLICT (categoria, codigo) DO NOTHING;


-- ============================================================
-- 2. CATÁLOGO DE MAQUINARIA
-- ============================================================

CREATE TABLE maquinaria_catalogo (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     VARCHAR(100) UNIQUE NOT NULL,
  marca      VARCHAR(100) NOT NULL,
  modelo     VARCHAR(100) NOT NULL,
  display    VARCHAR(200) GENERATED ALWAYS AS (marca || ' ' || modelo) STORED,
  activo     BOOLEAN      NOT NULL DEFAULT TRUE,
  orden      INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO maquinaria_catalogo (codigo, marca, modelo, orden) VALUES
  ('KOMATZU_PC200', 'Komatzu',     'PC 200-3', 1),
  ('HITACHI',       'Hitachi',     'HCM1H',    2),
  ('CAT_966G',      'Caterpillar', '966G',     3),
  ('VOLVO_861',     'Volvo',       '861',      4),
  ('DAEWOO_K4DEF',  'DAEWOO',      'K4DEF',    5),
  ('OTRO',          'Otro',        '',         99)
ON CONFLICT (codigo) DO NOTHING;


-- ============================================================
-- 3. TABLA PRINCIPAL: puntos_actividad
-- Incluye: dia (para filtro mismo-día) y updated_at (para edición)
-- ============================================================

CREATE TABLE puntos_actividad (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  usuario_id       VARCHAR(255)   NOT NULL,
  titulo_minero_id VARCHAR(255)   NOT NULL,

  latitud          NUMERIC(10, 8) NOT NULL,
  longitud         NUMERIC(11, 8) NOT NULL,

  -- Categoría
  categoria        VARCHAR(50)    NOT NULL,

  -- Ítem seleccionado del catálogo
  item_id          UUID           NULL,
  item_nombre      VARCHAR(150)   NULL,
  item_otro        TEXT           NULL,

  -- Maquinaria seleccionada del catálogo
  maquinaria_id    UUID           NULL,
  maquinaria_nombre VARCHAR(200)  NULL,
  maquinaria_otro  TEXT           NULL,

  -- Campos adicionales
  descripcion      TEXT,
  volumen_m3       NUMERIC(10, 2),

  -- Timestamps
  -- ✅ fecha: se guarda en hora Colombia (TIMESTAMP WITHOUT TIME ZONE)
  fecha            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- ✅ dia: calculado al insertar, permite filtrar "mismo día" sin zona horaria
  dia              DATE           NOT NULL,
  -- ✅ updated_at: se actualiza al editar
  updated_at       TIMESTAMP      NULL,

  CONSTRAINT fk_item
    FOREIGN KEY (item_id) REFERENCES puntos_items_catalogo(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_maquinaria
    FOREIGN KEY (maquinaria_id) REFERENCES maquinaria_catalogo(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_puntos_titulo     ON puntos_actividad (titulo_minero_id);
CREATE INDEX idx_puntos_fecha      ON puntos_actividad (fecha DESC);
CREATE INDEX idx_puntos_dia        ON puntos_actividad (dia);
CREATE INDEX idx_puntos_categoria  ON puntos_actividad (categoria);
CREATE INDEX idx_puntos_item       ON puntos_actividad (item_id);
CREATE INDEX idx_puntos_maquinaria ON puntos_actividad (maquinaria_id);