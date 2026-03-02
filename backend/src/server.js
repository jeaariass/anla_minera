const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// SERVICIOS
const excelReports = require("./services/excelReports");
const simpleExporter = require("./services/simpleExporter");

// -------------------------------------------------------
// CAMBIO: importamos también permisoMiddleware y los
// helpers de permissions.js que necesitamos en handlers
// -------------------------------------------------------
const {
  authMiddleware,
  roleMiddleware,
  permisoMiddleware,
} = require("./middleware/authMiddleware");

const {
  esRolGlobal,
  tienePermiso,
  puedeAccederATitulo,
  puedeGestionarUsuario,
} = require("./utils/permissions");

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE (SOLO UNA VEZ)
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:3000", // dev local
      "https://ctglobal.com.co", // dominio raíz
      "https://ctglobal.com.co/TU_MINA", // ruta del frontend

      // === DESARROLLO LOCAL ===
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://192.168.0.5:3000", // Frontend local en red
      "http://192.168.0.5:3001", // Backend local

      // === APP MÓVIL - DESARROLLO LOCAL ===
      "http://192.168.0.5:8081", // Expo Dev Server
      "http://192.168.0.5:19000", // Expo Metro
      "http://192.168.0.5:19006", // Expo Web
      "exp://192.168.0.5:8081", // Expo protocolo

      // === DESARROLLO LOCAL ===
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://192.168.1.6:3000", // Frontend local en red
      "http://192.168.1.6:3001", // Backend local

      // === APP MÓVIL - DESARROLLO LOCAL ===
      "http://192.168.1.6:8081", // Expo Dev Server
      "http://192.168.1.6:19000", // Expo Metro
      "http://192.168.1.6:19006", // Expo Web
      "exp://192.168.1.6:8081", // Expo protocolo

      // === PRODUCCIÓN - HOSTINGER/VPS ===
      "https://ctglobal.com.co", // Frontend producción raíz
      "https://www.ctglobal.com.co", // Con www
      "https://api.ctglobal.com.co", // API producción
      "http://200.7.107.14:3001", // VPS IP directo (si se usa)
      "http://200.7.107.14:5001", // VPS IP puerto alternativo

      // === APP MÓVIL - PRODUCCIÓN ===
      // Las apps móviles no tienen un "origen" fijo, se permite sin origin

      // Variable de entorno (opcional)
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ============================================
// IMPORTAR Y REGISTRAR RUTAS
// ============================================
const androidRoutes = require("./routes/androidRoutes");
const puntosActividadRoutes = require("./routes/puntosActividadRoutes");
const reportRoutesSimple = require("./routes/reportRoutesSimple");
const paradasRoutes = require("./routes/paradasRoutes");

app.use("/api/android", androidRoutes);
app.use("/api/actividad", puntosActividadRoutes);
app.use("/api/reports", reportRoutesSimple);
app.use("/api/paradas", paradasRoutes);

// ============================================
// RUTAS BÁSICAS (públicas)
// ============================================
app.get("/", (req, res) => {
  res.json({
    mensaje: "🚀 Servidor ANM-FRI funcionando!",
    fecha: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", database: "Conectado", version: "1.0.0" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const count = await prisma.usuario.count();
    res.json({
      success: true,
      message: "✅ Conexión a base de datos exitosa",
      totalUsuarios: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "❌ Error al conectar con la base de datos",
      error: error.message,
    });
  }
});

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

// CAMBIO: antes solo ADMIN podía registrar. Ahora usamos
// permisoMiddleware('CREAR_USUARIO') para que ADMIN, ASESOR
// y JEFE_PLANTA también puedan, cada uno con sus restricciones
// verificadas dentro del handler con puedeGestionarUsuario().
app.post(
  "/api/auth/register",
  authMiddleware,
  permisoMiddleware("CREAR_USUARIO"),
  async (req, res) => {
    try {
      const { email, password, nombre, rol, tituloMineroId } = req.body;

      if (!email || !password || !nombre) {
        return res.status(400).json({
          success: false,
          message: "Email, contraseña y nombre son obligatorios",
        });
      }

      // CAMBIO: verificamos que el creador pueda gestionar
      // al usuario que intenta crear (rol + título minero)
      const usuarioObjetivo = {
        rol: rol || "OPERARIO",
        tituloMineroId: tituloMineroId || null,
      };
      if (!puedeGestionarUsuario(req.user, usuarioObjetivo)) {
        return res.status(403).json({
          success: false,
          message:
            "No tienes permiso para crear un usuario con ese rol o en ese título minero",
        });
      }

      const usuarioExiste = await prisma.usuario.findUnique({
        where: { email },
      });
      if (usuarioExiste) {
        return res
          .status(400)
          .json({ success: false, message: "El email ya está registrado" });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // CAMBIO: si es JEFE_PLANTA, el tituloMineroId del nuevo
      // usuario se fuerza a ser el suyo propio, no el del body
      const tituloFinal =
        req.user.rol === "JEFE_PLANTA"
          ? req.user.tituloMineroId
          : tituloMineroId || null;

      const nuevoUsuario = await prisma.usuario.create({
        data: {
          email,
          password: passwordHash,
          nombre,
          rol: rol || "OPERARIO",
          tituloMineroId: tituloFinal,
        },
      });

      const { password: _, ...usuarioSinPassword } = nuevoUsuario;
      res.status(201).json({
        success: true,
        message: "✅ Usuario creado exitosamente",
        usuario: usuarioSinPassword,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear usuario",
        error: error.message,
      });
    }
  },
);

// Login — sin cambios
app.post("/api/auth/login", async (req, res) => {
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
            codigoMunicipio: true,
          },
        },
      },
    });

    if (!usuario) {
      return res
        .status(401)
        .json({ success: false, message: "Email o contraseña incorrectos" });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: "Usuario desactivado. Contacte al administrador",
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res
        .status(401)
        .json({ success: false, message: "Email o contraseña incorrectos" });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        tituloMineroId: usuario.tituloMineroId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      message: "Login exitoso",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        tituloMinero: usuario.tituloMinero,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: error.message,
    });
  }
});

// Perfil — sin cambios
app.get("/api/auth/perfil", authMiddleware, async (req, res) => {
  try {
    const usuario = req.user;
    res.json({
      success: true,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        activo: usuario.activo,
        createdAt: usuario.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: error.message,
    });
  }
});

// ============================================
// HELPER: construir filtro WHERE para FRIs
// ============================================
// CAMBIO: reemplaza el patrón repetido
//   req.user.rol !== "ADMIN" ? { usuarioId: req.user.id } : {}
// por uno que filtra correctamente por tituloMineroId para
// roles locales (TITULAR, JEFE_PLANTA) en lugar de por usuarioId,
// y no filtra nada para roles globales (ADMIN, ASESOR).
const buildFiltroFRI = (usuario) => {
  if (esRolGlobal(usuario)) return {};
  if (!usuario.tituloMineroId) return { id: "sin-titulo-asignado" }; // devuelve vacío sin exponer datos
  return { tituloMineroId: usuario.tituloMineroId };
};

// ============================================
// HELPER: verificar que un FRI no está APROBADO
// antes de editarlo o eliminarlo
// ============================================
const bloquearSiAprobado = (fri, res) => {
  if (fri.estado === "APROBADO") {
    res.status(403).json({
      success: false,
      message: "No se puede modificar un FRI en estado APROBADO",
    });
    return true;
  }
  return false;
};

// ============================================
// FRI PRODUCCIÓN
// ============================================

