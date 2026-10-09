import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { useTeclaEscape } from "../utils/useTeclaEscape";
import { useAvisos } from "../components/Avisos/Avisos";
import { Search, Plus, Pencil, Trash2, X } from "lucide-react";

import "./Productos.css";

function Productos() {
  const { avisar, confirmar } = useAvisos();

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState([]);

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    codigo: "",
    nombre: "",
    linea: "",
    precio_lista: "",
  });

  // ================================
  // CARGAR PRODUCTOS
  // ================================

  const cargarProductos = async (pagina = 1, textoBusqueda = busqueda) => {
    try {
      const parametros = new URLSearchParams();

      parametros.set("page", pagina);

      if (textoBusqueda.trim()) {
        parametros.set("busqueda", textoBusqueda.trim());
      }

      const respuesta = await apiFetch(`/api/productos?${parametros.toString()}`);

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los productos.");
      }

      const datos = await respuesta.json();

      setProductos(datos.productos || []);

      setTotalProductos(datos.total || 0);

      setTotalPaginas(datos.totalPaginas || 0);

      setPaginaActual(datos.pagina || pagina);
    } catch (error) {
      console.error("Error cargando productos:", error);

      avisar.fallo(error, "No se pudieron cargar los productos.");
    }
  };

  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarProductos(1, busqueda);
    }, 300);

    return () => {
      clearTimeout(temporizador);
    };
  }, [busqueda]);

  useEffect(() => {
    cargarLineas();
  }, []);

  /* ================================
   CARGAR LÍNEAS
================================ */

  const cargarLineas = async () => {
    try {
      const respuesta = await apiFetch("/api/productos/lineas");

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar las líneas.");
      }

      const datos = await respuesta.json();

      setLineas(datos || []);
    } catch (error) {
      console.error("Error cargando líneas:", error);

      avisar.fallo(error, "No se pudieron cargar las líneas de producto.");
    }
  };

  // ================================
  // FORMATO PRECIO
  // ================================

  const formatearPrecio = (valor) => {
    return Number(valor || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  };

  // ================================
  // NUEVO PRODUCTO
  // ================================

  const nuevoProducto = () => {
    setProductoEditando(null);

    setFormulario({
      codigo: "",
      nombre: "",
      linea: "",
      precio_lista: "",
    });

    setModalAbierto(true);
  };

  // ================================
  // EDITAR PRODUCTO
  // ================================

  const editarProducto = (producto) => {
    setProductoEditando(producto);

    setFormulario({
      codigo: producto.codigo || "",
      nombre: producto.nombre || "",
      linea: producto.linea || "",
      precio_lista: producto.precio_lista || "",
    });

    setModalAbierto(true);
  };

  // ================================
  // CAMBIAR CAMPO
  // ================================

  const cambiarCampo = (campo, valor) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  // ================================
  // GUARDAR PRODUCTO
  // ================================

  const guardarProducto = async (e) => {
    e.preventDefault();

    try {
      const url = productoEditando
        ? `/api/productos/${productoEditando.id_producto}`
        : "/api/productos";

      const metodo = productoEditando ? "PUT" : "POST";

      const respuesta = await apiFetch(url, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formulario,
          precio_lista: Number(formulario.precio_lista) || 0,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        avisar.error(resultado.mensaje || "No se pudo guardar el producto.");

        return;
      }

      setModalAbierto(false);

      avisar.exito(
        productoEditando
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );

      await cargarProductos(paginaActual, busqueda);
    } catch (error) {
      console.error("Error guardando producto:", error);

      avisar.fallo(error, "No se pudo completar la operación. Intenta de nuevo.");
    }
  };

  // ================================
  // DESACTIVAR PRODUCTO
  // ================================

  const eliminarProducto = async (producto) => {
    const confirmado = await confirmar({
      titulo: "¿Desactivar producto?",
      mensaje: `Vas a desactivar el producto "${producto.nombre}". Ya no aparecerá en las búsquedas.`,
      textoConfirmar: "Desactivar",
      peligro: true,
    });

    if (!confirmado) return;

    try {
      const respuesta = await apiFetch(`/api/productos/${producto.id_producto}`, {
        method: "DELETE",
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        avisar.error(resultado.mensaje || "No se pudo desactivar el producto.");

        return;
      }

      avisar.exito(`Producto "${producto.nombre}" desactivado.`);

      await cargarProductos(paginaActual, busqueda);
    } catch (error) {
      console.error("Error eliminando producto:", error);

      avisar.fallo(error, "No se pudo completar la operación. Intenta de nuevo.");
    }
  };


  useTeclaEscape(modalAbierto, () => setModalAbierto(false));

  return (
    <div className="productos-page">
      {/* =========================
                ENCABEZADO
            ========================= */}

      <div className="productos-header">
        <div>
          <span className="productos-kicker">MAESTROS</span>

          <h1>Productos</h1>

          <p>Consulta y administra los productos de SIREM.</p>
        </div>

        <button className="productos-btn-primary" onClick={nuevoProducto}>
          <Plus size={16} />
          Nuevo producto
        </button>
      </div>

      {/* =========================
                TABLA
            ========================= */}

      <div className="productos-card">
        <div className="productos-toolbar">
          <div className="productos-search">
            <Search size={16} />

            <input
              type="text"
              placeholder="Buscar por código, producto o línea..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <span className="productos-count">
            {totalProductos.toLocaleString("es-CO")} productos
          </span>
        </div>

        <div className="productos-table-wrapper">
          <table className="productos-table">
            <thead>
              <tr>
                <th>CÓDIGO</th>

                <th>PRODUCTO</th>

                <th>LÍNEA</th>

                <th>PRECIO DE LISTA</th>

                <th>ESTADO</th>

                <th></th>
              </tr>
            </thead>

            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id_producto}>
                  <td>
                    <strong>{producto.codigo}</strong>
                  </td>

                  <td>{producto.nombre}</td>

                  <td>{producto.linea || "—"}</td>

                  <td className="producto-precio">
                    {formatearPrecio(producto.precio_lista)}
                  </td>

                  <td>
                    <span
                      className={
                        producto.activo
                          ? "producto-activo"
                          : "producto-inactivo"
                      }
                    >
                      {producto.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  <td>
                    <div className="productos-actions">
                      <button
                        title="Editar"
                        onClick={() => editarProducto(producto)}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        title="Eliminar"
                        className="delete"
                        onClick={() => eliminarProducto(producto)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {productos.length === 0 && (
                <tr>
                  <td colSpan="6" className="productos-empty">
                    No se encontraron productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalProductos > 0 && (
            <div className="productos-pagination">
              <div className="productos-pagination-info">
                Mostrando{" "}
                {((paginaActual - 1) * 20 + 1).toLocaleString("es-CO")}
                {"–"}
                {Math.min(paginaActual * 20, totalProductos).toLocaleString(
                  "es-CO",
                )}
                {" de "}
                {totalProductos.toLocaleString("es-CO")}
                {" productos"}
              </div>

              <div className="productos-pagination-buttons">
                <button
                  type="button"
                  disabled={paginaActual === 1}
                  onClick={() => cargarProductos(paginaActual - 1)}
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
                        onClick={() => cargarProductos(pagina, busqueda)}
                      >
                        {pagina}
                      </button>
                    );
                  },
                )}

                <button
                  type="button"
                  disabled={paginaActual === totalPaginas}
                  onClick={() => cargarProductos(paginaActual + 1, busqueda)}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================
                MODAL
            ========================= */}

      {modalAbierto && (
        <div
          className="producto-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModalAbierto(false);
            }
          }}
        >
          <div className="producto-modal">
            <div className="producto-modal-header">
              <div>
                <span>{productoEditando ? "EDITAR" : "NUEVO"}</span>

                <h2>
                  {productoEditando ? "Editar producto" : "Nuevo producto"}
                </h2>
              </div>

              <button onClick={() => setModalAbierto(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={guardarProducto} className="producto-form">
              <div className="producto-form-grid">
                <div className="producto-field">
                  <label>Código *</label>

                  <input
                    value={formulario.codigo}
                    onChange={(e) => cambiarCampo("codigo", e.target.value)}
                    required
                  />
                </div>

                <div className="producto-field">
                  <label>Línea</label>

                  <select
                    value={formulario.linea}
                    onChange={(e) => cambiarCampo("linea", e.target.value)}
                  >
                    <option value="">Seleccione una línea</option>

                    {lineas.map((item) => (
                      <option key={item.linea} value={item.linea}>
                        {item.linea}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="producto-field producto-field-wide">
                  <label>Nombre del producto *</label>

                  <input
                    value={formulario.nombre}
                    onChange={(e) => cambiarCampo("nombre", e.target.value)}
                    required
                  />
                </div>

                <div className="producto-field">
                  <label>Precio de lista</label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formulario.precio_lista}
                    onChange={(e) =>
                      cambiarCampo("precio_lista", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="producto-form-actions">
                <button
                  type="button"
                  className="producto-btn-secondary"
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>

                <button type="submit" className="productos-btn-primary">
                  {productoEditando ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Productos;
