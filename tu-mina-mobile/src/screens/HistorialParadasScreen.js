// src/screens/HistorialParadasScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert, TextInput, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import HeaderComponent from '../components/HeaderComponent';
import Breadcrumb from '../components/Breadcrumb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { paradasService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

// ─── Helpers de fecha Colombia ────────────────────────────────────────────────
// El backend retorna timestamps como strings "YYYY-MM-DDTHH:MM:SS" (sin Z),
// ya en hora Colombia. Los parsearemos directamente del string, SIN usar
// new Date() para evitar conversiones de zona horaria.

/** Extrae "HH:MM" de un string ISO naívo "YYYY-MM-DDTHH:MM:SS" */
const formatSoloHora = (iso) => {
  if (!iso) return '—';
  const match = String(iso).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : '—';
};

/** Formatea como "DD/MM/YYYY HH:MM" sin conversión de zona */
const formatFechaHora = (iso) => {
  if (!iso) return '—';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return '—';
  return `${m[3]}/${m[2]}/${m[1]}  ${m[4]}:${m[5]}`;
};

const formatMinutos = (mins) => {
  if (mins === null || mins === undefined) return '—';
  const m = Number(mins);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
};

/** Obtiene "YYYY-MM-DD" para Colombia ahora mismo */
const colombiaToday = () => {
  const local = new Date(Date.now() - 5 * 3600000);
  return local.toISOString().split('T')[0];
};

/** Compara la parte de fecha del string ISO con la fecha Colombia de hoy */
const eHoy = (iso) => {
  if (!iso) return false;
  return String(iso).split('T')[0] === colombiaToday();
};

// ─────────────────────────────────────────────────────────────────────────────

