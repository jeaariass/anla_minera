// =============================================================================
// 🌐 CONFIGURACIÓN COMPLETA - TU MINA MOBILE
// =============================================================================

import { Platform } from 'react-native';

// Tu IP local (cambia si tu red cambia)
const LOCAL_IP = '192.168.0.5';
const API_PORT = '5001';

// URLs según plataforma
export const API_BASE_URL = Platform.select({
  android: `http://10.0.2.2:${API_PORT}/api`,
  ios: `http://${LOCAL_IP}:${API_PORT}/api`,
  default: `http://${LOCAL_IP}:${API_PORT}/api`
});

console.log('📱 Plataforma:', Platform.OS);
console.log('🌐 API URL:', API_BASE_URL);

// ============================================
// STORAGE KEYS (AsyncStorage)
// ============================================
export const STORAGE_KEYS = {
  TOKEN: '@tumina_token',
  USER_DATA: '@tumina_user_data',
  PENDING_CICLOS: '@tumina_pending_ciclos',
  LAST_SYNC: '@tumina_last_sync',
};

// ============================================
// ENDPOINTS (compatibilidad con código viejo)
// ============================================
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PERFIL: '/auth/perfil',
  
  // Android/Ciclos
  PUNTOS_REFERENCIA: (tituloMineroId) => `/android/puntos-referencia/${tituloMineroId}`,
  INICIAR_REGISTRO: '/android/iniciar-registro',
  REGISTRAR_CICLO: '/android/registrar-ciclo',
  REGISTRAR_CICLOS_BATCH: '/android/registrar-ciclos-batch',
  CICLOS_DEL_DIA: (usuarioId, tituloMineroId) => 
    `/android/ciclos-del-dia?usuarioId=${usuarioId}&tituloMineroId=${tituloMineroId}`,
  ESTADISTICAS: (usuarioId, tituloMineroId) => 
    `/android/estadisticas?usuarioId=${usuarioId}&tituloMineroId=${tituloMineroId}`,
  
  // Actividad
  PUNTOS_ACTIVIDAD: '/actividad/puntos',
  REGISTRAR_PUNTO_ACTIVIDAD: '/actividad/punto',
};

// ============================================
// API_ENDPOINTS (nueva versión)
// ============================================
export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  PERFIL: `${API_BASE_URL}/auth/perfil`,
  
  FRI_PRODUCCION: `${API_BASE_URL}/fri/produccion`,
  FRI_SYNC: `${API_BASE_URL}/android/sync`,
  
  PUNTOS_ACTIVIDAD: `${API_BASE_URL}/actividad/puntos`,
  REGISTRAR_CICLO: `${API_BASE_URL}/actividad/ciclo`,
  ACTIVIDAD_RECIENTE: `${API_BASE_URL}/actividad/reciente`,
};

// ============================================
// GPS CONFIG
// ============================================
export const GPS_CONFIG = {
  TIME_INTERVAL: 5000,
  DISTANCE_INTERVAL: 10,
  GEOFENCE_RADIUS: 50,
  ACCURACY: {
    HIGH: 'high',
    BALANCED: 'balanced',
    LOW: 'low'
  }
};

// ============================================
// SYNC CONFIG
// ============================================
export const SYNC_CONFIG = {
  SYNC_INTERVAL: 30000,
  MAX_PENDING: 100,
  MAX_RETRIES: 3
};

// ============================================
// PUNTO TIPO
// ============================================
export const PUNTO_TIPO = {
  EXTRACCION: 'EXTRACCION',
  ACOPIO: 'ACOPIO',
  TRANSPORTE: 'TRANSPORTE',
  PLANTA: 'PLANTA'
};

// ============================================
// CICLO ESTADO
// ============================================
export const CICLO_ESTADO = {
  INICIADO: 'INICIADO',
  EN_PROGRESO: 'EN_PROGRESO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO'
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  ENDPOINTS,
  STORAGE_KEYS,
  GPS_CONFIG,
  SYNC_CONFIG,
  PUNTO_TIPO,
  CICLO_ESTADO
};