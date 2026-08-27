import React, { useState, useEffect, useRef } from "react";
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


import {
    Bell,
    Settings,
    FileText,
    CheckCheck,
    Clock,
    AlertCircle,
    CircleDollarSign,
    UserRound,
    UsersRound,
    ShieldCheck,
    LockKeyhole,
    LogOut,
    ChevronRight
} from "lucide-react";

function Layout({
    paginaActiva,
    setPaginaActiva,
    usuarioActual,
    cerrarSesion
}) {

    const [menuMes, setMenuMes] = useState(false);
    const [mesSeleccionado, setMesSeleccionado] = useState("Agosto 2026");

    const [modalRemision, setModalRemision] = useState(false);
    const [configuracionAbierta, setConfiguracionAbierta] = useState(false);
    const [confirmarCerrarSesion, setConfirmarCerrarSesion] = useState(false);
    
    const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);

    const notificacionesRef = useRef(null);
    
    const [notificaciones, setNotificaciones] = useState([]);
    const [remisionDestacada, setRemisionDestacada] = useState(null);

    const [sidebarContraido, setSidebarContraido] = useState(false);
    const [seccionEnDesarrollo, setSeccionEnDesarrollo] = useState("");

    const esDesarrolladora =
    usuarioActual?.id_usuario === 1;
        console.log(
        "USUARIO ACTUAL:",
        usuarioActual
        );

    useEffect(() => {

    if (!usuarioActual?.id_usuario) {
        return;
    }


 const cargarNotificaciones = async () => {

    if (!usuarioActual?.id_usuario) {

        return;

    }

    try {

        const respuesta = await fetch(
            `/api/notificaciones/cartera-vencida/${usuarioActual.id_usuario}`
        );

        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron cargar las notificaciones."
            );

        }

        const datos = await respuesta.json();

        const notificacionesReales = datos.map(
            (notificacion) => ({

                id: notificacion.id_notificacion,

                id_remision:
                    notificacion.id_remision,

                tipo:
                    notificacion.tipo,

                titulo:
                    notificacion.titulo,

                mensaje:
                    notificacion.mensaje,

                tiempo:
                    notificacion.dias_vencida === 1
                        ? "Vencida hace 1 día"
                        : `Vencida hace ${notificacion.dias_vencida} días`,

                leida:
                    Boolean(notificacion.leida)

            })
        );

        setNotificaciones(
            notificacionesReales
        );

    } catch (error) {

        console.error(
            "Error cargando notificaciones:",
            error
        );

    }

};

cargarNotificaciones();

}, [usuarioActual]);
    /* =========================
       CERRAR AL HACER CLIC AFUERA
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

        document.addEventListener(
            "mousedown",
            manejarClickExterior
        );

        return () => {

            document.removeEventListener(
                "mousedown",
                manejarClickExterior
            );

        };

    }, []);

useEffect(() => {

    setConfiguracionAbierta(false);

}, [paginaActiva]);

    /* =========================
       NOTIFICACIONES NO LEÍDAS
    ========================= */

    const notificacionesNoLeidas =
        notificaciones.filter(
            notificacion => !notificacion.leida
        ).length;


    /* =========================
       MARCAR UNA COMO LEÍDA
    ========================= */

  const marcarComoLeida = async (id) => {

    try {

        const respuesta = await fetch(
            `/api/notificaciones/${id}/leida`,
            {
                method: "PUT"
            }
        );

        if (!respuesta.ok) {

            throw new Error(
                "No se pudo marcar la notificación como leída."
            );

        }

        setNotificaciones(prev =>

            prev.map(notificacion =>

                notificacion.id === id
                    ? {
                        ...notificacion,
                        leida: true
                    }
                    : notificacion

            )

        );

    } catch (error) {

        console.error(
            "Error marcando notificación:",
            error
        );

    }

};

/* =========================
   ABRIR NOTIFICACIÓN
========================= */


