import { useState, useEffect, useCallback } from "react";

import Layout from "./components/Layout/Layout";
import Login from "./pages/Login";
import { CLAVE_SESION } from "./utils/api";
import { PAGINA_INICIAL, buscarPagina, puedeVer } from "./utils/paginas";
import { useAvisos } from "./components/Avisos/Avisos";

/*
La página activa vive en la URL (#/cartera, #/clientes...), así
funcionan los botones Atrás/Adelante del navegador y al recargar
se vuelve a la misma sección.
*/

const leerPaginaDeUrl = () =>
  window.location.hash.replace(/^#\/?/, "") || PAGINA_INICIAL;

function App() {
  const { avisar } = useAvisos();

  const [paginaUrl, setPaginaUrl] = useState(leerPaginaDeUrl);

  const [usuarioActual, setUsuarioActual] = useState(() => {
    try {
      const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION));

      return sesion?.token ? sesion : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const alCambiarUrl = () => setPaginaUrl(leerPaginaDeUrl());

    window.addEventListener("hashchange", alCambiarUrl);

    return () => window.removeEventListener("hashchange", alCambiarUrl);
  }, []);

  const pagina = buscarPagina(paginaUrl);

  const paginaActiva =
    pagina && puedeVer(pagina, usuarioActual) ? pagina.id : PAGINA_INICIAL;

  useEffect(() => {
    document.title = usuarioActual
      ? `${buscarPagina(paginaActiva).nombre} · SIREM`
      : "SIREM · Talabartería San Fermín";
  }, [paginaActiva, usuarioActual]);

  const setPaginaActiva = useCallback((id) => {
    window.location.hash = `/${id}`;

    document.querySelector(".content")?.scrollTo({ top: 0 });
  }, []);

  const iniciarSesion = (usuario) => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));

    setUsuarioActual(usuario);

    const primerNombre = usuario.nombre?.split(" ")[0] || "";

    avisar.exito("Que tengas una excelente jornada.", `Hola, ${primerNombre}`);
  };

  const cerrarSesion = () => {
    localStorage.removeItem(CLAVE_SESION);

    setUsuarioActual(null);

    avisar.info("Tu sesión se cerró de forma segura.", "Hasta pronto");
  };

  if (!usuarioActual) {
    return <Login iniciarSesion={iniciarSesion} />;
  }

  return (
    <Layout
      paginaActiva={paginaActiva}
      setPaginaActiva={setPaginaActiva}
      usuarioActual={usuarioActual}
      cerrarSesion={cerrarSesion}
    />
  );
}

export default App;
