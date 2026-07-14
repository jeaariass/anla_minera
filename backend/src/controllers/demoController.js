// backend/src/controllers/demoController.js
// ============================================================
// Creación y eliminación de DEMOS comerciales.
//
// Un demo es: un título minero marcado esDemo=true + usuarios
// por rol (esDemo=true, contraseña compartida) + datos de
// muestra (puntos de actividad, paradas y FRIs en borrador)
// para que dashboards y mapa no salgan vacíos.
//
// Solo ADMIN (permisos CREAR_DEMO / ELIMINAR_DEMO).
// ============================================================

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { CATEGORIAS } = require("../utils/categorias");
const { MODULOS } = require("../utils/modulos");

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────

// Timestamps naive en hora Colombia (UTC-5) — mismo criterio que
// puntosActividadController: restar 5h y usar componentes UTC.
const naiveColombia = (diasAtras = 0, hora = 8, minuto = 0) => {
  const d = new Date(Date.now() - 5 * 3600000 - diasAtras * 86400000);
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      hora,
      minuto,
      0,
    ),
  );
};

const diaColombia = (diasAtras = 0) => naiveColombia(diasAtras, 0, 0);

const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const elegir = (arr) => arr[randInt(0, arr.length - 1)];

const slugify = (texto) =>
  String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20) || "demo";

const generarPassword = () => {
  // Cumple la política de usuarios: mayúscula, número y símbolo.
  const sufijo = Math.random().toString(36).slice(2, 6);
  return `Demo${randInt(10, 99)}!${sufijo}`;
};

// Centro genérico en zona minera de Antioquia, con jitter por demo
// para que dos demos no queden apilados en el mapa.
const centroDemo = () => ({
  lat: 6.4 + rand(-0.05, 0.05),
  lng: -75.55 + rand(-0.05, 0.05),
});