const HistorialParadasScreen = ({ navigation }) => {
  const [todasLasParadas, setTodasLasParadas]   = useState([]);
  const [paradasFiltradas, setParadasFiltradas] = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [userData, setUserData]                 = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [busqueda, setBusqueda]         = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');

  useFocusEffect(useCallback(() => { onRefresh(); }, []));
  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { aplicarFiltros(); }, [todasLasParadas, busqueda, filtroMotivo]);

  const cargarDatos = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (raw) {
        const user = JSON.parse(raw);
        setUserData(user);
        const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId;
        if (tituloMineroId) await cargarParadas(tituloMineroId);
      }
    } catch (e) { console.error('Error cargando datos:', e); }
    finally { setLoading(false); }
  };

  const cargarParadas = async (tituloMineroId) => {
    try {
      const resp = await paradasService.getParadas(tituloMineroId);
      if (resp?.success && Array.isArray(resp?.data)) {
        setTodasLasParadas(resp.data);
        setUltimaActualizacion(new Date());
      } else { setTodasLasParadas([]); }
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar las paradas');
      setTodasLasParadas([]);
    }
  };


  const confirmarEliminar = (item) => {
    if (!eHoy(item.inicio)) {
      Alert.alert("🔒 No permitido", "Solo se pueden eliminar paros del día de hoy.");
      return;
    }
    Alert.alert(
      "🗑️ Eliminar paro",
      `¿Eliminar el paro "${item.motivoNombre || item.motivoCodigo}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => ejecutarEliminar(item.id),
        },
      ]
    );
  };

  const ejecutarEliminar = async (id) => {
    try {
      const resp = await paradasService.eliminarParada(id);
      if (resp?.success) {
        setTodasLasParadas(prev => prev.filter(p => p.id !== id));
      } else {
        Alert.alert("Error", resp?.message || "No se pudo eliminar el paro.");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo conectar con el servidor.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (raw) {
      const user = JSON.parse(raw);
      if (!userData) setUserData(user);
      const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId;
      if (tituloMineroId) await cargarParadas(tituloMineroId);
    }
    setRefreshing(false);
  };

  const aplicarFiltros = () => {
    let r = [...todasLasParadas];
    if (filtroMotivo) r = r.filter(p => p.motivoCodigo === filtroMotivo);
    if (busqueda.trim()) {
      const t = busqueda.toLowerCase();
      r = r.filter(p =>
        p.motivoNombre?.toLowerCase().includes(t) ||
        p.motivoOtro?.toLowerCase().includes(t)  ||
        p.observaciones?.toLowerCase().includes(t)
      );
    }
    setParadasFiltradas(r);
  };

  const limpiarFiltros = () => { setBusqueda(''); setFiltroMotivo(''); };

  const statsHoy = () => {
    const hoy = todasLasParadas.filter(p => eHoy(p.inicio));
    return {
      cantidad:      hoy.length,
      totalMinutos:  hoy.reduce((s, p) => s + (Number(p.minutesParo) || 0), 0),
    };
  };

  const motivosUnicos = () => {
    const mapa = {};
    todasLasParadas.forEach(p => {
      if (p.motivoCodigo && !mapa[p.motivoCodigo])
        mapa[p.motivoCodigo] = p.motivoNombre || p.motivoCodigo;
    });
    return Object.entries(mapa).map(([codigo, nombre]) => ({ codigo, nombre }));
  };

  const renderParada = ({ item }) => {
    const esDeHoy       = eHoy(item.inicio);
    const minutos       = Number(item.minutesParo ?? item.minutos_paro ?? 0);
    const motivoDisplay = item.motivoNombre || item.motivoCodigo || '—';
    return (
      <View style={styles.card}>
        <View style={styles.cardIndicator} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardMotivo}>🛑 {motivoDisplay}</Text>
              {item.motivoOtro && item.motivoCodigo === 'OTRO' && (
                <Text style={styles.cardMotivoOtro}>"{item.motivoOtro}"</Text>
              )}
            </View>
            <View style={styles.minutosBadge}>
              <Text style={styles.minutosBadgeText}>{formatMinutos(minutos)}</Text>
            </View>
          </View>

          <View style={styles.horarioRow}>
            <View style={styles.horarioItem}>
              <Text style={styles.horarioLabel}>▶ Inicio</Text>
              <Text style={styles.horarioValue}>{formatSoloHora(item.inicio)}</Text>
            </View>
            <View style={styles.horarioSeparator}>
              <Text style={styles.horarioFlecha}>→</Text>
            </View>
            <View style={styles.horarioItem}>
              <Text style={styles.horarioLabel}>⏹ Fin</Text>
              <Text style={styles.horarioValue}>{formatSoloHora(item.fin)}</Text>
            </View>
          </View>

          {item.observaciones && (
            <Text style={styles.cardObservaciones}>💬 {item.observaciones}</Text>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.cardFecha}>{formatFechaHora(item.inicio)}</Text>
            <View style={styles.cardFooterRight}>
              {esDeHoy && (
                <View style={styles.hoyBadge}>
                  <Text style={styles.hoyBadgeText}>HOY</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.editBtn, !esDeHoy && styles.editBtnLocked]}
                onPress={() => navigation.navigate('EditarParada', { parada: item })}
              >
                <Text style={styles.editBtnText}>{esDeHoy ? '✏️' : '🔒'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, !esDeHoy && styles.deleteBtnLocked]}
                onPress={() => confirmarEliminar(item)}
              >
                <Text style={styles.deleteBtnText}>{esDeHoy ? '🗑️' : '🔒'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#e74c3c" />
      <Text style={styles.loadingText}>Cargando paradas...</Text>
    </View>
  );

  const stats      = statsHoy();
  const motivos    = motivosUnicos();
  const hayFiltros = busqueda || filtroMotivo;

  return (
    <View style={styles.container}>
      <HeaderComponent />
      <Breadcrumb items={[{ label: 'Inicio', screen: 'Home' }, { label: 'Historial de Paradas' }]} />

      <View style={styles.pageHeader}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>🛑 Historial de Paradas</Text>
            <Text style={styles.pageSubtitle}>
              {paradasFiltradas.length} de {todasLasParadas.length} registros
            </Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
            <Text style={styles.iconButtonText}>{refreshing ? '⏳' : '🔄'}</Text>
            <Text style={styles.iconButtonLabel}>Recargar</Text>
          </TouchableOpacity>
        </View>

        {stats.cantidad > 0 && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>📊 Hoy:</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.cantidad}</Text>
                <Text style={styles.statLabel}>paros</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#e74c3c' }]}>
                  {formatMinutos(stats.totalMinutos)}
                </Text>
                <Text style={styles.statLabel}>tiempo parado</Text>
              </View>
            </View>
          </View>
        )}

        {ultimaActualizacion && (
          <Text style={styles.ultimaActualizacion}>
            Última actualización: {ultimaActualizacion.toLocaleTimeString('es-CO')}
          </Text>
        )}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar por motivo u observación..."
          value={busqueda}
          onChangeText={setBusqueda}
          placeholderTextColor="#999"
        />
        {hayFiltros && (
          <TouchableOpacity style={styles.clearButton} onPress={limpiarFiltros}>
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {motivos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtrosScroll}
          contentContainerStyle={styles.filtrosContainer}
        >
          <TouchableOpacity
            style={[styles.filtroChip, !filtroMotivo && styles.filtroChipActive]}
            onPress={() => setFiltroMotivo('')}
          >
            <Text style={[styles.filtroText, !filtroMotivo && styles.filtroTextActive]}>
              Todos ({todasLasParadas.length})
            </Text>
          </TouchableOpacity>
          {motivos.map(({ codigo, nombre }) => {
            const count  = todasLasParadas.filter(p => p.motivoCodigo === codigo).length;
            const activo = filtroMotivo === codigo;
            return (
              <TouchableOpacity
                key={codigo}
                style={[styles.filtroChip, activo && styles.filtroChipRojo]}
                onPress={() => setFiltroMotivo(activo ? '' : codigo)}
              >
                <Text style={[styles.filtroText, activo && styles.filtroTextActive]}>
                  {nombre} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={paradasFiltradas}
        keyExtractor={item => item.id}
        renderItem={renderParada}
        contentContainerStyle={styles.lista}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e74c3c']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛑</Text>
            <Text style={styles.emptyTitle}>Sin paradas</Text>
            <Text style={styles.emptySubtitle}>
              {hayFiltros ? 'Ningún registro coincide con el filtro' : 'No hay paradas registradas aún'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText:      { marginTop: 10, fontSize: 16, color: '#666' },

  pageHeader:      { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTop:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  pageTitle:       { fontSize: 20, fontWeight: '900', color: '#333' },
  pageSubtitle:    { fontSize: 13, color: '#888', marginTop: 2 },
  iconButton:      { alignItems: 'center', padding: 6, marginLeft: 8 },
  iconButtonText:  { fontSize: 22 },
  iconButtonLabel: { fontSize: 10, color: '#888', marginTop: 2 },

  statsCard:   { backgroundColor: '#fff3f3', borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#e74c3c' },
  statsTitle:  { fontSize: 13, fontWeight: '700', color: '#c0392b', marginBottom: 8 },
  statsRow:    { flexDirection: 'row', alignItems: 'center' },
  statItem:    { flex: 1, alignItems: 'center' },
  statNumber:  { fontSize: 22, fontWeight: '900', color: '#333' },
  statLabel:   { fontSize: 11, color: '#888', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#f5c6c6', marginHorizontal: 12 },

  ultimaActualizacion: { fontSize: 11, color: '#aaa', textAlign: 'right' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput:     { flex: 1, height: 40, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: '#333', backgroundColor: '#fafafa' },
  clearButton:     { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8 },
  clearButtonText: { color: '#e74c3c', fontSize: 13, fontWeight: '700' },

  filtrosScroll:    { maxHeight: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filtrosContainer: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filtroChip:       { height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' },
  filtroChipActive: { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },
  filtroChipRojo:   { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },
  filtroText:       { fontSize: 13, color: '#666', fontWeight: '600' },
  filtroTextActive: { color: '#fff' },

  lista: { padding: 12, paddingBottom: 40 },

  card:          { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3, overflow: 'hidden' },
  cardIndicator: { width: 5, backgroundColor: '#e74c3c' },
  cardContent:   { flex: 1, padding: 14 },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardMotivo:    { fontSize: 15, fontWeight: '800', color: '#333', flex: 1 },
  cardMotivoOtro:{ fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 3 },

  minutosBadge:     { backgroundColor: '#e74c3c', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  minutosBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  horarioRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  horarioItem:      { flex: 1, alignItems: 'center' },
  horarioLabel:     { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 4 },
  horarioValue:     { fontSize: 18, fontWeight: '900', color: '#333' },
  horarioSeparator: { alignItems: 'center', marginHorizontal: 8 },
  horarioFlecha:    { fontSize: 20, color: '#bbb' },

  cardObservaciones: { fontSize: 13, color: '#666', marginBottom: 8, fontStyle: 'italic' },
  cardFooter:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardFecha:         { fontSize: 12, color: '#999', flex: 1 },
  cardFooterRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },

  hoyBadge:     { backgroundColor: '#27ae60', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  hoyBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  editBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff8e1', borderWidth: 1.5, borderColor: '#f39c12', alignItems: 'center', justifyContent: 'center' },
  editBtnLocked: { backgroundColor: '#f5f5f5', borderColor: '#ccc' },
  editBtnText:   { fontSize: 16 },
  deleteBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff0f0', borderWidth: 1.5, borderColor: '#e74c3c', alignItems: 'center', justifyContent: 'center' },
  deleteBtnLocked: { backgroundColor: '#f5f5f5', borderColor: '#ccc' },
  deleteBtnText:   { fontSize: 16 },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:      { fontSize: 64, marginBottom: 16 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 8 },
  emptySubtitle:  { fontSize: 14, color: '#888', textAlign: 'center' },
});

export default HistorialParadasScreen;