import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService,friService } from '../services/api';
import { 
  ArrowLeft,
  Activity,
  TrendingDown,
  Package,
  AlertCircle,
  Clock,
  PieChart,
  Calendar,
  User, LogOut, BarChart3, TrendingUp, 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, 
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [usuario] = useState(authService.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalProduccion: 0,
      totalInventario: 0,
      totalParadas: 0,
      eficiencia: 0,
      horasOperativas: 0
    },
    produccionPorMes: [],
    distribucionMinerales: [],
    estadosFormularios: [],
    ultimasParadas: [],
    produccionPorMineral: []
  });
  const handleLogout = () => {  // ← AGREGAR ESTA FUNCIÓN
    authService.logout();
    navigate('/login');
  };

  useEffect(() => {
    cargarDatosReales();
  }, []);

  useEffect(() => {
    cargarDatosReales();
  }, []);

  const cargarDatosReales = async () => {
    try {
      setLoading(true);

      // Cargar datos de todas las tablas
      const [produccion, inventarios, paradas, maquinaria] = await Promise.all([
        friService.getProduccion().catch(() => ({ data: { fris: [] } })),
        friService.getInventarios().catch(() => ({ data: { fris: [] } })),
        friService.getParadas().catch(() => ({ data: { fris: [] } })),
        friService.getMaquinaria().catch(() => ({ data: { fris: [] } }))
      ]);

      const datosProduccion = produccion.data.fris || [];
      const datosInventarios = inventarios.data.fris || [];
      const datosParadas = paradas.data.fris || [];
      const datosMaquinaria = maquinaria.data.fris || [];

      // ========================================
      // 1. CALCULAR KPIs REALES
      // ========================================
      
      // Producción total
      const totalProduccion = datosProduccion.reduce((sum, p) => {
        return sum + (parseFloat(p.cantidadProduccion) || 0);
      }, 0);

      // Inventario total (suma de inventarios finales)
      const totalInventario = datosInventarios.reduce((sum, inv) => {
        return sum + (parseFloat(inv.inventarioFinalAcopio) || 0);
      }, 0);

      // Total de paradas
      const totalParadas = datosParadas.length;

      // Horas operativas totales
      const horasOperativas = datosProduccion.reduce((sum, p) => {
        return sum + (parseFloat(p.horasOperativas) || 0);
      }, 0);

      // Calcular eficiencia (producción / horas * 100)
      const eficiencia = horasOperativas > 0 
        ? ((totalProduccion / horasOperativas) * 100).toFixed(1)
        : 0;

      // ========================================
      // 2. PRODUCCIÓN POR MINERAL
      // ========================================
      
      const produccionPorMineral = {};
      datosProduccion.forEach(p => {
        const mineral = p.mineral || 'Sin especificar';
        if (!produccionPorMineral[mineral]) {
          produccionPorMineral[mineral] = 0;
        }
        produccionPorMineral[mineral] += parseFloat(p.cantidadProduccion) || 0;
      });

      const distribucionMinerales = Object.keys(produccionPorMineral).map(mineral => ({
        nombre: mineral,
        valor: parseFloat(produccionPorMineral[mineral].toFixed(2)),
        porcentaje: totalProduccion > 0 
          ? ((produccionPorMineral[mineral] / totalProduccion) * 100).toFixed(1)
          : 0
      }));

      // ========================================
      // 3. PRODUCCIÓN POR MES (últimos 6 meses)
      // ========================================
      
      const produccionPorMes = {};
      datosProduccion.forEach(p => {
        const fecha = new Date(p.fechaCorte);
        const mesAno = `${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
        
        if (!produccionPorMes[mesAno]) {
          produccionPorMes[mesAno] = { produccion: 0, meta: 0 };
        }
        produccionPorMes[mesAno].produccion += parseFloat(p.cantidadProduccion) || 0;
        // Meta es 120% de la producción promedio
        produccionPorMes[mesAno].meta = produccionPorMes[mesAno].produccion * 1.2;
      });

      const arrayProduccionPorMes = Object.keys(produccionPorMes)
        .sort((a, b) => {
          const [mesA, anoA] = a.split('/').map(Number);
          const [mesB, anoB] = b.split('/').map(Number);
          return (anoA * 12 + mesA) - (anoB * 12 + mesB);
        })
        .slice(-6)
        .map(mesAno => ({
          mes: mesAno,
          produccion: parseFloat(produccionPorMes[mesAno].produccion.toFixed(2)),
          meta: parseFloat(produccionPorMes[mesAno].meta.toFixed(2))
        }));

      // ========================================
      // 4. ESTADOS DE FORMULARIOS
      // ========================================
      
      const todosFormularios = [
        ...datosProduccion,
        ...datosInventarios,
        ...datosParadas,
        ...datosMaquinaria
      ];

      const estadosCount = {
        'Enviados': 0,
        'Aprobados': 0,
        'Pendientes': 0,
        'Borradores': 0
      };

      todosFormularios.forEach(f => {
        if (f.estado === 'ENVIADO') estadosCount['Enviados']++;
        else if (f.estado === 'APROBADO') estadosCount['Aprobados']++;
        else if (f.estado === 'RECHAZADO') estadosCount['Pendientes']++;
        else if (f.estado === 'BORRADOR') estadosCount['Borradores']++;
      });

      const estadosFormularios = Object.keys(estadosCount).map(estado => ({
        estado,
        cantidad: estadosCount[estado]
      }));

      // ========================================
      // 5. ÚLTIMAS PARADAS
      // ========================================
      
      const ultimasParadas = datosParadas
        .sort((a, b) => new Date(b.fechaCorte) - new Date(a.fechaCorte))
        .slice(0, 5)
        .map(p => ({
          fecha: p.fechaCorte,
          tipo: p.tipoParada || 'Sin especificar',
          duracion: calcularDuracionHoras(p.fechaInicio, p.fechaFin),
          motivo: p.motivo || 'Sin descripción'
        }));

      // ========================================
      // 6. ACTUALIZAR ESTADO
      // ========================================

      setDashboardData({
        kpis: {
          totalProduccion: parseFloat(totalProduccion.toFixed(2)),
          totalInventario: parseFloat(totalInventario.toFixed(2)),
          totalParadas,
          eficiencia: parseFloat(eficiencia),
          horasOperativas: parseFloat(horasOperativas.toFixed(1))
        },
        produccionPorMes: arrayProduccionPorMes,
        distribucionMinerales,
        estadosFormularios,
        ultimasParadas,
        produccionPorMineral: distribucionMinerales
      });

    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDuracionHoras = (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) return 0;
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diff = fin - inicio;
    return (diff / (1000 * 60 * 60)).toFixed(1);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Cargando datos reales del dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      {/* Header */}
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img src="/logo.png" alt="Logo TU MINA" width="50" height="50"
                 style={{ borderRadius: '8px', objectFit: 'contain' }} />
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
                  <p className="user-name">{usuario?.nombre || 'Carlos Fajardo'}</p>
                  <p className="user-role">{usuario?.rol || 'ADMIN'}</p>
                </div>
              </div>
              
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} />
                Salir
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button onClick={() => navigate('/home')} className="breadcrumb-link">
              <ArrowLeft size={16} />
              Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Dashboard</span>
          </div>
        </div>
      </header>
      <main className="page-main">
        <div className="container">
          
          {/* ========================================
              SECCIÓN 1: KPIs PRINCIPALES
              ======================================== */}
          <section className="kpi-section fade-in">
            <div className="grid grid-4">
              
              {/* Producción Total */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className="kpi-icon" style={{ background: '#dbeafe' }}>
                  <Activity size={28} color="#3b82f6" />
                </div>
                <div className="kpi-content">
                  <h4>Producción Total</h4>
                  <h3>{dashboardData.kpis.totalProduccion.toLocaleString()} Ton</h3>
                  <div className="kpi-meta">
                    <Clock size={14} />
                    <span>{dashboardData.kpis.horasOperativas}h operativas</span>
                  </div>
                </div>
              </div>

              {/* Inventario Actual */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="kpi-icon" style={{ background: '#d1fae5' }}>
                  <Package size={28} color="#10b981" />
                </div>
                <div className="kpi-content">
                  <h4>Inventario Actual</h4>
                  <h3>{dashboardData.kpis.totalInventario.toLocaleString()} Ton</h3>
                  <div className="kpi-meta">
                    <TrendingUp size={14} />
                    <span>En acopio</span>
                  </div>
                </div>
              </div>

              {/* Paradas Totales */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="kpi-icon" style={{ background: '#fef3c7' }}>
                  <AlertCircle size={28} color="#f59e0b" />
                </div>
                <div className="kpi-content">
                  <h4>Paradas Totales</h4>
                  <h3>{dashboardData.kpis.totalParadas}</h3>
                  <div className="kpi-meta">
                    <Calendar size={14} />
                    <span>Registradas</span>
                  </div>
                </div>
              </div>

              {/* Eficiencia */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <div className="kpi-icon" style={{ background: '#ede9fe' }}>
                  <BarChart3 size={28} color="#8b5cf6" />
                </div>
                <div className="kpi-content">
                  <h4>Eficiencia</h4>
                  <h3>{dashboardData.kpis.eficiencia}%</h3>
                  <div className="kpi-meta">
                    <TrendingUp size={14} />
                    <span>Ton/Hora</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* ========================================
              SECCIÓN 2: GRÁFICOS
              ======================================== */}
          <section className="charts-section fade-in">
            <div className="grid grid-2">
              
              {/* Gráfico 1: Producción por Mes */}
              <div className="card">
                <h3>📈 Producción Mensual</h3>
                <div className="chart-container">
                  {dashboardData.produccionPorMes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dashboardData.produccionPorMes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="produccion" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          name="Producción Real"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="meta" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Meta"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="no-data">
                      <p>No hay datos de producción mensual</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gráfico 2: Distribución por Mineral */}
              <div className="card">
                <h3>⛏️ Distribución por Mineral</h3>
                <div className="chart-container">
                  {dashboardData.distribucionMinerales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie
                          data={dashboardData.distribucionMinerales}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ nombre, porcentaje }) => `${nombre}: ${porcentaje}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="valor"
                        >
                          {dashboardData.distribucionMinerales.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="no-data">
                      <p>No hay datos de minerales</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* ========================================
              SECCIÓN 3: ESTADOS DE FORMULARIOS
              ======================================== */}
          <section className="status-section fade-in">
            <div className="card">
              <h3>📋 Estado de Formularios</h3>
              <div className="chart-container">
                {dashboardData.estadosFormularios.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.estadosFormularios}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="estado" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">
                    <p>No hay datos de formularios</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ========================================
              SECCIÓN 4: ÚLTIMAS PARADAS
              ======================================== */}
          <section className="table-section fade-in">
            <div className="card">
              <h3>⏸️ Últimas Paradas de Producción</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Duración</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.ultimasParadas.length > 0 ? (
                      dashboardData.ultimasParadas.map((parada, index) => (
                        <tr key={index}>
                          <td>{new Date(parada.fecha).toLocaleDateString('es-CO')}</td>
                          <td>
                            <span className={`badge badge-${parada.tipo.toLowerCase().replace(/\s+/g, '-')}`}>
                              {parada.tipo}
                            </span>
                          </td>
                          <td>{parada.duracion}h</td>
                          <td>{parada.motivo}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#999' }}>
                          No hay paradas registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ========================================
              SECCIÓN 5: RESUMEN POR MINERAL
              ======================================== */}
          <section className="summary-section fade-in">
            <div className="card">
              <h3>📊 Resumen por Mineral</h3>
              <div className="grid grid-4">
                {dashboardData.produccionPorMineral.map((mineral, index) => (
                  <div key={index} className="summary-item">
                    <div className="summary-icon" style={{ background: COLORS[index % COLORS.length] }}>
                      {mineral.nombre.charAt(0)}
                    </div>
                    <div>
                      <h4>{mineral.nombre}</h4>
                      <p>{mineral.valor.toLocaleString()} Ton</p>
                      <span className="text-gray">{mineral.porcentaje}% del total</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;