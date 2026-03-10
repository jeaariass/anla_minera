import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService, friService } from "../services/api";
import { useTituloActivo } from "../context/TituloContext";
import api from "../services/api";
import {
  FileText, BarChart3, Download, User, LogOut, Building2, Calendar,
  Edit, Send, Map, Activity, MapPin, Clock, Users, FileCheck, FolderOpen,
  ClipboardList, Wrench, Award, ShieldCheck, Zap,
} from "lucide-react";
import { MapContainer, TileLayer, WMSTileLayer, Circle, Tooltip, useMap, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Home.css";
import { tienePermiso } from "../utils/permissions";
import SelectorTitulo from "../components/SelectorTitulo";

/* ── Colores por categoría ── */
const CAT_COLORS = {
  extraccion:    "#e74c3c",
  acopio:        "#3498db",
  procesamiento: "#f39c12",
};

/* Centro por defecto: Colombia */
const DEFAULT_CENTER = [5.7, -75.5];   /* Eje Cafetero — Caldas / Risaralda / Antioquia */
const DEFAULT_ZOOM   = 8;

/* ══════════════════════════════════════════════════════════
   REGISTRO DE TÍTULOS MINEROS
   Agrega aquí los títulos que quieres mostrar en el mapa.
   Polígono digitalizado manualmente del visor SIGM ANM.
   ══════════════════════════════════════════════════════════ */
const TITULOS_REGISTRY = {
  "816-17": {
    id:           "816-17",
    estado:       "Activo",
    etapa:        "Explotación",
    municipio:    "VITERBO",
    departamento: "Caldas",
    area_ha:      "123,5147",
    clasificacion:"Mediana Minería",
    minerales:    "Arenas, Gravas",
    titular:      "ALVARO GOMEZ BOTERO",
    modalidad:    "Contrato de Concesión (L 685)",
    expedicion:   "Nov 8, 2006",
    expiracion:   "Nov 7, 2036",
    /* Centroide oficial ANM */
    centroid: [5.07804, -75.85707],
    /* Polígono extraído con OpenCV del GeoTIFF exportado del SIGM ANM
       6 vértices — coordenadas WGS84 exactas */
    polygon: [
      [-75.851064, 5.086797],  /* NE superior (inicio diagonal)      */
      [-75.863123, 5.086754],  /* NW esquina superior izquierda      */
      [-75.863166, 5.069356],  /* SW esquina inferior izquierda      */
      [-75.858317, 5.069313],  /* SE esquina inferior derecha        */
      [-75.858274, 5.079530],  /* escalón — borde derecho medio      */
      [-75.850936, 5.086455],  /* fin diagonal superior derecha      */
      [-75.851064, 5.086797],  /* cierre                             */
    ],
    /* URL del visor oficial SIGM ANM centrado en este título */
    sigmUrl: "https://annamineria.anm.gov.co/geocortex/essentials/rest/sites/Titulos/viewers/Titulos_H5/virtualdirectory/Resources/Viewer/index.html?viewer=Titulos_H5",
  },
  /* ─── Agrega más títulos aquí ─── */
};

/* Construye un GeoJSON Feature a partir del registro */
const buildGeoJSON = (info) => ({
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [info.polygon] },
    properties: { TENURE_ID: info.id, TITULO_ESTADO: info.estado },
  }],
});

/* ─── Legacy alias — se mantiene por si algo lo referencia ─── */
const TITULO_816_INFO = TITULOS_REGISTRY["816-17"];

/* Ajusta bounds al GeoJSON una vez cargado y bloquea la vista */
const FitGeoJSON = ({ geojson }) => {
  const map = useMap();
  useEffect(() => {
    if (!geojson) return;
    try {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: false });
        /* Bloquear el mapa a esos bounds exactos */
        map.setMaxBounds(bounds.pad(0.15));
        map.dragging.disable();
      }
    } catch { /* silencioso */ }
  }, [geojson, map]);
  return null;
};

/* ════════════════════════════════════════════════════════
   MAPA TÍTULO MINERO — polígono hardcodeado + capa WMS ANM
   ════════════════════════════════════════════════════════ */
