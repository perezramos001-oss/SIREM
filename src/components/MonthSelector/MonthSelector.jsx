import { useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

import "./MonthSelector.css";

const nombresMeses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function MonthSelector({ mes, setMes }) {
  const [abierto, setAbierto] = useState(false);

  // Año que está mostrando el calendario
  const añoActual = new Date().getFullYear();

  // Extraer año del valor recibido, por ejemplo:
  // "Agosto 2026" → 2026
  const añoSeleccionado = mes ? Number(mes.split(" ")[1]) : añoActual;

  const [añoMostrado, setAñoMostrado] = useState(añoSeleccionado);

  const seleccionarMes = (nombreMes) => {
    const nuevoMes = `${nombreMes} ${añoMostrado}`;

    setMes(nuevoMes);
    setAbierto(false);
  };

  const cambiarAño = (direccion) => {
    setAñoMostrado((año) => año + direccion);
  };

  return (
    <div className="month-selector">
      <button
        type="button"
        className="month-button"
        onClick={() => {
          if (!abierto) {
            setAñoMostrado(añoSeleccionado);
          }

          setAbierto(!abierto);
        }}
      >
        <Calendar size={18} />

        <span>{mes}</span>

        <ChevronDown size={16} className={abierto ? "flecha-abierta" : ""} />
      </button>

      {abierto && (
        <div className="month-menu">
          {/* CABECERA DEL AÑO */}

          <div className="month-header">
            <button
              type="button"
              className="month-arrow"
              onClick={() => cambiarAño(-1)}
            >
              <ChevronLeft size={18} />
            </button>

            <strong>{añoMostrado}</strong>

            <button
              type="button"
              className="month-arrow"
              onClick={() => cambiarAño(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* MESES */}

          <div className="months-grid">
            {nombresMeses.map((nombreMes) => {
              const mesCompleto = `${nombreMes} ${añoMostrado}`;

              const seleccionado = mes === mesCompleto;

              return (
                <button
                  type="button"
                  key={nombreMes}
                  className={`month-item ${seleccionado ? "seleccionado" : ""}`}
                  onClick={() => seleccionarMes(nombreMes)}
                >
                  <span>{nombreMes}</span>

                  {seleccionado && <Check size={15} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default MonthSelector;
