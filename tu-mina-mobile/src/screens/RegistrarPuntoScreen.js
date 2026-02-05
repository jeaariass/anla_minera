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
} from 'react-native';
import HeaderComponent from '../components/HeaderComponent';
import Breadcrumb from '../components/Breadcrumb';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { actividadService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

const CATEGORIAS = [
  { id: 'extraccion', label: '⛏️ Extracción', color: '#e74c3c' },
  { id: 'acopio', label: '📦 Acopio', color: '#3498db' },
  { id: 'procesamiento', label: '⚙️ Procesamiento', color: '#f39c12' },
  { id: 'inspeccion', label: '🔍 Inspección', color: '#27ae60' },
];

const RegistrarPuntoScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [maquinaria, setMaquinaria] = useState('');
  const [volumen, setVolumen] = useState('');

  // ✅ MODO RÁPIDO
  const [modoRapido, setModoRapido] = useState(false);
  const [puntosRegistradosHoy, setPuntosRegistradosHoy] = useState(0);

  // ✅ MODAL DE ÉXITO
  const [mostrarExito, setMostrarExito] = useState(false);

  // ✅ ANIMACIONES
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cargarDatos();
    cargarEstadisticas();
  }, []);

  const cargarDatos = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Se necesitan permisos de ubicación');
        navigation.goBack();
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      // ✅ VALIDAR COORDENADAS (Colombia)
      validarCoordenadas(loc.coords.latitude, loc.coords.longitude);

      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        setUserData(JSON.parse(userDataString));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudo obtener la ubicación');
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        const user = JSON.parse(userDataString);
        const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId;
        
        if (tituloMineroId) {
          const resp = await actividadService.getPuntos(tituloMineroId);
          
          if (resp?.success && Array.isArray(resp?.data)) {
            const hoy = new Date().toDateString();
            const puntosHoy = resp.data.filter(p => {
              const fechaPunto = p.fechaRegistro ?? p.createdAt ?? p.fecha;
              return fechaPunto && new Date(fechaPunto).toDateString() === hoy;
            });
            
            setPuntosRegistradosHoy(puntosHoy.length);
          }
        }
      }
    } catch (error) {
      console.log('Error cargando estadísticas:', error);
    }
  };

  // ✅ VALIDAR COORDENADAS
  const validarCoordenadas = (lat, lon) => {
    const latValida = lat >= -4.5 && lat <= 13.5;
    const lonValida = lon >= -80 && lon <= -66;
    
    if (!latValida || !lonValida) {
      Alert.alert(
        '⚠️ Ubicación Sospechosa',
        'Las coordenadas parecen estar fuera de Colombia',
        [{ text: 'Entendido' }]
      );
    }
  };

  const limpiarFormulario = () => {
    setCategoriaSeleccionada(null);
    setDescripcion('');
    setMaquinaria('');
    setVolumen('');
  };

  // ✅ ANIMACIÓN DE ÉXITO
  const mostrarModalExito = () => {
    setMostrarExito(true);
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      scaleAnim.setValue(0);
      setMostrarExito(false);
    }, 2000);
  };

  const handleRegistrar = async () => {
    if (!categoriaSeleccionada) {
      Alert.alert('Error', 'Selecciona una categoría');
      return;
    }

    const tituloMineroId = userData?.tituloMinero?.id || userData?.tituloMineroId;
    
    if (!tituloMineroId) {
      Alert.alert('Error', 'No se encontró el título minero');
      return;
    }

    try {
      setSubmitting(true);

      const punto = {
        usuarioId: userData.id,
        tituloMineroId: tituloMineroId,
        latitud: location.latitude,
        longitud: location.longitude,
        categoria: categoriaSeleccionada,
        descripcion: descripcion || null,
        maquinaria: maquinaria || null,
        volumenM3: volumen ? parseFloat(volumen) : null,
      };

      const response = await actividadService.registrarPunto(punto);

      if (response.success) {
        setPuntosRegistradosHoy(prev => prev + 1);

        if (modoRapido) {
          mostrarModalExito();
          limpiarFormulario();
        } else {
          Alert.alert(
            '✅ Punto Registrado',
            'El punto se registró correctamente',
            [
              {
                text: 'Registrar otro',
                onPress: limpiarFormulario,
              },
              {
                text: 'Ver historial',
                onPress: () => navigation.navigate('HistorialPuntos'),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error registrando punto:', error);
      Alert.alert('Error', 'No se pudo registrar el punto');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderComponent />
      <Breadcrumb items={[{ label: 'Home', screen: 'Home' }, { label: 'Registrar Punto' }]} />

      {/* ✅ MODAL DE ÉXITO */}
      <Modal visible={mostrarExito} transparent animationType="fade">
        <View style={styles.exitoOverlay}>
          <Animated.View style={[styles.exitoModal, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.exitoIcon}>✅</Text>
            <Text style={styles.exitoText}>¡Registrado!</Text>
          </Animated.View>
        </View>
      </Modal>

      <ScrollView style={styles.content}>
        {/* Título */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>📍 Registrar Punto</Text>
          <View style={styles.headerRow}>
            <Text style={styles.pageSubtitle}>Marca tu ubicación</Text>
            <View style={styles.contadorBadge}>
              <Text style={styles.contadorText}>Hoy: {puntosRegistradosHoy}</Text>
            </View>
          </View>
        </View>

        {/* ✅ MODO RÁPIDO TOGGLE */}
        <View style={styles.modoRapidoContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modoRapidoLabel}>⚡ Modo Registro Rápido</Text>
            <Text style={styles.modoRapidoDesc}>
              {modoRapido ? 'Activo - Registra múltiples puntos' : 'Desactivado'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.modoRapidoToggle, modoRapido && styles.modoRapidoToggleActive]}
            onPress={() => setModoRapido(!modoRapido)}
          >
            <View style={[styles.modoRapidoSlider, modoRapido && styles.modoRapidoSliderActive]} />
          </TouchableOpacity>
        </View>

        {/* Mapa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Ubicación</Text>
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
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title="Tu ubicación"
                  pinColor={COLORS.primary}
                />
              </MapView>
            </View>
          )}
          
          <View style={styles.locationCard}>
            <Text style={styles.locationLabel}>📍 Coordenadas:</Text>
            <Text style={styles.locationText}>Lat: {location?.latitude.toFixed(6)}</Text>
            <Text style={styles.locationText}>Lon: {location?.longitude.toFixed(6)}</Text>
          </View>
        </View>

        {/* Categoría */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categoría *</Text>
          <View style={styles.categoriaGrid}>
            {CATEGORIAS.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoriaButton,
                  categoriaSeleccionada === cat.id && { backgroundColor: cat.color },
                ]}
                onPress={() => setCategoriaSeleccionada(cat.id)}
              >
                <Text
                  style={[
                    styles.categoriaText,
                    categoriaSeleccionada === cat.id && { color: '#fff' },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Frente norte..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Maquinaria */}
        <View style={styles.section}>
          <Text style={styles.label}>Maquinaria</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Excavadora CAT-320"
            value={maquinaria}
            onChangeText={setMaquinaria}
          />
        </View>

        {/* Volumen */}
        <View style={styles.section}>
          <Text style={styles.label}>Volumen (m³)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 15"
            value={volumen}
            onChangeText={setVolumen}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Botón Registrar */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!categoriaSeleccionada || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleRegistrar}
          disabled={!categoriaSeleccionada || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {modoRapido ? '⚡ Registrar Rápido' : '📍 Registrar Punto'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('HistorialPuntos')}
        >
          <Text style={styles.secondaryButtonText}>Ver Historial</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  pageHeader: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  pageSubtitle: { fontSize: 14, color: '#666', flex: 1 },
  contadorBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  contadorText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  modoRapidoContainer: { backgroundColor: '#fff', padding: 20, marginTop: 15, marginHorizontal: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  modoRapidoLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  modoRapidoDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  modoRapidoToggle: { width: 60, height: 32, borderRadius: 16, backgroundColor: '#ddd', padding: 3, justifyContent: 'center' },
  modoRapidoToggleActive: { backgroundColor: COLORS.primary },
  modoRapidoSlider: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
  modoRapidoSliderActive: { alignSelf: 'flex-end' },
  section: { backgroundColor: '#fff', padding: 20, marginTop: 15, marginHorizontal: 15, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 15, borderWidth: 2, borderColor: COLORS.primary },
  map: { flex: 1 },
  locationCard: { backgroundColor: '#f0f8ff', padding: 15, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  locationLabel: { color: '#333', fontSize: 14, fontWeight: '600', marginBottom: 5 },
  locationText: { color: '#666', fontSize: 13, fontFamily: 'monospace' },
  categoriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoriaButton: { flex: 1, minWidth: '45%', padding: 15, borderRadius: 10, backgroundColor: '#f0f0f0', borderWidth: 2, borderColor: '#ddd' },
  categoriaText: { fontSize: 14, color: '#333', textAlign: 'center', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  submitButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 10, marginHorizontal: 15, marginTop: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  submitButtonDisabled: { backgroundColor: '#ccc' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginHorizontal: 15, marginTop: 15, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  secondaryButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  exitoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  exitoModal: { backgroundColor: '#fff', padding: 40, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  exitoIcon: { fontSize: 80, marginBottom: 15 },
  exitoText: { fontSize: 24, fontWeight: 'bold', color: '#4caf50' },
});

export default RegistrarPuntoScreen;