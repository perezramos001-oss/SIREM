import { useState } from "react";
import { apiFetch } from "../../utils/api";
import { useAvisos } from "../Avisos/Avisos";
import "./BuscarCliente.css";

function BuscarCliente({ abierto, cerrar, seleccionarCliente }) {
  const { avisar } = useAvisos();

  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    tipo_documento: "NIT",
    documento: "",
    telefono: "",
    correo: "",
    direccion: "",
  });

  if (!abierto) return null;

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setNuevoCliente({
      ...nuevoCliente,
      [name]: value,
    });
  };

  const buscarClientes = async (texto) => {
    setBusqueda(texto);

    if (!texto.trim()) {
      setClientes([]);
      return;
    }

    try {
      setBuscando(true);

      const respuesta = await apiFetch(
        `/api/clientes/buscar/${encodeURIComponent(texto)}`,
      );

      if (!respuesta.ok) {
        throw new Error("No se pudieron buscar los clientes.");
      }

      const datos = await respuesta.json();

      setClientes(datos);
    } catch (error) {
      console.error("Error buscando clientes:", error);

      setClientes([]);
    } finally {
      setBuscando(false);
    }
  };
  const registrarCliente = async (e) => {
    e.preventDefault();

    try {
      const respuesta = await apiFetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nuevoCliente),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo guardar el cliente.");
      }

      const clienteCreado = {
        id_cliente: datos.id_cliente,
        ...nuevoCliente,
      };

      // Lo seleccionamos inmediatamente para esta remisión
      seleccionarCliente(clienteCreado, true);

      // Limpiar formulario
      setNuevoCliente({
        nombre: "",
        tipo_documento: "NIT",
        documento: "",
        telefono: "",
        correo: "",
        direccion: "",
      });

      setMostrarNuevoCliente(false);

      setBusqueda("");
      setClientes([]);
    } catch (error) {
      console.error("Error guardando cliente:", error);

      avisar.fallo(error, error.message || "No se pudo guardar el cliente.");
    }
  };

  return (
    <div className="cliente-overlay">
      {!mostrarNuevoCliente ? (
        <div className="cliente-modal">
          <div className="cliente-header">
            <div>
              <span>CLIENTES</span>
              <h2>Buscar cliente</h2>
            </div>

            <button
              onClick={() => {
                setBusqueda("");
                cerrar();
              }}
            >
              ✕
            </button>
          </div>

          <input
            className="cliente-search"
            type="text"
            placeholder="Buscar por nombre, documento o teléfono..."
            value={busqueda}
            onChange={(e) => buscarClientes(e.target.value)}
          />

          <div className="cliente-lista">
            {!busqueda.trim() ? (
              <div className="cliente-busqueda-vacia">
                <span>🔎</span>
                <p>
                  Escribe el nombre, documento o teléfono del cliente para
                  buscar.
                </p>
              </div>
            ) : buscando ? (
              <div className="cliente-busqueda-vacia">
                <span>🔎</span>
                <p>No encontramos clientes con esa búsqueda.</p>
              </div>
            ) : clientes.length === 0 ? (
              <div className="cliente-busqueda-vacia">
                <span>🔎</span>
                <p>No encontramos clientes con esa búsqueda.</p>
              </div>
            ) : (
              clientes.map((cliente) => (
                <div
                  key={cliente.id_cliente}
                  className="cliente-item"
                  onClick={() => seleccionarCliente(cliente)}
                >
                  <div className="cliente-top">
                    <span className="cliente-icon">🏢</span>

                    <strong>{cliente.nombre}</strong>
                  </div>

                  <div className="cliente-bottom">
                    <span>
                      {cliente.tipo_documento} {cliente.documento}
                    </span>

                    <span>📍 {cliente.direccion}</span>

                    <span>📞 {cliente.telefono}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="nuevo-cliente-box">
            <p>¿No encuentras el cliente?</p>

            <button
              className="nuevo-cliente"
              onClick={() => setMostrarNuevoCliente(true)}
            >
              + Registrar nuevo cliente
            </button>
          </div>
        </div>
      ) : (
        <div className="cliente-modal nuevo-cliente-modal">
          <div className="cliente-header">
            <div>
              <span>CLIENTES</span>
              <h2>Registrar nuevo cliente</h2>
            </div>

            <button onClick={() => setMostrarNuevoCliente(false)}>✕</button>
          </div>

          <form className="form-nuevo-cliente" onSubmit={registrarCliente}>
            <div className="form-grupo">
              <label>Nombre / Razón social</label>

              <input
                type="text"
                name="nombre"
                value={nuevoCliente.nombre}
                onChange={manejarCambio}
                placeholder="Ej. Ganadería El Rodeo"
                required
              />
            </div>

            <div className="form-fila">
              <div className="form-grupo">
                <label>Tipo de documento</label>

                <select
                  className="select-documento"
                  name="tipo_documento"
                  value={nuevoCliente.tipo_documento}
                  onChange={manejarCambio}
                  required
                >
                  <option value="NIT">NIT</option>
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="PAS">PAS</option>
                </select>
              </div>

              <div className="form-grupo">
                <label>Número de documento</label>

                <input
                  type="text"
                  name="documento"
                  value={nuevoCliente.documento}
                  onChange={manejarCambio}
                  placeholder="Ej. 900123456"
                  required
                />
              </div>

              <div className="form-grupo">
                <label>Teléfono</label>

                <input
                  type="text"
                  name="telefono"
                  value={nuevoCliente.telefono}
                  onChange={manejarCambio}
                  placeholder="Ej. 3204567890"
                />
              </div>
            </div>

            <div className="form-grupo">
              <label>Correo electrónico</label>

              <input
                type="email"
                name="correo"
                value={nuevoCliente.correo}
                onChange={manejarCambio}
                placeholder="correo@empresa.com"
              />
            </div>

            <div className="form-grupo">
              <label>Dirección</label>

              <input
                type="text"
                name="direccion"
                value={nuevoCliente.direccion}
                onChange={manejarCambio}
                placeholder="Dirección del cliente"
              />
            </div>

            <div className="form-acciones">
              <button
                type="button"
                className="btn-cancelar"
                onClick={() => setMostrarNuevoCliente(false)}
              >
                Cancelar
              </button>

              <button type="submit" className="btn-guardar-cliente">
                Guardar cliente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default BuscarCliente;
