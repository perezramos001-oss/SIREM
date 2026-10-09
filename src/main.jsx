import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AvisosProvider, emitirAviso } from "./components/Avisos/Avisos.jsx";
import "./styles/global.css";

/*
Red de seguridad: si alguna librería (por ejemplo jsPDF) llama a
alert(), se muestra como aviso de SIREM en lugar de la ventana
"localhost dice" del navegador.
*/
window.alert = (mensaje) => {
  emitirAviso("info", String(mensaje ?? ""), "Aviso");
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AvisosProvider>
      <App />
    </AvisosProvider>
  </React.StrictMode>,
);
