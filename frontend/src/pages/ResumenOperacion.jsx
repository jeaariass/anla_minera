// src/pages/ResumenOperacion.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import api from '../services/api';
import {
  ArrowLeft, User, LogOut, RefreshCw,
  Activity, Clock, MapPin, Truck,
  AlertTriangle, Layers
} from 'lucide-react';
import './ResumenOperacion.css';
import './Reportes.css';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIA_META = {
  extraccion:    { label: '⛏️ Extracción',    color: '#e74c3c', cls: 'cat-extraccion' },
  acopio:        { label: '📦 Acopio',         color: '#3498db', cls: 'cat-acopio' },
  procesamiento: { label: '⚙️ Procesamiento',  color: '#f39c12', cls: 'cat-procesamiento' },
  inspeccion:    { label: '🔍 Inspección',      color: '#27ae60', cls: 'cat-inspeccion' },
};

/** Extrae "HH:MM" de un string "YYYY-MM-DDTHH:MM:SS" sin conversión de zona */
const toHHMM = (iso) => {
  if (!iso) return '—';
  const m = String(iso).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : String(iso).slice(0, 16);
};

/** Formatea "YYYY-MM-DDTHH:MM:SS" → "DD/MM/YYYY  HH:MM" */
const toFechaHora = (iso) => {
  if (!iso) return '—';
  const s = String(iso);
  const [fecha, hora] = s.split('T');
  if (!fecha) return s;
  const [y, mo, d] = fecha.split('-');
  return `${d}/${mo}/${y}  ${(hora || '').slice(0, 5)}`;
};

const pluralMin = (n) => `${n} min${n !== 1 ? '' : ''}`;

// ─── Componente principal ─────────────────────────────────────────────────────

