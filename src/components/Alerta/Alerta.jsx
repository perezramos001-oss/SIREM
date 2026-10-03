import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

import "./Alerta.css";

function Alerta({ tipo = "exito", titulo, mensaje, visible, cerrar }) {
  useEffect(() => {
    if (!visible) return;

    const temporizador = setTimeout(() => {
      cerrar();
    }, 3500);

    return () => clearTimeout(temporizador);
  }, [visible, cerrar]);

  if (!visible) return null;

  const configuracion = {
    exito: {
      icono: <CheckCircle2 size={20} />,
      clase: "alerta-exito",
    },

    advertencia: {
      icono: <AlertTriangle size={20} />,
      clase: "alerta-advertencia",
    },

    error: {
      icono: <XCircle size={20} />,
      clase: "alerta-error",
    },

    info: {
      icono: <Info size={20} />,
      clase: "alerta-info",
    },
  };

  const actual = configuracion[tipo] || configuracion.exito;

  return (
    <div className={`alerta-sirem ${actual.clase}`}>
      <div className="alerta-sirem-icono">{actual.icono}</div>

      <div className="alerta-sirem-contenido">
        <strong>{titulo}</strong>

        <span>{mensaje}</span>
      </div>

      <button className="alerta-sirem-cerrar" onClick={cerrar} type="button">
        <X size={15} />
      </button>
    </div>
  );
}

export default Alerta;
