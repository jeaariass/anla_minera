const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Registrar punto de actividad
const registrarPunto = async (req, res) => {
  try {
    const {
      usuarioId,
      tituloMineroId,
      latitud,
      longitud,
      categoria,
      descripcion,
      maquinaria,
      volumenM3
    } = req.body;

    if (!usuarioId || !tituloMineroId || !latitud || !longitud || !categoria) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios'
      });
    }

    await prisma.$executeRaw`
      INSERT INTO puntos_actividad (
        usuario_id, titulo_minero_id, latitud, longitud, 
        categoria, descripcion, maquinaria, volumen_m3
      ) VALUES (
        ${usuarioId}, ${tituloMineroId}, ${latitud}, ${longitud},
        ${categoria}, ${descripcion || null}, ${maquinaria || null}, ${volumenM3 || null}
      )
    `;

    res.json({
      success: true,
      message: '📍 Punto registrado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error registrando punto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar punto',
      error: error.message
    });
  }
};

// Obtener puntos
const getPuntos = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;

    const puntos = await prisma.$queryRaw`
      SELECT 
        id,
        usuario_id as "usuarioId",
        titulo_minero_id as "tituloMineroId",
        latitud,
        longitud,
        categoria,
        descripcion,
        maquinaria,
        volumen_m3 as "volumenM3",
        fecha
      FROM puntos_actividad
      WHERE titulo_minero_id = ${tituloMineroId}
      ORDER BY fecha DESC
    `;

    res.json({
      success: true,
      data: puntos,
      total: puntos.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo puntos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener puntos',
      error: error.message
    });
  }
};

// Estadísticas de actividad
const getEstadisticas = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;

    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*)::INTEGER as "totalPuntos",
        COALESCE(SUM(volumen_m3), 0)::NUMERIC as "volumenTotal",
        COUNT(DISTINCT usuario_id)::INTEGER as "usuariosActivos"
      FROM puntos_actividad
      WHERE titulo_minero_id = ${tituloMineroId}
    `;

    // Convertir a números normales (por si acaso)
    const result = stats[0] || {
      totalPuntos: 0,
      volumenTotal: 0,
      usuariosActivos: 0
    };

    res.json({
      success: true,
      estadisticas: {
        totalPuntos: Number(result.totalPuntos) || 0,
        volumenTotal: Number(result.volumenTotal) || 0,
        usuariosActivos: Number(result.usuariosActivos) || 0
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

module.exports = {
  registrarPunto,
  getPuntos,
  getEstadisticas
};