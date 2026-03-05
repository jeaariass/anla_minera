// src/pages/CertificadoOrigen.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import api from "../services/api";
import {
  ArrowLeft, LogOut, Search, UserPlus, Pencil,
  FileCheck, ChevronDown, AlertCircle, CheckCircle, X, User,
  FileText, FileSpreadsheet, Download,
} from "lucide-react";
import "./CertificadoOrigen.css";

const UNIDADES             = ["M3", "TON", "KG", "L", " "];
const TIPOS_IDENTIFICACION = ["CÉDULA", "NIT", "CÉDULA DE EXTRANJERÍA", "RUT"];
const TIPOS_COMPRADOR      = ["COMERCIALIZADOR", "CONSUMIDOR"];

const clienteVacio = {
  cedula: "", nombre: "", correo: "", telefono: "", direccion: "",
  tipoIdentificacion: "", tipoComprador: "", rucom: "",
};

// ─── Componentes auxiliares (fuera del componente principal) ────────────────

const CampoCliente = ({ label, valor }) =>
  valor ? <span><b>{label}:</b> {valor}</span> : null;

const SelectField = ({ label, value, onChange, opciones, requerido }) => (
  <div className="co-campo">
    <label>{label}{requerido && " *"}</label>
    <div className="co-select-wrapper">
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Selecciona —</option>
        {opciones.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={16} className="co-select-icon" />
    </div>
  </div>
);

const FormCliente = ({ data, onChange, soloEdicion = false }) => (
  <div className="co-form-grid">
    <SelectField
      label="Tipo de Identificación" requerido
      value={data.tipoIdentificacion}
      onChange={v => onChange({ ...data, tipoIdentificacion: v })}
      opciones={TIPOS_IDENTIFICACION}
    />
    <SelectField
      label="Tipo de Comprador" requerido
      value={data.tipoComprador}
      onChange={v => onChange({ ...data, tipoComprador: v })}
      opciones={TIPOS_COMPRADOR}
    />
    {!soloEdicion && (
      <div className="co-campo">
        <label>N° Identificación *</label>
        <input type="text" value={data.cedula}
          onChange={e => onChange({ ...data, cedula: e.target.value })}
          placeholder="Número de documento" />
      </div>
    )}
    <div className="co-campo">
      <label>Nombre completo *</label>
      <input type="text" value={data.nombre}
        onChange={e => onChange({ ...data, nombre: e.target.value })} />
    </div>
    <div className="co-campo">
      <label>No. RUCOM</label>
      <input type="text" value={data.rucom}
        onChange={e => onChange({ ...data, rucom: e.target.value })}
        placeholder="Ej: 123-543" />
    </div>
    <div className="co-campo">
      <label>Teléfono</label>
      <input type="text" value={data.telefono}
        onChange={e => onChange({ ...data, telefono: e.target.value })} />
    </div>
    <div className="co-campo">
      <label>Correo electrónico</label>
      <input type="email" value={data.correo}
        onChange={e => onChange({ ...data, correo: e.target.value })} />
    </div>
    <div className="co-campo co-campo-full">
      <label>Dirección</label>
      <input type="text" value={data.direccion}
        onChange={e => onChange({ ...data, direccion: e.target.value })} />
    </div>
  </div>
);

// ─── Componente principal ────────────────────────────────────────────────────
const CertificadoOrigen = () => {
  const navigate = useNavigate();
  const [user]   = useState(authService.getCurrentUser());

  // Título minero
  const [titulo,        setTitulo]        = useState(null);
  const [loadingTitulo, setLoadingTitulo] = useState(true);
  const [errorTitulo,   setErrorTitulo]   = useState("");

  // Minerales
  const [mineralesCatalogo, setMineralesCatalogo] = useState([]);
  const [loadingMinerales,  setLoadingMinerales]  = useState(false);

  // Cliente — búsqueda
  const [busquedaTipo,        setBusquedaTipo]        = useState("cedula");
  const [busquedaValor,       setBusquedaValor]       = useState("");
  const [buscando,            setBuscando]            = useState(false);
  const [clienteEncontrado,   setClienteEncontrado]   = useState(null);
  const [errorCliente,        setErrorCliente]        = useState("");
  const [modoNuevoCliente,    setModoNuevoCliente]    = useState(false);
  const [nuevoCliente,        setNuevoCliente]        = useState(clienteVacio);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Cliente — edición
  const [modoEditarCliente, setModoEditarCliente] = useState(false);
  const [editCliente,       setEditCliente]       = useState(clienteVacio);
  const [guardandoCliente,  setGuardandoCliente]  = useState(false);

  // Certificado
  const [mineralCodigo, setMineralCodigo] = useState("");
  const [cantidad,      setCantidad]      = useState("");
  const [unidad,        setUnidad]        = useState("M3");

  // Estados generales
  const [guardando,  setGuardando]  = useState(false);
  const [mensajeOk,  setMensajeOk]  = useState("");
  const [mensajeErr, setMensajeErr] = useState("");

  useEffect(() => { cargarTitulo(); cargarMinerales(); }, []);

  const cargarTitulo = async () => {
    try {
      setLoadingTitulo(true); setErrorTitulo("");
      const tituloId = user?.tituloMinero?.id || user?.tituloMineroId;
      if (!tituloId) { setErrorTitulo("No tienes un título minero asignado."); return; }
      const res = await api.get(`/titulos/${tituloId}`);
      const t = res.data.titulo || res.data.data || null;
      if (t) setTitulo(t);
      else setErrorTitulo("No se pudo cargar el título minero.");
    } catch { setErrorTitulo("Error al conectar con el servidor."); }
    finally { setLoadingTitulo(false); }
  };

  const cargarMinerales = async () => {
    try {
      setLoadingMinerales(true);
      const res = await api.get("/actividad/items/inspeccion");
      if (res.data.success) setMineralesCatalogo(res.data.data ?? []);
    } catch { console.error("Error cargando minerales"); }
    finally { setLoadingMinerales(false); }
  };

  const buscarCliente = async () => {
    if (!busquedaValor.trim()) return;
    try {
      setBuscando(true); setErrorCliente("");
      setClienteEncontrado(null); setClienteSeleccionado(null); setModoNuevoCliente(false);
      const res = await api.get("/clientes/buscar", { params: { [busquedaTipo]: busquedaValor.trim() } });
      if (res.data.success && res.data.data) setClienteEncontrado(res.data.data);
      else setErrorCliente("No se encontró ningún cliente con ese dato.");
    } catch (err) {
      if (err.response?.status === 404) setErrorCliente("No se encontró ningún cliente con ese dato.");
      else setErrorCliente("Error al buscar cliente.");
    } finally { setBuscando(false); }
  };

  const iniciarNuevoCliente = () => {
    setModoNuevoCliente(true); setClienteEncontrado(null);
    setClienteSeleccionado(null); setErrorCliente("");
    setNuevoCliente({ ...clienteVacio, [busquedaTipo]: busquedaValor.trim() });
  };

  const guardarNuevoCliente = async () => {
    if (!nuevoCliente.tipoIdentificacion) { setErrorCliente("Selecciona el tipo de identificación."); return; }
    if (!nuevoCliente.tipoComprador)      { setErrorCliente("Selecciona el tipo de comprador."); return; }
    if (!nuevoCliente.cedula || !nuevoCliente.nombre) { setErrorCliente("Cédula y nombre son obligatorios."); return; }
    try {
      setBuscando(true); setErrorCliente("");
      const res = await api.post("/clientes", nuevoCliente);
      if (res.data.success) { setClienteSeleccionado(res.data.data); setModoNuevoCliente(false); }
    } catch (err) {
      setErrorCliente(err.response?.data?.message || "Error al guardar cliente.");
    } finally { setBuscando(false); }
  };

  const abrirEdicion = () => {
    setEditCliente({
      nombre:             clienteSeleccionado.nombre             || "",
      correo:             clienteSeleccionado.correo             || "",
      telefono:           clienteSeleccionado.telefono           || "",
      direccion:          clienteSeleccionado.direccion          || "",
      tipoIdentificacion: clienteSeleccionado.tipoIdentificacion || "",
      tipoComprador:      clienteSeleccionado.tipoComprador      || "",
      rucom:              clienteSeleccionado.rucom              || "",
    });
    setModoEditarCliente(true); setErrorCliente("");
  };

  const guardarEdicionCliente = async () => {
    if (!editCliente.tipoIdentificacion) { setErrorCliente("Selecciona el tipo de identificación."); return; }
    if (!editCliente.tipoComprador)      { setErrorCliente("Selecciona el tipo de comprador."); return; }
    if (!editCliente.nombre)             { setErrorCliente("El nombre es obligatorio."); return; }
    try {
      setGuardandoCliente(true); setErrorCliente("");
      const res = await api.put(`/clientes/${clienteSeleccionado.id}`, editCliente);
      if (res.data.success) { setClienteSeleccionado(res.data.data); setModoEditarCliente(false); }
    } catch (err) {
      setErrorCliente(err.response?.data?.message || "Error al actualizar cliente.");
    } finally { setGuardandoCliente(false); }
  };

  // ── Estado modal formato ────────────────────────────────────────────────────
  const [modalFormato,      setModalFormato]      = useState(false);
  const [certificadoIdPend, setCertificadoIdPend] = useState(null);
  const [descargando,       setDescargando]       = useState(false);

  // ── Validar y abrir modal de formato ────────────────────────────────────────
  const handleGuardar = async () => {
    setMensajeOk(""); setMensajeErr("");
    if (!titulo)              return setMensajeErr("Falta información del título minero.");
    if (!clienteSeleccionado) return setMensajeErr("Debes seleccionar o registrar un cliente.");
    if (!mineralCodigo)       return setMensajeErr("Selecciona el mineral explotado.");
    if (cantidad !== "" && (isNaN(Number(cantidad)) || Number(cantidad) <= 0))
                              return setMensajeErr("La cantidad no puede ser cero o negativa.");
    try {
      setGuardando(true);
      const res = await api.post("/certificados-origen", {
        tituloMineroId:   titulo.id,
        clienteId:        clienteSeleccionado.id,
        mineralExplotado: mineralCodigo,
        cantidadM3:       cantidad !== "" ? Number(cantidad) : null,
        unidadMedida:     unidad,
      });
      if (!res.data.success) return setMensajeErr("Error al guardar el certificado.");
      setCertificadoIdPend(res.data.data.id);
      setModalFormato(true);
    } catch (err) {
      setMensajeErr(err.response?.data?.message || err.message || "Error al guardar el certificado.");
    } finally { setGuardando(false); }
  };

  // ── Descargar un archivo del certificado ────────────────────────────────────
  const descargarArchivo = async (certId, formato) => {
    const token = localStorage.getItem("token");
    const base  = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    const ext   = formato === "pdf" ? "pdf" : "xlsx";
    const mime  = formato === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const resp = await fetch(`${base}/certificados-origen/${certId}/${formato}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Error al descargar ${ext.toUpperCase()}`);

    const blob = await resp.blob();
    const url  = window.URL.createObjectURL(new Blob([blob], { type: mime }));
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
      setMensajeOk(`✅ Certificado guardado y ${formato === "ambos" ? "archivos descargados" : formato.toUpperCase() + " descargado"} correctamente.`);
      setMineralCodigo(""); setCantidad(""); setUnidad("M3");
      setClienteSeleccionado(null); setBusquedaValor("");
    } catch (err) {
      setMensajeErr(err.message || "Error al descargar el archivo.");
    } finally {
      setDescargando(false);
      setModalFormato(false);
      setCertificadoIdPend(null);
    }
  };

  const handleLogout = () => { authService.logout(); navigate("/"); };

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
                  width="50" height="50"
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
                <div className="user-avatar"><User size={20} /></div>
                <div className="user-details">
                  <p className="user-name">{user?.nombre || "Usuario"}</p>
                  <p className="user-role">{user?.rol || "ROL"}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button onClick={() => navigate("/home")} className="breadcrumb-link">
              <ArrowLeft size={16} /> Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Certificado de Origen</span>
          </div>
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <main className="co-main">

        {/* ── Sección 1: Título Minero ── */}
        <section className="co-section">
          <h2 className="co-section-title">
            <span className="co-section-num">1</span>Información del Título Minero
          </h2>
          {loadingTitulo && <p className="co-loading">Cargando título minero…</p>}
          {errorTitulo   && <p className="co-error"><AlertCircle size={16}/> {errorTitulo}</p>}
          {titulo && (
            <div className="co-titulo-grid">
              <div className="co-dato"><label>N° Título</label><span>{titulo.numeroTitulo}</span></div>
              <div className="co-dato">
                <label>Estado</label>
                <span className={`co-badge co-badge-${titulo.estado?.toLowerCase()}`}>{titulo.estado}</span>
              </div>
              <div className="co-dato"><label>Municipio</label><span>{titulo.municipio}</span></div>
              <div className="co-dato"><label>Departamento</label><span>{titulo.departamento || "—"}</span></div>
              <div className="co-dato"><label>Cédula del Titular</label><span>{titulo.cedulaTitular || "—"}</span></div>
              <div className="co-dato"><label>Nombre del Titular</label><span>{titulo.nombreTitular || "—"}</span></div>
              <div className="co-dato">
                <label>Vigencia</label>
                <span>
                  {titulo.fechaInicio       ? new Date(titulo.fechaInicio).toLocaleDateString("es-CO")       : "—"}
                  {" → "}
                  {titulo.fechaVencimiento  ? new Date(titulo.fechaVencimiento).toLocaleDateString("es-CO")  : "—"}
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
              <CheckCircle size={22} color="#059669" className="co-check-icon" />
              <div className="co-cliente-info">
                <strong>{clienteSeleccionado.nombre}</strong>
                <div className="co-cliente-detalles">
                  <CampoCliente label="Tipo ID"        valor={clienteSeleccionado.tipoIdentificacion} />
                  <CampoCliente label="N° ID"          valor={clienteSeleccionado.cedula} />
                  <CampoCliente label="Tipo comprador" valor={clienteSeleccionado.tipoComprador} />
                  <CampoCliente label="RUCOM"          valor={clienteSeleccionado.rucom} />
                  <CampoCliente label="Teléfono"       valor={clienteSeleccionado.telefono} />
                  <CampoCliente label="Correo"         valor={clienteSeleccionado.correo} />
                  <CampoCliente label="Dirección"      valor={clienteSeleccionado.direccion} />
                </div>
              </div>
              <div className="co-cliente-acciones">
                <button className="co-btn-editar" onClick={abrirEdicion}><Pencil size={15} /> Editar</button>
                <button className="co-btn-secundario"
                  onClick={() => { setClienteSeleccionado(null); setBusquedaValor(""); }}>
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <>
              {!modoNuevoCliente && (
                <div className="co-busqueda">
                  <div className="co-busqueda-tipo">
                    <button className={busquedaTipo === "cedula" ? "active" : ""} onClick={() => setBusquedaTipo("cedula")}>N° Identificación</button>
                    <button className={busquedaTipo === "correo" ? "active" : ""} onClick={() => setBusquedaTipo("correo")}>Correo</button>
                  </div>
                  <div className="co-busqueda-input">
                    <input
                      type={busquedaTipo === "correo" ? "email" : "text"}
                      placeholder={busquedaTipo === "cedula" ? "Número de identificación…" : "Correo electrónico…"}
                      value={busquedaValor}
                      onChange={e => { setBusquedaValor(e.target.value); setErrorCliente(""); setClienteEncontrado(null); }}
                      onKeyDown={e => e.key === "Enter" && buscarCliente()}
                    />
                    <button className="co-btn-buscar" onClick={buscarCliente} disabled={buscando || !busquedaValor.trim()}>
                      <Search size={16} /> {buscando ? "Buscando…" : "Buscar"}
                    </button>
                  </div>

                  {errorCliente && (
                    <div className="co-error-cliente">
                      <AlertCircle size={15} /> {errorCliente}
                      <button className="co-btn-nuevo-inline" onClick={iniciarNuevoCliente}>
                        <UserPlus size={15} /> Registrar nuevo
                      </button>
                    </div>
                  )}

                  {clienteEncontrado && (
                    <div className="co-cliente-resultado">
                      <strong>{clienteEncontrado.nombre}</strong>
                      <div className="co-cliente-detalles">
                        <CampoCliente label="Tipo ID"        valor={clienteEncontrado.tipoIdentificacion} />
                        <CampoCliente label="N° ID"          valor={clienteEncontrado.cedula} />
                        <CampoCliente label="Tipo comprador" valor={clienteEncontrado.tipoComprador} />
                        <CampoCliente label="RUCOM"          valor={clienteEncontrado.rucom} />
                        <CampoCliente label="Teléfono"       valor={clienteEncontrado.telefono} />
                        <CampoCliente label="Correo"         valor={clienteEncontrado.correo} />
                        <CampoCliente label="Dirección"      valor={clienteEncontrado.direccion} />
                      </div>
                      <button className="co-btn-primario"
                        onClick={() => { setClienteSeleccionado(clienteEncontrado); setClienteEncontrado(null); }}>
                        Seleccionar este cliente
                      </button>
                    </div>
                  )}
                </div>
              )}

              {modoNuevoCliente && (
                <div className="co-nuevo-cliente">
                  <h3><UserPlus size={16} /> Registrar nuevo cliente</h3>
                  <FormCliente data={nuevoCliente} onChange={setNuevoCliente} />
                  {errorCliente && <p className="co-error"><AlertCircle size={14}/> {errorCliente}</p>}
                  <div className="co-nuevo-cliente-acciones">
                    <button className="co-btn-primario" onClick={guardarNuevoCliente} disabled={buscando}>
                      {buscando ? "Guardando…" : "Guardar cliente"}
                    </button>
                    <button className="co-btn-secundario"
                      onClick={() => { setModoNuevoCliente(false); setErrorCliente(""); }}>
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
                <select value={mineralCodigo} onChange={e => setMineralCodigo(e.target.value)} disabled={loadingMinerales}>
                  <option value="">{loadingMinerales ? "Cargando minerales…" : "— Selecciona un mineral —"}</option>
                  {mineralesCatalogo.map(m => (
                    <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="co-select-icon" />
              </div>
            </div>
            <div className="co-campo">
              <label>Cantidad</label>
              <input type="number" min="0" step="0.01" placeholder="Dejar vacío si solo se pesa"
                value={cantidad} onChange={e => setCantidad(e.target.value)} />
            </div>
            <div className="co-campo">
              <label>Unidad de Medida</label>
              <div className="co-select-wrapper">
                <select value={unidad} onChange={e => setUnidad(e.target.value)}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown size={16} className="co-select-icon" />
              </div>
            </div>
          </div>
        </section>

        {mensajeOk  && <div className="co-alerta co-alerta-ok"><CheckCircle size={18}/> {mensajeOk}</div>}
        {mensajeErr && <div className="co-alerta co-alerta-err"><AlertCircle size={18}/> {mensajeErr}</div>}

        <div className="co-acciones-finales">
          <button
            className="co-btn-guardar"
            onClick={handleGuardar}
            disabled={guardando || !titulo || !clienteSeleccionado || !mineralCodigo}
          >
            <FileCheck size={20} />
            {guardando ? "Guardando…" : "Guardar Certificado"}
          </button>
        </div>

      </main>

      {/* ══ MODAL EDITAR CLIENTE ══ */}
      {modoEditarCliente && (
        <div className="co-modal-overlay" onClick={() => setModoEditarCliente(false)}>
          <div className="co-modal" onClick={e => e.stopPropagation()}>
            <div className="co-modal-header">
              <h3><Pencil size={18} /> Editar Cliente</h3>
              <button className="co-modal-close" onClick={() => setModoEditarCliente(false)}><X size={20} /></button>
            </div>
            <div className="co-modal-body">
              <p className="co-modal-cedula">
                {clienteSeleccionado?.tipoIdentificacion || "Identificación"}: <strong>{clienteSeleccionado?.cedula}</strong>
              </p>
              <FormCliente data={editCliente} onChange={setEditCliente} soloEdicion />
              {errorCliente && <p className="co-error" style={{ marginTop: 12 }}><AlertCircle size={14}/> {errorCliente}</p>}
            </div>
            <div className="co-modal-footer">
              <button className="co-btn-primario" onClick={guardarEdicionCliente} disabled={guardandoCliente}>
                {guardandoCliente ? "Guardando…" : "Guardar cambios"}
              </button>
              <button className="co-btn-secundario"
                onClick={() => { setModoEditarCliente(false); setErrorCliente(""); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL FORMATO ══ */}
      {modalFormato && (
        <div className="co-modal-overlay" onClick={() => !descargando && setModalFormato(false)}>
          <div className="co-modal co-modal-formato" onClick={e => e.stopPropagation()}>
            <div className="co-modal-header">
              <h3><Download size={18}/> Descargar Certificado</h3>
              {!descargando && (
                <button className="co-modal-close" onClick={() => setModalFormato(false)}><X size={20}/></button>
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
                  <FileSpreadsheet size={28}/>
                  <span className="co-formato-nombre">Excel</span>
                  <span className="co-formato-desc">.xlsx — editable</span>
                </button>
                <button
                  className="co-formato-btn co-formato-pdf"
                  onClick={() => handleConfirmarFormato("pdf")}
                  disabled={descargando}
                >
                  <FileText size={28}/>
                  <span className="co-formato-nombre">PDF</span>
                  <span className="co-formato-desc">.pdf — para imprimir</span>
                </button>
                <button
                  className="co-formato-btn co-formato-ambos"
                  onClick={() => handleConfirmarFormato("ambos")}
                  disabled={descargando}
                >
                  <Download size={28}/>
                  <span className="co-formato-nombre">Ambos</span>
                  <span className="co-formato-desc">Excel + PDF</span>
                </button>
              </div>
              {descargando && (
                <p style={{ textAlign:"center", marginTop:14, color:"#059669", fontSize:13, fontWeight:600 }}>
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
