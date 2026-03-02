// src/pages/DashboardOperacion.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import api from "../services/api";
import { ArrowLeft, User, LogOut, RefreshCw, Filter } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./DashboardOperacion.css";
import "./Reportes.css"; // reutiliza header/breadcrumb/page-title

// ─── Constantes ───────────────────────────────────────────────────────────────

const CAT_COLORS = {
  extraccion: "#e74c3c",
  acopio: "#3498db",
  procesamiento: "#f39c12",
  inspeccion: "#27ae60",
};

const CAT_LABELS = {
  extraccion: "Extracción",
  acopio: "Acopio",
  procesamiento: "Procesamiento",
  inspeccion: "Inspección",
};

const MOTIVO_COLORS = [
  "#667eea",
  "#e74c3c",
  "#f39c12",
  "#27ae60",
  "#3498db",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

// ── Helpers de fecha ──────────────────────────────────────────────────────────

const colombiaToday = () => {
  const d = new Date(Date.now() - 5 * 3600000);
  return d.toISOString().split("T")[0];
};

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

const fmtDay = (iso) => {
  const [, m, d] = String(iso).split("T")[0].split("-");
  return `${d}/${m}`;
};

const toHHMM = (iso) => {
  const m = String(iso || "").match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "—";
};

const toDMY = (s) => {
  if (!s) return "—";
  const [y, mo, d] = String(s).split("T")[0].split("-");
  return `${d}/${mo}/${y}`;
};

// ── Custom tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dopd-tooltip">
      <p className="label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="val" style={{ color: p.color }}>
          {p.name}:{" "}
          <strong>
            {p.value}
            {unit}
          </strong>
        </p>
      ))}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const DashboardOperacion = () => {
  const navigate = useNavigate();
  const [user] = useState(authService.getCurrentUser());
  // const tituloId = user?.tituloMinero?.id || user?.tituloMineroId || 'titulo-816-17';
  const tituloId = user?.tituloMinero?.id || user?.tituloMineroId;

  // ── Período (fechas) ───────────────────────────────────────────────────────
  const hoy = colombiaToday();
  const [desde, setDesde] = useState(addDays(hoy, -29)); // últimos 30 días
  const [hasta, setHasta] = useState(hoy);
  const [periodo, setPeriodo] = useState("30d"); // '7d' | '30d' | '90d' | custom

  // ── Datos crudos ───────────────────────────────────────────────────────────
  const [paradas, setParadas] = useState([]);
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Cargar datos ───────────────────────────────────────────────────────────
  const cargar = async () => {
    try {
      if (!tituloId) {
        console.error("El usuario no tiene título minero asignado");
        setLoading(false);
        return;
      }

      setLoading(true);
      const [rP, rPt] = await Promise.all([
        api.get(`/paradas/${tituloId}`),
        api.get(`/actividad/puntos/${tituloId}`),
      ]);
      if (rP.data.success) setParadas(rP.data.data ?? []);
      if (rPt.data.success) setPuntos(rPt.data.data ?? []);

      if (rP.data.success) {
        setParadas(rP.data.data ?? []);
        console.log("Ejemplo parada:", rP.data.data?.[0]); // ← agregar
      }
      if (rPt.data.success) {
        setPuntos(rPt.data.data ?? []);
        console.log("Ejemplo punto:", rPt.data.data?.[0]); // ← agregar
      }
    } catch (e) {
      console.error("Error cargando datos operación:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // ── Filtrar por período ────────────────────────────────────────────────────
  const paradasFiltradas = useMemo(
    () =>
      paradas.filter((p) => {
        const d = String(p.dia || "").split("T")[0];
        return d >= desde && d <= hasta;
      }),
    [paradas, desde, hasta],
  );

  const puntosFiltrados = useMemo(
    () =>
      puntos.filter((p) => {
        const d = String(p.dia || "").split("T")[0];
        return d >= desde && d <= hasta;
      }),
    [puntos, desde, hasta],
  );

  // ── Aplicar botón de período rápido ───────────────────────────────────────
  const aplicarPeriodo = (p) => {
    setPeriodo(p);
    const hoyLocal = colombiaToday();
    setHasta(hoyLocal);
    if (p === "1d") setDesde(hoyLocal);
    if (p === "7d") setDesde(addDays(hoyLocal, -6));
    if (p === "30d") setDesde(addDays(hoyLocal, -29));
    if (p === "90d") setDesde(addDays(hoyLocal, -89));
  };

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalMinutos = paradasFiltradas.reduce(
      (a, p) => a + (Number(p.minutesParo) || 0),
      0,
    );
    const totalVol = puntosFiltrados.reduce(
      (a, p) => a + (Number(p.volumenM3) || 0),
      0,
    );
    const diasConParada = new Set(
      paradasFiltradas.map((p) => String(p.dia).split("T")[0]),
    ).size;
    return {
      totalParadas: paradasFiltradas.length,
      totalMinutos,
      horasParadas: (totalMinutos / 60).toFixed(1),
      promedioMin: paradasFiltradas.length
        ? (totalMinutos / paradasFiltradas.length).toFixed(0)
        : 0,
      totalPuntos: puntosFiltrados.length,
      totalVol: totalVol.toFixed(1),
      diasConParada,
    };
  }, [paradasFiltradas, puntosFiltrados]);

  // ── Paradas por día ────────────────────────────────────────────────────────
  const paradasPorDia = useMemo(() => {
    const mapa = {};
    paradasFiltradas.forEach((p) => {
      const d = String(p.dia).split("T")[0];
      if (!mapa[d]) mapa[d] = { dia: d, paradas: 0, minutos: 0 };
      mapa[d].paradas++;
      mapa[d].minutos += Number(p.minutesParo) || 0;
    });
    return Object.values(mapa)
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .map((r) => ({ ...r, label: fmtDay(r.dia) }));
  }, [paradasFiltradas]);

  // ── Puntos por día ─────────────────────────────────────────────────────────
  const puntosPorDia = useMemo(() => {
    const mapa = {};
    puntosFiltrados.forEach((p) => {
      const d = String(p.dia).split("T")[0];
      if (!mapa[d]) mapa[d] = { dia: d, puntos: 0, volumen: 0 };
      mapa[d].puntos++;
      mapa[d].volumen += Number(p.volumenM3) || 0;
    });
    return Object.values(mapa)
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .map((r) => ({
        ...r,
        volumen: parseFloat(r.volumen.toFixed(2)),
        label: fmtDay(r.dia),
      }));
  }, [puntosFiltrados]);

  // ── Distribución motivos de parada ────────────────────────────────────────
  const motivosDist = useMemo(() => {
    const mapa = {};
    paradasFiltradas.forEach((p) => {
      const k = p.motivoDisplay || p.motivoNombre || p.motivoCodigo || "Otro";
      mapa[k] = (mapa[k] || 0) + 1;
    });
    return Object.entries(mapa)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8);
  }, [paradasFiltradas]);

  // ── Distribución categorías de puntos ─────────────────────────────────────
  const categoriasDist = useMemo(() => {
    const mapa = {};
    puntosFiltrados.forEach((p) => {
      const k = p.categoria || "sin_categoria";
      if (!mapa[k])
        mapa[k] = { nombre: CAT_LABELS[k] || k, valor: 0, volumen: 0 };
      mapa[k].valor++;
      mapa[k].volumen += Number(p.volumenM3) || 0;
    });
    return Object.entries(mapa).map(([id, v]) => ({
      id,
      ...v,
      color: CAT_COLORS[id] || "#94a3b8",
      volumen: parseFloat(v.volumen.toFixed(2)),
    }));
  }, [puntosFiltrados]);

  // ── Volumen por categoría por día (stacked bar) ────────────────────────────
  const volPorCatDia = useMemo(() => {
    const mapa = {};
    puntosFiltrados.forEach((p) => {
      const d = String(p.dia).split("T")[0];
      if (!mapa[d]) mapa[d] = { dia: d, label: fmtDay(d) };
      const cat = p.categoria || "otro";
      mapa[d][cat] = (mapa[d][cat] || 0) + (Number(p.volumenM3) || 0);
    });
    return Object.values(mapa)
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .map((r) => {
        const out = { ...r };
        Object.keys(CAT_COLORS).forEach((cat) => {
          if (out[cat]) out[cat] = parseFloat(out[cat].toFixed(2));
        });
        return out;
      });
  }, [puntosFiltrados]);

  const cats = Object.keys(CAT_COLORS);

  // ── Últimas paradas (tabla) ────────────────────────────────────────────────
  const ultimasParadas = useMemo(
    () =>
      [...paradasFiltradas]
        .sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)))
        .slice(0, 8),
    [paradasFiltradas],
  );

  // ── Últimos puntos (tabla) ─────────────────────────────────────────────────
  const ultimosPuntos = useMemo(
    () =>
      [...puntosFiltrados]
        .sort((a, b) =>
          String(b.fecha || b.dia).localeCompare(String(a.fecha || a.dia)),
        )
        .slice(0, 8),
    [puntosFiltrados],
  );

  const handleLogout = () => {
    authService.logout();
    navigate("/");
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dopd-loading">
        <div className="dopd-spinner" />
        <p>Cargando datos de operación...</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dopd-container">
      {/* Header */}
      <header className="resumen-header">
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
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#4299e1",
                    margin: 0,
                  }}
                >
                  TU MINA
                </h1>
                <p style={{ fontSize: 13, color: "#718096", margin: 0 }}>
                  Desarrollado por CTGlobal
                </p>
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
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dopd-main">
        <div className="container">
          {/* Breadcrumb */}
          <div className="breadcrumb" style={{ marginBottom: 24 }}>
            <button
              onClick={() => navigate("/home")}
              className="breadcrumb-link"
            >
              <ArrowLeft size={18} /> Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Dashboard Operación</span>
          </div>

          {/* Título */}
          <div className="page-title-section" style={{ marginBottom: 28 }}>
            <div
              className="page-title-icon"
              style={{ background: "linear-gradient(135deg,#e74c3c,#f39c12)" }}
            >
              <span style={{ fontSize: 36 }}>📊</span>
            </div>
            <div>
              <h2 className="page-title">Dashboard de Operación</h2>
              <p className="page-subtitle">
                Análisis de paradas y puntos de actividad registrados desde la
                app móvil
              </p>
            </div>
          </div>

          {/* ── Filtros de período ── */}
          <div className="dopd-filters">
            <label>
              <Filter size={14} /> Desde:
            </label>
            <input
              type="date"
              className="dopd-date-input"
              value={desde}
              max={hasta}
              onChange={(e) => {
                setDesde(e.target.value);
                setPeriodo("custom");
              }}
            />
            <label>Hasta:</label>
            <input
              type="date"
              className="dopd-date-input"
              value={hasta}
              min={desde}
              max={hoy}
              onChange={(e) => {
                setHasta(e.target.value);
                setPeriodo("custom");
              }}
            />
            <button
              className="dopd-filter-btn"
              onClick={cargar}
              disabled={loading}
            >
              <RefreshCw size={14} /> Actualizar
            </button>
            <div className="dopd-filter-period">
              {[
                ["1d", "Hoy"],
                ["7d", "7 días"],
                ["30d", "30 días"],
                ["90d", "90 días"],
              ].map(([p, l]) => (
                <button
                  key={p}
                  className={`dopd-period-btn ${periodo === p ? "active" : ""}`}
                  onClick={() => aplicarPeriodo(p)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              SECCIÓN 1 — KPIs
              ══════════════════════════════════════════ */}
          <div className="dopd-kpi-grid">
            <div className="dopd-kpi" style={{ borderLeftColor: "#e74c3c" }}>
              <div className="dopd-kpi-icon" style={{ background: "#fee2e2" }}>
                🛑
              </div>
              <div className="dopd-kpi-body">
                <h5>Total Paradas</h5>
                <strong>{kpis.totalParadas}</strong>
                <span>
                  en {kpis.diasConParada} día
                  {kpis.diasConParada !== 1 ? "s" : ""} con paro
                </span>
              </div>
            </div>

            <div className="dopd-kpi" style={{ borderLeftColor: "#f39c12" }}>
              <div className="dopd-kpi-icon" style={{ background: "#fef3c7" }}>
                ⏱️
              </div>
              <div className="dopd-kpi-body">
                <h5>Tiempo Parado</h5>
                <strong>{kpis.horasParadas}h</strong>
                <span>
                  {kpis.totalMinutos} min · {kpis.promedioMin} min/paro promedio
                </span>
              </div>
            </div>

            <div className="dopd-kpi" style={{ borderLeftColor: "#2563eb" }}>
              <div className="dopd-kpi-icon" style={{ background: "#dbeafe" }}>
                📍
              </div>
              <div className="dopd-kpi-body">
                <h5>Total Puntos</h5>
                <strong>{kpis.totalPuntos}</strong>
                <span>actividades georeferenciadas</span>
              </div>
            </div>

            <div className="dopd-kpi" style={{ borderLeftColor: "#8b5cf6" }}>
              <div className="dopd-kpi-icon" style={{ background: "#ede9fe" }}>
                📦
              </div>
              <div className="dopd-kpi-body">
                <h5>Volumen Total</h5>
                <strong>{kpis.totalVol}</strong>
                <span>m³ registrados</span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              SECCIÓN 2 — GRÁFICOS DE PARADAS
              ══════════════════════════════════════════ */}
          <p className="dopd-section-title">🛑 Análisis de Paradas</p>
          <div className="dopd-charts-grid">
            {/* Paradas por día */}
            <div className="dopd-card">
              <div className="dopd-card-header">
                <h4>📅 Paradas y minutos por día</h4>
                <span className="dopd-card-badge">
                  {paradasPorDia.length} días
                </span>
              </div>
              {paradasPorDia.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={paradasPorDia} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      yAxisId="left"
                      dataKey="paradas"
                      fill="#e74c3c"
                      name="Paradas"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="minutos"
                      fill="#fbbf24"
                      name="Minutos parado"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dopd-no-data">
                  <span>🛑</span>
                  <p>Sin paradas en el período</p>
                </div>
              )}
            </div>

            {/* Distribución de motivos */}
            <div className="dopd-card">
              <div className="dopd-card-header">
                <h4>🔍 Motivos de parada</h4>
                <span className="dopd-card-badge">
                  {motivosDist.length} motivos
                </span>
              </div>
              {motivosDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={motivosDist}
                    layout="vertical"
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      tick={{ fontSize: 11 }}
                      width={130}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="cantidad"
                      name="Paradas"
                      radius={[0, 4, 4, 0]}
                    >
                      {motivosDist.map((_, i) => (
                        <Cell
                          key={i}
                          fill={MOTIVO_COLORS[i % MOTIVO_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dopd-no-data">
                  <span>🔍</span>
                  <p>Sin datos de motivos</p>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              SECCIÓN 3 — GRÁFICOS DE PUNTOS
              ══════════════════════════════════════════ */}
          <p className="dopd-section-title">
            📍 Análisis de Puntos de Actividad
          </p>
          <div className="dopd-charts-grid-3">
            {/* Volumen por categoría por día (stacked) */}
            <div className="dopd-card">
              <div className="dopd-card-header">
                <h4>📦 Volumen m³ por categoría por día</h4>
                <span className="dopd-card-badge">
                  {puntosPorDia.length} días
                </span>
              </div>
              {volPorCatDia.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={volPorCatDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip unit=" m³" />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {cats.map((cat) => (
                      <Bar
                        key={cat}
                        dataKey={cat}
                        stackId="vol"
                        fill={CAT_COLORS[cat]}
                        name={CAT_LABELS[cat]}
                        radius={
                          cat === "inspeccion" ? [4, 4, 0, 0] : [0, 0, 0, 0]
                        }
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dopd-no-data">
                  <span>📦</span>
                  <p>Sin volumen registrado</p>
                </div>
              )}
            </div>

            {/* Distribución por categoría (pie) */}
            <div className="dopd-card">
              <div className="dopd-card-header">
                <h4>🥧 Puntos por categoría</h4>
              </div>
              {categoriasDist.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoriasDist}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="valor"
                        label={({ nombre, percent }) =>
                          `${nombre} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {categoriasDist.map((c, i) => (
                          <Cell key={i} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, "Puntos"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Mini-resumen por categoría */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    {categoriasDist.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: "#f8fafc",
                          borderRadius: 8,
                          padding: "8px 12px",
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: c.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            flex: 1,
                            color: "#334155",
                          }}
                        >
                          {c.nombre}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#0f172a",
                          }}
                        >
                          {c.valor} pts
                        </span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          {c.volumen} m³
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="dopd-no-data">
                  <span>📍</span>
                  <p>Sin puntos en el período</p>
                </div>
              )}
            </div>
          </div>

          {/* Puntos por día (línea) */}
          <div className="dopd-card" style={{ marginBottom: 28 }}>
            <div className="dopd-card-header">
              <h4>📈 Puntos registrados por día</h4>
              <span className="dopd-card-badge">{kpis.totalPuntos} total</span>
            </div>
            {puntosPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={puntosPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="r"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    yAxisId="l"
                    type="monotone"
                    dataKey="puntos"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    name="Puntos"
                  />
                  <Line
                    yAxisId="r"
                    type="monotone"
                    dataKey="volumen"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    name="Volumen m³"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="dopd-no-data">
                <span>📈</span>
                <p>Sin puntos en el período</p>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════
              SECCIÓN 4 — TABLAS RECIENTES
              ══════════════════════════════════════════ */}
          <div className="dopd-charts-grid">
            {/* Últimas paradas */}
            <div className="dopd-card">
              <div className="dopd-card-header">
                <h4>🛑 Últimas paradas</h4>
                <span className="dopd-card-badge">Top 8</span>
              </div>
              {ultimasParadas.length > 0 ? (
                <div className="dopd-table-wrap">
                  <table className="dopd-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Inicio</th>
                        <th>Fin</th>
                        <th>Motivo</th>
                        <th>Duración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimasParadas.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{toDMY(p.dia)}</td>
                          <td style={{ fontFamily: "monospace" }}>
                            {toHHMM(p.inicio)}
                          </td>
                          <td style={{ fontFamily: "monospace" }}>
                            {toHHMM(p.fin)}
                          </td>
                          <td>
                            <span
                              className="dopd-motivo-pill"
                              title={p.motivoDisplay || p.motivoNombre}
                            >
                              {p.motivoDisplay || p.motivoNombre || "—"}
                            </span>
                          </td>
                          <td>
                            {p.minutesParo != null ? (
                              <span className="dopd-min-pill">
                                ⏱ {p.minutesParo} min
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="dopd-no-data">
                  <span>🛑</span>
                  <p>Sin paradas en el período</p>
                </div>
              )}
            </div>

            {/* Últimos puntos */}
            <div className="dopd-card">
              <div className="dopd-card-header">
                <h4>📍 Últimos puntos</h4>
                <span className="dopd-card-badge">Top 8</span>
              </div>
              {ultimosPuntos.length > 0 ? (
                <div className="dopd-table-wrap">
                  <table className="dopd-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Categoría</th>
                        <th>Ítem</th>
                        <th>Vol m³</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimosPuntos.map((pt) => (
                        <tr key={pt.id}>
                          <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                            {toDMY(pt.dia)}
                          </td>
                          <td>
                            <span className={`dopd-cat-badge ${pt.categoria}`}>
                              {CAT_LABELS[pt.categoria] || pt.categoria || "—"}
                            </span>
                          </td>
                          <td
                            style={{
                              maxWidth: 140,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontWeight: 500,
                            }}
                          >
                            {pt.itemDisplay || pt.itemNombre || "—"}
                          </td>
                          <td>
                            {pt.volumenM3 != null ? (
                              <span className="dopd-vol-pill">
                                📦 {Number(pt.volumenM3).toFixed(1)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="dopd-no-data">
                  <span>📍</span>
                  <p>Sin puntos en el período</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardOperacion;
