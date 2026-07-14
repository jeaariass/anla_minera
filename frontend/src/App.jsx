import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { tienePermiso } from "./utils/permissions";
import { useModulosActivos } from "./hooks/useModulosActivos";

// React Router no resetea el scroll al cambiar de ruta: sin esto,
// cada página abre a la altura de scroll de la página anterior.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

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

import { TituloProvider } from "./context/TituloContext";

import Usuarios from "./pages/Usuarios";
import CertificadoOrigen from "./pages/CertificadoOrigen";
import GestorArchivos from "./pages/GestorArchivos";
import CatalogosCampo from "./pages/CatalogosCampo";

// Solo verifica que haya sesión activa
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("token");
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

// Verifica sesión Y permiso por rol Y módulo activo del título.
// `modulo` es opcional: sin él se comporta como antes.
// Mientras cargan los módulos se deja pasar (el backend valida igual).
const RoleProtectedRoute = ({ children, permiso, modulo }) => {
  const { esModuloActivo } = useModulosActivos();
  const isAuthenticated = !!localStorage.getItem("token");
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!tienePermiso(permiso)) return <Navigate to="/home" replace />;
  if (modulo && !esModuloActivo(modulo)) return <Navigate to="/home" replace />;
  return children;
};

function App() {
  const isAuthenticated = () => !!localStorage.getItem("token");

  return (
    <TituloProvider>
      <Router basename="/TU_MINA">
        <ScrollToTop />
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
              <RoleProtectedRoute
                permiso="VER_PAGINA_FORMULARIOS"
                modulo="formularios_fri"
              >
                <Formularios />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RoleProtectedRoute
                permiso="VER_PAGINA_DASHBOARD"
                modulo="dashboard_fri"
              >
                <Dashboard />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/reportes"
            element={
              <RoleProtectedRoute permiso="VER_PAGINA_REPORTES" modulo="reportes">
                <Reportes />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/mapa"
            element={
              <RoleProtectedRoute permiso="VER_PAGINA_MAPA" modulo="mapa">
                <MapaActividades />
              </RoleProtectedRoute>
            }
          />

          {/* Operación */}
          <Route
            path="/resumen-operacion"
            element={
              <RoleProtectedRoute
                permiso="VER_PAGINA_OPERACION"
                modulo="registrar_operacion"
              >
                <ResumenOperacion />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/formularios-operacion"
            element={
              <RoleProtectedRoute
                permiso="VER_PAGINA_OPERACION"
                modulo="registrar_operacion"
              >
                <FormulariosOperacion />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/dashboard-operacion"
            element={
              <RoleProtectedRoute
                permiso="VER_PAGINA_OPERACION"
                modulo="dashboard_operacion"
              >
                <DashboardOperacion />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/catalogos-campo"
            element={
              <RoleProtectedRoute
                permiso="VER_PAGINA_CATALOGOS_CAMPO"
                modulo="catalogos_campo"
              >
                <CatalogosCampo />
              </RoleProtectedRoute>
            }
          />

          {/* Usuarios */}
          <Route
            path="/usuarios"
            element={
              <RoleProtectedRoute permiso="VER_PAGINA_USUARIOS" modulo="usuarios">
                <Usuarios />
              </RoleProtectedRoute>
            }
          />

          {/* Certificado de Origen */}
          <Route
            path="/certificado-origen"
            element={
              <RoleProtectedRoute
                permiso="VER_PAGINA_CERTIFICADO_ORIGEN"
                modulo="certificado_origen"
              >
                <CertificadoOrigen />
              </RoleProtectedRoute>
            }
          />

          {/* Gestor de Archivos */}
          <Route
            path="/gestor-archivos"
            element={
              <RoleProtectedRoute
                permiso="VER_GESTOR_ARCHIVOS"
                modulo="gestor_archivos"
              >
                <GestorArchivos />
              </RoleProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route
            path="*"
            element={
              <Navigate to={isAuthenticated() ? "/home" : "/"} replace />
            }
          />
        </Routes>
      </Router>
    </TituloProvider>
  );
}

export default App;
