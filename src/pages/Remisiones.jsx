import "./Remisiones.css";
import React, { useEffect, useState } from "react";
import { obtenerPeriodo } from "../utils/fechas";

function Remisiones({ mesSeleccionado, usuarioActual }) {
  console.log("MES ACTUAL:", mesSeleccionado);

  const periodo = obtenerPeriodo(mesSeleccionado);

  const [remisiones, setRemisiones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [remisionesSeleccionadas, setRemisionesSeleccionadas] = useState([]);
  const [modalWO, setModalWO] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [remisionEditando, setRemisionEditando] = useState(null);

  const [remisionesWO, setRemisionesWO] = useState([]);

  const [administradorWO, setAdministradorWO] = useState("");
  const [comentarioWO, setComentarioWO] = useState("");

  const [passwordWO, setPasswordWO] = useState("");
  const [errorPasswordWO, setErrorPasswordWO] = useState("");

  const [codigoWO, setCodigoWO] = useState("");
  const [errorCodigoWO, setErrorCodigoWO] = useState("");

  const [codigosWO, setCodigosWO] = useState({});

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

        console.log("Cargando:", url);

        const respuesta = await fetch(url, {
          signal: controlador.signal,
        });

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las remisiones.");
        }

        const textoRespuesta = await respuesta.text();

        console.log("STATUS:", respuesta.status);
        console.log("URL:", respuesta.url);
        console.log("RESPUESTA:", textoRespuesta);

        if (!respuesta.ok) {
          alert("Error del servidor: " + respuesta.status);
          return;
        }

        const datos = JSON.parse(textoRespuesta);

        console.log(
          "REMISIONES CON W.O.:",
          datos.filter((remision) => Number(remision.wo_bodega_auxiliar) === 1),
        );
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
      const respuesta = await fetch("/api/remisiones/world-office", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id_remisiones: remisionesSeleccionadas,

          codigo_world_office: codigoWO.trim(),

          id_usuario: usuarioActual.id_usuario,

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

      setCodigosWO((anteriores) => {
        const nuevos = {
          ...anteriores,
        };

        remisionesSeleccionadas.forEach((id) => {
          nuevos[id] = codigoWO.trim();
        });

        return nuevos;
      });

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
      console.log("Cargando remisión para editar:", idRemision);

      const respuesta = await fetch(`/api/remisiones/${idRemision}`);

      const datos = await respuesta.json();

      /* =========================
           ERROR
        ========================= */

      if (!respuesta.ok) {
        console.error("Error obteniendo remisión:", datos);

        alert(datos.mensaje || "No se pudo cargar la remisión.");

        return;
      }

      /* =========================
           CARGAR REMISIÓN
        ========================= */

      console.log("Remisión cargada:", datos.remision);

      setRemisionEditando(datos.remision);

      /* =========================
           ABRIR MODAL
        ========================= */

      setModalEditar(true);
    } catch (error) {
      console.error("Error cargando remisión para editar:", error);

      alert("No fue posible cargar la remisión.");
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
    if (!remisionEditando) {
      return;
    }

    try {
      const productos = remisionEditando.productos || [];

      /* =========================
           CALCULAR TOTAL
        ========================= */

      const total = productos.reduce((acumulado, producto) => {
        const cantidad = Number(producto.cantidad) || 0;

        const precio = Number(producto.precio_venta) || 0;

        return acumulado + cantidad * precio;
      }, 0);

      const respuesta = await fetch(
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
        alert(datos.mensaje || "No se pudieron guardar los cambios.");

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

      const respuestaRemisiones = await fetch(
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

      alert("Remisión actualizada correctamente.");
    } catch (error) {
      console.error("Error guardando remisión:", error);

      alert("No fue posible guardar los cambios.");
    }
  };

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
              const agregarProductoEdicion = () => {
                const nuevoProducto = {
                  id_detalle: null,
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
                  key={remision.id_detalle}
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

                  <span>{remision.medio_pago}</span>

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
                        ✏️
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
        <div className="modal-overlay-wo">
          <div className="modal-wo">
            <div className="modal-wo-header">
              <div>
                <span className="modal-wo-tag">WORLD OFFICE</span>

                <h2>Confirmar movimiento</h2>

                <p>
                  Vas a registrar que estas remisiones ya fueron pasadas a World
                  Office.
                </p>
              </div>

              <button
                type="button"
                className="modal-wo-cerrar"
                onClick={cerrarConfirmacionWO}
              >
                ×
              </button>
            </div>

            <div className="modal-wo-contenido">
              <div className="wo-resumen">
                <div className="wo-cantidad">
                  <strong>{remisionesSeleccionadas.length}</strong>

                  <span>
                    {remisionesSeleccionadas.length === 1
                      ? "remisión seleccionada"
                      : "remisiones seleccionadas"}
                  </span>
                </div>

                <div className="wo-remisiones-lista">
                  {[
                    ...new Set(
                      remisiones
                        .filter((remision) =>
                          remisionesSeleccionadas.includes(
                            remision.id_remision,
                          ),
                        )
                        .map((remision) => remision.numero_remision),
                    ),
                  ].join(", ")}
                </div>
              </div>
              <label className="label-wo">Código World Office</label>

              <input
                type="text"
                value={codigoWO}
                onChange={(e) => {
                  setCodigoWO(e.target.value);

                  setErrorCodigoWO("");
                }}
                placeholder="Ej. SA 70 - EA 71"
                className={`input-wo ${errorCodigoWO ? "input-wo-error" : ""}`}
              />

              {errorCodigoWO && (
                <div className="alerta-wo-error">
                  <span>!</span>

                  <p>{errorCodigoWO}</p>
                </div>
              )}

              <label>Contraseña</label>

              <input
                type="password"
                value={passwordWO}
                onChange={(e) => {
                  setPasswordWO(e.target.value);

                  setErrorPasswordWO("");
                }}
                placeholder="Ingresa tu contraseña"
                className={errorPasswordWO ? "input-password-error" : ""}
              />

              {errorPasswordWO && (
                <div className="alerta-password-wo">
                  <span>!</span>

                  <p>{errorPasswordWO}</p>
                </div>
              )}
            </div>

            <div className="modal-wo-footer">
              <button
                type="button"
                className="btn-cancelar-wo"
                onClick={cerrarConfirmacionWO}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-confirmar-wo"
                onClick={confirmarWO}
              >
                ✓ Confirmar movimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
    MODAL EDITAR REMISIÓN
========================= */}

      {modalEditar && remisionEditando && (
        <div className="modal-overlay">
          <div className="modal-editar-remision">
            <div className="modal-editar-header">
              <div>
                <span className="modal-editar-tag">REMISIÓN</span>

                <h2>Editar remisión</h2>

                <p>Modifica la información de la remisión seleccionada.</p>
              </div>

              <button
                type="button"
                className="modal-editar-cerrar"
                onClick={() => {
                  setModalEditar(false);
                  setRemisionEditando(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-editar-contenido">
              <div className="editar-resumen">
                <div>
                  <span>Remisión</span>

                  <strong>{remisionEditando.numero_remision}</strong>
                </div>

                <div>
                  <span>Cliente</span>

                  <strong>{remisionEditando.cliente}</strong>
                </div>

                <div>
                  <span>Total</span>

                  <strong>
                    ${Number(remisionEditando.total).toLocaleString("es-CO")}
                  </strong>
                </div>
              </div>

              <div className="editar-formulario">
                {/* FECHA */}

                <div className="editar-campo">
                  <label>Fecha</label>

                  <input
                    type="date"
                    value={
                      remisionEditando.fecha
                        ? String(remisionEditando.fecha).substring(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      setRemisionEditando({
                        ...remisionEditando,
                        fecha: e.target.value,
                      })
                    }
                  />
                </div>

                {/* ESTADO DE PAGO */}

                <div className="editar-campo">
                  <label>Estado de pago</label>

                  <select
                    value={remisionEditando.estado_pago || ""}
                    onChange={(e) =>
                      setRemisionEditando({
                        ...remisionEditando,
                        estado_pago: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccionar estado</option>

                    <option value="pagada">Pagada</option>

                    <option value="abono">Abono / Parcial</option>

                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>

                {/* MÉTODO DE PAGO */}

                <div className="editar-campo">
                  <label>Método de pago</label>

                  <select
                    value={remisionEditando.medio_pago || ""}
                    onChange={(e) =>
                      setRemisionEditando({
                        ...remisionEditando,
                        medio_pago: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccionar método</option>

                    <option value="Dólares">Dólares</option>

                    <option value="Efectivo">Efectivo</option>

                    <option value="Otro">Otro</option>

                    <option value="Pendiente pago">Pendiente pago</option>

                    <option value="Regalo">Regalo</option>

                    <option value="T. Crédito">T. Crédito</option>

                    <option value="Transferencia">Transferencia</option>

                    <option value="T. Débito">T. Débito</option>
                  </select>
                </div>

                {/* =========================
        PRODUCTOS
    ========================= */}

                <div className="editar-productos">
                  <div className="editar-productos-titulo">
                    <div>
                      <h3>Productos de la remisión</h3>

                      <span>Modifica cantidades, precios y placas.</span>
                    </div>

                    <button
                      type="button"
                      className="btn-agregar-producto-editar"
                      onClick={agregarProductoEdicion}
                    >
                      + Agregar producto
                    </button>
                  </div>

                  <div className="editar-productos-tabla">
                    <div className="editar-productos-header">
                      <span>Código</span>
                      <span>Producto</span>
                      <span>Placa</span>
                      <span>Cantidad</span>
                      <span>Precio venta</span>
                      <span>Total</span>
                      <span></span>
                    </div>

                    {(remisionEditando.productos || []).map(
                      (producto, index) => (
                        <div
                          className="editar-producto-row"
                          key={
                            producto.id_detalle ||
                            `${producto.id_producto}-${index}`
                          }
                        >
                          {producto.id_detalle === null ? (
                            <div
                              className="editar-buscador-producto"
                              style={{
                                position: "relative",
                                zIndex: 99999,
                              }}
                            >
                              <input
                                type="text"
                                className="editar-input-codigo"
                                placeholder="Código"
                                value={producto.codigo_producto || ""}
                                onChange={async (e) => {
                                  const texto = e.target.value;

                                  // Actualizar inmediatamente lo que escribe
                                  setRemisionEditando((prev) => {
                                    const productos = [
                                      ...(prev.productos || []),
                                    ];

                                    productos[index] = {
                                      ...productos[index],
                                      codigo_producto: texto,
                                      resultados_busqueda: [],
                                    };

                                    return {
                                      ...prev,
                                      productos,
                                    };
                                  });

                                  if (!texto.trim()) {
                                    return;
                                  }

                                  try {
                                    const respuesta = await fetch(
                                      `/api/productos/buscar-codigo/${encodeURIComponent(texto)}`,
                                    );

                                    const resultados = await respuesta.json();

                                    console.log("BUSQUEDA:", texto);
                                    console.log("RESULTADOS:", resultados);

                                    // IMPORTANTE:
                                    // usar el estado más reciente
                                    setRemisionEditando((prev) => {
                                      const productos = [
                                        ...(prev.productos || []),
                                      ];

                                      if (!productos[index]) {
                                        return prev;
                                      }

                                      productos[index] = {
                                        ...productos[index],
                                        resultados_busqueda: resultados,
                                      };

                                      return {
                                        ...prev,
                                        productos,
                                      };
                                    });
                                  } catch (error) {
                                    console.error(
                                      "Error buscando producto:",
                                      error,
                                    );
                                  }
                                }}
                              />

                              {producto.resultados_busqueda?.length > 0 && (
                                <div className="editar-resultados-producto">
                                  {producto.resultados_busqueda.map(
                                    (resultado) => (
                                      <button
                                        type="button"
                                        key={resultado.id_producto}
                                        onClick={() => {
                                          const productos = [
                                            ...remisionEditando.productos,
                                          ];

                                          productos[index] = {
                                            ...productos[index],

                                            id_producto: resultado.id_producto,

                                            codigo_producto: resultado.codigo,

                                            nombre_producto: resultado.nombre,

                                            linea_producto: resultado.linea,

                                            precio_lista:
                                              resultado.precio_lista,

                                            precio_venta:
                                              resultado.precio_lista,

                                            total:
                                              (Number(
                                                productos[index].cantidad,
                                              ) || 0) *
                                              (Number(resultado.precio_lista) ||
                                                0),

                                            resultados_busqueda: [],
                                          };

                                          setRemisionEditando({
                                            ...remisionEditando,
                                            productos,
                                          });
                                        }}
                                      >
                                        <strong>{resultado.codigo}</strong>

                                        <span>{resultado.nombre}</span>
                                      </button>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="editar-codigo">
                              {producto.codigo_producto || "-"}
                            </span>
                          )}

                          {producto.id_detalle === null ? (
                            <span className="editar-nombre">
                              {producto.nombre_producto || "-"}
                            </span>
                          ) : (
                            <span className="editar-nombre">
                              {producto.nombre_producto || "-"}
                            </span>
                          )}

                          <input
                            type="text"
                            value={producto.placa || ""}
                            placeholder="Placa"
                            onChange={(e) => {
                              const productos = [...remisionEditando.productos];

                              productos[index] = {
                                ...productos[index],
                                placa: e.target.value,
                              };

                              setRemisionEditando({
                                ...remisionEditando,
                                productos,
                              });
                            }}
                          />

                          <input
                            type="text"
                            inputMode="decimal"
                            value={
                              Number.isInteger(Number(producto.cantidad))
                                ? String(Number(producto.cantidad))
                                : Number(producto.cantidad).toLocaleString(
                                    "es-CO",
                                    {
                                      maximumFractionDigits: 2,
                                    },
                                  )
                            }
                            onChange={(e) => {
                              const valor = e.target.value.replace(",", ".");

                              const cantidad = Number(valor) || 0;

                              const productos = [...remisionEditando.productos];

                              const precio =
                                Number(productos[index].precio_venta) || 0;

                              productos[index] = {
                                ...productos[index],
                                cantidad,
                                total: cantidad * precio,
                              };

                              setRemisionEditando({
                                ...remisionEditando,
                                productos,
                              });
                            }}
                          />

                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              Number(producto.precio_venta)
                                ? Number(producto.precio_venta).toLocaleString(
                                    "es-CO",
                                    {
                                      maximumFractionDigits: 0,
                                    },
                                  )
                                : ""
                            }
                            onChange={(e) => {
                              const valor = e.target.value
                                .replace(/\./g, "")
                                .replace(",", ".");

                              const precio = Number(valor) || 0;

                              const productos = [...remisionEditando.productos];

                              const cantidad =
                                Number(productos[index].cantidad) || 0;

                              productos[index] = {
                                ...productos[index],
                                precio_venta: precio,
                                total: cantidad * precio,
                              };

                              setRemisionEditando({
                                ...remisionEditando,
                                productos,
                              });
                            }}
                          />

                          <strong className="editar-producto-total">
                            $
                            {(
                              (Number(producto.cantidad) || 0) *
                              (Number(producto.precio_venta) || 0)
                            ).toLocaleString("es-CO")}
                          </strong>

                          <button
                            type="button"
                            className="btn-eliminar-producto-editar"
                            title="Eliminar producto"
                            onClick={() => {
                              const productos = [...remisionEditando.productos];

                              productos.splice(index, 1);

                              setRemisionEditando({
                                ...remisionEditando,
                                productos,
                              });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ),
                    )}
                  </div>

                  {/* TOTAL */}

                  <div className="editar-total">
                    <span>TOTAL DE LA REMISIÓN</span>

                    <strong>
                      $
                      {(remisionEditando.productos || [])
                        .reduce(
                          (total, producto) =>
                            total +
                            (Number(producto.cantidad) || 0) *
                              (Number(producto.precio_venta) || 0),
                          0,
                        )
                        .toLocaleString("es-CO")}
                    </strong>
                  </div>
                </div>

                {/* COMENTARIOS */}

                <div className="editar-campo editar-campo-completo">
                  <label>Comentarios</label>

                  <textarea
                    value={remisionEditando.comentarios || ""}
                    onChange={(e) =>
                      setRemisionEditando({
                        ...remisionEditando,
                        comentarios: e.target.value,
                      })
                    }
                    placeholder="Observaciones de la remisión..."
                  />
                </div>
              </div>
            </div>

            {/* FOOTER DEL MODAL */}

            <div className="modal-editar-footer">
              <button
                type="button"
                className="btn-cancelar-remision"
                onClick={() => {
                  setModalEditar(false);
                  setRemisionEditando(null);
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-guardar-remision"
                onClick={guardarCambiosRemision}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Remisiones;
