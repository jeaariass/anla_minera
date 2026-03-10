import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";
import { authService, reportService, usuarioService } from "../services/api";
import { useTituloActivo } from "../context/TituloContext";
import { ArrowLeft, User, LogOut, Map as MapIcon, Filter, FileSpreadsheet, Download, ChevronUp, ChevronDown, ChevronsUpDown, Clock, AlertTriangle } from "lucide-react";
import "./Reportes.css";

import SelectorTitulo from "../components/SelectorTitulo";

// Fix iconos de Leaflet para Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Componente auxiliar para volar al primer punto
const FlyToFirst = ({ center }) => {
  const map = useMap();
  const flew = useRef(false);
  useEffect(() => {
    if (!flew.current && center) {
      map.flyTo(center, 14, { duration: 1.5 });
      flew.current = true;
    }
  }, [center, map]);
  return null;
};

const CATEGORIA_COLORS = {
  extraccion:    "#e74c3c",
  acopio:        "#3498db",
  procesamiento: "#f39c12",
};

const CATEGORIA_LABELS = {
  extraccion:    "⛏️ Extracción",
  acopio:        "📦 Acopio",
  procesamiento: "⚙️ Procesamiento",
};

// ── Helper: ordenamiento genérico ──────────────────────────
const ordenar = (arr, col, dir) => {
  return [...arr].sort((a, b) => {
    let va = a[col] ?? "";
    let vb = b[col] ?? "";
    if (typeof va === "number" || !isNaN(Number(va))) {
      va = Number(va) || 0; vb = Number(vb) || 0;
    } else {
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
    }
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ?  1 : -1;
    return 0;
  });
};

// ── Icono de ordenamiento ──────────────────────────────────
const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={12} style={{ opacity: 0.35, marginLeft: 3, verticalAlign: "middle" }} />;
  return sortDir === "asc"
    ? <ChevronUp   size={12} style={{ marginLeft: 3, verticalAlign: "middle" }} />
    : <ChevronDown size={12} style={{ marginLeft: 3, verticalAlign: "middle" }} />;
};


