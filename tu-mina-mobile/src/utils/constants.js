// =============================================================================
// 🌐 CONFIGURACIÓN COMPLETA - TU MINA MOBILE
// =============================================================================

import { Platform } from 'react-native';

// =============================================================================
// CONFIGURACIÓN DE AMBIENTE
// =============================================================================

// Detectar entorno (dev vs production)
const __DEV__ = process.env.NODE_ENV === 'development';

// TU CONFIGURACIÓN LOCAL (⚠️ Cambia esto si tu IP cambia)
const LOCAL_IP = '192.168.1.8';
const LOCAL_PORT = '3001';

// PRODUCCIÓN: Tu servidor VPS
const PRODUCTION_API = 'https://api.ctglobal.com.co/api';

// =============================================================================
// API_BASE_URL según entorno y plataforma
// =============================================================================

export const API_BASE_URL = __DEV__
  ? // 🔧 DESARROLLO - usar IP local
    Platform.select({
      // Emulador Android usa IP especial (10.0.2.2 = localhost del host)
      android: Platform.OS === 'android' && !__DEV__ 
        ? `http://10.0.2.2:${LOCAL_PORT}/api`
        : `http://${LOCAL_IP}:${LOCAL_PORT}/api`,
      
      // iOS (simulador o dispositivo real)
      ios: `http://${LOCAL_IP}:${LOCAL_PORT}/api`,
      
      // Default (Expo Go en dispositivo real)
      default: `http://${LOCAL_IP}:${LOCAL_PORT}/api`
    })
  : // 🚀 PRODUCCIÓN - usar dominio público
    PRODUCTION_API;

// Logs para debug
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📱 Plataforma:', Platform.OS);
console.log('🔧 Entorno:', __DEV__ ? 'DESARROLLO' : 'PRODUCCIÓN');
console.log('🌐 API URL:', API_BASE_URL);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// =============================================================================
// STORAGE KEYS (AsyncStorage)
// =============================================================================
export const STORAGE_KEYS = {
  TOKEN: '@tumina_token',
  USER_DATA: '@tumina_user_data',
  PENDING_CICLOS: '@tumina_pending_ciclos',
  LAST_SYNC: '@tumina_last_sync',
};

// =============================================================================
// ENDPOINTS (rutas relativas - uso recomendado)
// =============================================================================
export const ENDPOINTS = {
  // ========== AUTH ==========
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PERFIL: '/auth/perfil',
  
  // ========== ANDROID/CICLOS ==========
  PUNTOS_REFERENCIA: (tituloMineroId) => `/android/puntos-referencia/${tituloMineroId}`,
  INICIAR_REGISTRO: '/android/iniciar-registro',
  REGISTRAR_CICLO: '/android/registrar-ciclo',
  REGISTRAR_CICLOS_BATCH: '/android/registrar-ciclos-batch',
  
  CICLOS_DEL_DIA: (usuarioId, tituloMineroId) => 
    `/android/ciclos-del-dia?usuarioId=${usuarioId}&tituloMineroId=${tituloMineroId}`,
  
  ESTADISTICAS: (usuarioId, tituloMineroId) => 
    `/android/estadisticas?usuarioId=${usuarioId}&tituloMineroId=${tituloMineroId}`,
  
  // ========== ACTIVIDAD ==========
  PUNTOS_ACTIVIDAD: '/actividad/puntos',
  REGISTRAR_PUNTO_ACTIVIDAD: '/actividad/punto',
  ESTADISTICAS_ACTIVIDAD: (tituloMineroId) => `/actividad/estadisticas/${tituloMineroId}`,
  
  // ========== FRI ==========
  FRI_PRODUCCION: '/fri/produccion',
  FRI_INVENTARIOS: '/fri/inventarios',
  FRI_PARADAS: '/fri/paradas',
  FRI_SYNC: '/android/sync',
};

// =============================================================================
// API_ENDPOINTS (URLs completas - para compatibilidad con código antiguo)
// ⚠️ NOTA: Se recomienda usar ENDPOINTS (rutas relativas) + axios instance
// =============================================================================
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  PERFIL: `${API_BASE_URL}/auth/perfil`,
  
  // FRI
  FRI_PRODUCCION: `${API_BASE_URL}/fri/produccion`,
  FRI_SYNC: `${API_BASE_URL}/android/sync`,
  
  // Actividad
  PUNTOS_ACTIVIDAD: `${API_BASE_URL}/actividad/puntos`,
  REGISTRAR_CICLO: `${API_BASE_URL}/actividad/ciclo`,
  ACTIVIDAD_RECIENTE: `${API_BASE_URL}/actividad/reciente`,
};

// =============================================================================
// GPS CONFIG
// =============================================================================
export const GPS_CONFIG = {
  TIME_INTERVAL: 5000,        // 5 segundos
  DISTANCE_INTERVAL: 10,       // 10 metros
  GEOFENCE_RADIUS: 50,         // 50 metros
  ACCURACY: {
    HIGH: 'high',
    BALANCED: 'balanced',
    LOW: 'low'
  }
};

// =============================================================================
// SYNC CONFIG
// =============================================================================
export const SYNC_CONFIG = {
  SYNC_INTERVAL: 30000,        // 30 segundos
  MAX_PENDING: 100,            // Máximo 100 registros pendientes
  MAX_RETRIES: 3,              // 3 intentos antes de fallar
  RETRY_DELAY: 5000,           // 5 segundos entre reintentos
};

// =============================================================================
// PUNTO TIPO
// =============================================================================
export const PUNTO_TIPO = {
  EXTRACCION: 'EXTRACCION',
  ACOPIO: 'ACOPIO',
  TRANSPORTE: 'TRANSPORTE',
  PLANTA: 'PLANTA'
};

// =============================================================================
// CICLO ESTADO
// =============================================================================
export const CICLO_ESTADO = {
  INICIADO: 'INICIADO',
  EN_PROGRESO: 'EN_PROGRESO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO'
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Construye una URL completa a partir de un endpoint
 * @param {string} endpoint - Ruta del endpoint (ej: '/auth/login')
 * @returns {string} URL completa
 */
export const buildURL = (endpoint) => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};

/**
 * Verifica si la app está en modo desarrollo
 * @returns {boolean}
 */
export const isDevelopment = () => __DEV__;

/**
 * Verifica si la app está conectada al servidor local
 * @returns {boolean}
 */
export const isLocalServer = () => API_BASE_URL.includes(LOCAL_IP);

// =============================================================================
// EXPORT DEFAULT
// =============================================================================
export default {
  API_BASE_URL,
  API_ENDPOINTS,
  ENDPOINTS,
  STORAGE_KEYS,
  GPS_CONFIG,
  SYNC_CONFIG,
  PUNTO_TIPO,
  CICLO_ESTADO,
  
  // Helper functions
  buildURL,
  isDevelopment,
  isLocalServer,
};
