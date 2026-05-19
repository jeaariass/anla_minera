// src/services/versionCheck.js
// ============================================================
// Verificación de versión APK al iniciar la app.
// Compara la versión instalada (app.json → version) contra el
// endpoint público /api/mobile/version del backend.
//
// - current < minimum  → modal BLOQUEANTE forzando descarga del APK
// - minimum ≤ current < latest → modal SUGERENTE (puede posponer)
// - current ≥ latest   → silencio
//
// El endpoint lee de backend/storage/mobile-version.json. Para
// publicar versión nueva basta con editar ese JSON, subir el APK
// a https://intranet.ctglobal.com.co/documentos/ y reiniciar PM2.
// ============================================================

import Constants from 'expo-constants';
import { Linking, Alert } from 'react-native';
import api from './api';

// Compara strings de versión "1.2.3" — devuelve -1 / 0 / 1.
// Tolera versiones cortas ("1.0" → "1.0.0").
const compararVersion = (a, b) => {
  const pa = String(a || '0').split('.').map((n) => Number(n) || 0);
  const pb = String(b || '0').split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return  1;
    if (va < vb) return -1;
  }
  return 0;
};

const versionInstalada = () =>
  Constants?.expoConfig?.version ??
  Constants?.manifest?.version ??
  '0.0.0';

export const verificarVersion = async () => {
  try {
    const resp = await api.get('/mobile/version');
    const { latest, minimum, apkUrl, releaseNotes } = resp || {};
    if (!latest || !minimum || !apkUrl) return;

    const actual = versionInstalada();
    const notas  = releaseNotes ? `\n\nNovedades:\n${releaseNotes}` : '';

    // ── BLOQUEANTE — versión actual demasiado vieja
    if (compararVersion(actual, minimum) < 0) {
      Alert.alert(
        '⚠️ Actualización obligatoria',
        `Tu versión (${actual}) ya no es soportada.\n\nDescarga la versión ${latest} para continuar.${notas}`,
        [{ text: 'Descargar APK', onPress: () => Linking.openURL(apkUrl) }],
        { cancelable: false }
      );
      return 'BLOQUEADO';
    }

    // ── SUGERENTE — hay nueva, pero la actual aún se acepta
    if (compararVersion(actual, latest) < 0) {
      Alert.alert(
        '📲 Nueva versión disponible',
        `Versión ${latest} disponible (tienes ${actual}).${notas}`,
        [
          { text: 'Después',  style: 'cancel' },
          { text: 'Descargar', onPress: () => Linking.openURL(apkUrl) },
        ]
      );
      return 'SUGERIDO';
    }

    return 'AL_DIA';
  } catch (e) {
    // Sin red o backend caído → no molestar al usuario
    console.log('verificarVersion: omitido —', e?.message);
  }
};
