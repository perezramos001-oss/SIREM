import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  PenLine,
  X,
  XCircle,
} from "lucide-react";

import "./Avisos.css";

const AvisosContext = createContext(null);

const ICONOS = {
  exito: <CheckCircle2 size={18} />,
  advertencia: <AlertTriangle size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
};

const TITULOS = {
  exito: "Listo",
  advertencia: "Atención",
  error: "Algo salió mal",
  info: "Información",
};

const DURACION = {
  exito: 3500,
  info: 4500,
  advertencia: 5000,
  error: 6500,
};

const MAXIMO_VISIBLES = 4;
const DURACION_SALIDA = 220;

/* Nombre del evento para avisar desde código que no es React (utils/api.js) */
export const EVENTO_AVISO = "sirem:aviso";

/*
Reemplaza alert(), confirm() y prompt() del navegador por avisos
con el estilo de SIREM:

  const { avisar, confirmar, pedirTexto } = useAvisos();

  avisar.exito("Cliente guardado.");
  avisar.error("No se pudo conectar con el servidor.");
  avisar.fallo(error, "No se pudieron cargar los clientes.");  // dentro de un catch

  if (await confirmar({ titulo: "¿Desactivar cliente?", mensaje: "..." })) { ... }

  const numero = await pedirTexto({ titulo: "Imprimir remisión", etiqueta: "Número" });
*/

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [dialogo, setDialogo] = useState(null);
  const [valorCampo, setValorCampo] = useState("");

  const siguienteId = useRef(0);
  const botonConfirmarRef = useRef(null);
  const campoRef = useRef(null);

  const cerrarAviso = useCallback((id) => {
    setAvisos((anteriores) =>
      anteriores.map((aviso) =>
        aviso.id === id ? { ...aviso, saliendo: true } : aviso,
      ),
    );

    setTimeout(() => {
      setAvisos((anteriores) => anteriores.filter((aviso) => aviso.id !== id));
    }, DURACION_SALIDA);
  }, []);

  const mostrarAviso = useCallback(
    (tipo, mensaje, titulo = TITULOS[tipo]) => {
      const id = ++siguienteId.current;
      const duracion = DURACION[tipo];

      setAvisos((anteriores) => {
        /* No repetir un aviso idéntico que todavía está en pantalla */
        const repetido = anteriores.some(
          (aviso) =>
            !aviso.saliendo &&
            aviso.tipo === tipo &&
            aviso.mensaje === mensaje &&
            aviso.titulo === titulo,
        );

        if (repetido) return anteriores;

        return [
          ...anteriores.slice(-(MAXIMO_VISIBLES - 1)),
          { id, tipo, titulo, mensaje, duracion },
        ];
      });

      setTimeout(() => cerrarAviso(id), duracion);
    },
    [cerrarAviso],
  );

  const [avisar] = useState(() => ({
    exito: (mensaje, titulo) => mostrarAviso("exito", mensaje, titulo),
    error: (mensaje, titulo) => mostrarAviso("error", mensaje, titulo),
    advertencia: (mensaje, titulo) =>
      mostrarAviso("advertencia", mensaje, titulo),
    info: (mensaje, titulo) => mostrarAviso("info", mensaje, titulo),

    /*
    Para los catch: muestra el error salvo que ya se haya avisado
    (sin conexión) o que la petición se haya cancelado a propósito.
    */
    fallo: (error, mensaje, titulo) => {
      if (error?.name === "AbortError" || error?.avisado) return;

      mostrarAviso("error", mensaje, titulo);
    },
  }));

  /* Avisos enviados desde fuera de React */
  useEffect(() => {
    const alRecibir = (evento) => {
      const { tipo = "info", mensaje, titulo } = evento.detail || {};

      if (mensaje) {
        mostrarAviso(tipo, mensaje, titulo);
      }
    };

    window.addEventListener(EVENTO_AVISO, alRecibir);

    return () => window.removeEventListener(EVENTO_AVISO, alRecibir);
  }, [mostrarAviso]);

  /* =========================
       DIÁLOGOS (confirmar / pedir texto)
    ========================= */

  const abrirDialogo = useCallback(
    (opciones) =>
      new Promise((resolver) => {
        setValorCampo(opciones.campo?.valorInicial || "");

        setDialogo({
          titulo: "¿Estás segura?",
          textoConfirmar: "Confirmar",
          ...opciones,
          resolver,
        });
      }),
    [],
  );

  const confirmar = useCallback(
    (opciones) => abrirDialogo({ ...opciones, campo: null }),
    [abrirDialogo],
  );

  const pedirTexto = useCallback(
    ({ etiqueta, placeholder, valorInicial, ...opciones }) =>
      abrirDialogo({
        titulo: "Ingresa un valor",
        textoConfirmar: "Aceptar",
        ...opciones,
        campo: { etiqueta, placeholder, valorInicial },
      }),
    [abrirDialogo],
  );

  const cerrarDialogo = useCallback((aceptado) => {
    setDialogo((actual) => {
      if (actual) {
        if (actual.campo) {
          actual.resolver(aceptado ? campoRef.current?.value.trim() || null : null);
        } else {
          actual.resolver(aceptado);
        }
      }

      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialogo) return;

    if (dialogo.campo) {
      campoRef.current?.focus();
      campoRef.current?.select();
    } else {
      botonConfirmarRef.current?.focus();
    }

    const alPresionarTecla = (evento) => {
      if (evento.key === "Escape") {
        evento.stopImmediatePropagation();
        cerrarDialogo(false);
      }
    };

    /* captura: se atiende antes que el Escape de los modales de abajo */
    document.addEventListener("keydown", alPresionarTecla, true);

    return () => document.removeEventListener("keydown", alPresionarTecla, true);
  }, [dialogo, cerrarDialogo]);

  return (
    <AvisosContext.Provider value={{ avisar, confirmar, pedirTexto }}>
      {children}

      <div className="avisos-pila" aria-live="polite">
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            className={`aviso aviso-${aviso.tipo} ${aviso.saliendo ? "saliendo" : ""}`}
            role={aviso.tipo === "error" ? "alert" : "status"}
          >
            <div className="aviso-icono">{ICONOS[aviso.tipo]}</div>

            <div className="aviso-contenido">
              <strong>{aviso.titulo}</strong>
              <span>{aviso.mensaje}</span>
            </div>

            <button
              className="aviso-cerrar"
              onClick={() => cerrarAviso(aviso.id)}
              type="button"
              aria-label="Cerrar aviso"
            >
              <X size={14} />
            </button>

            <div
              className="aviso-progreso"
              style={{ animationDuration: `${aviso.duracion}ms` }}
            ></div>
          </div>
        ))}
      </div>

      {dialogo && (
        <div className="confirmacion-overlay" onClick={() => cerrarDialogo(false)}>
          <form
            className="confirmacion-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmacion-titulo"
            onClick={(evento) => evento.stopPropagation()}
            onSubmit={(evento) => {
              evento.preventDefault();

              if (dialogo.campo && !valorCampo.trim()) {
                campoRef.current?.focus();
                return;
              }

              cerrarDialogo(true);
            }}
          >
            <div
              className={`confirmacion-icono ${dialogo.peligro ? "peligro" : ""}`}
            >
              {dialogo.campo ? <PenLine size={22} /> : <AlertTriangle size={22} />}
            </div>

            <h3 id="confirmacion-titulo">{dialogo.titulo}</h3>

            {dialogo.mensaje && <p>{dialogo.mensaje}</p>}

            {dialogo.campo && (
              <label className="confirmacion-campo">
                {dialogo.campo.etiqueta && <span>{dialogo.campo.etiqueta}</span>}

                <input
                  ref={campoRef}
                  value={valorCampo}
                  onChange={(evento) => setValorCampo(evento.target.value)}
                  placeholder={dialogo.campo.placeholder}
                />
              </label>
            )}

            <div className="confirmacion-acciones">
              <button
                type="button"
                className="confirmacion-cancelar"
                onClick={() => cerrarDialogo(false)}
              >
                Cancelar
              </button>

              <button
                type="submit"
                ref={botonConfirmarRef}
                className={`confirmacion-aceptar ${dialogo.peligro ? "peligro" : ""}`}
              >
                {dialogo.textoConfirmar}
              </button>
            </div>
          </form>
        </div>
      )}
    </AvisosContext.Provider>
  );
}

export const useAvisos = () => useContext(AvisosContext);

/* Para usar fuera de componentes React */
export const emitirAviso = (tipo, mensaje, titulo) => {
  window.dispatchEvent(
    new CustomEvent(EVENTO_AVISO, { detail: { tipo, mensaje, titulo } }),
  );
};
