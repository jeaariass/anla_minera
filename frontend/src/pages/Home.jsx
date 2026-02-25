import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, friService } from '../services/api';
import api from '../services/api';
import { 
  FileText, 
  BarChart3, 
  Download, 
  User, 
  LogOut,
  Building2,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Edit,
  Send,
  Package,
  PauseCircle,
  Settings,
  Truck,
  DollarSign,
  Layers,
  Zap,
  Map,
  Activity,
  MapPin,
  Clock
} from 'lucide-react';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalFormularios: 0,
    borradores: 0,
    enviados: 0,
    aprobados: 0,
    rechazados: 0,
    porTipo: {},
    paradasHoy: 0,
    minutosParadoHoy: 0,
    puntosHoy: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadAllStats();
  }, []);

  const loadUserData = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  };

  const loadAllStats = async () => {
    try {
      setLoading(true);
      
      // Tipos de formularios FRI
      const tipos = [
        'produccion',
        'inventarios', 
        'paradas',
        'ejecucion',
        'maquinaria',
        'regalias',
        'capacidad',
        'inventarioMaquinaria',
        'proyecciones'
      ];

      const statsData = {
        totalFormularios: 0,
        borradores: 0,
        enviados: 0,
        aprobados: 0,
        rechazados: 0,
        porTipo: {}
      };

      // Cargar datos de cada tipo
      for (const tipo of tipos) {
        try {
          const serviceMethod = `get${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
          const response = await friService[serviceMethod]();
          
          if (response.data.success && response.data.fris) {
            const fris = response.data.fris;
            const count = fris.length;
            
            statsData.totalFormularios += count;
            statsData.porTipo[tipo] = count;
            
            // Contar por estado
            fris.forEach(fri => {
              if (fri.estado === 'BORRADOR') statsData.borradores++;
              else if (fri.estado === 'ENVIADO') statsData.enviados++;
              else if (fri.estado === 'APROBADO') statsData.aprobados++;
              else if (fri.estado === 'RECHAZADO') statsData.rechazados++;
            });
          }
        } catch (error) {
          console.error(`Error cargando ${tipo}:`, error);
          statsData.porTipo[tipo] = 0;
        }
      }

      // ── Operación hoy (Colombia) ──
      const hoy = (() => {
        const local = new Date(Date.now() - 5 * 3600000);
        return local.toISOString().split('T')[0];
      })();
      const tituloId = authService.getCurrentUser()?.tituloMinero?.id
                    || authService.getCurrentUser()?.tituloMineroId
                    || 'titulo-816-17';
      try {
        const [rParadas, rPuntos] = await Promise.all([
          api.get(`/paradas/${tituloId}?dia=${hoy}`),
          api.get(`/actividad/puntos/${tituloId}?dia=${hoy}`),
        ]);
        if (rParadas.data.success) {
          const pHoy = rParadas.data.data ?? [];
          statsData.paradasHoy       = pHoy.length;
          statsData.minutosParadoHoy = pHoy.reduce((a, p) => a + (Number(p.minutesParo) || 0), 0);
        }
        if (rPuntos.data.success) {
          statsData.puntosHoy = (rPuntos.data.data ?? []).length;
        }
      } catch (_) { /* no bloquea si falla */ }

      setStats(statsData);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const quickActions = [
    {
      icon: <FileText size={32} />,
      title: 'Formatos de Registro de Información',
      description: 'Crear y gestionar formularios',
      path: '/formularios',
      color: '#2563eb',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      icon: <BarChart3 size={32} />,
      title: 'Dashboard',
      description: 'Ver estadísticas y análisis',
      path: '/dashboard',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    },
    {
      icon: <Download size={32} />,
      title: 'Exportar Reportes',
      description: 'Generar PDF y Excel',
      path: '/reportes',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    {
      icon: <Activity size={32} />,
      title: 'Formularios de Operación',
      description: 'Registrar, editar y eliminar paradas y puntos de actividad',
      path: '/formularios-operacion',
      color: '#e74c3c',
      gradient: 'linear-gradient(135deg, #e74c3c 0%, #f39c12 100%)',
    },
    {
      icon: <BarChart3 size={32} />,
      title: 'Dashboard Operación',
      description: 'Gráficos y análisis de paradas y puntos de actividad',
      path: '/dashboard-operacion',
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    },
    {
      icon: <Map size={32} />,
      title: 'Exportar Reportes',
      description: 'Visualizar puntos georeferenciados y mapa de Actividades',
      path: '/mapa',
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #667eea 0%, #06b6d4 100%)',
    },
  ];

  const tiposFormularios = [
    { id: 'produccion', nombre: 'Producción', icon: <FileText size={20} />, color: '#3b82f6' },
    { id: 'inventarios', nombre: 'Inventarios', icon: <Package size={20} />, color: '#10b981' },
    { id: 'paradas', nombre: 'Paradas', icon: <PauseCircle size={20} />, color: '#ef4444' },
    { id: 'ejecucion', nombre: 'Ejecución', icon: <Settings size={20} />, color: '#f59e0b' },
    { id: 'maquinaria', nombre: 'Maquinaria', icon: <Truck size={20} />, color: '#8b5cf6' },
    { id: 'regalias', nombre: 'Regalías', icon: <DollarSign size={20} />, color: '#ec4899' },
    { id: 'capacidad', nombre: 'Capacidad', icon: <Zap size={20} />, color: '#84cc16' },
    { id: 'inventarioMaquinaria', nombre: 'Inventario Maquinaria', icon: <Layers size={20} />, color: '#06b6d4' },
    { id: 'proyecciones', nombre: 'Proyecciones', icon: <TrendingUp size={20} />, color: '#8b5cf6' }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Cargando datos reales...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
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
      <main className="home-main">
        <div className="container">
          
          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-card">
              <div className="welcome-content">
                <h2>¡Bienvenido, {user?.nombre?.split(' ')[0]}! 👋</h2>
                <p>Sistema de Formularios de Recolección de Información (FRI) - Agencia Nacional de Minería</p>
                <div className="welcome-date">
                  <Calendar size={16} />
                  <span>{new Date().toLocaleDateString('es-CO', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section - DATOS REALES */}
          <section className="stats-section">
            <h3 className="section-title">📊 Resumen General de Formularios</h3>
            <div className="stats-grid">
              
              {/* Total Formularios */}
              <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className="stat-icon" style={{ background: '#dbeafe' }}>
                  <FileText size={28} color="#3b82f6" />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Formularios</p>
                  <h3 className="stat-value">{stats.totalFormularios}</h3>
                  <p className="stat-desc"></p>
                </div>
              </div>

              {/* Borradores */}
              <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="stat-icon" style={{ background: '#fef3c7' }}>
                  <Edit size={28} color="#f59e0b" />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Borradores</p>
                  <h3 className="stat-value">{stats.borradores}</h3>
                  <p className="stat-desc"> </p>
                </div>
              </div>

              {/* Enviados */}
              <div className="stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
                <div className="stat-icon" style={{ background: '#cffafe' }}>
                  <Send size={28} color="#06b6d4" />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Enviados</p>
                  <h3 className="stat-value">{stats.enviados}</h3>
                  <p className="stat-desc"> </p>
                </div>
              </div>

              {/* Paradas hoy */}
              <div className="stat-card" style={{ borderLeft: '4px solid #e74c3c' }}>
                <div className="stat-icon" style={{ background: '#fee2e2' }}>
                  <Clock size={28} color="#e74c3c" />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Min Parado</p>
                  <h3 className="stat-value">{stats.minutosParadoHoy}</h3>
                  <p className="stat-desc">{stats.paradasHoy} paro{stats.paradasHoy !== 1 ? 's' : ''} registrado{stats.paradasHoy !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Puntos hoy */}
              <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                <div className="stat-icon" style={{ background: '#dbeafe' }}>
                  <MapPin size={28} color="#2563eb" />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Puntos</p>
                  <h3 className="stat-value">{stats.puntosHoy}</h3>
                  <p className="stat-desc">Actividad registrada hoy</p>
                </div>
              </div>

            </div>
          </section>

          {/* Formularios por Tipo - DATOS REALES */}
          <section className="types-section">
            <h3 className="section-title">📝 Formularios por Tipo</h3>
            <div className="types-grid">
              {tiposFormularios.map((tipo) => (
                <div key={tipo.id} className="type-card">
                  <div className="type-icon" style={{ background: `${tipo.color}20`, color: tipo.color }}>
                    {tipo.icon}
                  </div>
                  <div className="type-content">
                    <h4>{tipo.nombre}</h4>
                    <p className="type-count">
                      <strong>{stats.porTipo[tipo.id] || 0}</strong> registros
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="actions-section">
            <h3 className="section-title">🚀 Acciones Rápidas</h3>
            <div className="actions-grid">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className="action-card"
                  onClick={() => navigate(action.path)}
                  style={{ background: action.gradient }}
                >
                  <div className="action-icon">{action.icon}</div>
                  <div className="action-content">
                    <h4>{action.title}</h4>
                    <p>{action.description}</p>
                  </div>
                  <div className="action-arrow">→</div>
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