// ─── POST /api/demos ─────────────────────────────────────────
// Body: { nombre: "Minera La Esperanza", numOperarios?: 2 }
const crearDemo = async (req, res) => {
  try {
    const { nombre, numOperarios } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({
        success: false,
        message: "Debes indicar un nombre para el demo",
      });
    }

    const operarios = Math.min(Math.max(parseInt(numOperarios) || 2, 1), 10);
    const slug = slugify(nombre);
    const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase();
    const numeroTitulo = `DEMO-${slug.toUpperCase().slice(0, 12)}-${sufijo}`;
    const dominio = `${slug}.demo.tumina.co`;

    const password = generarPassword();
    const hash = await bcrypt.hash(password, 10);
    const centro = centroDemo();

    const defUsuarios = [
      { rol: "TITULAR", nombre: `Titular Demo — ${nombre}`, email: `titular@${dominio}` },
      { rol: "JEFE_PLANTA", nombre: `Jefe de Planta Demo — ${nombre}`, email: `jefe@${dominio}` },
      ...Array.from({ length: operarios }, (_, i) => ({
        rol: "OPERARIO",
        nombre: `Operario Demo ${i + 1} — ${nombre}`,
        email: `operario${i + 1}@${dominio}`,
      })),
      { rol: "VENDEDOR", nombre: `Vendedor Demo — ${nombre}`, email: `vendedor@${dominio}` },
    ];

    // Emails únicos garantizados por el dominio con slug+numeroTitulo,
    // pero un demo repetido con el mismo nombre chocaría: validar.
    const existente = await prisma.usuario.findFirst({
      where: { email: { in: defUsuarios.map((u) => u.email) } },
    });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un demo con ese nombre (${existente.email}). Usa otro nombre o elimina el demo anterior.`,
      });
    }

    const { titulo, usuarios } = await prisma.$transaction(async (tx) => {
      const titulo = await tx.tituloMinero.create({
        data: {
          numeroTitulo,
          municipio: "Medellín",
          departamento: "Antioquia",
          estado: "ACTIVO",
          esDemo: true,
          minerales: "Arena, Grava",
          modalidad: "DEMO",
          observaciones: `Título de demostración generado automáticamente (${nombre}).`,
          fechaInicio: new Date(),
          centroid: { lat: centro.lat, lng: centro.lng },
        },
      });

      await tx.tituloCategoria.createMany({
        data: CATEGORIAS.map((c) => ({
          tituloMineroId: titulo.id,
          categoria: c.id,
          activo: true,
          orden: c.orden,
        })),
        skipDuplicates: true,
      });

      await tx.tituloModulo.createMany({
        data: MODULOS.map((m) => ({
          tituloMineroId: titulo.id,
          modulo: m.id,
          activo: true,
          orden: m.orden,
        })),
        skipDuplicates: true,
      });

      const usuarios = [];
      for (const u of defUsuarios) {
        usuarios.push(
          await tx.usuario.create({
            data: {
              email: u.email,
              password: hash,
              nombre: u.nombre,
              rol: u.rol,
              activo: true,
              esDemo: true,
              tituloMineroId: titulo.id,
            },
            select: { id: true, email: true, nombre: true, rol: true },
          }),
        );
      }

      return { titulo, usuarios };
    });

    // ── Datos de muestra (fuera de la transacción: si algo falla,
    // el demo queda usable igual) ──
    const resumenDatos = { puntos: 0, paradas: 0, fris: 0 };
    try {
      const registradores = usuarios.filter((u) =>
        ["OPERARIO", "JEFE_PLANTA"].includes(u.rol),
      );
      const titular = usuarios.find((u) => u.rol === "TITULAR");

      // Puntos de actividad — últimos 7 días
      const items = await prisma.puntos_items_catalogo.findMany({
        where: { activo: true },
      });
      const categoriasCampo = CATEGORIAS.filter((c) => c.esCampo).map(
        (c) => c.id,
      );
      for (let dia = 0; dia < 7; dia++) {
        const cuantos = randInt(2, 4);
        for (let i = 0; i < cuantos; i++) {
          const categoria = elegir(categoriasCampo);
          const itemsCat = items.filter((it) => it.categoria === categoria);
          const item = itemsCat.length > 0 ? elegir(itemsCat) : null;
          await prisma.puntos_actividad.create({
            data: {
              usuario_id: elegir(registradores).id,
              titulo_minero_id: titulo.id,
              latitud: centro.lat + rand(-0.003, 0.003),
              longitud: centro.lng + rand(-0.003, 0.003),
              categoria,
              item_id: item?.id ?? null,
              item_nombre: item?.nombre ?? null,
              item_otro: item ? null : "Frente demo",
              descripcion: "Registro de demostración",
              volumen_m3: Math.round(rand(5, 40) * 100) / 100,
              fecha: naiveColombia(dia, randInt(7, 16), randInt(0, 59)),
              dia: diaColombia(dia),
            },
          });
          resumenDatos.puntos++;
        }
      }

      // Paradas — cada 2 días, si hay motivos en catálogo
      const motivos = await prisma.paradas_motivos.findMany({
        where: { activo: true },
      });
      if (motivos.length > 0) {
        for (let dia = 0; dia < 7; dia += 2) {
          const motivo = elegir(motivos);
          const horaInicio = randInt(8, 14);
          const minutos = randInt(30, 90);
          await prisma.paradas_actividad.create({
            data: {
              usuario_id: elegir(registradores).id,
              titulo_minero_id: titulo.id,
              motivo_id: motivo.id,
              motivo_nombre: motivo.nombre,
              inicio: naiveColombia(dia, horaInicio, 0),
              fin: naiveColombia(dia, horaInicio, minutos),
              dia: diaColombia(dia),
              observaciones: "Parada de demostración",
            },
          });
          resumenDatos.paradas++;
        }
      }

      // FRIs en borrador (autor: titular)
      if (titular) {
        const base = {
          usuarioId: titular.id,
          tituloMineroId: titulo.id,
          estado: "BORRADOR",
          observaciones: "Formulario de demostración",
        };
        for (let dia = 0; dia < 3; dia++) {
          await prisma.fRIProduccion.create({
            data: {
              ...base,
              fechaCorte: diaColombia(dia),
              mineral: "ARENA",
              horasOperativas: 8,
              unidadMedida: "m3",
              cantidadProduccion: Math.round(rand(80, 200) * 100) / 100,
            },
          });
          resumenDatos.fris++;
        }
        await prisma.fRIInventarios.create({
          data: {
            ...base,
            fechaCorte: diaColombia(0),
            mineral: "ARENA",
            unidadMedida: "m3",
            inventarioInicialAcopio: 500,
            ingresoAcopio: 320,
            salidaAcopio: 280,
            inventarioFinalAcopio: 540,
          },
        });
        resumenDatos.fris++;
        await prisma.fRIMaquinaria.create({
          data: {
            ...base,
            fechaCorte: diaColombia(0),
            tipoMaquinaria: "Retroexcavadora",
            cantidad: 2,
            horasOperacion: 16,
            capacidadTransporte: 12,
            unidadCapacidad: "m3",
          },
        });
        resumenDatos.fris++;
      }
    } catch (e) {
      console.error("Demo creado, pero falló la carga de datos de muestra:", e);
    }

    res.status(201).json({
      success: true,
      message: "✅ Demo creado correctamente",
      demo: {
        tituloId: titulo.id,
        numeroTitulo: titulo.numeroTitulo,
        nombre,
        password,
        usuarios,
        datos: resumenDatos,
      },
    });
  } catch (error) {
    console.error("Error creando demo:", error);
    res.status(500).json({
      success: false,
      message: "Error interno creando el demo",
      error: error.message,
    });
  }
};

// ─── DELETE /api/demos/:tituloId ─────────────────────────────
// Borra el título demo y TODO lo asociado. Solo funciona sobre
// títulos con esDemo=true — un título real nunca se puede borrar
// por esta vía.
const eliminarDemo = async (req, res) => {
  try {
    const { tituloId } = req.params;

    const titulo = await prisma.tituloMinero.findUnique({
      where: { id: tituloId },
    });
    if (!titulo) {
      return res.status(404).json({
        success: false,
        message: "Título minero no encontrado",
      });
    }
    if (!titulo.esDemo) {
      return res.status(400).json({
        success: false,
        message: "Este título no es un demo — no se puede eliminar por esta vía",
      });
    }

    await prisma.$transaction([
      prisma.puntos_actividad.deleteMany({
        where: { titulo_minero_id: tituloId },
      }),
      prisma.paradas_actividad.deleteMany({
        where: { titulo_minero_id: tituloId },
      }),
      prisma.certificados_origen.deleteMany({
        where: { tituloMineroId: tituloId },
      }),
      prisma.registroCicloProduccion.deleteMany({
        where: { tituloMineroId: tituloId },
      }),
      prisma.puntoReferencia.deleteMany({ where: { tituloMineroId: tituloId } }),
      prisma.fRIProduccion.deleteMany({ where: { tituloMineroId: tituloId } }),
      prisma.fRIInventarios.deleteMany({ where: { tituloMineroId: tituloId } }),
      prisma.fRIParadas.deleteMany({ where: { tituloMineroId: tituloId } }),
      prisma.fRIEjecucion.deleteMany({ where: { tituloMineroId: tituloId } }),
      prisma.fRIMaquinaria.deleteMany({ where: { tituloMineroId: tituloId } }),
      prisma.fRIRegalias.deleteMany({ where: { tituloMineroId: tituloId } }),
      prisma.fRIInventarioMaquinaria.deleteMany({
        where: { tituloMineroId: tituloId },
      }),
      prisma.fRICapacidad.deleteMany({ where: { tituloMineroId: tituloId } }),
      prisma.fRIProyecciones.deleteMany({
        where: { tituloMineroId: tituloId },
      }),
      prisma.tituloCategoria.deleteMany({
        where: { tituloMineroId: tituloId },
      }),
      prisma.tituloModulo.deleteMany({ where: { tituloMineroId: tituloId } }),
      // Usuarios demo se borran; si alguien asignó un usuario real
      // al demo, solo se desasigna.
      prisma.usuario.deleteMany({
        where: { tituloMineroId: tituloId, esDemo: true },
      }),
      prisma.usuario.updateMany({
        where: { tituloMineroId: tituloId },
        data: { tituloMineroId: null },
      }),
      prisma.tituloMinero.delete({ where: { id: tituloId } }),
    ]);

    res.json({
      success: true,
      message: `✅ Demo ${titulo.numeroTitulo} eliminado por completo`,
    });
  } catch (error) {
    console.error("Error eliminando demo:", error);
    res.status(500).json({
      success: false,
      message: "Error interno eliminando el demo",
      error: error.message,
    });
  }
};

module.exports = { crearDemo, eliminarDemo };
