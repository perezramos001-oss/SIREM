import "./Remisiones.css";
import { apiFetch } from "../utils/api";
import { useTeclaEscape } from "../utils/useTeclaEscape";
import { useAvisos } from "../components/Avisos/Avisos";
import { useEffect, useState } from "react";
import { obtenerPeriodo } from "../utils/fechas";
import { Pencil, X, Plus, Trash2, Check } from "lucide-react";
import "../components/NuevaRemision/NuevaRemisionDiseno.css";
import { MEDIOS_PAGO, etiquetaMedioPago } from "../utils/mediosPago";

function Remisiones({ mesSeleccionado, usuarioActual }) {
  const { avisar } = useAvisos();

  const [remisiones, setRemisiones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [remisionesSeleccionadas, setRemisionesSeleccionadas] = useState([]);
  const [modalWO, setModalWO] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [remisionEditando, setRemisionEditando] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [remisionesWO, setRemisionesWO] = useState([]);

  const [passwordWO, setPasswordWO] = useState("");
  const [errorPasswordWO, setErrorPasswordWO] = useState("");

  const [codigoWO, setCodigoWO] = useState("");
  const [errorCodigoWO, setErrorCodigoWO] = useState("");

  const remisionesFiltradas = remisiones.filter((remision) => {
    const texto = busqueda
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return (
      String(remision.numero_remision || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(texto) ||
      String(remision.cliente || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(texto) ||
      String(remision.codigo_producto || "")
        .toLowerCase()
        .includes(texto) ||
      String(remision.nombre_producto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(texto) ||
      String(remision.linea_producto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(texto) ||
      String(remision.placa || "")
        .toLowerCase()
        .includes(texto)
    );
  });

  useEffect(() => {
    const controlador = new AbortController();

    const cargarRemisiones = async () => {
      try {
        setRemisiones([]);

        const periodo = obtenerPeriodo(mesSeleccionado);

        const url = `/api/remisiones?mes=${periodo.mes}&anio=${periodo.anio}`;

        const respuesta = await apiFetch(url, {
          signal: controlador.signal,
        });

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las remisiones.");
        }

        const datos = await respuesta.json();

        if (!controlador.signal.aborted) {
          setRemisiones(datos);

          // Obtener las remisiones que ya estaban
          // registradas en World Office
          const remisionesYaWO = [
            ...new Set(
              datos
                .filter((remision) => Number(remision.wo_bodega_auxiliar) === 1)
                .map((remision) => remision.id_remision),
            ),
          ];

          setRemisionesWO(remisionesYaWO);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error cargando remisiones:", error);

          avisar.fallo(error, "No se pudieron cargar las remisiones del mes.");
        }
      }
    };

    cargarRemisiones();

    return () => {
      controlador.abort();
    };
  }, [mesSeleccionado]);

  const abrirConfirmacionWO = () => {
    setModalWO(true);
  };

  const cerrarConfirmacionWO = () => {
    setModalWO(false);

    setPasswordWO("");
    setCodigoWO("");

    setErrorPasswordWO("");
    setErrorCodigoWO("");
  };

  const confirmarWO = async () => {
    /* =========================
       VALIDAR CÓDIGO W.O.
    ========================= */

    if (!codigoWO.trim()) {
      setErrorCodigoWO("Ingresa el código de World Office para continuar.");

      setErrorPasswordWO("");

      return;
    }

    /* =========================
       VALIDAR CONTRASEÑA
    ========================= */

    if (!passwordWO.trim()) {
      setErrorPasswordWO("Ingresa tu contraseña para continuar.");

      setErrorCodigoWO("");

      return;
    }

    try {
      const respuesta = await apiFetch("/api/remisiones/world-office", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id_remisiones: remisionesSeleccionadas,

          codigo_world_office: codigoWO.trim(),

          password: passwordWO,
        }),
      });

      const datos = await respuesta.json();

      /* =========================
           ERROR DEL BACKEND
        ========================= */

      if (!respuesta.ok) {
        setErrorPasswordWO(
          datos.mensaje || "No se pudo confirmar el movimiento.",
        );

        return;
      }

      /* =========================
           ÉXITO
        ========================= */

      setRemisionesWO((anteriores) => [
        ...anteriores,
        ...remisionesSeleccionadas,
      ]);

      /* =========================
           LIMPIAR
        ========================= */

      setRemisionesSeleccionadas([]);

      setCodigoWO("");

      setPasswordWO("");

      setErrorCodigoWO("");

      setErrorPasswordWO("");

      setModalWO(false);

      avisar.exito(
        remisionesSeleccionadas.length === 1
          ? `La remisión quedó registrada con el código ${codigoWO.trim()}.`
          : `${remisionesSeleccionadas.length} remisiones quedaron registradas con el código ${codigoWO.trim()}.`,
        "Movimiento de World Office confirmado",
      );
    } catch (error) {
      console.error("Error confirmando World Office:", error);

      setErrorPasswordWO("No fue posible conectar con el servidor.");
    }
  };

  const seleccionarRemisionWO = (id) => {
    setRemisionesSeleccionadas((actuales) => {
      if (actuales.includes(id)) {
        return actuales.filter((remisionId) => remisionId !== id);
      }

      return [...actuales, id];
    });
  };

  const editarRemision = async (idRemision) => {
    try {

      const respuesta = await apiFetch(`/api/remisiones/${idRemision}`);

      const datos = await respuesta.json();

      /* =========================
           ERROR
        ========================= */

      if (!respuesta.ok) {
        console.error("Error obteniendo remisión:", datos);

        avisar.error(datos.mensaje || "No se pudo cargar la remisión.");

        return;
      }

      /* =========================
           CARGAR REMISIÓN
        ========================= */


      // La base de datos envía la cantidad como "15.00"
      setRemisionEditando({
        ...datos.remision,
        productos: (datos.remision.productos || []).map((producto) => ({
          ...producto,
          cantidad: Number(producto.cantidad),
        })),
      });

      /* =========================
           ABRIR MODAL
        ========================= */

      setModalEditar(true);
    } catch (error) {
      console.error("Error cargando remisión para editar:", error);

      avisar.error("No fue posible cargar la remisión.");
    }
  }; /* =========================
   AGREGAR PRODUCTO EN EDICIÓN
========================= */

  const agregarProductoEdicion = () => {
    const nuevoProducto = {
      id_detalle: null,
      id_remision: remisionEditando.id_remision,
      id_producto: null,

      codigo_producto: "",
      nombre_producto: "",
      linea_producto: "",

      placa: "",

      precio_lista: 0,
      cantidad: 1,
      precio_venta: 0,

      total_producto: 0,
    };

    setRemisionEditando((prev) => ({
      ...prev,

      productos: [...(prev.productos || []), nuevoProducto],
    }));
  };
  /* =========================
   GUARDAR CAMBIOS REMISIÓN
========================= */

  const guardarCambiosRemision = async () => {
    if (!remisionEditando || guardandoEdicion) {
      return;
    }

    const productos = remisionEditando.productos || [];

    if (productos.length === 0) {
      avisar.advertencia("La remisión debe tener al menos un producto.");

      return;
    }

    if (productos.some((producto) => !producto.id_producto)) {
      avisar.advertencia(
        "Selecciona de la lista de sugerencias el producto de cada fila nueva.",
      );

      return;
    }

    if (productos.some((producto) => !(Number(producto.cantidad) > 0))) {
      avisar.advertencia("La cantidad de cada producto debe ser mayor a cero.");

      return;
    }

    setGuardandoEdicion(true);

    try {
      const respuesta = await apiFetch(
        `/api/remisiones/${remisionEditando.id_remision}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            fecha: remisionEditando.fecha,

            estado_pago: remisionEditando.estado_pago,

            medio_pago: remisionEditando.medio_pago,

            comentarios: remisionEditando.comentarios || null,

            productos,
          }),
        },
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        avisar.error(datos.mensaje || "No se pudieron guardar los cambios.");

        return;
      }

      /* =========================
           CERRAR MODAL
        ========================= */

      setModalEditar(false);
      setRemisionEditando(null);

      /* =========================
           RECARGAR REMISIONES
        ========================= */

      const periodoActual = obtenerPeriodo(mesSeleccionado);

      const respuestaRemisiones = await apiFetch(
        `/api/remisiones?mes=${periodoActual.mes}&anio=${periodoActual.anio}`,
      );

      if (respuestaRemisiones.ok) {
        const datosRemisiones = await respuestaRemisiones.json();

        setRemisiones(datosRemisiones);

        const remisionesYaWO = [
          ...new Set(
            datosRemisiones
              .filter((remision) => Number(remision.wo_bodega_auxiliar) === 1)
              .map((remision) => remision.id_remision),
          ),
        ];

        setRemisionesWO(remisionesYaWO);
      }

      avisar.exito("Remisión actualizada correctamente.");
    } catch (error) {
      console.error("Error guardando remisión:", error);

      avisar.error("No fue posible guardar los cambios.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  /* =========================
   FILAS DE PRODUCTOS EN EDICIÓN
========================= */

  const actualizarProductoEdicion = (index, cambios) => {
    setRemisionEditando((prev) => {
      const productos = [...(prev.productos || [])];

      if (!productos[index]) {
        return prev;
      }

      productos[index] = { ...productos[index], ...cambios };

      return { ...prev, productos };
    });
  };

  const buscarCodigoEdicion = async (index, texto) => {
    // Al cambiar el código, el producto elegido antes deja de valer.
    actualizarProductoEdicion(index, {
      id_producto: null,
      nombre_producto: "",
      linea_producto: "",
      codigo_producto: texto,
      resultados_busqueda: [],
    });

    if (!texto.trim()) {
      return;
    }

    try {
      const respuesta = await apiFetch(
        `/api/productos/buscar-codigo/${encodeURIComponent(texto)}`,
      );

      if (!respuesta.ok) {
        return;
      }

      actualizarProductoEdicion(index, {
        resultados_busqueda: await respuesta.json(),
      });
    } catch (error) {
      console.error("Error buscando producto:", error);
    }
  };

  const seleccionarProductoEdicion = (index, resultado) => {
    actualizarProductoEdicion(index, {
      id_producto: resultado.id_producto,
      codigo_producto: resultado.codigo,
      nombre_producto: resultado.nombre,
      linea_producto: resultado.linea,
      precio_lista: resultado.precio_lista,
      precio_venta: resultado.precio_lista,
      resultados_busqueda: [],
    });
  };

  const quitarProductoEdicion = (index) => {
    setRemisionEditando((prev) => ({
      ...prev,
      productos: (prev.productos || []).filter((_, i) => i !== index),
    }));
  };

  const cerrarEdicion = () => {
    setModalEditar(false);
    setRemisionEditando(null);
  };

  const formatearPesos = (valor) =>
    Number(valor || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });

  const totalEdicion = (remisionEditando?.productos || []).reduce(
    (total, producto) =>
      total +
      (Number(producto.cantidad) || 0) * (Number(producto.precio_venta) || 0),
    0,
  );

  const totalAbonadoEdicion = (remisionEditando?.abonos || []).reduce(
    (total, abono) => total + (Number(abono.valor) || 0),
    0,
  );

  useTeclaEscape(modalWO, cerrarConfirmacionWO);

  useTeclaEscape(modalEditar, cerrarEdicion);

  return (
    <div className="remisiones-page">
      <div className="page-header">
        <div>
          <span className="page-tag">REMISIONES</span>

          <h1>Gestión de remisiones</h1>

          <p>
            Consulta, registra y administra las remisiones del mes seleccionado.
          </p>
        </div>
      </div>
      <div className="toolbar">
        <input
          type="text"
          placeholder="Buscar remisión, cliente, código, producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {remisionesSeleccionadas.length > 0 && (
        <div className="wo-accion">
          <span>
            {remisionesSeleccionadas.length}{" "}
            {remisionesSeleccionadas.length === 1
              ? "remisión seleccionada"
              : "remisiones seleccionadas"}
          </span>

          <button type="button" onClick={abrirConfirmacionWO}>
            ✓ Pasar a World Office
          </button>
        </div>
      )}
      <div className="tabla-remisiones">
        <div className="tabla-header">
          <span>Remisión</span>

          <span>Fecha</span>

          <span>Código</span>

          <span>Producto</span>

          <span>Línea</span>

          <span>Placa</span>

          <span>P. Lista</span>

          <span>Cant.</span>

          <span>P. Venta</span>

          <span>Total</span>

          <span>Cliente</span>

          <span>Pago</span>

          <span>Comercial</span>

          <span>Observaciones</span>

          <span>Cartera</span>

          <span>W.O.</span>

          <span>Acción</span>
        </div>
        {remisionesFiltradas.length === 0 ? (
          <div className="remisiones-vacio">
            {busqueda
              ? "No encontramos remisiones con esa búsqueda."
              : "No hay remisiones registradas en este mes."}
          </div>
        ) : (
          (() => {
            let ultimaRemision = null;
            let grupoColor = false;

            return remisionesFiltradas.map((remision) => {
              const esPrimeraFilaRemision =
                ultimaRemision !== remision.numero_remision;

              if (ultimaRemision !== null && esPrimeraFilaRemision) {
                grupoColor = !grupoColor;
              }

              ultimaRemision = remision.numero_remision;

              const yaEstaEnWO = remisionesWO.includes(remision.id_remision);

              return (
                <div
                  className={`tabla-row
                    ${
                      grupoColor
                        ? "remision-grupo-alterno"
                        : "remision-grupo-normal"
                    }
                    ${esPrimeraFilaRemision ? "nueva-remision" : ""}
                `}
                  key={`${remision.id_remision}-${remision.id_detalle}`}
                >
                  <div className="remision-columna">
                    <span>{remision.numero_remision}</span>
                  </div>

                  <span>
                    {remision.fecha
                      ? String(remision.fecha)
                          .slice(0, 10)
                          .split("-")
                          .reverse()
                          .join("/")
                      : "-"}
                  </span>

                  <span>{remision.codigo_producto}</span>
                  <span>{remision.nombre_producto}</span>

                  <span>{remision.linea_producto}</span>

                  <span>{remision.placa || "-"}</span>

                  <span>
                    ${Number(remision.precio_lista).toLocaleString("es-CO")}
                  </span>

                  <span className="cantidad-remision">
                    {Number(remision.cantidad).toLocaleString("es-CO", {
                      maximumFractionDigits: 0,
                    })}
                  </span>

                  <span>
                    ${Number(remision.precio_venta).toLocaleString("es-CO")}
                  </span>

                  <strong className="total-tabla">
                    {esPrimeraFilaRemision
                      ? `$${Number(remision.total).toLocaleString("es-CO")}`
                      : ""}
                  </strong>

                  <span>{remision.cliente}</span>

                  <span>{etiquetaMedioPago(remision.medio_pago)}</span>

                  <span>{remision.comercial}</span>

                  <span>{remision.comentarios || "-"}</span>

                  <span
                    className={`cartera ${
                      Number(remision.saldo_pendiente) > 0
                        ? "pendiente"
                        : "pagada"
                    }`}
                  >
                    {Number(remision.saldo_pendiente) > 0
                      ? "Pendiente"
                      : "Pagada"}
                  </span>

                  <div className="wo-tooltip-container">
                    <button
                      type="button"
                      className={`wo-checkbox ${yaEstaEnWO ? "marcado" : ""} ${
                        remisionesSeleccionadas.includes(remision.id_remision)
                          ? "seleccionado"
                          : ""
                      }`}
                      disabled={
                        usuarioActual.rol !== "ADMINISTRADOR" || yaEstaEnWO
                      }
                      onClick={() => {
                        seleccionarRemisionWO(remision.id_remision);
                      }}
                    >
                      {yaEstaEnWO
                        ? "✓"
                        : remisionesSeleccionadas.includes(remision.id_remision)
                          ? "✓"
                          : "☐"}
                    </button>

                    {yaEstaEnWO && (
                      <span className="wo-tooltip">
                        {remision.codigo_world_office}
                      </span>
                    )}
                  </div>

                  {esPrimeraFilaRemision &&
                    usuarioActual?.rol === "ADMINISTRADOR" && (
                      <button
                        type="button"
                        className="btn-editar-remision"
                        title="Editar remisión"
                        onClick={() => editarRemision(remision.id_remision)}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                </div>
              );
            });
          })()
        )}
      </div>

      {/* =========================
    MODAL WORLD OFFICE
========================= */}

      {modalWO && (
        <div className="nr-overlay">
          <form
            className="nr-modal nr-modal-compacto"
            role="dialog"
            aria-modal="true"
            onSubmit={(e) => {
              e.preventDefault();
              confirmarWO();
            }}
          >
            {/* ENCABEZADO */}

            <header className="nr-header">
              <div className="nr-header-titulo">
                <span className="nr-tag">WORLD OFFICE</span>

                <h3>Confirmar movimiento</h3>

                <p className="nr-subtitulo">
                  Registra que estas remisiones ya fueron pasadas a World
                  Office.
                </p>
              </div>

              <button
                type="button"
                className="nr-btn-icono"
                onClick={cerrarConfirmacionWO}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </header>

            <div className="nr-cuerpo nr-cuerpo-simple">
              {/* REMISIONES SELECCIONADAS */}

              <section className="nr-seccion">
                <div className="nr-seccion-titulo">
                  <span className="nr-paso">1</span>

                  <h4>Remisiones</h4>

                  <span className="nr-contador">
                    {remisionesSeleccionadas.length}{" "}
                    {remisionesSeleccionadas.length === 1
                      ? "seleccionada"
                      : "seleccionadas"}
                  </span>
                </div>

                <div className="nr-chips">
                  {[
                    ...new Set(
                      remisiones
                        .filter((remision) =>
                          remisionesSeleccionadas.includes(remision.id_remision),
                        )
                        .map((remision) => remision.numero_remision),
                    ),
                  ].map((numero) => (
                    <span className="nr-chip" key={numero}>
                      {numero}
                    </span>
                  ))}
                </div>
              </section>

              {/* DATOS DE CONFIRMACIÓN */}

              <section className="nr-seccion">
                <div className="nr-seccion-titulo">
                  <span className="nr-paso">2</span>
                  <h4>Confirmación</h4>
                </div>

                <div className="nr-pago-detalle nr-sin-margen">
                  <div className="nr-campo">
                    <label>Código World Office *</label>

                    <input
                      type="text"
                      autoFocus
                      value={codigoWO}
                      onChange={(e) => {
                        setCodigoWO(e.target.value);
                        setErrorCodigoWO("");
                      }}
                      placeholder="Ej. SA 70 - EA 71"
                      className={errorCodigoWO ? "nr-error" : ""}
                    />

                    {errorCodigoWO && (
                      <small className="nr-mensaje-error">{errorCodigoWO}</small>
                    )}
                  </div>

                  <div className="nr-campo">
                    <label>Tu contraseña *</label>

                    <input
                      type="password"
                      value={passwordWO}
                      onChange={(e) => {
                        setPasswordWO(e.target.value);
                        setErrorPasswordWO("");
                      }}
                      placeholder="Ingresa tu contraseña"
                      autoComplete="current-password"
                      className={errorPasswordWO ? "nr-error" : ""}
                    />

                    {errorPasswordWO ? (
                      <small className="nr-mensaje-error">
                        {errorPasswordWO}
                      </small>
                    ) : (
                      <small className="nr-ayuda">
                        Se pide para confirmar que eres tú quien registra el
                        movimiento.
                      </small>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* PIE */}

            <footer className="nr-pie nr-pie-derecha">
              <div className="nr-pie-acciones">
                <button
                  type="button"
                  className="nr-btn-texto"
                  onClick={cerrarConfirmacionWO}
                >
                  Cancelar
                </button>

                <button type="submit" className="nr-btn-primario">
                  <Check size={15} /> Confirmar movimiento
                </button>
              </div>
            </footer>
          </form>
        </div>
      )}

      {/* =========================
    MODAL EDITAR REMISIÓN
    (mismo diseño que Nueva remisión, clases nr-)
========================= */}

      {modalEditar && remisionEditando && (
        <div className="nr-overlay">
          <div className="nr-modal" role="dialog" aria-modal="true">
            {/* ENCABEZADO */}

            <header className="nr-header">
              <div className="nr-header-titulo">
                <span className="nr-tag">REMISIÓN</span>

                <h3>Editar remisión</h3>
              </div>

              <div className="nr-header-datos">
                <span className="nr-chip">
                  <small>No.</small>
                  {remisionEditando.numero_remision}
                </span>

                <span className="nr-chip">
                  <small>Total original</small>
                  {formatearPesos(remisionEditando.total)}
                </span>
              </div>

              <button
                type="button"
                className="nr-btn-icono"
                onClick={cerrarEdicion}
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
                {/* DATOS GENERALES */}

                <section className="nr-seccion">
                  <div className="nr-seccion-titulo">
                    <span className="nr-paso">1</span>
                    <h4>Datos generales</h4>
                  </div>

                  <div className="nr-grid-2">
                    <div className="nr-campo">
                      <label>Cliente</label>

                      <div className="nr-selector-cliente con-cliente nr-solo-lectura">
                        <span className="nr-avatar">
                          {remisionEditando.cliente?.[0] || "?"}
                        </span>

                        <span className="nr-cliente-info">
                          <strong>{remisionEditando.cliente}</strong>

                          <small>
                            {[
                              remisionEditando.ciudad,
                              remisionEditando.comercial &&
                                `Comercial: ${remisionEditando.comercial}`,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Sin datos adicionales"}
                          </small>
                        </span>
                      </div>
                    </div>

                    <div className="nr-campo">
                      <label>Fecha *</label>

                      <input
                        type="date"
                        value={
                          remisionEditando.fecha
                            ? String(remisionEditando.fecha).substring(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          setRemisionEditando((prev) => ({
                            ...prev,
                            fecha: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </section>

                {/* PRODUCTOS */}

                <section className="nr-seccion">
                  <div className="nr-seccion-titulo">
                    <span className="nr-paso">2</span>

                    <h4>Productos</h4>

                    <span className="nr-contador">
                      {(remisionEditando.productos || []).length}{" "}
                      {(remisionEditando.productos || []).length === 1
                        ? "producto"
                        : "productos"}
                    </span>

                    <button
                      type="button"
                      className="nr-btn-secundario"
                      onClick={agregarProductoEdicion}
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

                    {(remisionEditando.productos || []).length === 0 && (
                      <p className="nr-tabla-vacia">
                        Quitaste todos los productos. Agrega al menos uno para
                        poder guardar la remisión.
                      </p>
                    )}

                    {(remisionEditando.productos || []).map(
                      (producto, index) => {
                        const esNuevo = !producto.id_detalle;

                        return (
                          <div
                            className="nr-fila"
                            key={producto.id_detalle || `nuevo-${index}`}
                          >
                            {esNuevo ? (
                              <div className="nr-autocompletar">
                                <input
                                  type="text"
                                  placeholder="Código"
                                  value={producto.codigo_producto || ""}
                                  onChange={(e) =>
                                    buscarCodigoEdicion(index, e.target.value)
                                  }
                                  onBlur={() =>
                                    actualizarProductoEdicion(index, {
                                      resultados_busqueda: [],
                                    })
                                  }
                                />

                                {producto.resultados_busqueda?.length > 0 && (
                                  <div className="nr-sugerencias">
                                    {producto.resultados_busqueda.map(
                                      (resultado) => (
                                        <button
                                          type="button"
                                          key={resultado.id_producto}
                                          className="nr-sugerencia"
                                          // mousedown se adelanta al blur
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            seleccionarProductoEdicion(
                                              index,
                                              resultado,
                                            );
                                          }}
                                        >
                                          <strong>{resultado.codigo}</strong>
                                          <span>{resultado.nombre}</span>
                                          <small>
                                            {formatearPesos(
                                              resultado.precio_lista,
                                            )}
                                          </small>
                                        </button>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="nr-texto-fijo">
                                {producto.codigo_producto || "—"}
                              </span>
                            )}

                            <div className="nr-producto-celda">
                              <span className="nr-texto-fijo nr-fuerte">
                                {producto.nombre_producto ||
                                  (esNuevo ? "Busca por código" : "—")}
                              </span>

                              {producto.id_producto ? (
                                <small className="nr-meta">
                                  {producto.linea_producto || "Sin línea"} ·
                                  Lista {formatearPesos(producto.precio_lista)}
                                </small>
                              ) : (
                                esNuevo &&
                                producto.codigo_producto && (
                                  <small className="nr-meta nr-meta-alerta">
                                    Elige el producto de la lista
                                  </small>
                                )
                              )}
                            </div>

                            <input
                              type="text"
                              placeholder="Placa"
                              value={producto.placa || ""}
                              onChange={(e) =>
                                actualizarProductoEdicion(index, {
                                  placa: e.target.value.toUpperCase(),
                                })
                              }
                            />

                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="nr-derecha"
                              value={producto.cantidad}
                              onChange={(e) =>
                                actualizarProductoEdicion(index, {
                                  cantidad: e.target.value,
                                })
                              }
                            />

                            <div className="nr-input-moneda">
                              <span>$</span>

                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={
                                  Number(producto.precio_venta)
                                    ? Number(
                                        producto.precio_venta,
                                      ).toLocaleString("es-CO", {
                                        maximumFractionDigits: 0,
                                      })
                                    : ""
                                }
                                onChange={(e) =>
                                  actualizarProductoEdicion(index, {
                                    precio_venta:
                                      Number(e.target.value.replace(/\D/g, "")) ||
                                      0,
                                  })
                                }
                              />
                            </div>

                            <span className="nr-total-fila">
                              {formatearPesos(
                                (Number(producto.cantidad) || 0) *
                                  (Number(producto.precio_venta) || 0),
                              )}
                            </span>

                            <button
                              type="button"
                              className="nr-btn-eliminar"
                              title="Quitar producto"
                              onClick={() => quitarProductoEdicion(index)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      },
                    )}
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
                    value={remisionEditando.comentarios || ""}
                    onChange={(e) =>
                      setRemisionEditando((prev) => ({
                        ...prev,
                        comentarios: e.target.value,
                      }))
                    }
                    placeholder="Observaciones de la remisión..."
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
                    {[
                      { valor: "pagada", etiqueta: "Pagada" },
                      { valor: "abono", etiqueta: "Abono" },
                      { valor: "pendiente", etiqueta: "Pendiente" },
                    ].map((estado) => {
                      const activo = remisionEditando.estado_pago === estado.valor;

                      return (
                        <button
                          type="button"
                          key={estado.valor}
                          role="radio"
                          aria-checked={activo}
                          className={activo ? "activo" : ""}
                          onClick={() =>
                            setRemisionEditando((prev) => ({
                              ...prev,
                              estado_pago: estado.valor,
                            }))
                          }
                        >
                          {activo && <Check size={13} />}
                          {estado.etiqueta}
                        </button>
                      );
                    })}
                  </div>

                  <div className="nr-pago-detalle">
                    <div className="nr-campo">
                      <label>Método de pago</label>

                      <select
                        value={remisionEditando.medio_pago || ""}
                        onChange={(e) =>
                          setRemisionEditando((prev) => ({
                            ...prev,
                            medio_pago: e.target.value,
                          }))
                        }
                      >
                        <option value="">Sin método</option>

                        {MEDIOS_PAGO.map((medio) => (
                          <option key={medio.valor} value={medio.valor}>
                            {medio.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(remisionEditando.abonos || []).length > 0 && (
                      <div className="nr-campo">
                        <label>Abonos registrados</label>

                        <ul className="nr-abonos">
                          {remisionEditando.abonos.map((abono) => (
                            <li key={abono.id_abono}>
                              <div>
                                <strong>{formatearPesos(abono.valor)}</strong>

                                <small>
                                  {new Date(abono.fecha).toLocaleDateString(
                                    "es-CO",
                                  )}
                                  {abono.comentario
                                    ? ` · ${abono.comentario}`
                                    : ""}
                                </small>
                              </div>
                            </li>
                          ))}
                        </ul>

                        <small className="nr-ayuda">
                          Los abonos se registran desde Cartera.
                        </small>
                      </div>
                    )}

                    {remisionEditando.estado_pago === "pagada" && (
                      <p className="nr-nota">
                        Al guardar como <strong>Pagada</strong>, el saldo
                        pendiente queda en cero.
                      </p>
                    )}
                  </div>
                </section>

                {/* RESUMEN */}

                <section className="nr-resumen">
                  <div>
                    <span>Total original</span>
                    <strong>{formatearPesos(remisionEditando.total)}</strong>
                  </div>

                  <div>
                    <span>Nuevo total</span>
                    <strong>{formatearPesos(totalEdicion)}</strong>
                  </div>

                  {totalAbonadoEdicion > 0 && (
                    <>
                      <div>
                        <span>Abonado</span>
                        <strong>{formatearPesos(totalAbonadoEdicion)}</strong>
                      </div>

                      <div>
                        <span>Saldo estimado</span>
                        <strong className="nr-saldo">
                          {formatearPesos(
                            remisionEditando.estado_pago === "pagada"
                              ? 0
                              : Math.max(totalEdicion - totalAbonadoEdicion, 0),
                          )}
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
                <strong>{formatearPesos(totalEdicion)}</strong>
              </div>

              <div className="nr-pie-acciones">
                <button
                  type="button"
                  className="nr-btn-texto"
                  onClick={cerrarEdicion}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="nr-btn-primario"
                  onClick={guardarCambiosRemision}
                  disabled={guardandoEdicion}
                >
                  {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default Remisiones;