const ANM_WMS_URL = "https://geo.anm.gov.co/webgis/services/ANM/ServiciosANM/MapServer/WMSServer";

const TituloPoligonoMapa = ({ info }) => {
  const geojson = buildGeoJSON(info);

  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <MapContainer
      center={info.centroid}
      zoom={13}
      className="titulo-mapa"
      zoomControl={true}
      scrollWheelZoom={true}
      doubleClickZoom={false}
      dragging={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
    >
      {/* Base satelital Esri */}
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" opacity={0.5} />

      {/* Capa WMS oficial ANM — contexto de todos los títulos */}
      <WMSTileLayer
        url={ANM_WMS_URL}
        layers="0"
        format="image/png"
        transparent={true}
        version="1.1.1"
        opacity={0.35}
        attribution="© ANM"
      />

      {/* Polígono del título activo */}
      <GeoJSON
        key={info.id}
        data={geojson}
        style={{ color: "#00e5ff", weight: 3.5, fillColor: "#00bcd4", fillOpacity: 0.28 }}
      >
        <Tooltip sticky>
          Título {info.id} · {info.municipio}, {info.departamento} · {info.area_ha} ha
        </Tooltip>
      </GeoJSON>

      {/* Ajusta el mapa al polígono */}
      <FitGeoJSON geojson={geojson} />
    </MapContainer>
  );
};

/* Componente auxiliar: vuela al primer punto si hay datos */
const FlyToPoints = ({ puntos }) => {
  const map   = useMap();
  const flew  = useRef(false);
  useEffect(() => {
    if (!flew.current && puntos.length > 0) {
      map.flyTo([puntos[0].latitud, puntos[0].longitud], 13, { duration: 1.4 });
      flew.current = true;
    }
  }, [puntos, map]);
  return null;
};

/* ════════════════════════════════════════════════════════
   MINI MAPA LEAFLET — siempre visible, fondo satelital
   ════════════════════════════════════════════════════════ */
