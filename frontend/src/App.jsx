import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { tienePermiso } from "./utils/permissions";

// Pages
import Login from "./pages/Login";
import Home from "./pages/Home";
import Formularios from "./pages/Formularios";
import Dashboard from "./pages/Dashboard";
import Reportes from "./pages/Reportes";
import MapaActividades from "./pages/MapaActividades";
import ResumenOperacion from "./pages/ResumenOperacion";
import FormulariosOperacion from "./pages/FormulariosOperacion";
import DashboardOperacion from "./pages/DashboardOperacion";
import Usuarios from "./pages/Usuarios";
import CertificadoOrigen from "./pages/CertificadoOrigen";
import GestorArchivos from "./pages/GestorArchivos";

// Solo verifica que haya sesión activa
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("token");
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

// Verifica sesión Y permiso por rol
const RoleProtectedRoute = ({ children, permiso }) => {
  const isAuthenticated = !!localStorage.getItem("token");
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!tienePermiso(permiso)) return <Navigate to="/home" replace />;
  return children;
};

function App() {
  const isAuthenticated = () => !!localStorage.getItem("token");

  return (
    <Router basename="/TU_MINA">
      <Routes>
        {/* Pública */}
        <Route path="/" element={<Login />} />

        {/* Home — solo requiere estar autenticado */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* FRI */}
        <Route
          path="/formularios"
          element={
            <RoleProtectedRoute permiso="VER_PAGINA_FORMULARIOS">
              <Formularios />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RoleProtectedRoute permiso="VER_PAGINA_DASHBOARD">
              <Dashboard />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/reportes"
          element={
            <RoleProtectedRoute permiso="VER_PAGINA_REPORTES">
              <Reportes />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/mapa"
          element={
            <RoleProtectedRoute permiso="VER_PAGINA_MAPA">
              <MapaActividades />
            </RoleProtectedRoute>
          }
        />

        {/* Operación */}
        <Route
          path="/resumen-operacion"
          element={
            <RoleProtectedRoute permiso="VER_PAGINA_OPERACION">
              <ResumenOperacion />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/formularios-operacion"
          element={
            <RoleProtectedRoute permiso="VER_PAGINA_OPERACION">
              <FormulariosOperacion />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/dashboard-operacion"
          element={
            <RoleProtectedRoute permiso="VER_PAGINA_OPERACION">
              <DashboardOperacion />
            </RoleProtectedRoute>
          }
        />

        {/* Usuarios */}
        <Route
          path="/usuarios"
          element={
            <RoleProtectedRoute permiso="VER_PAGINA_USUARIOS">
              <Usuarios />
            </RoleProtectedRoute>
          }
        />

        {/* Certificado de Origen */}
        <Route
          path="/certificado-origen"
          element={
            <RoleProtectedRoute permiso="VER_PAGINA_CERTIFICADO_ORIGEN">
              <CertificadoOrigen />
            </RoleProtectedRoute>
          }
        />

        {/* Gestor de Archivos */}
        <Route
          path="/gestor-archivos"
          element={
            <RoleProtectedRoute permiso="VER_GESTOR_ARCHIVOS">
              <GestorArchivos />
            </RoleProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated() ? "/home" : "/"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
