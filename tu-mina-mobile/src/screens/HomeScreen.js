// src/screens/HomeScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import HeaderComponent from '../components/HeaderComponent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, actividadService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

const emptyStats = {
  totalPuntos: 0,
  extraccion: { count: 0, volumen: 0 },
  acopio: { count: 0, volumen: 0 },
  procesamiento: { count: 0, volumen: 0 },
  inspeccion: { count: 0, volumen: 0 },
};

const CAT = [
  { key: 'extraccion', label: 'Extracción', emoji: '⛏️', border: '#e74c3c' },
  { key: 'acopio', label: 'Acopio', emoji: '📦', border: '#3498db' },
  { key: 'procesamiento', label: 'Procesamiento', emoji: '⚙️', border: '#f39c12' },
  { key: 'inspeccion', label: 'Inspección', emoji: '🔍', border: '#27ae60' },
];

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeStatsFromPuntos(puntos = []) {
  const stats = JSON.parse(JSON.stringify(emptyStats));
  stats.totalPuntos = puntos.length;

  for (const p of puntos) {
    const cat = p?.categoria;
    const vol = safeNumber(p?.volumenM3 ?? p?.volumen_m3 ?? 0);
    if (stats[cat]) {
      stats[cat].count += 1;
      stats[cat].volumen += vol;
    }
  }
  return stats;
}

function normalizeBackendStats(payload) {
  // soporta payload directo o payload.data
  const root = payload?.data ?? payload;
  const s = root?.estadisticas ?? null;
  if (!s) return null;

  // Caso: ya listo como UI { totalPuntos, extraccion:{count,volumen}, ... }
  if (typeof s.totalPuntos !== 'undefined' && s.extraccion && typeof s.extraccion.count !== 'undefined') {
    return {
      totalPuntos: safeNumber(s.totalPuntos),
      extraccion: { count: safeNumber(s.extraccion.count), volumen: safeNumber(s.extraccion.volumen) },
      acopio: { count: safeNumber(s.acopio?.count), volumen: safeNumber(s.acopio?.volumen) },
      procesamiento: { count: safeNumber(s.procesamiento?.count), volumen: safeNumber(s.procesamiento?.volumen) },
      inspeccion: { count: safeNumber(s.inspeccion?.count), volumen: safeNumber(s.inspeccion?.volumen) },
    };
  }

  // Caso: { total, porCategoria: { extraccion:{cantidad|count, volumen} ... } }
  const por = s.porCategoria ?? s.por_categoria ?? null;
  const total = s.total ?? s.totalPuntos ?? s.total_puntos ?? null;

  if (por) {
    return {
      totalPuntos: safeNumber(total),
      extraccion: {
        count: safeNumber(por.extraccion?.cantidad ?? por.extraccion?.count),
        volumen: safeNumber(por.extraccion?.volumen),
      },
      acopio: {
        count: safeNumber(por.acopio?.cantidad ?? por.acopio?.count),
        volumen: safeNumber(por.acopio?.volumen),
      },
      procesamiento: {
        count: safeNumber(por.procesamiento?.cantidad ?? por.procesamiento?.count),
        volumen: safeNumber(por.procesamiento?.volumen),
      },
      inspeccion: {
        count: safeNumber(por.inspeccion?.cantidad ?? por.inspeccion?.count),
        volumen: safeNumber(por.inspeccion?.volumen),
      },
    };
  }

  return null;
}

