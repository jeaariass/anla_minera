import React, { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useTituloActivo } from "../context/TituloContext";
import "./SelectorTitulo.css";

const SelectorTitulo = () => {
  const { titulos, tituloActivoId, setTituloActivoId, esRolGlobal, cargando } =
    useTituloActivo();

  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickFuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  if (!esRolGlobal) return null;

  if (cargando)
    return (
      <div className="st-trigger st-cargando">
        <Building2 size={15} />
        <span>Cargando...</span>
      </div>
    );

  if (titulos.length === 0) return null;

  const tituloActual = titulos.find((t) => t.id === tituloActivoId);

  const handleSeleccionar = (id) => {
    setTituloActivoId(id);
    setAbierto(false);
  };

  return (
    <div className="st-wrapper" ref={ref}>
      {/* Botón que abre el dropdown */}
      <button
        className={`st-trigger ${abierto ? "st-trigger-abierto" : ""}`}
        onClick={() => setAbierto((prev) => !prev)}
        type="button"
      >
        <Building2 size={15} className="st-icon-building" />
        <div className="st-texto">
          <span className="st-label">Título</span>
          <span className="st-valor">
            {tituloActual
              ? `${tituloActual.numeroTitulo} (${tituloActual.municipio})`
              : "Seleccionar..."}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`st-chevron ${abierto ? "st-chevron-abierto" : ""}`}
        />
      </button>

      {/* Panel dropdown */}
      {abierto && (
        <div className="st-dropdown">
          <div className="st-dropdown-header">
            <Building2 size={13} />
            <span>Selecciona un título minero</span>
          </div>
          <ul className="st-lista">
            {titulos.map((t) => {
              const activo = t.id === tituloActivoId;
              return (
                <li
                  key={t.id}
                  className={`st-opcion ${activo ? "st-opcion-activa" : ""}`}
                  onClick={() => handleSeleccionar(t.id)}
                >
                  <div className="st-opcion-info">
                    <span className="st-opcion-numero">{t.numeroTitulo}</span>
                    <span className="st-opcion-municipio">{t.municipio}</span>
                  </div>
                  {activo && <Check size={14} className="st-check" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SelectorTitulo;
