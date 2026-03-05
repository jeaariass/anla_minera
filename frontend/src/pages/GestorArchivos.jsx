// frontend/src/pages/GestorArchivos.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import api from "../services/api";
import {
  ArrowLeft, LogOut, User, FolderOpen, Folder,
  FileText, FileSpreadsheet, Download, Archive,
  ChevronRight, ChevronDown, RefreshCw, HardDrive,
} from "lucide-react";
import "./GestorArchivos.css";

const MESES_NOMBRES = {
  "01":"Enero","02":"Febrero","03":"Marzo","04":"Abril",
  "05":"Mayo","06":"Junio","07":"Julio","08":"Agosto",
  "09":"Septiembre","10":"Octubre","11":"Noviembre","12":"Diciembre",
};

const GestorArchivos = () => {
  const navigate = useNavigate();
  const [user]   = useState(authService.getCurrentUser());

  const [arbol,    setArbol]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  // Nodos abiertos: Set de keys "titulo" y "titulo/anio"
  const [abiertos, setAbiertos] = useState(new Set());

  // Descarga en progreso
  const [descargando, setDescargando] = useState("");

  useEffect(() => { cargarArbol(); }, []);

  const cargarArbol = async () => {
    try {
      setLoading(true); setError("");
      const res = await api.get("/archivos");
      if (res.data.success) setArbol(res.data.data ?? []);
      else setError("No se pudo cargar el árbol de archivos.");
    } catch {
      setError("Error al conectar con el servidor.");
    } finally { setLoading(false); }
  };

  const toggle = (key) => {
    setAbiertos(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleLogout = () => { authService.logout(); navigate("/"); };

  // ── Descargar un archivo individual ──────────────────────────────────────
  const descargarArchivo = async (rutaRel, nombre) => {
    try {
      setDescargando(rutaRel);
      const token = localStorage.getItem("token");
      const base  = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
      const res   = await fetch(
        `${base}/archivos/descargar?ruta=${encodeURIComponent(rutaRel)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Error en descarga");
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = nombre;
      document.body.appendChild(a); a.click();
      a.remove(); window.URL.revokeObjectURL(url);
    } catch { alert("Error al descargar el archivo."); }
    finally  { setDescargando(""); }
  };

  // ── Descargar ZIP de un mes ───────────────────────────────────────────────
  const descargarMes = async (titulo, anio, mes, mesNombre) => {
    const key = `${titulo}/${anio}/${mes}`;
    try {
      setDescargando(key);
      const token = localStorage.getItem("token");
      const base  = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
      const res   = await fetch(
        `${base}/archivos/descargar-mes?titulo=${titulo}&anio=${anio}&mes=${mes}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Error en descarga");
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `Certificados_${titulo}_${anio}_${mesNombre}.zip`;
      document.body.appendChild(a); a.click();
      a.remove(); window.URL.revokeObjectURL(url);
    } catch { alert("Error al descargar el ZIP."); }
    finally  { setDescargando(""); }
  };

  // ── Contar totales ────────────────────────────────────────────────────────
  const totalArchivos = arbol.reduce((t, tit) =>
    t + tit.años.reduce((t2, a) =>
      t2 + a.meses.reduce((t3, m) => t3 + m.archivos.length, 0), 0), 0);

  return (
    <div className="formularios-container">

      {/* ══ HEADER ══ */}
      <header className="formularios-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img src={`${import.meta.env.BASE_URL}logo.png`}
                  alt="Logo TU MINA" width="50" height="50"
                  style={{ borderRadius: "8px", objectFit: "contain" }} />
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
          <div className="breadcrumb">
            <button onClick={() => navigate("/home")} className="breadcrumb-link">
              <ArrowLeft size={16} /> Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Gestor de Archivos</span>
          </div>
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <main className="ga-main">
        <div className="ga-toolbar">
          <div className="ga-toolbar-left">
            <HardDrive size={20} className="ga-toolbar-icon" />
            <div>
              <h2>Certificados de Origen</h2>
              <p>{arbol.length} título{arbol.length !== 1 ? "s" : ""} · {totalArchivos} archivo{totalArchivos !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button className="ga-btn-refresh" onClick={cargarArbol} disabled={loading}>
            <RefreshCw size={16} className={loading ? "ga-spin" : ""} />
            Actualizar
          </button>
        </div>

        {error && <div className="ga-error">{error}</div>}

        {loading ? (
          <div className="ga-loading">
            <RefreshCw size={32} className="ga-spin" />
            <p>Cargando archivos…</p>
          </div>
        ) : arbol.length === 0 ? (
          <div className="ga-empty">
            <FolderOpen size={64} />
            <p>No hay certificados almacenados todavía.</p>
          </div>
        ) : (
          <div className="ga-tree">
            {arbol.map((tit) => {
              const keyTit  = tit.titulo;
              const abierto = abiertos.has(keyTit);
              return (
                <div key={tit.titulo} className="ga-node ga-titulo">
                  {/* ── Título minero ── */}
                  <button className="ga-node-header" onClick={() => toggle(keyTit)}>
                    {abierto ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    {abierto ? <FolderOpen size={20} className="ga-icon-titulo"/> : <Folder size={20} className="ga-icon-titulo"/>}
                    <span className="ga-node-label">{tit.titulo}</span>
                    <span className="ga-node-count">
                      {tit.años.reduce((t, a) => t + a.meses.reduce((t2, m) => t2 + m.archivos.length, 0), 0)} archivos
                    </span>
                  </button>

                  {abierto && (
                    <div className="ga-children">
                      {tit.años.map((anio) => {
                        const keyAnio   = `${tit.titulo}/${anio.anio}`;
                        const abiAnio   = abiertos.has(keyAnio);
                        return (
                          <div key={anio.anio} className="ga-node ga-anio">
                            {/* ── Año ── */}
                            <button className="ga-node-header" onClick={() => toggle(keyAnio)}>
                              {abiAnio ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                              {abiAnio ? <FolderOpen size={18} className="ga-icon-anio"/> : <Folder size={18} className="ga-icon-anio"/>}
                              <span className="ga-node-label">{anio.anio}</span>
                            </button>

                            {abiAnio && (
                              <div className="ga-children">
                                {anio.meses.map((mes) => {
                                  const keyMes  = `${tit.titulo}/${anio.anio}/${mes.mes}`;
                                  const abiMes  = abiertos.has(keyMes);
                                  const pdfs    = mes.archivos.filter(a => a.ext === "pdf");
                                  const xlsxs   = mes.archivos.filter(a => a.ext === "xlsx");
                                  const zipKey  = `${tit.titulo}/${anio.anio}/${mes.mes}`;
                                  return (
                                    <div key={mes.mes} className="ga-node ga-mes">
                                      {/* ── Mes ── */}
                                      <div className="ga-mes-header">
                                        <button className="ga-node-header" onClick={() => toggle(keyMes)}>
                                          {abiMes ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                          {abiMes ? <FolderOpen size={17} className="ga-icon-mes"/> : <Folder size={17} className="ga-icon-mes"/>}
                                          <span className="ga-node-label">
                                            {MESES_NOMBRES[mes.mes] || mes.mes}
                                          </span>
                                          <span className="ga-node-count">
                                            {pdfs.length} PDF · {xlsxs.length} Excel
                                          </span>
                                        </button>
                                        <button
                                          className="ga-btn-zip"
                                          title={`Descargar todo ${MESES_NOMBRES[mes.mes]} como ZIP`}
                                          disabled={!!descargando}
                                          onClick={() => descargarMes(tit.titulo, anio.anio, mes.mes, `${MESES_NOMBRES[mes.mes]}_${anio.anio}`)}
                                        >
                                          {descargando === zipKey
                                            ? <RefreshCw size={13} className="ga-spin"/>
                                            : <Archive size={13}/>
                                          }
                                          ZIP
                                        </button>
                                      </div>

                                      {abiMes && (
                                        <div className="ga-children ga-archivos">
                                          {mes.archivos.length === 0 && (
                                            <p className="ga-sin-archivos">Sin archivos</p>
                                          )}
                                          {mes.archivos.map((arch) => (
                                            <div key={arch.nombre} className="ga-archivo">
                                              <div className="ga-archivo-info">
                                                {arch.ext === "pdf"
                                                  ? <FileText   size={16} className="ga-icon-pdf"/>
                                                  : <FileSpreadsheet size={16} className="ga-icon-xlsx"/>
                                                }
                                                <div>
                                                  <span className="ga-archivo-nombre">{arch.nombre}</span>
                                                  <span className="ga-archivo-meta">
                                                    {arch.tamañoStr} · {new Date(arch.fechaMod).toLocaleDateString("es-CO")}
                                                  </span>
                                                </div>
                                              </div>
                                              <button
                                                className={`ga-btn-dl ga-btn-dl-${arch.ext}`}
                                                disabled={!!descargando}
                                                onClick={() => descargarArchivo(arch.rutaRel, arch.nombre)}
                                              >
                                                {descargando === arch.rutaRel
                                                  ? <RefreshCw size={13} className="ga-spin"/>
                                                  : <Download size={13}/>
                                                }
                                                {arch.ext.toUpperCase()}
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default GestorArchivos;