const abrirNotificacion = (notificacion) => {

    marcarComoLeida(notificacion.id);

    setRemisionDestacada(
        notificacion.id_remision
    );

    setPaginaActiva("cartera");

    setNotificacionesAbiertas(false);

};

    /* =========================
       MARCAR TODAS COMO LEÍDAS
    ========================= */

    const marcarTodasComoLeidas = () => {

        setNotificaciones(prev =>

            prev.map(notificacion => ({
                ...notificacion,
                leida: true
            }))

        );

    };


    /* =========================
       ICONO SEGÚN TIPO
    ========================= */

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


    return (

       <div
    className={`layout ${
        sidebarContraido ? "sidebar-contraido" : ""
    }`}
>

    <aside className="sidebar-area">

        <Sidebar
            paginaActiva={paginaActiva}
            setPaginaActiva={setPaginaActiva}
            usuarioActual={usuarioActual}
            contraido={sidebarContraido}
            setContraido={setSidebarContraido}
        />

    </aside>

    <div className="main-area">

                {/* =========================
                    TOPBAR
                ========================= */}

                <header className="topbar">


                    <div className="topbar-left">

                    </div>


                    <div className="topbar-center">

    {paginaActiva !== "cartera" && (

        <MonthSelector
            mes={mesSeleccionado}
            setMes={setMesSeleccionado}
        />

    )}

</div>


                    <div className="topbar-right">


                        {/* =========================
                            NOTIFICACIONES
                        ========================= */}

                        <div
                            className="notification-wrapper"
                            ref={notificacionesRef}
                        >

                            <button
                                className="icon-btn notification-btn"
                                onClick={() =>
                                    setNotificacionesAbiertas(
                                        !notificacionesAbiertas
                                    )
                                }
                            >

                                <Bell size={18} />

                                {notificacionesNoLeidas > 0 && (

                                    <span className="notification-badge">

                                        {notificacionesNoLeidas}

                                    </span>

                                )}

                            </button>


                            {notificacionesAbiertas && (

                                <div className="notification-panel">


                                    {/* HEADER */}

                                    <div className="notification-header">

                                        <div>

                                            <h3>
                                                Notificaciones
                                            </h3>

                                            <span>
                                                {notificacionesNoLeidas} sin leer
                                            </span>

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


                                    {/* LISTA */}

                                    <div className="notification-list">

                                        {notificaciones.length === 0 ? (

                                            <div className="empty-notifications">

                                                <Bell size={28} />

                                                <p>
                                                    No tienes notificaciones
                                                </p>

                                            </div>

                                        ) : (

                                            notificaciones.map(
                                                (notificacion) => (

                                                    <div
                                                        key={notificacion.id}
                                                        className={`notification-item ${
                                                            !notificacion.leida
                                                                ? "unread"
                                                                : ""
                                                        }`}
                                                       onClick={() =>
    abrirNotificacion(notificacion)
}
                                                    >


                                                        <div className="notification-icon">

                                                            {obtenerIcono(
                                                                notificacion.tipo
                                                            )}

                                                        </div>


                                                        <div className="notification-content">

                                                            <div className="notification-title-row">

                                                                <strong>
                                                                    {notificacion.titulo}
                                                                </strong>

                                                                {!notificacion.leida && (

                                                                    <span className="unread-dot"></span>

                                                                )}

                                                            </div>


                                                            <p>
                                                                {notificacion.mensaje}
                                                            </p>


                                                            <span className="notification-time">

                                                                {notificacion.tiempo}

                                                            </span>

                                                        </div>

                                                    </div>

                                                )
                                            )

                                        )}

                                    </div>

                                </div>

                            )}

                        </div>


       {/* CONFIGURACIÓN */}

<div className="config-wrapper">

    <button
        className="icon-btn"
        onClick={() =>
            setConfiguracionAbierta(prev => !prev)
        }
    >
        <Settings size={18} />
    </button>


    {configuracionAbierta && (

        <div className="config-menu">

            <button
                onClick={() => {

                    setConfiguracionAbierta(false);

                    setPaginaActiva("configuracion");

                }}
            >
                Configuración
            </button>


            <button
                onClick={() => {

                    setConfiguracionAbierta(false);

                    setPaginaActiva("notificaciones");

                }}
            >
                Notificaciones
            </button>

        </div>

    )}

</div>

                        {/* NUEVA REMISIÓN */}

                        <button
                            className="new-remision"
                            onClick={() =>
                                setModalRemision(true)
                            }
                        >

                            <FileText size={18} />

                            Nueva Remisión

                        </button>

                    </div>

                </header>


                {/* CONTENIDO */}

                <div className="content">

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

   {paginaActiva === "configuracion" && (
    <Configuracion
        usuarioActual={usuarioActual}
        cerrarSesion={cerrarSesion}
    />
)}
                
    {paginaActiva === "cartera" && (
    <Cartera
        usuarioActual={usuarioActual}
        remisionDestacada={remisionDestacada}
    />
)}


{paginaActiva === "exportaciones" && (

    <Exportaciones
        mesSeleccionado={mesSeleccionado}
    />

)}
                
                </div>


                {/* MODAL NUEVA REMISIÓN */}

                <NuevaRemision
                    abierto={modalRemision}
                    cerrar={() =>
                        setModalRemision(false)
                    }
                />

                {configuracionAbierta && (

    <div
        className="config-overlay"
        onClick={() => setConfiguracionAbierta(false)}
    >

        <div
            className="config-panel"
            onClick={(e) => e.stopPropagation()}
        >

            {/* ENCABEZADO */}

            <div className="config-header">

                <div>

                    <span className="config-tag">
                        SISTEMA
                    </span>

                    <h3>
                        Configuración
                    </h3>

                    <p>
                        Administra tu cuenta y los accesos del sistema.
                    </p>

                </div>

                <button
                    className="config-close"
                    onClick={() => setConfiguracionAbierta(false)}
                >
                    ✕
                </button>

            </div>


            {/* OPCIONES */}

            <div className="config-options">


                {/* MI CUENTA */}

                <button
                    className="config-option"
                    onClick={() => {
                        alert("Próximamente: Mi cuenta y seguridad");
                    }}
                >

                    <div className="config-option-icon">

                        <UserRound size={20} />

                    </div>

                    <div className="config-option-content">

                        <strong>
                            Mi cuenta y seguridad
                        </strong>

                        <span>
                            Perfil, contraseña y seguridad de la cuenta
                        </span>

                    </div>

                    <ChevronRight
                        size={18}
                        className="config-arrow"
                    />

                </button>


                {/* USUARIOS */}

                <button
                    className="config-option"
                    onClick={() => {
                        alert("Próximamente: Usuarios y permisos");
                    }}
                >

                    <div className="config-option-icon">

                        <UsersRound size={20} />

                    </div>

                    <div className="config-option-content">

                        <strong>
                            Usuarios y permisos
                        </strong>

                        <span>
                            Administra usuarios, roles y accesos
                        </span>

                    </div>

                    <ChevronRight
                        size={18}
                        className="config-arrow"
                    />

                </button>

{/* CERRAR SESIÓN */}

<button
    className="config-option"
   onClick={() => {
    setConfirmarCerrarSesion(true);
}}
>

    <div className="config-option-icon">

        <LogOut size={20} />

    </div>

    <div className="config-option-content">

        <strong>
            Cerrar sesión
        </strong>

        <span>
            Salir de tu cuenta de forma segura
        </span>

    </div>

    <ChevronRight
        size={18}
        className="config-arrow"
    />

</button>
</div>
            {/* INFORMACIÓN DE SEGURIDAD */}

            <div className="config-security-info">

                <ShieldCheck size={18} />

                <div>

                    <strong>
                        Acceso seguro
                    </strong>

                    <span>
                        Solo los administradores pueden modificar
                        los permisos de los usuarios.
                    </span>

                </div>

            </div>

        </div>

    </div>

)}
            </div>
{/* CONFIRMAR CERRAR SESIÓN */}

{confirmarCerrarSesion && (

    <div className="logout-overlay">

        <div className="logout-modal">

            <div className="logout-icon">

                <LogOut size={24} />

            </div>

            <h3>
                ¿Cerrar sesión?
            </h3>

            <p>
                ¿Estás segura de que deseas cerrar sesión?
                Tendrás que iniciar sesión nuevamente para acceder a SIREM.
            </p>


            <div className="logout-actions">

                <button
                    className="logout-cancel"
                    onClick={() =>
                        setConfirmarCerrarSesion(false)
                    }
                >
                    Cancelar
                </button>


                <button
                    className="logout-confirm"
                    onClick={() => {

                        setConfirmarCerrarSesion(false);

                        cerrarSesion();

                    }}
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