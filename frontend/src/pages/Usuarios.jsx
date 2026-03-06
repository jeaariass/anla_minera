import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Edit,
  Power,
  X,
  Save,
  ArrowLeft,
  Search,
  Filter,
  User,
  LogOut,
  AlertCircle,
  CheckCircle,
  Shield,
  Building2,
  Calendar,
  MapPin,
} from "lucide-react";
import { authService, usuarioService, tituloService } from "../services/api";
import { tienePermiso, getUsuarioActual } from "../utils/permissions";
import "./Usuarios.css";

import SelectorTitulo from "../components/SelectorTitulo";

// ─── Constantes ───────────────────────────────────────────
const ROLES_DISPONIBLES = {
  ADMIN: { label: "Administrador", color: "#7c3aed" },
  ASESOR: { label: "Asesor", color: "#2563eb" },
  TITULAR: { label: "Titular Minero", color: "#0891b2" },
  JEFE_PLANTA: { label: "Jefe de Planta", color: "#d97706" },
  OPERARIO: { label: "Operario", color: "#16a34a" },
  VENDEDOR: { label: "Vendedor", color: "#0d9488" },
};

const ESTADO_LABELS = {
  true: { label: "Activo", color: "#16a34a", bg: "#dcfce7" },
  false: { label: "Inactivo", color: "#dc2626", bg: "#fee2e2" },
};

const ROLES_GESTIONABLES = {
  ADMIN: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA", "OPERARIO", "VENDEDOR"],
  JEFE_PLANTA: ["OPERARIO"],
};

const ROLES_VISIBLES = {
  ADMIN: ["ADMIN", "ASESOR", "TITULAR", "JEFE_PLANTA", "OPERARIO", "VENDEDOR"],
  ASESOR: ["ASESOR", "TITULAR", "JEFE_PLANTA", "OPERARIO", "VENDEDOR"],
  JEFE_PLANTA: ["OPERARIO"],
};

const ESTADO_TITULO = ["ACTIVO", "INACTIVO", "SUSPENDIDO"];

