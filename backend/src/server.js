const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// SERVICIOS
const excelReports = require('./services/excelReports');
const simpleExporter = require('./services/simpleExporter');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE (SOLO UNA VEZ)
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
    'http://localhost:3000',            // dev local
    'https://ctglobal.com.co',          // dominio raíz
    'https://ctglobal.com.co/TU_MINA',  // ruta del frontend
    'http://192.168.0.5:3000',      
    'http://192.168.0.5:8081',      
    'http://192.168.0.5:19000',     
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================
// IMPORTAR Y REGISTRAR RUTAS
// ============================================
const androidRoutes = require('./routes/androidRoutes');
const puntosActividadRoutes = require('./routes/puntosActividadRoutes');
const reportRoutesSimple = require('./routes/reportRoutesSimple');

app.use('/api/android', androidRoutes);
app.use('/api/actividad', puntosActividadRoutes);
app.use('/api/reports', reportRoutesSimple);

// ============================================
// RUTAS BÁSICAS
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    mensaje: '🚀 Servidor ANM-FRI funcionando!',
    fecha: new Date().toISOString()
  });
});

// ... resto del código continúa igual

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: 'Conectado',
    version: '1.0.0'
  });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const count = await prisma.usuario.count();
    res.json({ 
      success: true,
      message: '✅ Conexión a base de datos exitosa',
      totalUsuarios: count
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: '❌ Error al conectar con la base de datos',
      error: error.message
    });
  }
});

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, rol, tituloMineroId } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Email, contraseña y nombre son obligatorios'
      });
    }

    const usuarioExiste = await prisma.usuario.findUnique({ where: { email } });

    if (usuarioExiste) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email,
        password: passwordHash,
        nombre,
        rol: rol || 'OPERADOR',
        tituloMineroId: tituloMineroId || null
      }
    });

    const { password: _, ...usuarioSinPassword } = nuevoUsuario;

    res.status(201).json({
      success: true,
      message: '✅ Usuario creado exitosamente',
      usuario: usuarioSinPassword
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error.message
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        tituloMinero: {
          select: {
            id: true,
            numeroTitulo: true,
            municipio: true,
            codigoMunicipio: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        rol: usuario.rol,
        tituloMineroId: usuario.tituloMineroId
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        tituloMinero: usuario.tituloMinero
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
});

app.get('/api/auth/perfil', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      usuario
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
      error: error.message
    });
  }
});

// ============================================
// FRI PRODUCCIÓN
// ============================================

