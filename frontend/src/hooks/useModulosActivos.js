// frontend/src/hooks/useModulosActivos.js
// ============================================================
// Devuelve los módulos activos para el título minero activo
// (TituloContext). Cachea en localStorage por título para que
// la UI no parpadee entre navegaciones.
//
// ADMIN siempre ve todos los módulos (si no, podría bloquearse
// a sí mismo el acceso a /usuarios).
//
// Uso:
//   const { modulosActivos, esModuloActivo, cargandoModulos } = useModulosActivos();
//   // modulosActivos = subset de MODULOS
//   // esModuloActivo("certificado_origen") → boolean
// ============================================================

import { useState, useEffect } from "react";
import { tituloService } from "../services/api";
import { MODULOS } from "../constants/modulos";
import { useTituloActivo } from "../context/TituloContext";
import { getUsuarioActual } from "../utils/permissions";

const cacheKey = (tituloId) => `modulosActivos:${tituloId}`;

const leerCache = (tituloId) => {
  try {
    const raw = localStorage.getItem(cacheKey(tituloId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useModulosActivos = () => {
  const { tituloActivoId } = useTituloActivo();
  const esAdmin = getUsuarioActual()?.rol === "ADMIN";
  const [idsActivos, setIdsActivos] = useState(null); // null = sin datos aún
  const [cargandoModulos, setCargandoModulos] = useState(false);

  useEffect(() => {
    if (!tituloActivoId || esAdmin) {
      setIdsActivos(null);
      return;
    }

    // Pintar cache inmediato mientras llega la respuesta
    const cache = leerCache(tituloActivoId);
    if (cache) setIdsActivos(cache);

    let cancelado = false;
    setCargandoModulos(true);
    tituloService
      .getModulos(tituloActivoId)
      .then((res) => {
        if (cancelado || !res.data.success) return;
        const ids = res.data.modulos
          .filter((m) => m.activo)
          .map((m) => m.modulo);
        setIdsActivos(ids);
        try {
          localStorage.setItem(cacheKey(tituloActivoId), JSON.stringify(ids));
        } catch {
          /* storage lleno — ignorar */
        }
      })
      .catch(() => {
        // Sin respuesta y sin cache → mostrar todos (no bloquear la UI;
        // el backend valida igual en los endpoints).
        if (!cancelado && !cache) {
          setIdsActivos(MODULOS.map((m) => m.id));
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoModulos(false);
      });

    return () => {
      cancelado = true;
    };
  }, [tituloActivoId, esAdmin]);

  // ADMIN, sin título o sin datos aún: todos los módulos
  const modulosActivos =
    idsActivos === null
      ? MODULOS
      : MODULOS.filter((m) => idsActivos.includes(m.id));

  const esModuloActivo = (moduloId) =>
    idsActivos === null ? true : idsActivos.includes(moduloId);

  return { modulosActivos, esModuloActivo, cargandoModulos };
};

export default useModulosActivos;
