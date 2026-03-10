// src/pages/CertificadoOrigen.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService, usuarioService, reportService } from "../services/api";
import { useTituloActivo } from "../context/TituloContext";
import SelectorTitulo from "../components/SelectorTitulo";
import api from "../services/api";
import {
  ArrowLeft,
  LogOut,
  Search,
  UserPlus,
  Pencil,
  FileCheck,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  X,
  User,
  FileText,
  FileSpreadsheet,
  Download,
  BarChart2,
  TrendingUp,
  Package,
  Users,
  Hash,
  RefreshCw,
  FileDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  Calendar,
} from "lucide-react";
import "./CertificadoOrigen.css";


// ─── Helpers fecha ────────────────────────────────────────────────────────────
const colombiaToday = () => {
  const d = new Date(Date.now() - 5 * 3600000);
  return d.toISOString().split("T")[0];
};
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

// ─── Tabla preview exportar ───────────────────────────────────────────────────
const ordenarExp = (datos, col, dir) => {
  if (!col) return datos;
  return [...datos].sort((a, b) => {
    const va = a[col] ?? ""; const vb = b[col] ?? "";
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
};
const SortIconExp = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={12} style={{ opacity: 0.35, marginLeft: 3, verticalAlign: "middle" }} />;
  return sortDir === "asc"
    ? <ChevronUp   size={12} style={{ marginLeft: 3, verticalAlign: "middle" }} />
    : <ChevronDown size={12} style={{ marginLeft: 3, verticalAlign: "middle" }} />;
};
const TablaPreviewCert = ({ columnas, datos, maxRows = 100 }) => {
  const [sortCol, setSortCol] = React.useState(columnas[0]?.key || "");
  const [sortDir, setSortDir] = React.useState("desc");
  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sorted = React.useMemo(() => ordenarExp(datos, sortCol, sortDir), [datos, sortCol, sortDir]);
  const filas  = sorted.slice(0, maxRows);
  return (
    <div className="co-preview-wrap">
      <table className="co-preview-tabla">
        <thead>
          <tr>
            {columnas.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)}>
                {col.label}<SortIconExp col={col.key} sortCol={sortCol} sortDir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((row, i) => (
            <tr key={i}>
              {columnas.map(col => <td key={col.key}>{row[col.key] ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > maxRows && (
        <p className="co-preview-aviso">Mostrando {maxRows} de {sorted.length} registros. El Excel incluirá todos.</p>
      )}
    </div>
  );
};

const UNIDADES = ["M3", "TON", "KG", "L", " "];
const TIPOS_IDENTIFICACION = ["CÉDULA", "NIT", "CÉDULA DE EXTRANJERÍA", "RUT"];
const TIPOS_COMPRADOR = ["COMERCIALIZADOR", "CONSUMIDOR"];

const clienteVacio = {
  cedula: "",
  nombre: "",
  correo: "",
  telefono: "",
  direccion: "",
  tipoIdentificacion: "",
  tipoComprador: "",
  rucom: "",
};

// ─── Componentes auxiliares (fuera del componente principal) ────────────────

const CampoCliente = ({ label, valor }) =>
  valor ? (
    <span>
      <b>{label}:</b> {valor}
    </span>
  ) : null;

const SelectField = ({ label, value, onChange, opciones, requerido }) => (
  <div className="co-campo">
    <label>
      {label}
      {requerido && " *"}
    </label>
    <div className="co-select-wrapper">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Selecciona —</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="co-select-icon" />
    </div>
  </div>
);

const FormCliente = ({ data, onChange, soloEdicion = false }) => (
  <div className="co-form-grid">
    <SelectField
      label="Tipo de Identificación"
      requerido
      value={data.tipoIdentificacion}
      onChange={(v) => onChange({ ...data, tipoIdentificacion: v })}
      opciones={TIPOS_IDENTIFICACION}
    />
    <SelectField
      label="Tipo de Comprador"
      requerido
      value={data.tipoComprador}
      onChange={(v) => onChange({ ...data, tipoComprador: v })}
      opciones={TIPOS_COMPRADOR}
    />
    {!soloEdicion && (
      <div className="co-campo">
        <label>N° Identificación *</label>
        <input
          type="text"
          value={data.cedula}
          onChange={(e) => onChange({ ...data, cedula: e.target.value })}
          placeholder="Número de documento"
        />
      </div>
    )}
    <div className="co-campo">
      <label>Nombre completo *</label>
      <input
        type="text"
        value={data.nombre}
        onChange={(e) => onChange({ ...data, nombre: e.target.value })}
      />
    </div>
    <div className="co-campo">
      <label>No. RUCOM</label>
      <input
        type="text"
        value={data.rucom}
        onChange={(e) => onChange({ ...data, rucom: e.target.value })}
        placeholder="Ej: 123-543"
      />
    </div>
    <div className="co-campo">
      <label>Teléfono</label>
      <input
        type="text"
        value={data.telefono}
        onChange={(e) => onChange({ ...data, telefono: e.target.value })}
      />
    </div>
    <div className="co-campo">
      <label>Correo electrónico</label>
      <input
        type="email"
        value={data.correo}
        onChange={(e) => onChange({ ...data, correo: e.target.value })}
      />
    </div>
    <div className="co-campo co-campo-full">
      <label>Dirección</label>
      <input
        type="text"
        value={data.direccion}
        onChange={(e) => onChange({ ...data, direccion: e.target.value })}
      />
    </div>
  </div>
);

// ─── Columnas para la tabla preview (coinciden con getColumnas del backend) ───
const COLS_CERT_EXP = [
  { key: "Consecutivo",      label: "Consecutivo"    },
  { key: "Fecha_Certificado",label: "Fecha"          },
  { key: "Mineral_Explotado",label: "Mineral"        },
  { key: "Cliente_Nombre",   label: "Cliente"        },
  { key: "Cliente_Cedula",   label: "Cédula"         },
  { key: "Cantidad_M3",      label: "Cantidad M³"    },
  { key: "Unidad_Medida",    label: "Unidad"         },
];

// ─── Componente principal ────────────────────────────────────────────────────
const CertificadoOrigen = () => {
  const navigate = useNavigate();
  const [user] = useState(authService.getCurrentUser());
  const { tituloActivoId, titulos, cargando, esRolGlobal, intentoCargado } =
    useTituloActivo();

  // Título minero
  const [titulo, setTitulo] = useState(null);
  const [loadingTitulo, setLoadingTitulo] = useState(true);
  const [errorTitulo, setErrorTitulo] = useState("");

  // Minerales
  const [mineralesCatalogo, setMineralesCatalogo] = useState([]);
  const [loadingMinerales, setLoadingMinerales] = useState(false);

  // Cliente — búsqueda
  const [busquedaTipo, setBusquedaTipo] = useState("cedula");
  const [busquedaValor, setBusquedaValor] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [errorCliente, setErrorCliente] = useState("");
  const [modoNuevoCliente, setModoNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState(clienteVacio);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Cliente — edición
  const [modoEditarCliente, setModoEditarCliente] = useState(false);
  const [editCliente, setEditCliente] = useState(clienteVacio);
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  // Certificado
  const [mineralCodigo, setMineralCodigo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("M3");

  // Estados generales
  const [guardando, setGuardando] = useState(false);
  const [mensajeOk, setMensajeOk] = useState("");
  const [mensajeErr, setMensajeErr] = useState("");

  // ── Tab activo ────────────────────────────────────────
  const [tabActivo, setTabActivo] = useState("nuevo"); // "nuevo" | "dashboard" | "exportar"

  // ── Dashboard: período ────────────────────────────────
  const hoyDash = colombiaToday();
  const [dashDesde,   setDashDesde]   = useState(addDays(hoyDash, -29));
  const [dashHasta,   setDashHasta]   = useState(hoyDash);
  const [dashPeriodo, setDashPeriodo] = useState("30d");

  const aplicarPeriodo = (p) => {
    const h = colombiaToday();
    setDashPeriodo(p); setDashHasta(h);
    if (p === "1d")  setDashDesde(h);
    if (p === "7d")  setDashDesde(addDays(h, -6));
    if (p === "30d") setDashDesde(addDays(h, -29));
    if (p === "90d") setDashDesde(addDays(h, -89));
  };

  // ── Dashboard ─────────────────────────────────────────
  const [dashData,        setDashData]        = useState(null);
  const [loadingDash,     setLoadingDash]     = useState(false);
  const [errorDash,       setErrorDash]       = useState("");

  // ── Exportar — patrón idéntico a Reportes.jsx ─────────────────
  const [expFiltros, setExpFiltros] = useState({
    tipo:           "certificadosOrigen",
    fechaInicio:    "",
    fechaFin:       "",
    mineral:        "",
    clienteId:      "",
    tituloMineroId: "",
  });
  const [clientesLista,  setClientesLista]  = useState([]);
  const [expPreview,     setExpPreview]     = useState({ visible: false, columnas: [], registros: [], total: 0 });
  const [expLoading,     setExpLoading]     = useState(false);
  const [expError,       setExpError]       = useState("");
  const [expSuccess,     setExpSuccess]     = useState("");

  // Sincronizar tituloActivoId en filtros de exportar
  useEffect(() => {
    if (!tituloActivoId) return;
    setExpFiltros(prev => ({ ...prev, tituloMineroId: tituloActivoId }));
  }, [tituloActivoId]);

  // Cargar clientes al abrir el tab exportar
  useEffect(() => {
    if (tabActivo !== "exportar" || !tituloActivoId) return;
    api.get("/certificados-origen", { params: { tituloMineroId: tituloActivoId, limit: 500 } })
      .then(r => {
        const certs = r.data?.data || [];
        const mapa = {};
        certs.forEach(c => {
          const id = c.clienteId;
          if (id && !mapa[id])
            mapa[id] = { id, nombre: c.clientes_compradores?.nombre || id, cedula: c.clientes_compradores?.cedula || "" };
        });
        setClientesLista(Object.values(mapa));
      })
      .catch(() => {});
  }, [tabActivo, tituloActivoId]);

  // ── cargarPreviewExport — igual a cargarPreview de Reportes ────
  const cargarPreviewExport = useCallback(async (f) => {
    try {
      setExpLoading(true); setExpError(""); setExpSuccess("");
      const res = await reportService.getPreview(f);
      if (res.data.success) {
        setExpPreview({
          visible:   true,
          columnas:  res.data.columnas,
          registros: res.data.registros,
          total:     res.data.total,
        });
        if (res.data.total === 0)
          setExpError("Sin registros para los filtros aplicados");
        else
          setExpSuccess(`✓ ${res.data.total} registro${res.data.total !== 1 ? "s" : ""} encontrado${res.data.total !== 1 ? "s" : ""}`);
      }
    } catch(err) {
      setExpError(err.response?.data?.message || "Error al cargar datos");
      setExpPreview({ visible: false, columnas: [], registros: [], total: 0 });
    } finally { setExpLoading(false); }
  }, []);

  // Debounce igual a Reportes (500 ms)
  const expDebounceRef = useRef(null);
  useEffect(() => {
    if (tabActivo !== "exportar") return;
    clearTimeout(expDebounceRef.current);
    expDebounceRef.current = setTimeout(() => {
      if (!expFiltros.tituloMineroId) return;
      if ((expFiltros.fechaInicio && !expFiltros.fechaFin) ||
          (!expFiltros.fechaInicio && expFiltros.fechaFin)) return;
      cargarPreviewExport(expFiltros);
    }, 500);
    return () => clearTimeout(expDebounceRef.current);
  }, [expFiltros, tabActivo, cargarPreviewExport]);

  const handleExpFiltroChange = (e) => {
    const { name, value } = e.target;
    setExpFiltros(prev => ({ ...prev, [name]: value }));
  };

  const limpiarExpFiltros = () => {
    setExpFiltros(prev => ({ ...prev, fechaInicio: "", fechaFin: "", mineral: "", clienteId: "" }));
    setExpPreview({ visible: false, columnas: [], registros: [], total: 0 });
    setExpError(""); setExpSuccess("");
  };

  // ── Exportar Excel — igual a handleExportar de Reportes ────────
  const handleExportarExcel = async () => {
    try {
      setExpLoading(true); setExpError("");
      const res = await reportService.exportarExcel(expFiltros);
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const nombre = `Certificados_Origen_${new Date().toISOString().split("T")[0]}.xlsx`;
      Object.assign(a, { href: url, download: nombre });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setExpSuccess(`✓ "${nombre}" descargado`);
    } catch(err) {
      setExpError(err.response?.data?.message || "Error al exportar Excel");
    } finally { setExpLoading(false); }
  };


  // ── Cargar datos dashboard ─────────────────────────────
  const cargarDashboard = async (desde, hasta) => {
    if (!tituloActivoId) return;
    const d = desde || dashDesde;
    const h = hasta  || dashHasta;
    try {
      setLoadingDash(true); setErrorDash("");
      const res = await api.get("/certificados-origen", {
        params: { tituloMineroId: tituloActivoId, limit: 500 }
      });
      const todos = res.data?.data || [];
      if (!Array.isArray(todos)) { setErrorDash("Formato inesperado"); return; }

      // Filtrar por período
      const certs = todos.filter(c => {
        const fecha = String(c.fechaCertificado || c.createdAt || "").split("T")[0];
        return (!d || fecha >= d) && (!h || fecha <= h);
      });

      const totalCerts   = certs.length;
      const totalVolumen = certs.reduce((s, c) => s + parseFloat(c.cantidadM3 || 0), 0);
      const clientesSet  = new Set(certs.map(c => c.clienteId));

      const porMineral = {};
      certs.forEach(c => {
        const m = c.mineralExplotado || "Sin mineral";
        if (!porMineral[m]) porMineral[m] = { cantidad: 0, volumen: 0 };
        porMineral[m].cantidad++;
        porMineral[m].volumen += parseFloat(c.cantidadM3 || 0);
      });

      const porCliente = {};
      certs.forEach(c => {
        const nombre = c.clientes_compradores?.nombre || c.clienteId;
        if (!porCliente[nombre]) porCliente[nombre] = { cantidad: 0, volumen: 0 };
        porCliente[nombre].cantidad++;
        porCliente[nombre].volumen += parseFloat(c.cantidadM3 || 0);
      });
      const topClientes = Object.entries(porCliente)
        .sort((a,b) => b[1].volumen - a[1].volumen).slice(0,5);

      const ultimos = [...certs]
        .sort((a,b) => new Date(b.fechaCertificado||b.createdAt) - new Date(a.fechaCertificado||a.createdAt))
        .slice(0,10);

      setDashData({ totalCerts, totalVolumen, clientesUnicos: clientesSet.size, porMineral, topClientes, ultimos });
    } catch(e) {
      console.error("Error dashboard:", e);
      setErrorDash("Error al cargar datos del dashboard");
    } finally { setLoadingDash(false); }
  };

  useEffect(() => {
    if (tabActivo === "dashboard" && tituloActivoId) cargarDashboard();
  }, [tabActivo, tituloActivoId]);

  useEffect(() => {
    if (tabActivo === "dashboard" && tituloActivoId) cargarDashboard(dashDesde, dashHasta);
  }, [dashDesde, dashHasta]);

  useEffect(() => {
    if (esRolGlobal && (cargando || (!tituloActivoId && !intentoCargado)))
      return;
    cargarTitulo();
    cargarMinerales();
  }, [tituloActivoId, cargando]);

  const cargarTitulo = async () => {
    try {
      setLoadingTitulo(true);
      setErrorTitulo("");
      const tituloId =
        tituloActivoId || user?.tituloMinero?.id || user?.tituloMineroId;
      if (!tituloId) {
        setErrorTitulo("No tienes un título minero asignado.");
        return;
      }
      const res = await api.get(`/titulos/${tituloId}`);
      const t = res.data.titulo || res.data.data || null;
      if (t) setTitulo(t);
      else setErrorTitulo("No se pudo cargar el título minero.");
    } catch {
      setErrorTitulo("Error al conectar con el servidor.");
    } finally {
      setLoadingTitulo(false);
    }
  };

  const cargarMinerales = async () => {
    try {
      setLoadingMinerales(true);
      const res = await api.get("/actividad/items/inspeccion");
      if (res.data.success) setMineralesCatalogo(res.data.data ?? []);
    } catch {
      console.error("Error cargando minerales");
    } finally {
      setLoadingMinerales(false);
    }
  };

  const buscarCliente = async () => {
    if (!busquedaValor.trim()) return;
    try {
      setBuscando(true);
      setErrorCliente("");
      setClienteEncontrado(null);
      setClienteSeleccionado(null);
      setModoNuevoCliente(false);
      const res = await api.get("/clientes/buscar", {
        params: { [busquedaTipo]: busquedaValor.trim() },
      });
      if (res.data.success && res.data.data)
        setClienteEncontrado(res.data.data);
      else setErrorCliente("No se encontró ningún cliente con ese dato.");
    } catch (err) {
      if (err.response?.status === 404)
        setErrorCliente("No se encontró ningún cliente con ese dato.");
      else setErrorCliente("Error al buscar cliente.");
    } finally {
      setBuscando(false);
    }
  };

  const iniciarNuevoCliente = () => {
    setModoNuevoCliente(true);
    setClienteEncontrado(null);
    setClienteSeleccionado(null);
    setErrorCliente("");
    setNuevoCliente({ ...clienteVacio, [busquedaTipo]: busquedaValor.trim() });
  };

  const guardarNuevoCliente = async () => {
    if (!nuevoCliente.tipoIdentificacion) {
      setErrorCliente("Selecciona el tipo de identificación.");
      return;
    }
    if (!nuevoCliente.tipoComprador) {
      setErrorCliente("Selecciona el tipo de comprador.");
      return;
    }
    if (!nuevoCliente.cedula || !nuevoCliente.nombre) {
      setErrorCliente("Cédula y nombre son obligatorios.");
      return;
    }
    try {
      setBuscando(true);
      setErrorCliente("");
      const res = await api.post("/clientes", nuevoCliente);
      if (res.data.success) {
        setClienteSeleccionado(res.data.data);
        setModoNuevoCliente(false);
      }
    } catch (err) {
      setErrorCliente(
        err.response?.data?.message || "Error al guardar cliente.",
      );
    } finally {
      setBuscando(false);
    }
  };

  const abrirEdicion = () => {
    setEditCliente({
      nombre: clienteSeleccionado.nombre || "",
      correo: clienteSeleccionado.correo || "",
      telefono: clienteSeleccionado.telefono || "",
      direccion: clienteSeleccionado.direccion || "",
      tipoIdentificacion: clienteSeleccionado.tipoIdentificacion || "",
      tipoComprador: clienteSeleccionado.tipoComprador || "",
      rucom: clienteSeleccionado.rucom || "",
    });
    setModoEditarCliente(true);
    setErrorCliente("");
  };

  const guardarEdicionCliente = async () => {
    if (!editCliente.tipoIdentificacion) {
      setErrorCliente("Selecciona el tipo de identificación.");
      return;
    }
    if (!editCliente.tipoComprador) {
      setErrorCliente("Selecciona el tipo de comprador.");
      return;
    }
    if (!editCliente.nombre) {
      setErrorCliente("El nombre es obligatorio.");
      return;
    }
    try {
      setGuardandoCliente(true);
      setErrorCliente("");
      const res = await api.put(
        `/clientes/${clienteSeleccionado.id}`,
        editCliente,
      );
      if (res.data.success) {
        setClienteSeleccionado(res.data.data);
        setModoEditarCliente(false);
      }
    } catch (err) {
      setErrorCliente(
        err.response?.data?.message || "Error al actualizar cliente.",
      );
    } finally {
      setGuardandoCliente(false);
    }
  };

  // ── Estado modal formato ────────────────────────────────────────────────────
  const [modalFormato, setModalFormato] = useState(false);
  const [certificadoIdPend, setCertificadoIdPend] = useState(null);
  const [descargando, setDescargando] = useState(false);

  // ── Validar y abrir modal de formato ────────────────────────────────────────
  const handleGuardar = async () => {
    setMensajeOk("");
    setMensajeErr("");
    if (!titulo) return setMensajeErr("Falta información del título minero.");
    if (!clienteSeleccionado)
      return setMensajeErr("Debes seleccionar o registrar un cliente.");
    if (!mineralCodigo)
      return setMensajeErr("Selecciona el mineral explotado.");
    if (cantidad !== "" && (isNaN(Number(cantidad)) || Number(cantidad) <= 0))
      return setMensajeErr("La cantidad no puede ser cero o negativa.");
    try {
      setGuardando(true);
      const res = await api.post("/certificados-origen", {
        tituloMineroId: titulo.id,
        clienteId: clienteSeleccionado.id,
        mineralExplotado: mineralCodigo,
        cantidadM3: cantidad !== "" ? Number(cantidad) : null,
        unidadMedida: unidad,
      });
      if (!res.data.success)
        return setMensajeErr("Error al guardar el certificado.");
      setCertificadoIdPend(res.data.data.id);
      setModalFormato(true);
    } catch (err) {
      setMensajeErr(
        err.response?.data?.message ||
          err.message ||
          "Error al guardar el certificado.",
      );
    } finally {
      setGuardando(false);
    }
  };

  // ── Descargar un archivo del certificado ────────────────────────────────────
  const descargarArchivo = async (certId, formato) => {
    const token = localStorage.getItem("token");
    const base = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    const ext = formato === "pdf" ? "pdf" : "xlsx";
    const mime =
      formato === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const resp = await fetch(
      `${base}/certificados-origen/${certId}/${formato}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!resp.ok) throw new Error(`Error al descargar ${ext.toUpperCase()}`);

    const blob = await resp.blob();
    const url = window.URL.createObjectURL(new Blob([blob], { type: mime }));
    const link = document.createElement("a");
    const fecha = new Date().toISOString().split("T")[0];
    link.href = url;
    link.setAttribute("download", `Certificado_Origen_${fecha}.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // ── Confirmar formato y descargar ────────────────────────────────────────────
  const handleConfirmarFormato = async (formato) => {
    // formato: "excel" | "pdf" | "ambos"
    try {
      setDescargando(true);
      if (formato === "excel" || formato === "ambos") {
        await descargarArchivo(certificadoIdPend, "excel");
      }
      if (formato === "pdf" || formato === "ambos") {
        await descargarArchivo(certificadoIdPend, "pdf");
      }
      setMensajeOk(
        `✅ Certificado guardado y ${formato === "ambos" ? "archivos descargados" : formato.toUpperCase() + " descargado"} correctamente.`,
      );
      setMineralCodigo("");
      setCantidad("");
      setUnidad("M3");
      setClienteSeleccionado(null);
      setBusquedaValor("");
    } catch (err) {
      setMensajeErr(err.message || "Error al descargar el archivo.");
    } finally {
      setDescargando(false);
      setModalFormato(false);
      setCertificadoIdPend(null);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/");
  };
  if (esRolGlobal && (cargando || (!tituloActivoId && !intentoCargado))) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Cargando títulos mineros...</p>
      </div>
    );
  }
  return (
    <div className="formularios-container">
      {/* ══ HEADER — igual al de Formularios.jsx ══ */}
      <header className="formularios-header">
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
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button
              onClick={() => navigate("/home")}
              className="breadcrumb-link"
            >
              <ArrowLeft size={16} /> Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Certificado de Origen</span>
          </div>
        </div>
      </header>


      {/* ══ TABS ══ */}
      <div className="co-tabs">
        <button
          className={`co-tab ${tabActivo === "nuevo" ? "co-tab--activo" : ""}`}
          onClick={() => setTabActivo("nuevo")}
        >
          <FileCheck size={16} /> Nuevo Certificado
        </button>
        <button
          className={`co-tab ${tabActivo === "dashboard" ? "co-tab--activo" : ""}`}
          onClick={() => setTabActivo("dashboard")}
        >
          <BarChart2 size={16} /> Dashboard
        </button>
        <button
          className={`co-tab ${tabActivo === "exportar" ? "co-tab--activo" : ""}`}
          onClick={() => setTabActivo("exportar")}
        >
          <FileDown size={16} /> Exportar
        </button>
      </div>

      {/* ══ MAIN ══ */}
      <main className="co-main">
        {tabActivo === "nuevo" && (
        <>
        {/* ── Sección 1: Título Minero ── */}
        <section className="co-section">
          <h2 className="co-section-title">
            <span className="co-section-num">1</span>Información del Título
            Minero
          </h2>
          {loadingTitulo && (
            <p className="co-loading">Cargando título minero…</p>
          )}
          {errorTitulo && (
            <p className="co-error">
              <AlertCircle size={16} /> {errorTitulo}
            </p>
          )}
          {titulo && (
            <div className="co-titulo-grid">
              <div className="co-dato">
                <label>N° Título</label>
                <span>{titulo.numeroTitulo}</span>
              </div>
              <div className="co-dato">
                <label>Estado</label>
                <span
                  className={`co-badge co-badge-${titulo.estado?.toLowerCase()}`}
                >
                  {titulo.estado}
                </span>
              </div>
              <div className="co-dato">
                <label>Municipio</label>
                <span>{titulo.municipio}</span>
              </div>
              <div className="co-dato">
                <label>Departamento</label>
                <span>{titulo.departamento || "—"}</span>
              </div>
              <div className="co-dato">
                <label>Cédula del Titular</label>
                <span>{titulo.cedulaTitular || "—"}</span>
              </div>
              <div className="co-dato">
                <label>Nombre del Titular</label>
                <span>{titulo.nombreTitular || "—"}</span>
              </div>
              <div className="co-dato">
                <label>Vigencia</label>
                <span>
                  {titulo.fechaInicio
                    ? new Date(titulo.fechaInicio).toLocaleDateString("es-CO")
                    : "—"}
                  {" → "}
                  {titulo.fechaVencimiento
                    ? new Date(titulo.fechaVencimiento).toLocaleDateString(
                        "es-CO",
                      )
                    : "—"}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ── Sección 2: Cliente / Comprador ── */}
        <section className="co-section">
          <h2 className="co-section-title">
            <span className="co-section-num">2</span>Cliente / Comprador
          </h2>

          {clienteSeleccionado ? (
            <div className="co-cliente-seleccionado">
              <CheckCircle
                size={22}
                color="#059669"
                className="co-check-icon"
              />
              <div className="co-cliente-info">
                <strong>{clienteSeleccionado.nombre}</strong>
                <div className="co-cliente-detalles">
                  <CampoCliente
                    label="Tipo ID"
                    valor={clienteSeleccionado.tipoIdentificacion}
                  />
                  <CampoCliente
                    label="N° ID"
                    valor={clienteSeleccionado.cedula}
                  />
                  <CampoCliente
                    label="Tipo comprador"
                    valor={clienteSeleccionado.tipoComprador}
                  />
                  <CampoCliente
                    label="RUCOM"
                    valor={clienteSeleccionado.rucom}
                  />
                  <CampoCliente
                    label="Teléfono"
                    valor={clienteSeleccionado.telefono}
                  />
                  <CampoCliente
                    label="Correo"
                    valor={clienteSeleccionado.correo}
                  />
                  <CampoCliente
                    label="Dirección"
                    valor={clienteSeleccionado.direccion}
                  />
                </div>
              </div>
              <div className="co-cliente-acciones">
                <button className="co-btn-editar" onClick={abrirEdicion}>
                  <Pencil size={15} /> Editar
                </button>
                <button
                  className="co-btn-secundario"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setBusquedaValor("");
                  }}
                >
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <>
              {!modoNuevoCliente && (
                <div className="co-busqueda">
                  <div className="co-busqueda-tipo">
                    <button
                      className={busquedaTipo === "cedula" ? "active" : ""}
                      onClick={() => setBusquedaTipo("cedula")}
                    >
                      N° Identificación
                    </button>
                    <button
                      className={busquedaTipo === "correo" ? "active" : ""}
                      onClick={() => setBusquedaTipo("correo")}
                    >
                      Correo
                    </button>
                  </div>
                  <div className="co-busqueda-input">
                    <input
                      type={busquedaTipo === "correo" ? "email" : "text"}
                      placeholder={
                        busquedaTipo === "cedula"
                          ? "Número de identificación…"
                          : "Correo electrónico…"
                      }
                      value={busquedaValor}
                      onChange={(e) => {
                        setBusquedaValor(e.target.value);
                        setErrorCliente("");
                        setClienteEncontrado(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && buscarCliente()}
                    />
                    <button
                      className="co-btn-buscar"
                      onClick={buscarCliente}
                      disabled={buscando || !busquedaValor.trim()}
                    >
                      <Search size={16} /> {buscando ? "Buscando…" : "Buscar"}
                    </button>
                  </div>

                  {errorCliente && (
                    <div className="co-error-cliente">
                      <AlertCircle size={15} /> {errorCliente}
                      <button
                        className="co-btn-nuevo-inline"
                        onClick={iniciarNuevoCliente}
                      >
                        <UserPlus size={15} /> Registrar nuevo
                      </button>
                    </div>
                  )}

                  {clienteEncontrado && (
                    <div className="co-cliente-resultado">
                      <strong>{clienteEncontrado.nombre}</strong>
                      <div className="co-cliente-detalles">
                        <CampoCliente
                          label="Tipo ID"
                          valor={clienteEncontrado.tipoIdentificacion}
                        />
                        <CampoCliente
                          label="N° ID"
                          valor={clienteEncontrado.cedula}
                        />
                        <CampoCliente
                          label="Tipo comprador"
                          valor={clienteEncontrado.tipoComprador}
                        />
                        <CampoCliente
                          label="RUCOM"
                          valor={clienteEncontrado.rucom}
                        />
                        <CampoCliente
                          label="Teléfono"
                          valor={clienteEncontrado.telefono}
                        />
                        <CampoCliente
                          label="Correo"
                          valor={clienteEncontrado.correo}
                        />
                        <CampoCliente
                          label="Dirección"
                          valor={clienteEncontrado.direccion}
                        />
                      </div>
                      <button
                        className="co-btn-primario"
                        onClick={() => {
                          setClienteSeleccionado(clienteEncontrado);
                          setClienteEncontrado(null);
                        }}
                      >
                        Seleccionar este cliente
                      </button>
                    </div>
                  )}
                </div>
              )}

              {modoNuevoCliente && (
                <div className="co-nuevo-cliente">
                  <h3>
                    <UserPlus size={16} /> Registrar nuevo cliente
                  </h3>
                  <FormCliente data={nuevoCliente} onChange={setNuevoCliente} />
                  {errorCliente && (
                    <p className="co-error">
                      <AlertCircle size={14} /> {errorCliente}
                    </p>
                  )}
                  <div className="co-nuevo-cliente-acciones">
                    <button
                      className="co-btn-primario"
                      onClick={guardarNuevoCliente}
                      disabled={buscando}
                    >
                      {buscando ? "Guardando…" : "Guardar cliente"}
                    </button>
                    <button
                      className="co-btn-secundario"
                      onClick={() => {
                        setModoNuevoCliente(false);
                        setErrorCliente("");
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Sección 3: Datos del Certificado ── */}
        <section className="co-section">
          <h2 className="co-section-title">
            <span className="co-section-num">3</span>Datos del Certificado
          </h2>
          <div className="co-form-grid">
            <div className="co-campo co-campo-full">
              <label>Mineral Explotado *</label>
              <div className="co-select-wrapper">
                <select
                  value={mineralCodigo}
                  onChange={(e) => setMineralCodigo(e.target.value)}
                  disabled={loadingMinerales}
                >
                  <option value="">
                    {loadingMinerales
                      ? "Cargando minerales…"
                      : "— Selecciona un mineral —"}
                  </option>
                  {mineralesCatalogo.map((m) => (
                    <option key={m.codigo} value={m.codigo}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="co-select-icon" />
              </div>
            </div>
            <div className="co-campo">
              <label>Cantidad</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Dejar vacío si solo se pesa"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
            <div className="co-campo">
              <label>Unidad de Medida</label>
              <div className="co-select-wrapper">
                <select
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="co-select-icon" />
              </div>
            </div>
          </div>
        </section>

        {mensajeOk && (
          <div className="co-alerta co-alerta-ok">
            <CheckCircle size={18} /> {mensajeOk}
          </div>
        )}
        {mensajeErr && (
          <div className="co-alerta co-alerta-err">
            <AlertCircle size={18} /> {mensajeErr}
          </div>
        )}

        <div className="co-acciones-finales">
          <button
            className="co-btn-guardar"
            onClick={handleGuardar}
            disabled={
              guardando || !titulo || !clienteSeleccionado || !mineralCodigo
            }
          >
            <FileCheck size={20} />
            {guardando ? "Guardando…" : "Guardar Certificado"}
          </button>
        </div>
        </>
      )}

      {tabActivo === "dashboard" && (
        <div className="co-dash">
          {/* ── Filtros de período ── */}
          <div className="co-dash-filtros">
            <div className="co-dash-periodo-btns">
              {[["1d","Hoy"],["7d","7 días"],["30d","30 días"],["90d","90 días"]].map(([p,l]) => (
                <button
                  key={p}
                  className={`co-dash-periodo-btn${dashPeriodo === p ? " active" : ""}`}
                  onClick={() => aplicarPeriodo(p)}
                >{l}</button>
              ))}
            </div>
            <div className="co-dash-fechas">
              <label>Desde:</label>
              <input type="date" className="co-dash-date-input" value={dashDesde} max={dashHasta}
                onChange={e => { setDashDesde(e.target.value); setDashPeriodo("custom"); }} />
              <label>Hasta:</label>
              <input type="date" className="co-dash-date-input" value={dashHasta} min={dashDesde}
                onChange={e => { setDashHasta(e.target.value); setDashPeriodo("custom"); }} />
              <button className="co-dash-refresh-btn" onClick={() => cargarDashboard()} disabled={loadingDash}>
                <RefreshCw size={14}/> Aplicar
              </button>
            </div>
          </div>

          {loadingDash && <p className="co-loading">Cargando dashboard…</p>}
          {errorDash  && <p className="co-error"><AlertCircle size={16}/> {errorDash}</p>}
          {!loadingDash && !dashData && !errorDash && (
            <p className="co-loading" style={{color:"#6b7280"}}>Selecciona un título minero para ver el dashboard.</p>
          )}
          {dashData && (
            <>
              {/* ── Tarjetas resumen ── */}
              <div className="co-dash-cards">
                <div className="co-dash-card co-dash-card--blue">
                  <div className="co-dash-card-icon"><Hash size={22}/></div>
                  <div>
                    <p className="co-dash-card-label">Total Certificados</p>
                    <p className="co-dash-card-value">{dashData.totalCerts}</p>
                  </div>
                </div>
                <div className="co-dash-card co-dash-card--green">
                  <div className="co-dash-card-icon"><Package size={22}/></div>
                  <div>
                    <p className="co-dash-card-label">Volumen Total</p>
                    <p className="co-dash-card-value">{dashData.totalVolumen.toLocaleString("es-CO", {maximumFractionDigits:2})} <span style={{fontSize:13,fontWeight:500}}>M³</span></p>
                  </div>
                </div>
                <div className="co-dash-card co-dash-card--amber">
                  <div className="co-dash-card-icon"><Users size={22}/></div>
                  <div>
                    <p className="co-dash-card-label">Clientes Únicos</p>
                    <p className="co-dash-card-value">{dashData.clientesUnicos}</p>
                  </div>
                </div>
              </div>

              <div className="co-dash-grid">
                {/* ── Por mineral ── */}
                <div className="co-dash-panel">
                  <h3 className="co-dash-panel-title"><BarChart2 size={16}/> Volumen por Mineral</h3>
                  {Object.entries(dashData.porMineral)
                    .sort((a,b) => b[1].volumen - a[1].volumen)
                    .map(([mineral, datos]) => {
                      const maxVol = Math.max(...Object.values(dashData.porMineral).map(d => d.volumen));
                      const pct = maxVol > 0 ? (datos.volumen / maxVol) * 100 : 0;
                      return (
                        <div key={mineral} className="co-dash-bar-row">
                          <span className="co-dash-bar-label">{mineral}</span>
                          <div className="co-dash-bar-track">
                            <div className="co-dash-bar-fill co-dash-bar--mineral" style={{width:`${pct}%`}}/>
                          </div>
                          <span className="co-dash-bar-val">{datos.volumen.toLocaleString("es-CO",{maximumFractionDigits:1})} M³</span>
                          <span className="co-dash-bar-count">({datos.cantidad})</span>
                        </div>
                      );
                    })
                  }
                </div>

                {/* ── Top clientes ── */}
                <div className="co-dash-panel">
                  <h3 className="co-dash-panel-title"><Users size={16}/> Top Clientes por Volumen</h3>
                  {dashData.topClientes.map(([nombre, datos], i) => {
                    const maxVol = dashData.topClientes[0]?.[1]?.volumen || 1;
                    const pct = (datos.volumen / maxVol) * 100;
                    return (
                      <div key={nombre} className="co-dash-bar-row">
                        <span className="co-dash-bar-num">{i+1}</span>
                        <span className="co-dash-bar-label">{nombre}</span>
                        <div className="co-dash-bar-track">
                          <div className="co-dash-bar-fill co-dash-bar--cliente" style={{width:`${pct}%`}}/>
                        </div>
                        <span className="co-dash-bar-val">{datos.volumen.toLocaleString("es-CO",{maximumFractionDigits:1})} M³</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Últimos certificados ── */}
              <div className="co-dash-panel co-dash-panel--full">
                <h3 className="co-dash-panel-title"><FileCheck size={16}/> Últimos Certificados</h3>
                <div className="co-dash-tabla-wrapper">
                  <table className="co-dash-tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Mineral</th>
                        <th>Cliente</th>
                        <th>Cantidad</th>
                        <th>Unidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashData.ultimos.map(c => (
                        <tr key={c.id}>
                          <td>{c.fechaCertificado ? new Date(c.fechaCertificado).toLocaleDateString("es-CO") : "—"}</td>
                          <td>{c.mineralExplotado || "—"}</td>
                          <td>{c.clientes_compradores?.nombre || c.clienteId}</td>
                          <td style={{textAlign:"right"}}>{parseFloat(c.cantidadM3 || 0).toLocaleString("es-CO",{maximumFractionDigits:2})}</td>
                          <td>{c.unidadMedida || "M3"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}


      {tabActivo === "exportar" && (
        <div className="co-dash">

          {/* ── Alertas ── */}
          {expError && (
            <div className="co-alerta co-alerta-err" style={{marginBottom:12}}>
              <AlertCircle size={16}/> {expError}
            </div>
          )}
          {expSuccess && (
            <div className="co-alerta co-alerta-ok" style={{marginBottom:12}}>
              <CheckCircle size={16}/> {expSuccess}
            </div>
          )}

          {/* ── Card Filtros — idéntica a Reportes ── */}
          <div className="co-exp-panel">
            <div className="co-exp-panel-header">
              <FileDown size={20}/>
              <h3 className="co-exp-panel-title">Filtros de Exportación</h3>
              {[expFiltros.fechaInicio, expFiltros.fechaFin, expFiltros.mineral, expFiltros.clienteId].filter(Boolean).length > 0 && (
                <span className="badge-filtros">
                  {[expFiltros.fechaInicio, expFiltros.fechaFin, expFiltros.mineral, expFiltros.clienteId].filter(Boolean).length} activo{[expFiltros.fechaInicio, expFiltros.fechaFin, expFiltros.mineral, expFiltros.clienteId].filter(Boolean).length > 1 ? "s" : ""}
                </span>
              )}
              {expLoading && (
                <span className="co-loading-inline">
                  <RefreshCw size={13} className="icon-spin"/> Actualizando…
                </span>
              )}
            </div>

            <div className="co-exp-filtros-grid">

              <div className="co-campo">
                <label><Calendar size={14}/> Fecha Inicio</label>
                <input type="date" name="fechaInicio" className="co-campo-input"
                  value={expFiltros.fechaInicio}
                  max={expFiltros.fechaFin || undefined}
                  onChange={handleExpFiltroChange} disabled={expLoading}/>
              </div>

              <div className="co-campo">
                <label><Calendar size={14}/> Fecha Fin</label>
                <input type="date" name="fechaFin" className="co-campo-input"
                  value={expFiltros.fechaFin}
                  min={expFiltros.fechaInicio || undefined}
                  onChange={handleExpFiltroChange} disabled={expLoading}/>
              </div>

              <div className="co-campo">
                <label>Mineral</label>
                <div className="co-select-wrapper">
                  <select name="mineral" className="co-campo-input"
                    value={expFiltros.mineral} onChange={handleExpFiltroChange} disabled={expLoading}>
                    <option value="">Todos los minerales</option>
                    {mineralesCatalogo.map(m => (
                      <option key={m.codigo} value={m.codigo}>{m.nombre || m.codigo}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="co-select-icon"/>
                </div>
              </div>

              <div className="co-campo">
                <label>Cliente</label>
                <div className="co-select-wrapper">
                  <select name="clienteId" className="co-campo-input"
                    value={expFiltros.clienteId} onChange={handleExpFiltroChange} disabled={expLoading}>
                    <option value="">Todos los clientes</option>
                    {clientesLista.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}{c.cedula ? ` — ${c.cedula}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="co-select-icon"/>
                </div>
              </div>

            </div>

            <div className="co-exp-acciones">
              <button className="co-btn-secundario" onClick={limpiarExpFiltros} disabled={expLoading}>
                <X size={15}/> Limpiar Filtros
              </button>
              <button
                className="btn btn-excel"
                onClick={handleExportarExcel}
                disabled={expLoading || expPreview.total === 0}
                title="Descargar como .xlsx"
              >
                <FileSpreadsheet size={18}/>
                {expLoading ? " Generando…" : " Exportar a Excel"}
                <span className="btn-badge">.xlsx</span>
              </button>
            </div>
          </div>

          {/* ── Vista Previa — siempre visible, igual a Reportes ── */}
          <div className="co-dash-panel co-dash-panel--full" style={{marginTop:20}}>
            <div className="co-dash-panel-header">
              <Eye size={18}/>
              <h3 className="co-dash-panel-title">Vista Previa de Datos</h3>
              {expPreview.total > 0 && (
                <span className="badge">{expPreview.total} registro{expPreview.total !== 1 ? "s" : ""}</span>
              )}
              {expLoading && (
                <span className="co-loading-inline">
                  <RefreshCw size={13} className="icon-spin"/> Actualizando…
                </span>
              )}
            </div>

            {expPreview.registros?.length > 0 ? (
              <TablaPreviewCert
                columnas={expPreview.columnas.map(c => ({ key: c, label: c.replace(/_/g, " ") }))}
                datos={expPreview.registros}
                maxRows={100}
              />
            ) : (
              <div className="estado-vacio">
                {expLoading
                  ? <><RefreshCw size={28} style={{color:"#94a3b8", marginBottom:8}}/><p>Cargando datos…</p></>
                  : <><FileDown size={32} style={{color:"#cbd5e1",marginBottom:8}}/><p>Sin registros con los filtros aplicados</p></>
                }
              </div>
            )}
          </div>

        </div>
      )}

      </main>

      {/* ══ MODAL EDITAR CLIENTE ══ */}
      {modoEditarCliente && (
        <div
          className="co-modal-overlay"
          onClick={() => setModoEditarCliente(false)}
        >
          <div className="co-modal" onClick={(e) => e.stopPropagation()}>
            <div className="co-modal-header">
              <h3>
                <Pencil size={18} /> Editar Cliente
              </h3>
              <button
                className="co-modal-close"
                onClick={() => setModoEditarCliente(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="co-modal-body">
              <p className="co-modal-cedula">
                {clienteSeleccionado?.tipoIdentificacion || "Identificación"}:{" "}
                <strong>{clienteSeleccionado?.cedula}</strong>
              </p>
              <FormCliente
                data={editCliente}
                onChange={setEditCliente}
                soloEdicion
              />
              {errorCliente && (
                <p className="co-error" style={{ marginTop: 12 }}>
                  <AlertCircle size={14} /> {errorCliente}
                </p>
              )}
            </div>
            <div className="co-modal-footer">
              <button
                className="co-btn-primario"
                onClick={guardarEdicionCliente}
                disabled={guardandoCliente}
              >
                {guardandoCliente ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                className="co-btn-secundario"
                onClick={() => {
                  setModoEditarCliente(false);
                  setErrorCliente("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL FORMATO ══ */}
      {modalFormato && (
        <div
          className="co-modal-overlay"
          onClick={() => !descargando && setModalFormato(false)}
        >
          <div
            className="co-modal co-modal-formato"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="co-modal-header">
              <h3>
                <Download size={18} /> Descargar Certificado
              </h3>
              {!descargando && (
                <button
                  className="co-modal-close"
                  onClick={() => setModalFormato(false)}
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="co-modal-body">
              <p style={{ marginBottom: 18, color: "#475569", fontSize: 14 }}>
                El certificado fue guardado. ¿En qué formato deseas descargarlo?
              </p>
              <div className="co-formato-opciones">
                <button
                  className="co-formato-btn co-formato-excel"
                  onClick={() => handleConfirmarFormato("excel")}
                  disabled={descargando}
                >
                  <FileSpreadsheet size={28} />
                  <span className="co-formato-nombre">Excel</span>
                  <span className="co-formato-desc">.xlsx — editable</span>
                </button>
                <button
                  className="co-formato-btn co-formato-pdf"
                  onClick={() => handleConfirmarFormato("pdf")}
                  disabled={descargando}
                >
                  <FileText size={28} />
                  <span className="co-formato-nombre">PDF</span>
                  <span className="co-formato-desc">.pdf — para imprimir</span>
                </button>
                <button
                  className="co-formato-btn co-formato-ambos"
                  onClick={() => handleConfirmarFormato("ambos")}
                  disabled={descargando}
                >
                  <Download size={28} />
                  <span className="co-formato-nombre">Ambos</span>
                  <span className="co-formato-desc">Excel + PDF</span>
                </button>
              </div>
              {descargando && (
                <p
                  style={{
                    textAlign: "center",
                    marginTop: 14,
                    color: "#059669",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  ⏳ Generando archivo…
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificadoOrigen;
