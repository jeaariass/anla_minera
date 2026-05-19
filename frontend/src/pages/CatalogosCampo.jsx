import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Check,
  ToggleLeft,
  ToggleRight,
  Pickaxe,
  Boxes,
  Cog,
  ClipboardCheck,
  Wrench,
  AlertCircle,
  Settings2,
} from "lucide-react";
import { authService, catalogosCampoService } from "../services/api";
import { tienePermiso } from "../utils/permissions";
import SelectorTitulo from "../components/SelectorTitulo";
import { CATEGORIAS as CATEGORIAS_BASE } from "../constants/categorias";
import "./Reportes.css";
import "./CatalogosCampo.css";

// Mapeo de icono por categoría — vive solo aquí porque es UI-specific.
const ICONOS = {
  extraccion:      <Pickaxe size={16} />,
  acopio:          <Boxes size={16} />,
  procesamiento:   <Cog size={16} />,
  reprocesamiento: <Cog size={16} />,
  inspeccion:      <ClipboardCheck size={16} />,
};

const CATEGORIAS = CATEGORIAS_BASE.map((c) => ({
  id:    c.id,
  label: `${c.emoji} ${c.label}`,
  icon:  ICONOS[c.id] ?? <Cog size={16} />,
  color: c.color,
}));

const TABS = [
  { id: "items", label: "Procesos / Ítems", icon: <Cog size={16} /> },
  { id: "maquinaria", label: "Maquinaria", icon: <Wrench size={16} /> },
];

