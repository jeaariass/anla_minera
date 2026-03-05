import React, { createContext, useContext, useState, useEffect } from "react";
import { authService, tituloService } from "../services/api";

const TituloContext = createContext(null);

const STORAGE_KEY = "tituloActivoId"; // clave en localStorage

export const TituloProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [titulos, setTitulos] = useState([]);
  const [tituloActivoId, setTituloActivoIdState] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Wrapper que guarda en localStorage cada vez que cambia
  const setTituloActivoId = (id) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setTituloActivoIdState(id);
  };

  useEffect(() => {
    const handleStorage = () => {
      const nuevoUser = authService.getCurrentUser();
      setUser(nuevoUser);
      setTitulos([]);
      setTituloActivoIdState(null);
      localStorage.removeItem(STORAGE_KEY);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const esRolGlobal = ["ADMIN", "ASESOR"].includes(user?.rol);

  useEffect(() => {
    if (!user) {
      setTitulos([]);
      setTituloActivoIdState(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (!esRolGlobal) {
      setTitulos([]);
      setTituloActivoIdState(null);
      return;
    }

    setCargando(true);
    tituloService
      .getAll()
      .then((res) => {
        if (res.data.success && res.data.titulos.length > 0) {
          setTitulos(res.data.titulos);

          // Intentar recuperar el último título seleccionado
          const guardado = localStorage.getItem(STORAGE_KEY);
          const existeEnLista = res.data.titulos.some((t) => t.id === guardado);

          if (guardado && existeEnLista) {
            // El título guardado existe en la lista → restaurarlo
            setTituloActivoIdState(guardado);
          } else {
            // No hay guardado o ya no existe → usar el primero
            setTituloActivoId(res.data.titulos[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [user?.id, esRolGlobal]);

  const tituloActivo = esRolGlobal
    ? titulos.find((t) => t.id === tituloActivoId) || null
    : user?.tituloMinero || null;

  const tituloActivoIdFinal = esRolGlobal
    ? tituloActivoId
    : user?.tituloMineroId || user?.tituloMinero?.id || null;

  return (
    <TituloContext.Provider
      value={{
        titulos,
        tituloActivo,
        tituloActivoId: tituloActivoIdFinal,
        setTituloActivoId, // ← el wrapper, no el setter directo
        esRolGlobal,
        cargando,
      }}
    >
      {children}
    </TituloContext.Provider>
  );
};

export const useTituloActivo = () => {
  const context = useContext(TituloContext);
  if (!context) {
    throw new Error("useTituloActivo debe usarse dentro de TituloProvider");
  }
  return context;
};
