import React, { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, X } from "lucide-react";

import "./Clientes.css";

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    nombre: "",
    tipo_documento: "CC",
    documento: "",
    ciudad: "",
    telefono: "",
    correo: "",
    direccion: "",
  });

  // ================================
  // CARGAR CLIENTES
  // ================================

  const cargarClientes = async (pagina = 1, textoBusqueda = busqueda) => {
    try {
      const parametros = new URLSearchParams();

      parametros.set("page", pagina);

      if (textoBusqueda.trim()) {
        parametros.set("busqueda", textoBusqueda.trim());
      }

      const respuesta = await fetch(`/api/clientes?${parametros.toString()}`);

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los clientes.");
      }

      const datos = await respuesta.json();

      setClientes(datos.clientes || []);

      setTotalClientes(datos.total || 0);

      setTotalPaginas(datos.totalPaginas || 0);

      setPaginaActual(datos.pagina || pagina);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    }
  };

  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarClientes(1, busqueda);
    }, 300);

    return () => {
      clearTimeout(temporizador);
    };
  }, [busqueda]);

  // ================================
  // CAMBIAR BÚSQUEDA
  // ================================

  const cambiarBusqueda = (valor) => {
    setBusqueda(valor);
    setPaginaActual(1);
  };

  // ================================
  // ABRIR NUEVO
  // ================================

  const nuevoCliente = () => {
    setClienteEditando(null);

    setFormulario({
      nombre: "",
      tipo_documento: "CC",
      documento: "",
      ciudad: "",
      telefono: "",
      correo: "",
      direccion: "",
    });

    setModalAbierto(true);
  };

  // ================================
  // ABRIR EDICIÓN
  // ================================

  const editarCliente = (cliente) => {
    setClienteEditando(cliente);

    setFormulario({
      nombre: cliente.nombre || "",
      tipo_documento: cliente.tipo_documento || "CC",
      documento: cliente.documento || "",
      ciudad: cliente.ciudad || "",
      telefono: cliente.telefono || "",
      correo: cliente.correo || "",
      direccion: cliente.direccion || "",
    });

    setModalAbierto(true);
  };

  // ================================
  // CAMBIAR FORMULARIO
  // ================================

  const cambiarCampo = (campo, valor) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  // ================================
  // GUARDAR
  // ================================

  const guardarCliente = async (e) => {
    e.preventDefault();

    try {
      const url = clienteEditando
        ? `/api/clientes/${clienteEditando.id_cliente}`
        : "/api/clientes";

      const metodo = clienteEditando ? "PUT" : "POST";

      const respuesta = await fetch(url, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formulario),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        alert(resultado.mensaje || "No se pudo guardar el cliente.");

        return;
      }

      setModalAbierto(false);

      await cargarClientes();
    } catch (error) {
      console.error("Error guardando cliente:", error);

      alert("No se pudo conectar con el servidor.");
    }
  };

  // ================================
  // DESACTIVAR
  // ================================

  const eliminarCliente = async (cliente) => {
    const confirmar = window.confirm(
      `¿Deseas eliminar al cliente "${cliente.nombre}"?`,
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(`/api/clientes/${cliente.id_cliente}`, {
        method: "DELETE",
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        alert(resultado.mensaje || "No se pudo eliminar el cliente.");

        return;
      }

      await cargarClientes();
    } catch (error) {
      console.error("Error eliminando cliente:", error);

      alert("No se pudo conectar con el servidor.");
    }
  };

  return (
    <div className="clientes-page">
      {/* ENCABEZADO */}

      <div className="clientes-header">
        <div>
          <span className="clientes-kicker">MAESTROS</span>

          <h1>Clientes</h1>

          <p>Consulta y administra los clientes de SIREM.</p>
        </div>

        <button className="clientes-btn-primary" onClick={nuevoCliente}>
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* CONTENEDOR */}

      <div className="clientes-card">
        {/* BUSCADOR */}

        <div className="clientes-toolbar">
          <div className="clientes-search">
            <Search size={16} />

            <input
              type="text"
              placeholder="Buscar cliente, documento o teléfono..."
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
            />
          </div>

          <span className="clientes-count">
            {totalClientes.toLocaleString("es-CO")} clientes
          </span>
        </div>

        {/* TABLA */}

        <div className="clientes-table-wrapper">
          <table className="clientes-table">
            <thead>
              <tr>
                <th>CLIENTE</th>
                <th>DOCUMENTO</th>
                <th>CIUDAD</th>
                <th>TELÉFONO</th>
                <th>CORREO</th>
                <th>ESTADO</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id_cliente}>
                  <td>
                    <strong>{cliente.nombre}</strong>
                  </td>

                  <td>
                    {cliente.tipo_documento} {cliente.documento}
                  </td>

                  <td>{cliente.ciudad || "—"}</td>

                  <td>{cliente.telefono || "—"}</td>

                  <td>{cliente.correo || "—"}</td>

                  <td>
                    <span
                      className={
                        cliente.activo ? "cliente-activo" : "cliente-inactivo"
                      }
                    >
                      {cliente.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  <td>
                    <div className="clientes-actions">
                      <button
                        title="Editar"
                        onClick={() => editarCliente(cliente)}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        title="Eliminar"
                        className="delete"
                        onClick={() => eliminarCliente(cliente)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {clientes.length === 0 && (
                <tr>
                  <td colSpan="7" className="clientes-empty">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalClientes > 0 && (
            <div className="clientes-pagination">
              <div className="clientes-pagination-info">
                Mostrando{" "}
                {((paginaActual - 1) * 20 + 1).toLocaleString("es-CO")}
                {"–"}
                {Math.min(paginaActual * 20, totalClientes).toLocaleString(
                  "es-CO",
                )}
                {" de "}
                {totalClientes.toLocaleString("es-CO")}
                {" clientes"}
              </div>

              <div className="clientes-pagination-buttons">
                <button
                  type="button"
                  disabled={paginaActual === 1}
                  onClick={() => cargarClientes(paginaActual - 1)}
                >
                  ← Anterior
                </button>

                {Array.from(
                  {
                    length: Math.min(totalPaginas, 7),
                  },
                  (_, indice) => {
                    let pagina;

                    if (totalPaginas <= 7) {
                      pagina = indice + 1;
                    } else if (paginaActual <= 4) {
                      pagina = indice + 1;
                    } else if (paginaActual >= totalPaginas - 3) {
                      pagina = totalPaginas - 6 + indice;
                    } else {
                      pagina = paginaActual - 3 + indice;
                    }

                    return (
                      <button
                        type="button"
                        key={pagina}
                        className={pagina === paginaActual ? "active" : ""}
                        onClick={() => cargarClientes(pagina)}
                      >
                        {pagina}
                      </button>
                    );
                  },
                )}

                <button
                  type="button"
                  disabled={paginaActual === totalPaginas}
                  onClick={() => cargarClientes(paginaActual + 1)}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}

      {modalAbierto && (
        <div
          className="cliente-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModalAbierto(false);
            }
          }}
        >
          <div className="cliente-modal">
            <div className="cliente-modal-header">
              <div>
                <span>{clienteEditando ? "EDITAR" : "NUEVO"}</span>

                <h2>{clienteEditando ? "Editar cliente" : "Nuevo cliente"}</h2>
              </div>

              <button onClick={() => setModalAbierto(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={guardarCliente} className="cliente-form">
              <div className="cliente-form-grid">
                <div className="cliente-field cliente-field-wide">
                  <label>Nombre *</label>

                  <input
                    value={formulario.nombre}
                    onChange={(e) => cambiarCampo("nombre", e.target.value)}
                    required
                  />
                </div>

                <div className="cliente-field">
                  <label>Tipo documento *</label>

                  <select
                    value={formulario.tipo_documento}
                    onChange={(e) =>
                      cambiarCampo("tipo_documento", e.target.value)
                    }
                  >
                    <option value="CC">Cédula</option>

                    <option value="NIT">NIT</option>

                    <option value="CE">Cédula extranjería</option>

                    <option value="PAS">Pasaporte</option>
                  </select>
                </div>

                <div className="cliente-field">
                  <label>Documento *</label>

                  <input
                    value={formulario.documento}
                    onChange={(e) => cambiarCampo("documento", e.target.value)}
                    required
                  />
                </div>

                <div className="cliente-field">
                  <label>Ciudad</label>

                  <input
                    value={formulario.ciudad}
                    onChange={(e) => cambiarCampo("ciudad", e.target.value)}
                  />
                </div>

                <div className="cliente-field">
                  <label>Teléfono</label>

                  <input
                    value={formulario.telefono}
                    onChange={(e) => cambiarCampo("telefono", e.target.value)}
                  />
                </div>

                <div className="cliente-field cliente-field-wide">
                  <label>Correo</label>

                  <input
                    type="email"
                    value={formulario.correo}
                    onChange={(e) => cambiarCampo("correo", e.target.value)}
                  />
                </div>

                <div className="cliente-field cliente-field-wide">
                  <label>Dirección</label>

                  <input
                    value={formulario.direccion}
                    onChange={(e) => cambiarCampo("direccion", e.target.value)}
                  />
                </div>
              </div>

              <div className="cliente-form-actions">
                <button
                  type="button"
                  className="cliente-btn-secondary"
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>

                <button type="submit" className="clientes-btn-primary">
                  {clienteEditando ? "Guardar cambios" : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;
