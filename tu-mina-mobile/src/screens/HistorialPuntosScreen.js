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

  // ✅ FIX: Agregar valor por defecto para volumenTotal
  const calcularEstadisticasHoy = () => {
    const hoy = new Date().toDateString();
    const puntosHoy = todosLosPuntos.filter(
      (p) => new Date(p.fecha || p.createdAt).toDateString() === hoy
    );

    const volumenTotal = puntosHoy.reduce(
      (sum, p) => sum + (parseFloat(p.volumenM3 || p.volumen_m3) || 0),
      0
    );

    return { 
      total: puntosHoy.length, 
      volumenTotal: volumenTotal || 0  // ✅ Valor por defecto
    };
  };

  const exportarCSV = async () => {
    try {
      setExportando(true);

      // ✅ BOM para que Excel abra bien el UTF-8
      const BOM = '\ufeff';

      const csvBody = [
        'Fecha,Categoría,Latitud,Longitud,Descripción,Maquinaria,Volumen (m³)',
        ...puntosFiltrados.map((p) => {
          const fecha = p.fecha || p.createdAt || '';
          const fechaFormateada = fecha ? new Date(fecha).toLocaleString('es-CO') : '';

          // ✅ usa llaves consistentes (en su app se ven latitud/longitud)
          const lat = p.latitud ?? p.lat ?? '';
          const lon = p.longitud ?? p.lon ?? '';

          return `"${fechaFormateada}","${p.categoria}","${lat}","${lon}","${p.descripcion || ''}","${p.maquinaria || ''}","${p.volumenM3 || p.volumen_m3 || ''}"`;
        }),
      ].join('\n');

      const csv = BOM + csvBody;

      const fileName = `historial-${new Date().toISOString().split('T')[0]}.csv`;

      // 1) Siempre generar primero en sandbox de la app
      const tempUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(tempUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      // 2) ANDROID: guardar en una carpeta elegida (ideal: Descargas)
      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        const perms = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perms.granted) {
          // fallback: compartir
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(tempUri, { mimeType: 'text/csv', dialogTitle: 'Exportar Historial' });
            Alert.alert('✅ Exportado', 'Se abrió el menú para compartir el CSV.');
          } else {
            Alert.alert('✅ Exportado', `CSV generado en:\n${tempUri}`);
          }
          setModalExportar(false);
          return;
        }

        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          perms.directoryUri,
          fileName,
          'text/csv'
        );

        await FileSystem.writeAsStringAsync(destUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

        Alert.alert('✅ Exportado', 'CSV guardado en la carpeta seleccionada (recomendado: Descargas).');
        setModalExportar(false);
        return;
      }

      // 3) iOS / fallback: compartir
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempUri, { mimeType: 'text/csv', dialogTitle: 'Exportar Historial' });
        Alert.alert('✅ Exportado', 'Se abrió el menú para compartir el CSV.');
      } else {
        Alert.alert('✅ Exportado', `CSV generado en:\n${tempUri}`);
      }

      setModalExportar(false);
    } catch (error) {
      console.error(error);
      Alert.alert('❌ Error', 'No se pudo exportar el CSV');
    } finally {
      setExportando(false);
    }
  };

  const eliminarPunto = (punto) => {
    Alert.alert(
      '🗑️ Eliminar Punto',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setTodosLosPuntos(prev => prev.filter(p => p.id !== punto.id));
            Alert.alert('✅ Eliminado');
          },
        },
      ]
    );
  };

  const contarPorCategoria = (categoria) => {
    if (!categoria) return todosLosPuntos.length;
    return todosLosPuntos.filter((p) => p.categoria === categoria).length;
  };

  const renderPunto = ({ item, index }) => {
    const rawFecha = item.fechaRegistro ?? item.createdAt ?? item.fecha ?? null;

    let fechaTexto = '—';
    if (rawFecha) {
      const d = new Date(rawFecha);
      if (!Number.isNaN(d.getTime())) {
        fechaTexto = d.toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
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

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📍 Ubicación:</Text>
              <Text style={styles.infoValue}>
                {parseFloat(item.latitud).toFixed(6)}, {parseFloat(item.longitud).toFixed(6)}
              </Text>
            </View>

            {item.maquinaria && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🚜 Maquinaria:</Text>
                <Text style={styles.infoValue}>{item.maquinaria}</Text>
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
              
              <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarPunto(item)}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
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

          {/* ✅ BOTONES MÁS GRANDES Y VISIBLES */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                console.log('🗺️ Navegando a mapa...');
                navigation.navigate('MapaHistorial', { puntos: puntosFiltrados });
              }}
            >
              <Text style={styles.iconButtonText}>🗺️</Text>
              <Text style={styles.iconButtonLabel}>Mapa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setModalExportar(true)}
            >
              <Text style={styles.iconButtonText}>📥</Text>
              <Text style={styles.iconButtonLabel}>CSV</Text>
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
                <Text style={styles.emptyButtonText}>Registrar Punto</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* FAB */}
      {puntosFiltrados.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('RegistrarPunto')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Modal Exportar */}
      <Modal visible={modalExportar} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📥 Exportar</Text>
            <Text style={styles.modalText}>
              Se exportarán {puntosFiltrados.length} puntos
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalExportar(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={exportarCSV}
                disabled={exportando}
              >
                {exportando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Exportar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  deleteButton: { padding: 8 },
  deleteIcon: { fontSize: 18 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 60, paddingTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyText: { fontSize: 18, color: '#333', fontWeight: '600', textAlign: 'center', marginBottom: 30 },
  emptyButton: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
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