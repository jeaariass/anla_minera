import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
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

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Obtener ubicación
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

      // Cargar usuario
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

  const handleRegistrar = async () => {
    if (!categoriaSeleccionada) {
      Alert.alert('Error', 'Selecciona una categoría');
      return;
    }

    // ⚠️ CORRECCIÓN: Extraer tituloMineroId correctamente
    const tituloMineroId = userData?.tituloMinero?.id || userData?.tituloMineroId;
    
    console.log('🔍 userData completo:', JSON.stringify(userData, null, 2));
    console.log('🔍 tituloMineroId extraído:', tituloMineroId);

    if (!tituloMineroId) {
      Alert.alert('Error', 'No se encontró el título minero del usuario');
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

      console.log('📍 Enviando punto:', punto);

      const response = await actividadService.registrarPunto(punto);

      if (response.success) {
        Alert.alert(
          '✅ Punto Registrado',
          'El punto de actividad se registró correctamente',
          [
            {
              text: 'Registrar otro',
              onPress: () => {
                setCategoriaSeleccionada(null);
                setDescripcion('');
                setMaquinaria('');
                setVolumen('');
              },
            },
            {
              text: 'Ver historial',
              onPress: () => navigation.navigate('HistorialPuntos'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error registrando punto:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo registrar el punto');
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
      <Breadcrumb 
      items={[
        { label: 'Home', screen: 'Home' },
        { label: 'Registrar Punto de Actividad' },
      ]}
    />
      <ScrollView style={styles.content}>
        {/* Título de página */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>📍 Registrar Punto de Actividad</Text>
          <Text style={styles.pageSubtitle}>Marca tu ubicación georeferenciada</Text>
        </View>

        {/* Mapa pequeño */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Ubicación en Mapa</Text>
          {location && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                mapType="satellite" // ✅ satelital con etiquetas/calles
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
                  description="Aquí se registrará el punto"
                  pinColor={COLORS.primary}
                />
              </MapView>         
            </View>
          )}
          
          {/* Coordenadas */}
          <View style={styles.locationCard}>
            <Text style={styles.locationLabel}>📍 Coordenadas:</Text>
            <Text style={styles.locationText}>
              Lat: {location?.latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Lon: {location?.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        {/* Categoría */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categoría de actividad *</Text>
          <View style={styles.categoriaGrid}>
            {CATEGORIAS.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoriaButton,
                  categoriaSeleccionada === cat.id && {
                    backgroundColor: cat.color,
                  },
                ]}
                onPress={() => setCategoriaSeleccionada(cat.id)}
              >
                <Text
                  style={[
                    styles.categoriaText,
                    categoriaSeleccionada === cat.id && styles.categoriaTextSelected,
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
            placeholder="Ej: Frente norte, zona alta..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Maquinaria */}
        <View style={styles.section}>
          <Text style={styles.label}>Maquinaria utilizada</Text>
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
            <Text style={styles.submitButtonText}>📍 Registrar Punto</Text>
          )}
        </TouchableOpacity>

        {/* Botón Ver Historial */}
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  pageHeader: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  map: {
    flex: 1,
  },
  locationCard: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  locationLabel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  locationText: {
    color: '#666',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  categoriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoriaButton: {
    flex: 1,
    minWidth: '45%',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  categoriaText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  categoriaTextSelected: {
    color: '#fff',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegistrarPuntoScreen;