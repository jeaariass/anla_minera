import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, reportService } from '../services/api';
import { 
  ArrowLeft, 
  Download, 
  Eye,
  FileSpreadsheet,
  Calendar,
  Filter,
  AlertCircle,
  CheckCircle,
  User,
  LogOut
} from 'lucide-react';
import './Reportes.css';

const Reportes = () => {
  const navigate = useNavigate();
  const [user] = useState(authService.getCurrentUser());
  
  const [filtros, setFiltros] = useState({
    tipo: 'produccion',
    fechaInicio: '',
    fechaFin: ''
  });
  
  const [preview, setPreview] = useState({
    visible: false,
    columnas: [],
    registros: [],
    total: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tiposFormularios = [
    { value: 'produccion', label: 'Producción' },
    { value: 'inventarios', label: 'Inventarios' },
    { value: 'paradas', label: 'Paradas' },
    { value: 'ejecucion', label: 'Ejecución' },
    { value: 'maquinaria', label: 'Maquinaria' },
    { value: 'regalias', label: 'Regalías' }
  ];

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleVistaPrevia = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await reportService.getPreview(filtros);

      if (response.data.success) {
        setPreview({
          visible: true,
          columnas: response.data.columnas,
          registros: response.data.registros,
          total: response.data.total
        });
        
        if (response.data.total === 0) {
          setError('No se encontraron registros con los filtros seleccionados');
        } else {
          setSuccess(`✓ Se encontraron ${response.data.total} registros`);
        }
      }
    } catch (err) {
      console.error('Error en vista previa:', err);
      setError(err.response?.data?.message || 'Error al cargar vista previa');
      setPreview({ visible: false, columnas: [], registros: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await reportService.exportarExcel(filtros);

      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const nombreArchivo = `FRI_${filtros.tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', nombreArchivo);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`✓ Archivo "${nombreArchivo}" descargado correctamente`);

    } catch (err) {
      console.error('Error exportando:', err);
      setError(err.response?.data?.message || 'Error al exportar archivo');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      tipo: 'produccion',
      fechaInicio: '',
      fechaFin: ''
    });
    setPreview({ visible: false, columnas: [], registros: [], total: 0 });
    setError('');
    setSuccess('');
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  return (
    <div className="reportes-container">
      {/* Header igual que Home */}
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
                <div className="user-avatar">
                  <User size={20} />
                </div>
                <div className="user-details">
                  <p className="user-name">{user?.nombre || 'Usuario'}</p>
                  <p className="user-role">{user?.rol || 'ROL'}</p>
                </div>
              </div>
              
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="reportes-main">
        <div className="container">

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button onClick={() => navigate('/home')} className="breadcrumb-link">
              <ArrowLeft size={18} />
              Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Exportar Reportes</span>
          </div>

          {/* Page Title */}
          <div className="page-title-section">
            <div className="page-title-icon">
              <FileSpreadsheet size={40} />
            </div>
            <div>
              <h2 className="page-title">📥 Exportar Reportes ANM</h2>
              <p className="page-subtitle">Genera reportes de tus formularios FRI en formato Excel</p>
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircle size={20} />
              {success}
            </div>
          )}

          {/* Filtros */}
          <div className="card">
            <div className="card-header">
              <Filter size={24} />
              <h3>Filtros de Exportación</h3>
            </div>

            <div className="card-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <FileSpreadsheet size={18} />
                    Tipo de Formulario
                  </label>
                  <select
                    name="tipo"
                    value={filtros.tipo}
                    onChange={handleFiltroChange}
                    className="form-control"
                    disabled={loading}
                  >
                    {tiposFormularios.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    <Calendar size={18} />
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    name="fechaInicio"
                    value={filtros.fechaInicio}
                    onChange={handleFiltroChange}
                    className="form-control"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Calendar size={18} />
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    name="fechaFin"
                    value={filtros.fechaFin}
                    onChange={handleFiltroChange}
                    className="form-control"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="card-actions">
                <button 
                  onClick={handleVistaPrevia} 
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  <Eye size={20} />
                  {loading ? 'Cargando...' : 'Vista Previa'}
                </button>

                <button 
                  onClick={limpiarFiltros} 
                  className="btn btn-outline"
                  disabled={loading}
                >
                  Limpiar Filtros
                </button>

                <button 
                  onClick={handleExportar} 
                  className="btn btn-primary"
                  disabled={loading || preview.total === 0}
                >
                  <Download size={20} />
                  Exportar a Excel
                </button>
              </div>
            </div>
          </div>

          {/* Vista Previa */}
          {preview.visible && (
            <div className="card">
              <div className="card-header">
                <Eye size={24} />
                <h3>Vista Previa de Datos</h3>
                <span className="badge">{preview.total} registros</span>
              </div>

              <div className="card-body">
                {preview.registros.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {preview.columnas.map((columna, index) => (
                            <th key={index}>{columna}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.registros.map((registro, rowIndex) => (
                          <tr key={rowIndex}>
                            {Object.values(registro).map((valor, colIndex) => (
                              <td key={colIndex}>
                                {valor !== null && valor !== undefined ? String(valor) : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <AlertCircle size={48} />
                    <p>No se encontraron registros</p>
                  </div>
                )}

                {preview.total > 100 && (
                  <div className="info-note">
                    <AlertCircle size={16} />
                    <span>Se muestran los primeros 100 registros. Al exportar se incluirán todos los {preview.total} registros.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instrucciones */}
          <div className="card info-card">
            <div className="card-header">
              <h3>📋 Instrucciones</h3>
            </div>
            <div className="card-body">
              <ol className="instruction-list">
                <li>Selecciona el tipo de formulario que deseas exportar</li>
                <li>Opcionalmente, filtra por rango de fechas</li>
                <li>Presiona "Vista Previa" para verificar los datos</li>
                <li>Presiona "Exportar a Excel" para descargar el archivo</li>
              </ol>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Reportes;