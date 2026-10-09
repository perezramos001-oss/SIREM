import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { SECCIONES, puedeVer } from "../../utils/paginas";

import "./Sidebar.css";

function Sidebar({
  paginaActiva,
  setPaginaActiva,
  usuarioActual,
  contraido,
  setContraido,
  pedirCerrarSesion,
}) {
  const iniciales = usuarioActual.nombre
    ?.split(" ")
    .filter(Boolean)
    .map((nombre) => nombre[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className={`sidebar ${contraido ? "contraido" : ""}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setContraido(!contraido)}
        title={contraido ? "Mostrar menú" : "Ocultar menú"}
        aria-label={contraido ? "Mostrar menú" : "Ocultar menú"}
      >
        {contraido ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
      </button>

      <button
        className="sidebar-logo"
        onClick={() => setPaginaActiva("inicio")}
        title="Ir al inicio"
      >
        <div className="logo-icon">
          <span className="letter-s">S</span>
          <span className="letter-f">F</span>
        </div>

        <div className="logo-text">
          <h2>SIREM</h2>

          <span>Talabartería San Fermín</span>
        </div>
      </button>

      <div className="sidebar-divider"></div>

      <div className="sidebar-secciones">
        {SECCIONES.map((seccion) => {
          const paginas = seccion.paginas.filter((pagina) =>
            puedeVer(pagina, usuarioActual),
          );

          if (paginas.length === 0) return null;

          return (
            <div key={seccion.titulo}>
              <span className="menu-title">{seccion.titulo}</span>

              <nav className="sidebar-menu" aria-label={seccion.titulo}>
                {paginas.map(({ id, nombre, icono: Icono }) => (
                  <button
                    key={id}
                    className={`menu-item ${paginaActiva === id ? "active" : ""}`}
                    onClick={() => setPaginaActiva(id)}
                    title={contraido ? nombre : undefined}
                    aria-current={paginaActiva === id ? "page" : undefined}
                  >
                    <Icono size={18} />
                    <span className="menu-text">{nombre}</span>
                  </button>
                ))}
              </nav>
            </div>
          );
        })}
      </div>

      <div className="sidebar-user">
        <div className="avatar">{iniciales}</div>

        <div className="sidebar-user-info">
          <strong>{usuarioActual.nombre}</strong>

          <span>{usuarioActual.rol}</span>
        </div>

        <button
          className="sidebar-logout"
          onClick={pedirCerrarSesion}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
