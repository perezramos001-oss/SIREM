import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { useAvisos } from "../components/Avisos/Avisos";

import "./Auditoria.css";

function Auditoria() {
  const { avisar } = useAvisos();

  const [registros, setRegistros] = useState([]);
  const [usuarioFiltro, setUsuarioFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);

  /* =========================
       CARGAR AUDITORÍA
    ========================= */

  const cargarAuditoria = async () => {
    try {
      setCargando(true);

      const respuesta = await apiFetch("/api/auditoria");

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los registros de auditoría.");
      }

      const datos = await respuesta.json();

      setRegistros(datos);
    } catch (error) {
      console.error("Error cargando auditoría:", error);

      avisar.fallo(error, "No se pudo cargar el registro de actividad.");

      setRegistros([]);
    } finally {
      setCargando(false);
    }
  };

  /* =========================
       CARGAR AL ABRIR
    ========================= */

  useEffect(() => {
    cargarAuditoria();
  }, []);

  /* =========================
       USUARIOS DEL FILTRO
    ========================= */

  const usuarios = [
    ...new Map(
      registros
        .filter((registro) => registro.id_usuario)
        .map((registro) => [registro.id_usuario, registro.usuario]),
    ).entries(),
  ];

  /* =========================
       FILTRAR REGISTROS
    ========================= */

  const registrosFiltrados =
    usuarioFiltro === "todos"
      ? registros
      : registros.filter(
          (registro) => String(registro.id_usuario) === String(usuarioFiltro),
        );

  /* =========================
       FORMATEAR FECHA
    ========================= */

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";

    const fechaObj = new Date(fecha);

    if (Number.isNaN(fechaObj.getTime())) {
      return "-";
    }

    return fechaObj.toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="auditoria-page">
      <div className="page-header">
        <div>
          <span className="page-tag">AUDITORÍA</span>

          <h1>Registro de actividad</h1>

          <p>Consulta las acciones realizadas por los usuarios en SIREM.</p>
        </div>
      </div>

      {/* =========================
               FILTRO
            ========================= */}

      <div className="auditoria-toolbar">
        <select
          value={usuarioFiltro}
          onChange={(e) => setUsuarioFiltro(e.target.value)}
        >
          <option value="todos">Todos los usuarios</option>

          {usuarios.map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </select>
      </div>

      {/* =========================
               LISTA
            ========================= */}

      <div className="auditoria-lista">
        {cargando ? (
          <div className="auditoria-vacio">
            <span>Cargando actividad...</span>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="auditoria-vacio">
            <span>Aún no hay actividad registrada.</span>
          </div>
        ) : (
          registrosFiltrados.map((registro) => (
            <div className="auditoria-item" key={registro.id_auditoria}>
              <div className="auditoria-icono">✓</div>

              <div className="auditoria-contenido">
                <div className="auditoria-descripcion">
                  <strong>{registro.usuario || "Usuario eliminado"}</strong>

                  <span>{registro.descripcion}</span>
                </div>

                <div className="auditoria-meta">
                  <span>{registro.modulo}</span>

                  <span>{formatearFecha(registro.fecha)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Auditoria;
