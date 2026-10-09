import "./NuevaRemision.css";
import { apiFetch } from "../../utils/api";
import { hoyLocal } from "../../utils/fechas";
import { useEffect, useState } from "react";
import BuscarCliente from "../BuscarCliente/BuscarCliente";
import { useAvisos } from "../Avisos/Avisos";
import { useTeclaEscape } from "../../utils/useTeclaEscape";
import { MEDIOS_PAGO, etiquetaMedioPago } from "../../utils/mediosPago";
import { X, Search, Plus, Trash2, Check } from "lucide-react";
import "./NuevaRemisionDiseno.css";

/* Identificador único de cada fila de producto (Date.now() se repetía
   al agregar dos filas en el mismo milisegundo). */
let contadorFilas = 0;

function NuevaRemision({ abierto, cerrar, alGuardar }) {
  const [modalCliente, setModalCliente] = useState(false);
  const [comentarios, setComentarios] = useState("");
  const [guardando, setGuardando] = useState(false);

  const { avisar } = useAvisos();

  const mostrarAlerta = (tipo, titulo, mensaje) => avisar[tipo](mensaje, titulo);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [comercial, setComercial] = useState("");
  const [comerciales, setComerciales] = useState([]);
  const [estadoPago, setEstadoPago] = useState("pendiente");
  const [medioPago, setMedioPago] = useState("");
  const [abonos, setAbonos] = useState([]);
  const [comprobantePago, setComprobantePago] = useState("");
  const [nuevoAbono, setNuevoAbono] = useState({
    fecha: hoyLocal(),
    medioPago: "",
    valor: "",
    comprobante: "",
  });

  const [numeroRemision, setNumeroRemision] = useState("");

  const buscarProductos = async (id, texto, tipo) => {
    // Primero actualizamos lo que la persona está escribiendo
    actualizarProducto(id, tipo === "codigo" ? "codigo" : "nombre", texto);

    // Si borró el texto, quitamos sugerencias
    if (!texto.trim()) {
      setSugerenciasProducto((prev) => ({
        ...prev,
        [id]: [],
      }));

      return;
    }

    try {
      const endpoint = tipo === "codigo" ? "buscar-codigo" : "buscar-nombre";

      const respuesta = await apiFetch(
        `/api/productos/${endpoint}/${encodeURIComponent(texto)}`,
      );

      if (!respuesta.ok) {
        throw new Error("No se pudieron buscar los productos.");
      }

      const datos = await respuesta.json();

      setSugerenciasProducto((prev) => ({
        ...prev,
        [id]: datos,
      }));
    } catch (error) {
      console.error("Error buscando productos:", error);

      setSugerenciasProducto((prev) => ({
        ...prev,
        [id]: [],
      }));
    }
  };

  const crearProductoVacio = () => ({
    id: ++contadorFilas,
    codigo: "",
    nombre: "",
    linea: "",
    placa: "",
    precioLista: "",
    cantidad: 1,
    precioVenta: "",
  });

  const esSilla = (nombre) => {
    return String(nombre || "")
      .trim()
      .toUpperCase()
      .startsWith("SILLA");
  };

  const [productos, setProductos] = useState([crearProductoVacio()]);
  const [sugerenciasProducto, setSugerenciasProducto] = useState({});
  const [sugerenciasCodigo, setSugerenciasCodigo] = useState({});

  const agregarProducto = () => {
    setProductos((prev) => [...prev, crearProductoVacio()]);
  };

  const eliminarProducto = (id) => {
    if (productos.length === 1) return;

    setProductos((prev) => prev.filter((producto) => producto.id !== id));
  };

  const actualizarProducto = (id, campo, valor) => {
    setProductos((prev) =>
      prev.map((producto) => {
        if (producto.id !== id) {
          return producto;
        }

        const productoActualizado = {
          ...producto,
          [campo]: valor,
        };

        // Si edita el código o el nombre, el producto elegido deja de valer
        // y debe volver a seleccionarse de las sugerencias.
        if (campo === "codigo" || campo === "nombre") {
          productoActualizado.id_producto = null;
        }

        // Si deja de ser una silla, la placa se elimina.
        if (campo === "nombre" && !esSilla(valor)) {
          productoActualizado.placa = "";
        }

        return productoActualizado;
      }),
    );
  };

  const buscarCodigo = async (id, texto) => {
    actualizarProducto(id, "codigo", texto);

    if (!texto.trim()) {
      setSugerenciasCodigo((prev) => ({
        ...prev,
        [id]: [],
      }));

      return;
    }

    try {
      const respuesta = await apiFetch(
        `/api/productos/buscar-codigo/${encodeURIComponent(texto)}`,
      );

      if (!respuesta.ok) {
        throw new Error("Error buscando productos");
      }

      const datos = await respuesta.json();

      setSugerenciasCodigo((prev) => ({
        ...prev,
        [id]: datos,
      }));
    } catch (error) {
      console.error("Error buscando códigos:", error);

      setSugerenciasCodigo((prev) => ({
        ...prev,
        [id]: [],
      }));
    }
  };

  const seleccionarProducto = (id, productoEncontrado) => {
    const silla = esSilla(productoEncontrado.nombre);

    setProductos((prev) =>
      prev.map((producto) =>
        producto.id === id
          ? {
              ...producto,

              id_producto: productoEncontrado.id_producto,

              codigo: productoEncontrado.codigo,
              nombre: productoEncontrado.nombre,
              linea: productoEncontrado.linea,
              precioLista: productoEncontrado.precio_lista,
              precioVenta: productoEncontrado.precio_lista,

              // Las sillas pueden llevar placa.
              // Los demás productos siempre quedan sin placa.
              placa: silla ? producto.placa : "",
            }
          : producto,
      ),
    );

    setSugerenciasProducto((prev) => ({
      ...prev,
      [id]: [],
    }));

    setSugerenciasCodigo((prev) => ({
      ...prev,
      [id]: [],
    }));
  };

  const calcularTotalProducto = (producto) => {
    const precio = Number(producto.precioVenta) || 0;
    const cantidad = Number(producto.cantidad) || 0;

    return precio * cantidad;
  };

  const totalRemision = productos.reduce(
    (total, producto) => total + calcularTotalProducto(producto),
    0,
  );

  const formatearPrecio = (valor) => {
    return Number(valor || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  };

  const totalAbonos = abonos.reduce(
    (total, abono) => total + (Number(abono.valor) || 0),
    0,
  );

  const saldoPendiente = Math.max(totalRemision - totalAbonos, 0);

  const agregarAbono = () => {
    const valor = Number(nuevoAbono.valor);

    if (!valor || valor <= 0) {
      mostrarAlerta(
        "advertencia",
        "Valor inválido",
        "Ingresa un valor de abono mayor a cero.",
      );
      return;
    }

    if (!nuevoAbono.medioPago) {
      mostrarAlerta(
        "advertencia",
        "Medio de pago requerido",
        "Selecciona el medio de pago del abono.",
      );
      return;
    }

    if (valor > saldoPendiente) {
      mostrarAlerta(
        "advertencia",
        "Abono superior al saldo",
        "El valor del abono no puede ser superior al saldo pendiente.",
      );
      return;
    }

    setAbonos((prev) => [
      ...prev,
      {
        ...nuevoAbono,
        valor,
      },
    ]);

    setNuevoAbono({
      fecha: hoyLocal(),
      medioPago: "",
      valor: "",
      comprobante: "",
    });
  };

  const eliminarAbono = (index) => {
    setAbonos((prev) => prev.filter((_, i) => i !== index));
  };

  const limpiarFormulario = () => {
    setProductos([crearProductoVacio()]);

    setComentarios("");

    setComercial("");

    setMedioPago("");

    setEstadoPago("pendiente");

    setAbonos([]);

    setComprobantePago("");

    setNuevoAbono({
      fecha: hoyLocal(),
      medioPago: "",
      valor: "",
      comprobante: "",
    });

    setClienteSeleccionado(null);

    setSugerenciasCodigo({});

    setSugerenciasProducto({});

    setModalCliente(false);
  };

  const cerrarRemision = () => {
    limpiarFormulario();

    cerrar();
  };

  const guardarRemision = async () => {
    if (guardando) return;

    // ================================
    // VALIDAR COMERCIAL
    // ================================

    if (!comercial) {
      mostrarAlerta(
        "advertencia",
        "Información incompleta",
        "Selecciona un comercial antes de guardar la remisión.",
      );

      return;
    }

    // ================================
    // VALIDAR MEDIO DE PAGO
    // ================================

    if (estadoPago === "pagada" && !medioPago) {
      mostrarAlerta(
        "advertencia",
        "Información incompleta",
        "Selecciona un medio de pago antes de guardar la remisión.",
      );

      return;
    }

    if (estadoPago === "abono" && abonos.length === 0) {
      mostrarAlerta(
        "advertencia",
        "Información incompleta",
        "Registra al menos un abono antes de guardar la remisión.",
      );

      return;
    }

    // ================================
    // VALIDAR CLIENTE
    // ================================

    if (!clienteSeleccionado) {
      mostrarAlerta(
        "advertencia",
        "Información incompleta",
        "Selecciona un cliente antes de guardar la remisión.",
      );

      return;
    }

    // ================================
    // VALIDAR PRODUCTOS
    // ================================

    if (productos.length === 0) {
      mostrarAlerta(
        "advertencia",
        "Productos requeridos",
        "Agrega al menos un producto a la remisión.",
      );

      return;
    }

    // ================================
    // VALIDAR CADA PRODUCTO
    // ================================

    for (const producto of productos) {
      if (!producto.codigo.trim()) {
        mostrarAlerta(
          "advertencia",
          "Producto incompleto",
          "Completa el código de todos los productos.",
        );

        return;
      }

      if (!producto.nombre.trim()) {
        mostrarAlerta(
          "advertencia",
          "Producto incompleto",
          "Completa el nombre de todos los productos.",
        );

        return;
      }

      if (!producto.id_producto) {
        mostrarAlerta(
          "advertencia",
          "Producto incompleto",
          `Selecciona "${producto.nombre || producto.codigo}" de la lista de sugerencias.`,
        );

        return;
      }

      if (!producto.precioVenta) {
        mostrarAlerta(
          "advertencia",
          "Producto incompleto",
          "Completa el precio de venta de todos los productos.",
        );

        return;
      }

      if (Number(producto.cantidad) <= 0) {
        mostrarAlerta(
          "advertencia",
          "Cantidad inválida",
          "La cantidad debe ser mayor a cero.",
        );

        return;
      }

      if (esSilla(producto.nombre) && !producto.placa.trim()) {
        mostrarAlerta(
          "advertencia",
          "Placa requerida",
          `La silla "${producto.nombre}" requiere una placa.`,
        );

        return;
      }
    }
    if (estadoPago === "abono" && totalAbonos > totalRemision) {
      mostrarAlerta(
        "advertencia",
        "Abonos superiores al total",
        "Los abonos suman más que el total de la remisión. Revisa los productos o los abonos.",
      );

      return;
    }

    // ================================
    // GUARDAR REMISIÓN
    // ================================

    setGuardando(true);

    try {
      const respuesta = await apiFetch("/api/remisiones", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          fecha: hoyLocal(),

          id_cliente: clienteSeleccionado.id_cliente,

          id_comercial: comercial,

          estado_pago: estadoPago,

          medio_pago: estadoPago === "pagada" ? medioPago : null,

          total: totalRemision,

          total_abonado: totalAbonos,

          saldo_pendiente: saldoPendiente,

          abonos: estadoPago === "abono" ? abonos : [],

          // La referencia del pago no tiene columna propia:
          // se guarda al final de los comentarios.
          comentarios:
            estadoPago === "pagada" && comprobantePago.trim()
              ? [
                  comentarios.trim(),
                  `Comprobante de pago: ${comprobantePago.trim()}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : comentarios,

          productos: productos.map((producto) => ({
            id_producto: producto.id_producto,

            placa: producto.placa,

            precio_lista: Number(producto.precioLista),

            cantidad: Number(producto.cantidad),

            precio_venta: Number(producto.precioVenta),
          })),
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo guardar la remisión.");
      }


      limpiarFormulario();

      cargarSiguienteNumeroRemision();

      alGuardar?.();

      mostrarAlerta(
        "exito",
        "Remisión creada",
        `La remisión ${datos.numero_remision} quedó registrada. Puedes registrar otra o cerrar el formulario.`,
      );
    } catch (error) {
      console.error("Error guardando remisión:", error);

      avisar.fallo(error, error.message, "No se pudo guardar la remisión");
    } finally {
      setGuardando(false);
    }
  };

  const seleccionarCliente = (cliente, clienteNuevo = false) => {
    setClienteSeleccionado(cliente);

    setModalCliente(false);

    if (clienteNuevo) {
      mostrarAlerta(
        "exito",
        "Cliente creado correctamente",
        "El cliente fue registrado y seleccionado para esta remisión.",
      );
    }
  };

  /* =========================
   CARGAR SIGUIENTE
   NÚMERO DE REMISIÓN
========================= */

  const cargarSiguienteNumeroRemision = async () => {
    try {
      const respuesta = await apiFetch("/api/remisiones/siguiente-numero");

      if (!respuesta.ok) {
        throw new Error("No se pudo obtener el número de la remisión.");
      }

      const datos = await respuesta.json();

      setNumeroRemision(datos.numero_remision);
    } catch (error) {
      console.error("Error cargando número de remisión:", error);

      avisar.fallo(error, "No se pudo obtener el número de la nueva remisión.");
    }
  };

  /* =========================
   CARGAR DATOS INICIALES
========================= */

  useEffect(() => {
    const cargarComerciales = async () => {
      try {
        const respuesta = await apiFetch("/api/comerciales");

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar los comerciales.");
        }

        const datos = await respuesta.json();

        setComerciales(datos);
      } catch (error) {
        console.error("Error cargando comerciales:", error);

        avisar.fallo(error, "No se pudo cargar la lista de comerciales.");
      }
    };

    cargarComerciales();
  }, []);

  useEffect(() => {
    if (abierto) {
      cargarSiguienteNumeroRemision();
    }
  }, [abierto]);

  /* =========================
   APOYOS DEL DISEÑO
========================= */

  const mediosDisponibles = MEDIOS_PAGO.filter(
    (medio) => medio.valor !== "PENDIENTE PAGO",
  );

  const etiquetaComprobante =
    {
      transferencia: "N° de transferencia",
      t_credito: "Últimos 4 dígitos de la tarjeta",
      t_debito: "Últimos 4 dígitos de la tarjeta",
      efectivo: "N° de recibo (opcional)",
      dolares: "Referencia del pago",
      regalo: "Autorización",
    }[medioPago] || "Referencia";

  const ejemploComprobante =
    {
      transferencia: "Ej. TRX-458921",
      t_credito: "Ej. 4821",
      t_debito: "Ej. 1736",
      efectivo: "Ej. REC-10258",
      dolares: "Ej. USD-2026-15",
      regalo: "Ej. Aprobación gerencia",
    }[medioPago] || "Ingrese una referencia";

  const cerrarSugerencias = (id) => {
    setSugerenciasCodigo((prev) => ({ ...prev, [id]: [] }));
    setSugerenciasProducto((prev) => ({ ...prev, [id]: [] }));
  };

  const ESTADOS_PAGO = [
    { valor: "pagada", etiqueta: "Pagada" },
    { valor: "abono", etiqueta: "Abono" },
    { valor: "pendiente", etiqueta: "Pendiente" },
  ];

  const cantidadProductos = productos.filter(
    (producto) => producto.id_producto,
  ).length;

  useTeclaEscape(abierto && !modalCliente, cerrarRemision);

  if (!abierto) return null;

  /* Lista de sugerencias (por código o por nombre) de una fila */

  const renderSugerencias = (producto, sugerencias) =>
    (sugerencias || []).length > 0 && (
      <div className="nr-sugerencias">
        {sugerencias.map((productoEncontrado) => (
          <button
            type="button"
            key={productoEncontrado.id_producto}
            className="nr-sugerencia"
            // mousedown se adelanta al blur del campo, que cierra la lista
            onMouseDown={(e) => {
              e.preventDefault();
              seleccionarProducto(producto.id, productoEncontrado);
            }}
          >
            <strong>{productoEncontrado.codigo}</strong>
            <span>{productoEncontrado.nombre}</span>
            <small>{formatearPrecio(productoEncontrado.precio_lista)}</small>
          </button>
        ))}
      </div>
    );

  return (
    <div className="nr-overlay">
      <div className="nr-modal" role="dialog" aria-modal="true">
        {/* ENCABEZADO */}

        <header className="nr-header">
          <div className="nr-header-titulo">
            <span className="nr-tag">REMISIÓN</span>

            <h3>Nueva remisión</h3>
          </div>

          <div className="nr-header-datos">
            <span className="nr-chip">
              <small>No.</small>
              {numeroRemision || "—"}
            </span>

            <span className="nr-chip">
              <small>Fecha</small>
              {new Date().toLocaleDateString("es-CO")}
            </span>
          </div>

          <button
            type="button"
            className="nr-btn-icono"
            onClick={cerrarRemision}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="nr-cuerpo">
          {/* =========================
              COLUMNA PRINCIPAL
          ========================= */}

          <div className="nr-principal">
            {/* CLIENTE Y COMERCIAL */}

            <section className="nr-seccion">
              <div className="nr-seccion-titulo">
                <span className="nr-paso">1</span>
                <h4>Cliente y comercial</h4>
              </div>

              <div className="nr-grid-2">
                <div className="nr-campo">
                  <label>Cliente *</label>

                  <button
                    type="button"
                    className={`nr-selector-cliente ${
                      clienteSeleccionado ? "con-cliente" : ""
                    }`}
                    onClick={() => setModalCliente(true)}
                  >
                    {clienteSeleccionado ? (
                      <>
                        <span className="nr-avatar">
                          {clienteSeleccionado.nombre?.[0] || "?"}
                        </span>

                        <span className="nr-cliente-info">
                          <strong>{clienteSeleccionado.nombre}</strong>

                          <small>
                            {[
                              clienteSeleccionado.documento,
                              clienteSeleccionado.telefono,
                              clienteSeleccionado.direccion,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Sin datos de contacto"}
                          </small>
                        </span>

                        <span className="nr-cambiar">Cambiar</span>
                      </>
                    ) : (
                      <>
                        <Search size={15} />
                        <span className="nr-placeholder">
                          Buscar o crear un cliente
                        </span>
                      </>
                    )}
                  </button>
                </div>

                <div className="nr-campo">
                  <label>Comercial *</label>

                  <select
                    value={comercial}
                    onChange={(e) => setComercial(e.target.value)}
                  >
                    <option value="">Seleccione un comercial</option>

                    {comerciales.map((item) => (
                      <option key={item.id_comercial} value={item.id_comercial}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* PRODUCTOS */}

            <section className="nr-seccion">
              <div className="nr-seccion-titulo">
                <span className="nr-paso">2</span>

                <h4>Productos</h4>

                <span className="nr-contador">
                  {cantidadProductos}{" "}
                  {cantidadProductos === 1 ? "seleccionado" : "seleccionados"}
                </span>

                <button
                  type="button"
                  className="nr-btn-secundario"
                  onClick={agregarProducto}
                >
                  <Plus size={14} /> Agregar producto
                </button>
              </div>

              <div className="nr-tabla">
                <div className="nr-tabla-encabezado">
                  <span>Código</span>
                  <span>Producto</span>
                  <span>Placa</span>
                  <span className="nr-derecha">Cant.</span>
                  <span className="nr-derecha">Precio venta</span>
                  <span className="nr-derecha">Total</span>
                  <span></span>
                </div>

                {productos.map((producto) => {
                  const silla = esSilla(producto.nombre);

                  return (
                    <div className="nr-fila" key={producto.id}>
                      <div className="nr-autocompletar">
                        <input
                          type="text"
                          placeholder="Código"
                          value={producto.codigo}
                          onChange={(e) =>
                            buscarCodigo(producto.id, e.target.value)
                          }
                          onBlur={() => cerrarSugerencias(producto.id)}
                        />

                        {renderSugerencias(
                          producto,
                          sugerenciasCodigo[producto.id],
                        )}
                      </div>

                      <div className="nr-autocompletar">
                        <input
                          type="text"
                          placeholder="Buscar producto"
                          value={producto.nombre}
                          onChange={(e) =>
                            buscarProductos(
                              producto.id,
                              e.target.value,
                              "nombre",
                            )
                          }
                          onBlur={() => cerrarSugerencias(producto.id)}
                        />

                        {producto.id_producto ? (
                          <small className="nr-meta">
                            {producto.linea || "Sin línea"} · Lista{" "}
                            {formatearPrecio(producto.precioLista)}
                          </small>
                        ) : (
                          producto.nombre && (
                            <small className="nr-meta nr-meta-alerta">
                              Elige el producto de la lista
                            </small>
                          )
                        )}

                        {renderSugerencias(
                          producto,
                          sugerenciasProducto[producto.id],
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder={silla ? "Obligatoria" : "No aplica"}
                        value={producto.placa}
                        disabled={!silla}
                        className={silla && !producto.placa ? "nr-requerido" : ""}
                        onChange={(e) =>
                          actualizarProducto(
                            producto.id,
                            "placa",
                            e.target.value.toUpperCase(),
                          )
                        }
                      />

                      <input
                        type="number"
                        min="1"
                        className="nr-derecha"
                        value={producto.cantidad}
                        onChange={(e) =>
                          actualizarProducto(
                            producto.id,
                            "cantidad",
                            e.target.value,
                          )
                        }
                      />

                      <div className="nr-input-moneda">
                        <span>$</span>

                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={
                            producto.precioVenta
                              ? Number(producto.precioVenta).toLocaleString(
                                  "es-CO",
                                  { maximumFractionDigits: 0 },
                                )
                              : ""
                          }
                          onChange={(e) =>
                            actualizarProducto(
                              producto.id,
                              "precioVenta",
                              e.target.value.replace(/\D/g, ""),
                            )
                          }
                        />
                      </div>

                      <span className="nr-total-fila">
                        {formatearPrecio(calcularTotalProducto(producto))}
                      </span>

                      <button
                        type="button"
                        className="nr-btn-eliminar"
                        title="Quitar producto"
                        onClick={() => eliminarProducto(producto.id)}
                        disabled={productos.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* COMENTARIOS */}

            <section className="nr-seccion">
              <div className="nr-seccion-titulo">
                <span className="nr-paso">3</span>
                <h4>Comentarios</h4>
                <span className="nr-opcional">Opcional</span>
              </div>

              <textarea
                className="nr-textarea"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Ej. Cliente solicita entrega el viernes..."
              />
            </section>
          </div>

          {/* =========================
              PANEL DE PAGO
          ========================= */}

          <aside className="nr-panel">
            <section className="nr-seccion">
              <div className="nr-seccion-titulo">
                <span className="nr-paso">4</span>
                <h4>Pago</h4>
              </div>

              <div className="nr-segmentado" role="radiogroup">
                {ESTADOS_PAGO.map((estado) => (
                  <button
                    type="button"
                    key={estado.valor}
                    role="radio"
                    aria-checked={estadoPago === estado.valor}
                    className={estadoPago === estado.valor ? "activo" : ""}
                    onClick={() => setEstadoPago(estado.valor)}
                  >
                    {estadoPago === estado.valor && <Check size={13} />}
                    {estado.etiqueta}
                  </button>
                ))}
              </div>

              {/* PAGADA */}

              {estadoPago === "pagada" && (
                <div className="nr-pago-detalle">
                  <div className="nr-campo">
                    <label>Método de pago *</label>

                    <select
                      value={medioPago}
                      onChange={(e) => setMedioPago(e.target.value)}
                    >
                      <option value="">Seleccione un método</option>

                      {mediosDisponibles.map((medio) => (
                        <option key={medio.valor} value={medio.valor}>
                          {medio.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>

                  {medioPago && (
                    <div className="nr-campo">
                      <label>{etiquetaComprobante}</label>

                      <input
                        type="text"
                        value={comprobantePago}
                        onChange={(e) => setComprobantePago(e.target.value)}
                        placeholder={ejemploComprobante}
                      />

                      <small className="nr-ayuda">
                        Se guarda al final de los comentarios.
                      </small>
                    </div>
                  )}
                </div>
              )}

              {/* ABONO */}

              {estadoPago === "abono" && (
                <div className="nr-pago-detalle">
                  <div className="nr-campo">
                    <label>Valor del abono *</label>

                    <div className="nr-input-moneda">
                      <span>$</span>

                      <input
                        type="number"
                        min="1"
                        max={saldoPendiente}
                        value={nuevoAbono.valor}
                        placeholder="0"
                        onChange={(e) =>
                          setNuevoAbono((prev) => ({
                            ...prev,
                            valor: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") agregarAbono();
                        }}
                      />
                    </div>
                  </div>

                  <div className="nr-campo">
                    <label>Método de pago *</label>

                    <select
                      value={nuevoAbono.medioPago}
                      onChange={(e) =>
                        setNuevoAbono((prev) => ({
                          ...prev,
                          medioPago: e.target.value,
                        }))
                      }
                    >
                      <option value="">Seleccione un método</option>

                      {mediosDisponibles.map((medio) => (
                        <option key={medio.valor} value={medio.valor}>
                          {medio.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="nr-campo">
                    <label>Referencia / comprobante</label>

                    <input
                      type="text"
                      value={nuevoAbono.comprobante}
                      placeholder="Ej. TRX-458921"
                      onChange={(e) =>
                        setNuevoAbono((prev) => ({
                          ...prev,
                          comprobante: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="nr-btn-secundario nr-ancho-completo"
                    onClick={agregarAbono}
                  >
                    <Plus size={14} /> Registrar abono
                  </button>

                  {abonos.length > 0 && (
                    <ul className="nr-abonos">
                      {abonos.map((abono, index) => (
                        <li key={index}>
                          <div>
                            <strong>{formatearPrecio(abono.valor)}</strong>

                            <small>
                              {etiquetaMedioPago(abono.medioPago)}
                              {abono.comprobante
                                ? ` · ${abono.comprobante}`
                                : ""}
                            </small>
                          </div>

                          <button
                            type="button"
                            className="nr-btn-eliminar"
                            title="Quitar abono"
                            onClick={() => eliminarAbono(index)}
                          >
                            <X size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* PENDIENTE */}

              {estadoPago === "pendiente" && (
                <p className="nr-nota">
                  La remisión quedará en cartera por el total de{" "}
                  <strong>{formatearPrecio(totalRemision)}</strong>.
                </p>
              )}
            </section>

            {/* RESUMEN */}

            <section className="nr-resumen">
              <div>
                <span>Subtotal productos</span>
                <strong>{formatearPrecio(totalRemision)}</strong>
              </div>

              {estadoPago === "abono" && (
                <>
                  <div>
                    <span>Abonado</span>
                    <strong>{formatearPrecio(totalAbonos)}</strong>
                  </div>

                  <div>
                    <span>Saldo pendiente</span>
                    <strong className="nr-saldo">
                      {formatearPrecio(saldoPendiente)}
                    </strong>
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>

        {/* PIE */}

        <footer className="nr-pie">
          <div className="nr-pie-total">
            <span>Total de la remisión</span>
            <strong>{formatearPrecio(totalRemision)}</strong>
          </div>

          <div className="nr-pie-acciones">
            <button
              type="button"
              className="nr-btn-texto"
              onClick={cerrarRemision}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="nr-btn-primario"
              onClick={guardarRemision}
              disabled={guardando}
            >
              {guardando ? "Guardando…" : "Guardar remisión"}
            </button>
          </div>
        </footer>
      </div>

      <BuscarCliente
        abierto={modalCliente}
        cerrar={() => setModalCliente(false)}
        seleccionarCliente={seleccionarCliente}
      />
    </div>
  );
}

export default NuevaRemision;
