import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Formularios from './pages/Formularios';
import Dashboard from './pages/Dashboard';
import Reportes from './pages/Reportes';
import MapaActividades from './pages/MapaActividades'; // ⚠️ NUEVO

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  // Función para verificar autenticación
  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/formularios"
          element={
            <ProtectedRoute>
              <Formularios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <ProtectedRoute>
              <Reportes />
            </ProtectedRoute>
          }
        />
        
        {/* ⚠️ NUEVA RUTA: Mapa de Actividades */}
        <Route
          path="/mapa"
          element={
            <ProtectedRoute>
              <MapaActividades />
            </ProtectedRoute>
          }
        />
        
        {/* Catch all - redirect to home or login */}
        <Route
          path="*"
          element={
            <Navigate 
              to={isAuthenticated() ? "/home" : "/"} 
              replace 
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;