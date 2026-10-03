import "./NuevaRemision.css";
import { useEffect, useState } from "react";
import BuscarCliente from "../BuscarCliente/BuscarCliente";
import Alerta from "../Alerta/Alerta";

function NuevaRemision({ abierto, cerrar, usuarioActual }) {
  const [modalCliente, setModalCliente] = useState(false);
  const [comentarios, setComentarios] = useState("");
  const [alerta, setAlerta] = useState({
    visible: false,
    tipo: "exito",
    titulo: "",
    mensaje: "",
  });

  const mostrarAlerta = (tipo, titulo, mensaje) => {
    setAlerta({
      visible: true,
      tipo,
      titulo,
      mensaje,
    });
  };

  const cerrarAlerta = () => {
    setAlerta((prev) => ({
      ...prev,
      visible: false,
    }));
  };
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [comercial, setComercial] = useState("");
  const [comerciales, setComerciales] = useState([]);
  const [estadoPago, setEstadoPago] = useState("pendiente");
  const [medioPago, setMedioPago] = useState("");
  const [abonos, setAbonos] = useState([]);
  const [comprobantePago, setComprobantePago] = useState("");
  const [pagos, setPagos] = useState([]);

  const [nuevoPago, setNuevoPago] = useState({
    medioPago: "",
    valor: "",
    comprobante: "",
  });

  const [nuevoAbono, setNuevoAbono] = useState({
    fecha: new Date().toISOString().split("T")[0],
    medioPago: "",
    valor: "",
    comprobante: "",
  });

  const [numeroRemision, setNumeroRemision] = useState("");

  const [fechaRemision, setFechaRemision] = useState("");
  const buscarProductoPorCodigo = async (id, codigo) => {
    if (!codigo.trim()) return;

    try {
      const respuesta = await fetch(
        `/api/productos/codigo/${encodeURIComponent(codigo)}`,
      );

      if (!respuesta.ok) {
        throw new Error("Producto no encontrado");
      }

      const productoEncontrado = await respuesta.json();

      setProductos((prev) =>
        prev.map((producto) =>
          producto.id === id
            ? {
                ...producto,
                codigo: productoEncontrado.codigo,
                nombre: productoEncontrado.nombre,
                linea: productoEncontrado.linea,
                precioLista: productoEncontrado.precio_lista,
                precioVenta: productoEncontrado.precio_lista,
              }
            : producto,
        ),
      );
    } catch (error) {
      console.error("Error buscando producto:", error);
    }
  };

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

      const respuesta = await fetch(
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
    id: Date.now(),
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
      const respuesta = await fetch(
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

  const totalPagos = pagos.reduce(
    (total, pago) => total + (Number(pago.valor) || 0),
    0,
  );

  const agregarPago = () => {
    const valor = Number(nuevoPago.valor);

    if (!valor || valor <= 0) {
      mostrarAlerta(
        "advertencia",
        "Valor inválido",
        "Ingresa un valor de pago mayor a cero.",
      );

      return;
    }

    if (!nuevoPago.medioPago) {
      mostrarAlerta(
        "advertencia",
        "Medio de pago requerido",
        "Selecciona el medio de pago.",
      );

      return;
    }

    if (valor + totalPagos > totalRemision) {
      mostrarAlerta(
        "advertencia",
        "Valor superior al total",
        "La suma de los pagos no puede superar el total de la remisión.",
      );

      return;
    }

    setPagos((prev) => [
      ...prev,
      {
        ...nuevoPago,
        valor,
      },
    ]);

    setNuevoPago({
      medioPago: "",
      valor: "",
      comprobante: "",
    });
  };

  const eliminarPago = (index) => {
    setPagos((prev) => prev.filter((_, i) => i !== index));
  };

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
      fecha: new Date().toISOString().split("T")[0],
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

    setClienteSeleccionado(null);

    setSugerenciasCodigo({});

    setSugerenciasProducto({});

    setModalCliente(false);

    setAlerta({
      visible: false,
      tipo: "exito",
      titulo: "",
      mensaje: "",
    });
  };

  const cerrarRemision = () => {
    limpiarFormulario();

    cerrar();
  };

  const guardarRemision = async () => {
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
    // ================================
    // GUARDAR REMISIÓN
    // ================================

    try {
      const respuesta = await fetch("/api/remisiones", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id_usuario: usuarioActual?.id_usuario,

          fecha: new Date().toISOString().split("T")[0],

          id_cliente: clienteSeleccionado.id_cliente,

          id_comercial: comercial,

          estado_pago: estadoPago,

          medio_pago: estadoPago === "pagada" ? medioPago : null,

          total: totalRemision,

          total_abonado: totalAbonos,

          saldo_pendiente: saldoPendiente,

          abonos: estadoPago === "abono" ? abonos : [],

          comentarios: comentarios,

          estado_pago: estadoPago,
          total_abonado: totalAbonos,
          saldo_pendiente: saldoPendiente,
          abonos: abonos,

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

      console.log("✅ REMISIÓN CREADA - MOSTRANDO ALERTA", datos);

      limpiarFormulario();

      cargarSiguienteNumeroRemision();

      mostrarAlerta(
        "exito",
        "¡Remisión creada correctamente!",
        `La remisión ${datos.numero_remision} fue registrada exitosamente.`,
      );
    } catch (error) {
      console.error("Error guardando remisión:", error);

      mostrarAlerta("error", "Error", error.message);
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
      const respuesta = await fetch("/api/remisiones/siguiente-numero");

      if (!respuesta.ok) {
        throw new Error("No se pudo obtener el número de la remisión.");
      }

      const datos = await respuesta.json();

      setNumeroRemision(datos.numero_remision);
    } catch (error) {
      console.error("Error cargando número de remisión:", error);
    }
  };

  /* =========================
   CARGAR DATOS INICIALES
========================= */

  useEffect(() => {
    const cargarComerciales = async () => {
      try {
        const respuesta = await fetch("/api/comerciales");

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar los comerciales.");
        }

        const datos = await respuesta.json();

        setComerciales(datos);
      } catch (error) {
        console.error("Error cargando comerciales:", error);
      }
    };

    cargarComerciales();

    cargarSiguienteNumeroRemision();
  }, []);

  if (!abierto) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-remision">
        {/* ENCABEZADO */}

        <div className="modal-header">
          <div>
            <span className="modal-tag">REMISIÓN</span>

            <h3>Nueva Remisión</h3>
          </div>

          <button className="btn-cerrar" onClick={cerrarRemision}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* INFORMACIÓN GENERAL */}

          <div className="section-card">
            <div className="section-title">
              <h3>Información general</h3>

              <span>Complete los datos principales de la remisión.</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>No. Remisión</label>

                <input type="text" value={numeroRemision} readOnly />
              </div>

              <div className="form-group">
                <label>Fecha</label>

                <input
                  type="text"
                  value={new Date().toLocaleDateString("es-CO")}
                  readOnly
                />
              </div>

              <div className="form-group">
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

              <div className="cliente-section">
                <label>Cliente *</label>

                <div
                  className="cliente-input"
                  onClick={() => setModalCliente(true)}
                >
                  <span className="search-icon">🔍</span>

                  {clienteSeleccionado ? (
                    <div className="cliente-seleccionado">
                      <strong>{clienteSeleccionado.nombre}</strong>

                      <span>📍 {clienteSeleccionado.direccion}</span>

                      <span>📞 {clienteSeleccionado.telefono}</span>
                    </div>
                  ) : (
                    <span className="placeholder">
                      Haga clic para seleccionar un cliente
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="form-group estado-pago-group">
              <label>Estado de pago *</label>

              <div className="estado-pago-opciones">
                <button
                  type="button"
                  className={`estado-pago-card ${
                    estadoPago === "pagada" ? "activo pagada" : ""
                  }`}
                  onClick={() => setEstadoPago("pagada")}
                >
                  <span className="estado-pago-icono">✓</span>

                  <div>
                    <strong>Pagada</strong>

                    <span>El cliente pagó el total.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`estado-pago-card ${
                    estadoPago === "abono" ? "activo abono" : ""
                  }`}
                  onClick={() => setEstadoPago("abono")}
                >
                  <span className="estado-pago-icono">$</span>

                  <div>
                    <strong>Abono / Parcial</strong>

                    <span>Se realizó un abono.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`estado-pago-card ${
                    estadoPago === "pendiente" ? "activo pendiente" : ""
                  }`}
                  onClick={() => setEstadoPago("pendiente")}
                >
                  <span className="estado-pago-icono">!</span>

                  <div>
                    <strong>Pendiente</strong>

                    <span>No se ha realizado ningún pago.</span>
                  </div>
                </button>
              </div>
            </div>

            {/* MÉTODO DE PAGO */}

            {estadoPago === "pagada" && (
              <div className="form-group metodo-pago-group">
                <label>Método de pago *</label>

                <div className="metodo-pago-opciones">
                  {/* DÓLARES */}
                  <button
                    type="button"
                    className={`metodo-pago-card ${
                      medioPago === "dolares" ? "activo" : ""
                    }`}
                    onClick={() => setMedioPago("dolares")}
                  >
                    <span className="metodo-pago-icono">$</span>

                    <div>
                      <strong>Dólares</strong>
                      <span>Pago en dólares.</span>
                    </div>
                  </button>

                  {/* EFECTIVO */}
                  <button
                    type="button"
                    className={`metodo-pago-card ${
                      medioPago === "efectivo" ? "activo" : ""
                    }`}
                    onClick={() => setMedioPago("efectivo")}
                  >
                    <span className="metodo-pago-icono">$</span>

                    <div>
                      <strong>Efectivo</strong>
                      <span>Pago en efectivo.</span>
                    </div>
                  </button>

                  {/* OTRO */}
                  <button
                    type="button"
                    className={`metodo-pago-card ${
                      medioPago === "otro" ? "activo" : ""
                    }`}
                    onClick={() => setMedioPago("otro")}
                  >
                    <span className="metodo-pago-icono">•••</span>

                    <div>
                      <strong>Otro</strong>
                      <span>Otro medio de pago.</span>
                    </div>
                  </button>

                  {/* PENDIENTE PAGO */}
                  <button
                    type="button"
                    className={`metodo-pago-card ${
                      medioPago === "pendiente_pago" ? "activo" : ""
                    }`}
                    onClick={() => setMedioPago("pendiente_pago")}
                  >
                    <span className="metodo-pago-icono">!</span>

                    <div>
                      <strong>Pendiente pago</strong>
                      <span>Pago pendiente.</span>
                    </div>
                  </button>

                  {/* REGALO */}
                  <button
                    type="button"
                    className={`metodo-pago-card ${
                      medioPago === "regalo" ? "activo" : ""
                    }`}
                    onClick={() => setMedioPago("regalo")}
                  >
                    <span className="metodo-pago-icono">🎁</span>

                    <div>
                      <strong>Regalo</strong>
                      <span>Producto entregado como regalo.</span>
                    </div>
                  </button>

                  {/* T. CRÉDITO */}
                  <button
                    type="button"
                    className={`metodo-pago-card ${
                      medioPago === "t_credito" ? "activo" : ""
                    }`}
                    onClick={() => setMedioPago("t_credito")}
                  >
                    <span className="metodo-pago-icono">$</span>

                    <div>
                      <strong>T. Crédito</strong>
                      <span>Pago con tarjeta de crédito.</span>
                    </div>
                  </button>

                  {/* TRANSFERENCIA */}
                  <button
                    type="button"
                    className={`metodo-pago-card ${
                      medioPago === "transferencia" ? "activo" : ""
                    }`}
                    onClick={() => setMedioPago("transferencia")}
                  >
                    <span className="metodo-pago-icono">⇄</span>

                    <div>
                      <strong>Transferencia</strong>
                      <span>Pago por transferencia.</span>
                    </div>
                  </button>

                  {/* T. DÉBITO */}
                  <button
                    type="button"
                    className={`metodo-pago-card ${
                      medioPago === "t_debito" ? "activo" : ""
                    }`}
                    onClick={() => setMedioPago("t_debito")}
                  >
                    <span className="metodo-pago-icono">$</span>

                    <div>
                      <strong>T. Débito</strong>
                      <span>Pago con tarjeta débito.</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
            {/* =========================
    ABONO / PARCIAL
========================= */}

            {estadoPago === "abono" && (
              <div className="abono-card">
                <div className="abono-header">
                  <div>
                    <h4>Información del abono</h4>

                    <span>Registra el valor recibido y el método de pago.</span>
                  </div>

                  <span className="abono-badge">ABONO / PARCIAL</span>
                </div>

                {/* RESUMEN */}

                <div className="abono-resumen">
                  <div>
                    <span>Total remisión</span>

                    <strong>{formatearPrecio(totalRemision)}</strong>
                  </div>

                  <div>
                    <span>Total abonado</span>

                    <strong>{formatearPrecio(totalAbonos)}</strong>
                  </div>

                  <div>
                    <span>Saldo pendiente</span>

                    <strong>{formatearPrecio(saldoPendiente)}</strong>
                  </div>
                </div>

                {/* FORMULARIO */}

                <div className="abono-form">
                  {/* VALOR */}

                  <div>
                    <label>Valor abonado *</label>

                    <div className="input-monto">
                      <span>$</span>

                      <input
                        type="number"
                        min="1"
                        max={saldoPendiente}
                        value={nuevoAbono.valor}
                        onChange={(e) =>
                          setNuevoAbono((prev) => ({
                            ...prev,
                            valor: e.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* MÉTODO */}

                  <div>
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

                      <option value="dolares">Dólares</option>

                      <option value="efectivo">Efectivo</option>

                      <option value="otro">Otro</option>

                      <option value="regalo">Regalo</option>

                      <option value="t_credito">T. Crédito</option>

                      <option value="transferencia">Transferencia</option>

                      <option value="t_debito">T. Débito</option>
                    </select>
                  </div>

                  {/* COMPROBANTE */}

                  <div>
                    <label>Referencia / comprobante</label>

                    <input
                      type="text"
                      value={nuevoAbono.comprobante}
                      onChange={(e) =>
                        setNuevoAbono((prev) => ({
                          ...prev,
                          comprobante: e.target.value,
                        }))
                      }
                      placeholder="Ej. TRX-458921"
                    />
                  </div>
                </div>

                {/* BOTÓN */}

                <div className="abono-acciones">
                  <button
                    type="button"
                    className="btn-agregar-abono"
                    onClick={agregarAbono}
                  >
                    + Registrar abono
                  </button>
                </div>

                {/* ABONOS REGISTRADOS */}

                {abonos.length > 0 && (
                  <div className="abonos-registrados">
                    <div className="abonos-registrados-titulo">
                      Abonos registrados
                    </div>

                    {abonos.map((abono, index) => (
                      <div className="abono-item" key={index}>
                        <div>
                          <strong>{formatearPrecio(abono.valor)}</strong>

                          <span>
                            {abono.medioPago}
                            {abono.comprobante ? ` · ${abono.comprobante}` : ""}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => eliminarAbono(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COMPROBANTE DE PAGO */}

            {estadoPago === "pagada" && medioPago && (
              <div className="comprobante-card">
                <div className="comprobante-header">
                  <div>
                    <h4>Comprobante de pago</h4>

                    <span>Registra la referencia o soporte del pago.</span>
                  </div>

                  <span className="badge-metodo">
                    {medioPago === "efectivo" && "EFECTIVO"}
                    {medioPago === "transferencia" && "TRANSFERENCIA"}
                    {medioPago === "t_credito" && "T. CRÉDITO"}
                    {medioPago === "t_debito" && "T. DÉBITO"}
                    {medioPago === "dolares" && "DÓLARES"}
                    {medioPago === "regalo" && "REGALO"}
                    {medioPago === "otro" && "OTRO"}
                    {medioPago === "pendiente_pago" && "PENDIENTE"}
                  </span>
                </div>

                <div className="comprobante-campo">
                  <label>
                    {medioPago === "transferencia"
                      ? "N° de transferencia"
                      : medioPago === "t_credito"
                        ? "Últimos 4 dígitos de la tarjeta"
                        : medioPago === "t_debito"
                          ? "Últimos 4 dígitos de la tarjeta"
                          : medioPago === "efectivo"
                            ? "N° de recibo (opcional)"
                            : medioPago === "dolares"
                              ? "Referencia del pago"
                              : medioPago === "regalo"
                                ? "Autorización"
                                : medioPago === "pendiente_pago"
                                  ? "Observación"
                                  : "Referencia"}
                  </label>

                  <input
                    type="text"
                    value={comprobantePago}
                    onChange={(e) => setComprobantePago(e.target.value)}
                    placeholder={
                      medioPago === "transferencia"
                        ? "Ej. TRX-458921"
                        : medioPago === "t_credito"
                          ? "Ej. 4821"
                          : medioPago === "t_debito"
                            ? "Ej. 1736"
                            : medioPago === "efectivo"
                              ? "Ej. REC-10258"
                              : medioPago === "dolares"
                                ? "Ej. USD-2026-15"
                                : medioPago === "regalo"
                                  ? "Ej. Aprobación gerencia"
                                  : medioPago === "pendiente_pago"
                                    ? "Ej. Pendiente por cobrar"
                                    : "Ingrese una referencia"
                    }
                  />
                </div>
              </div>
            )}

            {/* PRODUCTOS */}

            <div className="section-card productos-remision">
              <div className="section-header-productos">
                <div className="section-title">
                  <h3>Productos de la remisión</h3>

                  <span>
                    Agregue los productos que hacen parte de esta remisión.
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-agregar-producto"
                  onClick={agregarProducto}
                >
                  + Agregar producto
                </button>
              </div>

              {/* ENCABEZADOS */}

              <div className="productos-header">
                <span>Código</span>
                <span>Producto</span>
                <span>Línea</span>
                <span>Placa</span>
                <span>Precio lista</span>
                <span>Cantidad</span>
                <span>Precio venta</span>
                <span>Total</span>
                <span></span>
              </div>

              {/* LISTA DE PRODUCTOS */}

              <div className="productos-lista">
                {productos.map((producto) => (
                  <div className="producto-row" key={producto.id}>
                    <div className="producto-codigo-buscador">
                      <input
                        type="text"
                        placeholder="Código"
                        value={producto.codigo}
                        onChange={(e) =>
                          buscarCodigo(producto.id, e.target.value)
                        }
                      />

                      {(sugerenciasCodigo[producto.id] || []).length > 0 && (
                        <div className="sugerencias-producto">
                          {sugerenciasCodigo[producto.id].map(
                            (productoEncontrado) => (
                              <div
                                key={productoEncontrado.id_producto}
                                className="sugerencia-producto"
                                onClick={() =>
                                  seleccionarProducto(
                                    producto.id,
                                    productoEncontrado,
                                  )
                                }
                              >
                                <strong>{productoEncontrado.codigo}</strong>

                                <span>{productoEncontrado.nombre}</span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    <div className="producto-buscador">
                      <input
                        type="text"
                        placeholder="Producto"
                        value={producto.nombre}
                        onChange={(e) =>
                          buscarProductos(producto.id, e.target.value, "nombre")
                        }
                      />

                      {(sugerenciasProducto[producto.id] || []).length > 0 && (
                        <div className="sugerencias-producto">
                          {sugerenciasProducto[producto.id].map(
                            (productoEncontrado) => (
                              <div
                                key={productoEncontrado.id_producto}
                                className="sugerencia-producto"
                                onClick={() =>
                                  seleccionarProducto(
                                    producto.id,
                                    productoEncontrado,
                                  )
                                }
                              >
                                <strong>{productoEncontrado.codigo}</strong>

                                <span>{productoEncontrado.nombre}</span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Línea"
                      value={producto.linea}
                      readOnly
                    />

                    <input
                      type="text"
                      placeholder={
                        esSilla(producto.nombre)
                          ? "Placa obligatoria"
                          : "No aplica"
                      }
                      value={producto.placa}
                      disabled={!esSilla(producto.nombre)}
                      onChange={(e) =>
                        actualizarProducto(
                          producto.id,
                          "placa",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />

                    <input
                      type="text"
                      value={formatearPrecio(producto.precioLista)}
                      readOnly
                    />

                    <input
                      type="number"
                      min="1"
                      value={producto.cantidad}
                      onChange={(e) =>
                        actualizarProducto(
                          producto.id,
                          "cantidad",
                          e.target.value,
                        )
                      }
                    />

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={
                        producto.precioVenta
                          ? Number(producto.precioVenta).toLocaleString(
                              "es-CO",
                              {
                                maximumFractionDigits: 0,
                              },
                            )
                          : ""
                      }
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, "");

                        actualizarProducto(producto.id, "precioVenta", valor);
                      }}
                    />

                    <span className="producto-total">
                      {formatearPrecio(calcularTotalProducto(producto))}
                    </span>

                    <button
                      type="button"
                      className="btn-eliminar-producto"
                      onClick={() => eliminarProducto(producto.id)}
                      disabled={productos.length === 1}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              {/* TOTAL */}

              <div className="total-remision">
                <div className="total-remision-info">
                  <span className="total-remision-label">
                    TOTAL DE LA REMISIÓN
                  </span>
                </div>

                <div className="total-remision-valor">
                  {formatearPrecio(totalRemision)}
                </div>
              </div>

              {/* COMENTARIOS */}

              <div className="section-card comentarios-remision">
                <div className="section-title">
                  <h3>Comentarios</h3>

                  <span>Agrega observaciones importantes de la remisión.</span>
                </div>

                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Ej. Cliente solicita entrega el viernes..."
                />
              </div>
              <button
                type="button"
                className="btn-cancelar-remision"
                onClick={cerrarRemision}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-guardar-remision"
                onClick={guardarRemision}
              >
                Guardar remisión
              </button>
            </div>

            {/* ALERTA */}

            <Alerta
              visible={alerta.visible}
              tipo={alerta.tipo}
              titulo={alerta.titulo}
              mensaje={alerta.mensaje}
              cerrar={cerrarAlerta}
            />

            {/* MODAL CLIENTE */}

            <BuscarCliente
              abierto={modalCliente}
              cerrar={() => setModalCliente(false)}
              seleccionarCliente={seleccionarCliente}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
export default NuevaRemision;