// CAMBIO: POST protegido con CREAR_FRI (solo ADMIN y ASESOR)
app.post(
  "/api/fri/produccion",
  authMiddleware,
  permisoMiddleware("CREAR_FRI"),
  async (req, res) => {
    try {
      const {
        mineral,
        horasOperativas,
        unidadMedida,
        cantidadProduccion,
        materialEntraPlanta,
        materialSalePlanta,
        masaUnitaria,
        observaciones,
      } = req.body;

      if (
        !mineral ||
        !horasOperativas ||
        !unidadMedida ||
        !cantidadProduccion
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      const usuario = req.user;
      if (!usuario.tituloMineroId) {
        return res.status(400).json({
          success: false,
          message: "Usuario debe estar asociado a un título minero",
        });
      }

      const nuevoFRI = await prisma.fRIProduccion.create({
        data: {
          fechaCorte: new Date(),
          mineral,
          horasOperativas: parseFloat(horasOperativas),
          unidadMedida,
          cantidadProduccion: parseFloat(cantidadProduccion),
          materialEntraPlanta: materialEntraPlanta
            ? parseFloat(materialEntraPlanta)
            : null,
          materialSalePlanta: materialSalePlanta
            ? parseFloat(materialSalePlanta)
            : null,
          masaUnitaria: masaUnitaria ? parseFloat(masaUnitaria) : null,
          observaciones: observaciones != null ? String(observaciones) : "",
          estado: "BORRADOR",
          usuarioId: usuario.id,
          tituloMineroId: usuario.tituloMineroId,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "✅ FRI Producción creado",
        fri: nuevoFRI,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear FRI",
        error: error.message,
      });
    }
  },
);

// CAMBIO: GET usa buildFiltroFRI para filtrar por título minero
app.get(
  "/api/fri/produccion",
  authMiddleware,
  permisoMiddleware("VER_FRI"),
  async (req, res) => {
    try {
      const fris = await prisma.fRIProduccion.findMany({
        where: buildFiltroFRI(req.user),
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, total: fris.length, fris });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener FRIs",
        error: error.message,
      });
    }
  },
);

// CAMBIO: PUT protegido con EDITAR_FRI + bloqueo si APROBADO
app.put(
  "/api/fri/produccion/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIProduccion.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      const {
        mineral,
        horasOperativas,
        unidadMedida,
        cantidadProduccion,
        materialEntraPlanta,
        materialSalePlanta,
        masaUnitaria,
        observaciones,
      } = req.body;

      const friActualizado = await prisma.fRIProduccion.update({
        where: { id },
        data: {
          mineral,
          horasOperativas: horasOperativas
            ? parseFloat(horasOperativas)
            : undefined,
          unidadMedida,
          cantidadProduccion: cantidadProduccion
            ? parseFloat(cantidadProduccion)
            : undefined,
          materialEntraPlanta: materialEntraPlanta
            ? parseFloat(materialEntraPlanta)
            : null,
          materialSalePlanta: materialSalePlanta
            ? parseFloat(materialSalePlanta)
            : null,
          masaUnitaria: masaUnitaria ? parseFloat(masaUnitaria) : null,
          observaciones:
            observaciones != null ? String(observaciones) : undefined,
          updatedAt: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.json({
        success: true,
        message: "✅ FRI actualizado",
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar FRI",
        error: error.message,
      });
    }
  },
);

// CAMBIO: DELETE protegido con ELIMINAR_FRI (solo ADMIN) + bloqueo si APROBADO
app.delete(
  "/api/fri/produccion/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIProduccion.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;

      await prisma.fRIProduccion.delete({ where: { id } });
      res.json({ success: true, message: "✅ FRI eliminado" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar FRI",
        error: error.message,
      });
    }
  },
);

// ============================================
// FRI INVENTARIOS
// ============================================

app.post(
  "/api/fri/inventarios",
  authMiddleware,
  permisoMiddleware("CREAR_FRI"),
  async (req, res) => {
    try {
      const {
        mineral,
        unidadMedida,
        inventarioInicialAcopio,
        inventarioFinalAcopio,
        ingresoAcopio,
        salidaAcopio,
        observaciones,
      } = req.body;

      if (
        !mineral ||
        inventarioInicialAcopio === undefined ||
        inventarioFinalAcopio === undefined
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      const usuario = req.user;
      if (!usuario.tituloMineroId) {
        return res.status(400).json({
          success: false,
          message: "Usuario debe estar asociado a un título minero",
        });
      }

      const nuevoFRI = await prisma.fRIInventarios.create({
        data: {
          fechaCorte: new Date(),
          mineral,
          unidadMedida: unidadMedida || "TONELADAS",
          inventarioInicialAcopio: parseFloat(inventarioInicialAcopio),
          inventarioFinalAcopio: parseFloat(inventarioFinalAcopio),
          ingresoAcopio: ingresoAcopio ? parseFloat(ingresoAcopio) : 0,
          salidaAcopio: salidaAcopio ? parseFloat(salidaAcopio) : 0,
          observaciones: observaciones != null ? String(observaciones) : "",
          estado: "BORRADOR",
          usuarioId: usuario.id,
          tituloMineroId: usuario.tituloMineroId,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "✅ FRI Inventarios creado",
        fri: nuevoFRI,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear FRI",
        error: error.message,
      });
    }
  },
);

app.get(
  "/api/fri/inventarios",
  authMiddleware,
  permisoMiddleware("VER_FRI"),
  async (req, res) => {
    try {
      const fris = await prisma.fRIInventarios.findMany({
        where: buildFiltroFRI(req.user),
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, total: fris.length, fris });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener FRIs",
        error: error.message,
      });
    }
  },
);

app.put(
  "/api/fri/inventarios/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIInventarios.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      const {
        mineral,
        unidadMedida,
        inventarioInicialAcopio,
        inventarioFinalAcopio,
        ingresoAcopio,
        salidaAcopio,
        observaciones,
      } = req.body;

      const friActualizado = await prisma.fRIInventarios.update({
        where: { id },
        data: {
          mineral,
          unidadMedida,
          inventarioInicialAcopio:
            inventarioInicialAcopio !== undefined
              ? parseFloat(inventarioInicialAcopio)
              : undefined,
          inventarioFinalAcopio:
            inventarioFinalAcopio !== undefined
              ? parseFloat(inventarioFinalAcopio)
              : undefined,
          ingresoAcopio:
            ingresoAcopio !== undefined ? parseFloat(ingresoAcopio) : undefined,
          salidaAcopio:
            salidaAcopio !== undefined ? parseFloat(salidaAcopio) : undefined,
          observaciones:
            observaciones != null ? String(observaciones) : undefined,
          updatedAt: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.json({
        success: true,
        message: "✅ FRI actualizado",
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar FRI",
        error: error.message,
      });
    }
  },
);

app.delete(
  "/api/fri/inventarios/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIInventarios.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;

      await prisma.fRIInventarios.delete({ where: { id } });
      res.json({ success: true, message: "✅ FRI eliminado" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar FRI",
        error: error.message,
      });
    }
  },
);

// ============================================
// FRI PARADAS
// ============================================

app.post(
  "/api/fri/paradas",
  authMiddleware,
  permisoMiddleware("CREAR_FRI"),
  async (req, res) => {
    try {
      const {
        tipoParada,
        fechaInicio,
        fechaFin,
        horasParadas,
        motivo,
        observaciones,
      } = req.body;

      if (!tipoParada || !fechaInicio || !horasParadas || !motivo) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      const usuario = req.user;
      if (!usuario.tituloMineroId) {
        return res.status(400).json({
          success: false,
          message: "Usuario debe estar asociado a un título minero",
        });
      }

      const nuevoFRI = await prisma.fRIParadas.create({
        data: {
          fechaCorte: new Date(),
          tipoParada,
          fechaInicio: new Date(fechaInicio),
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          horasParadas: parseFloat(horasParadas),
          motivo,
          observaciones: observaciones != null ? String(observaciones) : "",
          estado: "BORRADOR",
          usuarioId: usuario.id,
          tituloMineroId: usuario.tituloMineroId,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "✅ FRI Paradas creado",
        fri: nuevoFRI,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear FRI",
        error: error.message,
      });
    }
  },
);

app.get(
  "/api/fri/paradas",
  authMiddleware,
  permisoMiddleware("VER_FRI"),
  async (req, res) => {
    try {
      const fris = await prisma.fRIParadas.findMany({
        where: buildFiltroFRI(req.user),
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, total: fris.length, fris });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener FRIs",
        error: error.message,
      });
    }
  },
);