const ResumenOperacion = () => {
  const navigate    = useNavigate();
  const [user]      = useState(authService.getCurrentUser());

  // El tituloMineroId viene del usuario o fallback al de la mina de prueba
  const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId || 'titulo-816-17';

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab]             = useState('paradas'); // 'paradas' | 'puntos'

  // Paradas
  const [paradas, setParadas]     = useState([]);
  const [loadingP, setLoadingP]   = useState(true);
  const [errorP, setErrorP]       = useState('');
  const [busqP, setBusqP]         = useState('');

  // Puntos
  const [puntos, setPuntos]       = useState([]);
  const [loadingPt, setLoadingPt] = useState(true);
  const [errorPt, setErrorPt]     = useState('');
  const [busqPt, setBusqPt]       = useState('');
  const [catFiltro, setCatFiltro] = useState('');

  // ── Carga de datos ─────────────────────────────────────────────────────────
  useEffect(() => { cargarParadas(); cargarPuntos(); }, []);

  const cargarParadas = async () => {
    try {
      setLoadingP(true); setErrorP('');
      const res = await api.get(`/paradas/${tituloMineroId}`);
      if (res.data.success) setParadas(res.data.data ?? []);
      else setErrorP(res.data.message || 'Error al cargar paradas');
    } catch (e) {
      setErrorP('No se pudo conectar con el servidor');
    } finally { setLoadingP(false); }
  };

  const cargarPuntos = async () => {
    try {
      setLoadingPt(true); setErrorPt('');
      const res = await api.get(`/actividad/puntos/${tituloMineroId}`);
      if (res.data.success) setPuntos(res.data.data ?? []);
      else setErrorPt(res.data.message || 'Error al cargar puntos');
    } catch (e) {
      setErrorPt('No se pudo conectar con el servidor');
    } finally { setLoadingPt(false); }
  };

  // ── Filtros memo ───────────────────────────────────────────────────────────
  const paradasFiltradas = useMemo(() => {
    if (!busqP.trim()) return paradas;
    const q = busqP.toLowerCase();
    return paradas.filter(p =>
      (p.motivoNombre || p.motivoCodigo || '').toLowerCase().includes(q) ||
      (p.dia || '').includes(q)
    );
  }, [paradas, busqP]);

  const puntosFiltrados = useMemo(() => {
    return puntos.filter(p => {
      const matchCat = !catFiltro || p.categoria === catFiltro;
      const matchQ   = !busqPt.trim() ||
        (p.itemDisplay || p.itemNombre || '').toLowerCase().includes(busqPt.toLowerCase()) ||
        (p.maquinariaNombre || '').toLowerCase().includes(busqPt.toLowerCase()) ||
        (p.descripcion || '').toLowerCase().includes(busqPt.toLowerCase()) ||
        (p.categoria || '').toLowerCase().includes(busqPt.toLowerCase());
      return matchCat && matchQ;
    });
  }, [puntos, catFiltro, busqPt]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalMinutos = paradas.reduce((acc, p) => acc + (Number(p.minutesParo) || 0), 0);
  const horas        = Math.floor(totalMinutos / 60);
  const minRest      = totalMinutos % 60;
  const durText      = horas > 0 ? `${horas}h ${minRest}m` : `${minRest} min`;

  const countCat = (cat) => puntos.filter(p => p.categoria === cat).length;
  const volTotal  = puntos.reduce((acc, p) => acc + (Number(p.volumenM3) || 0), 0);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleLogout = () => { authService.logout(); navigate('/'); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="resumen-container">

      {/* ── Header ── */}
      <header className="resumen-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt="Logo TU MINA" width="50" height="50"
                  style={{ borderRadius: '8px', objectFit: 'contain' }}
                />
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
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="resumen-main">
        <div className="container">

          {/* Breadcrumb */}
          <div className="breadcrumb" style={{ marginBottom: 24 }}>
            <button onClick={() => navigate('/home')} className="breadcrumb-link">
              <ArrowLeft size={18} /> Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Resumen Operación</span>
          </div>

          {/* Page title */}
          <div className="page-title-section" style={{ marginBottom: 28 }}>
            <div className="page-title-icon">
              <Activity size={40} />
            </div>
            <div>
              <h2 className="page-title">⚙️ Resumen de Operación</h2>
              <p className="page-subtitle">Paradas de actividad y puntos georeferenciados registrados desde la app móvil</p>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="tabs-bar">
            <button
              className={`tab-btn tab-paradas ${tab === 'paradas' ? 'active' : ''}`}
              onClick={() => setTab('paradas')}
            >
              <AlertTriangle size={18} />
              Paradas de Actividad
              <span style={{
                marginLeft: 4, background: tab === 'paradas' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                color: tab === 'paradas' ? 'white' : '#475569',
                borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 800,
              }}>
                {paradas.length}
              </span>
            </button>
            <button
              className={`tab-btn tab-puntos ${tab === 'puntos' ? 'active' : ''}`}
              onClick={() => setTab('puntos')}
            >
              <MapPin size={18} />
              Puntos de Actividad
              <span style={{
                marginLeft: 4, background: tab === 'puntos' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                color: tab === 'puntos' ? 'white' : '#475569',
                borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 800,
              }}>
                {puntos.length}
              </span>
            </button>
          </div>

          {/* ════════════════════════════════════
               TAB PARADAS
          ════════════════════════════════════ */}
          {tab === 'paradas' && (
            <>
              {/* KPIs paradas */}
              <div className="kpi-grid">
                <div className="kpi-card-op" style={{ borderLeftColor: '#e74c3c' }}>
                  <span className="kpi-emoji">🛑</span>
                  <div className="kpi-data">
                    <h4>Total Paradas</h4>
                    <p>{paradas.length}</p>
                    <small>registradas en historial</small>
                  </div>
                </div>
                <div className="kpi-card-op" style={{ borderLeftColor: '#f39c12' }}>
                  <span className="kpi-emoji">⏱️</span>
                  <div className="kpi-data">
                    <h4>Tiempo Total Parado</h4>
                    <p style={{ fontSize: 24 }}>{durText}</p>
                    <small>{totalMinutos} minutos acumulados</small>
                  </div>
                </div>
                <div className="kpi-card-op" style={{ borderLeftColor: '#3b82f6' }}>
                  <span className="kpi-emoji">📅</span>
                  <div className="kpi-data">
                    <h4>Promedio por Paro</h4>
                    <p style={{ fontSize: 24 }}>
                      {paradas.length > 0 ? Math.round(totalMinutos / paradas.length) : 0} min
                    </p>
                    <small>duración promedio</small>
                  </div>
                </div>
                <div className="kpi-card-op" style={{ borderLeftColor: '#10b981' }}>
                  <span className="kpi-emoji">📋</span>
                  <div className="kpi-data">
                    <h4>Mostrando</h4>
                    <p>{paradasFiltradas.length}</p>
                    <small>de {paradas.length} registros</small>
                  </div>
                </div>
              </div>

              {/* Header sección */}
              <div className="section-header">
                <div>
                  <h2>🛑 Historial de Paradas</h2>
                  <p>Paros registrados desde la app móvil — ordenados por fecha más reciente</p>
                </div>
                <button className="refresh-btn" onClick={cargarParadas} disabled={loadingP}>
                  <RefreshCw size={16} style={{ animation: loadingP ? 'spin 1s linear infinite' : 'none' }} />
                  {loadingP ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>

              {/* Búsqueda */}
              <div className="filters-row">
                <input
                  className="search-input"
                  placeholder="🔍 Buscar por motivo o fecha..."
                  value={busqP}
                  onChange={e => setBusqP(e.target.value)}
                  style={{ marginLeft: 0 }}
                />
              </div>

              {/* Tabla paradas */}
              {errorP ? (
                <div className="alert alert-error" style={{ marginBottom: 20 }}>
                  <AlertTriangle size={18} /> {errorP}
                </div>
              ) : loadingP ? (
                <div className="loading-op">
                  <div className="loading" />
                  <p>Cargando paradas...</p>
                </div>
              ) : (
                <div className="table-card">
                  {paradasFiltradas.length === 0 ? (
                    <div className="empty-op">
                      <span>🛑</span>
                      <p>{busqP ? 'No hay resultados para tu búsqueda' : 'No hay paradas registradas'}</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="op-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Fecha</th>
                            <th>Motivo</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                            <th>Duración</th>
                            <th>Observación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paradasFiltradas.map((p, i) => (
                            <tr key={p.id}>
                              <td style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>
                                {p.dia ? String(p.dia).split('T')[0].split('-').reverse().join('/') : '—'}
                              </td>
                              <td>
                                <span className="motivo-badge" title={p.motivoNombre}>
                                  {p.motivoDisplay || p.motivoNombre || p.motivoCodigo || '—'}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                {toHHMM(p.inicio)}
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                {toHHMM(p.fin)}
                              </td>
                              <td>
                                {p.minutesParo != null ? (
                                  <span className="duracion-pill">
                                    ⏱️ {pluralMin(Number(p.minutesParo))}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ color: '#64748b', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.observaciones || <span style={{ color: '#cbd5e1' }}>—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════
               TAB PUNTOS
          ════════════════════════════════════ */}
          {tab === 'puntos' && (
            <>
              {/* KPIs puntos */}
              <div className="kpi-grid">
                <div className="kpi-card-op" style={{ borderLeftColor: '#2563eb' }}>
                  <span className="kpi-emoji">📍</span>
                  <div className="kpi-data">
                    <h4>Total Puntos</h4>
                    <p>{puntos.length}</p>
                    <small>georeferenciados</small>
                  </div>
                </div>
                <div className="kpi-card-op" style={{ borderLeftColor: '#f39c12' }}>
                  <span className="kpi-emoji">📊</span>
                  <div className="kpi-data">
                    <h4>Volumen Total</h4>
                    <p style={{ fontSize: 24 }}>{volTotal.toFixed(1)}</p>
                    <small>m³ registrados</small>
                  </div>
                </div>
                <div className="kpi-card-op" style={{ borderLeftColor: '#e74c3c' }}>
                  <span className="kpi-emoji">⛏️</span>
                  <div className="kpi-data">
                    <h4>Extracción</h4>
                    <p>{countCat('extraccion')}</p>
                    <small>puntos</small>
                  </div>
                </div>
                <div className="kpi-card-op" style={{ borderLeftColor: '#3498db' }}>
                  <span className="kpi-emoji">📦</span>
                  <div className="kpi-data">
                    <h4>Acopio</h4>
                    <p>{countCat('acopio')}</p>
                    <small>puntos</small>
                  </div>
                </div>
                <div className="kpi-card-op" style={{ borderLeftColor: '#27ae60' }}>
                  <span className="kpi-emoji">🔍</span>
                  <div className="kpi-data">
                    <h4>Inspección</h4>
                    <p>{countCat('inspeccion')}</p>
                    <small>puntos</small>
                  </div>
                </div>
                <div className="kpi-card-op" style={{ borderLeftColor: '#f39c12' }}>
                  <span className="kpi-emoji">⚙️</span>
                  <div className="kpi-data">
                    <h4>Procesamiento</h4>
                    <p>{countCat('procesamiento')}</p>
                    <small>puntos</small>
                  </div>
                </div>
              </div>

              {/* Header sección */}
              <div className="section-header">
                <div>
                  <h2>📍 Historial de Puntos de Actividad</h2>
                  <p>Puntos georeferenciados registrados desde la app móvil</p>
                </div>
                <button className="refresh-btn" onClick={cargarPuntos} disabled={loadingPt}>
                  <RefreshCw size={16} style={{ animation: loadingPt ? 'spin 1s linear infinite' : 'none' }} />
                  {loadingPt ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>

              {/* Filtros categoría + búsqueda */}
              <div className="filters-row">
                <button
                  className={`filter-chip ${!catFiltro ? 'active-all' : ''}`}
                  onClick={() => setCatFiltro('')}
                >
                  Todos ({puntos.length})
                </button>
                {Object.entries(CATEGORIA_META).map(([key, meta]) => (
                  <button
                    key={key}
                    className={`filter-chip ${catFiltro === key ? `active-${key}` : ''}`}
                    onClick={() => setCatFiltro(key)}
                  >
                    {meta.label} ({countCat(key)})
                  </button>
                ))}
                <input
                  className="search-input"
                  placeholder="🔍 Buscar por ítem, maquinaria..."
                  value={busqPt}
                  onChange={e => setBusqPt(e.target.value)}
                />
              </div>

              {/* Tabla puntos */}
              {errorPt ? (
                <div className="alert alert-error" style={{ marginBottom: 20 }}>
                  <AlertTriangle size={18} /> {errorPt}
                </div>
              ) : loadingPt ? (
                <div className="loading-op">
                  <div className="loading" />
                  <p>Cargando puntos...</p>
                </div>
              ) : (
                <div className="table-card">
                  {puntosFiltrados.length === 0 ? (
                    <div className="empty-op">
                      <span>📍</span>
                      <p>{busqPt || catFiltro ? 'No hay resultados para tu búsqueda' : 'No hay puntos registrados'}</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="op-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Fecha y Hora</th>
                            <th>Categoría</th>
                            <th>Ítem</th>
                            <th>Maquinaria</th>
                            <th>Volumen (m³)</th>
                            <th>Coordenadas</th>
                            <th>Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {puntosFiltrados.map((p, i) => {
                            const meta = CATEGORIA_META[p.categoria];
                            return (
                              <tr key={p.id}>
                                <td style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                  {toFechaHora(p.fecha)}
                                </td>
                                <td>
                                  {meta ? (
                                    <span className={`cat-badge ${meta.cls}`}>{meta.label}</span>
                                  ) : (
                                    <span style={{ color: '#94a3b8' }}>{p.categoria || '—'}</span>
                                  )}
                                </td>
                                <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                                  {p.itemDisplay || p.itemNombre || <span style={{ color: '#cbd5e1' }}>—</span>}
                                </td>
                                <td>
                                  {p.maquinariaNombre ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <Truck size={13} color="#94a3b8" />
                                      {p.maquinariaNombre}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#cbd5e1' }}>—</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {p.volumenM3 != null ? (
                                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{Number(p.volumenM3).toFixed(2)}</span>
                                  ) : (
                                    <span style={{ color: '#cbd5e1' }}>—</span>
                                  )}
                                </td>
                                <td style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                                  {p.latitud && p.longitud
                                    ? `${parseFloat(p.latitud).toFixed(5)}, ${parseFloat(p.longitud).toFixed(5)}`
                                    : '—'}
                                </td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b' }}>
                                  {p.descripcion || <span style={{ color: '#cbd5e1' }}>—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default ResumenOperacion;