const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [estadisticas, setEstadisticas] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tituloMineroId = useMemo(() => {
    return userData?.tituloMinero?.id || userData?.tituloMineroId || null;
  }, [userData]);

  const cargarSesion = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (!raw) {
        setUserData(null);
        navigation.replace('Login');
        return;
      }
      const user = JSON.parse(raw);
      setUserData(user);
    } catch (e) {
      console.error('❌ Error cargando sesión:', e);
      setUserData(null);
      Alert.alert(
        'Error',
        'Tu sesión parece inválida. Inicia sesión nuevamente.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  const cargarEstadisticas = useCallback(async (id) => {
    if (!id) {
      setEstadisticas(emptyStats);
      return;
    }

    try {
      // 1) Intentar endpoint de estadisticas
      const payload = await actividadService.getEstadisticas(id);
      const normalized = payload?.success ? normalizeBackendStats(payload) : null;

      if (payload?.success && normalized) {
        setEstadisticas(normalized);
        return;
      }

      // 2) Fallback: calcular desde puntos
      const puntosResp = await actividadService.getPuntos(id);
      const root = puntosResp?.data ?? puntosResp;
      const lista =
        Array.isArray(root?.puntos) ? root.puntos :
        Array.isArray(root?.data) ? root.data :
        Array.isArray(root) ? root :
        [];

      setEstadisticas(computeStatsFromPuntos(lista));
    } catch (e) {
      console.log('❌ Error cargando estadísticas:', e?.message || e);

      // fallback final
      try {
        const puntosResp = await actividadService.getPuntos(id);
        const root = puntosResp?.data ?? puntosResp;
        const lista =
          Array.isArray(root?.puntos) ? root.puntos :
          Array.isArray(root?.data) ? root.data :
          Array.isArray(root) ? root :
          [];

        setEstadisticas(computeStatsFromPuntos(lista));
      } catch (e2) {
        console.log('❌ Error cargando puntos para stats:', e2?.message || e2);
        setEstadisticas(emptyStats);
      }
    }
  }, []);

  useEffect(() => {
    cargarSesion();
  }, [cargarSesion]);

  useEffect(() => {
    if (tituloMineroId) cargarEstadisticas(tituloMineroId);
  }, [tituloMineroId, cargarEstadisticas]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarSesion();
    if (tituloMineroId) await cargarEstadisticas(tituloMineroId);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const firstName = useMemo(() => {
    const n = userData?.nombre || '';
    return n.trim().split(' ')[0] || 'Usuario';
  }, [userData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>❌ No hay sesión activa</Text>
        <Text style={styles.errorSubtitle}>Inicia sesión para continuar.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('Login')}>
          <Text style={styles.primaryBtnText}>Ir a Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderComponent />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentPad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>¡Bienvenido, {firstName}! 👋</Text>
          <Text style={styles.welcomeSubtitle}>
            Sistema de Monitoreo de Actividades Mineras — TU MINA
          </Text>
        </View>

        {/* Usuario + Título */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>👤 Información del Operador</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{userData?.rol || 'ROL'}</Text>
            </View>
          </View>

          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Nombre</Text>
            <Text style={styles.kvVal}>{userData?.nombre || '-'}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Correo</Text>
            <Text style={styles.kvVal}>{userData?.email || '-'}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.cardTitle}>⛏️ Título Minero</Text>

          {userData?.tituloMinero ? (
            <>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Número</Text>
                <Text style={styles.kvValStrong}>{userData.tituloMinero.numeroTitulo || '-'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Municipio</Text>
                <Text style={styles.kvVal}>{userData.tituloMinero.municipio || '-'}</Text>
              </View>
              {userData.tituloMinero.codigoMunicipio ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>Código</Text>
                  <Text style={styles.kvVal}>{String(userData.tituloMinero.codigoMunicipio)}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>
                ⚠️ No hay título minero asignado. Sin título, no podrás ver estadísticas.
              </Text>
            </View>
          )}
        </View>

        {/* Estadísticas */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>📊 Resumen de Actividades</Text>
          <TouchableOpacity
            onPress={() => tituloMineroId && cargarEstadisticas(tituloMineroId)}
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>Actualizar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalNumber}>{estadisticas.totalPuntos}</Text>
          <Text style={styles.totalLabel}>Puntos Registrados</Text>
          <Text style={styles.totalHint}>
            Basado en {tituloMineroId ? 'tu título minero' : 'sesión'}.
          </Text>
        </View>

        <View style={styles.grid}>
          {CAT.map((c) => {
            const s = estadisticas?.[c.key] || { count: 0, volumen: 0 };
            return (
              <View key={c.key} style={[styles.catCard, { borderLeftColor: c.border }]}>
                <Text style={styles.catEmoji}>{c.emoji}</Text>
                <Text style={styles.catName}>{c.label}</Text>
                <Text style={styles.catCount}>{s.count} puntos</Text>
                <Text style={styles.catVol}>{safeNumber(s.volumen).toFixed(2)} m³</Text>
              </View>
            );
          })}
        </View>

        {/* Acciones rápidas */}
        <Text style={styles.sectionTitle}>🚀 Acciones Rápidas</Text>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#06b6d4' }]}
          onPress={() => navigation.navigate('RegistrarPunto')}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>📍</Text>
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>Registrar Punto de Actividad</Text>
            <Text style={styles.actionDesc}>Marcar ubicación georeferenciada</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#10b981' }]}
          onPress={() => navigation.navigate('HistorialPuntos')}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>📋</Text>
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>Ver Historial</Text>
            <Text style={styles.actionDesc}>Consultar puntos registrados</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  content: { flex: 1 },
  contentPad: { padding: 15, paddingBottom: 24 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#666' },
  errorTitle: { fontSize: 18, color: '#ef4444', fontWeight: '800', marginBottom: 6 },
  errorSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },

  welcomeCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginBottom: 14,
  },
  welcomeTitle: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 6 },
  welcomeSubtitle: { fontSize: 13.5, color: '#666', lineHeight: 18 },

  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 14,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 15.5, fontWeight: '900', color: COLORS.primary },
  pill: { backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '800', color: '#333' },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  kvKey: { fontSize: 13.5, color: '#666', fontWeight: '700', flex: 1 },
  kvVal: { fontSize: 13.5, color: '#111', fontWeight: '700', flex: 1.5, textAlign: 'right' },
  kvValStrong: { fontSize: 13.5, color: COLORS.primary, fontWeight: '900', flex: 1.5, textAlign: 'right' },

  divider: { height: 1, backgroundColor: '#eaeaea', marginVertical: 12 },

  warnBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginTop: 10,
  },
  warnText: { fontSize: 13, color: '#856404', fontWeight: '700', lineHeight: 18 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111', marginTop: 8, marginBottom: 10 },
  linkBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
  linkBtnText: { fontSize: 13, fontWeight: '900', color: '#333' },

  totalCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginBottom: 14,
  },
  totalNumber: { fontSize: 52, fontWeight: '900', color: COLORS.primary, marginBottom: 4 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#444' },
  totalHint: { fontSize: 12.5, color: '#888', marginTop: 6, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  catCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 14,
  },
  catEmoji: { fontSize: 34, marginBottom: 10 },
  catName: { fontSize: 14, fontWeight: '900', color: '#111', marginBottom: 6 },
  catCount: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 4 },
  catVol: { fontSize: 13, fontWeight: '800', color: '#666' },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIconText: { fontSize: 24 },
  actionBody: { flex: 1 },
  actionTitle: { fontSize: 15.5, fontWeight: '900', color: 'white', marginBottom: 4 },
  actionDesc: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
  actionArrow: { fontSize: 24, fontWeight: '900', color: 'white' },

  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButtonText: { color: 'white', fontSize: 16, fontWeight: '900' },
});

export default HomeScreen;