// ─── Componente principal ─────────────────────────────────
const Usuarios = () => {
  const navigate = useNavigate();
  const usuarioActual = getUsuarioActual();
  const esAdmin = usuarioActual?.rol === "ADMIN";

  // ── Pestaña activa ──
  const [pestana, setPestana] = useState("usuarios");

  // ── Datos ──
  const [usuarios, setUsuarios] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // ── Filtros usuarios ──
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroTitulo, setFiltroTitulo] = useState("TODOS");

  // ── Filtros títulos ──
  const [busquedaTitulo, setBusquedaTitulo] = useState("");

  // ── Modal usuario ──
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modoEdicionUser, setModoEdicionUser] = useState(false);
  const [usuarioEditId, setUsuarioEditId] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [formUser, setFormUser] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmarPassword: "",
    rol: "OPERARIO",
    tituloMineroId: "",
  });
  const [erroresUser, setErroresUser] = useState({});

  // ── Modal editar usuario ──
  const [cambiarPassword, setCambiarPassword] = useState(false);

  // ── Modal título ──
  const [modalTitulo, setModalTitulo] = useState(false);
  const [modoEdicionTitulo, setModoEdicionTitulo] = useState(false);
  const [tituloEditId, setTituloEditId] = useState(null);
  const [loadingModalTit, setLoadingModalTit] = useState(false);
  const [formTitulo, setFormTitulo] = useState({
    numeroTitulo: "",
    municipio: "",
    codigoMunicipio: "",
    fechaInicio: "",
    fechaVencimiento: "",
    observaciones: "",
    estado: "ACTIVO",
    titularId: "",
    jefePlantaId: "",
  });
  const [erroresTitulo, setErroresTitulo] = useState({});

  // ── Carga inicial ──
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resU, resT] = await Promise.all([
        usuarioService.getAll(),
        tituloService.getAll(),
      ]);
      if (resU.data.success) setUsuarios(resU.data.usuarios);
      if (resT.data.success) setTitulos(resT.data.titulos);
    } catch {
      mostrarMensaje("error", "Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/");
  };

  // ─────────────────────────────────────────────────────────
  // USUARIOS
  // ─────────────────────────────────────────────────────────

  const usuariosFiltrados = usuarios.filter((u) => {
    const rolesVisibles = ROLES_VISIBLES[usuarioActual?.rol] || [];
    if (!rolesVisibles.includes(u.rol)) return false;
    if (
      usuarioActual?.rol === "JEFE_PLANTA" &&
      u.tituloMineroId !== usuarioActual?.tituloMinero?.id &&
      u.id !== usuarioActual?.id
    )
      return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (
        !u.nombre.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q)
      )
        return false;
    }
    if (filtroRol !== "TODOS" && u.rol !== filtroRol) return false;
    if (filtroEstado === "ACTIVO" && !u.activo) return false;
    if (filtroEstado === "INACTIVO" && u.activo) return false;
    // ← agregar esto
    if (filtroTitulo !== "TODOS") {
      if (filtroTitulo === "SIN_ASIGNAR" && u.tituloMineroId) return false;
      if (filtroTitulo !== "SIN_ASIGNAR" && u.tituloMineroId !== filtroTitulo)
        return false;
    }
    return true;
  });

  const abrirModalCrearUser = () => {
    const rolDef = ROLES_GESTIONABLES[usuarioActual?.rol]?.[0] || "OPERARIO";
    setFormUser({
      nombre: "",
      email: "",
      password: "",
      confirmarPassword: "",
      rol: rolDef,
      tituloMineroId: "",
    });
    setErroresUser({});
    setModoEdicionUser(false);
    setUsuarioEditId(null);
    setModalUsuario(true);
  };

  const abrirModalEditarUser = (u) => {
    setFormUser({
      nombre: u.nombre,
      email: u.email,
      password: "",
      confirmarPassword: "",
      rol: u.rol,
      tituloMineroId: u.tituloMinero?.id || "",
    });
    setErroresUser({});
    setCambiarPassword(false);
    setModoEdicionUser(true);
    setUsuarioEditId(u.id);
    setModalUsuario(true);
  };

  const cerrarModalUser = () => {
    setModalUsuario(false);
    setErroresUser({});
    setCambiarPassword(false);
  };

  const validarFormUser = () => {
    const e = {};
    if (!formUser.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!formUser.email.trim()) e.email = "El email es obligatorio";
    if (!/\S+@\S+\.\S+/.test(formUser.email)) e.email = "Email inválido";

    // Validación de contraseña
    if (!modoEdicionUser) {
      if (!formUser.password) e.password = "La contraseña es obligatoria";
      else if (formUser.password.length < 8) e.password = "Mínimo 8 caracteres";
      else if (
        !/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*.])/.test(formUser.password)
      )
        e.password =
          "Debe tener al menos una mayúscula, una minúscula, un número y un símbolo";
    }

    // Si está editando y quiere cambiar la contraseña, también validarla
    if (modoEdicionUser && formUser.password) {
      if (formUser.password.length < 8) e.password = "Mínimo 8 caracteres";
      else if (
        !/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*.])/.test(formUser.password)
      )
        e.password =
          "Debe tener al menos una mayúscula, una minúscula, un número y un símbolo";
    }

    // Confirmación de contraseña
    if (
      !modoEdicionUser &&
      formUser.password &&
      formUser.password !== formUser.confirmarPassword
    )
      e.confirmarPassword = "Las contraseñas no coinciden";

    if (!formUser.rol) e.rol = "El rol es obligatorio";
    return e;
  };

  const handleGuardarUser = async (e) => {
    e.preventDefault();
    const errores = validarFormUser();
    if (Object.keys(errores).length > 0) {
      setErroresUser(errores);
      return;
    }
    try {
      setLoadingModal(true);
      const payload = {
        nombre: formUser.nombre.trim(),
        email: formUser.email.trim().toLowerCase(),
        rol: formUser.rol,
        tituloMineroId: formUser.tituloMineroId || null,
      };
      if (formUser.password) payload.password = formUser.password;

      if (modoEdicionUser) {
        await usuarioService.update(usuarioEditId, payload);
        mostrarMensaje("success", "✅ Usuario actualizado correctamente");
      } else {
        await usuarioService.create(payload);
        mostrarMensaje("success", "✅ Usuario creado correctamente");
      }
      cerrarModalUser();
      await cargarDatos();
    } catch (error) {
      mostrarMensaje(
        "error",
        `❌ ${error.response?.data?.message || "Error al guardar"}`,
      );
    } finally {
      setLoadingModal(false);
    }
  };

  const handleToggleEstado = async (u) => {
    const accion = u.activo ? "desactivar" : "activar";
    if (!window.confirm(`¿Estás seguro de ${accion} a ${u.nombre}?`)) return;
    try {
      await usuarioService.toggleStatus(u.id);
      mostrarMensaje(
        "success",
        `✅ Usuario ${accion === "activar" ? "activado" : "desactivado"}`,
      );
      await cargarDatos();
    } catch (error) {
      mostrarMensaje(
        "error",
        `❌ ${error.response?.data?.message || "Error al cambiar estado"}`,
      );
    }
  };

  const puedeEditar = (u) => {
    if (usuarioActual?.rol === "ADMIN") return true;
    if (usuarioActual?.rol === "JEFE_PLANTA")
      return (
        u.rol === "OPERARIO" &&
        u.tituloMinero?.id === usuarioActual?.tituloMinero?.id
      );
    return false;
  };

  const puedeCambiarEstado = (u) => {
    if (usuarioActual?.rol === "ADMIN") return true;
    if (usuarioActual?.rol === "JEFE_PLANTA")
      return (
        u.rol === "OPERARIO" &&
        u.tituloMinero?.id === usuarioActual?.tituloMinero?.id
      );
    return false;
  };

  const rolesParaSelector = ROLES_GESTIONABLES[usuarioActual?.rol] || [
    "OPERARIO",
  ];
  const rolBloqueado = rolesParaSelector.length === 1;

  // ─────────────────────────────────────────────────────────
  // TÍTULOS MINEROS
  // ─────────────────────────────────────────────────────────

  const titulosFiltrados = titulos.filter((t) => {
    if (!busquedaTitulo) return true;
    const q = busquedaTitulo.toLowerCase();
    return (
      t.numeroTitulo.toLowerCase().includes(q) ||
      t.municipio.toLowerCase().includes(q)
    );
  });

  // Usuarios con rol TITULAR sin título asignado (o el del título que se edita)
  const titularesDisponibles = usuarios.filter(
    (u) =>
      u.rol === "TITULAR" &&
      u.activo &&
      (!u.tituloMineroId || u.tituloMineroId === tituloEditId),
  );

  // Usuarios con rol JEFE_PLANTA sin título asignado (o el del título que se edita)
  const jefesDisponibles = usuarios.filter(
    (u) =>
      u.rol === "JEFE_PLANTA" &&
      u.activo &&
      (!u.tituloMineroId || u.tituloMineroId === tituloEditId),
  );

  const abrirModalCrearTitulo = () => {
    setFormTitulo({
      numeroTitulo: "",
      municipio: "",
      codigoMunicipio: "",
      fechaInicio: "",
      fechaVencimiento: "",
      observaciones: "",
      estado: "ACTIVO",
      titularId: "",
      jefePlantaId: "",
    });
    setErroresTitulo({});
    setModoEdicionTitulo(false);
    setTituloEditId(null);
    setModalTitulo(true);
  };

  const abrirModalEditarTitulo = async (t) => {
    try {
      setLoadingModalTit(true);
      setModalTitulo(true);
      setModoEdicionTitulo(true);
      setTituloEditId(t.id);

      const res = await tituloService.getById(t.id);
      const titulo = res.data.titulo;

      // Buscar titular y jefe asignados actualmente
      const titularActual = titulo.usuarios?.find((u) => u.rol === "TITULAR");
      const jefeActual = titulo.usuarios?.find((u) => u.rol === "JEFE_PLANTA");

      setFormTitulo({
        numeroTitulo: titulo.numeroTitulo,
        municipio: titulo.municipio,
        codigoMunicipio: titulo.codigoMunicipio || "",
        fechaInicio: titulo.fechaInicio
          ? new Date(titulo.fechaInicio).toISOString().split("T")[0]
          : "",
        fechaVencimiento: titulo.fechaVencimiento
          ? new Date(titulo.fechaVencimiento).toISOString().split("T")[0]
          : "",
        observaciones: titulo.observaciones || "",
        estado: titulo.estado || "ACTIVO",
        titularId: titularActual?.id || "",
        jefePlantaId: jefeActual?.id || "",
      });
      setErroresTitulo({});
    } catch {
      mostrarMensaje("error", "Error al cargar el título");
      setModalTitulo(false);
    } finally {
      setLoadingModalTit(false);
    }
  };

  const cerrarModalTitulo = () => {
    setModalTitulo(false);
    setErroresTitulo({});
  };

  const validarFormTitulo = () => {
    const e = {};
    if (!formTitulo.numeroTitulo.trim())
      e.numeroTitulo = "El número de título es obligatorio";
    if (!formTitulo.municipio.trim())
      e.municipio = "El municipio es obligatorio";
    if (!modoEdicionTitulo) {
      if (!formTitulo.titularId) e.titularId = "Debes asignar un Titular";
      if (!formTitulo.jefePlantaId)
        e.jefePlantaId = "Debes asignar un Jefe de Planta";
    }
    return e;
  };

  const handleGuardarTitulo = async (e) => {
    e.preventDefault();
    const errores = validarFormTitulo();
    if (Object.keys(errores).length > 0) {
      setErroresTitulo(errores);
      return;
    }
    try {
      setLoadingModalTit(true);
      if (modoEdicionTitulo) {
        await tituloService.update(tituloEditId, {
          municipio: formTitulo.municipio,
          codigoMunicipio: formTitulo.codigoMunicipio || null,
          fechaInicio: formTitulo.fechaInicio || null,
          fechaVencimiento: formTitulo.fechaVencimiento || null,
          observaciones: formTitulo.observaciones || null,
          estado: formTitulo.estado,
          titularId: formTitulo.titularId || null,
          jefePlantaId: formTitulo.jefePlantaId || null,
        });
        mostrarMensaje("success", "✅ Título actualizado correctamente");
      } else {
        await tituloService.create({
          numeroTitulo: formTitulo.numeroTitulo,
          municipio: formTitulo.municipio,
          codigoMunicipio: formTitulo.codigoMunicipio || null,
          fechaInicio: formTitulo.fechaInicio || null,
          fechaVencimiento: formTitulo.fechaVencimiento || null,
          observaciones: formTitulo.observaciones || null,
          titularId: formTitulo.titularId,
          jefePlantaId: formTitulo.jefePlantaId,
        });
        mostrarMensaje(
          "success",
          "✅ Título creado y usuarios asignados correctamente",
        );
      }
      cerrarModalTitulo();
      await cargarDatos();
    } catch (error) {
      mostrarMensaje(
        "error",
        `❌ ${error.response?.data?.message || "Error al guardar"}`,
      );
    } finally {
      setLoadingModalTit(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="usuarios-container">
      {/* ── Header ── */}
      <header className="usuarios-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt="Logo"
                  width="50"
                  height="50"
                  style={{ borderRadius: "8px", objectFit: "contain" }}
                />
              </div>
              <div>
                <h1>TU MINA</h1>
                <p>Desarrollado por CTGlobal</p>
              </div>
            </div>
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar">
                  <User size={20} />
                </div>
                <div className="user-details">
                  <p className="user-name">{usuarioActual?.nombre}</p>
                  <p className="user-role">{usuarioActual?.rol}</p>
                </div>
              </div>
              <SelectorTitulo />
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>
          <div className="breadcrumb">
            <button
              onClick={() => navigate("/home")}
              className="breadcrumb-link"
            >
              <ArrowLeft size={16} /> Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Administración</span>
          </div>
        </div>
      </header>

      <main className="usuarios-main">
        <div className="container">
          {/* Mensaje */}
          {mensaje.texto && (
            <div className={`alert alert-${mensaje.tipo}`}>
              {mensaje.tipo === "success" ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span>{mensaje.texto}</span>
            </div>
          )}

          {/* ── Pestañas ── */}
          <div className="tabs">
            <button
              className={`tab ${pestana === "usuarios" ? "tab-active" : ""}`}
              onClick={() => setPestana("usuarios")}
            >
              <Users size={18} /> Usuarios
            </button>
            {esAdmin && (
              <button
                className={`tab ${pestana === "titulos" ? "tab-active" : ""}`}
                onClick={() => setPestana("titulos")}
              >
                <Building2 size={18} /> Títulos Mineros
              </button>
            )}
          </div>

          {/* ══════════════════════════════════════════════
              PESTAÑA USUARIOS
          ══════════════════════════════════════════════ */}
          {pestana === "usuarios" && (
            <>
              <div className="page-toolbar">
                <div className="toolbar-left">
                  <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="filter-group">
                    <Filter size={16} />
                    <select
                      className="filter-select"
                      value={filtroRol}
                      onChange={(e) => setFiltroRol(e.target.value)}
                    >
                      <option value="TODOS">Todos los roles</option>
                      {(ROLES_VISIBLES[usuarioActual?.rol] || []).map((r) => (
                        <option key={r} value={r}>
                          {ROLES_DISPONIBLES[r]?.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="filter-select"
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                      <option value="TODOS">Todos los estados</option>
                      <option value="ACTIVO">Activos</option>
                      <option value="INACTIVO">Inactivos</option>
                    </select>

                    {/* ← agregar esto */}
                    {(usuarioActual?.rol === "ADMIN" ||
                      usuarioActual?.rol === "ASESOR") && (
                      <select
                        className="filter-select"
                        value={filtroTitulo}
                        onChange={(e) => setFiltroTitulo(e.target.value)}
                      >
                        <option value="TODOS">Todos los títulos</option>
                        {titulos.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.numeroTitulo} ({t.municipio})
                          </option>
                        ))}
                        <option value="SIN_ASIGNAR">Sin asignar</option>
                      </select>
                    )}
                  </div>
                </div>
                <div className="toolbar-right">
                  <span className="users-count">
                    <Users size={16} />
                    {usuariosFiltrados.length} usuario
                    {usuariosFiltrados.length !== 1 ? "s" : ""}
                  </span>
                  {tienePermiso("CREAR_USUARIO") && (
                    <button
                      className="btn btn-primary"
                      onClick={abrirModalCrearUser}
                    >
                      <Plus size={18} /> Nuevo Usuario
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="loading-container">
                  <div className="loading" />
                  <p>Cargando...</p>
                </div>
              ) : usuariosFiltrados.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} />
                  <h3>No hay usuarios</h3>
                  <p>
                    No se encontraron usuarios con los filtros seleccionados
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="tabla-usuarios">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Título Minero</th>
                        <th>Estado</th>
                        <th>Creado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosFiltrados.map((u) => (
                        <tr
                          key={u.id}
                          className={!u.activo ? "row-inactivo" : ""}
                        >
                          <td>
                            <div className="user-cell">
                              <div
                                className="user-avatar-sm"
                                style={{
                                  background:
                                    ROLES_DISPONIBLES[u.rol]?.color + "20",
                                  color: ROLES_DISPONIBLES[u.rol]?.color,
                                }}
                              >
                                {u.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="user-nombre">{u.nombre}</p>
                                <p className="user-email">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              className="badge-rol"
                              style={{
                                background:
                                  ROLES_DISPONIBLES[u.rol]?.color + "15",
                                color: ROLES_DISPONIBLES[u.rol]?.color,
                                border: `1px solid ${ROLES_DISPONIBLES[u.rol]?.color}40`,
                              }}
                            >
                              <Shield size={12} />
                              {ROLES_DISPONIBLES[u.rol]?.label || u.rol}
                            </span>
                          </td>
                          <td>
                            {u.tituloMinero ? (
                              `${u.tituloMinero.numeroTitulo} (${u.tituloMinero.municipio})`
                            ) : (
                              <span className="sin-titulo">Sin asignar</span>
                            )}
                          </td>
                          <td>
                            <span
                              className="badge-estado"
                              style={{
                                background: ESTADO_LABELS[u.activo].bg,
                                color: ESTADO_LABELS[u.activo].color,
                              }}
                            >
                              {ESTADO_LABELS[u.activo].label}
                            </span>
                          </td>
                          <td className="fecha-cell">
                            {new Date(u.createdAt).toLocaleDateString("es-CO")}
                          </td>
                          <td>
                            <div className="action-buttons">
                              {puedeEditar(u) && (
                                <button
                                  className="btn-icon btn-primary"
                                  title="Editar"
                                  onClick={() => abrirModalEditarUser(u)}
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              {puedeCambiarEstado(u) &&
                                u.id !== usuarioActual?.id && (
                                  <button
                                    className={`btn-icon ${u.activo ? "btn-danger" : "btn-success"}`}
                                    title={u.activo ? "Desactivar" : "Activar"}
                                    onClick={() => handleToggleEstado(u)}
                                  >
                                    <Power size={16} />
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════
              PESTAÑA TÍTULOS MINEROS
          ══════════════════════════════════════════════ */}
          {pestana === "titulos" && esAdmin && (
            <>
              <div className="page-toolbar">
                <div className="toolbar-left">
                  <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar por número o municipio..."
                      value={busquedaTitulo}
                      onChange={(e) => setBusquedaTitulo(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>
                <div className="toolbar-right">
                  <span className="users-count">
                    <Building2 size={16} />
                    {titulosFiltrados.length} título
                    {titulosFiltrados.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    className="btn btn-primary"
                    onClick={abrirModalCrearTitulo}
                  >
                    <Plus size={18} /> Nuevo Título
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loading-container">
                  <div className="loading" />
                  <p>Cargando...</p>
                </div>
              ) : titulosFiltrados.length === 0 ? (
                <div className="empty-state">
                  <Building2 size={48} />
                  <h3>No hay títulos mineros</h3>
                  <p>Crea el primer título minero para comenzar</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="tabla-usuarios">
                    <thead>
                      <tr>
                        <th>Número de Título</th>
                        <th>Municipio</th>
                        <th>Código</th>
                        <th>Vigencia</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {titulosFiltrados.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <div className="titulo-numero">
                              <Building2 size={16} className="titulo-icon" />
                              <strong>{t.numeroTitulo}</strong>
                            </div>
                          </td>
                          <td>
                            <div className="municipio-cell">
                              <MapPin size={14} />
                              {t.municipio}
                              {t.codigoMunicipio && (
                                <span className="codigo-mun">
                                  ({t.codigoMunicipio})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="fecha-cell">
                            {t.codigoMunicipio || "—"}
                          </td>
                          <td>
                            <div className="vigencia-cell">
                              <Calendar size={14} />
                              {t.fechaVencimiento ? (
                                new Date(t.fechaVencimiento).toLocaleDateString(
                                  "es-CO",
                                )
                              ) : (
                                <span className="sin-titulo">Sin fecha</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              className="badge-estado"
                              style={{
                                background:
                                  t.estado === "ACTIVO" ? "#dcfce7" : "#fee2e2",
                                color:
                                  t.estado === "ACTIVO" ? "#16a34a" : "#dc2626",
                              }}
                            >
                              {t.estado}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn-icon btn-primary"
                                title="Editar título"
                                onClick={() => abrirModalEditarTitulo(t)}
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════
          MODAL USUARIO
      ══════════════════════════════════════════════ */}
      {modalUsuario && (
        <div className="modal-overlay" onClick={cerrarModalUser}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modoEdicionUser ? (
                  <>
                    <Edit size={20} /> Editar Usuario
                  </>
                ) : (
                  <>
                    <Plus size={20} /> Nuevo Usuario
                  </>
                )}
              </h3>
              <button className="btn-close" onClick={cerrarModalUser}>
                <X size={22} />
              </button>
            </div>
            {loadingModal ? (
              <div className="loading-container" style={{ padding: "2rem" }}>
                <div className="loading" />
              </div>
            ) : (
              <form onSubmit={handleGuardarUser} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input
                    type="text"
                    className={`form-input ${erroresUser.nombre ? "error" : ""}`}
                    value={formUser.nombre}
                    onChange={(e) =>
                      setFormUser((p) => ({ ...p, nombre: e.target.value }))
                    }
                    placeholder="Nombre del usuario"
                  />
                  {erroresUser.nombre && (
                    <p className="field-error">{erroresUser.nombre}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Correo electrónico *</label>
                  <input
                    type="email"
                    className={`form-input ${erroresUser.email ? "error" : ""}`}
                    value={formUser.email}
                    onChange={(e) =>
                      setFormUser((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="correo@ejemplo.com"
                    disabled={modoEdicionUser}
                  />
                  {modoEdicionUser && (
                    <p className="field-hint">El email no se puede cambiar</p>
                  )}
                  {erroresUser.email && (
                    <p className="field-error">{erroresUser.email}</p>
                  )}
                </div>

                {/* Modo creación — campos directos */}
                {!modoEdicionUser && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Contraseña *</label>
                      <input
                        type="password"
                        className={`form-input ${erroresUser.password ? "error" : ""}`}
                        value={formUser.password}
                        onChange={(e) =>
                          setFormUser((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                        placeholder="Mínimo 8 caracteres"
                      />
                      {!erroresUser.password && (
                        <p className="field-hint">
                          Mínimo 8 caracteres, una mayúscula, un número y un
                          símbolo (!@#$%^&*.)
                        </p>
                      )}
                      {erroresUser.password && (
                        <p className="field-error">{erroresUser.password}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Confirmar contraseña *
                      </label>
                      <input
                        type="password"
                        className={`form-input ${erroresUser.confirmarPassword ? "error" : ""}`}
                        value={formUser.confirmarPassword}
                        onChange={(e) =>
                          setFormUser((p) => ({
                            ...p,
                            confirmarPassword: e.target.value,
                          }))
                        }
                        placeholder="Repite la contraseña"
                      />
                      {erroresUser.confirmarPassword && (
                        <p className="field-error">
                          {erroresUser.confirmarPassword}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Modo edición — contraseña colapsable */}
                {modoEdicionUser && (
                  <div className="form-group">
                    {!cambiarPassword ? (
                      <button
                        type="button"
                        className="btn-cambiar-password"
                        onClick={() => setCambiarPassword(true)}
                      >
                        Cambiar contraseña
                      </button>
                    ) : (
                      <div className="password-section">
                        <div className="password-section-header">
                          <span className="password-section-title">
                            Nueva contraseña
                          </span>
                          <button
                            type="button"
                            className="btn-cancelar-password"
                            onClick={() => {
                              setCambiarPassword(false);
                              setFormUser((p) => ({
                                ...p,
                                password: "",
                                confirmarPassword: "",
                              }));
                              setErroresUser((prev) => ({
                                ...prev,
                                password: "",
                                confirmarPassword: "",
                              }));
                            }}
                          >
                            Cancelar
                          </button>
                        </div>

                        <input
                          type="password"
                          className={`form-input ${erroresUser.password ? "error" : ""}`}
                          value={formUser.password}
                          onChange={(e) =>
                            setFormUser((p) => ({
                              ...p,
                              password: e.target.value,
                            }))
                          }
                          placeholder="Nueva contraseña"
                          style={{ marginBottom: "0.75rem" }}
                        />
                        {formUser.password && !erroresUser.password && (
                          <p className="field-hint">
                            Mínimo 8 caracteres, una mayúscula, un número y un
                            símbolo (!@#$%^&*.)
                          </p>
                        )}
                        {erroresUser.password && (
                          <p className="field-error">{erroresUser.password}</p>
                        )}

                        <input
                          type="password"
                          className={`form-input ${erroresUser.confirmarPassword ? "error" : ""}`}
                          value={formUser.confirmarPassword}
                          onChange={(e) =>
                            setFormUser((p) => ({
                              ...p,
                              confirmarPassword: e.target.value,
                            }))
                          }
                          placeholder="Confirmar nueva contraseña"
                          style={{ marginTop: "0.75rem" }}
                        />
                        {erroresUser.confirmarPassword && (
                          <p className="field-error">
                            {erroresUser.confirmarPassword}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rol *</label>
                    <select
                      className={`form-select ${erroresUser.rol ? "error" : ""}`}
                      value={formUser.rol}
                      onChange={(e) => {
                        const nuevoRol = e.target.value;
                        setFormUser((p) => ({
                          ...p,
                          rol: nuevoRol,
                          tituloMineroId: ["ADMIN", "ASESOR"].includes(nuevoRol)
                            ? ""
                            : p.tituloMineroId,
                        }));
                      }}
                      disabled={rolBloqueado}
                    >
                      {rolesParaSelector.map((r) => (
                        <option key={r} value={r}>
                          {ROLES_DISPONIBLES[r]?.label}
                        </option>
                      ))}
                    </select>
                    {rolBloqueado && (
                      <p className="field-hint">
                        Solo puedes crear usuarios con este rol
                      </p>
                    )}
                    {erroresUser.rol && (
                      <p className="field-error">{erroresUser.rol}</p>
                    )}
                  </div>

                  {usuarioActual?.rol !== "JEFE_PLANTA" &&
                    !["ADMIN", "ASESOR"].includes(formUser.rol) && (
                      <div className="form-group">
                        <label className="form-label">Título Minero</label>
                        <select
                          className="form-select"
                          value={formUser.tituloMineroId}
                          onChange={(e) =>
                            setFormUser((p) => ({
                              ...p,
                              tituloMineroId: e.target.value,
                            }))
                          }
                        >
                          <option value="">Sin asignar</option>
                          {titulos.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.numeroTitulo} ({t.municipio})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={cerrarModalUser}
                  >
                    <X size={18} /> Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loadingModal}
                  >
                    <Save size={18} />
                    {loadingModal
                      ? "Guardando..."
                      : modoEdicionUser
                        ? "Actualizar"
                        : "Crear Usuario"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODAL TÍTULO MINERO
      ══════════════════════════════════════════════ */}
      {modalTitulo && (
        <div className="modal-overlay" onClick={cerrarModalTitulo}>
          <div
            className="modal-content modal-content-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                {modoEdicionTitulo ? (
                  <>
                    <Edit size={20} /> Editar Título Minero
                  </>
                ) : (
                  <>
                    <Plus size={20} /> Nuevo Título Minero
                  </>
                )}
              </h3>
              <button className="btn-close" onClick={cerrarModalTitulo}>
                <X size={22} />
              </button>
            </div>
            {loadingModalTit ? (
              <div className="loading-container" style={{ padding: "2rem" }}>
                <div className="loading" />
              </div>
            ) : (
              <form onSubmit={handleGuardarTitulo} className="modal-form">
                {/* Número de título — solo en creación */}
                {!modoEdicionTitulo && (
                  <div className="form-group">
                    <label className="form-label">Número de Título *</label>
                    <input
                      type="text"
                      className={`form-input ${erroresTitulo.numeroTitulo ? "error" : ""}`}
                      value={formTitulo.numeroTitulo}
                      onChange={(e) =>
                        setFormTitulo((p) => ({
                          ...p,
                          numeroTitulo: e.target.value,
                        }))
                      }
                      placeholder="Ej: GBH-151"
                    />
                    {erroresTitulo.numeroTitulo && (
                      <p className="field-error">
                        {erroresTitulo.numeroTitulo}
                      </p>
                    )}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Municipio *</label>
                    <input
                      type="text"
                      className={`form-input ${erroresTitulo.municipio ? "error" : ""}`}
                      value={formTitulo.municipio}
                      onChange={(e) =>
                        setFormTitulo((p) => ({
                          ...p,
                          municipio: e.target.value,
                        }))
                      }
                      placeholder="Ej: Buriticá"
                    />
                    {erroresTitulo.municipio && (
                      <p className="field-error">{erroresTitulo.municipio}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Código Municipio</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formTitulo.codigoMunicipio}
                      onChange={(e) =>
                        setFormTitulo((p) => ({
                          ...p,
                          codigoMunicipio: e.target.value,
                        }))
                      }
                      placeholder="Ej: 05113"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fecha de Inicio</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formTitulo.fechaInicio}
                      onChange={(e) =>
                        setFormTitulo((p) => ({
                          ...p,
                          fechaInicio: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formTitulo.fechaVencimiento}
                      onChange={(e) =>
                        setFormTitulo((p) => ({
                          ...p,
                          fechaVencimiento: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Estado — solo en edición */}
                {modoEdicionTitulo && (
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select
                      className="form-select"
                      value={formTitulo.estado}
                      onChange={(e) =>
                        setFormTitulo((p) => ({ ...p, estado: e.target.value }))
                      }
                    >
                      {ESTADO_TITULO.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-textarea"
                    value={formTitulo.observaciones}
                    onChange={(e) =>
                      setFormTitulo((p) => ({
                        ...p,
                        observaciones: e.target.value,
                      }))
                    }
                    placeholder="Observaciones adicionales..."
                    rows="2"
                  />
                </div>

                {/* Asignación de usuarios */}
                <div className="seccion-asignacion">
                  <h4 className="seccion-titulo">
                    <Users size={16} /> Asignación de Usuarios
                  </h4>
                  <p className="seccion-desc">
                    {modoEdicionTitulo
                      ? "Puedes cambiar el Titular o el Jefe de Planta. El usuario anterior quedará sin título asignado."
                      : "Selecciona el Titular y el Jefe de Planta. Solo aparecen usuarios activos sin título asignado."}
                  </p>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Titular Minero {!modoEdicionTitulo && "*"}
                    </label>
                    <select
                      className={`form-select ${erroresTitulo.titularId ? "error" : ""}`}
                      value={formTitulo.titularId}
                      onChange={(e) =>
                        setFormTitulo((p) => ({
                          ...p,
                          titularId: e.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {modoEdicionTitulo
                          ? "Sin cambios"
                          : "Seleccionar titular..."}
                      </option>
                      {titularesDisponibles.length === 0 ? (
                        <option disabled>No hay titulares disponibles</option>
                      ) : (
                        titularesDisponibles.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre} — {u.email}
                          </option>
                        ))
                      )}
                    </select>
                    {erroresTitulo.titularId && (
                      <p className="field-error">{erroresTitulo.titularId}</p>
                    )}
                    {titularesDisponibles.length === 0 && (
                      <p className="field-hint">
                        No hay titulares disponibles sin título asignado
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Jefe de Planta {!modoEdicionTitulo && "*"}
                    </label>
                    <select
                      className={`form-select ${erroresTitulo.jefePlantaId ? "error" : ""}`}
                      value={formTitulo.jefePlantaId}
                      onChange={(e) =>
                        setFormTitulo((p) => ({
                          ...p,
                          jefePlantaId: e.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {modoEdicionTitulo
                          ? "Sin cambios"
                          : "Seleccionar jefe de planta..."}
                      </option>
                      {jefesDisponibles.length === 0 ? (
                        <option disabled>No hay jefes disponibles</option>
                      ) : (
                        jefesDisponibles.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre} — {u.email}
                          </option>
                        ))
                      )}
                    </select>
                    {erroresTitulo.jefePlantaId && (
                      <p className="field-error">
                        {erroresTitulo.jefePlantaId}
                      </p>
                    )}
                    {jefesDisponibles.length === 0 && (
                      <p className="field-hint">
                        No hay jefes disponibles sin título asignado
                      </p>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={cerrarModalTitulo}
                  >
                    <X size={18} /> Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loadingModalTit}
                  >
                    <Save size={18} />
                    {loadingModalTit
                      ? "Guardando..."
                      : modoEdicionTitulo
                        ? "Actualizar"
                        : "Crear Título"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