app.put(
  "/api/fri/paradas/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIParadas.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      const {
        tipoParada,
        fechaInicio,
        fechaFin,
        horasParadas,
        motivo,
        observaciones,
      } = req.body;

      const friActualizado = await prisma.fRIParadas.update({
        where: { id },
        data: {
          tipoParada,
          fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          horasParadas: horasParadas ? parseFloat(horasParadas) : undefined,
          motivo,
          observaciones:
            observaciones != null ? String(observaciones) : undefined,
          updatedAt: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.json({
        success: true,
        message: "✅ FRI actualizado",
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar FRI",
        error: error.message,
      });
    }
  },
);

app.delete(
  "/api/fri/paradas/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIParadas.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;

      await prisma.fRIParadas.delete({ where: { id } });
      res.json({ success: true, message: "✅ FRI eliminado" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar FRI",
        error: error.message,
      });
    }
  },
);

// ============================================
// FRI EJECUCIÓN
// ============================================

app.post(
  "/api/fri/ejecucion",
  authMiddleware,
  permisoMiddleware("CREAR_FRI"),
  async (req, res) => {
    try {
      const {
        mineral,
        denominacionFrente,
        latitud,
        longitud,
        metodoExplotacion,
        avanceEjecutado,
        unidadMedidaAvance,
        volumenEjecutado,
        observaciones,
      } = req.body;

      if (!mineral || !denominacionFrente || !metodoExplotacion) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      const usuario = req.user;
      if (!usuario.tituloMineroId) {
        return res.status(400).json({
          success: false,
          message: "Usuario debe estar asociado a un título minero",
        });
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
          unidadMedidaAvance: unidadMedidaAvance || "m",
          volumenEjecutado: parseFloat(volumenEjecutado) || 0,
          observaciones: observaciones != null ? String(observaciones) : "",
          estado: "BORRADOR",
          usuarioId: usuario.id,
          tituloMineroId: usuario.tituloMineroId,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "✅ FRI Ejecución creado",
        fri: nuevoFRI,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear FRI",
        error: error.message,
      });
    }
  },
);

app.get(
  "/api/fri/ejecucion",
  authMiddleware,
  permisoMiddleware("VER_FRI"),
  async (req, res) => {
    try {
      const fris = await prisma.fRIEjecucion.findMany({
        where: buildFiltroFRI(req.user),
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, total: fris.length, fris });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener FRIs",
        error: error.message,
      });
    }
  },
);

app.put(
  "/api/fri/ejecucion/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIEjecucion.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      const {
        mineral,
        denominacionFrente,
        latitud,
        longitud,
        metodoExplotacion,
        avanceEjecutado,
        unidadMedidaAvance,
        volumenEjecutado,
        observaciones,
      } = req.body;

      const friActualizado = await prisma.fRIEjecucion.update({
        where: { id },
        data: {
          mineral,
          denominacionFrente,
          latitud: latitud ? parseFloat(latitud) : undefined,
          longitud: longitud ? parseFloat(longitud) : undefined,
          metodoExplotacion,
          avanceEjecutado: avanceEjecutado
            ? parseFloat(avanceEjecutado)
            : undefined,
          unidadMedidaAvance,
          volumenEjecutado: volumenEjecutado
            ? parseFloat(volumenEjecutado)
            : undefined,
          observaciones:
            observaciones != null ? String(observaciones) : undefined,
          updatedAt: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.json({
        success: true,
        message: "✅ FRI actualizado",
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar FRI",
        error: error.message,
      });
    }
  },
);

app.delete(
  "/api/fri/ejecucion/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIEjecucion.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;

      await prisma.fRIEjecucion.delete({ where: { id } });
      res.json({ success: true, message: "✅ FRI eliminado" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar FRI",
        error: error.message,
      });
    }
  },
);

// ============================================
// FRI MAQUINARIA
// ============================================

app.post(
  "/api/fri/maquinaria",
  authMiddleware,
  permisoMiddleware("CREAR_FRI"),
  async (req, res) => {
    try {
      const {
        tipoMaquinaria,
        cantidad,
        horasOperacion,
        capacidadTransporte,
        unidadCapacidad,
        observaciones,
      } = req.body;

      if (!tipoMaquinaria || !cantidad || !horasOperacion) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      const usuario = req.user;
      if (!usuario.tituloMineroId) {
        return res.status(400).json({
          success: false,
          message: "Usuario debe estar asociado a un título minero",
        });
      }

      const nuevoFRI = await prisma.fRIMaquinaria.create({
        data: {
          fechaCorte: new Date(),
          tipoMaquinaria,
          cantidad: parseInt(cantidad),
          horasOperacion: parseFloat(horasOperacion),
          capacidadTransporte: capacidadTransporte
            ? parseFloat(capacidadTransporte)
            : null,
          unidadCapacidad: unidadCapacidad || null,
          observaciones: observaciones != null ? String(observaciones) : "",
          estado: "BORRADOR",
          usuarioId: usuario.id,
          tituloMineroId: usuario.tituloMineroId,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "✅ FRI Maquinaria creado",
        fri: nuevoFRI,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear FRI",
        error: error.message,
      });
    }
  },
);

app.get(
  "/api/fri/maquinaria",
  authMiddleware,
  permisoMiddleware("VER_FRI"),
  async (req, res) => {
    try {
      const fris = await prisma.fRIMaquinaria.findMany({
        where: buildFiltroFRI(req.user),
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, total: fris.length, fris });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener FRIs",
        error: error.message,
      });
    }
  },
);

app.put(
  "/api/fri/maquinaria/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIMaquinaria.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      const {
        tipoMaquinaria,
        cantidad,
        horasOperacion,
        capacidadTransporte,
        unidadCapacidad,
        observaciones,
      } = req.body;

      const friActualizado = await prisma.fRIMaquinaria.update({
        where: { id },
        data: {
          tipoMaquinaria,
          cantidad: cantidad ? parseInt(cantidad) : undefined,
          horasOperacion: horasOperacion
            ? parseFloat(horasOperacion)
            : undefined,
          capacidadTransporte: capacidadTransporte
            ? parseFloat(capacidadTransporte)
            : null,
          unidadCapacidad,
          observaciones:
            observaciones != null ? String(observaciones) : undefined,
          updatedAt: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.json({
        success: true,
        message: "✅ FRI actualizado",
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar FRI",
        error: error.message,
      });
    }
  },
);

app.delete(
  "/api/fri/maquinaria/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIMaquinaria.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;

      await prisma.fRIMaquinaria.delete({ where: { id } });
      res.json({ success: true, message: "✅ FRI eliminado" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar FRI",
        error: error.message,
      });
    }
  },
);

// ============================================
// FRI REGALÍAS
// ============================================

app.post(
  "/api/fri/regalias",
  authMiddleware,
  permisoMiddleware("CREAR_FRI"),
  async (req, res) => {
    try {
      const {
        mineral,
        cantidadExtraida,
        unidadMedida,
        valorDeclaracion,
        valorContraprestaciones,
        resolucionUPME,
        observaciones,
      } = req.body;

      if (!mineral || !cantidadExtraida || !valorDeclaracion) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      const usuario = req.user;
      if (!usuario.tituloMineroId) {
        return res.status(400).json({
          success: false,
          message: "Usuario debe estar asociado a un título minero",
        });
      }

      const nuevoFRI = await prisma.fRIRegalias.create({
        data: {
          fechaCorte: new Date(),
          mineral,
          cantidadExtraida: parseFloat(cantidadExtraida),
          unidadMedida: unidadMedida || "Kilogramos",
          valorDeclaracion: parseFloat(valorDeclaracion),
          valorContraprestaciones: valorContraprestaciones
            ? parseFloat(valorContraprestaciones)
            : null,
          resolucionUPME:
            resolucionUPME != null && resolucionUPME !== ""
              ? String(resolucionUPME)
              : null,
          observaciones: observaciones != null ? String(observaciones) : "",
          estado: "BORRADOR",
          usuarioId: usuario.id,
          tituloMineroId: usuario.tituloMineroId,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "✅ FRI Regalías creado",
        fri: nuevoFRI,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear FRI",
        error: error.message,
      });
    }
  },
);

app.get(
  "/api/fri/regalias",
  authMiddleware,
  permisoMiddleware("VER_FRI"),
  async (req, res) => {
    try {
      const fris = await prisma.fRIRegalias.findMany({
        where: buildFiltroFRI(req.user),
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, total: fris.length, fris });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener FRIs",
        error: error.message,
      });
    }
  },
);

