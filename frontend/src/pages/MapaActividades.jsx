import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { authService } from '../services/api';
import { 
  ArrowLeft, 
  User, 
  LogOut,
  Map as MapIcon,
  Filter
} from 'lucide-react';
import './Reportes.css'; // Usar los mismos estilos que Reportes

// Fix iconos de Leaflet para Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

const MapaActividades = () => {
  const navigate = useNavigate();
  const [user] = useState(authService.getCurrentUser());
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [center, setCenter] = useState([5.0689, -75.5174]);

  useEffect(() => {
    cargarPuntos();
  }, [filtroCategoria]);

  const cargarPuntos = async () => {
    try {
      const params = filtroCategoria ? `?categoria=${filtroCategoria}` : '';
      const response = await axios.get(
        `http://localhost:5000/api/actividad/puntos/titulo-816-17${params}`
      );
      
      if (response.data.success) {
        setPuntos(response.data.data);
        
        if (response.data.data.length > 0) {
          const firstPoint = response.data.data[0];
          setCenter([parseFloat(firstPoint.latitud), parseFloat(firstPoint.longitud)]);
        }
      }
    } catch (error) {
      console.error('Error cargando puntos:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCustomIcon = (color) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12],
    });
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div className="loading"></div>
        <p>Cargando mapa...</p>
      </div>
    );
  }

  return (
    <div className="reportes-container">
      {/* Header igual que otras páginas */}
      <header className="reportes-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img 
                  src="/logo.png" 
                  alt="Logo TU MINA" 
                  width="50" 
                  height="50"
                  style={{ borderRadius: '8px', objectFit: 'contain' }} 
                />
              </div>
              <div>
                <h1>TU MINA</h1>
                <p>Desarrollado por CTGlobal</p>
              </div>
            </div>
            
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar">
                  <User size={20} />
                </div>
                <div className="user-details">
                  <p className="user-name">{user?.nombre || 'Usuario'}</p>
                  <p className="user-role">{user?.rol || 'ROL'}</p>
                </div>
              </div>
              
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="reportes-main">
        <div className="container">

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button onClick={() => navigate('/home')} className="breadcrumb-link">
              <ArrowLeft size={18} />
              Volver al Home
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Mapa de Actividades</span>
          </div>

          {/* Page Title */}
          <div className="page-title-section">
            <div className="page-title-icon">
              <MapIcon size={40} />
            </div>
            <div>
              <h2 className="page-title">🗺️ Mapa de Actividades Mineras</h2>
              <p className="page-subtitle">
                Visualización georeferenciada de puntos de actividad - Total: {puntos.length} puntos
              </p>
            </div>
          </div>

          {/* Card de Filtros */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <Filter size={24} />
              <h3>Filtros de Visualización</h3>
            </div>

            <div className="card-body">
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFiltroCategoria('')}
                  className={!filtroCategoria ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ 
                    minWidth: '120px',
                    ...(filtroCategoria === '' && { backgroundColor: '#3D9B9B', borderColor: '#3D9B9B' })
                  }}
                >
                  Todos ({puntos.length})
                </button>
                <button
                  onClick={() => setFiltroCategoria('extraccion')}
                  className={filtroCategoria === 'extraccion' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ 
                    minWidth: '120px',
                    ...(filtroCategoria === 'extraccion' && { backgroundColor: '#e74c3c', borderColor: '#e74c3c' })
                  }}
                >
                  ⛏️ Extracción
                </button>
                <button
                  onClick={() => setFiltroCategoria('acopio')}
                  className={filtroCategoria === 'acopio' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ 
                    minWidth: '120px',
                    ...(filtroCategoria === 'acopio' && { backgroundColor: '#3498db', borderColor: '#3498db' })
                  }}
                >
                  📦 Acopio
                </button>
                <button
                  onClick={() => setFiltroCategoria('procesamiento')}
                  className={filtroCategoria === 'procesamiento' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ 
                    minWidth: '120px',
                    ...(filtroCategoria === 'procesamiento' && { backgroundColor: '#f39c12', borderColor: '#f39c12' })
                  }}
                >
                  ⚙️ Procesamiento
                </button>
                <button
                  onClick={() => setFiltroCategoria('inspeccion')}
                  className={filtroCategoria === 'inspeccion' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ 
                    minWidth: '120px',
                    ...(filtroCategoria === 'inspeccion' && { backgroundColor: '#27ae60', borderColor: '#27ae60' })
                  }}
                >
                  🔍 Inspección
                </button>
              </div>
            </div>
          </div>

          {/* Card del Mapa */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body" style={{ padding: 0, height: '600px', position: 'relative' }}>
              
              {/* Mapa */}
              <MapContainer
              center={center}
              zoom={8}
              style={{ height: '100%', width: '100%' }}
            >
              <LayersControl position="topright">
                {/* Capa de Mapa Normal */}
                <LayersControl.BaseLayer name="🗺️ Mapa Normal">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                </LayersControl.BaseLayer>

                {/* Capa Satelital - ACTIVA POR DEFECTO */}
                <LayersControl.BaseLayer checked name="🛰️ Vista Satelital">
                  <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                </LayersControl.BaseLayer>

              </LayersControl>
              
              {puntos.map((punto) => (

                  <React.Fragment key={punto.id}>
                    <Marker
                      position={[parseFloat(punto.latitud), parseFloat(punto.longitud)]}
                      icon={createCustomIcon(CATEGORIA_COLORS[punto.categoria])}
                    >
                      <Popup>
                        <div style={{ minWidth: '200px' }}>
                          <h3 style={{
                            margin: '0 0 10px 0',
                            color: CATEGORIA_COLORS[punto.categoria],
                          }}>
                            {CATEGORIA_LABELS[punto.categoria]}
                          </h3>
                          
                          {punto.descripcion && (
                            <p style={{ margin: '5px 0' }}>
                              <strong>Descripción:</strong><br/>
                              {punto.descripcion}
                            </p>
                          )}
                          
                          {punto.maquinaria && (
                            <p style={{ margin: '5px 0' }}>
                              <strong>🚜 Maquinaria:</strong> {punto.maquinaria}
                            </p>
                          )}
                          
                          {punto.volumen_m3 && (
                            <p style={{ margin: '5px 0' }}>
                              <strong>📊 Volumen:</strong> {punto.volumen_m3} m³
                            </p>
                          )}
                          
                          <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#666' }}>
                            📍 {parseFloat(punto.latitud).toFixed(6)}, {parseFloat(punto.longitud).toFixed(6)}
                          </p>
                          
                          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
                            🕐 {new Date(punto.fecha).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                    
                    <Circle
                      center={[parseFloat(punto.latitud), parseFloat(punto.longitud)]}
                      radius={20}
                      pathOptions={{
                        color: CATEGORIA_COLORS[punto.categoria],
                        fillColor: CATEGORIA_COLORS[punto.categoria],
                        fillOpacity: 0.2,
                      }}
                    />
                  </React.Fragment>
                ))}
              </MapContainer>

              {/* Leyenda */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                zIndex: 1000,
              }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  Leyenda
                </h4>
                {Object.entries(CATEGORIA_COLORS).map(([key, color]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      marginRight: '10px',
                      border: '2px solid white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}></div>
                    <span style={{ fontSize: '13px' }}>
                      {CATEGORIA_LABELS[key]}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Instrucciones */}
          <div className="card info-card">
            <div className="card-header">
              <h3>📋 Instrucciones de Uso</h3>
            </div>
            <div className="card-body">
              <ol className="instruction-list">
                <li>Usa los filtros para visualizar puntos por categoría de actividad</li>
                <li>Haz clic en cualquier marcador para ver información detallada</li>
                <li>Los puntos se registran desde la aplicación móvil para campo - TU MINA</li>
                <li>Los colores indican el tipo de actividad minera realizada</li>
              </ol>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default MapaActividades;