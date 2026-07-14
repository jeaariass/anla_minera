// frontend/src/hooks/useCategoriasActivas.js
// ============================================================
// Devuelve las categorías de campo activas para el título minero
// activo (TituloContext). Cachea en localStorage por título para
// que la UI no parpadee entre navegaciones.
//
// Uso:
//   const { categoriasActivas, cargandoCategorias } = useCategoriasActivas();
//   // categoriasActivas = subset de CATEGORIAS_CAMPO
// ============================================================

import { useState, useEffect } from "react";
import { tituloService } from "../services/api";
import { CATEGORIAS_CAMPO } from "../constants/categorias";
import { useTituloActivo } from "../context/TituloContext";

const cacheKey = (tituloId) => `categoriasActivas:${tituloId}`;

const leerCache = (tituloId) => {
  try {
    const raw = localStorage.getItem(cacheKey(tituloId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const filtrarCampo = (idsActivos) =>
  CATEGORIAS_CAMPO.filter((c) => idsActivos.includes(c.id));

export const useCategoriasActivas = () => {
  const { tituloActivoId } = useTituloActivo();
  const [idsActivos, setIdsActivos] = useState(null); // null = sin datos aún
  const [cargandoCategorias, setCargandoCategorias] = useState(false);

  useEffect(() => {
    if (!tituloActivoId) {
      setIdsActivos(null);
      return;
    }

    // Pintar cache inmediato mientras llega la respuesta
    const cache = leerCache(tituloActivoId);
    if (cache) setIdsActivos(cache);

    let cancelado = false;
    setCargandoCategorias(true);
    tituloService
      .getCategorias(tituloActivoId)
      .then((res) => {
        if (cancelado || !res.data.success) return;
        const ids = res.data.categorias
          .filter((c) => c.activo)
          .map((c) => c.categoria);
        setIdsActivos(ids);
        try {
          localStorage.setItem(cacheKey(tituloActivoId), JSON.stringify(ids));
        } catch {
          /* storage lleno — ignorar */
        }
      })
      .catch(() => {
        // Sin respuesta y sin cache → mostrar todas (no bloquear la UI;
        // el backend valida igual al registrar).
        if (!cancelado && !cache) {
          setIdsActivos(CATEGORIAS_CAMPO.map((c) => c.id));
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoCategorias(false);
      });

    return () => {
      cancelado = true;
    };
  }, [tituloActivoId]);

  // Mientras no hay título o datos: todas las de campo (comportamiento actual)
  const categoriasActivas =
    idsActivos === null ? CATEGORIAS_CAMPO : filtrarCampo(idsActivos);

  return { categoriasActivas, cargandoCategorias };
};

export default useCategoriasActivas;
