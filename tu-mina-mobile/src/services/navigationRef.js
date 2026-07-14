// src/services/navigationRef.js
// Ref global de navegación + helpers para cierre de sesión por expiración.
// Lo usan: api.js (interceptor reactivo) y AppNavigator.js (chequeo proactivo).

import { createNavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { STORAGE_KEYS } from '../utils/constants';

export const navigationRef = createNavigationContainerRef();

// Evita alertas/resets duplicados cuando varias requests fallan en paralelo.
let cierreEnCurso = false;

export const cerrarSesionPorExpiracion = async (
  mensaje = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
) => {
  if (cierreEnCurso) return;
  cierreEnCurso = true;

  try {
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER_DATA]);
  } catch (e) {
    console.error('Error limpiando AsyncStorage:', e);
  }

  Alert.alert('Sesión expirada', mensaje);

  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  // Pequeño cooldown para tolerar errores 401 encadenados.
  setTimeout(() => { cierreEnCurso = false; }, 1500);
};

/**
 * Decodifica el payload del JWT y compara `exp` con la hora actual.
 * Devuelve true solo si el token está claramente expirado.
 * En caso de no poder decodificarlo, devuelve false (no cierra sesión gratis).
 */
export const tokenExpirado = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);

    let json;
    if (typeof atob === 'function') {
      json = atob(padded);
    } else if (typeof global !== 'undefined' && global.Buffer) {
      json = global.Buffer.from(padded, 'base64').toString('utf8');
    } else {
      return false;
    }

    const payload = JSON.parse(json);
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
};
