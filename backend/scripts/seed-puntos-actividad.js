// backend/scripts/seed-puntos-actividad.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPuntosActividad() {
  console.log('🌱 Sembrando puntos de actividad...');

  try {
    // Coordenadas de Viterbo, Caldas
    const viterbo = {
      lat: 5.0689,
      lon: -75.5174,
    };

    // Coordenadas de Pereira, Risaralda
    const pereira = {
      lat: 4.8133,
      lon: -75.6961,
    };

    const puntos = [
      // VITERBO - Extracción
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: viterbo.lat + 0.001,
        longitud: viterbo.lon + 0.001,
        categoria: 'extraccion',
        descripcion: 'Frente de excavación Norte',
        maquinaria: 'Excavadora CAT-320',
        volumenM3: 45.5,
      },
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: viterbo.lat + 0.002,
        longitud: viterbo.lon - 0.001,
        categoria: 'extraccion',
        descripcion: 'Frente de excavación Sur',
        maquinaria: 'Retroexcavadora JCB',
        volumenM3: 38.2,
      },

      // VITERBO - Acopio
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: viterbo.lat - 0.001,
        longitud: viterbo.lon + 0.002,
        categoria: 'acopio',
        descripcion: 'Zona de acopio principal',
        maquinaria: 'Cargador Frontal',
        volumenM3: 120.8,
      },
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: viterbo.lat - 0.002,
        longitud: viterbo.lon - 0.002,
        categoria: 'acopio',
        descripcion: 'Zona de acopio secundaria',
        maquinaria: null,
        volumenM3: 85.3,
      },

      // VITERBO - Procesamiento
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: viterbo.lat + 0.003,
        longitud: viterbo.lon + 0.003,
        categoria: 'procesamiento',
        descripcion: 'Planta de beneficio',
        maquinaria: 'Molino triturador',
        volumenM3: 95.0,
      },

      // VITERBO - Inspección
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: viterbo.lat - 0.003,
        longitud: viterbo.lon + 0.001,
        categoria: 'inspeccion',
        descripcion: 'Punto de inspección ambiental',
        maquinaria: null,
        volumenM3: null,
      },

      // PEREIRA - Extracción
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: pereira.lat + 0.001,
        longitud: pereira.lon + 0.001,
        categoria: 'extraccion',
        descripcion: 'Frente de extracción Pereira Norte',
        maquinaria: 'Excavadora Komatsu',
        volumenM3: 52.7,
      },
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: pereira.lat + 0.002,
        longitud: pereira.lon - 0.002,
        categoria: 'extraccion',
        descripcion: 'Frente de extracción Pereira Sur',
        maquinaria: 'Bulldozer D6',
        volumenM3: 68.4,
      },

      // PEREIRA - Acopio
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: pereira.lat - 0.001,
        longitud: pereira.lon + 0.002,
        categoria: 'acopio',
        descripcion: 'Bodega de acopio Pereira',
        maquinaria: 'Montacargas',
        volumenM3: 150.5,
      },

      // PEREIRA - Procesamiento
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: pereira.lat + 0.003,
        longitud: pereira.lon + 0.003,
        categoria: 'procesamiento',
        descripcion: 'Planta de procesamiento Pereira',
        maquinaria: 'Criba vibratoria',
        volumenM3: 110.2,
      },

      // PEREIRA - Inspección
      {
        usuarioId: 'usr-oper-maria',
        tituloMineroId: 'titulo-816-17',
        latitud: pereira.lat - 0.003,
        longitud: pereira.lon - 0.001,
        categoria: 'inspeccion',
        descripcion: 'Control de calidad Pereira',
        maquinaria: null,
        volumenM3: null,
      },
    ];

    console.log(`📍 Insertando ${puntos.length} puntos...`);

    for (const punto of puntos) {
      await prisma.$executeRaw`
        INSERT INTO puntos_actividad (
          usuario_id, titulo_minero_id, latitud, longitud,
          categoria, descripcion, maquinaria, volumen_m3
        ) VALUES (
          ${punto.usuarioId},
          ${punto.tituloMineroId},
          ${punto.latitud},
          ${punto.longitud},
          ${punto.categoria},
          ${punto.descripcion},
          ${punto.maquinaria},
          ${punto.volumenM3}
        )
      `;
    }

    console.log('✅ Puntos insertados exitosamente!');

    // Verificar
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM puntos_actividad
    `;
    console.log('📊 Total de puntos en BD:', count[0].total);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPuntosActividad();