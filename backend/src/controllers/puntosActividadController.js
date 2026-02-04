const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Registrar punto de actividad
const registrarPunto = async (req, res) => {
  try {
    console.log('📥 Body recibido:', req.body);
    
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

    // Validar campos requeridos
    if (!usuarioId || !tituloMineroId || !latitud || !longitud || !categoria) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    const punto = await prisma.$executeRaw`
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
      message: 'Punto registrado exitosamente'
    });
  } catch (error) {
    console.error('Error registrando punto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar punto',
      error: error.message
    });
  }
};

// Obtener puntos de un título minero
const getPuntos = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;
    console.log('📍 Obteniendo puntos para título:', tituloMineroId);

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
        volumen_m3 as "volumen_m3",
        fecha
      FROM puntos_actividad
      WHERE titulo_minero_id = ${tituloMineroId}
      ORDER BY fecha DESC
    `;

    console.log(`✅ ${puntos.length} puntos encontrados`);

    res.json({
      success: true,
      data: puntos,
      total: puntos.length,
    });
  } catch (error) {
    console.error('❌ Error obteniendo puntos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener puntos',
      error: error.message,
    });
  }
};

// Obtener estadísticas
const getEstadisticas = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;

    const stats = await prisma.$queryRawUnsafe(`
      SELECT 
        categoria,
        COUNT(*)::int as total,
        COALESCE(SUM(volumen_m3), 0)::float as volumen_total
      FROM puntos_actividad
      WHERE titulo_minero_id = '${tituloMineroId}'
      GROUP BY categoria
    `);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

module.exports = {
  registrarPunto,
  getPuntos,
  getEstadisticas
};