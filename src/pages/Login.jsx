import { useEffect, useState } from "react";
import { LockKeyhole, UserRound, LogIn, Eye, EyeOff } from "lucide-react";
import { useAvisos } from "../components/Avisos/Avisos";
import { CLAVE_SESION_VENCIDA } from "../utils/api";
import "./Login.css";

function Login({ iniciarSesion }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);

  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const { avisar } = useAvisos();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLAVE_SESION_VENCIDA)) {
        sessionStorage.removeItem(CLAVE_SESION_VENCIDA);

        avisar.info(
          "Por seguridad, vuelve a ingresar tus credenciales.",
          "Tu sesión expiró",
        );
      }
    } catch {
      /* sin almacenamiento de sesión */
    }
  }, [avisar]);

  const manejarLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!usuario.trim()) {
      setError("Ingresa tu usuario.");

      return;
    }

    if (!password.trim()) {
      setError("Ingresa tu contraseña.");

      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch("/api/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          usuario,
          password,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.mensaje || "Usuario o contraseña incorrectos.");

        return;
      }

      iniciarSesion({ ...datos.usuario, token: datos.token });
    } catch (error) {
      console.error("Error conectando con el servidor:", error);

      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <span>S</span>
            <span>F</span>
          </div>

          <div>
            <h1>SIREM</h1>

            <p>Talabartería San Fermín</p>
          </div>
        </div>

        <div className="login-header">
          <span className="login-tag">ACCESO AL SISTEMA</span>

          <h2>Bienvenido</h2>

          <p>Ingresa tus credenciales para continuar.</p>
        </div>

        <form onSubmit={manejarLogin}>
          <div className="login-field">
            <label htmlFor="login-usuario">Usuario</label>

            <div className="login-input-wrapper">
              <UserRound size={17} />

              <input
                id="login-usuario"
                type="text"
                autoFocus
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value);
                  setError("");
                }}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Contraseña</label>

            <div className="login-input-wrapper">
              <LockKeyhole size={17} />

              <input
                id="login-password"
                type={verPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="login-ver-password"
                onClick={() => setVerPassword(!verPassword)}
                title={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {verPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <span>!</span>

              <p>{error}</p>
            </div>
          )}

          <button type="submit" className="login-button" disabled={cargando}>
            <LogIn size={17} />

            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
