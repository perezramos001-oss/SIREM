import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { buscarPagina, buscarSeccion } from "../../utils/paginas";
import { useAvisos } from "../Avisos/Avisos";
import "./Layout.css";
import Sidebar from "../Sidebar/Sidebar";
import Inicio from "../../pages/Inicio";
import MonthSelector from "../MonthSelector/MonthSelector";
import Remisiones from "../../pages/Remisiones";
import NuevaRemision from "../NuevaRemision/NuevaRemision";
import Configuracion from "../../pages/Configuracion";
import Cartera from "../../pages/Cartera";
import Reportes from "../../pages/Reportes";
import Exportaciones from "../../pages/Exportaciones";
import Clientes from "../../pages/Clientes";
import Productos from "../../pages/Productos";
import Auditoria from "../../pages/Auditoria";

import {
  Bell,
  Settings,
  FileText,
  CheckCheck,
  Clock,
  AlertCircle,
  CircleDollarSign,
  LogOut,
  ChevronRight,
} from "lucide-react";

const MESES = [
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

/* Páginas que filtran su información por el mes seleccionado */
const PAGINAS_CON_MES = ["inicio", "remisiones", "reportes", "exportaciones"];

const MINUTOS_ENTRE_NOTIFICACIONES = 5;

const CLAVE_MENU_CONTRAIDO = "sirem_menu_contraido";

/* Una remisión vence a los 45 días (igual que en Inicio y Cartera);
   entre 31 y 45 días está en seguimiento. */
const DIAS_PARA_VENCER = 45;

const describirVencimiento = (diasDesdeRemision) => {
  const diasVencida = diasDesdeRemision - DIAS_PARA_VENCER;

  if (diasVencida > 0) {
    return diasVencida === 1
      ? "Vencida hace 1 día"
      : `Vencida hace ${diasVencida} días`;
  }

  const diasParaVencer = -diasVencida;

  if (diasParaVencer === 0) {
    return "Vence hoy";
  }

  return diasParaVencer === 1 ? "Vence mañana" : `Vence en ${diasParaVencer} días`;
};

function Layout({ paginaActiva, setPaginaActiva, usuarioActual, cerrarSesion }) {
  const { avisar } = useAvisos();

  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const hoy = new Date();

    return `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
  });

  const [modalRemision, setModalRemision] = useState(false);
  const [confirmarCerrarSesion, setConfirmarCerrarSesion] = useState(false);

  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);

  const notificacionesRef = useRef(null);

  const [notificaciones, setNotificaciones] = useState([]);
  const [remisionDestacada, setRemisionDestacada] = useState(null);

  /* Cambia cuando se crea una remisión para recargar la página actual */
  const [versionDatos, setVersionDatos] = useState(0);

  const [sidebarContraido, setSidebarContraido] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_MENU_CONTRAIDO) === "1";
    } catch {
      return false;
    }
  });

  const cambiarSidebarContraido = (valor) => {
    setSidebarContraido(valor);

    try {
      localStorage.setItem(CLAVE_MENU_CONTRAIDO, valor ? "1" : "0");
    } catch {
      /* sin almacenamiento local: solo dura esta sesión */
    }
  };

  const pagina = buscarPagina(paginaActiva);
  const seccion = buscarSeccion(paginaActiva);

  /* =========================
       NOTIFICACIONES
    ========================= */

  useEffect(() => {
    const cargarNotificaciones = async () => {
      try {
        const respuesta = await apiFetch("/api/notificaciones/cartera-vencida");

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las notificaciones.");
        }

        const datos = await respuesta.json();

        setNotificaciones(
          datos.map((notificacion) => ({
            id: notificacion.id_notificacion,

            id_remision: notificacion.id_remision,

            tipo: notificacion.tipo,

            titulo: notificacion.titulo,

            mensaje: notificacion.mensaje,

            tiempo: describirVencimiento(Number(notificacion.dias_vencida)),

            leida: Boolean(notificacion.leida),
          })),
        );
      } catch (error) {
        console.error("Error cargando notificaciones:", error);
      }
    };

    cargarNotificaciones();

    const intervalo = setInterval(
      cargarNotificaciones,
      MINUTOS_ENTRE_NOTIFICACIONES * 60 * 1000,
    );

    return () => clearInterval(intervalo);
  }, []);

  /* =========================
       CERRAR PANELES (CLIC AFUERA / ESCAPE)
    ========================= */

  useEffect(() => {
    const manejarClickExterior = (event) => {
      if (
        notificacionesRef.current &&
        !notificacionesRef.current.contains(event.target)
      ) {
        setNotificacionesAbiertas(false);
      }
    };

    const manejarTecla = (event) => {
      if (event.key === "Escape") {
        setNotificacionesAbiertas(false);
        setConfirmarCerrarSesion(false);
      }
    };

    document.addEventListener("mousedown", manejarClickExterior);
    document.addEventListener("keydown", manejarTecla);

    return () => {
      document.removeEventListener("mousedown", manejarClickExterior);
      document.removeEventListener("keydown", manejarTecla);
    };
  }, []);

  const notificacionesNoLeidas = notificaciones.filter(
    (notificacion) => !notificacion.leida,
  ).length;

  const marcarComoLeida = async (id) => {
    try {
      const respuesta = await apiFetch(`/api/notificaciones/${id}/leida`, {
        method: "PUT",
      });

      if (!respuesta.ok) {
        throw new Error("No se pudo marcar la notificación como leída.");
      }

      setNotificaciones((prev) =>
        prev.map((notificacion) =>
          notificacion.id === id ? { ...notificacion, leida: true } : notificacion,
        ),
      );
    } catch (error) {
      console.error("Error marcando notificación:", error);
    }
  };

  const abrirNotificacion = (notificacion) => {
    if (!notificacion.leida) {
      marcarComoLeida(notificacion.id);
    }

    setRemisionDestacada(notificacion.id_remision);

    setPaginaActiva("cartera");

    setNotificacionesAbiertas(false);
  };

  const marcarTodasComoLeidas = async () => {
    const pendientes = notificaciones.filter((notificacion) => !notificacion.leida);

    await Promise.all(
      pendientes.map((notificacion) => marcarComoLeida(notificacion.id)),
    );

    avisar.exito(
      pendientes.length === 1
        ? "Marcaste 1 notificación como leída."
        : `Marcaste ${pendientes.length} notificaciones como leídas.`,
      "Notificaciones al día",
    );
  };

  const obtenerIcono = (tipo) => {
    if (tipo === "cartera") {
      return <Clock size={17} />;
    }

    if (tipo === "remision") {
      return <FileText size={17} />;
    }

    if (tipo === "alerta") {
      return <AlertCircle size={17} />;
    }

    return <CircleDollarSign size={17} />;
  };

  const alGuardarRemision = useCallback(() => {
    setVersionDatos((version) => version + 1);
  }, []);

  return (
    <div className={`layout ${sidebarContraido ? "sidebar-contraido" : ""}`}>
      <aside className="sidebar-area">
        <Sidebar
          paginaActiva={paginaActiva}
          setPaginaActiva={setPaginaActiva}
          usuarioActual={usuarioActual}
          contraido={sidebarContraido}
          setContraido={cambiarSidebarContraido}
          pedirCerrarSesion={() => setConfirmarCerrarSesion(true)}
        />
      </aside>

      <div className="main-area">
        {/* =========================
                    TOPBAR
                ========================= */}

        <header className="topbar">
          <nav className="topbar-left" aria-label="Ubicación">
            <span className="topbar-seccion">{seccion?.titulo}</span>

            <ChevronRight size={12} className="topbar-separador" />

            <span className="topbar-pagina">{pagina.nombre}</span>
          </nav>

          <div className="topbar-center">
            {PAGINAS_CON_MES.includes(paginaActiva) && (
              <MonthSelector
                mes={mesSeleccionado}
                setMes={setMesSeleccionado}
              />
            )}
          </div>

          <div className="topbar-right">
            {/* NOTIFICACIONES */}

            <div className="notification-wrapper" ref={notificacionesRef}>
              <button
                className="icon-btn notification-btn"
                onClick={() => setNotificacionesAbiertas(!notificacionesAbiertas)}
                title="Notificaciones"
                aria-label={`Notificaciones (${notificacionesNoLeidas} sin leer)`}
                aria-expanded={notificacionesAbiertas}
              >
                <Bell size={18} />

                {notificacionesNoLeidas > 0 && (
                  <span className="notification-badge">
                    {notificacionesNoLeidas > 99 ? "99+" : notificacionesNoLeidas}
                  </span>
                )}
              </button>

              {notificacionesAbiertas && (
                <div className="notification-panel">
                  <div className="notification-header">
                    <div>
                      <h3>Notificaciones</h3>

                      <span>{notificacionesNoLeidas} sin leer</span>
                    </div>

                    {notificacionesNoLeidas > 0 && (
                      <button
                        className="mark-all-btn"
                        onClick={marcarTodasComoLeidas}
                      >
                        <CheckCheck size={15} />
                        Marcar todas
                      </button>
                    )}
                  </div>

                  <div className="notification-list">
                    {notificaciones.length === 0 ? (
                      <div className="empty-notifications">
                        <Bell size={28} />

                        <p>No tienes notificaciones</p>
                      </div>
                    ) : (
                      notificaciones.map((notificacion) => (
                        <button
                          type="button"
                          key={notificacion.id}
                          className={`notification-item ${
                            !notificacion.leida ? "unread" : ""
                          }`}
                          onClick={() => abrirNotificacion(notificacion)}
                        >
                          <div className="notification-icon">
                            {obtenerIcono(notificacion.tipo)}
                          </div>

                          <div className="notification-content">
                            <div className="notification-title-row">
                              <strong>{notificacion.titulo}</strong>

                              {!notificacion.leida && (
                                <span className="unread-dot"></span>
                              )}
                            </div>

                            <p>{notificacion.mensaje}</p>

                            <span className="notification-time">
                              {notificacion.tiempo}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CONFIGURACIÓN */}

            <button
              className={`icon-btn ${
                paginaActiva === "configuracion" ? "activo" : ""
              }`}
              onClick={() => setPaginaActiva("configuracion")}
              title="Configuración"
              aria-label="Configuración"
            >
              <Settings size={18} />
            </button>

            {/* NUEVA REMISIÓN */}

            <button
              className="new-remision"
              onClick={() => setModalRemision(true)}
            >
              <FileText size={18} />
              Nueva Remisión
            </button>
          </div>
        </header>

        {/* CONTENIDO */}

        <main className="content" key={versionDatos}>
          {paginaActiva === "inicio" && (
            <Inicio
              setPaginaActiva={setPaginaActiva}
              mesSeleccionado={mesSeleccionado}
              nombreUsuario={usuarioActual.nombre}
            />
          )}

          {paginaActiva === "remisiones" && (
            <Remisiones
              mesSeleccionado={mesSeleccionado}
              usuarioActual={usuarioActual}
            />
          )}

          {paginaActiva === "cartera" && (
            <Cartera remisionDestacada={remisionDestacada} />
          )}

          {paginaActiva === "clientes" && <Clientes />}

          {paginaActiva === "productos" && <Productos />}

          {paginaActiva === "reportes" && (
            <Reportes mesSeleccionado={mesSeleccionado} />
          )}

          {paginaActiva === "exportaciones" && (
            <Exportaciones mesSeleccionado={mesSeleccionado} />
          )}

          {paginaActiva === "auditoria" && <Auditoria />}

          {paginaActiva === "configuracion" && (
            <Configuracion
              usuarioActual={usuarioActual}
              cerrarSesion={cerrarSesion}
            />
          )}
        </main>

        {/* MODAL NUEVA REMISIÓN */}

        <NuevaRemision
          abierto={modalRemision}
          cerrar={() => setModalRemision(false)}
          alGuardar={alGuardarRemision}
        />
      </div>

      {/* CONFIRMAR CERRAR SESIÓN */}

      {confirmarCerrarSesion && (
        <div
          className="logout-overlay"
          onClick={() => setConfirmarCerrarSesion(false)}
        >
          <div
            className="logout-modal"
            role="alertdialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="logout-icon">
              <LogOut size={24} />
            </div>

            <h3>¿Cerrar sesión?</h3>

            <p>
              Tendrás que iniciar sesión nuevamente para acceder a SIREM.
            </p>

            <div className="logout-actions">
              <button
                className="logout-cancel"
                onClick={() => setConfirmarCerrarSesion(false)}
              >
                Cancelar
              </button>

              <button
                className="logout-confirm"
                onClick={() => {
                  setConfirmarCerrarSesion(false);

                  cerrarSesion();
                }}
                autoFocus
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
