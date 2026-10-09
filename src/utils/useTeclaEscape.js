import { useEffect, useRef } from "react";

/* Ejecuta alPresionar cuando se oprime Escape mientras activo sea true */

export function useTeclaEscape(activo, alPresionar) {
  const accion = useRef(alPresionar);

  useEffect(() => {
    accion.current = alPresionar;
  });

  useEffect(() => {
    if (!activo) return;

    const alPresionarTecla = (evento) => {
      if (evento.key === "Escape") {
        accion.current();
      }
    };

    document.addEventListener("keydown", alPresionarTecla);

    return () => document.removeEventListener("keydown", alPresionarTecla);
  }, [activo]);
}