app.post('/api/fri/produccion', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { 
      mineral, 
      horasOperativas, 
      unidadMedida, 
      cantidadProduccion, 
      materialEntraPlanta, 
      materialSalePlanta, 
      masaUnitaria, 
      observaciones 
    } = req.body;

    if (!mineral || !horasOperativas || !unidadMedida || !cantidadProduccion) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIProduccion.create({
      data: {
        fechaCorte: new Date(),
        mineral,
        horasOperativas: parseFloat(horasOperativas),
        unidadMedida,
        cantidadProduccion: parseFloat(cantidadProduccion),
        materialEntraPlanta: materialEntraPlanta ? parseFloat(materialEntraPlanta) : null,
        materialSalePlanta: materialSalePlanta ? parseFloat(materialSalePlanta) : null,
        masaUnitaria: masaUnitaria ? parseFloat(masaUnitaria) : null,
        observaciones: observaciones != null ? String(observaciones) : '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Producción creado', fri: nuevoFRI });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/produccion', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const fris = await prisma.fRIProduccion.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

app.put('/api/fri/produccion/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIProduccion.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { mineral, horasOperativas, unidadMedida, cantidadProduccion, materialEntraPlanta, materialSalePlanta, masaUnitaria, observaciones } = req.body;

    const friActualizado = await prisma.fRIProduccion.update({
      where: { id },
      data: {
        mineral,
        horasOperativas: horasOperativas ? parseFloat(horasOperativas) : undefined,
        unidadMedida,
        cantidadProduccion: cantidadProduccion ? parseFloat(cantidadProduccion) : undefined,
        materialEntraPlanta: materialEntraPlanta ? parseFloat(materialEntraPlanta) : null,
        materialSalePlanta: materialSalePlanta ? parseFloat(materialSalePlanta) : null,
        masaUnitaria: masaUnitaria ? parseFloat(masaUnitaria) : null,
        observaciones,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.json({ success: true, message: '✅ FRI actualizado', fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar FRI', error: error.message });
  }
});

app.delete('/api/fri/produccion/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIProduccion.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    await prisma.fRIProduccion.delete({ where: { id } });
    res.json({ success: true, message: '✅ FRI eliminado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar FRI', error: error.message });
  }
});

// ============================================
// FRI INVENTARIOS
// ============================================

app.post('/api/fri/inventarios', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { mineral, unidadMedida, inventarioInicialAcopio, inventarioFinalAcopio, ingresoAcopio, salidaAcopio, observaciones } = req.body;

    if (!mineral || inventarioInicialAcopio === undefined || inventarioFinalAcopio === undefined) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIInventarios.create({
      data: {
        fechaCorte: new Date(),
        mineral,
        unidadMedida: unidadMedida || 'TONELADAS',
        inventarioInicialAcopio: parseFloat(inventarioInicialAcopio),
        inventarioFinalAcopio: parseFloat(inventarioFinalAcopio),
        ingresoAcopio: ingresoAcopio ? parseFloat(ingresoAcopio) : 0,
        salidaAcopio: salidaAcopio ? parseFloat(salidaAcopio) : 0,
        observaciones: observaciones != null ? String(observaciones) : '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Inventarios creado', fri: nuevoFRI });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/inventarios', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const fris = await prisma.fRIInventarios.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

app.put('/api/fri/inventarios/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIInventarios.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { mineral, unidadMedida, inventarioInicialAcopio, inventarioFinalAcopio, ingresoAcopio, salidaAcopio, observaciones } = req.body;

    const friActualizado = await prisma.fRIInventarios.update({
      where: { id },
      data: {
        mineral,
        unidadMedida,
        inventarioInicialAcopio: inventarioInicialAcopio ? parseFloat(inventarioInicialAcopio) : undefined,
        inventarioFinalAcopio: inventarioFinalAcopio ? parseFloat(inventarioFinalAcopio) : undefined,
        ingresoAcopio: ingresoAcopio ? parseFloat(ingresoAcopio) : undefined,
        salidaAcopio: salidaAcopio ? parseFloat(salidaAcopio) : undefined,
        observaciones,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.json({ success: true, message: '✅ FRI actualizado', fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar FRI', error: error.message });
  }
});

app.delete('/api/fri/inventarios/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIInventarios.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    await prisma.fRIInventarios.delete({ where: { id } });
    res.json({ success: true, message: '✅ FRI eliminado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar FRI', error: error.message });
  }
});

// ============================================
// FRI PARADAS
// ============================================

app.post('/api/fri/paradas', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { tipoParada, fechaInicio, fechaFin, horasParadas, motivo, observaciones } = req.body;

    if (!tipoParada || !fechaInicio || !horasParadas || !motivo) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIParadas.create({
      data: {
        fechaCorte: new Date(),
        tipoParada,
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        horasParadas: parseFloat(horasParadas),
        motivo,
        observaciones: observaciones != null ? String(observaciones) : '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Paradas creado', fri: nuevoFRI });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/paradas', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const fris = await prisma.fRIParadas.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

app.put('/api/fri/paradas/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIParadas.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { tipoParada, fechaInicio, fechaFin, horasParadas, motivo, observaciones } = req.body;

    const friActualizado = await prisma.fRIParadas.update({
      where: { id },
      data: {
        tipoParada,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        horasParadas: horasParadas ? parseFloat(horasParadas) : undefined,
        motivo,
        observaciones,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.json({ success: true, message: '✅ FRI actualizado', fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar FRI', error: error.message });
  }
});

app.delete('/api/fri/paradas/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIParadas.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    await prisma.fRIParadas.delete({ where: { id } });
    res.json({ success: true, message: '✅ FRI eliminado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar FRI', error: error.message });
  }
});

// ============================================
// FRI EJECUCIÓN
// ============================================

app.post('/api/fri/ejecucion', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { mineral, denominacionFrente, latitud, longitud, metodoExplotacion, avanceEjecutado, unidadMedidaAvance, volumenEjecutado, observaciones } = req.body;

    if (!mineral || !denominacionFrente || !metodoExplotacion) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIEjecucion.create({
      data: {
        fechaCorte: new Date(),
        mineral,
        denominacionFrente,
        latitud: parseFloat(latitud) || 0,
        longitud: parseFloat(longitud) || 0,
        metodoExplotacion,
        avanceEjecutado: parseFloat(avanceEjecutado) || 0,
        unidadMedidaAvance: unidadMedidaAvance || 'm',
        volumenEjecutado: parseFloat(volumenEjecutado) || 0,
        observaciones: observaciones != null ? String(observaciones) : '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Ejecución creado', fri: nuevoFRI });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/ejecucion', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const fris = await prisma.fRIEjecucion.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

app.put('/api/fri/ejecucion/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIEjecucion.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { mineral, denominacionFrente, latitud, longitud, metodoExplotacion, avanceEjecutado, unidadMedidaAvance, volumenEjecutado, observaciones } = req.body;

    const friActualizado = await prisma.fRIEjecucion.update({
      where: { id },
      data: {
        mineral,
        denominacionFrente,
        latitud: latitud ? parseFloat(latitud) : undefined,
        longitud: longitud ? parseFloat(longitud) : undefined,
        metodoExplotacion,
        avanceEjecutado: avanceEjecutado ? parseFloat(avanceEjecutado) : undefined,
        unidadMedidaAvance,
        volumenEjecutado: volumenEjecutado ? parseFloat(volumenEjecutado) : undefined,
        observaciones,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.json({ success: true, message: '✅ FRI actualizado', fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar FRI', error: error.message });
  }
});

app.delete('/api/fri/ejecucion/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIEjecucion.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    await prisma.fRIEjecucion.delete({ where: { id } });
    res.json({ success: true, message: '✅ FRI eliminado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar FRI', error: error.message });
  }
});

// ============================================
// FRI MAQUINARIA
// ============================================

app.post('/api/fri/maquinaria', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { tipoMaquinaria, cantidad, horasOperacion, capacidadTransporte, unidadCapacidad, observaciones } = req.body;

    if (!tipoMaquinaria || !cantidad || !horasOperacion) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIMaquinaria.create({
      data: {
        fechaCorte: new Date(),
        tipoMaquinaria,
        cantidad: parseInt(cantidad),
        horasOperacion: parseFloat(horasOperacion),
        capacidadTransporte: capacidadTransporte ? parseFloat(capacidadTransporte) : null,
        unidadCapacidad: unidadCapacidad || null,
        observaciones: observaciones != null ? String(observaciones) : '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Maquinaria creado', fri: nuevoFRI });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/maquinaria', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const fris = await prisma.fRIMaquinaria.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

app.put('/api/fri/maquinaria/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIMaquinaria.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { tipoMaquinaria, cantidad, horasOperacion, capacidadTransporte, unidadCapacidad, observaciones } = req.body;

    const friActualizado = await prisma.fRIMaquinaria.update({
      where: { id },
      data: {
        tipoMaquinaria,
        cantidad: cantidad ? parseInt(cantidad) : undefined,
        horasOperacion: horasOperacion ? parseFloat(horasOperacion) : undefined,
        capacidadTransporte: capacidadTransporte ? parseFloat(capacidadTransporte) : null,
        unidadCapacidad,
        observaciones,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.json({ success: true, message: '✅ FRI actualizado', fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar FRI', error: error.message });
  }
});

app.delete('/api/fri/maquinaria/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIMaquinaria.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    await prisma.fRIMaquinaria.delete({ where: { id } });
    res.json({ success: true, message: '✅ FRI eliminado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar FRI', error: error.message });
  }
});

// ============================================
// FRI REGALÍAS
// ============================================

app.post('/api/fri/regalias', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { mineral, cantidadExtraida, unidadMedida, valorDeclaracion, valorContraprestaciones, resolucionUPME, observaciones } = req.body;

    if (!mineral || !cantidadExtraida || !valorDeclaracion) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIRegalias.create({
      data: {
        fechaCorte: new Date(),
        mineral,
        cantidadExtraida: parseFloat(cantidadExtraida),
        unidadMedida: unidadMedida || 'Kilogramos',
        valorDeclaracion: parseFloat(valorDeclaracion),
        valorContraprestaciones: valorContraprestaciones ? parseFloat(valorContraprestaciones) : null,
        resolucionUPME: resolucionUPME != null && resolucionUPME !== '' ? String(resolucionUPME) : null,
        observaciones: observaciones != null ? String(observaciones) : '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Regalías creado', fri: nuevoFRI });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/regalias', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const fris = await prisma.fRIRegalias.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

app.put('/api/fri/regalias/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIRegalias.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { mineral, cantidadExtraida, unidadMedida, valorDeclaracion, valorContraprestaciones, resolucionUPME, observaciones } = req.body;

    const friActualizado = await prisma.fRIRegalias.update({
      where: { id },
      data: {
        mineral,
        cantidadExtraida: cantidadExtraida ? parseFloat(cantidadExtraida) : undefined,
        unidadMedida,
        valorDeclaracion: valorDeclaracion ? parseFloat(valorDeclaracion) : undefined,
        valorContraprestaciones: valorContraprestaciones ? parseFloat(valorContraprestaciones) : null,
        resolucionUPME,
        observaciones,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.json({ success: true, message: '✅ FRI actualizado', fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar FRI', error: error.message });
  }
});

app.delete('/api/fri/regalias/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIRegalias.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    await prisma.fRIRegalias.delete({ where: { id } });
    res.json({ success: true, message: '✅ FRI eliminado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar FRI', error: error.message });
  }
});

// ============================================
// ENDPOINTS FALTANTES PARA AGREGAR A SERVER.JS
// Copiar y pegar ANTES de "ESTADÍSTICAS Y UTILIDADES"
// ============================================

// ============================================
// FRI CAPACIDAD (NUEVO)
// ============================================

app.post('/api/fri/capacidad', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { 
      areaProduccion, 
      tecnologiaUtilizada, 
      capacidadInstalada, 
      unidadMedida, 
      personalCapacitado, 
      certificaciones, 
      observaciones 
    } = req.body;

    if (!areaProduccion || !tecnologiaUtilizada || !capacidadInstalada || !unidadMedida || !personalCapacitado) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRICapacidad.create({
      data: {
        fechaCorte: new Date(),
        areaProduccion,
        tecnologiaUtilizada,
        capacidadInstalada: parseFloat(capacidadInstalada),
        unidadMedida,
        personalCapacitado: parseInt(personalCapacitado),
        certificaciones: certificaciones || null,
        observaciones: observaciones != null ? String(observaciones) : '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Capacidad creado', fri: nuevoFRI });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/capacidad', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const fris = await prisma.fRICapacidad.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

app.put('/api/fri/capacidad/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRICapacidad.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { areaProduccion, tecnologiaUtilizada, capacidadInstalada, unidadMedida, personalCapacitado, certificaciones, observaciones } = req.body;

    const friActualizado = await prisma.fRICapacidad.update({
      where: { id },
      data: {
        areaProduccion,
        tecnologiaUtilizada,
        capacidadInstalada: capacidadInstalada ? parseFloat(capacidadInstalada) : undefined,
        unidadMedida,
        personalCapacitado: personalCapacitado ? parseInt(personalCapacitado) : undefined,
        certificaciones,
        observaciones,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.json({ success: true, message: '✅ FRI actualizado', fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar FRI', error: error.message });
  }
});

app.delete('/api/fri/capacidad/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRICapacidad.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    await prisma.fRICapacidad.delete({ where: { id } });
    res.json({ success: true, message: '✅ FRI eliminado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar FRI', error: error.message });
  }
});

// ============================================
// FRI PROYECCIONES (NUEVO)
// ============================================

app.post('/api/fri/proyecciones', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { 
      metodoExplotacion, 
      mineral, 
      capacidadExtraccion, 
      capacidadTransporte, 
      capacidadBeneficio, 
      proyeccionTopografia, 
      densidadManto, 
      cantidadProyectada, 
      observaciones 
    } = req.body;

    if (!metodoExplotacion || !mineral || !capacidadExtraccion || !capacidadTransporte || !capacidadBeneficio || !cantidadProyectada) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIProyecciones.create({
      data: {
        fechaCorte: new Date(),
        metodoExplotacion,
        mineral,
        capacidadExtraccion: parseFloat(capacidadExtraccion),
        capacidadTransporte: parseFloat(capacidadTransporte),
        capacidadBeneficio: parseFloat(capacidadBeneficio),
        proyeccionTopografia: proyeccionTopografia || null,
        densidadManto: densidadManto ? parseFloat(densidadManto) : null,
        cantidadProyectada: parseFloat(cantidadProyectada),
        observaciones: observaciones != null ? String(observaciones) : '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Proyecciones creado', fri: nuevoFRI });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/proyecciones', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const fris = await prisma.fRIProyecciones.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

app.put('/api/fri/proyecciones/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIProyecciones.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { metodoExplotacion, mineral, capacidadExtraccion, capacidadTransporte, capacidadBeneficio, proyeccionTopografia, densidadManto, cantidadProyectada, observaciones } = req.body;

    const friActualizado = await prisma.fRIProyecciones.update({
      where: { id },
      data: {
        metodoExplotacion,
        mineral,
        capacidadExtraccion: capacidadExtraccion ? parseFloat(capacidadExtraccion) : undefined,
        capacidadTransporte: capacidadTransporte ? parseFloat(capacidadTransporte) : undefined,
        capacidadBeneficio: capacidadBeneficio ? parseFloat(capacidadBeneficio) : undefined,
        proyeccionTopografia,
        densidadManto: densidadManto ? parseFloat(densidadManto) : null,
        cantidadProyectada: cantidadProyectada ? parseFloat(cantidadProyectada) : undefined,
        observaciones,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.json({ success: true, message: '✅ FRI actualizado', fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar FRI', error: error.message });
  }
});

app.delete('/api/fri/proyecciones/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIProyecciones.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    await prisma.fRIProyecciones.delete({ where: { id } });
    res.json({ success: true, message: '✅ FRI eliminado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar FRI', error: error.message });
  }
});

// ============================================
// FRI INVENTARIO MAQUINARIA (NUEVO)
// ============================================

app.post('/api/fri/inventario-maquinaria', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { 
      tipoMaquinaria, 
      marca, 
      modelo, 
      anoFabricacion, 
      capacidad, 
      estadoOperativo, 
      observaciones 
    } = req.body;

    if (!tipoMaquinaria || !estadoOperativo) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIInventarioMaquinaria.create({
      data: {
        fechaCorte: new Date(),
        tipoMaquinaria,
        marca: marca != null && marca !== '' ? String(marca) : null,
        modelo: modelo != null && modelo !== '' ? String(modelo) : null,
        a_oFabricacion: anoFabricacion != null && anoFabricacion !== ''
          ? parseInt(anoFabricacion, 10)
          : null,capacidad: capacidad ? parseFloat(capacidad) : null,
        estadoOperativo,
        observaciones: observaciones != null ? String(observaciones) : '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Inventario Maquinaria creado', fri: nuevoFRI });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/inventario-maquinaria', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const fris = await prisma.fRIInventarioMaquinaria.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

app.put('/api/fri/inventario-maquinaria/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIInventarioMaquinaria.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { tipoMaquinaria, marca, modelo, anoFabricacion, capacidad, estadoOperativo, observaciones } = req.body;

    const friActualizado = await prisma.fRIInventarioMaquinaria.update({
      where: { id },
      data: {
        tipoMaquinaria,
        marca,
        modelo,
        anoFabricacion: anoFabricacion ? parseInt(anoFabricacion) : null,
        capacidad: capacidad ? parseFloat(capacidad) : null,
        estadoOperativo,
        observaciones,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.json({ success: true, message: '✅ FRI actualizado', fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar FRI', error: error.message });
  }
});

app.delete('/api/fri/inventario-maquinaria/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const friExistente = await prisma.fRIInventarioMaquinaria.findUnique({ where: { id } });
    if (!friExistente || (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    await prisma.fRIInventarioMaquinaria.delete({ where: { id } });
    res.json({ success: true, message: '✅ FRI eliminado' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar FRI', error: error.message });
  }
});

// ============================================
// INSTRUCCIONES DE IMPLEMENTACIÓN:
// 
// 1. Abre backend/src/server.js
// 2. Busca la sección: "// ============================================"
//                       "// ESTADÍSTICAS Y UTILIDADES"
// 3. PEGA TODO este código ANTES de esa sección
// 4. Guarda el archivo
// 5. Reinicia el servidor: Ctrl+C → npm start
// ============================================

// ============================================
// ESTADÍSTICAS Y UTILIDADES
// ============================================

app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        tituloMinero: {
          select: {
            numeroTitulo: true,
            municipio: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    res.json({ success: true, total: usuarios.length, usuarios });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
  }
});

app.get('/api/titulos-mineros', async (req, res) => {
  try {
    const titulos = await prisma.tituloMinero.findMany({
      orderBy: { numeroTitulo: 'asc' }
    });

    res.json({ success: true, total: titulos.length, titulos });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener títulos mineros', error: error.message });
  }
});

app.get('/api/fri/estadisticas', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const filtro = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const [totalTitulos, totalUsuarios, produccion, inventarios, paradas, ejecucion, maquinaria, regalias] = await Promise.all([
      prisma.tituloMinero.count(),
      prisma.usuario.count(),
      prisma.fRIProduccion.count({ where: filtro }),
      prisma.fRIInventarios.count({ where: filtro }),
      prisma.fRIParadas.count({ where: filtro }),
      prisma.fRIEjecucion.count({ where: filtro }),
      prisma.fRIMaquinaria.count({ where: filtro }),
      prisma.fRIRegalias.count({ where: filtro })
    ]);

    const totalFRIs = produccion + inventarios + paradas + ejecucion + maquinaria + regalias;

    res.json({
      success: true,
      estadisticas: {
        sistema: { titulosMineros: totalTitulos, usuarios: totalUsuarios, totalFRIs },
        porTipo: { produccion, inventarios, paradas, ejecucion, maquinaria, regalias }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
  }
});

app.get('/api/fri/borradores/count', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [produccion, inventarios, paradas, ejecucion, maquinaria, regalias] = await Promise.all([
      prisma.fRIProduccion.count({ where: { usuarioId: decoded.id, estado: 'BORRADOR' } }),
      prisma.fRIInventarios.count({ where: { usuarioId: decoded.id, estado: 'BORRADOR' } }),
      prisma.fRIParadas.count({ where: { usuarioId: decoded.id, estado: 'BORRADOR' } }),
      prisma.fRIEjecucion.count({ where: { usuarioId: decoded.id, estado: 'BORRADOR' } }),
      prisma.fRIMaquinaria.count({ where: { usuarioId: decoded.id, estado: 'BORRADOR' } }),
      prisma.fRIRegalias.count({ where: { usuarioId: decoded.id, estado: 'BORRADOR' } })
    ]);

    const total = produccion + inventarios + paradas + ejecucion + maquinaria + regalias;

    res.json({
      success: true,
      total,
      detalles: { produccion, inventarios, paradas, ejecucion, maquinaria, regalias }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al contar borradores', error: error.message });
  }
});

// ============================================
// CAMBIO DE ESTADOS
// ============================================

app.post('/api/fri/enviar-borradores', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [produccionActualizados, inventariosActualizados, paradasActualizadas, ejecucionActualizados, maquinariaActualizados, regaliasActualizados] = await Promise.all([
      prisma.fRIProduccion.updateMany({ where: { usuarioId: decoded.id, estado: 'BORRADOR' }, data: { estado: 'ENVIADO', updatedAt: new Date() } }),
      prisma.fRIInventarios.updateMany({ where: { usuarioId: decoded.id, estado: 'BORRADOR' }, data: { estado: 'ENVIADO', updatedAt: new Date() } }),
      prisma.fRIParadas.updateMany({ where: { usuarioId: decoded.id, estado: 'BORRADOR' }, data: { estado: 'ENVIADO', updatedAt: new Date() } }),
      prisma.fRIEjecucion.updateMany({ where: { usuarioId: decoded.id, estado: 'BORRADOR' }, data: { estado: 'ENVIADO', updatedAt: new Date() } }),
      prisma.fRIMaquinaria.updateMany({ where: { usuarioId: decoded.id, estado: 'BORRADOR' }, data: { estado: 'ENVIADO', updatedAt: new Date() } }),
      prisma.fRIRegalias.updateMany({ where: { usuarioId: decoded.id, estado: 'BORRADOR' }, data: { estado: 'ENVIADO', updatedAt: new Date() } })
    ]);

    const totalActualizados = produccionActualizados.count + inventariosActualizados.count + paradasActualizadas.count + ejecucionActualizados.count + maquinariaActualizados.count + regaliasActualizados.count;

    res.json({
      success: true,
      message: `✅ ${totalActualizados} formularios enviados correctamente`,
      detalles: {
        produccion: produccionActualizados.count,
        inventarios: inventariosActualizados.count,
        paradas: paradasActualizadas.count,
        ejecucion: ejecucionActualizados.count,
        maquinaria: maquinariaActualizados.count,
        regalias: regaliasActualizados.count
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al enviar borradores', error: error.message });
  }
});

app.put('/api/fri/:tipo/:id/estado', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { tipo, id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    const modelos = {
      'produccion': prisma.fRIProduccion,
      'inventarios': prisma.fRIInventarios,
      'paradas': prisma.fRIParadas,
      'ejecucion': prisma.fRIEjecucion,
      'maquinaria': prisma.fRIMaquinaria,
      'regalias': prisma.fRIRegalias,
      'capacidad': prisma.fRICapacidad,
      "inventario-maquinaria": prisma.fRIInventarioMaquinaria,
      inventarioMaquinaria: prisma.fRIInventarioMaquinaria,
      'proyecciones': prisma.fRIProyecciones,
    };

    const modelo = modelos[tipo];
    if (!modelo) {
      return res.status(400).json({ success: false, message: 'Tipo de FRI inválido' });
    }

    const friExistente = await modelo.findUnique({ where: { id } });
    if (!friExistente) {
      return res.status(404).json({ success: false, message: 'FRI no encontrado' });
    }

    if (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para cambiar el estado de este FRI' });
    }

    const friActualizado = await modelo.update({
      where: { id },
      data: { estado, updatedAt: new Date() },
      include: { usuario: { select: { id: true, nombre: true } } }
    });

    res.json({ success: true, message: `✅ Estado cambiado a ${estado}`, fri: friActualizado });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
});

// ============================================
// REPORTES Y EXPORTACIÓN
// ============================================

app.post('/api/reportes/exportar-anm', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { tipos = [], filtros = {} } = req.body || {};

    if (tipos.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar al menos un tipo de formulario' });
    }

    const whereClauses = {};
    
    if (filtros.fechaInicio && filtros.fechaFin) {
      whereClauses.fechaCorte = { gte: new Date(filtros.fechaInicio), lte: new Date(filtros.fechaFin) };
    } else if (filtros.fechaInicio) {
      whereClauses.fechaCorte = { gte: new Date(filtros.fechaInicio) };
    } else if (filtros.fechaFin) {
      whereClauses.fechaCorte = { lte: new Date(filtros.fechaFin) };
    }

    if (filtros.tituloMineroId) whereClauses.tituloMineroId = filtros.tituloMineroId;
    if (filtros.mineral) whereClauses.mineral = filtros.mineral;
    if (filtros.estado) whereClauses.estado = filtros.estado;
    if (decoded.rol !== 'ADMIN') whereClauses.usuarioId = decoded.id;

    const datosPorTipo = {};
    
    for (const tipo of tipos) {
      let modelo;
      switch(tipo) {
        case 'produccion': modelo = prisma.fRIProduccion; break;
        case 'inventarios': modelo = prisma.fRIInventarios; break;
        case 'paradas': modelo = prisma.fRIParadas; break;
        case 'ejecucion': modelo = prisma.fRIEjecucion; break;
        case 'maquinaria': modelo = prisma.fRIMaquinaria; break;
        case 'regalias': modelo = prisma.fRIRegalias; break;
        default: continue;
      }

      const datos = await modelo.findMany({
        where: whereClauses,
        include: {
          usuario: { select: { nombre: true } },
          tituloMinero: { select: { numeroTitulo: true, municipio: true, codigoMunicipio: true } }
        },
        orderBy: { fechaCorte: 'desc' }
      });

      if (datos.length > 0) datosPorTipo[tipo] = datos;
    }

    if (Object.keys(datosPorTipo).length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron datos con los filtros especificados' });
    }

    const workbook = await simpleExporter.generarExcelConsolidado(datosPorTipo);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=FRI_ANM_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar Excel', error: error.message });
  }
});

app.post('/api/reportes/exportar-pdf', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { tipos = [], filtros = {} } = req.body || {};

    if (tipos.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar al menos un tipo de formulario' });
    }

    const whereClauses = {};
    
    if (filtros.fechaInicio && filtros.fechaFin) {
      whereClauses.fechaCorte = { gte: new Date(filtros.fechaInicio), lte: new Date(filtros.fechaFin) };
    } else if (filtros.fechaInicio) {
      whereClauses.fechaCorte = { gte: new Date(filtros.fechaInicio) };
    } else if (filtros.fechaFin) {
      whereClauses.fechaCorte = { lte: new Date(filtros.fechaFin) };
    }

    if (filtros.tituloMineroId) whereClauses.tituloMineroId = filtros.tituloMineroId;
    if (filtros.mineral) whereClauses.mineral = filtros.mineral;
    if (filtros.estado) whereClauses.estado = filtros.estado;
    if (decoded.rol !== 'ADMIN') whereClauses.usuarioId = decoded.id;

    const datosPorTipo = {};
    
    for (const tipo of tipos) {
      let modelo;
      switch(tipo) {
        case 'produccion': modelo = prisma.fRIProduccion; break;
        case 'inventarios': modelo = prisma.fRIInventarios; break;
        case 'paradas': modelo = prisma.fRIParadas; break;
        case 'ejecucion': modelo = prisma.fRIEjecucion; break;
        case 'maquinaria': modelo = prisma.fRIMaquinaria; break;
        case 'regalias': modelo = prisma.fRIRegalias; break;
        default: continue;
      }

      const datos = await modelo.findMany({
        where: whereClauses,
        include: {
          usuario: { select: { nombre: true } },
          tituloMinero: { select: { numeroTitulo: true, municipio: true } }
        },
        orderBy: { fechaCorte: 'desc' }
      });

      if (datos.length > 0) datosPorTipo[tipo] = datos;
    }

    if (Object.keys(datosPorTipo).length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron datos con los filtros especificados' });
    }

    const pdfBuffer = await pdfExporter.generarPDFConsolidado(datosPorTipo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=FRI_ANM_${Date.now()}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar PDF', error: error.message });
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`\n✅ ========================================`);
  console.log(`✅ Servidor ANM-FRI corriendo en puerto ${PORT}`);
  console.log(`✅ ========================================`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Test BD: http://localhost:${PORT}/api/test-db`);
  console.log(`🚀 Endpoints disponibles:`);
  console.log(`   - POST/GET/PUT/DELETE /api/fri/produccion`);
  console.log(`   - POST/GET/PUT/DELETE /api/fri/inventarios`);
  console.log(`   - POST/GET/PUT/DELETE /api/fri/paradas`);
  console.log(`   - POST/GET/PUT/DELETE /api/fri/ejecucion`);
  console.log(`   - POST/GET/PUT/DELETE /api/fri/maquinaria`);
  console.log(`   - POST/GET/PUT/DELETE /api/fri/regalias`);
  console.log(`✅ ========================================\n`);
});