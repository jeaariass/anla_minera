// api.js

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Romper caché del navegador en todos los GET
    if (config.method === "get") {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ============================================
// INTERCEPTOR DE SESIÓN EXPIRADA
// ============================================
// Este interceptor revisa TODAS las respuestas del servidor.
// Si el servidor dice que el token venció, limpia la sesión
// y manda al usuario al login automáticamente.

api.interceptors.response.use(
  (response) => response, // Si la respuesta es exitosa, la dejamos pasar sin tocar nada
  (error) => {
    const data = error.response?.data;
    const status = error.response?.status;

    // ¿El servidor respondió 401 (no autorizado) Y el token venció?
    if (status === 401 && data?.expired === true) {
      // 1. Borramos la sesión guardada en el navegador
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");

      // 2. Avisamos al usuario con un mensaje claro
      alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");

      // 3. Mandamos al usuario al login
      window.location.href = "/TU_MINA/Login"; // ← Ajusta si tu ruta de login es diferente
    }

    return Promise.reject(error);
  },
);

// ============================================
// SERVICIO DE AUTENTICACIÓN
// ============================================

export const authService = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  getProfile: () => api.get("/auth/perfil"),

  // AGREGAR ESTOS MÉTODOS:
  getCurrentUser: () => {
    const userStr = localStorage.getItem("usuario");
    return userStr ? JSON.parse(userStr) : null;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.dispatchEvent(new Event("storage")); // ← agregar esta línea
  },
};

// ============================================
// SERVICIO DE FRI (FORMULARIOS)
// ============================================

export const friService = {
  // Producción
  getProduccion: (params) => api.get("/fri/produccion", { params }),
  createProduccion: (data) => api.post("/fri/produccion", data),
  updateProduccion: (id, data) => api.put(`/fri/produccion/${id}`, data),
  deleteProduccion: (id) => api.delete(`/fri/produccion/${id}`),

  // Inventarios
  getInventarios: (params) => api.get("/fri/inventarios", { params }),
  createInventarios: (data) => api.post("/fri/inventarios", data),
  updateInventarios: (id, data) => api.put(`/fri/inventarios/${id}`, data),
  deleteInventarios: (id) => api.delete(`/fri/inventarios/${id}`),

  // Paradas
  getParadas: (params) => api.get("/fri/paradas", { params }),
  createParadas: (data) => api.post("/fri/paradas", data),
  updateParadas: (id, data) => api.put(`/fri/paradas/${id}`, data),
  deleteParadas: (id) => api.delete(`/fri/paradas/${id}`),

  // Ejecución
  getEjecucion: (params) => api.get("/fri/ejecucion", { params }),
  createEjecucion: (data) => api.post("/fri/ejecucion", data),
  updateEjecucion: (id, data) => api.put(`/fri/ejecucion/${id}`, data),
  deleteEjecucion: (id) => api.delete(`/fri/ejecucion/${id}`),

  // Maquinaria
  getMaquinaria: (params) => api.get("/fri/maquinaria", { params }),
  createMaquinaria: (data) => api.post("/fri/maquinaria", data),
  updateMaquinaria: (id, data) => api.put(`/fri/maquinaria/${id}`, data),
  deleteMaquinaria: (id) => api.delete(`/fri/maquinaria/${id}`),

  // Regalías
  getRegalias: (params) => api.get("/fri/regalias", { params }),
  createRegalias: (data) => api.post("/fri/regalias", data),
  updateRegalias: (id, data) => api.put(`/fri/regalias/${id}`, data),
  deleteRegalias: (id) => api.delete(`/fri/regalias/${id}`),

  // Capacidad
  getCapacidad: (params) => api.get("/fri/capacidad", { params }),
  createCapacidad: (data) => api.post("/fri/capacidad", data),
  updateCapacidad: (id, data) => api.put(`/fri/capacidad/${id}`, data),
  deleteCapacidad: (id) => api.delete(`/fri/capacidad/${id}`),

  // Cambiar estado
  cambiarEstado: (tipo, id, estado) =>
    api.put(`/fri/${tipo}/${id}/estado`, { estado }),

  // Estadísticas
  getEstadisticas: () => api.get("/fri/estadisticas"),
  getBorradoresCount: () => api.get("/fri/borradores/count"),
  enviarBorradores: () => api.post("/fri/enviar-borradores"),

  // Inventario Maquinaria
  getInventarioMaquinaria: (params) =>
    api.get("/fri/inventario-maquinaria", { params }),
  createInventarioMaquinaria: (data) =>
    api.post("/fri/inventario-maquinaria", data),
  updateInventarioMaquinaria: (id, data) =>
    api.put(`/fri/inventario-maquinaria/${id}`, data),
  deleteInventarioMaquinaria: (id) =>
    api.delete(`/fri/inventario-maquinaria/${id}`),

  // Proyecciones
  getProyecciones: (params) => api.get("/fri/proyecciones", { params }),
  createProyecciones: (data) => api.post("/fri/proyecciones", data),
  updateProyecciones: (id, data) => api.put(`/fri/proyecciones/${id}`, data),
  deleteProyecciones: (id) => api.delete(`/fri/proyecciones/${id}`),
};

// SERVICIO DE REPORTES
export const reportService = {
  getPreview:    (params) => api.get('/reports/preview', { params }),
  exportarExcel: (params) => api.get('/reports/export', { params, responseType: 'blob', headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }),
  exportarPdf:   (params) => api.get('/reports/pdf',    { params, responseType: 'blob' }),
};

export const androidService = {
  // ... otras funciones

  getPuntos: async (tituloMineroId, filtros = {}) => {
    try {
      console.log("📍 Solicitando puntos para:", tituloMineroId);

      const params = new URLSearchParams(filtros).toString();
      const url = `/actividad/puntos/${tituloMineroId}${params ? "?" + params : ""}`;

      console.log("🔵 URL:", `${API_BASE_URL}${url}`);

      const response = await api.get(url);

      console.log("📥 Respuesta getPuntos:", response);

      return response;
    } catch (error) {
      console.error("❌ Error obteniendo puntos:", error);
      throw error;
    }
  },

  // ... otras funciones
};

export const usuarioService = {
  getAll: () => api.get("/list-users"),
  getById: (id) => api.get(`/list-users/${id}`),
  create: (data) => api.post("/list-users", data),
  update: (id, data) => api.put(`/list-users/${id}`, data),
  toggleStatus: (id) => api.patch(`/list-users/${id}/status`),
};

export const tituloService = {
  getAll: () => api.get("/titulos-mineros"),
  getById: (id) => api.get(`/titulos/${id}`),
  create: (data) => api.post("/titulos", data),
  update: (id, data) => api.put(`/titulos/${id}`, data),
};

export default api;