const fmtFecha = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleString("es-CO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtMin = (m) => {
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

// ═══════════════════════════════════════════════════════════
// COLUMNAS PUNTOS ACTIVIDAD
// ═══════════════════════════════════════════════════════════
const COLS_PUNTOS = [
  { key: "fecha",            label: "Fecha y Hora"      },
  { key: "dia",              label: "Día"               },
  { key: "usuarioId",        label: "Usuario"           },
  { key: "categoria",        label: "Categoría"         },
  { key: "itemDisplay",      label: "Actividad"         },
  //{ key: "itemOtro",         label: "Actividad (Otro)"  },
  { key: "maquinariaNombre", label: "Maquinaria"        },
  //{ key: "maquinariaOtro",   label: "Maquinaria (Otro)" },
  { key: "descripcion",      label: "Descripción"       },
  { key: "volumenM3",        label: "Volumen m³"        },
  //{ key: "updated_at",       label: "Últ. edición"      },
];

// ═══════════════════════════════════════════════════════════
// COLUMNAS PARADAS
// ═══════════════════════════════════════════════════════════
const COLS_PARADAS = [
  { key: "dia",          label: "Día"          },
  { key: "usuarioId",    label: "Usuario"      },
  { key: "motivoDisplay",label: "Motivo"       },
  { key: "motivoOtro",   label: "Motivo Otro"  },
  { key: "inicio",       label: "Inicio"       },
  { key: "fin",          label: "Fin"          },
  { key: "minutesParo",  label: "Minutos paro" },
  { key: "observaciones",label: "Observaciones"},
  //{ key: "estado",       label: "Estado"       },
];

// ═══════════════════════════════════════════════════════════
// COMPONENTE TABLA REUTILIZABLE
// ═══════════════════════════════════════════════════════════
const TablaReporte = ({ datos, columnas, renderCell, maxRows = 200 }) => {
  const [sortCol, setSortCol] = useState(columnas[0]?.key || "");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sorted = useMemo(() => ordenar(datos, sortCol, sortDir), [datos, sortCol, sortDir]);

  return (
    <div className="tabla-wrapper">
      <table className="tabla-reporte">
        <thead>
          <tr>
            {columnas.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)}
                style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                {col.label}
                <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, maxRows).map((row, i) => (
            <tr key={row.id || i}>
              {columnas.map(col => (
                <td key={col.key}>{renderCell(row, col.key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {datos.length > maxRows && (
        <div className="tabla-info">
          Mostrando {maxRows} de {datos.length} registros. Exporta a CSV para ver todos.
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
const MapaActividades = () => {
  const navigate = useNavigate();
  const [user] = useState(authService.getCurrentUser());
  const { tituloActivoId } = useTituloActivo();
  const [todosLosPuntos, setTodosLosPuntos] = useState([]); // ⬅️ NUEVO: guardar TODOS los puntos
  const [puntosFiltrados, setPuntosFiltrados] = useState([]); // ⬅️ NUEVO: puntos después del filtro
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState(""); // '' = todos
  const [center, setCenter] = useState([5.0689, -75.5174]);
  const [usuarios, setUsuarios] = useState([]);


  // Cargar todos los usuarios del sistema
  useEffect(() => {
    usuarioService.getAll()
      .then(r => { if (r.data?.success) setUsuarios(r.data.usuarios || []); })
      .catch(e => console.error("Error cargando usuarios:", e));
  }, []);

  // Cargar TODOS los puntos una sola vez al inicio
  useEffect(() => {
    if (!tituloActivoId) return;
    cargarPuntos();
  }, [tituloActivoId]);

  // ── Paradas ────────────────────────────────────────────
  const [todasParadas,    setTodasParadas]    = useState([]);
  const [loadingParadas,  setLoadingParadas]  = useState(true);

  // ── Filtros reporte puntos ─────────────────────────────
  const [pFechaInicio, setPFechaInicio] = useState("");
  const [pFechaFin,    setPFechaFin]    = useState("");
  const [pCategoria,   setPCategoria]   = useState("");
  const [pUsuario,     setPUsuario]     = useState("");

  // ── Filtros reporte paradas ────────────────────────────
  const [rFechaInicio, setRFechaInicio] = useState("");
  const [rFechaFin,    setRFechaFin]    = useState("");
  const [rEstado,      setREstado]      = useState("");
  const [rUsuario,     setRUsuario]     = useState("");

  // ── Export ────────────────────────────────────────────
  const [exportandoPuntos,   setExportandoPuntos]   = useState(false);
  const [exportSuccessPuntos, setExportSuccessPuntos] = useState("");
  const [exportErrorPuntos,   setExportErrorPuntos]   = useState("");
  const [exportandoParadas,   setExportandoParadas]   = useState(false);
  const [exportSuccessParadas, setExportSuccessParadas] = useState("");
  const [exportErrorParadas,   setExportErrorParadas]   = useState("");

  useEffect(() => { cargarPuntos();  }, []);
  // Recargar paradas cuando cambia el título activo (igual que puntos)
  useEffect(() => {
    if (!tituloActivoId) return;
    cargarParadas();
  }, [tituloActivoId]);
  useEffect(() => { filtrarPuntos(); }, [filtroCategoria, todosLosPuntos]);

  const tituloId = user?.tituloMinero?.id || user?.tituloMineroId;

  const cargarPuntos = async () => {
    try {
      setLoading(true);

      // ⬅️ SIN parámetros de filtro - traer TODOS
      // const response = await api.get("/actividad/puntos/titulo-816-17");

      const response = await api.get(`/actividad/puntos/${tituloActivoId}`);

      if (response.data.success) {
        setTodosLosPuntos(response.data.data);

        // Centrar en el primer punto si hay datos
        if (response.data.data.length > 0) {
          const firstPoint = response.data.data[0];
          setCenter([
            parseFloat(firstPoint.latitud),
            parseFloat(firstPoint.longitud),
          ]);
        }
      }
    } catch (e) { console.error("Error puntos:", e); }
    finally     { setLoading(false); }
  };

  const cargarParadas = async () => {
    try {
      setLoadingParadas(true);
      if (!tituloActivoId) { setLoadingParadas(false); return; }
      console.log('🔄 Cargando paradas para título:', tituloActivoId);
      const res = await api.get(`/paradas/${tituloActivoId}`);
      if (res.data.success) {
        const raw = res.data.data || [];
        console.log('📦 Paradas cargadas:', raw.length, '| ejemplo campo usuario:', raw[0]?.usuario_id, raw[0]?.usuarioId);
        const normalized = raw.map(p => ({ ...p, usuarioId: p.usuarioId || p.usuario_id || '' }));
        setTodasParadas(normalized);
      }
    } catch (e) { console.error("Error paradas:", e); }
    finally     { setLoadingParadas(false); }
  };

  const filtrarPuntos = () => {
    if (!filtroCategoria) setPuntosFiltrados(todosLosPuntos);
    else setPuntosFiltrados(todosLosPuntos.filter(p => p.categoria === filtroCategoria));
  };

  const contarPorCategoria = (cat) =>
    !cat ? todosLosPuntos.length : todosLosPuntos.filter(p => p.categoria === cat).length;

  // ── Usuarios únicos para los selects ──────────────────
  const usuariosPuntos  = usuarios; // lista completa del sistema
  const usuariosParadas = usuarios; // lista completa del sistema

  // ── Datos filtrados puntos ─────────────────────────────
  const puntosFiltradosReporte = useMemo(() => todosLosPuntos.filter(p => {
    if (pCategoria  && p.categoria  !== pCategoria)  return false;
    if (pUsuario    && p.usuarioId  !== pUsuario)    return false;
    if (pFechaInicio && new Date(p.fecha) < new Date(pFechaInicio))              return false;
    if (pFechaFin   && new Date(p.fecha) > new Date(pFechaFin + "T23:59:59"))   return false;
    return true;
  }), [todosLosPuntos, pCategoria, pUsuario, pFechaInicio, pFechaFin]);

  // ── Datos filtrados paradas ────────────────────────────
  const paradasFiltradas = useMemo(() => {
    console.log('🔍 Filtrando paradas | total:', todasParadas.length, '| rUsuario:', rUsuario);
    if (todasParadas.length > 0) console.log('  ejemplo usuarioId:', todasParadas[0].usuarioId);
    return todasParadas.filter(p => {
    const pUserId = p.usuarioId || p.usuario_id || '';
    if (rUsuario  && pUserId !== rUsuario) return false;
    if (rEstado   && p.estado    !== rEstado)  return false;
    if (rFechaInicio && p.dia < rFechaInicio)  return false;
    if (rFechaFin   && p.dia > rFechaFin)      return false;
    return true;
    });
  }, [todasParadas, rUsuario, rEstado, rFechaInicio, rFechaFin]);

  // ── Totales paradas ────────────────────────────────────
  const totalMinutosParadas = useMemo(() =>
    paradasFiltradas.reduce((acc, p) => acc + (Number(p.minutesParo) || 0), 0),
  [paradasFiltradas]);

  // ── Centro del mapa ──────────────────────────────────────
  const firstCenter = useMemo(() => {
    const p = puntosFiltrados[0];
    if (!p) return null;
    const lat = parseFloat(p.latitud ?? p.lat);
    const lon = parseFloat(p.longitud ?? p.lon ?? p.lng);
    return (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null;
  }, [puntosFiltrados]);

  // ── Exportar puntos (Excel vía backend) ───────────────
  const handleExportarPuntos = async () => {
    try {
      setExportandoPuntos(true); setExportErrorPuntos(""); setExportSuccessPuntos("");
      const params = { tipo: "puntosActividad", fechaInicio: pFechaInicio, fechaFin: pFechaFin, usuarioId: pUsuario || "", tituloMineroId: tituloActivoId || "" };
      const res = await reportService.exportarExcel(params);
      if (res.data instanceof Blob && res.data.type?.includes("json")) { const text = await res.data.text(); throw new Error(JSON.parse(text).message || "Error"); }
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      const nombre = `Actividades_${pCategoria || "todas"}_${new Date().toISOString().split("T")[0]}.xlsx`;
      Object.assign(a, { href: url, download: nombre }); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setExportSuccessPuntos(`✓ "${nombre}" descargado`);
    } catch (err) { setExportErrorPuntos(err.message || err.response?.data?.message || "Error al exportar"); }
    finally { setExportandoPuntos(false); }
  };

  // ── Exportar paradas (CSV client-side) ────────────────
  const handleExportarParadas = async () => {
    try {
      setExportandoParadas(true); setExportErrorParadas(""); setExportSuccessParadas("");
      const params = { tipo: "paradasActividad", fechaInicio: rFechaInicio, fechaFin: rFechaFin, usuarioId: rUsuario || "", estado: rEstado || "", tituloMineroId: tituloActivoId || "" };
      const res = await reportService.exportarExcel(params);
      if (res.data instanceof Blob && res.data.type?.includes("json")) { const text = await res.data.text(); throw new Error(JSON.parse(text).message || "Error"); }
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      const nombre = `Paradas_${new Date().toISOString().split("T")[0]}.xlsx`;
      Object.assign(a, { href: url, download: nombre }); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setExportSuccessParadas(`✓ "${nombre}" descargado`);
    } catch (err) { setExportErrorParadas(err.message || err.response?.data?.message || "Error al exportar"); }
    finally { setExportandoParadas(false); }
  };

  // ── Render celdas puntos ───────────────────────────────
  const renderPunto = (p, key) => {
    switch (key) {
      case "fecha": case "updated_at": return <span style={{ whiteSpace: "nowrap" }}>{fmtFecha(p[key])}</span>;
      case "usuarioId": return <span className="chip-usuario">{p.usuarioId || "—"}</span>;
      case "categoria": return (
        <span style={{
          background: (CATEGORIA_COLORS[p.categoria] || "#999") + "22",
          color: CATEGORIA_COLORS[p.categoria] || "#999",
          borderRadius: 12, padding: "2px 8px", fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap",
        }}>
          {CATEGORIA_LABELS[p.categoria] || p.categoria || "—"}
        </span>
      );
      case "volumenM3": return p.volumenM3 != null ? `${p.volumenM3} m³` : "—";
      case "descripcion": return <span style={{ maxWidth: 220, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.descripcion}>{p.descripcion || "—"}</span>;
      default: return p[key] || "—";
    }
  };

  // ── Render celdas paradas ──────────────────────────────
  const renderParada = (p, key) => {
    switch (key) {
      case "usuarioId": return <span className="chip-usuario">{p.usuarioId || "—"}</span>;
      case "inicio": case "fin": return <span style={{ whiteSpace: "nowrap" }}>{fmtFecha(p[key])}</span>;
      case "minutesParo": return (
        <span style={{ fontWeight: 600, color: "#e74c3c" }}>
          {fmtMin(Number(p.minutesParo))}
        </span>
      );
      case "estado": return (
        <span style={{
          background: p.estado === "ENVIADO" ? "#d1fae5" : "#fef3c7",
          color:      p.estado === "ENVIADO" ? "#065f46" : "#92400e",
          borderRadius: 12, padding: "2px 8px", fontWeight: 600, fontSize: "0.75rem",
        }}>
          {p.estado === "ENVIADO" ? "✅ Enviado" : "📝 Borrador"}
        </span>
      );
      case "observaciones": return <span style={{ maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.observaciones}>{p.observaciones || "—"}</span>;
      default: return p[key] || "—";
    }
  };

  const handleLogout = () => { authService.logout(); navigate("/"); };

  if (loading) {
    return (
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh", flexDirection:"column", gap:"20px" }}>
        <div className="loading"></div>
        <p>Cargando mapa...</p>
      </div>
    );
  }

  const createCustomIcon = (color) => L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color:${color};width:25px;height:25px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [25, 25], iconAnchor: [12, 12],
  });

  return (
    <div className="mapa-container">
      {/* Header */}
      <header className="reportes-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo TU MINA" width="50" height="50" style={{ borderRadius:"8px", objectFit:"contain" }} />
              </div>
              <div><h1>TU MINA</h1><p>Desarrollado por CTGlobal</p></div>
            </div>
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar"><User size={20} /></div>
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
            <button onClick={() => navigate("/home")} className="breadcrumb-link"><ArrowLeft size={18} /> Volver al Home</button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Mapa de Actividades</span>
          </div>

          {/* Page Title */}
          <div className="page-title-section">
            <div className="page-title-icon"><MapIcon size={40} /></div>
            <div>
              <h2 className="page-title">🗺️ Mapa de Actividades Mineras</h2>
              <p className="page-subtitle">
                Visualización georeferenciada — Mostrando: {puntosFiltrados.length} de {todosLosPuntos.length} puntos
              </p>
            </div>
          </div>

          {/* Filtros del mapa */}
          <div className="card" style={{ marginBottom:"20px" }}>
            <div className="card-header"><Filter size={20} /><h3>Filtros de Visualización</h3></div>
            <div className="card-body">
              <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
                {[["", "Todos", "#3D9B9B"], ["extraccion","⛏️ Extracción","#e74c3c"], ["acopio","📦 Acopio","#3498db"], ["procesamiento","⚙️ Procesamiento","#f39c12"]].map(([cat, label, color]) => {
                  const activo = filtroCategoria === cat;
                  return (
                    <button key={cat} onClick={() => setFiltroCategoria(cat)} className="btn btn-outline"
                      style={{ minWidth:"130px", fontWeight:600,
                        backgroundColor: activo ? color : "white",
                        borderColor:     activo ? color : "#e2e8f0",
                        color:           activo ? "white" : "#718096",
                        boxShadow:       activo ? `0 2px 8px ${color}55` : "none",
                        transform:       activo ? "translateY(-1px)" : "none",
                        transition:      "all 0.2s",
                      }}>
                      {label} ({contarPorCategoria(cat)})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div className="card" style={{ marginBottom:"20px" }}>
            <div className="card-body" style={{ padding:0, height:"600px", position:"relative" }}>
              <MapContainer center={firstCenter || [5.0689, -75.5174]} zoom={firstCenter ? 10 : 8} style={{ height:"100%", width:"100%" }}>
                {firstCenter && <FlyToFirst center={firstCenter} />}
                <LayersControl position="topright">
                  <LayersControl.BaseLayer name="🗺️ Mapa Normal">
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer checked name="🛰️ Vista Satelital">
                    <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {puntosFiltrados.map(punto => (
                  <React.Fragment key={punto.id}>
                    <Marker position={[parseFloat(punto.latitud), parseFloat(punto.longitud)]} icon={createCustomIcon(CATEGORIA_COLORS[punto.categoria])}>
                      <Popup>
                        <div style={{ minWidth:"200px" }}>
                          <h3 style={{ margin:"0 0 10px 0", color:CATEGORIA_COLORS[punto.categoria] }}>{CATEGORIA_LABELS[punto.categoria]}</h3>
                          {punto.itemDisplay && <p style={{ margin:"5px 0" }}><strong>Actividad:</strong> {punto.itemDisplay}</p>}
                          {punto.descripcion && <p style={{ margin:"5px 0" }}><strong>Descripción:</strong><br />{punto.descripcion}</p>}
                          {punto.maquinariaNombre && <p style={{ margin:"5px 0" }}><strong>🚜 Maquinaria:</strong> {punto.maquinariaNombre}</p>}
                          {punto.volumenM3 && <p style={{ margin:"5px 0" }}><strong>📊 Volumen:</strong> {punto.volumenM3} m³</p>}
                          <p style={{ margin:"10px 0 0 0", fontSize:"12px", color:"#666" }}>📍 {parseFloat(punto.latitud).toFixed(6)}, {parseFloat(punto.longitud).toFixed(6)}</p>
                          <p style={{ margin:"5px 0 0 0", fontSize:"12px", color:"#999" }}>🕐 {fmtFecha(punto.fecha)}</p>
                        </div>
                      </Popup>
                    </Marker>
                    <Circle center={[parseFloat(punto.latitud), parseFloat(punto.longitud)]} radius={20}
                      pathOptions={{ color:CATEGORIA_COLORS[punto.categoria], fillColor:CATEGORIA_COLORS[punto.categoria], fillOpacity:0.2 }} />
                  </React.Fragment>
                ))}
              </MapContainer>

              {/* Leyenda */}
              <div style={{ position:"absolute", bottom:"20px", right:"20px", backgroundColor:"white", padding:"15px", borderRadius:"8px", boxShadow:"0 2px 10px rgba(0,0,0,0.2)", zIndex:1000 }}>
                <h4 style={{ margin:"0 0 10px 0", fontSize:"14px", fontWeight:"bold" }}>Leyenda</h4>
                {Object.entries(CATEGORIA_COLORS).map(([key, color]) => (
                  <div key={key} style={{ display:"flex", alignItems:"center", marginBottom:"5px" }}>
                    <div style={{ width:"18px", height:"18px", borderRadius:"50%", backgroundColor:color, marginRight:"8px", border:"2px solid white", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}></div>
                    <span style={{ fontSize:"13px" }}>{CATEGORIA_LABELS[key]} ({contarPorCategoria(key)})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ REPORTE PUNTOS DE ACTIVIDAD ══ */}
          <div className="card" style={{ marginBottom:"20px" }}>
            <div className="card-header">
              <FileSpreadsheet size={20} />
              <h3 style={{ margin:0, flex:1 }}>
                Reporte de Puntos de Actividad
                {puntosFiltradosReporte.length > 0 && (
                  <span className="badge-filtros" style={{ marginLeft:10 }}>{puntosFiltradosReporte.length} registros</span>
                )}
              </h3>
            </div>
            <div className="card-body">
              {/* Filtros */}
              <div className="form-grid" style={{ marginBottom:16 }}>
                <div className="form-group">
                  <label>📋 Categoría</label>
                  <select className="form-control" value={pCategoria} onChange={e => setPCategoria(e.target.value)}>
                    <option value="">Todas</option>
                    <option value="extraccion">⛏️ Extracción</option>
                    <option value="acopio">📦 Acopio</option>
                    <option value="procesamiento">⚙️ Procesamiento</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>👤 Usuario</label>
                  <select className="form-control" value={pUsuario} onChange={e => setPUsuario(e.target.value)}>
                    <option value="">Todos</option>
                    {usuariosPuntos.map(u => <option key={u.id} value={u.id}>{u.nombre || u.email || u.id}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>📅 Fecha Inicio</label>
                  <input type="date" className="form-control" value={pFechaInicio}
                    onChange={e => setPFechaInicio(e.target.value)} max={pFechaFin || undefined} />
                </div>
                <div className="form-group">
                  <label>📅 Fecha Fin</label>
                  <input type="date" className="form-control" value={pFechaFin}
                    onChange={e => setPFechaFin(e.target.value)} min={pFechaInicio || undefined} />
                </div>
                <div className="form-group" style={{ justifyContent:"flex-end", flexDirection:"row", gap:8, paddingTop:22 }}>
                  <button className="btn btn-outline" style={{ height:40 }}
                    onClick={() => { setPCategoria(""); setPUsuario(""); setPFechaInicio(""); setPFechaFin(""); setExportSuccessPuntos(""); }}>
                    Limpiar
                  </button>
                  <button className="btn btn-success" style={{ height:40 }}
                    onClick={handleExportarPuntos} disabled={exportandoPuntos || puntosFiltradosReporte.length === 0}>
                    {exportandoPuntos
                      ? <><Download size={14} className="spin" /> Exportando...</>
                      : <><FileSpreadsheet size={14} /> Excel</>}
                  </button>
                </div>
              </div>

              {exportErrorPuntos   && <div className="alert alert-error"   style={{ marginBottom:12 }}>{exportErrorPuntos}</div>}
              {exportSuccessPuntos && <div className="alert alert-success" style={{ marginBottom:12 }}>{exportSuccessPuntos}</div>}

              {puntosFiltradosReporte.length === 0 ? (
                <div className="estado-vacio">
                  <FileSpreadsheet size={32} style={{ opacity:0.3 }} />
                  <p>No hay registros con los filtros aplicados</p>
                </div>
              ) : (
                <TablaReporte datos={puntosFiltradosReporte} columnas={COLS_PUNTOS} renderCell={renderPunto} />
              )}
            </div>
          </div>

          {/* ══ REPORTE PARADAS ══ */}
          <div className="card" style={{ marginBottom:"20px" }}>
            <div className="card-header">
              <AlertTriangle size={20} style={{ color:"#e74c3c" }} />
              <h3 style={{ margin:0, flex:1 }}>
                Reporte de Paradas
                {paradasFiltradas.length > 0 && (
                  <span className="badge-filtros" style={{ marginLeft:10 }}>{paradasFiltradas.length} registros</span>
                )}
              </h3>
              {/* Totalizador */}
              {paradasFiltradas.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.85rem", fontWeight:600, color:"#e74c3c", background:"#fff0f0", padding:"4px 12px", borderRadius:20, border:"1px solid #fcc" }}>
                  <Clock size={14} />
                  Total: {fmtMin(totalMinutosParadas)}
                </div>
              )}
            </div>
            <div className="card-body">
              {/* Filtros */}
              <div className="form-grid" style={{ marginBottom:16 }}>
                <div className="form-group">
                  <label>👤 Usuario</label>
                  <select className="form-control" value={rUsuario} onChange={e => setRUsuario(e.target.value)}>
                    <option value="">Todos</option>
                    {usuariosParadas.map(u => <option key={u.id} value={u.id}>{u.nombre || u.email || u.id}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>📊 Estado</label>
                  <select className="form-control" value={rEstado} onChange={e => setREstado(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="ENVIADO">✅ Enviado</option>
                    <option value="BORRADOR">📝 Borrador</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>📅 Fecha Inicio</label>
                  <input type="date" className="form-control" value={rFechaInicio}
                    onChange={e => setRFechaInicio(e.target.value)} max={rFechaFin || undefined} />
                </div>
                <div className="form-group">
                  <label>📅 Fecha Fin</label>
                  <input type="date" className="form-control" value={rFechaFin}
                    onChange={e => setRFechaFin(e.target.value)} min={rFechaInicio || undefined} />
                </div>
                <div className="form-group" style={{ justifyContent:"flex-end", flexDirection:"row", gap:8, paddingTop:22 }}>
                  <button className="btn btn-outline" style={{ height:40 }}
                    onClick={() => { setRUsuario(""); setREstado(""); setRFechaInicio(""); setRFechaFin(""); }}>
                    Limpiar
                  </button>
                  <button className="btn btn-success" style={{ height:40 }}
                    onClick={handleExportarParadas} disabled={exportandoParadas || paradasFiltradas.length === 0}>
                    {exportandoParadas
                      ? <><Download size={14} className="spin" /> Exportando...</>
                      : <><FileSpreadsheet size={14} /> Excel</>}
                  </button>
                </div>
              </div>

              {exportErrorParadas   && <div className="alert alert-error"   style={{ marginBottom:12 }}>{exportErrorParadas}</div>}
              {exportSuccessParadas && <div className="alert alert-success" style={{ marginBottom:12 }}>{exportSuccessParadas}</div>}

              {loadingParadas ? (
                <div className="estado-vacio"><div className="spin" style={{ width:24, height:24, border:"3px solid #e2e8f0", borderTop:"3px solid #4299e1", borderRadius:"50%" }}></div><p>Cargando paradas...</p></div>
              ) : paradasFiltradas.length === 0 ? (
                <div className="estado-vacio">
                  <AlertTriangle size={32} style={{ opacity:0.3 }} />
                  <p>No hay paradas con los filtros aplicados</p>
                </div>
              ) : (
                <TablaReporte datos={paradasFiltradas} columnas={COLS_PARADAS} renderCell={renderParada} />
              )}
            </div>
          </div>

          {/* Instrucciones */}
          <div className="card info-card">
            <div className="card-header"><h3>📋 Instrucciones de Uso</h3></div>
            <div className="card-body">
              <ol className="instruction-list">
                <li>Usa los botones de categoría para filtrar los marcadores en el mapa</li>
                <li>El mapa se centra automáticamente en el primer punto registrado</li>
                <li>Filtra el reporte de actividad por categoría, usuario y fechas</li>
                <li>Filtra el reporte de paradas por usuario, estado y fechas</li>
                <li>Haz clic en los encabezados de columna para ordenar la tabla</li>
                <li>Exporta actividades a Excel o paradas a CSV (compatible con Excel)</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MapaActividades;
