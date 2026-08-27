import { useState } from "react";

import Layout from "./components/Layout/Layout";
import Login from "./pages/Login";


function App() {


    const [paginaActiva, setPaginaActiva] =
        useState("inicio");


    const [contraido, setContraido] =
     useState(false);

    const [usuarioActual, setUsuarioActual] =
        useState(() => {

            const usuarioGuardado =
                localStorage.getItem("usuarioSirem");

            return usuarioGuardado
                ? JSON.parse(usuarioGuardado)
                : null;

        });


    const iniciarSesion = (usuario) => {

        localStorage.setItem(
            "usuarioSirem",
            JSON.stringify(usuario)
        );

        setUsuarioActual(usuario);

    };


    const cerrarSesion = () => {

        localStorage.removeItem(
            "usuarioSirem"
        );

        setUsuarioActual(null);

    };


    if (!usuarioActual) {

        return (
            <Login
                iniciarSesion={iniciarSesion}
            />
        );

    }


    return (

        <Layout
    paginaActiva={paginaActiva}
    setPaginaActiva={setPaginaActiva}
    usuarioActual={usuarioActual}
    cerrarSesion={cerrarSesion}
    contraido={contraido}
    setContraido={setContraido}
/>

    );

}


export default App;