app.put(
  "/api/fri/regalias/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIRegalias.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      const {
        mineral,
        cantidadExtraida,
        unidadMedida,
        valorDeclaracion,
        valorContraprestaciones,
        resolucionUPME,
        observaciones,
      } = req.body;

      const friActualizado = await prisma.fRIRegalias.update({
        where: { id },
        data: {
          mineral,
          cantidadExtraida: cantidadExtraida
            ? parseFloat(cantidadExtraida)
            : undefined,
          unidadMedida,
          valorDeclaracion: valorDeclaracion
            ? parseFloat(valorDeclaracion)
            : undefined,
          valorContraprestaciones: valorContraprestaciones
            ? parseFloat(valorContraprestaciones)
            : null,
          resolucionUPME,
          observaciones:
            observaciones != null ? String(observaciones) : undefined,
          updatedAt: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.json({
        success: true,
        message: "✅ FRI actualizado",
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar FRI",
        error: error.message,
      });
    }
  },
);

// CAMBIO: se elimina roleMiddleware(["ADMIN","USER"]) que usaba
// un rol "USER" inexistente. Reemplazado por permisoMiddleware.
app.delete(
  "/api/fri/regalias/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIRegalias.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;

      await prisma.fRIRegalias.delete({ where: { id } });
      res.json({ success: true, message: "✅ FRI eliminado" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar FRI",
        error: error.message,
      });
    }
  },
);

// ============================================
// FRI CAPACIDAD
// ============================================

app.post(
  "/api/fri/capacidad",
  authMiddleware,
  permisoMiddleware("CREAR_FRI"),
  async (req, res) => {
    try {
      const {
        areaProduccion,
        tecnologiaUtilizada,
        capacidadInstalada,
        unidadMedida,
        personalCapacitado,
        certificaciones,
        observaciones,
      } = req.body;

      if (
        !areaProduccion ||
        !tecnologiaUtilizada ||
        !capacidadInstalada ||
        !unidadMedida ||
        !personalCapacitado
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      const usuario = req.user;
      if (!usuario.tituloMineroId) {
        return res.status(400).json({
          success: false,
          message: "Usuario debe estar asociado a un título minero",
        });
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
          observaciones: observaciones != null ? String(observaciones) : "",
          estado: "BORRADOR",
          usuarioId: usuario.id,
          tituloMineroId: usuario.tituloMineroId,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "✅ FRI Capacidad creado",
        fri: nuevoFRI,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear FRI",
        error: error.message,
      });
    }
  },
);

app.get(
  "/api/fri/capacidad",
  authMiddleware,
  permisoMiddleware("VER_FRI"),
  async (req, res) => {
    try {
      const fris = await prisma.fRICapacidad.findMany({
        where: buildFiltroFRI(req.user),
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, total: fris.length, fris });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener FRIs",
        error: error.message,
      });
    }
  },
);

app.put(
  "/api/fri/capacidad/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRICapacidad.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      const {
        areaProduccion,
        tecnologiaUtilizada,
        capacidadInstalada,
        unidadMedida,
        personalCapacitado,
        certificaciones,
        observaciones,
      } = req.body;

      const friActualizado = await prisma.fRICapacidad.update({
        where: { id },
        data: {
          areaProduccion,
          tecnologiaUtilizada,
          capacidadInstalada: capacidadInstalada
            ? parseFloat(capacidadInstalada)
            : undefined,
          unidadMedida,
          personalCapacitado: personalCapacitado
            ? parseInt(personalCapacitado)
            : undefined,
          certificaciones,
          observaciones:
            observaciones != null ? String(observaciones) : undefined,
          updatedAt: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.json({
        success: true,
        message: "✅ FRI actualizado",
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar FRI",
        error: error.message,
      });
    }
  },
);

app.delete(
  "/api/fri/capacidad/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRICapacidad.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;

      await prisma.fRICapacidad.delete({ where: { id } });
      res.json({ success: true, message: "✅ FRI eliminado" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar FRI",
        error: error.message,
      });
    }
  },
);

// ============================================
// FRI PROYECCIONES
// ============================================

// CAMBIO: se elimina roleMiddleware(["ADMIN","MINERO"]) que usaba
// un rol "MINERO" inexistente. Reemplazado por permisoMiddleware.
app.post(
  "/api/fri/proyecciones",
  authMiddleware,
  permisoMiddleware("CREAR_FRI"),
  async (req, res) => {
    try {
      const {
        metodoExplotacion,
        mineral,
        capacidadExtraccion,
        capacidadTransporte,
        capacidadBeneficio,
        proyeccionTopografia,
        densidadManto,
        cantidadProyectada,
        observaciones,
      } = req.body;

      if (
        !metodoExplotacion ||
        !mineral ||
        !capacidadExtraccion ||
        !capacidadTransporte ||
        !capacidadBeneficio ||
        !cantidadProyectada
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      const usuario = req.user;
      if (!usuario.tituloMineroId) {
        return res.status(400).json({
          success: false,
          message: "Usuario debe estar asociado a un título minero",
        });
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
          observaciones: observaciones != null ? String(observaciones) : "",
          estado: "BORRADOR",
          usuarioId: usuario.id,
          tituloMineroId: usuario.tituloMineroId,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "✅ FRI Proyecciones creado",
        fri: nuevoFRI,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear FRI",
        error: error.message,
      });
    }
  },
);

app.get(
  "/api/fri/proyecciones",
  authMiddleware,
  permisoMiddleware("VER_FRI"),
  async (req, res) => {
    try {
      const fris = await prisma.fRIProyecciones.findMany({
        where: buildFiltroFRI(req.user),
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, total: fris.length, fris });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener FRIs",
        error: error.message,
      });
    }
  },
);

app.put(
  "/api/fri/proyecciones/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIProyecciones.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      const {
        metodoExplotacion,
        mineral,
        capacidadExtraccion,
        capacidadTransporte,
        capacidadBeneficio,
        proyeccionTopografia,
        densidadManto,
        cantidadProyectada,
        observaciones,
      } = req.body;

      const friActualizado = await prisma.fRIProyecciones.update({
        where: { id },
        data: {
          metodoExplotacion,
          mineral,
          capacidadExtraccion: capacidadExtraccion
            ? parseFloat(capacidadExtraccion)
            : undefined,
          capacidadTransporte: capacidadTransporte
            ? parseFloat(capacidadTransporte)
            : undefined,
          capacidadBeneficio: capacidadBeneficio
            ? parseFloat(capacidadBeneficio)
            : undefined,
          proyeccionTopografia,
          densidadManto: densidadManto ? parseFloat(densidadManto) : null,
          cantidadProyectada: cantidadProyectada
            ? parseFloat(cantidadProyectada)
            : undefined,
          observaciones:
            observaciones != null ? String(observaciones) : undefined,
          updatedAt: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.json({
        success: true,
        message: "✅ FRI actualizado",
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar FRI",
        error: error.message,
      });
    }
  },
);

app.delete(
  "/api/fri/proyecciones/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIProyecciones.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;

      await prisma.fRIProyecciones.delete({ where: { id } });
      res.json({ success: true, message: "✅ FRI eliminado" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar FRI",
        error: error.message,
      });
    }
  },
);

