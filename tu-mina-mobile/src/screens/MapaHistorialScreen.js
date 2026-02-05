import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, Callout, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import COLORS from '../utils/colors';

const CATEGORIA_COLORS = {
  extraccion: '#e74c3c',
  acopio: '#3498db',
  procesamiento: '#f39c12',
  inspeccion: '#27ae60',
};

const CATEGORIA_LABELS = {
  extraccion: '⛏️',
  acopio: '📦',
  procesamiento: '⚙️',
  inspeccion: '🔍',
};

const MapaHistorialScreen = ({ route, navigation }) => {
  const { puntos = [] } = route.params || {};
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [mapType, setMapType] = useState('satellite');

  const calcularCentro = () => {
    if (puntos.length === 0) {
      return { latitude: 5.0689, longitude: -75.5174 };
    }

    const lats = puntos.map(p => parseFloat(p.latitud));
    const lons = puntos.map(p => parseFloat(p.longitud));

    return {
      latitude: (Math.max(...lats) + Math.min(...lats)) / 2,
      longitude: (Math.max(...lons) + Math.min(...lons)) / 2,
    };
  };

  const centro = calcularCentro();

  const puntosFiltrados = filtroCategoria
    ? puntos.filter(p => p.categoria === filtroCategoria)
    : puntos;

  const contarPorCategoria = (categoria) => {
    if (!categoria) return puntos.length;
    return puntos.filter(p => p.categoria === categoria).length;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header compacto */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🗺️ Mapa</Text>
          <Text style={styles.subtitle}>{puntosFiltrados.length}/{puntos.length}</Text>
        </View>

        <TouchableOpacity
          style={styles.mapTypeButton}
          onPress={() => setMapType(mapType === 'satellite' ? 'standard' : 'satellite')}
        >
          <Text style={styles.mapTypeIcon}>
            {mapType === 'satellite' ? '🗺️' : '🛰️'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ✅ FILTROS COMPACTOS HORIZONTALES */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={styles.filtrosContainer}
      >
        <TouchableOpacity
          style={[styles.filtroChip, !filtroCategoria && styles.filtroChipActive]}
          onPress={() => setFiltroCategoria('')}
        >
          <Text style={[styles.filtroText, !filtroCategoria && styles.filtroTextActive]}>
            Todos ({contarPorCategoria('')})
          </Text>
        </TouchableOpacity>

        {Object.entries(CATEGORIA_LABELS).map(([key, emoji]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filtroChip,
              filtroCategoria === key && {
                backgroundColor: CATEGORIA_COLORS[key],
                borderColor: CATEGORIA_COLORS[key],
              },
            ]}
            onPress={() => setFiltroCategoria(filtroCategoria === key ? '' : key)}
          >
            <Text style={[styles.filtroText, filtroCategoria === key && styles.filtroTextActive]}>
              {emoji} ({contarPorCategoria(key)})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ✅ MAPA EN PANTALLA COMPLETA */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={{
          latitude: centro.latitude,
          longitude: centro.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {puntosFiltrados.map((punto) => {
          const color = CATEGORIA_COLORS[punto.categoria] ?? '#7f8c8d';

          return (
            <React.Fragment key={punto.id}>
              <Marker
                coordinate={{
                  latitude: parseFloat(punto.latitud),
                  longitude: parseFloat(punto.longitud),
                }}
                pinColor={color}
              >
                <Callout style={styles.callout}>
                  <View style={styles.calloutContent}>
                    <Text style={[styles.calloutTitle, { color }]}>
                      {CATEGORIA_LABELS[punto.categoria]} {punto.categoria}
                    </Text>

                    {punto.descripcion && (
                      <Text style={styles.calloutText}>{punto.descripcion}</Text>
                    )}

                    {punto.maquinaria && (
                      <Text style={styles.calloutInfo}>🚜 {punto.maquinaria}</Text>
                    )}

                    {(punto.volumenM3 || punto.volumen_m3) && (
                      <Text style={styles.calloutInfo}>
                        📊 {punto.volumenM3 ?? punto.volumen_m3} m³
                      </Text>
                    )}

                    <Text style={styles.calloutCoords}>
                      📍 {parseFloat(punto.latitud).toFixed(6)}, {parseFloat(punto.longitud).toFixed(6)}
                    </Text>
                  </View>
                </Callout>
              </Marker>

              <Circle
                center={{
                  latitude: parseFloat(punto.latitud),
                  longitude: parseFloat(punto.longitud),
                }}
                radius={30}
                fillColor={color + '30'}
                strokeColor={color}
                strokeWidth={2}
              />
            </React.Fragment>
          );
        })}
      </MapView>

      {/* ✅ LEYENDA COMPACTA */}
      <View style={styles.leyenda}>
        <Text style={styles.leyendaTitle}>Leyenda</Text>
        {Object.entries(CATEGORIA_COLORS).map(([key, color]) => {
          const count = contarPorCategoria(key);
          if (count === 0) return null;
          
          return (
            <View key={key} style={styles.leyendaItem}>
              <View style={[styles.leyendaDot, { backgroundColor: color }]} />
              <Text style={styles.leyendaText}>
                {CATEGORIA_LABELS[key]} ({count})
              </Text>
            </View>
          );
        })}
      </View>

      {/* ✅ BOTÓN FLOTANTE PARA VOLVER */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  
  // ✅ HEADER COMPACTO
  header: { 
    backgroundColor: '#fff', 
    paddingHorizontal: 15,
    height: 90, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  subtitle: { 
    fontSize: 12, 
    color: '#666',
    marginTop: 2,
  },
  mapTypeButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  mapTypeIcon: { 
    fontSize: 22 
  },
  
  // ✅ FILTROS COMPACTOS
  filtrosScroll: { 
    backgroundColor: '#fff',
    maxHeight: 50,
  },
  filtrosContainer: { 
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 8,
  },
  filtroChip: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16, 
    backgroundColor: '#f5f5f5', 
    borderWidth: 1.5, 
    borderColor: '#ddd' 
  },
  filtroChipActive: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary 
  },
  filtroText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#666' 
  },
  filtroTextActive: { 
    color: '#fff' 
  },
  
  // ✅ MAPA GRANDE
  map: { 
    flex: 1 
  },
  
  // Callouts
  callout: { 
    width: 220 
  },
  calloutContent: { 
    padding: 8 
  },
  calloutTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  calloutText: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4, 
    fontStyle: 'italic' 
  },
  calloutInfo: { 
    fontSize: 11, 
    color: '#333', 
    marginBottom: 3 
  },
  calloutCoords: { 
    fontSize: 10, 
    color: '#999', 
    marginTop: 6, 
    fontFamily: 'monospace' 
  },
  
  // ✅ LEYENDA COMPACTA
  leyenda: { 
    position: 'absolute', 
    bottom: 70, 
    right: 15, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    padding: 10, 
    borderRadius: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4, 
    elevation: 5,
    minWidth: 120,
  },
  leyendaTitle: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginBottom: 6, 
    color: '#333' 
  },
  leyendaItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  leyendaDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    marginRight: 6 
  },
  leyendaText: { 
    fontSize: 11, 
    color: '#666' 
  },
  
  // ✅ BOTÓN FLOTANTE
  backButton: { 
    position: 'absolute', 
    bottom: 40, 
    left: 15, 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 25, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4, 
    elevation: 5 
  },
  backButtonText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: 'bold' 
  },
});

export default MapaHistorialScreen;