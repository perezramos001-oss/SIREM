import { emitirAviso } from "../components/Avisos/Avisos";

export const CLAVE_SESION = "usuarioSirem";

/* Marca que lee el login para explicar por qué se cerró la sesión */
export const CLAVE_SESION_VENCIDA = "sirem_sesion_vencida";

const obtenerToken = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION))?.token || null;
  } catch {
    return null;
  }
};

/*
Igual que fetch, pero:
- envía el token de la sesión;
- si el servidor responde 401 (sesión vencida o usuario
  desactivado) cierra la sesión y vuelve al login;
- si no hay conexión con el servidor, muestra un aviso.
*/

export const apiFetch = async (url, opciones = {}) => {
  const token = obtenerToken();

  let respuesta;

  try {
    respuesta = await fetch(url, {
      ...opciones,
      headers: {
        ...opciones.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  } catch (error) {
    if (error.name !== "AbortError") {
      /* Las páginas no repiten este aviso (ver avisar.fallo) */
      error.avisado = true;

      emitirAviso(
        "error",
        "Revisa tu conexión a internet o que el servidor de SIREM esté encendido.",
        "Sin conexión con el servidor",
      );
    }

    throw error;
  }

  if (respuesta.status === 401) {
    try {
      localStorage.removeItem(CLAVE_SESION);
      sessionStorage.setItem(CLAVE_SESION_VENCIDA, "1");
    } catch {
      /* sin almacenamiento: igual se recarga */
    }

    window.location.reload();
  }

  return respuesta;
};

export const apiGetJson = async (url) => {
  const respuesta = await apiFetch(url);

  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} consultando ${url}`);
  }

  return respuesta.json();
};