// ============================================
// FRI INVENTARIO MAQUINARIA
// ============================================

app.post(
  "/api/fri/inventario-maquinaria",
  authMiddleware,
  permisoMiddleware("CREAR_FRI"),
  async (req, res) => {
    try {
      const {
        tipoMaquinaria,
        marca,
        modelo,
        anoFabricacion,
        capacidad,
        estadoOperativo,
        observaciones,
      } = req.body;

      if (!tipoMaquinaria || !estadoOperativo) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      const usuario = req.user;
      if (!usuario.tituloMineroId) {
        return res.status(400).json({
          success: false,
          message: "Usuario debe estar asociado a un título minero",
        });
      }

      const nuevoFRI = await prisma.fRIInventarioMaquinaria.create({
        data: {
          fechaCorte: new Date(),
          tipoMaquinaria,
          marca: marca ? String(marca) : null,
          modelo: modelo ? String(modelo) : null,
          a_oFabricacion: anoFabricacion ? parseInt(anoFabricacion, 10) : null,
          capacidad: capacidad ? parseFloat(capacidad) : null,
          estadoOperativo,
          observaciones: observaciones ? String(observaciones) : "",
          estado: "BORRADOR",
          usuarioId: usuario.id,
          tituloMineroId: usuario.tituloMineroId,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "✅ FRI Inventario Maquinaria creado",
        fri: nuevoFRI,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear FRI",
        error: error.message,
      });
    }
  },
);

app.get(
  "/api/fri/inventario-maquinaria",
  authMiddleware,
  permisoMiddleware("VER_FRI"),
  async (req, res) => {
    try {
      const fris = await prisma.fRIInventarioMaquinaria.findMany({
        where: buildFiltroFRI(req.user),
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, total: fris.length, fris });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener FRIs",
        error: error.message,
      });
    }
  },
);

app.put(
  "/api/fri/inventario-maquinaria/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIInventarioMaquinaria.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res
          .status(403)
          .json({ success: false, message: "No autorizado" });
      }

      const {
        tipoMaquinaria,
        marca,
        modelo,
        anoFabricacion,
        capacidad,
        estadoOperativo,
        observaciones,
      } = req.body;

      const friActualizado = await prisma.fRIInventarioMaquinaria.update({
        where: { id },
        data: {
          tipoMaquinaria,
          marca,
          modelo,
          a_oFabricacion: anoFabricacion ? parseInt(anoFabricacion, 10) : null,
          capacidad: capacidad ? parseFloat(capacidad) : null,
          estadoOperativo,
          observaciones:
            observaciones != null ? String(observaciones) : undefined,
          updatedAt: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          tituloMinero: {
            select: { id: true, numeroTitulo: true, municipio: true },
          },
        },
      });

      res.json({
        success: true,
        message: "✅ FRI actualizado",
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al actualizar FRI",
        error: error.message,
      });
    }
  },
);

app.delete(
  "/api/fri/inventario-maquinaria/:id",
  authMiddleware,
  permisoMiddleware("ELIMINAR_FRI"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const friExistente = await prisma.fRIInventarioMaquinaria.findUnique({
        where: { id },
      });

      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });
      if (bloquearSiAprobado(friExistente, res)) return;

      await prisma.fRIInventarioMaquinaria.delete({ where: { id } });
      res.json({ success: true, message: "✅ FRI eliminado" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar FRI",
        error: error.message,
      });
    }
  },
);

// ============================================
// ESTADÍSTICAS Y UTILIDADES
// ============================================

// CAMBIO: antes era público (sin authMiddleware).
// Ahora protegido y filtra según el rol del usuario.
app.get(
  "/api/usuarios",
  authMiddleware,
  permisoMiddleware("VER_USUARIOS"),
  async (req, res) => {
    try {
      // Roles globales ven todos los usuarios.
      // JEFE_PLANTA solo ve usuarios de su título.
      const filtro = esRolGlobal(req.user)
        ? {}
        : { tituloMineroId: req.user.tituloMineroId };

      const usuarios = await prisma.usuario.findMany({
        where: filtro,
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true,
          tituloMinero: { select: { numeroTitulo: true, municipio: true } },
        },
        orderBy: { nombre: "asc" },
      });

      res.json({ success: true, total: usuarios.length, usuarios });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener usuarios",
        error: error.message,
      });
    }
  },
);

// CAMBIO: antes era público. Ahora requiere autenticación.
app.get("/api/titulos-mineros", authMiddleware, async (req, res) => {
  try {
    // Roles globales ven todos los títulos.
    // Roles locales solo ven el suyo.
    const filtro = esRolGlobal(req.user)
      ? {}
      : { id: req.user.tituloMineroId || "sin-titulo" };

    const titulos = await prisma.tituloMinero.findMany({
      where: filtro,
      orderBy: { numeroTitulo: "asc" },
    });

    res.json({ success: true, total: titulos.length, titulos });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener títulos mineros",
      error: error.message,
    });
  }
});

