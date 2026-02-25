// src/screens/RegistrarPuntoScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  FlatList,
} from 'react-native';
import HeaderComponent from '../components/HeaderComponent';
import Breadcrumb from '../components/Breadcrumb';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { actividadService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

// ─── Categorías ───────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: 'extraccion',    label: '⛏️ Extracción',    color: '#e74c3c' },
  { id: 'acopio',        label: '📦 Acopio',         color: '#3498db' },
  { id: 'procesamiento', label: '⚙️ Procesamiento',  color: '#f39c12' },
  { id: 'inspeccion',    label: '🔍 Inspección',      color: '#27ae60' },
];

// ─── Selector reutilizable con picker modal ───────────────────────────────────

const SelectorConPicker = ({
  label,
  placeholder,
  valorSeleccionado,
  onSeleccionar,
  items,
  loading,
  colorActivo,
  otroValue,
  onOtroChange,
  labelOtro,
  placeholderOtro,
}) => {
  const [visible, setVisible] = useState(false);
  const esOtro = valorSeleccionado?.codigo === 'OTRO';
  const textoSelector = valorSeleccionado
    ? (esOtro ? '✏️ Otro (escribir)' : (valorSeleccionado.display || valorSeleccionado.nombre))
    : null;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.selector,
          valorSeleccionado && { borderColor: colorActivo, backgroundColor: colorActivo + '10' },
        ]}
        onPress={() => setVisible(true)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colorActivo} />
        ) : (
          <>
            <Text style={[styles.selectorText, valorSeleccionado && { color: '#222', fontWeight: '700' }]}>
              {textoSelector ?? placeholder}
            </Text>
            <Text style={[styles.selectorArrow, { color: colorActivo }]}>▼</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Campo "Otro" condicional */}
      {esOtro && (
        <View style={styles.otroContainer}>
          <Text style={styles.label}>{labelOtro ?? 'Describe *'}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholderOtro ?? 'Escribe aquí...'}
            value={otroValue}
            onChangeText={onOtroChange}
            multiline
            numberOfLines={2}
          />
        </View>
      )}

      {/* Modal picker */}
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={[styles.pickerHeader, { borderBottomColor: colorActivo }]}>
              <Text style={[styles.pickerTitle, { color: colorActivo }]}>{label}</Text>
            </View>

            {loading ? (
              <View style={styles.pickerLoading}>
                <ActivityIndicator size="large" color={colorActivo} />
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={item => item.id}
                style={styles.pickerList}
                renderItem={({ item }) => {
                  const isOtro   = item.codigo === 'OTRO';
                  const isActive = valorSeleccionado?.id === item.id;
                  const texto    = isOtro ? '✏️  Otro (escribir)' : (item.display || item.nombre);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.itemRow,
                        isActive && { backgroundColor: colorActivo + '18' },
                        isOtro   && styles.itemRowOtro,
                      ]}
                      onPress={() => {
                        onSeleccionar(item);
                        setVisible(false);
                        if (!isOtro && onOtroChange) onOtroChange('');
                      }}
                    >
                      <Text style={[
                        styles.itemRowText,
                        isActive && { color: colorActivo, fontWeight: '800' },
                        isOtro   && { color: '#888', fontStyle: 'italic' },
                      ]}>
                        {texto}
                      </Text>
                      {isActive && (
                        <Text style={[styles.itemCheck, { color: colorActivo }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              />
            )}

            <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => setVisible(false)}>
              <Text style={styles.pickerCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

const RegistrarPuntoScreen = ({ navigation }) => {
  // Base
  const [location, setLocation]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData]     = useState(null);

  // Categoría
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  // Ítems del catálogo (cambian según categoría)
  const [items, setItems]                       = useState([]);
  const [loadingItems, setLoadingItems]         = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [itemOtro, setItemOtro]                 = useState('');

  // Maquinaria del catálogo
  const [maquinariaLista, setMaquinariaLista]               = useState([]);
  const [loadingMaquinaria, setLoadingMaquinaria]           = useState(false);
  const [maquinariaSeleccionada, setMaquinariaSeleccionada] = useState(null);
  const [maquinariaOtro, setMaquinariaOtro]                 = useState('');

  // Extras
  const [descripcion, setDescripcion] = useState('');
  const [volumen, setVolumen]         = useState('');

  // UI
  const [modoRapido, setModoRapido]                     = useState(false);
  const [puntosRegistradosHoy, setPuntosRegistradosHoy] = useState(0);
  const [mostrarExito, setMostrarExito]                 = useState(false);
  const [puntoExitoso, setPuntoExitoso]                 = useState(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // ── Carga inicial ────────────────────────────────────────────────────────────

  useEffect(() => {
    cargarDatos();
    cargarEstadisticas();
    cargarMaquinaria();   // catálogo fijo, no depende de categoría
  }, []);

  // Cuando cambia la categoría, recarga los ítems y limpia selección anterior
  useEffect(() => {
    if (categoriaSeleccionada) {
      cargarItems(categoriaSeleccionada);
    }
    setItemSeleccionado(null);
    setItemOtro('');
  }, [categoriaSeleccionada]);

  const cargarDatos = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Se necesitan permisos de ubicación');
        navigation.goBack();
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      validarCoordenadas(loc.coords.latitude, loc.coords.longitude);

      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) setUserData(JSON.parse(userDataString));
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (!userDataString) return;
      const user = JSON.parse(userDataString);
      const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId;
      if (!tituloMineroId) return;

      const resp = await actividadService.getPuntos(tituloMineroId);
      if (resp?.success && Array.isArray(resp?.data)) {
        const hoy = new Date().toDateString();
        setPuntosRegistradosHoy(
          resp.data.filter(p => {
            const f = p.fechaRegistro ?? p.createdAt ?? p.fecha;
            return f && new Date(f).toDateString() === hoy;
          }).length
        );
      }
    } catch (error) {
      console.log('Error cargando estadísticas:', error);
    }
  };

  const cargarItems = async (categoria) => {
    try {
      setLoadingItems(true);
      const resp = await actividadService.getItems(categoria);
      setItems(resp?.data ?? []);
    } catch (e) {
      console.error('Error ítems:', e);
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const cargarMaquinaria = async () => {
    try {
      setLoadingMaquinaria(true);
      const resp = await actividadService.getMaquinaria();
      setMaquinariaLista(resp?.data ?? []);
    } catch (e) {
      console.error('Error maquinaria:', e);
      setMaquinariaLista([]);
    } finally {
      setLoadingMaquinaria(false);
    }
  };

  const validarCoordenadas = (lat, lon) => {
    if (lat < -4.5 || lat > 13.5 || lon < -80 || lon > -66) {
      Alert.alert('⚠️ Ubicación Sospechosa', 'Las coordenadas parecen estar fuera de Colombia',
        [{ text: 'Entendido' }]);
    }
  };

  const limpiarFormulario = () => {
    setCategoriaSeleccionada(null);
    setItemSeleccionado(null);
    setItemOtro('');
    setMaquinariaSeleccionada(null);
    setMaquinariaOtro('');
    setDescripcion('');
    setVolumen('');
    setItems([]);
    setPuntoExitoso(null);
  };

  const mostrarModalExito = () => {
    setMostrarExito(true);
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
    }).start();
    setTimeout(() => { scaleAnim.setValue(0); setMostrarExito(false); }, 2000);
  };

  // ── Envío ────────────────────────────────────────────────────────────────────

  const handleRegistrar = async () => {
    if (!categoriaSeleccionada) {
      Alert.alert('Campo requerido', 'Selecciona una categoría'); return;
    }
    if (!itemSeleccionado) {
      Alert.alert('Campo requerido', 'Selecciona un ítem de la lista'); return;
    }
    if (itemSeleccionado.codigo === 'OTRO' && !itemOtro.trim()) {
      Alert.alert('Campo requerido', 'Describe el ítem en el campo "Otro ítem"'); return;
    }
    if (maquinariaSeleccionada?.codigo === 'OTRO' && !maquinariaOtro.trim()) {
      Alert.alert('Campo requerido', 'Describe la maquinaria en el campo "Otra maquinaria"'); return;
    }

    const tituloMineroId = userData?.tituloMinero?.id || userData?.tituloMineroId;
    if (!tituloMineroId) {
      Alert.alert('Error', 'No se encontró el título minero'); return;
    }

    try {
      setSubmitting(true);

      const punto = {
        usuarioId:       userData.id,
        tituloMineroId,
        latitud:         location.latitude,
        longitud:        location.longitude,
        categoria:       categoriaSeleccionada,
        itemId:          itemSeleccionado?.id ?? null,
        itemOtro:        itemSeleccionado?.codigo === 'OTRO' ? itemOtro.trim() : null,
        maquinariaId:    maquinariaSeleccionada?.id ?? null,
        maquinariaOtro:  maquinariaSeleccionada?.codigo === 'OTRO' ? maquinariaOtro.trim() : null,
        descripcion:     descripcion || null,
        volumenM3:       volumen ? parseFloat(volumen) : null,
      };

      const response = await actividadService.registrarPunto(punto);

      if (response?.success) {
        setPuntosRegistradosHoy(prev => prev + 1);
        const nombreItem = itemSeleccionado.codigo === 'OTRO' ? itemOtro.trim() : itemSeleccionado.nombre;
        if (modoRapido) {
          mostrarModalExito();
          limpiarFormulario();
        } else {
          mostrarModalExito();
          setTimeout(() => setPuntoExitoso({ itemNombre: nombreItem }), 2200);
        }
      } else {
        Alert.alert('Error', response?.message || 'No se pudo registrar el punto');
      }
    } catch (error) {
      console.error('Error registrando punto:', error);
      Alert.alert('Error', 'No se pudo registrar el punto');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────────

  const colorCategoria = CATEGORIAS.find(c => c.id === categoriaSeleccionada)?.color ?? COLORS.primary;

  const formularioCompleto =
    !!categoriaSeleccionada &&
    !!itemSeleccionado &&
    !(itemSeleccionado.codigo === 'OTRO' && !itemOtro.trim()) &&
    !(maquinariaSeleccionada?.codigo === 'OTRO' && !maquinariaOtro.trim());

  // ── Loading screen ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <HeaderComponent />
      <Breadcrumb items={[{ label: 'Inicio', screen: 'Home' }, { label: 'Registrar Punto' }]} />

      {/* Modal de éxito (modo rápido) */}
      <Modal visible={mostrarExito} transparent animationType="fade">
        <View style={styles.exitoOverlay}>
          <Animated.View style={[styles.exitoModal, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.exitoIcon}>✅</Text>
            <Text style={styles.exitoText}>¡Registrado!</Text>
          </Animated.View>
        </View>
      </Modal>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Encabezado ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>📍 Registrar Punto</Text>
          <View style={styles.headerRow}>
            <Text style={styles.pageSubtitle}>Marca tu ubicación georeferenciada</Text>
            <View style={styles.contadorBadge}>
              <Text style={styles.contadorText}>Hoy: {puntosRegistradosHoy}</Text>
            </View>
          </View>
        </View>

        {/* ── Modo rápido ── */}
        <View style={styles.modoRapidoContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modoRapidoLabel}>⚡ Modo Registro Rápido</Text>
            <Text style={styles.modoRapidoDesc}>
              {modoRapido ? 'Activo - Registra múltiples puntos' : 'Desactivado'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, modoRapido && styles.toggleActive]}
            onPress={() => setModoRapido(!modoRapido)}
          >
            <View style={[styles.toggleThumb, modoRapido && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        {/* ── Mapa ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Ubicación actual</Text>
          {location && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                mapType="satellite"
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                showsUserLocation
                showsMyLocationButton
              >
                <Marker
                  coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                  title="Tu ubicación"
                  pinColor={COLORS.primary}
                />
              </MapView>
            </View>
          )}
          <View style={styles.coordsCard}>
            <Text style={styles.coordsLabel}>📍 Coordenadas capturadas</Text>
            <Text style={styles.coordsText}>Lat: {location?.latitude.toFixed(6)}</Text>
            <Text style={styles.coordsText}>Lon: {location?.longitude.toFixed(6)}</Text>
          </View>
        </View>

        {/* ── Categoría ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categoría *</Text>
          <View style={styles.categoriaGrid}>
            {CATEGORIAS.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoriaBtn,
                  categoriaSeleccionada === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
                ]}
                onPress={() => setCategoriaSeleccionada(cat.id)}
              >
                <Text style={[
                  styles.categoriaBtnText,
                  categoriaSeleccionada === cat.id && { color: '#fff' },
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Ítem (aparece al seleccionar categoría) ── */}
        {categoriaSeleccionada && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ítem · {CATEGORIAS.find(c => c.id === categoriaSeleccionada)?.label} *
            </Text>
            <SelectorConPicker
              label={`Ítems de ${CATEGORIAS.find(c => c.id === categoriaSeleccionada)?.label}`}
              placeholder="Toca para seleccionar ítem..."
              valorSeleccionado={itemSeleccionado}
              onSeleccionar={setItemSeleccionado}
              items={items}
              loading={loadingItems}
              colorActivo={colorCategoria}
              otroValue={itemOtro}
              onOtroChange={setItemOtro}
              labelOtro="Describe el ítem *"
              placeholderOtro="Ej: Material especial no listado..."
            />
          </View>
        )}

        {/* ── Maquinaria ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚜 Maquinaria</Text>
          <SelectorConPicker
            label="Seleccionar maquinaria"
            placeholder="Toca para seleccionar maquinaria..."
            valorSeleccionado={maquinariaSeleccionada}
            onSeleccionar={setMaquinariaSeleccionada}
            items={maquinariaLista}
            loading={loadingMaquinaria}
            colorActivo="#7c3aed"
            otroValue={maquinariaOtro}
            onOtroChange={setMaquinariaOtro}
            labelOtro="Describe la maquinaria *"
            placeholderOtro="Ej: Retroexcavadora Komatzu 2020..."
          />
        </View>

        {/* ── Detalles adicionales ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles adicionales</Text>

          <Text style={styles.label}>Descripción / Observación</Text>
          <TextInput
            style={[styles.input, { marginBottom: 16 }]}
            placeholder="Ej: Frente norte, material seco..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Volumen (m³)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 15.5"
            value={volumen}
            onChangeText={setVolumen}
            keyboardType="decimal-pad"
          />
        </View>

        {/* ── Botones ── */}
        {puntoExitoso !== null ? (
          <View style={styles.postRegistroContainer}>
            <View style={styles.postRegistroBadge}>
              <Text style={styles.postRegistroIcon}>✅</Text>
              <Text style={styles.postRegistroText}>Punto registrado: {puntoExitoso.itemNombre}</Text>
            </View>
            <TouchableOpacity
              style={styles.historialBtn}
              onPress={() => navigation.navigate('HistorialPuntos')}
            >
              <Text style={styles.historialBtnText}>📋 Ver Historial de Puntos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nuevoBtn} onPress={limpiarFormulario}>
              <Text style={styles.nuevoBtnText}>➕ Registrar otro punto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.cancelBtnText}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.submitBtn, (!formularioCompleto || submitting) && styles.submitBtnDisabled]}
              onPress={handleRegistrar}
              disabled={!formularioCompleto || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>
                    {modoRapido ? '⚡ Registrar Rápido' : '📍 Registrar Punto'}
                  </Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.historialBtn}
              onPress={() => navigation.navigate('HistorialPuntos')}
            >
              <Text style={styles.historialBtnText}>📋 Ver Historial de Puntos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f5f5f5' },
  content:          { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText:      { marginTop: 10, fontSize: 16, color: '#666' },

  // Encabezado
  pageHeader:    { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  pageTitle:     { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  pageSubtitle:  { fontSize: 14, color: '#666', flex: 1 },
  contadorBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  contadorText:  { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Modo rápido
  modoRapidoContainer: {
    backgroundColor: '#fff', padding: 20, marginTop: 15, marginHorizontal: 15,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  modoRapidoLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  modoRapidoDesc:  { fontSize: 12, color: '#666', marginTop: 2 },
  toggle:          { width: 60, height: 32, borderRadius: 16, backgroundColor: '#ddd', padding: 3, justifyContent: 'center' },
  toggleActive:    { backgroundColor: COLORS.primary },
  toggleThumb:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
  toggleThumbActive: { alignSelf: 'flex-end' },

  // Sección genérica
  section: {
    backgroundColor: '#fff', padding: 20, marginTop: 15, marginHorizontal: 15,
    borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },

  // Mapa
  mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 15, borderWidth: 2, borderColor: COLORS.primary },
  map:          { flex: 1 },
  coordsCard:   { backgroundColor: '#f0f8ff', padding: 15, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  coordsLabel:  { color: '#333', fontSize: 14, fontWeight: '600', marginBottom: 5 },
  coordsText:   { color: '#666', fontSize: 13, fontFamily: 'monospace' },

  // Categorías
  categoriaGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoriaBtn:     { flex: 1, minWidth: '45%', padding: 15, borderRadius: 10, backgroundColor: '#f0f0f0', borderWidth: 2, borderColor: '#ddd' },
  categoriaBtnText: { fontSize: 14, color: '#333', textAlign: 'center', fontWeight: '600' },

  // Selector compartido
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: '#ddd', borderRadius: 10, padding: 16,
    backgroundColor: '#fafafa', minHeight: 54,
  },
  selectorText:  { fontSize: 15, color: '#999', flex: 1 },
  selectorArrow: { fontSize: 14, marginLeft: 8 },
  otroContainer: { marginTop: 14 },
  label:         { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#333', backgroundColor: '#fafafa',
  },

  // Botones
  submitBtn:         { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, marginHorizontal: 15, marginTop: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  submitBtnDisabled: { backgroundColor: '#ccc' },
  submitBtnText:     { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secondaryBtn:      { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginHorizontal: 15, marginTop: 12, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  secondaryBtnText:  { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  cancelBtn:         { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginHorizontal: 15, marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ccc' },
  postRegistroContainer: { marginHorizontal: 15, marginBottom: 0 },
  postRegistroBadge:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0fff4', borderRadius: 12, padding: 14, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: '#27ae60' },
  postRegistroIcon:      { fontSize: 24 },
  postRegistroText:      { fontSize: 15, fontWeight: '800', color: '#1a7340', flex: 1 },
  historialBtn:          { backgroundColor: '#fff', padding: 15, borderRadius: 14, alignItems: 'center', marginBottom: 12, marginHorizontal: 15, borderWidth: 1.5, borderColor: COLORS.primary },
  historialBtnText:      { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  nuevoBtn:              { backgroundColor: COLORS.primary, padding: 15, borderRadius: 14, alignItems: 'center', marginBottom: 12, marginHorizontal: 15 },
  nuevoBtnText:          { color: '#fff', fontSize: 15, fontWeight: '800' },
  cancelBtnText:     { color: '#999', fontSize: 16, fontWeight: '600' },

  // Modal éxito
  exitoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  exitoModal:   { backgroundColor: '#fff', padding: 40, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  exitoIcon:    { fontSize: 80, marginBottom: 15 },
  exitoText:    { fontSize: 24, fontWeight: 'bold', color: '#4caf50' },

  // Picker modal
  pickerOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModal:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  pickerHeader:    { borderBottomWidth: 2, paddingBottom: 14, marginBottom: 8 },
  pickerTitle:     { fontSize: 18, fontWeight: '900', color: '#333' },
  pickerLoading:   { paddingVertical: 40, alignItems: 'center' },
  pickerList:      { maxHeight: 400 },
  itemRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 8, borderRadius: 8 },
  itemRowOtro:     { marginTop: 6, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 },
  itemRowText:     { fontSize: 15, color: '#444', fontWeight: '500', flex: 1 },
  itemCheck:       { fontSize: 18, fontWeight: '900', marginLeft: 8 },
  itemSeparator:   { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 4 },
  pickerCancelBtn: { marginTop: 14, backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, alignItems: 'center' },
  pickerCancelText:{ fontSize: 15, fontWeight: '700', color: '#666' },
});

export default RegistrarPuntoScreen;