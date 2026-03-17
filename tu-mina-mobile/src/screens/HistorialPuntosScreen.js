import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import HeaderComponent from '../components/HeaderComponent';
import Breadcrumb from '../components/Breadcrumb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { actividadService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const CATEGORIA_COLORS = {
  extraccion: '#e74c3c',
  acopio: '#3498db',
  procesamiento: '#f39c12',
  inspeccion: '#27ae60',
};

const CATEGORIA_LABELS = {
  extraccion: '⛏️ Extracción',
  acopio: '📦 Acopio',
  procesamiento: '⚙️ Procesamiento',
  inspeccion: '🔍 Inspección',
};

const HistorialPuntosScreen = ({ navigation }) => {
  const [todosLosPuntos, setTodosLosPuntos] = useState([]);
  const [puntosFiltrados, setPuntosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  
  const [modalExportar, setModalExportar] = useState(false);
  const [exportando, setExportando] = useState(false);

  const fadeAnim = useState(new Animated.Value(0))[0];

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Recargando historial...');
      onRefresh();
    }, [])
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [todosLosPuntos, filtroCategoria, busqueda]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const cargarDatos = async () => {
    try {
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        const user = JSON.parse(userDataString);
        setUserData(user);

        const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId;

        if (tituloMineroId) {
          await cargarPuntos(tituloMineroId);
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPuntos = async (tituloMineroId) => {
    try {
      console.log('📥 Cargando puntos...');

      const resp = await actividadService.getPuntos(tituloMineroId);

      if (resp?.success && Array.isArray(resp?.data)) {
        console.log(`✅ ${resp.data.length} puntos cargados`);
        setTodosLosPuntos(resp.data);
        setUltimaActualizacion(new Date());
      } else {
        setTodosLosPuntos([]);
      }
    } catch (e) {
      console.error('❌ Error:', e?.message || e);
      Alert.alert('Error', 'No se pudieron cargar los puntos');
      setTodosLosPuntos([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    if (!userData) {
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        const user = JSON.parse(userDataString);
        setUserData(user);
        const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId;
        if (tituloMineroId) await cargarPuntos(tituloMineroId);
      }
    } else {
      const tituloMineroId = userData?.tituloMinero?.id || userData?.tituloMineroId;
      if (tituloMineroId) await cargarPuntos(tituloMineroId);
    }

    setRefreshing(false);
  };

  const aplicarFiltros = () => {
    let resultado = [...todosLosPuntos];

    if (filtroCategoria) {
      resultado = resultado.filter((p) => p.categoria === filtroCategoria);
    }

    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          p.descripcion?.toLowerCase().includes(termino) ||
          p.maquinaria?.toLowerCase().includes(termino)
      );
    }

    setPuntosFiltrados(resultado);
  };

  const limpiarFiltros = () => {
    setFiltroCategoria('');
    setBusqueda('');
  };

  // Helper Colombia: "YYYY-MM-DD" de hoy en Bogotá (UTC-5)
  const colombiaToday = () => {
    const local = new Date(Date.now() - 5 * 3600000);
    return local.toISOString().split('T')[0];
  };

  const calcularEstadisticasHoy = () => {
    const hoy = colombiaToday();
    const puntosHoy = todosLosPuntos.filter((p) => {
      const f = p.fecha || p.createdAt || p.fechaRegistro;
      if (!f) return false;
      // El backend devuelve "YYYY-MM-DDTHH:MM:SS" sin Z → extraer parte de fecha
      return String(f).split('T')[0] === hoy;
    });

    const volumenTotal = puntosHoy.reduce(
      (sum, p) => sum + (parseFloat(p.volumenM3 || p.volumen_m3) || 0),
      0
    );

    return { 
      total: puntosHoy.length, 
      volumenTotal: volumenTotal || 0  // ✅ Valor por defecto
    };
  };

  // "YYYY-MM-DD" en hora Colombia para comparar con punto.dia
  const colombiaTodayStr = () => {
    const local = new Date(Date.now() - 5 * 3600000);
    return local.toISOString().split('T')[0];
  };

  const esDeHoy = (dia) => !!dia && String(dia).split('T')[0] === colombiaTodayStr();

  const confirmarEditar = (punto) => {
    if (!esDeHoy(punto.dia)) {
      Alert.alert('🔒 No permitido', 'Solo se pueden editar puntos del día de hoy.');
      return;
    }
    navigation.navigate('EditarPunto', { punto });
  };

  const confirmarEliminar = (punto) => {
    if (!esDeHoy(punto.dia)) {
      Alert.alert('🔒 No permitido', 'Solo se pueden eliminar puntos del día de hoy.');
      return;
    }
    Alert.alert(
      '🗑️ Eliminar Punto',
      `¿Eliminar el punto "${punto.itemDisplay || punto.itemNombre || punto.categoria}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => ejecutarEliminar(punto.id),
        },
      ]
    );
  };

  const ejecutarEliminar = async (id) => {
    try {
      const resp = await actividadService.eliminarPunto(id);
      if (resp?.success) {
        setTodosLosPuntos(prev => prev.filter(p => p.id !== id));
      } else {
        Alert.alert('Error', resp?.message || 'No se pudo eliminar el punto.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    }
  };

  const contarPorCategoria = (categoria) => {
    if (!categoria) return todosLosPuntos.length;
    return todosLosPuntos.filter((p) => p.categoria === categoria).length;
  };

  const renderPunto = ({ item, index }) => {
    const rawFecha = item.fechaRegistro ?? item.createdAt ?? item.fecha ?? null;

    // El backend devuelve fecha como "YYYY-MM-DDTHH:MM:SS" (sin Z, hora Colombia).
    // Extraemos directamente del string para evitar conversión de zona horaria.
    let fechaTexto = '—';
    if (rawFecha) {
      const s = String(rawFecha);
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (m) fechaTexto = `${m[3]}/${m[2]}/${m[1]}  ${m[4]}:${m[5]}`;
    }

    const volumen = item.volumenM3 ?? item.volumen_m3 ?? null;
    const color = CATEGORIA_COLORS[item.categoria] ?? '#7f8c8d';
    const esMasReciente = index === 0 && !filtroCategoria && !busqueda;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.puntoCard}>
          <View style={[styles.categoriaIndicator, { backgroundColor: color }]} />

          <View style={styles.puntoContent}>
            <View style={styles.headerRow}>
              <Text style={styles.categoriaLabel}>
                {CATEGORIA_LABELS[item.categoria] ?? '📍 Punto'}
              </Text>
              {esMasReciente && (
                <View style={styles.nuevoBadge}>
                  <Text style={styles.nuevoText}>NUEVO</Text>
                </View>
              )}
            </View>

            {item.descripcion && (
              <Text style={styles.descripcion}>{item.descripcion}</Text>
            )}

            {(item.itemDisplay || item.itemNombre) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📦 Ítem:</Text>
                <Text style={styles.infoValue}>{item.itemDisplay || item.itemNombre}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📍 Ubicación:</Text>
              <Text style={styles.infoValue}>
                {parseFloat(item.latitud).toFixed(6)}, {parseFloat(item.longitud).toFixed(6)}
              </Text>
            </View>

            {(item.maquinariaNombre || item.maquinaria) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🚜 Maquinaria:</Text>
                <Text style={styles.infoValue}>{item.maquinariaNombre || item.maquinaria}</Text>
              </View>
            )}

            {volumen !== null && volumen !== undefined && volumen !== '' && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📊 Volumen:</Text>
                <Text style={styles.infoValue}>{volumen} m³</Text>
              </View>
            )}

            <View style={styles.footerRow}>
              <Text style={styles.fecha}>🕒 {fechaTexto}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnEdit, !esDeHoy(item.dia) && styles.actionBtnLocked]}
                  onPress={() => confirmarEditar(item)}
                >
                  <Text style={styles.actionBtnText}>{esDeHoy(item.dia) ? '✏️' : '🔒'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDelete, !esDeHoy(item.dia) && styles.actionBtnLocked]}
                  onPress={() => confirmarEliminar(item)}
                >
                  <Text style={styles.actionBtnText}>{esDeHoy(item.dia) ? '🗑️' : '🔒'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const statsHoy = calcularEstadisticasHoy();

  return (
    <View style={styles.container}>
      <HeaderComponent />
      <Breadcrumb items={[{ label: 'Home', screen: 'Home' }, { label: 'Historial' }]} />

      {/* Header */}
      <View style={styles.pageHeader}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>📋 Historial de Puntos</Text>
            <Text style={styles.pageSubtitle}>
              {puntosFiltrados.length} de {todosLosPuntos.length} puntos
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('RegistrarPunto')}
            >
              <Text style={styles.iconButtonText}>➕</Text>
              <Text style={styles.iconButtonLabel}>Nuevo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('MapaHistorial', { puntos: puntosFiltrados })}
            >
              <Text style={styles.iconButtonText}>🗺️</Text>
              <Text style={styles.iconButtonLabel}>Mapa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
              <Text style={styles.iconButtonText}>{refreshing ? '⏳' : '🔄'}</Text>
              <Text style={styles.iconButtonLabel}>Recargar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Estadísticas */}
        {statsHoy.total > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>📊 Hoy:</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statItem}>{statsHoy.total} puntos</Text>
              <Text style={styles.statSeparator}>•</Text>
              <Text style={styles.statItem}>{statsHoy.volumenTotal.toFixed(1)} m³</Text>
            </View>
          </View>
        )}

        {ultimaActualizacion && (
          <Text style={styles.ultimaActualizacion}>
            Última actualización: {ultimaActualizacion.toLocaleTimeString('es-CO')}
          </Text>
        )}
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar..."
          value={busqueda}
          onChangeText={setBusqueda}
          placeholderTextColor="#999"
        />
        {(busqueda || filtroCategoria) && (
          <TouchableOpacity style={styles.clearButton} onPress={limpiarFiltros}>
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[styles.filtroButton, !filtroCategoria && styles.filtroButtonActive]}
          onPress={() => setFiltroCategoria('')}
        >
          <Text style={[styles.filtroText, !filtroCategoria && styles.filtroTextActive]}>
            Todos ({contarPorCategoria('')})
          </Text>
        </TouchableOpacity>

        {Object.keys(CATEGORIA_COLORS).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filtroButton,
              filtroCategoria === cat && {
                backgroundColor: CATEGORIA_COLORS[cat],
                borderColor: CATEGORIA_COLORS[cat],
              },
            ]}
            onPress={() => setFiltroCategoria(cat)}
          >
            <Text style={[styles.filtroText, filtroCategoria === cat && { color: '#fff' }]}>
              {CATEGORIA_LABELS[cat].split(' ')[0]} ({contarPorCategoria(cat)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={puntosFiltrados}
        renderItem={renderPunto}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{busqueda || filtroCategoria ? '🔍' : '📍'}</Text>
            <Text style={styles.emptyText}>
              {busqueda || filtroCategoria ? 'No se encontraron puntos' : 'Sin puntos'}
            </Text>
            {!busqueda && !filtroCategoria && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('RegistrarPunto')}
              >
                <Text style={styles.emptyButtonText}>📍 Registrar Punto</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  pageHeader: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  pageSubtitle: { fontSize: 14, color: '#666' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  // ✅ BOTONES MÁS GRANDES CON ETIQUETAS
  iconButton: { 
    alignItems: 'center', 
    backgroundColor: '#f0f0f0', 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
  },
  iconButtonText: { fontSize: 24 },
  iconButtonLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  statsContainer: { marginTop: 15, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  statsTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { fontSize: 13, color: '#666' },
  statSeparator: { marginHorizontal: 8, color: '#ccc' },
  ultimaActualizacion: { fontSize: 12, color: '#999', marginTop: 10, fontStyle: 'italic' },
  searchContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', gap: 10 },
  searchInput: { flex: 1, height: 40, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, backgroundColor: '#f9f9f9' },
  clearButton: { justifyContent: 'center', paddingHorizontal: 12 },
  clearButtonText: { color: COLORS.primary, fontWeight: '600' },
  filtrosContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', gap: 8, flexWrap: 'wrap' },
  filtroButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  filtroButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filtroTextActive: { color: '#fff' },
  listContent: { padding: 15, paddingBottom: 100 },
  puntoCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, flexDirection: 'row' },
  categoriaIndicator: { width: 6 },
  puntoContent: { flex: 1, padding: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoriaLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  nuevoBadge: { backgroundColor: '#4caf50', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  nuevoText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  descripcion: { fontSize: 14, color: '#666', marginBottom: 10, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', marginBottom: 5 },
  infoLabel: { fontSize: 13, color: '#666', width: 100 },
  infoValue: { flex: 1, fontSize: 13, color: '#333', fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  fecha: { fontSize: 12, color: '#999', flex: 1 },
  cardActions:     { flexDirection: 'row', gap: 8 },
  actionBtn:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  actionBtnEdit:   { backgroundColor: '#fff8e1', borderColor: '#f39c12' },
  actionBtnDelete: { backgroundColor: '#fff0f0', borderColor: '#e74c3c' },
  actionBtnLocked: { backgroundColor: '#f5f5f5', borderColor: '#ccc' },
  actionBtnText:   { fontSize: 15 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 60, paddingTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyText: { fontSize: 18, color: '#333', fontWeight: '600', textAlign: 'center', marginBottom: 30 },
  emptyButton: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  modalText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#f0f0f0' },
  modalButtonConfirm: { backgroundColor: COLORS.primary },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalButtonTextCancel: { color: '#666', fontSize: 16, fontWeight: '600' },
});

export default HistorialPuntosScreen;