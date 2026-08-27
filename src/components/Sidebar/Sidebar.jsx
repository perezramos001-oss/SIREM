import {
    House,
    FileText,
    Wallet,
    Download,
    Settings,
    PanelLeftClose,
    PanelLeftOpen
} from "lucide-react";

import "./Sidebar.css";

function Sidebar({
    paginaActiva,
    setPaginaActiva,
    usuarioActual,
    contraido,
    setContraido
}) {


    return (

        <aside className={`sidebar ${contraido ? "contraido" : ""}`}>
<button
    className="sidebar-toggle"
    onClick={() => setContraido(!contraido)}
    title={contraido ? "Mostrar menú" : "Ocultar menú"}
>
    {contraido
        ? <PanelLeftOpen size={19} />
        : <PanelLeftClose size={19} />
    }
</button>
            <div className="sidebar-logo">

               <div className="logo-icon">

    <span className="letter-s">S</span>
    <span className="letter-f">F</span>

</div>

                <div className="logo-text">

                    <h2>SIREM</h2>

                    <span>Talabarteria San Fermín</span>

                </div>

            </div>

            <div className="sidebar-divider"></div>

            <span className="menu-title">
                GENERAL
            </span>

            <nav className="sidebar-menu">
<button
    className={`menu-item ${paginaActiva === "inicio" ? "active" : ""}`}
    onClick={() => setPaginaActiva("inicio")}
>
    <House size={18} />
    <span className="menu-text">Inicio</span>
</button>
                <button
    className={`menu-item ${paginaActiva === "remisiones" ? "active" : ""}`}
    onClick={() => setPaginaActiva("remisiones")}
>
    <FileText size={18} />
    <span className="menu-text">Remisiones</span>
</button>

                <button
    className={`menu-item ${paginaActiva === "cartera" ? "active" : ""}`}
    onClick={() => setPaginaActiva("cartera")}
>
    <Wallet size={18} />
    <span className="menu-text">Cartera</span>
</button>

            </nav>

            <span className="menu-title">

                ANÁLISIS

            </span>

            <nav className="sidebar-menu">

                <button
    className={`menu-item ${paginaActiva === "exportaciones" ? "active" : ""}`}
    onClick={() => setPaginaActiva("exportaciones")}
>
    <Download size={18} />
    <span className="menu-text">Exportaciones</span>
</button>

            </nav>

            <span className="menu-title">

                SISTEMA

            </span>

            <nav className="sidebar-menu">

                <button
    className={`menu-item ${paginaActiva === "configuracion" ? "active" : ""}`}
    onClick={() => setPaginaActiva("configuracion")}
>
    <Settings size={18} />
    <span className="menu-text">Configuración</span>
</button>

            </nav>

        <div className="sidebar-user">

    <div className="avatar">
        {usuarioActual.nombre
            ?.split(" ")
            .map(nombre => nombre[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
    </div>

    <div className="sidebar-user-info">

        <strong>
            {usuarioActual.nombre}
        </strong>

        <span>
            {usuarioActual.rol}
        </span>

    </div>

</div>

        </aside>

    );

}

export default Sidebar;