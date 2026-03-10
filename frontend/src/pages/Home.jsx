import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, friService } from "../services/api";
import { useTituloActivo } from "../context/TituloContext";
import api from "../services/api";
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
  Clock,
  Users,
  FileCheck,
  FolderOpen,
} from "lucide-react";
import "./Home.css";

import { tienePermiso } from "../utils/permissions";

import SelectorTitulo from "../components/SelectorTitulo";

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
  const { tituloActivoId, titulos, cargando, esRolGlobal, intentoCargado } =
    useTituloActivo();
  const tituloActivo =
    titulos?.find((t) => t.id === tituloActivoId) || user?.tituloMinero || null;

  useEffect(() => {
    loadUserData();
    if (esRolGlobal && (cargando || (!tituloActivoId && !intentoCargado)))
      return;
    loadAllStats();
  }, [tituloActivoId, cargando]);

  const loadUserData = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  };

  const loadAllStats = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();

      // Tipos de formularios FRI
      const tipos = [
        "produccion",
        "inventarios",
        "paradas",
        "ejecucion",
        "maquinaria",
        "regalias",
        "capacidad",
        "inventarioMaquinaria",
        "proyecciones",
      ];

      const statsData = {
        totalFormularios: 0,
        borradores: 0,
        enviados: 0,
        aprobados: 0,
        rechazados: 0,
        porTipo: {},
        paradasHoy: 0,
        minutosParadoHoy: 0,
        puntosHoy: 0,
      };

      // Cargar datos de cada tipo
      if (tienePermiso("VER_FRI")) {
        for (const tipo of tipos) {
          try {
            const serviceMethod = `get${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
            const response = await friService[serviceMethod]({
              tituloMineroId: tituloActivoId,
            });

            if (response.data.success && response.data.fris) {
              const fris = response.data.fris;
              const count = fris.length;

              statsData.totalFormularios += count;
              statsData.porTipo[tipo] = count;

              // Contar por estado
              fris.forEach((fri) => {
                if (fri.estado === "BORRADOR") statsData.borradores++;
                else if (fri.estado === "ENVIADO") statsData.enviados++;
                else if (fri.estado === "APROBADO") statsData.aprobados++;
                else if (fri.estado === "RECHAZADO") statsData.rechazados++;
              });
            }
          } catch (error) {
            console.error(`Error cargando ${tipo}:`, error);
            statsData.porTipo[tipo] = 0;
          }
        }
      }

      // ── Operación hoy (Colombia) ──
      const hoy = (() => {
        const local = new Date(Date.now() - 5 * 3600000);
        return local.toISOString().split("T")[0];
      })();

      const esOperario = currentUser?.rol === "OPERARIO";

      try {
        const [rResumen, rPuntos] = await Promise.all([
          api.get(
            `/paradas/resumen/${tituloActivoId}?dia=${hoy}${esOperario ? `&usuarioId=${currentUser.id}` : ""}`,
          ),
          api.get(`/actividad/puntos/${tituloActivoId}`),
        ]);

        if (rResumen.data.success) {
          statsData.paradasHoy = rResumen.data.resumen.totalParadas ?? 0;
          statsData.minutosParadoHoy = rResumen.data.resumen.totalMinutos ?? 0;
        }

        if (rPuntos.data.success) {
          const puntosHoy = (rPuntos.data.data ?? []).filter((p) => {
            const esDeHoy = p.dia && String(p.dia).split("T")[0] === hoy;
            const esMio = !esOperario || p.usuarioId === currentUser.id;
            return esDeHoy && esMio;
          });
          statsData.puntosHoy = puntosHoy.length;
        }
      } catch (_) {
        /* no bloquea si falla */
      }

      setStats(statsData);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/");
  };

  const quickActions = [
    {
      icon: <FileText size={32} />,
      title: "Formatos de Registro de Información",
      description: "Crear y gestionar formularios",
      path: "/formularios",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      permiso: "VER_PAGINA_FORMULARIOS",
    },
    {
      icon: <BarChart3 size={32} />,
      title: "Dashboard",
      description: "Ver estadísticas y análisis",
      path: "/dashboard",
      gradient: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
      permiso: "VER_PAGINA_DASHBOARD",
    },
    {
      icon: <Download size={32} />,
      title: "Exportar Reportes",
      description: "Generar PDF y Excel",
      path: "/reportes",
      gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      permiso: "VER_PAGINA_REPORTES",
    },
    {
      icon: <Activity size={32} />,
      title: "Formularios de Operación",
      description: "Registrar, editar y eliminar paradas y puntos de actividad",
      path: "/formularios-operacion",
      gradient: "linear-gradient(135deg, #e74c3c 0%, #f39c12 100%)",
      permiso: "VER_PAGINA_OPERACION",
    },
    {
      icon: <BarChart3 size={32} />,
      title: "Dashboard Operación",
      description: "Gráficos y análisis de paradas y puntos de actividad",
      path: "/dashboard-operacion",
      gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
      permiso: "VER_PAGINA_OPERACION",
    },
    {
      icon: <Map size={32} />,
      title: "Mapa de Actividades",
      description: "Visualizar puntos georeferenciados",
      path: "/mapa",
      gradient: "linear-gradient(135deg, #667eea 0%, #06b6d4 100%)",
      permiso: "VER_PAGINA_MAPA",
    },
    {
      icon: <FileCheck size={32} />,
      title: "Certificado de Origen",
      description: "Generar certificados de origen mineral",
      path: "/certificado-origen",
      gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
      permiso: "VER_PAGINA_CERTIFICADO_ORIGEN",
    },
    {
      icon: <Users size={32} />,
      title: "Gestión de Usuarios",
      description: "Crear, editar y administrar usuarios del sistema",
      path: "/usuarios",
      gradient: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
      permiso: "VER_PAGINA_USUARIOS",
    },
    {
      id: "gestor-archivos",
      title: "Gestor de Archivos",
      description: "Descargar certificados PDF y Excel por título y mes",
      icon: <FolderOpen size={28} />,
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      path: "/gestor-archivos",
      permiso: "VER_GESTOR_ARCHIVOS",
    },
  ];

  // Filtrar según permisos del usuario actual
  const accionesFiltradas = quickActions.filter((a) => tienePermiso(a.permiso));

  const tiposFormularios = [
    {
      id: "produccion",
      nombre: "Producción",
      icon: <FileText size={20} />,
      color: "#3b82f6",
    },
    {
      id: "inventarios",
      nombre: "Inventarios",
      icon: <Package size={20} />,
      color: "#10b981",
    },
    {
      id: "paradas",
      nombre: "Paradas",
      icon: <PauseCircle size={20} />,
      color: "#ef4444",
    },
    {
      id: "ejecucion",
      nombre: "Ejecución",
      icon: <Settings size={20} />,
      color: "#f59e0b",
    },
    {
      id: "maquinaria",
      nombre: "Maquinaria",
      icon: <Truck size={20} />,
      color: "#8b5cf6",
    },
    {
      id: "regalias",
      nombre: "Regalías",
      icon: <DollarSign size={20} />,
      color: "#ec4899",
    },
    {
      id: "capacidad",
      nombre: "Capacidad",
      icon: <Zap size={20} />,
      color: "#84cc16",
    },
    {
      id: "inventarioMaquinaria",
      nombre: "Inventario Maquinaria",
      icon: <Layers size={20} />,
      color: "#06b6d4",
    },
    {
      id: "proyecciones",
      nombre: "Proyecciones",
      icon: <TrendingUp size={20} />,
      color: "#8b5cf6",
    },
  ];

  if (esRolGlobal && (cargando || (!tituloActivoId && !intentoCargado))) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Cargando títulos mineros...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Cargando datos...</p>
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
                <h2>¡Bienvenido, {user?.nombre?.split(" ")[0]}! 👋</h2>
                <p>
                  Sistema de Formularios de Recolección de Información (FRI) -
                  Agencia Nacional de Minería
                </p>
                {tituloActivo && (
                  <div className="welcome-titulo">
                    <Building2 size={15} />
                    <span className="welcome-titulo-numero">
                      {tituloActivo.numeroTitulo}
                    </span>
                    {tituloActivo.municipio && (
                      <span className="welcome-titulo-municipio">
                        · {tituloActivo.municipio}
                      </span>
                    )}
                  </div>
                )}
                <div className="welcome-date">
                  <Calendar size={16} />
                  <span>
                    {new Date().toLocaleDateString("es-CO", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section - DATOS REALES */}
          {user?.rol !== "VENDEDOR" && (
            <section className="stats-section">
              <h3 className="section-title">
                📊 Resumen General de Formularios por día
              </h3>
              <div className="stats-grid">
                {/* Total Formularios, Borradores, Enviados — oculto para OPERARIO */}
                {user?.rol !== "OPERARIO" && user?.rol !== "VENDEDOR" && (
                  <>
                    <div
                      className="stat-card"
                      style={{ borderLeft: "4px solid #3b82f6" }}
                    >
                      <div
                        className="stat-icon"
                        style={{ background: "#dbeafe" }}
                      >
                        <FileText size={28} color="#3b82f6" />
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Total Formularios</p>
                        <h3 className="stat-value">{stats.totalFormularios}</h3>
                        <p className="stat-desc"></p>
                      </div>
                    </div>

                    <div
                      className="stat-card"
                      style={{ borderLeft: "4px solid #f59e0b" }}
                    >
                      <div
                        className="stat-icon"
                        style={{ background: "#fef3c7" }}
                      >
                        <Edit size={28} color="#f59e0b" />
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Borradores</p>
                        <h3 className="stat-value">{stats.borradores}</h3>
                        <p className="stat-desc"> </p>
                      </div>
                    </div>

                    <div
                      className="stat-card"
                      style={{ borderLeft: "4px solid #06b6d4" }}
                    >
                      <div
                        className="stat-icon"
                        style={{ background: "#cffafe" }}
                      >
                        <Send size={28} color="#06b6d4" />
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Enviados</p>
                        <h3 className="stat-value">{stats.enviados}</h3>
                        <p className="stat-desc"> </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Paradas y Puntos — solo para roles con permiso operativo */}
                {tienePermiso("VER_ESTADISTICAS_OPERATIVAS") && (
                  <>
                    <div
                      className="stat-card"
                      style={{ borderLeft: "4px solid #e74c3c" }}
                    >
                      <div
                        className="stat-icon"
                        style={{ background: "#fee2e2" }}
                      >
                        <Clock size={28} color="#e74c3c" />
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Min Parado</p>
                        <h3 className="stat-value">{stats.minutosParadoHoy}</h3>
                        <p className="stat-desc">
                          {stats.paradasHoy} paro
                          {stats.paradasHoy !== 1 ? "s" : ""} registrado
                          {stats.paradasHoy !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    <div
                      className="stat-card"
                      style={{ borderLeft: "4px solid #2563eb" }}
                    >
                      <div
                        className="stat-icon"
                        style={{ background: "#dbeafe" }}
                      >
                        <MapPin size={28} color="#2563eb" />
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Puntos</p>
                        <h3 className="stat-value">{stats.puntosHoy}</h3>
                        <p className="stat-desc">Actividad registrada hoy</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Formularios por Tipo - DATOS REALES */}
          {tienePermiso("VER_FRI") && (
            <section className="types-section">
              <h3 className="section-title">📝 Formularios por Tipo</h3>
              <div className="types-grid">
                {tiposFormularios.map((tipo) => (
                  <div key={tipo.id} className="type-card">
                    <div
                      className="type-icon"
                      style={{
                        background: `${tipo.color}20`,
                        color: tipo.color,
                      }}
                    >
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
          )}

          {/* Quick Actions */}
          <section className="actions-section">
            <h3 className="section-title">🚀 Acciones Rápidas</h3>
            <div className="actions-grid">
              {accionesFiltradas.map((action, index) => (
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
