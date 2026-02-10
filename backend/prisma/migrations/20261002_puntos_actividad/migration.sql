-- ============================================
-- TABLA: puntos_actividad
-- ============================================

CREATE TABLE puntos_actividad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    usuario_id VARCHAR(255) NOT NULL,
    titulo_minero_id VARCHAR(255) NOT NULL,
    
    latitud NUMERIC(10, 8) NOT NULL,
    longitud NUMERIC(11, 8) NOT NULL,
    
    categoria VARCHAR(50) NOT NULL,
    descripcion TEXT,
    maquinaria VARCHAR(255),
    volumen_m3 NUMERIC(10, 2),
    
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar consultas
CREATE INDEX idx_puntos_titulo ON puntos_actividad(titulo_minero_id);
CREATE INDEX idx_puntos_fecha ON puntos_actividad(fecha DESC);
CREATE INDEX idx_puntos_categoria ON puntos_actividad(categoria);