const MiniMapa = ({ puntos, onVerMapa }) => {
  /* Fix Leaflet icons UNA SOLA VEZ, dentro del componente */
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div className="op-map-wrap">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="op-map"
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
      >
        {/* Fondo satelital Esri — gratuito, sin API key */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {/* Etiquetas encima del satélite */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          opacity={0.6}
        />

        {/* Puntos de actividad */}
        {puntos.map((pt, i) => (
          <Circle
            key={i}
            center={[pt.latitud, pt.longitud]}
            radius={120}
            pathOptions={{
              color:       CAT_COLORS[pt.categoria] || "#667eea",
              fillColor:   CAT_COLORS[pt.categoria] || "#667eea",
              fillOpacity: 0.8,
              weight:      2,
            }}
          >
            <Tooltip>{pt.categoria || "Actividad"}</Tooltip>
          </Circle>
        ))}

        {/* Volar al primer punto si hay datos */}
        <FlyToPoints puntos={puntos} />
      </MapContainer>

      <div className="op-map-footer">
        <MapPin size={11} />
        {puntos.length > 0
          ? <>{puntos.length} punto{puntos.length !== 1 ? "s" : ""} registrado{puntos.length !== 1 ? "s" : ""} ·{" "}</>
          : "Vista previa del área · "
        }
        <button className="op-map-link" onClick={onVerMapa}>
          Ver mapa completo →
        </button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   CATEGORÍAS DE ACCIONES
   ════════════════════════════════════════════════════════ */
const CATEGORIAS = [
  { id: "fri",          label: "Gestión FRI",          sublabel: "Formatos de Reporte según la Resolución 371/2024 de la Agencia Nacional de Mineria",  icon: <ClipboardList size={18}/>, accentColor: "#667eea", bgLight: "#f0f0ff", borderColor: "#c7d2fe" },
  { id: "operacion",    label: "Actividades en Campo",    sublabel: "Operación y paradas diarias en la mina",   icon: <Wrench size={18}/>,        accentColor: "#e74c3c", bgLight: "#fff4f4", borderColor: "#fca5a5" },
  { id: "certificados", label: "Certificados y Ventas", sublabel: "Origen mineral y documentos",   icon: <Award size={18}/>,         accentColor: "#059669", bgLight: "#f0fdf4", borderColor: "#6ee7b7" },
  { id: "admin",        label: "Administración",        sublabel: "Usuarios y control de acceso",  icon: <ShieldCheck size={18}/>,   accentColor: "#1e3a5f", bgLight: "#f0f4ff", borderColor: "#93c5fd" },
];

/* ════════════════════════════════════════════════════════
   HOME
   ════════════════════════════════════════════════════════ */
const Home = () => {
  const navigate = useNavigate();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [puntosActividad, setPuntosActividad] = useState([]);
  const [stats, setStats] = useState({
    totalFormularios: 0, borradores: 0, enviados: 0,
    aprobados: 0, rechazados: 0, porTipo: {},
    paradasHoy: 0, minutosParadoHoy: 0, puntosHoy: 0,
  });

  const { tituloActivoId, titulos, cargando, esRolGlobal, intentoCargado } = useTituloActivo();
  const tituloActivo = titulos?.find(t => t.id === tituloActivoId) || user?.tituloMinero || null;

  useEffect(() => {
    loadUserData();
    if (esRolGlobal && (cargando || (!tituloActivoId && !intentoCargado))) return;
    loadAllStats();
  }, [tituloActivoId, cargando]);

  const loadUserData = () => setUser(authService.getCurrentUser());

  const loadAllStats = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      const tipos = [
        "produccion","inventarios","paradas","ejecucion",
        "maquinaria","regalias","capacidad","inventarioMaquinaria","proyecciones",
      ];
      const sd = {
        totalFormularios: 0, borradores: 0, enviados: 0,
        aprobados: 0, rechazados: 0, porTipo: {},
        paradasHoy: 0, minutosParadoHoy: 0, puntosHoy: 0,
      };

      if (tienePermiso("VER_FRI")) {
        for (const tipo of tipos) {
          try {
            const method = `get${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
            const res = await friService[method]({ tituloMineroId: tituloActivoId });
            if (res.data.success && res.data.fris) {
              const fris = res.data.fris;
              sd.totalFormularios += fris.length;
              sd.porTipo[tipo] = fris.length;
              fris.forEach(f => {
                if      (f.estado === "BORRADOR")  sd.borradores++;
                else if (f.estado === "ENVIADO")   sd.enviados++;
                else if (f.estado === "RECHAZADO") sd.rechazados++;
              });
            }
          } catch { sd.porTipo[tipo] = 0; }
        }
      }

      const hoy = new Date(Date.now() - 5 * 3600000).toISOString().split("T")[0];
      const esOperario = currentUser?.rol === "OPERARIO";
      try {
        const [rResumen, rPuntos] = await Promise.all([
          api.get(`/paradas/resumen/${tituloActivoId}?dia=${hoy}${esOperario ? `&usuarioId=${currentUser.id}` : ""}`),
          api.get(`/actividad/puntos/${tituloActivoId}`),
        ]);
        if (rResumen.data.success) {
          sd.paradasHoy       = rResumen.data.resumen.totalParadas ?? 0;
          sd.minutosParadoHoy = rResumen.data.resumen.totalMinutos ?? 0;
        }
        if (rPuntos.data.success) {
          const all = rPuntos.data.data ?? [];
          setPuntosActividad(all.filter(p => p.latitud && p.longitud));
          sd.puntosHoy = all.filter(p =>
            p.dia && String(p.dia).split("T")[0] === hoy &&
            (!esOperario || p.usuarioId === currentUser.id)
          ).length;
        }
      } catch { /* silencioso */ }

      setStats(sd);
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { authService.logout(); navigate("/"); };

  const quickActions = [
    /* FRI — tonos índigo */
    { categoria: "fri",          icon: <FileText  size={26}/>, title: "Formularios FRI",      description: "Crea, edita y envía tus formularios FRI",         path: "/formularios",           cardBg: "#4f46e5", permiso: "VER_PAGINA_FORMULARIOS"        },
    { categoria: "fri",          icon: <BarChart3 size={26}/>, title: "Estadísticas FRI",        description: "Analiza el estado y avance de tus reportes",      path: "/dashboard",             cardBg: "#6366f1", permiso: "VER_PAGINA_DASHBOARD"          },
    { categoria: "fri",          icon: <Download  size={26}/>, title: "Exportar Reportes",    description: "Descarga reportes consolidados en PDF y Excel",    path: "/reportes",              cardBg: "#818cf8", permiso: "VER_PAGINA_REPORTES"           },
    /* Operación — tonos rojo/coral */
    { categoria: "operacion",    icon: <Activity  size={26}/>, title: "Registrar Operación",  description: "Reporta paradas y puntos de actividad del turno", path: "/formularios-operacion", cardBg: "#dc2626", permiso: "VER_PAGINA_OPERACION"          },
    { categoria: "operacion",    icon: <BarChart3 size={26}/>, title: "Estadísticas de Operación",  description: "Revisa gráficas de paradas y tiempos operados",    path: "/dashboard-operacion",   cardBg: "#ef4444", permiso: "VER_PAGINA_OPERACION"          },
    { categoria: "operacion",    icon: <Map       size={26}/>, title: "Mapa de Actividades en Campo",  description: "Consulta puntos registrados", path: "/mapa",                  cardBg: "#f87171", permiso: "VER_PAGINA_MAPA"               },
    /* Certificados — tonos verde esmeralda */
    { categoria: "certificados", icon: <FileCheck size={26}/>, title: "Certificado de Origen",description: "Genera y descarga certificados de origen", path: "/certificado-origen",    cardBg: "#059669", permiso: "VER_PAGINA_CERTIFICADO_ORIGEN" },
    { categoria: "certificados", icon: <FolderOpen size={26}/>,title: "Gestor de Archivos",   description: "Accede a certificados y documentos guardados",     path: "/gestor-archivos",       cardBg: "#10b981", permiso: "VER_GESTOR_ARCHIVOS"           },
    /* Admin — tonos azul marino */
    { categoria: "admin",        icon: <Users     size={26}/>, title: "Gestión de Usuarios",  description: "Administra cuentas, permisos y títulos",          path: "/usuarios",              cardBg: "#1e3a5f", permiso: "VER_PAGINA_USUARIOS"           },
  ];

  const tiposFormularios = [
    { id: "produccion",           nombre: "Producción",       color: "#667eea" },
    { id: "inventarios",          nombre: "Inventarios",      color: "#059669" },
    { id: "paradas",              nombre: "Paradas",          color: "#ef4444" },
    { id: "ejecucion",            nombre: "Ejecución",        color: "#d97706" },
    { id: "maquinaria",           nombre: "Maquinaria",       color: "#7c3aed" },
    { id: "regalias",             nombre: "Regalías",         color: "#db2777" },
    { id: "capacidad",            nombre: "Capacidad",        color: "#65a30d" },
    { id: "inventarioMaquinaria", nombre: "Inv. Maquinaria",  color: "#0891b2" },
    { id: "proyecciones",         nombre: "Proyecciones",     color: "#764ba2" },
  ];

  const accionesFiltradas    = quickActions.filter(a => tienePermiso(a.permiso));
  const accionesPorCategoria = CATEGORIAS
    .map(cat => ({ ...cat, acciones: accionesFiltradas.filter(a => a.categoria === cat.id) }))
    .filter(cat => cat.acciones.length > 0);

  const mostrarFRI = user?.rol !== "OPERARIO" && user?.rol !== "VENDEDOR";

  if (esRolGlobal && (cargando || (!tituloActivoId && !intentoCargado))) {
    return <div className="loading-container"><div className="loading"/><p>Cargando títulos mineros...</p></div>;
  }
  if (loading) {
    return <div className="loading-container"><div className="loading"/><p>Preparando tu panel...</p></div>;
  }

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div className="home-container">

      {/* ─── HEADER ─── */}
      <header className="home-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo TU MINA"
                  width="50" height="50" style={{ borderRadius:"8px", objectFit:"contain" }}/>
              </div>
              <div>
                <h1>TU MINA</h1>
                <p>Desarrollado por GEOGLOBAL</p>
              </div>
            </div>
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar"><User size={20}/></div>
                <div className="user-details">
                  <p className="user-name">{user?.nombre || "Usuario"}</p>
                  <p className="user-role">{user?.rol || "ROL"}</p>
                </div>
              </div>
              <SelectorTitulo/>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18}/> Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="container">

          {/* ══ WELCOME ══ */}
          <section className="welcome-section">
            <div className="welcome-card">
              <div className="welcome-body-wrap">
                {/* Pica animada */}
                <div className="welcome-emoji-wrap" aria-hidden="true">
                  <span className="welcome-main-emoji">⛏️</span>
                </div>

                <div className="welcome-text">
                  <p className="welcome-eyebrow">
                    Plataforma de gestión minera
                  </p>

                  {/* Saludo según hora del día */}
                  {(() => {
                    const hora = new Date().getHours();
                    const saludo = hora >= 5 && hora < 12
                      ? "Buenos días"
                      : hora >= 12 && hora < 19
                      ? "Buenas tardes"
                      : "Buenas noches";
                    const mensaje = hora >= 5 && hora < 12
                      ? "Empieza bien el día revisando el estado de tus reportes."
                      : hora >= 12 && hora < 19
                      ? "¿Todo listo con los reportes del día?"
                      : "Asegúrate de dejar al día los formularios antes de cerrar el turno.";
                    return (
                      <>
                        <h2 className="welcome-title">
                          {saludo}, {user?.nombre?.split(" ")[0]}
                        </h2>
                        <p className="welcome-subtitle">{mensaje}</p>
                      </>
                    );
                  })()}

                  <div className="welcome-chips">
                    {tituloActivo && (
                      <div className="wchip wchip--purple">
                        <Building2 size={13}/>
                        <strong>{tituloActivo.numeroTitulo}</strong>
                        {tituloActivo.municipio && <span>· {tituloActivo.municipio}</span>}
                      </div>
                    )}
                    <div className="wchip">
                      <Calendar size={13}/>
                      <span>{new Date().toLocaleDateString("es-CO",{ weekday:"long", year:"numeric", month:"long", day:"numeric" })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══ TÍTULO MINERO — solo visible con el título 816-17 activo ══ */}
          {(() => {
            const numTitulo = tituloActivo?.numeroTitulo;
            /* Restricción explícita: solo 816-17 */
            if (numTitulo !== "816-17") return null;
            const info = TITULOS_REGISTRY[numTitulo];
            if (!info) return null;
            return (
            <section className="titulo-section">
              <div className="titulo-card">

                {/* Encabezado limpio: solo ID */}
                <div className="titulo-card-header">
                  <div className="titulo-header-left">
                    <div className="titulo-estado-dot" />
                    <div>
                      <h3 className="titulo-card-title">
                        Título Minero &nbsp;
                        <span className="titulo-badge">{info.id}</span>
                      </h3>
                      <p className="titulo-card-sub">{info.municipio}, {info.departamento}</p>
                    </div>
                  </div>
                </div>

                {/* Cuerpo: ficha + mapa */}
                <div className="titulo-body">

                  {/* Ficha de datos — todas las variables aquí */}
                  <div className="titulo-ficha">
                    <div className="titulo-ficha-grid">

                      {/* Estado y Modalidad primero */}
                      <div className="titulo-campo">
                        <span className="titulo-campo-label">Estado</span>
                        <span className="titulo-estado-chip">{info.estado}</span>
                      </div>
                      <div className="titulo-campo">
                        <span className="titulo-campo-label">Etapa</span>
                        <span className="titulo-campo-val titulo-campo-val--etapa">{info.etapa}</span>
                      </div>
                      <div className="titulo-campo titulo-campo--wide">
                        <span className="titulo-campo-label">Modalidad</span>
                        <span className="titulo-campo-val">{info.modalidad}</span>
                      </div>

                      {/* Datos técnicos */}
                      <div className="titulo-campo">
                        <span className="titulo-campo-label">Área</span>
                        <span className="titulo-campo-val"><strong>{info.area_ha}</strong> ha</span>
                      </div>
                      <div className="titulo-campo">
                        <span className="titulo-campo-label">Clasificación</span>
                        <span className="titulo-campo-val">{info.clasificacion}</span>
                      </div>
                      <div className="titulo-campo titulo-campo--wide">
                        <span className="titulo-campo-label">Minerales</span>
                        <span className="titulo-campo-val">{info.minerales}</span>
                      </div>
                      <div className="titulo-campo titulo-campo--wide">
                        <span className="titulo-campo-label">Titular</span>
                        <span className="titulo-campo-val">{info.titular}</span>
                      </div>
                      <div className="titulo-campo">
                        <span className="titulo-campo-label">Expedición</span>
                        <span className="titulo-campo-val">{info.expedicion}</span>
                      </div>
                      <div className="titulo-campo">
                        <span className="titulo-campo-label">Vigencia hasta</span>
                        <span className="titulo-campo-val titulo-campo-val--vigencia">{info.expiracion}</span>
                      </div>
                    </div>

                    <div className="titulo-anm-badge">
                      <span>🛰</span>
                      Información tomada del Visor Geográfico Oficial de la Agencia Nacional de Mineria
                    </div>
                  </div>

                  {/* Mapa cuadrado */}
                  <div className="titulo-mapa-wrap">
                    <TituloPoligonoMapa info={info} />
                    <div className="titulo-mapa-footer">
                      <MapPin size={11} />
                      Título <strong>{info.id}</strong> · Centroide:{" "}
                      {info.centroid[1].toFixed(5)}, {info.centroid[0].toFixed(5)}
                    </div>
                  </div>

                </div>
              </div>
            </section>
            );
          })()}

          {/* ══ PANEL FRI UNIFICADO ══ */}
          {user?.rol !== "VENDEDOR" && mostrarFRI && tienePermiso("VER_FRI") && (
            <section className="fri-section">
              <div className="fri-panel">

                <div className="fri-panel-header">
                  <div className="fri-panel-header-left">
                    <span className="fri-panel-dot"/>
                    <div>
                      <h3 className="fri-panel-title">Estado de tus reportes FRI</h3>
                      <p className="fri-panel-subtitle">Período activo · Título {tituloActivo?.numeroTitulo || "–"}</p>
                    </div>
                  </div>
                </div>

                {/* Métricas de estado */}
                <div className="fri-metrics-row">
                  <div className="fri-metric-hero">
                    <div className="fri-metric-hero-icon"><FileText size={28}/></div>
                    <div>
                      <div className="fri-metric-hero-value">{stats.totalFormularios}</div>
                      <div className="fri-metric-hero-label">formulario{stats.totalFormularios !== 1 ? "s" : ""} en total</div>
                    </div>
                  </div>
                  <div className="fri-metrics-divider"/>
                  <div className="fri-estado-trio">
                    <div className="fri-estado fri-estado--draft">
                      <span className="fri-estado-icon"><Edit size={15}/></span>
                      <span className="fri-estado-num">{stats.borradores}</span>
                      <span className="fri-estado-label">Borradores</span>
                    </div>
                    <div className="fri-estado fri-estado--sent">
                      <span className="fri-estado-icon"><Send size={15}/></span>
                      <span className="fri-estado-num">{stats.enviados}</span>
                      <span className="fri-estado-label">Enviados</span>
                    </div>
                  </div>
                  {stats.totalFormularios > 0 && (
                    <div className="fri-donut-wrap">
                      <p className="fri-donut-label">Distribución</p>
                      <div className="fri-donut-track">
                        <div className="fri-donut-seg seg-draft"    style={{ flex: stats.borradores }} title={`Borradores: ${stats.borradores}`}/>
                        <div className="fri-donut-seg seg-sent"     style={{ flex: stats.enviados   }} title={`Enviados: ${stats.enviados}`}/>
                        {(stats.totalFormularios - stats.borradores - stats.enviados) > 0 && (
                          <div className="fri-donut-seg seg-other" style={{ flex: stats.totalFormularios - stats.borradores - stats.enviados - stats.aprobados }}/>
                        )}
                      </div>
                      <div className="fri-donut-legend">
                        <span><i style={{ background:"#f59e0b" }}/>Borrador</span>
                        <span><i style={{ background:"#06b6d4" }}/>Enviado</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="fri-tipos-divider">
                  <span>Formularios por tipo</span>
                </div>

                {/* Tiles sin emoji — diseño minimalista */}
                <div className="fri-tipos-grid">
                  {tiposFormularios.map(tipo => {
                    const count = stats.porTipo[tipo.id] || 0;
                    return (
                      <div key={tipo.id} className="tipo-tile" style={{ "--tile-color": tipo.color }}>
                        <div className="tipo-tile-bar"/>
                        <span className="tipo-tile-count">{count}</span>
                        <span className="tipo-tile-nombre">{tipo.nombre}</span>
                      </div>
                    );
                  })}
                </div>

              </div>
            </section>
          )}

          {/* ══ PANEL OPERACIÓN + MAPA SATELITAL ══ */}
          {user?.rol !== "VENDEDOR" && tienePermiso("VER_ESTADISTICAS_OPERATIVAS") && (
            <section className="stats-section">
              <div className="stats-panel stats-panel--op">
                <div className="stats-panel-label">
                  <span className="stats-panel-dot" style={{ background:"#e74c3c" }}/>
                  Resumen del turno · {new Date().toLocaleDateString("es-CO",{ weekday:"long" })}
                </div>

                <div className="op-body op-body--solo">
                  <div className="stat-op stat-op--red">
                    <div className="stat-op-icon"><Clock size={26}/></div>
                    <div className="stat-op-body">
                      <div className="stat-op-value-row">
                        <span className="stat-op-value">{stats.minutosParadoHoy}</span>
                        <span className="stat-op-unit">min</span>
                      </div>
                      <div className="stat-op-label">Tiempo parado hoy</div>
                      <div className="stat-op-sub">{stats.paradasHoy} paro{stats.paradasHoy !== 1 ? "s" : ""} · registrado{stats.paradasHoy !== 1 ? "s" : ""} en el sistema</div>
                    </div>
                  </div>
                  <div className="stat-op stat-op--blue">
                    <div className="stat-op-icon"><MapPin size={26}/></div>
                    <div className="stat-op-body">
                      <div className="stat-op-value-row">
                        <span className="stat-op-value">{stats.puntosHoy}</span>
                        <span className="stat-op-unit">pts</span>
                      </div>
                      <div className="stat-op-label">Puntos de actividad hoy</div>
                      <div className="stat-op-sub">Georeferenciados en campo</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══ ACCIONES RÁPIDAS ══ */}
          <section className="actions-section">
            <h3 className="section-title"><Zap size={20} strokeWidth={2.5}/> ¿Qué vas a hacer hoy?</h3>
            <div className="category-list">
              {accionesPorCategoria.map(cat => (
                <div key={cat.id} className="category-group"
                  style={{ "--cat-accent": cat.accentColor, "--cat-bg": cat.bgLight, "--cat-border": cat.borderColor }}>
                  <div className="category-header">
                    <div className="category-icon" style={{ color: cat.accentColor }}>
                      {cat.icon}
                    </div>
                    <div className="category-header-text">
                      <span className="category-label">{cat.label}</span>
                      {cat.sublabel && <span className="category-sublabel">{cat.sublabel}</span>}
                    </div>
                  </div>
                  <div className="category-actions-grid">
                    {cat.acciones.map((action, idx) => (
                      <div key={idx} className="action-card"
                        onClick={() => navigate(action.path)}
                        style={{ background: action.cardBg }}>
                        <div className="action-icon">{action.icon}</div>
                        <div className="action-content">
                          <h4>{action.title}</h4>
                          <p>{action.description}</p>
                        </div>
                        <div className="action-arrow">→</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default Home;