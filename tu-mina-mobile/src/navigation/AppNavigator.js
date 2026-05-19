// src/navigation/AppNavigator.js
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, Alert, AppState, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verificarVersion } from '../services/versionCheck';

import LoginScreen            from '../screens/LoginScreen';
import HomeScreen             from '../screens/HomeScreen';
import RegistrarPuntoScreen   from '../screens/RegistrarPuntoScreen';
import HistorialPuntosScreen  from '../screens/HistorialPuntosScreen';
import MapaHistorialScreen    from '../screens/MapaHistorialScreen';
import EditarPuntoScreen      from '../screens/EditarPuntoScreen';
import RegistrarParadaScreen  from '../screens/RegistrarParadaScreen';
import HistorialParadasScreen from '../screens/HistorialParadasScreen';
import EditarParadaScreen     from '../screens/EditarParadaScreen';

import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';
import {
  navigationRef,
  cerrarSesionPorExpiracion,
  tokenExpirado,
} from '../services/navigationRef';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isLoading,  setIsLoading]  = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const appState = useRef(AppState.currentState);

  // ── Chequeo de expiración (decodifica JWT, compara con Date.now) ────────────
  const verificarTokenVigente = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) return false;

      if (tokenExpirado(token)) {
        await cerrarSesionPorExpiracion();
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error verificando token:', error);
      return false;
    }
  };

  // ── Carga inicial: decide pantalla inicial ──────────────────────────────────
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token   = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        const vigente = token && !tokenExpirado(token);

        if (token && !vigente) {
          // Token caducado al abrir la app → limpiar silenciosamente, sin Alert.
          await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER_DATA]);
        }

        setIsLoggedIn(!!vigente);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // ── AppState: revalida cada vez que la app vuelve al foreground ─────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        verificarTokenVigente();
        verificarVersion(); // re-chequea versión al volver del background
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // ── Verificar versión APK al iniciar (Ruta B — version check) ───────────────
  // Endpoint público: GET /api/mobile/version (config en backend/storage).
  useEffect(() => {
    verificarVersion();
  }, []);

  // ── Auto-update OTA (Ruta A — EAS Update) ──────────────────────────────────
  // Carga `expo-updates` con require dinámico para no romper si la lib aún no
  // está instalada en el proyecto. Después de `npx expo install expo-updates`
  // y rebuild del APK, esto descarga bundles JS nuevos al abrir la app.
  useEffect(() => {
    (async () => {
      if (__DEV__) return; // OTA solo en builds de producción
      try {
        const Updates = require('expo-updates');
        if (!Updates?.checkForUpdateAsync) return;

        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;

        await Updates.fetchUpdateAsync();
        Alert.alert(
          '🔄 Actualización descargada',
          'Se aplicará al reiniciar la app.',
          [
            { text: 'Después',          style: 'cancel' },
            { text: 'Reiniciar ahora',  onPress: () => Updates.reloadAsync() },
          ]
        );
      } catch (e) {
        console.log('OTA check omitido —', e?.message);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Home' : 'Login'}
        screenOptions={{
          headerStyle:      { backgroundColor: COLORS.primary },
          headerTintColor:  COLORS.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Login"  component={LoginScreen}  options={{ headerShown: false }} />
        <Stack.Screen name="Home"   component={HomeScreen}   options={{ headerShown: false }} />

        {/* ── Puntos de actividad ── */}
        <Stack.Screen name="RegistrarPunto"  component={RegistrarPuntoScreen}  options={{ headerShown: false }} />
        <Stack.Screen name="HistorialPuntos" component={HistorialPuntosScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MapaHistorial"   component={MapaHistorialScreen}   options={{ headerShown: false }} />
        <Stack.Screen name="EditarPunto"     component={EditarPuntoScreen}     options={{ headerShown: false }} />

        {/* ── Paradas ── */}
        <Stack.Screen name="RegistrarParada"  component={RegistrarParadaScreen}  options={{ headerShown: false }} />
        <Stack.Screen name="HistorialParadas" component={HistorialParadasScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EditarParada"     component={EditarParadaScreen}     options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