const CatalogosCampo = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("items");
  const [categoriaActiva, setCategoriaActiva] = useState("extraccion");
  const [items, setItems] = useState([]);
  const [maquinaria, setMaquinaria] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState(null);

  // Forms
  const [formItem, setFormItem] = useState({
    id: null,
    categoria: "extraccion",
    codigo: "",
    nombre: "",
    orden: 0,
    activo: true,
  });
  const [formMaq, setFormMaq] = useState({
    id: null,
    codigo: "",
    marca: "",
    modelo: "",
    orden: 0,
    activo: true,
  });

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  useEffect(() => {
    if (tab === "items") cargarItems();
    else cargarMaquinaria();
  }, [tab, categoriaActiva]);

  const mostrarAviso = (tipo, mensaje) => {
    setAviso({ tipo, mensaje });
    setTimeout(() => setAviso(null), 3500);
  };

  // ── Items ───────────────────────────────────────────
  const cargarItems = async () => {
    setLoading(true);
    try {
      const res = await catalogosCampoService.listarItems({
        categoria: categoriaActiva,
      });
      setItems(res.data?.data || []);
    } catch (err) {
      mostrarAviso(
        "error",
        err.response?.data?.message || "Error cargando ítems",
      );
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormItem = () =>
    setFormItem({
      id: null,
      categoria: categoriaActiva,
      codigo: "",
      nombre: "",
      orden: 0,
      activo: true,
    });

  const guardarItem = async (e) => {
    e.preventDefault();
    if (!formItem.codigo.trim() || !formItem.nombre.trim()) {
      mostrarAviso("error", "Código y nombre son obligatorios");
      return;
    }
    try {
      if (formItem.id) {
        await catalogosCampoService.editarItem(formItem.id, formItem);
        mostrarAviso("ok", "Ítem actualizado correctamente");
      } else {
        await catalogosCampoService.crearItem(formItem);
        mostrarAviso("ok", "Ítem creado correctamente");
      }
      limpiarFormItem();
      cargarItems();
    } catch (err) {
      mostrarAviso(
        "error",
        err.response?.data?.message || "Error al guardar ítem",
      );
    }
  };

  const editarItem = (item) => {
    setFormItem({
      id: item.id,
      categoria: item.categoria,
      codigo: item.codigo,
      nombre: item.nombre,
      orden: item.orden ?? 0,
      activo: item.activo,
    });
  };

  const eliminarItem = async (item) => {
    const ok = window.confirm(
      `¿Eliminar el ítem "${item.nombre}"?\n\nSi el ítem está en uso, se desactivará automáticamente.`,
    );
    if (!ok) return;
    try {
      const res = await catalogosCampoService.eliminarItem(item.id);
      mostrarAviso("ok", res.data?.message || "Eliminado");
      cargarItems();
    } catch (err) {
      mostrarAviso(
        "error",
        err.response?.data?.message || "Error al eliminar",
      );
    }
  };

  const toggleActivoItem = async (item) => {
    try {
      await catalogosCampoService.editarItem(item.id, {
        activo: !item.activo,
      });
      cargarItems();
    } catch (err) {
      mostrarAviso(
        "error",
        err.response?.data?.message || "Error al cambiar estado",
      );
    }
  };

  // ── Maquinaria ──────────────────────────────────────
  const cargarMaquinaria = async () => {
    setLoading(true);
    try {
      const res = await catalogosCampoService.listarMaquinaria();
      setMaquinaria(res.data?.data || []);
    } catch (err) {
      mostrarAviso(
        "error",
        err.response?.data?.message || "Error cargando maquinaria",
      );
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormMaq = () =>
    setFormMaq({
      id: null,
      codigo: "",
      marca: "",
      modelo: "",
      orden: 0,
      activo: true,
    });

  const guardarMaq = async (e) => {
    e.preventDefault();
    if (
      !formMaq.codigo.trim() ||
      !formMaq.marca.trim() ||
      !formMaq.modelo.trim()
    ) {
      mostrarAviso("error", "Código, marca y modelo son obligatorios");
      return;
    }
    try {
      if (formMaq.id) {
        await catalogosCampoService.editarMaquinaria(formMaq.id, formMaq);
        mostrarAviso("ok", "Maquinaria actualizada");
      } else {
        await catalogosCampoService.crearMaquinaria(formMaq);
        mostrarAviso("ok", "Maquinaria creada");
      }
      limpiarFormMaq();
      cargarMaquinaria();
    } catch (err) {
      mostrarAviso(
        "error",
        err.response?.data?.message || "Error al guardar maquinaria",
      );
    }
  };

  const editarMaq = (m) => {
    setFormMaq({
      id: m.id,
      codigo: m.codigo,
      marca: m.marca,
      modelo: m.modelo,
      orden: m.orden ?? 0,
      activo: m.activo,
    });
  };

  const eliminarMaq = async (m) => {
    const ok = window.confirm(
      `¿Eliminar la maquinaria "${m.display}"?\n\nSi está en uso se desactivará automáticamente.`,
    );
    if (!ok) return;
    try {
      const res = await catalogosCampoService.eliminarMaquinaria(m.id);
      mostrarAviso("ok", res.data?.message || "Eliminada");
      cargarMaquinaria();
    } catch (err) {
      mostrarAviso(
        "error",
        err.response?.data?.message || "Error al eliminar",
      );
    }
  };

  const toggleActivoMaq = async (m) => {
    try {
      await catalogosCampoService.editarMaquinaria(m.id, { activo: !m.activo });
      cargarMaquinaria();
    } catch (err) {
      mostrarAviso(
        "error",
        err.response?.data?.message || "Error al cambiar estado",
      );
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/");
  };

  if (!tienePermiso("VER_PAGINA_CATALOGOS_CAMPO")) {
    return (
      <div className="cc-noauth">
        <AlertCircle size={28} />
        <p>No tienes permiso para acceder a esta página.</p>
        <button onClick={() => navigate("/home")}>Volver al inicio</button>
      </div>
    );
  }

  const categoriaActual = CATEGORIAS.find((c) => c.id === categoriaActiva);

  return (
    <div className="reportes-container">
      {/* ─── HEADER (igual que Mapa de Actividades) ─── */}
      <header className="reportes-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt="Logo TU MINA"
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
                  <p className="user-name">{user?.nombre || "Usuario"}</p>
                  <p className="user-role">{user?.rol || "ROL"}</p>
                </div>
              </div>
              <SelectorTitulo />
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="reportes-main">
        <div className="container">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button
              onClick={() => navigate("/home")}
              className="breadcrumb-link"
            >
              <ArrowLeft size={18} /> Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Catálogos de Campo</span>
          </div>

          {/* Page Title */}
          <div className="page-title-section">
            <div
              className="page-title-icon"
              style={{
                background:
                  "linear-gradient(135deg, #fca5a5 0%, #f87171 100%)",
                boxShadow: "0 8px 16px rgba(252, 165, 165, 0.45)",
              }}
            >
              <Settings2 size={40} />
            </div>
            <div>
              <h2 className="page-title">Catálogos de Actividades en Campo</h2>
              <p className="page-subtitle">
                Administra la maquinaria y los ítems de cada proceso
                (extracción, acopio, procesamiento, inspección).
              </p>
            </div>
          </div>

          {/* Toast */}
          {aviso && (
            <div
              className={`alert ${
                aviso.tipo === "ok" ? "alert-success" : "alert-error"
              }`}
            >
              {aviso.tipo === "ok" ? (
                <Check size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{aviso.mensaje}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="cc-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`cc-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ═══ ITEMS POR PROCESO ═══ */}
          {tab === "items" && (
            <>
              {/* Selector de categoría */}
              <div className="card" style={{ marginBottom: "20px" }}>
                <div className="card-header">
                  <Cog size={20} />
                  <h3>Categoría a editar</h3>
                </div>
                <div className="card-body">
                  <div
                    style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                  >
                    {CATEGORIAS.map((c) => {
                      const activo = categoriaActiva === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCategoriaActiva(c.id);
                            setFormItem((f) => ({
                              ...f,
                              categoria: c.id,
                              id: null,
                            }));
                          }}
                          className="btn btn-outline"
                          style={{
                            minWidth: "150px",
                            fontWeight: 600,
                            backgroundColor: activo ? c.color : "white",
                            borderColor: activo ? c.color : "#e2e8f0",
                            color: activo ? "white" : "#718096",
                            boxShadow: activo
                              ? `0 2px 8px ${c.color}55`
                              : "none",
                            transform: activo ? "translateY(-1px)" : "none",
                            transition: "all 0.2s",
                            margin: 0,
                          }}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="cc-grid">
                {/* Formulario */}
                <div className="card">
                  <div className="card-header">
                    {formItem.id ? <Pencil size={20} /> : <Plus size={20} />}
                    <h3>
                      {formItem.id
                        ? "Editar ítem"
                        : `Nuevo ítem en ${categoriaActual?.label}`}
                    </h3>
                  </div>
                  <div className="card-body">
                    <form onSubmit={guardarItem}>
                      <div
                        className="cc-categoria-actual"
                        style={{
                          borderColor: categoriaActual?.color,
                          background: `${categoriaActual?.color}15`,
                        }}
                      >
                        <span className="cc-categoria-actual-label">
                          Categoría
                        </span>
                        <strong style={{ color: categoriaActual?.color }}>
                          {categoriaActual?.label}
                        </strong>
                        <small>
                          Cámbiala con los botones de la parte superior.
                        </small>
                      </div>
                      <div className="cc-form-grid">
                        <div className="form-group cc-col-span-2">
                          <label>Código (único por categoría)</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ej. PALA, OTRO, MEZCLADO"
                            value={formItem.codigo}
                            onChange={(e) =>
                              setFormItem({
                                ...formItem,
                                codigo: e.target.value.toUpperCase(),
                              })
                            }
                          />
                        </div>
                        <div className="form-group cc-col-span-2">
                          <label>Nombre visible</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ej. Pala mecánica"
                            value={formItem.nombre}
                            onChange={(e) =>
                              setFormItem({
                                ...formItem,
                                nombre: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Orden</label>
                          <input
                            type="number"
                            className="form-control"
                            value={formItem.orden}
                            onChange={(e) =>
                              setFormItem({
                                ...formItem,
                                orden: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Estado</label>
                          <label className="cc-switch">
                            <input
                              type="checkbox"
                              checked={formItem.activo}
                              onChange={(e) =>
                                setFormItem({
                                  ...formItem,
                                  activo: e.target.checked,
                                })
                              }
                            />
                            <span>{formItem.activo ? "Activo" : "Inactivo"}</span>
                          </label>
                        </div>
                      </div>

                      <div className="card-actions">
                        {formItem.id && (
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={limpiarFormItem}
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          className="btn btn-secondary"
                        >
                          <Check size={16} />
                          {formItem.id ? "Guardar cambios" : "Crear ítem"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Tabla */}
                <div className="card">
                  <div className="card-header">
                    <Cog size={20} />
                    <h3>
                      Ítems en {categoriaActual?.label}{" "}
                      <small style={{ color: "#94a3b8", fontWeight: 500 }}>
                        ({items.length})
                      </small>
                    </h3>
                  </div>
                  <div className="card-body">
                    {loading ? (
                      <p className="cc-empty">Cargando...</p>
                    ) : items.length === 0 ? (
                      <p className="cc-empty">
                        No hay ítems en esta categoría todavía.
                      </p>
                    ) : (
                      <div className="cc-table-wrap">
                        <table className="cc-table">
                          <thead>
                            <tr>
                              <th>Orden</th>
                              <th>Código</th>
                              <th>Nombre</th>
                              <th>Estado</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((it) => (
                              <tr
                                key={it.id}
                                className={!it.activo ? "cc-inactive" : ""}
                              >
                                <td>{it.orden ?? 0}</td>
                                <td>
                                  <code>{it.codigo}</code>
                                </td>
                                <td>{it.nombre}</td>
                                <td>
                                  <button
                                    className="cc-toggle"
                                    onClick={() => toggleActivoItem(it)}
                                    title={
                                      it.activo
                                        ? "Activo (clic para desactivar)"
                                        : "Inactivo (clic para activar)"
                                    }
                                  >
                                    {it.activo ? (
                                      <ToggleRight size={20} color="#10b981" />
                                    ) : (
                                      <ToggleLeft size={20} color="#9ca3af" />
                                    )}
                                    <span>
                                      {it.activo ? "Activo" : "Inactivo"}
                                    </span>
                                  </button>
                                </td>
                                <td className="cc-actions">
                                  <button
                                    className="cc-icon-btn"
                                    onClick={() => editarItem(it)}
                                    title="Editar"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    className="cc-icon-btn cc-icon-btn--danger"
                                    onClick={() => eliminarItem(it)}
                                    title="Eliminar"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══ MAQUINARIA ═══ */}
          {tab === "maquinaria" && (
            <div className="cc-grid">
              <div className="card">
                <div className="card-header">
                  {formMaq.id ? <Pencil size={20} /> : <Plus size={20} />}
                  <h3>
                    {formMaq.id ? "Editar maquinaria" : "Nueva maquinaria"}
                  </h3>
                </div>
                <div className="card-body">
                  <form onSubmit={guardarMaq}>
                    <div className="cc-form-grid">
                      <div className="form-group">
                        <label>Código (único)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. CAT-320, OTRO"
                          value={formMaq.codigo}
                          onChange={(e) =>
                            setFormMaq({
                              ...formMaq,
                              codigo: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Marca</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. Caterpillar"
                          value={formMaq.marca}
                          onChange={(e) =>
                            setFormMaq({ ...formMaq, marca: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group cc-col-span-2">
                        <label>Modelo</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. 320D"
                          value={formMaq.modelo}
                          onChange={(e) =>
                            setFormMaq({ ...formMaq, modelo: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Orden</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formMaq.orden}
                          onChange={(e) =>
                            setFormMaq({
                              ...formMaq,
                              orden: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Estado</label>
                        <label className="cc-switch">
                          <input
                            type="checkbox"
                            checked={formMaq.activo}
                            onChange={(e) =>
                              setFormMaq({
                                ...formMaq,
                                activo: e.target.checked,
                              })
                            }
                          />
                          <span>{formMaq.activo ? "Activa" : "Inactiva"}</span>
                        </label>
                      </div>
                    </div>

                    <div className="card-actions">
                      {formMaq.id && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={limpiarFormMaq}
                        >
                          Cancelar
                        </button>
                      )}
                      <button type="submit" className="btn btn-secondary">
                        <Check size={16} />
                        {formMaq.id ? "Guardar cambios" : "Crear maquinaria"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <Wrench size={20} />
                  <h3>
                    Maquinaria registrada{" "}
                    <small style={{ color: "#94a3b8", fontWeight: 500 }}>
                      ({maquinaria.length})
                    </small>
                  </h3>
                </div>
                <div className="card-body">
                  {loading ? (
                    <p className="cc-empty">Cargando...</p>
                  ) : maquinaria.length === 0 ? (
                    <p className="cc-empty">No hay maquinaria registrada.</p>
                  ) : (
                    <div className="cc-table-wrap">
                      <table className="cc-table">
                        <thead>
                          <tr>
                            <th>Orden</th>
                            <th>Código</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Estado</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {maquinaria.map((m) => (
                            <tr
                              key={m.id}
                              className={!m.activo ? "cc-inactive" : ""}
                            >
                              <td>{m.orden ?? 0}</td>
                              <td>
                                <code>{m.codigo}</code>
                              </td>
                              <td>{m.marca}</td>
                              <td>{m.modelo}</td>
                              <td>
                                <button
                                  className="cc-toggle"
                                  onClick={() => toggleActivoMaq(m)}
                                  title={
                                    m.activo
                                      ? "Activa (clic para desactivar)"
                                      : "Inactiva (clic para activar)"
                                  }
                                >
                                  {m.activo ? (
                                    <ToggleRight size={20} color="#10b981" />
                                  ) : (
                                    <ToggleLeft size={20} color="#9ca3af" />
                                  )}
                                  <span>
                                    {m.activo ? "Activa" : "Inactiva"}
                                  </span>
                                </button>
                              </td>
                              <td className="cc-actions">
                                <button
                                  className="cc-icon-btn"
                                  onClick={() => editarMaq(m)}
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="cc-icon-btn cc-icon-btn--danger"
                                  onClick={() => eliminarMaq(m)}
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CatalogosCampo;
