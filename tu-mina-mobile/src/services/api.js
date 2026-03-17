// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

// ===============================
// AXIOS INSTANCE
// ===============================
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

console.log('🔵 API_BASE_URL configurada:', API_BASE_URL);

// ===============================
// REQUEST INTERCEPTOR (TOKEN)
// ===============================
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ===============================
// RESPONSE INTERCEPTOR
// Devuelve DIRECTAMENTE el JSON (response.data)
// ===============================
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Error en API:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ===============================
// AUTH SERVICE
// ===============================
export const authService = {
  login: async (email, password) => {
    try {
      console.log('🔵 Login request a:', `${API_BASE_URL}${ENDPOINTS.LOGIN}`);
      console.log('📧 Email:', email);

      const response = await api.post(ENDPOINTS.LOGIN, { email, password });
      console.log('🔵 Login response:', JSON.stringify(response, null, 2));

      if (response?.success) {
        console.log('💾 Guardando datos en AsyncStorage...');
        const token = response.token;
        const usuario = response.usuario;

        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
          console.log('✅ Token guardado:', token.substring(0, 30) + '...');
        }
        if (usuario) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(usuario));
          console.log('✅ Usuario guardado');
        }
      }

      return response;
    } catch (error) {
      console.error('❌ Error en login:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Error de conexión',
      };
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      console.log('✅ Sesión cerrada');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  },

  getCurrentUser: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  },
};

// ===============================
// ANDROID SERVICE (CICLOS)
// ===============================
export const androidService = {
  getPuntosReferencia: async (tituloMineroId) => {
    try {
      const url = ENDPOINTS.PUNTOS_REFERENCIA(tituloMineroId);
      console.log('📍 Petición a:', `${API_BASE_URL}${url}`);
      const response = await api.get(url);
      console.log('✅ Respuesta puntos:', response);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo puntos:', error);
      throw error;
    }
  },

  iniciarRegistro: async (data) => {
    try {
      const response = await api.post(ENDPOINTS.INICIAR_REGISTRO, data);
      return response;
    } catch (error) {
      console.error('Error iniciando registro:', error);
      throw error;
    }
  },

  registrarCiclo: async (cicloData) => {
    try {
      console.log('💾 Guardando ciclo:', cicloData);
      const response = await api.post(ENDPOINTS.REGISTRAR_CICLO, cicloData);
      console.log('✅ Ciclo guardado:', response);
      return response;
    } catch (error) {
      console.error('❌ Error guardando ciclo:', error);
      throw error;
    }
  },

  registrarCiclosBatch: async (ciclosData) => {
    try {
      const response = await api.post(ENDPOINTS.REGISTRAR_CICLOS_BATCH, { ciclos: ciclosData });
      return response;
    } catch (error) {
      console.error('Error registrando ciclos batch:', error);
      throw error;
    }
  },

  getCiclosDelDia: async (usuarioId, tituloMineroId) => {
    try {
      const response = await api.get(ENDPOINTS.CICLOS_DEL_DIA(usuarioId, tituloMineroId));
      return response;
    } catch (error) {
      console.error('Error obteniendo ciclos del día:', error);
      throw error;
    }
  },

  getEstadisticas: async (usuarioId, tituloMineroId) => {
    try {
      console.log('📊 Obteniendo estadísticas (ciclos):', { usuarioId, tituloMineroId });
      const response = await api.get(ENDPOINTS.ESTADISTICAS(usuarioId, tituloMineroId));
      console.log('📊 Respuesta estadísticas (ciclos):', response);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas (ciclos):', error);
      return {
        success: false,
        data: { ciclosHoy: 0, volumenHoy: 0 },
        error: error.message,
      };
    }
  },
};

// ===============================
// ACTIVIDAD SERVICE (PUNTOS)
// ===============================
export const actividadService = {
  getItems: async (categoria) => {
    return api.get(`/actividad/items/${categoria}`);
  },

  getMaquinaria: async () => {
    return api.get('/actividad/maquinaria');
  },

  registrarPunto: async (payload) => {
    return api.post('/actividad/punto', payload);
  },

  getPuntos: async (tituloMineroId) => {
    return api.get(`/actividad/puntos/${tituloMineroId}`);
  },

  getEstadisticas: async (tituloMineroId) => {
    return api.get(`/actividad/estadisticas/${tituloMineroId}`);
  },

  editarPunto: async (id, payload) => {
    return api.put(`/actividad/${id}`, payload);
  },

  eliminarPunto: async (id) => {
    return api.delete(`/actividad/${id}`);
  },
};

// ===============================
// PARADAS SERVICE ✅ COMPLETO
// ===============================
export const paradasService = {
  getMotivos: async () => {
    return api.get('/paradas/motivos');
  },

  registrarParada: async (payload) => {
    return api.post('/paradas', payload);
  },

  getParadas: async (tituloMineroId, filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const url = `/paradas/${tituloMineroId}${params ? `?${params}` : ''}`;
    return api.get(url);
  },

  editarParada: async (id, payload) => {
    return api.put(`/paradas/${id}`, payload);
  },

  // ✅ NUEVO — DELETE /paradas/:id
  eliminarParada: async (id) => {
    return api.delete(`/paradas/${id}`);
  },
};

export default api;