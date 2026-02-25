// src/pages/FormulariosOperacion.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import api from '../services/api';
import {
  ArrowLeft, User, LogOut, RefreshCw,
  AlertTriangle, MapPin, Plus, Loader
} from 'lucide-react';
import './FormulariosOperacion.css';
import './Reportes.css';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: 'extraccion',    label: '⛏️ Extracción' },
  { id: 'acopio',        label: '📦 Acopio' },
  { id: 'procesamiento', label: '⚙️ Procesamiento' },
  { id: 'inspeccion',    label: '🔍 Inspección' },
];

const CAT_LABELS = {
  extraccion: '⛏️ Extracción', acopio: '📦 Acopio',
  procesamiento: '⚙️ Procesamiento', inspeccion: '🔍 Inspección',
};

/** "YYYY-MM-DD" en hora Colombia */
const colombiaToday = () => {
  const local = new Date(Date.now() - 5 * 3600000);
  return local.toISOString().split('T')[0];
};

/** Extrae "HH:MM" de "YYYY-MM-DDTHH:MM:SS" sin zona */
const toHHMM = (iso) => {
  const m = String(iso || '').match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
};

/** "DD/MM/YYYY" de "YYYY-MM-DD" */
const toDMY = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

/** True si día Colombia == hoy */
const esHoy = (dia) => !!dia && String(dia).split('T')[0] === colombiaToday();

/** Datetime-local string de ahora en Colombia */
const nowLocal = () => {
  const d = new Date(Date.now() - 5 * 3600000);
  return d.toISOString().slice(0, 16);
};

/** Convierte datetime-local "YYYY-MM-DDTHH:MM" a ISO con offset Colombia */
const localToISO = (s) => s ? `${s}:00.000-05:00` : null;