// CAMBIO: antes hacía jwt.verify manual. Ahora usa authMiddleware
// y filtra por título minero en lugar de por usuarioId.
app.get("/api/fri/estadisticas", authMiddleware, async (req, res) => {
  try {
    const filtro = buildFiltroFRI(req.user);

    const [
      totalTitulos,
      totalUsuarios,
      produccion,
      inventarios,
      paradas,
      ejecucion,
      maquinaria,
      regalias,
    ] = await Promise.all([
      prisma.tituloMinero.count(),
      prisma.usuario.count(),
      prisma.fRIProduccion.count({ where: filtro }),
      prisma.fRIInventarios.count({ where: filtro }),
      prisma.fRIParadas.count({ where: filtro }),
      prisma.fRIEjecucion.count({ where: filtro }),
      prisma.fRIMaquinaria.count({ where: filtro }),
      prisma.fRIRegalias.count({ where: filtro }),
    ]);

    const totalFRIs =
      produccion + inventarios + paradas + ejecucion + maquinaria + regalias;

    res.json({
      success: true,
      estadisticas: {
        sistema: {
          titulosMineros: totalTitulos,
          usuarios: totalUsuarios,
          totalFRIs,
        },
        porTipo: {
          produccion,
          inventarios,
          paradas,
          ejecucion,
          maquinaria,
          regalias,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
      error: error.message,
    });
  }
});

// CAMBIO: antes hacía jwt.verify manual. Ahora usa authMiddleware.
app.get("/api/fri/borradores/count", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [produccion, inventarios, paradas, ejecucion, maquinaria, regalias] =
      await Promise.all([
        prisma.fRIProduccion.count({
          where: { usuarioId: userId, estado: "BORRADOR" },
        }),
        prisma.fRIInventarios.count({
          where: { usuarioId: userId, estado: "BORRADOR" },
        }),
        prisma.fRIParadas.count({
          where: { usuarioId: userId, estado: "BORRADOR" },
        }),
        prisma.fRIEjecucion.count({
          where: { usuarioId: userId, estado: "BORRADOR" },
        }),
        prisma.fRIMaquinaria.count({
          where: { usuarioId: userId, estado: "BORRADOR" },
        }),
        prisma.fRIRegalias.count({
          where: { usuarioId: userId, estado: "BORRADOR" },
        }),
      ]);

    const total =
      produccion + inventarios + paradas + ejecucion + maquinaria + regalias;

    res.json({
      success: true,
      total,
      detalles: {
        produccion,
        inventarios,
        paradas,
        ejecucion,
        maquinaria,
        regalias,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al contar borradores",
      error: error.message,
    });
  }
});

// ============================================
// CAMBIO DE ESTADOS
// ============================================

// CAMBIO: antes hacía jwt.verify manual. Ahora usa authMiddleware
// y permisoMiddleware. Solo ADMIN y ASESOR pueden cambiar estados
// (ENVIAR_FRI y CAMBIAR_ESTADO_FRI están en sus listas).
app.post(
  "/api/fri/enviar-borradores",
  authMiddleware,
  permisoMiddleware("ENVIAR_FRI"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      const [p, i, pa, e, m, r] = await Promise.all([
        prisma.fRIProduccion.updateMany({
          where: { usuarioId: userId, estado: "BORRADOR" },
          data: { estado: "ENVIADO", updatedAt: new Date() },
        }),
        prisma.fRIInventarios.updateMany({
          where: { usuarioId: userId, estado: "BORRADOR" },
          data: { estado: "ENVIADO", updatedAt: new Date() },
        }),
        prisma.fRIParadas.updateMany({
          where: { usuarioId: userId, estado: "BORRADOR" },
          data: { estado: "ENVIADO", updatedAt: new Date() },
        }),
        prisma.fRIEjecucion.updateMany({
          where: { usuarioId: userId, estado: "BORRADOR" },
          data: { estado: "ENVIADO", updatedAt: new Date() },
        }),
        prisma.fRIMaquinaria.updateMany({
          where: { usuarioId: userId, estado: "BORRADOR" },
          data: { estado: "ENVIADO", updatedAt: new Date() },
        }),
        prisma.fRIRegalias.updateMany({
          where: { usuarioId: userId, estado: "BORRADOR" },
          data: { estado: "ENVIADO", updatedAt: new Date() },
        }),
      ]);

      const total = p.count + i.count + pa.count + e.count + m.count + r.count;

      res.json({
        success: true,
        message: `✅ ${total} formularios enviados correctamente`,
        detalles: {
          produccion: p.count,
          inventarios: i.count,
          paradas: pa.count,
          ejecucion: e.count,
          maquinaria: m.count,
          regalias: r.count,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al enviar borradores",
        error: error.message,
      });
    }
  },
);

// CAMBIO: antes hacía jwt.verify manual y cualquier usuario
// autenticado podía cambiar el estado de su propio FRI.
// Ahora requiere permiso CAMBIAR_ESTADO_FRI (ADMIN y ASESOR)
// y bloquea modificaciones sobre FRIs APROBADOS.
app.put(
  "/api/fri/:tipo/:id/estado",
  authMiddleware,
  permisoMiddleware("CAMBIAR_ESTADO_FRI"),
  async (req, res) => {
    try {
      const { tipo, id } = req.params;
      const { estado } = req.body;

      const estadosValidos = ["BORRADOR", "ENVIADO", "APROBADO", "RECHAZADO"];
      if (!estadosValidos.includes(estado)) {
        return res
          .status(400)
          .json({ success: false, message: "Estado inválido" });
      }

      const modelos = {
        produccion: prisma.fRIProduccion,
        inventarios: prisma.fRIInventarios,
        paradas: prisma.fRIParadas,
        ejecucion: prisma.fRIEjecucion,
        maquinaria: prisma.fRIMaquinaria,
        regalias: prisma.fRIRegalias,
        capacidad: prisma.fRICapacidad,
        "inventario-maquinaria": prisma.fRIInventarioMaquinaria,
        inventarioMaquinaria: prisma.fRIInventarioMaquinaria,
        proyecciones: prisma.fRIProyecciones,
      };

      const modelo = modelos[tipo];
      if (!modelo)
        return res
          .status(400)
          .json({ success: false, message: "Tipo de FRI inválido" });

      const friExistente = await modelo.findUnique({ where: { id } });
      if (!friExistente)
        return res
          .status(404)
          .json({ success: false, message: "FRI no encontrado" });

      // CAMBIO: un FRI APROBADO no puede volver a cambiar de estado
      if (bloquearSiAprobado(friExistente, res)) return;

      // CAMBIO: verificar que el usuario pueda acceder al título de este FRI
      if (!puedeAccederATitulo(req.user, friExistente.tituloMineroId)) {
        return res.status(403).json({
          success: false,
          message: "No tienes acceso a este título minero",
        });
      }

      const friActualizado = await modelo.update({
        where: { id },
        data: { estado, updatedAt: new Date() },
        include: { usuario: { select: { id: true, nombre: true } } },
      });

      res.json({
        success: true,
        message: `✅ Estado cambiado a ${estado}`,
        fri: friActualizado,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al cambiar estado",
        error: error.message,
      });
    }
  },
);

// ============================================
// REPORTES Y EXPORTACIÓN
// ============================================

// CAMBIO: antes hacía jwt.verify manual y filtraba por usuarioId.
// Ahora usa authMiddleware + permisoMiddleware y filtra por título.
app.post(
  "/api/reportes/exportar-anm",
  authMiddleware,
  permisoMiddleware("EXPORTAR_REPORTE"),
  async (req, res) => {
    try {
      const { tipos = [], filtros = {} } = req.body || {};

      if (tipos.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Debe seleccionar al menos un tipo de formulario",
        });
      }

      // Construir filtro base según rol
      const whereClauses = { ...buildFiltroFRI(req.user) };

      if (filtros.fechaInicio && filtros.fechaFin) {
        whereClauses.fechaCorte = {
          gte: new Date(filtros.fechaInicio),
          lte: new Date(filtros.fechaFin),
        };
      } else if (filtros.fechaInicio) {
        whereClauses.fechaCorte = { gte: new Date(filtros.fechaInicio) };
      } else if (filtros.fechaFin) {
        whereClauses.fechaCorte = { lte: new Date(filtros.fechaFin) };
      }

      if (filtros.mineral) whereClauses.mineral = filtros.mineral;
      if (filtros.estado) whereClauses.estado = filtros.estado;

      const modelosPorTipo = {
        produccion: prisma.fRIProduccion,
        inventarios: prisma.fRIInventarios,
        paradas: prisma.fRIParadas,
        ejecucion: prisma.fRIEjecucion,
        maquinaria: prisma.fRIMaquinaria,
        regalias: prisma.fRIRegalias,
      };

      const datosPorTipo = {};
      for (const tipo of tipos) {
        const modelo = modelosPorTipo[tipo];
        if (!modelo) continue;

        const datos = await modelo.findMany({
          where: whereClauses,
          include: {
            usuario: { select: { nombre: true } },
            tituloMinero: {
              select: {
                numeroTitulo: true,
                municipio: true,
                codigoMunicipio: true,
              },
            },
          },
          orderBy: { fechaCorte: "desc" },
        });

        if (datos.length > 0) datosPorTipo[tipo] = datos;
      }

      if (Object.keys(datosPorTipo).length === 0) {
        return res.status(404).json({
          success: false,
          message: "No se encontraron datos con los filtros especificados",
        });
      }

      const workbook =
        await simpleExporter.generarExcelConsolidado(datosPorTipo);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=FRI_ANM_${Date.now()}.xlsx`,
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al generar Excel",
        error: error.message,
      });
    }
  },
);

app.post(
  "/api/reportes/exportar-pdf",
  authMiddleware,
  permisoMiddleware("EXPORTAR_REPORTE"),
  async (req, res) => {
    try {
      const { tipos = [], filtros = {} } = req.body || {};

      if (tipos.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Debe seleccionar al menos un tipo de formulario",
        });
      }

      const whereClauses = { ...buildFiltroFRI(req.user) };

      if (filtros.fechaInicio && filtros.fechaFin) {
        whereClauses.fechaCorte = {
          gte: new Date(filtros.fechaInicio),
          lte: new Date(filtros.fechaFin),
        };
      } else if (filtros.fechaInicio) {
        whereClauses.fechaCorte = { gte: new Date(filtros.fechaInicio) };
      } else if (filtros.fechaFin) {
        whereClauses.fechaCorte = { lte: new Date(filtros.fechaFin) };
      }

      if (filtros.mineral) whereClauses.mineral = filtros.mineral;
      if (filtros.estado) whereClauses.estado = filtros.estado;

      const modelosPorTipo = {
        produccion: prisma.fRIProduccion,
        inventarios: prisma.fRIInventarios,
        paradas: prisma.fRIParadas,
        ejecucion: prisma.fRIEjecucion,
        maquinaria: prisma.fRIMaquinaria,
        regalias: prisma.fRIRegalias,
      };

      const datosPorTipo = {};
      for (const tipo of tipos) {
        const modelo = modelosPorTipo[tipo];
        if (!modelo) continue;

        const datos = await modelo.findMany({
          where: whereClauses,
          include: {
            usuario: { select: { nombre: true } },
            tituloMinero: { select: { numeroTitulo: true, municipio: true } },
          },
          orderBy: { fechaCorte: "desc" },
        });

        if (datos.length > 0) datosPorTipo[tipo] = datos;
      }

      if (Object.keys(datosPorTipo).length === 0) {
        return res.status(404).json({
          success: false,
          message: "No se encontraron datos con los filtros especificados",
        });
      }

      const pdfBuffer = await pdfExporter.generarPDFConsolidado(datosPorTipo);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=FRI_ANM_${Date.now()}.pdf`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al generar PDF",
        error: error.message,
      });
    }
  },
);

