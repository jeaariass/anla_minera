import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService, reportService, usuarioService } from "../services/api";
import SelectorTitulo from "../components/SelectorTitulo";
import { useTituloActivo } from "../context/TituloContext";
import {
  ArrowLeft, Download, Eye, FileSpreadsheet,
  Calendar, Filter, AlertCircle, CheckCircle,
  User, LogOut, X, RefreshCw,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import './Reportes.css';


// ── Ordenamiento ────────────────────────────────────────────
const ordenar = (datos, col, dir) => {
  if (!col) return datos;
  return [...datos].sort((a, b) => {
    const va = a[col] ?? '';
    const vb = b[col] ?? '';
    if (va < vb) return dir === 'asc' ? -1 :  1;
    if (va > vb) return dir === 'asc' ?  1 : -1;
    return 0;
  });
};

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={12} style={{ opacity: 0.35, marginLeft: 3, verticalAlign: 'middle' }} />;
  return sortDir === 'asc'
    ? <ChevronUp   size={12} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
    : <ChevronDown size={12} style={{ marginLeft: 3, verticalAlign: 'middle' }} />;
};

const TablaReporte = ({ columnas, datos, renderCell, maxRows = 200 }) => {
  const [sortCol, setSortCol] = React.useState(columnas[0]?.key || '');
  const [sortDir, setSortDir] = React.useState('asc');
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };
  const sorted = React.useMemo(() => ordenar(datos, sortCol, sortDir), [datos, sortCol, sortDir]);
  return (
    <div className="tabla-wrapper">
      <table className="tabla-reporte">
        <thead>
          <tr>
            {columnas.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)}
                style={{ cursor: 'pointer', userSelect: 'none' }}>
                {col.label}
                <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, maxRows).map((row, i) => (
            <tr key={i}>
              {columnas.map(col => (
                <td key={col.key}>{renderCell(row, col.key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {datos.length > maxRows && (
        <div className="tabla-info">
          Mostrando {maxRows} de {datos.length} registros. Exporta a Excel para ver todos.
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Reportes
// ════════════════════════════════════════════════════════════════
const Reportes = () => {
  const navigate = useNavigate();
  const [user]   = useState(authService.getCurrentUser());
  const { tituloActivoId } = useTituloActivo();

  // ── Filtros (todos los que acepta el backend) ─────────────────
  const [filtros, setFiltros] = useState({
    tipo:           'produccion',
    fechaInicio:    '',
    fechaFin:       '',
    usuarioId:      '',   // solo ADMIN
    estado:         '',
    tituloMineroId: '',
    mineral:        '',
  });

  // ── Lista de usuarios — solo visible para ADMIN ───────────────
  // CORRECCIÓN: el código anterior usaba fetch() manual sin token.
  // Ahora usa la instancia `api` de axios que inyecta el token
  // automáticamente vía el interceptor de request.
  const [usuarios, setUsuarios] = useState([]);
  useEffect(() => {
    if (user?.rol !== 'ADMIN') return;
    usuarioService.getAll()
      .then(r => { if (r.data?.success) setUsuarios(r.data.usuarios || []); })
      .catch(e => console.error('Error cargando usuarios:', e));
  }, [user]);

  // Cuando el ADMIN cambia de título → actualizar filtro y recargar datos
  useEffect(() => {
    if (!tituloActivoId) return;
    setFiltros(prev => ({ ...prev, tituloMineroId: tituloActivoId }));
  }, [tituloActivoId]);

  // ── Estado de vista previa ─────────────────────────────────────
  const [preview, setPreview] = useState({ visible: false, columnas: [], registros: [], creadoPor: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // ── Función de carga de datos ──────────────────────────────────
  const cargarPreview = useCallback(async (f) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await reportService.getPreview(f);
      if (res.data.success) {
        setPreview({
          visible:   true,
          columnas:  res.data.columnas,
          registros: res.data.registros,
          creadoPor: res.data.creadoPor || [],
          total:     res.data.total,
        });
        if (res.data.total === 0)
          setError('Sin registros para los filtros aplicados');
        else
          setSuccess(`✓ ${res.data.total} registro${res.data.total !== 1 ? 's' : ''} encontrado${res.data.total !== 1 ? 's' : ''}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
      setPreview({ visible: false, columnas: [], registros: [], creadoPor: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  // ── AUTO-UPDATE ────────────────────────────────────────────────
  // Cada vez que cambia cualquier filtro → recarga con debounce de 500ms.
  // El debounce evita llamadas explosivas mientras se escribe una fecha.
  // Analogía: es como un cronómetro que se reinicia cada vez que tocas
  // algo — solo ejecuta la búsqueda cuando dejas de cambiar cosas.
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // No buscar si solo hay una de las dos fechas (rango incompleto)
      if ((filtros.fechaInicio && !filtros.fechaFin) ||
          (!filtros.fechaInicio && filtros.fechaFin)) return;
      cargarPreview(filtros);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [filtros, cargarPreview]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  // Setter para las fechas del DatePicker (recibe ISO string directo)
  const setFecha = (campo) => (iso) => setFiltros(prev => ({ ...prev, [campo]: iso }));

  // CORRECCIÓN: limpiar ahora resetea TODOS los campos, no solo tipo y fecha
  const limpiarFiltros = () => {
    setFiltros({ tipo: 'produccion', fechaInicio: '', fechaFin: '', usuarioId: '', estado: '', tituloMineroId: '', mineral: '' });
    setPreview({ visible: false, columnas: [], registros: [], creadoPor: [], total: 0 });
    setError('');
    setSuccess('');
  };

  // ── Exportar Excel ─────────────────────────────────────────────
  const handleExportar = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await reportService.exportarExcel(filtros);
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const nombre = `FRI_${filtros.tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
      Object.assign(a, { href: url, download: nombre });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setSuccess(`✓ "${nombre}" descargado`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al exportar Excel');
    } finally { setLoading(false); }
  };

  // ── Exportar PDF ───────────────────────────────────────────────
  const handleExportarPdf = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await reportService.exportarPdf(filtros);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const nombre = `FRI_${filtros.tipo}_${new Date().toISOString().split('T')[0]}.pdf`;
      Object.assign(a, { href: url, download: nombre });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setSuccess(`✓ "${nombre}" descargado`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al exportar PDF');
    } finally { setLoading(false); }
  };

  const handleLogout = () => { authService.logout(); navigate('/'); };

  const tiposFormularios = [
    { value: 'produccion',  label: 'Producción'  },
    { value: 'inventarios', label: 'Inventarios' },
    { value: 'paradas',     label: 'Paradas'     },
    { value: 'ejecucion',   label: 'Ejecución'   },
    { value: 'maquinaria',  label: 'Maquinaria'  },
    { value: 'regalias',    label: 'Regalías'    },
  ];

  // Contador de filtros activos (para badge en el header de la card)
  const filtrosActivos = [
    filtros.fechaInicio, filtros.fechaFin,
    filtros.usuarioId, filtros.estado, filtros.mineral,
  ].filter(Boolean).length;

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="reportes-container">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="reportes-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt="Logo TU MINA"
                  width="50" height="50"
                  style={{ borderRadius: '8px', objectFit: 'contain' }}
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
              <SelectorTitulo />
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="reportes-main">
        <div className="container">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button onClick={() => navigate('/home')} className="breadcrumb-link">
              <ArrowLeft size={18} /> Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Exportar Reportes</span>
          </div>

          {/* Título */}
          <div className="page-title-section">
            <div className="page-title-icon">
              <FileSpreadsheet size={40} />
            </div>
            <div>
              <h2 className="page-title">📥 Exportar Reportes ANM</h2>
              <p className="page-subtitle">
                La vista previa se actualiza automáticamente al cambiar filtros
              </p>
            </div>
          </div>

          {/* Alertas */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} /> {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <CheckCircle size={20} /> {success}
            </div>
          )}

          {/* ── Card de Filtros ────────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <Filter size={24} />
              <h3>Filtros de Exportación</h3>

              {/* Badge muestra cuántos filtros están activos */}
              {filtrosActivos > 0 && (
                <span className="badge-filtros">
                  {filtrosActivos} activo{filtrosActivos > 1 ? 's' : ''}
                </span>
              )}

              {/* Spinner inline cuando recarga los datos */}
              {loading && (
                <span className="loading-inline">
                  <RefreshCw size={14} className="icon-spin" /> Actualizando…
                </span>
              )}
            </div>

            <div className="card-body">
              {/* ── Grid de filtros ─────────────────────────────
                  CORRECCIÓN: el select de Usuario estaba anidado
                  DENTRO del form-group de Tipo, rompiendo el layout.
                  Ahora cada filtro es su propio form-group hermano.
              ─────────────────────────────────────────────────── */}
              <div className="form-grid">

                {/* Tipo de formulario */}
                <div className="form-group">
                  <label><FileSpreadsheet size={16} /> Tipo de Formulario</label>
                  <select
                    name="tipo"
                    value={filtros.tipo}
                    onChange={handleFiltroChange}
                    className="form-control"
                    disabled={loading}
                  >
                    {tiposFormularios.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Usuario — solo visible para ADMIN */}
                {user?.rol === 'ADMIN' && (
                  <div className="form-group">
                    <label><User size={16} /> Usuario</label>
                    <select
                      name="usuarioId"
                      value={filtros.usuarioId}
                      onChange={handleFiltroChange}
                      className="form-control"
                      disabled={loading}
                    >
                      <option value="">Todos los usuarios</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.rol})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Estado */}
                <div className="form-group">
                  <label><Filter size={16} /> Estado</label>
                  <select
                    name="estado"
                    value={filtros.estado}
                    onChange={handleFiltroChange}
                    className="form-control"
                    disabled={loading}
                  >
                    <option value="">Todos</option>
                    <option value="BORRADOR">Borrador</option>
                    <option value="ENVIADO">Enviado</option>
                    <option value="APROBADO">Aprobado</option>
                    <option value="RECHAZADO">Rechazado</option>
                  </select>
                </div>

                {/* Fecha Inicio — DatePicker custom */}
                <div className="form-group">
                  <label><Calendar size={16} /> Fecha Inicio</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filtros.fechaInicio}
                    onChange={e => setFecha('fechaInicio')(e.target.value)}
                    max={filtros.fechaFin || undefined}
                    disabled={loading}
                  />
                </div>

                {/* Fecha Fin — DatePicker custom */}
                <div className="form-group">
                  <label><Calendar size={16} /> Fecha Fin</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filtros.fechaFin}
                    onChange={e => setFecha('fechaFin')(e.target.value)}
                    min={filtros.fechaInicio || undefined}
                    disabled={loading}
                  />
                </div>

              </div>{/* /form-grid */}

              {/* ── Botones de acción ──────────────────────────── */}
              <div className="card-actions">
                {/* Limpiar — a la izquierda via margin-right: auto en CSS */}
                <button
                  onClick={limpiarFiltros}
                  className="btn btn-outline"
                  disabled={loading}
                >
                  <X size={16} /> Limpiar Filtros
                </button>

                {/* Excel — verde */}
                <button
                  onClick={handleExportar}
                  className="btn btn-excel"
                  disabled={loading || preview.total === 0}
                  title="Descargar como .xlsx"
                >
                  <FileSpreadsheet size={20} /> Exportar a Excel
                  <span className="btn-badge">.xlsx</span>
                </button>

                {/* PDF — rojo */}
                <button
                  onClick={handleExportarPdf}
                  className="btn btn-pdf"
                  disabled={loading || preview.total === 0}
                  title="Descargar como .pdf"
                >
                  <Download size={20} /> Exportar a PDF
                  <span className="btn-badge">.pdf</span>
                </button>
              </div>

            </div>
          </div>{/* /card filtros */}

          {/* ── Vista Previa ─────────────────────────────────────
              La card siempre está visible (no condicional).
              Cuando no hay datos muestra un estado vacío guía.
              La columna "Creado por" aparece siempre — es parte
              de la tabla, no depende de un filtro de usuario.
          ─────────────────────────────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <Eye size={24} />
              <h3>Vista Previa de Datos</h3>
              {preview.total > 0 && (
                <span className="badge">{preview.total} registro{preview.total !== 1 ? 's' : ''}</span>
              )}
              {loading && (
                <span className="loading-inline">
                  <RefreshCw size={14} className="icon-spin" /> Actualizando…
                </span>
              )}
            </div>

            <div className="card-body">
              {preview.registros.length > 0 ? (() => {
                // Construir columnas dinámicas: Creado Por + columnas del backend
                const cols = [
                  { key: '__creadoPor', label: '👤 Creado por' },
                  ...preview.columnas.map(c => ({ key: c, label: c.replace(/_/g, ' ') }))
                ];
                // Enriquecer datos con creadoPor como campo propio
                const datos = preview.registros.map((row, i) => ({
                  __creadoPor: preview.creadoPor[i] || '—',
                  ...row
                }));
                const renderCell = (row, key) => {
                  if (key === '__creadoPor') return <span className="chip-usuario">{row[key]}</span>;
                  const val = row[key];
                  return val !== null && val !== undefined ? String(val) : '—';
                };
                return <TablaReporte columnas={cols} datos={datos} renderCell={renderCell} />;
              })() : (
                <div className="estado-vacio">
                  {loading
                    ? <><RefreshCw size={40} className="spin" /><p>Cargando datos…</p></>
                    : <><Eye size={40} /><p>Selecciona un tipo de formulario para ver los datos</p></>
                  }
                </div>
              )}

              {preview.total > 100 && (
                <div className="info-note">
                  <AlertCircle size={16} />
                  <span>
                    Se muestran los primeros 100 registros.
                    Al exportar se incluirán los {preview.total} totales.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Instrucciones ──────────────────────────────────── */}
          <div className="card info-card">
            <div className="card-header">
              <h3>📋 Instrucciones</h3>
            </div>
            <div className="card-body">
              <ol className="instruction-list">
                <li>Selecciona el tipo de formulario — la tabla se actualiza automáticamente</li>
                <li>Filtra por fecha escribiendo (dd/mm/aaaa) o con el ícono 📅</li>
                <li>Combina usuario, estado y fechas para afinar resultados</li>
                <li>Excel: datos limpios sin formato · PDF: reporte institucional con logo</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reportes;