// ─── DraggableMarker sub-component ──────────────────────────────────────────
const DraggableMarker = ({ position, onMove }) => {
  const markerRef = useRef(null);

  // Also allow clicking the map to reposition marker
  useMapEvents({
    click(e) { onMove(e.latlng.lat, e.latlng.lng); },
  });

  const eventHandlers = {
    dragend() {
      const m = markerRef.current;
      if (m) { const ll = m.getLatLng(); onMove(ll.lat, ll.lng); }
    },
  };

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    >
      <Popup>
        <strong>📍 Arrastra para ajustar</strong><br />
        También puedes hacer clic en el mapa
      </Popup>
    </Marker>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const FormulariosOperacion = () => {
  const navigate    = useNavigate();
  const [user]      = useState(authService.getCurrentUser());
  const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId || 'titulo-816-17';
  const usuarioId      = user?.id || 'usr-admin-jesus';

  const [tab, setTab] = useState('paradas');

  // ── Catálogos ──────────────────────────────────────────────────────────────
  const [motivos,       setMotivos]       = useState([]);
  const [items,         setItems]         = useState([]);
  const [maquinaria,    setMaquinaria]    = useState([]);
  const [loadingCat,    setLoadingCat]    = useState(false);

  // ── Paradas ────────────────────────────────────────────────────────────────
  const [paradas,       setParadas]       = useState([]);
  const [loadingP,      setLoadingP]      = useState(true);
  const [busqP,         setBusqP]         = useState('');
  const [alertP,        setAlertP]        = useState(null); // {type, msg}

  // form paradas (nuevo/editar)
  const [editParada,    setEditParada]    = useState(null);  // parada object o null
  const [fp, setFp] = useState({ motivoId: '', motivoOtro: '', inicio: nowLocal(), fin: nowLocal(), observaciones: '' });
  const [submitP,       setSubmitP]       = useState(false);

  // ── Puntos ─────────────────────────────────────────────────────────────────
  const [puntos,        setPuntos]        = useState([]);
  const [loadingPt,     setLoadingPt]     = useState(true);
  const [busqPt,        setBusqPt]        = useState('');
  const [catFiltro,     setCatFiltro]     = useState('');
  const [alertPt,       setAlertPt]       = useState(null);

  // form puntos (nuevo/editar)
  const [editPunto,     setEditPunto]     = useState(null);
  const [fpt, setFpt] = useState({
    categoria: '', itemId: '', itemOtro: '',
    maquinariaId: '', maquinariaOtro: '',
    descripcion: '', volumenM3: '',
    latitud: '', longitud: '',
  });
  const [submitPt,      setSubmitPt]      = useState(false);
  const [loadingItems,  setLoadingItems]  = useState(false);
  const [mapModalOpen,  setMapModalOpen]  = useState(false);  // mini-map confirm
  const [mapTempCoords, setMapTempCoords] = useState(null);    // {lat, lng} while dragging

  // ── Inicialización ─────────────────────────────────────────────────────────
  useEffect(() => {
    cargarMotivos();
    cargarMaquinaria();
    cargarParadas();
    cargarPuntos();
  }, []);

  useEffect(() => {
    if (fpt.categoria) cargarItems(fpt.categoria);
    else setItems([]);
  }, [fpt.categoria]);

  // ── Carga catálogos ────────────────────────────────────────────────────────
  const cargarMotivos = async () => {
    try {
      const r = await api.get('/paradas/motivos');
      if (r.data.success) setMotivos(r.data.data ?? []);
    } catch {}
  };

  const cargarItems = async (cat) => {
    try {
      setLoadingItems(true);
      const r = await api.get(`/actividad/items/${cat}`);
      if (r.data.success) setItems(r.data.data ?? []);
    } catch { setItems([]); }
    finally { setLoadingItems(false); }
  };

  const cargarMaquinaria = async () => {
    try {
      const r = await api.get('/actividad/maquinaria');
      if (r.data.success) setMaquinaria(r.data.data ?? []);
    } catch {}
  };

  // ── Carga registros ────────────────────────────────────────────────────────
  const cargarParadas = async () => {
    try {
      setLoadingP(true);
      const r = await api.get(`/paradas/${tituloMineroId}`);
      if (r.data.success) setParadas(r.data.data ?? []);
    } catch { showAlert(setAlertP, 'error', 'No se pudieron cargar las paradas'); }
    finally { setLoadingP(false); }
  };

  const cargarPuntos = async () => {
    try {
      setLoadingPt(true);
      const r = await api.get(`/actividad/puntos/${tituloMineroId}`);
      if (r.data.success) setPuntos(r.data.data ?? []);
    } catch { showAlert(setAlertPt, 'error', 'No se pudieron cargar los puntos'); }
    finally { setLoadingPt(false); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showAlert = (setter, type, msg) => {
    setter({ type, msg });
    setTimeout(() => setter(null), 4000);
  };

  const resetFormP = () => {
    setEditParada(null);
    setFp({ motivoId: '', motivoOtro: '', inicio: nowLocal(), fin: nowLocal(), observaciones: '' });
  };

  const resetFormPt = () => {
    setEditPunto(null);
    setFpt({ categoria: '', itemId: '', itemOtro: '', maquinariaId: '', maquinariaOtro: '', descripcion: '', volumenM3: '', latitud: '', longitud: '' });
    setItems([]);
  };

  const startEditParada = (p) => {
    setEditParada(p);
    // Convert stored "YYYY-MM-DDTHH:MM:SS" → "YYYY-MM-DDTHH:MM" for datetime-local
    const inicioLocal = String(p.inicio || '').slice(0, 16);
    const finLocal    = String(p.fin    || '').slice(0, 16);
    setFp({
      motivoId:      p.motivoId      || '',
      motivoOtro:    p.motivoOtro    || '',
      inicio:        inicioLocal,
      fin:           finLocal,
      observaciones: p.observaciones || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditPunto = (pt) => {
    setEditPunto(pt);
    const cat = pt.categoria || '';
    setFpt({
      categoria:     cat,
      itemId:        pt.itemId        || '',
      itemOtro:      pt.itemOtro      || '',
      maquinariaId:  pt.maquinariaId  || '',
      maquinariaOtro:pt.maquinariaOtro|| '',
      descripcion:   pt.descripcion   || '',
      volumenM3:     pt.volumenM3 != null ? String(pt.volumenM3) : '',
      latitud:       pt.latitud       != null ? String(pt.latitud)  : '',
      longitud:      pt.longitud      != null ? String(pt.longitud) : '',
    });
    if (cat) cargarItems(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return alert('Tu navegador no soporta geolocalización');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFpt(prev => ({
          ...prev,
          latitud:  String(coords.latitude.toFixed(8)),
          longitud: String(coords.longitude.toFixed(8)),
        }));
        setMapModalOpen(true);
        // seed temp coords so modal starts at GPS position
        setTimeout(() => setMapTempCoords(null), 0);
      },
      () => alert('No se pudo obtener la ubicación')
    );
  };

  // ── Submit parada ──────────────────────────────────────────────────────────
  const handleSubmitParada = async (e) => {
    e.preventDefault();
    if (!fp.motivoId) return showAlert(setAlertP, 'error', 'Selecciona un motivo');
    if (!fp.inicio || !fp.fin) return showAlert(setAlertP, 'error', 'Ingresa inicio y fin');
    const motivoSel = motivos.find(m => m.id === fp.motivoId);
    if (motivoSel?.codigo === 'OTRO' && !fp.motivoOtro.trim())
      return showAlert(setAlertP, 'error', 'Describe el motivo "Otro"');

    try {
      setSubmitP(true);
      const payload = {
        usuarioId, tituloMineroId,
        motivoId:     fp.motivoId,
        motivoOtro:   fp.motivoOtro.trim() || null,
        inicio:       localToISO(fp.inicio),
        fin:          localToISO(fp.fin),
        observaciones:fp.observaciones.trim() || null,
      };

      let r;
      if (editParada) {
        r = await api.put(`/paradas/${editParada.id}`, payload);
      } else {
        r = await api.post('/paradas', payload);
      }

      if (r.data.success) {
        showAlert(setAlertP, 'success', editParada ? '✅ Paro actualizado' : `✅ Paro registrado · ${r.data.data?.minutosRegistrados ?? '?'} min`);
        resetFormP();
        cargarParadas();
      } else {
        showAlert(setAlertP, 'error', r.data.message || 'Error al guardar');
      }
    } catch (e) {
      showAlert(setAlertP, 'error', e.response?.data?.message || 'Error al conectar con el servidor');
    } finally { setSubmitP(false); }
  };

  // ── Delete parada ──────────────────────────────────────────────────────────
  const handleDeleteParada = async (p) => {
    if (!window.confirm(`¿Eliminar el paro "${p.motivoNombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const r = await api.delete(`/paradas/${p.id}`);
      if (r.data.success) {
        setParadas(prev => prev.filter(x => x.id !== p.id));
        showAlert(setAlertP, 'success', '🗑️ Paro eliminado');
      } else {
        showAlert(setAlertP, 'error', r.data.message || 'No se pudo eliminar');
      }
    } catch (e) {
      showAlert(setAlertP, 'error', e.response?.data?.message || 'Error al eliminar');
    }
  };

  // ── Submit punto ───────────────────────────────────────────────────────────
  const handleSubmitPunto = async (e) => {
    e.preventDefault();
    if (!fpt.categoria) return showAlert(setAlertPt, 'error', 'Selecciona una categoría');
    if (!fpt.itemId)    return showAlert(setAlertPt, 'error', 'Selecciona un ítem');
    if (!fpt.latitud || !fpt.longitud) return showAlert(setAlertPt, 'error', 'Ingresa las coordenadas o usa el botón GPS');
    const itemSel = items.find(i => i.id === fpt.itemId);
    if (itemSel?.codigo === 'OTRO' && !fpt.itemOtro.trim())
      return showAlert(setAlertPt, 'error', 'Describe el ítem "Otro"');

    try {
      setSubmitPt(true);
      const payload = {
        usuarioId, tituloMineroId,
        latitud:       parseFloat(fpt.latitud),
        longitud:      parseFloat(fpt.longitud),
        categoria:     fpt.categoria,
        itemId:        fpt.itemId        || null,
        itemOtro:      itemSel?.codigo === 'OTRO' ? fpt.itemOtro.trim() : null,
        maquinariaId:  fpt.maquinariaId  || null,
        maquinariaOtro:maquinaria.find(m=>m.id===fpt.maquinariaId)?.codigo === 'OTRO' ? fpt.maquinariaOtro.trim() : null,
        descripcion:   fpt.descripcion.trim() || null,
        volumenM3:     fpt.volumenM3 ? parseFloat(fpt.volumenM3) : null,
      };

      let r;
      if (editPunto) {
        r = await api.put(`/actividad/${editPunto.id}`, payload);
      } else {
        r = await api.post('/actividad/punto', payload);
      }

      if (r.data.success) {
        showAlert(setAlertPt, 'success', editPunto ? '✅ Punto actualizado' : '✅ Punto registrado');
        resetFormPt();
        cargarPuntos();
      } else {
        showAlert(setAlertPt, 'error', r.data.message || 'Error al guardar');
      }
    } catch (e) {
      showAlert(setAlertPt, 'error', e.response?.data?.message || 'Error al conectar con el servidor');
    } finally { setSubmitPt(false); }
  };

  // ── Delete punto ───────────────────────────────────────────────────────────
  const handleDeletePunto = async (pt) => {
    if (!window.confirm(`¿Eliminar el punto "${pt.itemDisplay || pt.itemNombre || pt.categoria}"?`)) return;
    try {
      const r = await api.delete(`/actividad/${pt.id}`);
      if (r.data.success) {
        setPuntos(prev => prev.filter(x => x.id !== pt.id));
        showAlert(setAlertPt, 'success', '🗑️ Punto eliminado');
      } else {
        showAlert(setAlertPt, 'error', r.data.message || 'No se pudo eliminar');
      }
    } catch (e) {
      showAlert(setAlertPt, 'error', e.response?.data?.message || 'Error al eliminar');
    }
  };

  // ── Filtros ────────────────────────────────────────────────────────────────
  const paradasFiltradas = useMemo(() =>
    !busqP.trim() ? paradas : paradas.filter(p =>
      (p.motivoNombre || '').toLowerCase().includes(busqP.toLowerCase()) ||
      (p.dia || '').includes(busqP)
    ), [paradas, busqP]);

  const puntosFiltrados = useMemo(() =>
    puntos.filter(p => {
      const matchCat = !catFiltro || p.categoria === catFiltro;
      const q = busqPt.toLowerCase();
      const matchQ = !q ||
        (p.itemDisplay || p.itemNombre || '').toLowerCase().includes(q) ||
        (p.maquinariaNombre || '').toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q);
      return matchCat && matchQ;
    }), [puntos, catFiltro, busqPt]);

  const motiSel = motivos.find(m => m.id === fp.motivoId);
  const itemSel = items.find(i => i.id === fpt.itemId);
  const maqSel  = maquinaria.find(m => m.id === fpt.maquinariaId);

  const handleLogout = () => { authService.logout(); navigate('/'); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fop-container">

      {/* Header */}
      <header className="resumen-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo TU MINA"
                  width="50" height="50" style={{ borderRadius: '8px', objectFit: 'contain' }} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#4299e1', margin: 0 }}>TU MINA</h1>
                <p style={{ fontSize: 13, color: '#718096', margin: 0 }}>Desarrollado por CTGlobal</p>
              </div>
            </div>
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar"><User size={20} /></div>
                <div className="user-details">
                  <p className="user-name">{user?.nombre || 'Usuario'}</p>
                  <p className="user-role">{user?.rol || 'ROL'}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-logout"><LogOut size={18} /> Salir</button>
            </div>
          </div>
        </div>
      </header>

      <main className="fop-main">
        <div className="container">

          {/* Breadcrumb */}
          <div className="breadcrumb" style={{ marginBottom: 24 }}>
            <button onClick={() => navigate('/home')} className="breadcrumb-link">
              <ArrowLeft size={18} /> Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Formularios de Operación</span>
          </div>

          {/* Title */}
          <div className="page-title-section" style={{ marginBottom: 28 }}>
            <div className="page-title-icon" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
              <Plus size={40} />
            </div>
            <div>
              <h2 className="page-title">📋 Formularios de Operación</h2>
              <p className="page-subtitle">Registra, edita y elimina paradas y puntos de actividad</p>
            </div>
          </div>

          {/* Acceso rápido al Mapa */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => navigate('/mapa')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #06b6d4, #0369a1)',
                color: 'white', border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🗺️ Ver Mapa de Actividades
            </button>
          </div>

          {/* Tabs */}
          <div className="fop-tabs">
            <button
              className={`fop-tab ${tab === 'paradas' ? 'active-paradas' : ''}`}
              onClick={() => setTab('paradas')}
            >
              <AlertTriangle size={18} />
              Paradas
              <span className="fop-tab-count">{paradas.length}</span>
            </button>
            <button
              className={`fop-tab ${tab === 'puntos' ? 'active-puntos' : ''}`}
              onClick={() => setTab('puntos')}
            >
              <MapPin size={18} />
              Puntos
              <span className="fop-tab-count">{puntos.length}</span>
            </button>
          </div>

          {/* ════════════ TAB PARADAS ════════════ */}
          {tab === 'paradas' && (
            <div className="fop-layout">

              {/* Formulario paradas */}
              <div className="fop-form-card">
                <div className={`fop-form-header ${editParada ? 'edit-header' : 'paradas-header'}`}>
                  <AlertTriangle size={20} />
                  {editParada ? '✏️ Editar Paro' : '➕ Registrar Paro'}
                </div>
                <form className="fop-form-body" onSubmit={handleSubmitParada}>

                  {alertP && (
                    <div className={`fop-alert ${alertP.type}`}>{alertP.msg}</div>
                  )}

                  <div className="fop-field">
                    <label className="fop-label">Motivo <span>*</span></label>
                    <select
                      className="fop-select"
                      value={fp.motivoId}
                      onChange={e => setFp(p => ({ ...p, motivoId: e.target.value }))}
                      required
                    >
                      <option value="">— Seleccionar motivo —</option>
                      {motivos.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {motiSel?.codigo === 'OTRO' && (
                    <div className="fop-field">
                      <label className="fop-label">Describe el motivo <span>*</span></label>
                      <input
                        className="fop-input"
                        placeholder="Ej: Mantenimiento correctivo..."
                        value={fp.motivoOtro}
                        onChange={e => setFp(p => ({ ...p, motivoOtro: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="fop-row-2">
                    <div className="fop-field">
                      <label className="fop-label">Inicio <span>*</span></label>
                      <input
                        type="datetime-local"
                        className="fop-input"
                        value={fp.inicio}
                        onChange={e => setFp(p => ({ ...p, inicio: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="fop-field">
                      <label className="fop-label">Fin <span>*</span></label>
                      <input
                        type="datetime-local"
                        className="fop-input"
                        value={fp.fin}
                        onChange={e => setFp(p => ({ ...p, fin: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="fop-field">
                    <label className="fop-label">Observaciones</label>
                    <textarea
                      className="fop-textarea"
                      placeholder="Notas adicionales..."
                      value={fp.observaciones}
                      onChange={e => setFp(p => ({ ...p, observaciones: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    className={`fop-btn-submit ${editParada ? 'edit-submit' : 'paradas-submit'}`}
                    disabled={submitP}
                  >
                    {submitP
                      ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                      : editParada ? '💾 Guardar Cambios' : '🛑 Registrar Paro'
                    }
                  </button>

                  {editParada && (
                    <button type="button" className="fop-btn-cancel" onClick={resetFormP}>
                      Cancelar edición
                    </button>
                  )}
                </form>
              </div>

              {/* Lista paradas */}
              <div className="fop-list-card">
                <div className="fop-list-header">
                  <h3>
                    🛑 Historial de Paradas
                    <span style={{ fontWeight: 400, fontSize: 13, color: '#94a3b8' }}>
                      &nbsp;({paradasFiltradas.length})
                    </span>
                  </h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="fop-search"
                      placeholder="🔍 Buscar..."
                      value={busqP}
                      onChange={e => setBusqP(e.target.value)}
                    />
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 8 }}
                      onClick={cargarParadas} title="Recargar"
                    >
                      <RefreshCw size={18} style={{ animation: loadingP ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                  </div>
                </div>

                {loadingP ? (
                  <div className="fop-loading">
                    <div className="loading" /> Cargando paradas...
                  </div>
                ) : paradasFiltradas.length === 0 ? (
                  <div className="fop-empty">
                    <span>🛑</span>
                    <p>{busqP ? 'Sin resultados' : 'No hay paradas registradas'}</p>
                  </div>
                ) : (
                  <div className="fop-table-wrap">
                    <table className="fop-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Motivo</th>
                          <th>Inicio</th>
                          <th>Fin</th>
                          <th>Duración</th>
                          <th>Observación</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paradasFiltradas.map(p => {
                          const hoy = esHoy(p.dia);
                          return (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 600 }}>{toDMY(p.dia)}</td>
                              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.motivoNombre || p.motivoCodigo || '—'}
                              </td>
                              <td style={{ fontFamily: 'monospace' }}>{toHHMM(p.inicio)}</td>
                              <td style={{ fontFamily: 'monospace' }}>{toHHMM(p.fin)}</td>
                              <td>
                                {p.minutesParo != null
                                  ? <span className="fop-dur-pill">⏱️ {p.minutesParo} min</span>
                                  : '—'}
                              </td>
                              <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b' }}>
                                {p.observaciones || '—'}
                              </td>
                              <td>
                                {hoy ? (
                                  <div className="fop-actions">
                                    <button
                                      className="fop-action-btn fop-edit-btn"
                                      title="Editar"
                                      onClick={() => startEditParada(p)}
                                    >✏️</button>
                                    <button
                                      className="fop-action-btn fop-del-btn"
                                      title="Eliminar"
                                      onClick={() => handleDeleteParada(p)}
                                    >🗑️</button>
                                  </div>
                                ) : (
                                  <span className="fop-locked">🔒 Solo hoy</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════ TAB PUNTOS ════════════ */}
          {tab === 'puntos' && (
            <div className="fop-layout">

              {/* Formulario puntos */}
              <div className="fop-form-card">
                <div className={`fop-form-header ${editPunto ? 'edit-header' : 'puntos-header'}`}>
                  <MapPin size={20} />
                  {editPunto ? '✏️ Editar Punto' : '➕ Registrar Punto'}
                </div>
                <form className="fop-form-body" onSubmit={handleSubmitPunto}>

                  {alertPt && (
                    <div className={`fop-alert ${alertPt.type}`}>{alertPt.msg}</div>
                  )}

                  {/* Categoría */}
                  <div className="fop-field">
                    <label className="fop-label">Categoría <span>*</span></label>
                    <div className="cat-grid">
                      {CATEGORIAS.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`cat-btn ${fpt.categoria === cat.id ? `cat-active-${cat.id}` : ''}`}
                          onClick={() => setFpt(p => ({ ...p, categoria: cat.id, itemId: '', itemOtro: '' }))}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ítem */}
                  {fpt.categoria && (
                    <div className="fop-field">
                      <label className="fop-label">
                        Ítem · {CAT_LABELS[fpt.categoria]} <span>*</span>
                      </label>
                      <select
                        className="fop-select"
                        value={fpt.itemId}
                        onChange={e => setFpt(p => ({ ...p, itemId: e.target.value, itemOtro: '' }))}
                        disabled={loadingItems}
                      >
                        <option value="">— {loadingItems ? 'Cargando...' : 'Seleccionar ítem'} —</option>
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.nombre}</option>
                        ))}
                      </select>
                      {itemSel?.codigo === 'OTRO' && (
                        <input
                          className="fop-input"
                          style={{ marginTop: 8 }}
                          placeholder="Describe el ítem..."
                          value={fpt.itemOtro}
                          onChange={e => setFpt(p => ({ ...p, itemOtro: e.target.value }))}
                        />
                      )}
                    </div>
                  )}

                  {/* Maquinaria */}
                  <div className="fop-field">
                    <label className="fop-label">🚜 Maquinaria</label>
                    <select
                      className="fop-select"
                      value={fpt.maquinariaId}
                      onChange={e => setFpt(p => ({ ...p, maquinariaId: e.target.value, maquinariaOtro: '' }))}
                    >
                      <option value="">— Sin maquinaria —</option>
                      {maquinaria.map(m => (
                        <option key={m.id} value={m.id}>{m.display || m.nombre}</option>
                      ))}
                    </select>
                    {maqSel?.codigo === 'OTRO' && (
                      <input
                        className="fop-input"
                        style={{ marginTop: 8 }}
                        placeholder="Describe la maquinaria..."
                        value={fpt.maquinariaOtro}
                        onChange={e => setFpt(p => ({ ...p, maquinariaOtro: e.target.value }))}
                      />
                    )}
                  </div>

                  {/* Coordenadas */}
                  <div className="fop-field">
                    <label className="fop-label">📍 Coordenadas <span>*</span></label>
                    <input
                      className="fop-input"
                      placeholder="Latitud (ej: 5.0689)"
                      value={fpt.latitud}
                      onChange={e => setFpt(p => ({ ...p, latitud: e.target.value }))}
                      style={{ marginBottom: 8 }}
                    />
                    <input
                      className="fop-input"
                      placeholder="Longitud (ej: -75.5174)"
                      value={fpt.longitud}
                      onChange={e => setFpt(p => ({ ...p, longitud: e.target.value }))}
                    />
                    <div className="fop-gps-buttons">
                      <button type="button" className="fop-gps-btn" onClick={handleGPS}>
                        📡 Usar GPS
                      </button>
                      <button
                        type="button"
                        className="fop-map-open-btn"
                        onClick={() => { setMapTempCoords(null); setMapModalOpen(true); }}
                        disabled={!fpt.latitud || !fpt.longitud}
                        title={!fpt.latitud || !fpt.longitud ? 'Ingresa coordenadas primero' : 'Ver en mapa'}
                      >
                        🗺️ Ver en mapa
                      </button>
                    </div>
                  </div>

                  <div className="fop-row-2">
                    <div className="fop-field">
                      <label className="fop-label">Volumen (m³)</label>
                      <input
                        className="fop-input"
                        type="number"
                        step="0.01"
                        placeholder="Ej: 12.5"
                        value={fpt.volumenM3}
                        onChange={e => setFpt(p => ({ ...p, volumenM3: e.target.value }))}
                      />
                    </div>
                    <div className="fop-field">
                      <label className="fop-label">Descripción</label>
                      <input
                        className="fop-input"
                        placeholder="Observaciones..."
                        value={fpt.descripcion}
                        onChange={e => setFpt(p => ({ ...p, descripcion: e.target.value }))}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`fop-btn-submit ${editPunto ? 'edit-submit' : 'puntos-submit'}`}
                    disabled={submitPt}
                  >
                    {submitPt
                      ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                      : editPunto ? '💾 Guardar Cambios' : '📍 Registrar Punto'
                    }
                  </button>

                  {editPunto && (
                    <button type="button" className="fop-btn-cancel" onClick={resetFormPt}>
                      Cancelar edición
                    </button>
                  )}
                </form>

                {/* ── Mini-mapa modal de confirmación ── */}
                {mapModalOpen && fpt.latitud && fpt.longitud && (() => {
                  // Display coords: use temp (dragged) or original
                  const dispLat = mapTempCoords?.lat ?? parseFloat(fpt.latitud);
                  const dispLng = mapTempCoords?.lng ?? parseFloat(fpt.longitud);
                  const initCenter = [parseFloat(fpt.latitud), parseFloat(fpt.longitud)];
                  const markerPos = [dispLat, dispLng];

                  const handleConfirm = () => {
                    if (mapTempCoords) {
                      setFpt(p => ({
                        ...p,
                        latitud:  String(mapTempCoords.lat.toFixed(8)),
                        longitud: String(mapTempCoords.lng.toFixed(8)),
                      }));
                    }
                    setMapTempCoords(null);
                    setMapModalOpen(false);
                  };

                  const handleCancel = () => {
                    setMapTempCoords(null);
                    setMapModalOpen(false);
                  };

                  return (
                    <div className="fop-map-modal-overlay" onClick={handleCancel}>
                      <div className="fop-map-modal" onClick={e => e.stopPropagation()}>
                        <div className="fop-map-modal-header">
                          <h4>🗺️ Ajustar Ubicación</h4>
                          <button className="fop-map-modal-close" onClick={handleCancel}>✕</button>
                        </div>

                        {/* Live coords bar */}
                        <div className="fop-map-modal-coords">
                          📍 Lat: {dispLat.toFixed(6)}&nbsp;&nbsp;|&nbsp;&nbsp;
                          Lng: {dispLng.toFixed(6)}
                          {mapTempCoords && (
                            <span style={{ marginLeft: 10, color: '#f39c12', fontWeight: 800 }}>● ajustado</span>
                          )}
                        </div>

                        {/* Hint */}
                        <div style={{
                          padding: '8px 22px', background: '#fffbeb',
                          fontSize: 12, color: '#92400e', borderBottom: '1px solid #fde68a',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          ✋ <strong>Arrastra el pin</strong> o <strong>haz clic</strong> en el mapa para mover la ubicación
                        </div>

                        <div className="fop-map-modal-body">
                          <MapContainer
                            center={initCenter}
                            zoom={16}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              attribution='Tiles &copy; Esri'
                              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                              maxZoom={19}
                            />
                            <DraggableMarker
                              position={markerPos}
                              onMove={(lat, lng) => setMapTempCoords({ lat, lng })}
                            />
                          </MapContainer>
                        </div>

                        <div className="fop-map-modal-footer">
                          <button className="fop-map-cancel-btn" onClick={handleCancel}>
                            Cancelar
                          </button>
                          <button className="fop-map-confirm-btn" onClick={handleConfirm}>
                            ✅ Confirmar ubicación
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Lista puntos */}
              <div className="fop-list-card">
                <div className="fop-list-header">
                  <h3>
                    📍 Historial de Puntos
                    <span style={{ fontWeight: 400, fontSize: 13, color: '#94a3b8' }}>
                      &nbsp;({puntosFiltrados.length})
                    </span>
                  </h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="fop-search"
                      placeholder="🔍 Buscar..."
                      value={busqPt}
                      onChange={e => setBusqPt(e.target.value)}
                    />
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 8 }}
                      onClick={cargarPuntos} title="Recargar"
                    >
                      <RefreshCw size={18} style={{ animation: loadingPt ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                  </div>
                </div>

                {/* Filtros categoría */}
                <div className="fop-cat-filters">
                  {[['', 'Todos'], ...CATEGORIAS.map(c => [c.id, c.label])].map(([id, label]) => (
                    <button
                      key={id}
                      className={`fop-cat-chip ${id === '' ? 'chip-all' : `chip-${id}`} ${catFiltro === id ? 'chip-active' : ''}`}
                      onClick={() => setCatFiltro(id)}
                    >
                      {label} ({id === '' ? puntos.length : puntos.filter(p => p.categoria === id).length})
                    </button>
                  ))}
                </div>

                {loadingPt ? (
                  <div className="fop-loading">
                    <div className="loading" /> Cargando puntos...
                  </div>
                ) : puntosFiltrados.length === 0 ? (
                  <div className="fop-empty">
                    <span>📍</span>
                    <p>{busqPt || catFiltro ? 'Sin resultados' : 'No hay puntos registrados'}</p>
                  </div>
                ) : (
                  <div className="fop-table-wrap">
                    <table className="fop-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Categoría</th>
                          <th>Ítem</th>
                          <th>Maquinaria</th>
                          <th>Vol m³</th>
                          <th>Coords</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {puntosFiltrados.map(pt => {
                          const hoy = esHoy(pt.dia);
                          return (
                            <tr key={pt.id}>
                              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                {toDMY(pt.dia)}&nbsp;{toHHMM(pt.fecha)}
                              </td>
                              <td>
                                <span className={`fop-cat-badge ${pt.categoria}`}>
                                  {CAT_LABELS[pt.categoria] || pt.categoria}
                                </span>
                              </td>
                              <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                                {pt.itemDisplay || pt.itemNombre || '—'}
                              </td>
                              <td style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b' }}>
                                {pt.maquinariaNombre || '—'}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                {pt.volumenM3 != null ? Number(pt.volumenM3).toFixed(1) : '—'}
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
                                {pt.latitud && pt.longitud
                                  ? `${parseFloat(pt.latitud).toFixed(4)}, ${parseFloat(pt.longitud).toFixed(4)}`
                                  : '—'}
                              </td>
                              <td>
                                {hoy ? (
                                  <div className="fop-actions">
                                    <button
                                      className="fop-action-btn fop-edit-btn"
                                      title="Editar"
                                      onClick={() => startEditPunto(pt)}
                                    >✏️</button>
                                    <button
                                      className="fop-action-btn fop-del-btn"
                                      title="Eliminar"
                                      onClick={() => handleDeletePunto(pt)}
                                    >🗑️</button>
                                  </div>
                                ) : (
                                  <span className="fop-locked">🔒 Solo hoy</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default FormulariosOperacion;