// ============================================
// CRUD GESTIÓN DE USUARIOS
// ============================================

// CAMBIO: antes solo ADMIN. Ahora ADMIN, ASESOR y JEFE_PLANTA
// (cada uno ve solo lo que buildFiltroUsuarios permite)
app.get(
  "/api/list-users",
  authMiddleware,
  permisoMiddleware("VER_USUARIOS"),
  async (req, res) => {
    try {
      const filtro = esRolGlobal(req.user)
        ? {}
        : { tituloMineroId: req.user.tituloMineroId };

      const usuarios = await prisma.usuario.findMany({
        where: filtro,
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          activo: true,
          createdAt: true,
          tituloMineroId: true,
          tituloMinero: {
            select: {
              id: true,
              numeroTitulo: true,
              municipio: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, total: usuarios.length, usuarios });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener usuarios",
        error: error.message,
      });
    }
  },
);

// CAMBIO: antes solo ADMIN. Ahora ADMIN, ASESOR y JEFE_PLANTA
// con validación de puedeGestionarUsuario dentro del handler.
app.post(
  "/api/list-users",
  authMiddleware,
  permisoMiddleware("CREAR_USUARIO"),
  async (req, res) => {
    try {
      const { email, password, nombre, rol, tituloMineroId } = req.body;

      if (!email || !password || !nombre || !rol) {
        return res
          .status(400)
          .json({ success: false, message: "Faltan campos obligatorios" });
      }

      if (
        password.length < 8 ||
        !/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*.])/.test(password)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo (!@#$%^&*.)",
        });
      }

      const tituloFinal =
        req.user.rol === "JEFE_PLANTA"
          ? req.user.tituloMineroId
          : tituloMineroId || null;

      const usuarioObjetivo = { rol, tituloMineroId: tituloFinal }; // ← tituloFinal, no tituloMineroId
      if (!puedeGestionarUsuario(req.user, usuarioObjetivo)) {
        return res.status(403).json({
          success: false,
          message:
            "No tienes permiso para crear un usuario con ese rol o en ese título minero",
        });
      }

      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email },
      });
      if (usuarioExistente) {
        return res
          .status(400)
          .json({ success: false, message: "El correo ya está registrado" });
      }

      const hash = await bcrypt.hash(password, 10);

      const nuevoUsuario = await prisma.usuario.create({
        data: {
          email,
          password: hash,
          nombre,
          rol,
          activo: true,
          tituloMineroId: tituloFinal,
        },
      });

      res.status(201).json({
        success: true,
        message: "Usuario creado correctamente",
        usuario: {
          id: nuevoUsuario.id,
          email: nuevoUsuario.email,
          nombre: nuevoUsuario.nombre,
          rol: nuevoUsuario.rol,
          activo: nuevoUsuario.activo,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al crear usuario",
        error: error.message,
      });
    }
  },
);

// CAMBIO: antes solo ADMIN. Ahora ADMIN y JEFE_PLANTA
// (JEFE_PLANTA solo puede cambiar estado de usuarios de su título).
app.patch(
  "/api/list-users/:id/status",
  authMiddleware,
  permisoMiddleware("CAMBIAR_ESTADO_USUARIO"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const usuario = await prisma.usuario.findUnique({ where: { id } });
      if (!usuario)
        return res
          .status(404)
          .json({ success: false, message: "Usuario no encontrado" });

      // JEFE_PLANTA solo puede cambiar estado de usuarios de su mismo título
      if (!puedeGestionarUsuario(req.user, usuario)) {
        return res.status(403).json({
          success: false,
          message: "No tienes permiso para modificar este usuario",
        });
      }

      const usuarioActualizado = await prisma.usuario.update({
        where: { id },
        data: { activo: !usuario.activo },
      });

      res.json({
        success: true,
        message: `Usuario ${usuarioActualizado.activo ? "activado" : "desactivado"} correctamente`,
        usuario: {
          id: usuarioActualizado.id,
          nombre: usuarioActualizado.nombre,
          email: usuarioActualizado.email,
          activo: usuarioActualizado.activo,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error cambiando estado del usuario",
        error: error.message,
      });
    }
  },
);

// CAMBIO: antes solo ADMIN. Ahora ADMIN, ASESOR y JEFE_PLANTA
// con validación de puedeGestionarUsuario.
app.put(
  "/api/list-users/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_USUARIO"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, rol, tituloMineroId, password } = req.body;

      const usuarioObjetivo = await prisma.usuario.findUnique({
        where: { id },
      });
      if (!usuarioObjetivo)
        return res
          .status(404)
          .json({ success: false, message: "Usuario no encontrado" });

      if (!puedeGestionarUsuario(req.user, usuarioObjetivo)) {
        return res.status(403).json({
          success: false,
          message: "No tienes permiso para editar este usuario",
        });
      }

      // Nadie puede quitarse su propio rol
      if (req.user.id === id && rol && rol !== req.user.rol) {
        return res
          .status(400)
          .json({ success: false, message: "No puedes cambiar tu propio rol" });
      }

      // Solo ADMIN puede cambiar roles
      if (
        rol &&
        rol !== usuarioObjetivo.rol &&
        !tienePermiso(req.user, "ASIGNAR_ROL")
      ) {
        return res.status(403).json({
          success: false,
          message: "Solo el ADMIN puede cambiar roles",
        });
      }

      const dataToUpdate = { nombre, tituloMineroId };
      if (rol && tienePermiso(req.user, "ASIGNAR_ROL")) dataToUpdate.rol = rol;
      if (password) {
        if (
          password.length < 8 ||
          !/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*.])/.test(password)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo (!@#$%^&*.)",
          });
        }
        dataToUpdate.password = await bcrypt.hash(password, 10);
      }

      const usuarioActualizado = await prisma.usuario.update({
        where: { id },
        data: dataToUpdate,
      });

      res.json({
        success: true,
        message: "Usuario actualizado correctamente",
        usuario: {
          id: usuarioActualizado.id,
          nombre: usuarioActualizado.nombre,
          email: usuarioActualizado.email,
          rol: usuarioActualizado.rol,
          activo: usuarioActualizado.activo,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error actualizando usuario",
        error: error.message,
      });
    }
  },
);

// Obtener un usuario por ID
app.get(
  "/api/list-users/:id",
  authMiddleware,
  permisoMiddleware("VER_USUARIOS"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const usuario = await prisma.usuario.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          activo: true,
          createdAt: true,
          tituloMineroId: true,
          tituloMinero: {
            select: {
              id: true,
              numeroTitulo: true,
              municipio: true,
            },
          },
        },
      });

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      // JEFE_PLANTA solo puede ver usuarios de su mismo título
      if (!puedeGestionarUsuario(req.user, usuario)) {
        return res.status(403).json({
          success: false,
          message: "No tienes permiso para ver este usuario",
        });
      }

      res.json({ success: true, usuario });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener usuario",
        error: error.message,
      });
    }
  },
);

// Actualizar perfil propio
app.put("/api/auth/perfil", authMiddleware, async (req, res) => {
  try {
    const { nombre, passwordActual, passwordNuevo } = req.body;

    const dataToUpdate = {};

    if (nombre) {
      dataToUpdate.nombre = nombre;
    }

    // Si quiere cambiar contraseña, debe confirmar la actual
    if (passwordNuevo) {
      if (!passwordActual) {
        return res.status(400).json({
          success: false,
          message: "Debes proporcionar tu contraseña actual para cambiarla",
        });
      }

      const usuarioCompleto = await prisma.usuario.findUnique({
        where: { id: req.user.id },
      });

      // ← agregar esto
      if (
        passwordNuevo.length < 8 ||
        !/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*.])/.test(passwordNuevo)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo (!@#$%^&*.)",
        });
      }

      const passwordValida = await bcrypt.compare(
        passwordActual,
        usuarioCompleto.password,
      );

      if (!passwordValida) {
        return res.status(400).json({
          success: false,
          message: "La contraseña actual es incorrecta",
        });
      }

      dataToUpdate.password = await bcrypt.hash(passwordNuevo, 10);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay datos para actualizar",
      });
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: req.user.id },
      data: dataToUpdate,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    });

    res.json({
      success: true,
      message: "Perfil actualizado correctamente",
      usuario: usuarioActualizado,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar perfil",
      error: error.message,
    });
  }
});

// ------------ Titulos Mineros ------------
// Crear título minero
app.post(
  "/api/titulos",
  authMiddleware,
  permisoMiddleware("CREAR_TITULO"),
  async (req, res) => {
    try {
      const {
        numeroTitulo,
        municipio,
        codigoMunicipio,
        fechaInicio,
        fechaVencimiento,
        observaciones,
        titularId,
        jefePlantaId,
      } = req.body;

      if (!numeroTitulo || !municipio) {
        return res.status(400).json({
          success: false,
          message: "Número y municipio son obligatorios",
        });
      }

      if (!titularId || !jefePlantaId) {
        return res.status(400).json({
          success: false,
          message: "Debes asignar un Titular y un Jefe de Planta",
        });
      }

      // Verificar que el número de título no exista
      const existe = await prisma.tituloMinero.findUnique({
        where: { numeroTitulo },
      });
      if (existe) {
        return res.status(400).json({
          success: false,
          message: "El número de título ya existe",
        });
      }

      // Verificar que los usuarios existan y tengan el rol correcto
      const [titular, jefePlanta] = await Promise.all([
        prisma.usuario.findUnique({ where: { id: titularId } }),
        prisma.usuario.findUnique({ where: { id: jefePlantaId } }),
      ]);

      if (!titular || titular.rol !== "TITULAR") {
        return res.status(400).json({
          success: false,
          message:
            "El usuario seleccionado como Titular no tiene el rol TITULAR",
        });
      }

      if (!jefePlanta || jefePlanta.rol !== "JEFE_PLANTA") {
        return res.status(400).json({
          success: false,
          message:
            "El usuario seleccionado como Jefe de Planta no tiene el rol JEFE_PLANTA",
        });
      }

      // Transacción: crear título y asignar ambos usuarios
      const resultado = await prisma.$transaction(async (tx) => {
        const titulo = await tx.tituloMinero.create({
          data: {
            numeroTitulo,
            municipio,
            codigoMunicipio: codigoMunicipio || null,
            fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
            fechaVencimiento: fechaVencimiento
              ? new Date(fechaVencimiento)
              : null,
            observaciones: observaciones || null,
          },
        });

        await Promise.all([
          tx.usuario.update({
            where: { id: titularId },
            data: { tituloMineroId: titulo.id },
          }),
          tx.usuario.update({
            where: { id: jefePlantaId },
            data: { tituloMineroId: titulo.id },
          }),
        ]);

        return titulo;
      });

      res.status(201).json({
        success: true,
        message: "✅ Título minero creado y usuarios asignados correctamente",
        titulo: resultado,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// Editar título minero
app.put(
  "/api/titulos/:id",
  authMiddleware,
  permisoMiddleware("EDITAR_TITULO"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        municipio,
        codigoMunicipio,
        fechaInicio,
        fechaVencimiento,
        observaciones,
        estado,
        titularId,
        jefePlantaId,
      } = req.body;

      const existe = await prisma.tituloMinero.findUnique({
        where: { id },
        include: {
          usuarios: {
            select: { id: true, rol: true },
          },
        },
      });

      if (!existe) {
        return res.status(404).json({
          success: false,
          message: "Título minero no encontrado",
        });
      }

      // Validar que los nuevos usuarios tengan el rol correcto
      if (titularId) {
        const titular = await prisma.usuario.findUnique({
          where: { id: titularId },
        });
        if (!titular || titular.rol !== "TITULAR") {
          return res.status(400).json({
            success: false,
            message:
              "El usuario seleccionado como Titular no tiene el rol TITULAR",
          });
        }
      }

      if (jefePlantaId) {
        const jefe = await prisma.usuario.findUnique({
          where: { id: jefePlantaId },
        });
        if (!jefe || jefe.rol !== "JEFE_PLANTA") {
          return res.status(400).json({
            success: false,
            message:
              "El usuario seleccionado como Jefe de Planta no tiene el rol JEFE_PLANTA",
          });
        }
      }

      const resultado = await prisma.$transaction(async (tx) => {
        // Actualizar datos del título
        const titulo = await tx.tituloMinero.update({
          where: { id },
          data: {
            municipio,
            codigoMunicipio: codigoMunicipio || null,
            fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
            fechaVencimiento: fechaVencimiento
              ? new Date(fechaVencimiento)
              : null,
            observaciones: observaciones || null,
            estado: estado || undefined,
          },
        });

        // Manejar cambio de Titular
        if (titularId) {
          // Buscar el titular actual de este título
          const titularActual = existe.usuarios.find(
            (u) => u.rol === "TITULAR",
          );

          // Si hay un titular actual y es diferente al nuevo, desasignarlo
          if (titularActual && titularActual.id !== titularId) {
            await tx.usuario.update({
              where: { id: titularActual.id },
              data: { tituloMineroId: null },
            });
          }

          // Asignar el nuevo titular
          await tx.usuario.update({
            where: { id: titularId },
            data: { tituloMineroId: id },
          });
        }

        // Manejar cambio de Jefe de Planta
        if (jefePlantaId) {
          // Buscar el jefe actual de este título
          const jefeActual = existe.usuarios.find(
            (u) => u.rol === "JEFE_PLANTA",
          );

          // Si hay un jefe actual y es diferente al nuevo, desasignarlo
          if (jefeActual && jefeActual.id !== jefePlantaId) {
            await tx.usuario.update({
              where: { id: jefeActual.id },
              data: { tituloMineroId: null },
            });
          }

          // Asignar el nuevo jefe
          await tx.usuario.update({
            where: { id: jefePlantaId },
            data: { tituloMineroId: id },
          });
        }

        return titulo;
      });

      res.json({
        success: true,
        message: "✅ Título actualizado correctamente",
        titulo: resultado,
      });
    } catch (error) {
      console.error("Error actualizando título:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  },
);

// Obtener un título con sus usuarios asignados
app.get("/api/titulos/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const titulo = await prisma.tituloMinero.findUnique({
      where: { id },
      include: {
        usuarios: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
            activo: true,
          },
        },
      },
    });

    if (!titulo) {
      return res.status(404).json({
        success: false,
        message: "Título minero no encontrado",
      });
    }

    if (!puedeAccederATitulo(req.user, id)) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este título minero",
      });
    }

    res.json({ success: true, titulo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, "0.0.0.0", () => {
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
  console.log(`   - POST/GET/PUT/DELETE /api/fri/capacidad`);
  console.log(`   - POST/GET/PUT/DELETE /api/fri/proyecciones`);
  console.log(`   - POST/GET/PUT/DELETE /api/fri/inventario-maquinaria`);
  console.log(`✅ ========================================\n`);
});
