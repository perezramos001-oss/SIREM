import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Cartera.css";

import {
    WalletCards,
    Clock3,
    AlertCircle,
    CircleCheck,
    Search,
    Eye,
    ChevronDown
} from "lucide-react";

function Cartera({
    usuarioActual,
    remisionDestacada
}) {

    const [filtro, setFiltro] = useState("Todos");
    const [busqueda, setBusqueda] = useState("");
    const [comercialSeleccionado, setComercialSeleccionado] = useState("Todos");
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

    const [productosRemision, setProductosRemision] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [cargando, setCargando] = useState(true);

    const [comerciales, setComerciales] = useState([]);

    const [modalAbono, setModalAbono] = useState(false);
    const [comentarioAbono, setComentarioAbono] = useState("");
    const [errorAbono, setErrorAbono] = useState("");

    const [carteraTotal, setCarteraTotal] = useState(0);
    const [carteraAlDia, setCarteraAlDia] = useState(0);
    const [carteraSeguimiento, setCarteraSeguimiento] = useState(0);
    const [carteraVencida, setCarteraVencida] = useState(0);

    const cargarAbonos = async (idRemision) => {

    try {

        const respuesta = await fetch(
            `/api/cartera/${idRemision}/abonos`
        );

        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron cargar los abonos."
            );

        }

        const datos = await respuesta.json();


        setAbonos((anteriores) => ({

            ...anteriores,

            [idRemision]: datos

        }));


    } catch (error) {

        console.error(
            "Error cargando abonos:",
            error
        );

    }

};

const cargarCartera = async () => {

    try {

        setCargando(true);


        let url =
            "/api/cartera";


        /* =========================
           FILTRO COMERCIAL
        ========================= */

        if (
            comercialSeleccionado &&
            comercialSeleccionado !== "Todos"
        ) {

            url +=
                `?comercial=${comercialSeleccionado}`;

        }


        const respuesta =
            await axios.get(url);


        const datos =
            respuesta.data.map((cuenta) => ({

                id_remision:
                    cuenta.id_remision,

                numero_remision:
                    cuenta.numero_remision,

                cliente:
                    cuenta.cliente,

                documento:
                    cuenta.documento,

                fechaRemision:
                    new Date(cuenta.fecha)
                        .toLocaleDateString("es-CO"),

                valor:
                    Number(cuenta.total),

                saldo_pendiente:
                    Number(cuenta.saldo_pendiente),

                cantidad_abonos:
                    Number(cuenta.cantidad_abonos),

                total_abonado:
                    Number(cuenta.total_abonado),

                dias:
                    Number(cuenta.dias),

                comercial:
                    cuenta.comercial,

                estadoPago:
                    cuenta.estado

            }));


        setCuentas(datos);


    } catch (error) {

        console.error(
            "Error cargando cartera:",
            error
        );

    } finally {

        setCargando(false);

    }

};

const cargarKPIs = async () => {

    try {

        let url =
            "/api/cartera/kpis";


        /* =========================
           FILTRO POR COMERCIAL
        ========================= */

        if (
            comercialSeleccionado !== "Todos" &&
            comercialSeleccionado !== ""
        ) {

            url +=
                `?comercial=${comercialSeleccionado}`;

        }


        console.log(
            "Cargando KPIs:",
            url
        );


        const respuesta =
            await axios.get(url);


        console.log(
            "KPIs recibidos:",
            respuesta.data
        );


        const datos =
            respuesta.data;


        setCarteraTotal(
            Number(datos.cartera_total) || 0
        );


        setCarteraAlDia(
            Number(datos.al_dia) || 0
        );


        setCarteraSeguimiento(
            Number(datos.seguimiento) || 0
        );


        setCarteraVencida(
            Number(datos.vencida) || 0
        );


    } catch (error) {

        console.error(
            "Error cargando KPIs:",
            error
        );


        setCarteraTotal(0);

        setCarteraAlDia(0);

        setCarteraSeguimiento(0);

        setCarteraVencida(0);

    }

};
const cargarComerciales = async () => {

    try {

        const respuesta = await axios.get(
            "/api/comerciales"
        );

        setComerciales(respuesta.data);

    } catch (error) {

        console.error(
            "Error cargando comerciales:",
            error
        );

        setComerciales([]);

    }

};

/* =========================
   CARGAR COMERCIALES
========================= */

useEffect(() => {

    cargarComerciales();

}, []);


/* =========================
   CARGAR CARTERA Y KPIs
========================= */
useEffect(() => {

    cargarCartera();

    cargarKPIs();

}, [comercialSeleccionado]);

    const [nuevoAbono, setNuevoAbono] = useState({
        valor: "",
        fecha: "",
        medioPago: "",
        referencia: "",
        comentario: ""
    });

    const [abonos, setAbonos] = useState({});
    /*
        DATOS DE PRUEBA

        Los días representan la cantidad de días
        que lleva pendiente la cartera desde que
        se generó la remisión.
    */

    /* =========================
       FORMATO DE PRECIO
    ========================= */

    const formatearPrecio = (valor) => {

        return Number(valor).toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        });

    };


    /* =========================
   ESTADO SEGÚN ANTIGÜEDAD
========================= */
const obtenerEstado = (cuenta) => {

    switch (cuenta.estadoPago) {

        case "PAGADA":

            return {
                nombre: "Pagada",
                clase: "pagada"
            };


        case "AL_DIA":

            return {
                nombre: "Al día",
                clase: "al-dia"
            };


        case "SEGUIMIENTO":

            return {
                nombre: "Seguimiento",
                clase: "seguimiento"
            };


        case "VENCIDA":

            return {
                nombre: "Vencida",
                clase: "vencida"
            };


        default:

            return {
                nombre: "Sin estado",
                clase: ""
            };

    }

};

const abrirModalAbono = () => {

    setNuevoAbono({
        valor: "",
        fecha: new Date().toISOString().split("T")[0],
        medioPago: "",
        referencia: "",
        comentario: ""
    });

    setModalAbono(true);

};


const cerrarModalAbono = () => {

    setModalAbono(false);

    setNuevoAbono({
        valor: "",
        fecha: "",
        medioPago: "",
        referencia: "",
        comentario: ""
    });

    setErrorAbono("");

};

const manejarCambioAbono = (e) => {

    const { name, value } = e.target;

    setNuevoAbono((previo) => ({
        ...previo,
        [name]: value
    }));

};

const guardarAbono = async (e) => {

    e.preventDefault();

    if (!cuentaSeleccionada) {
        return;
    }


    /* =========================
       VALOR DEL ABONO
    ========================= */

    const valor =
        Number(nuevoAbono.valor);


    /* =========================
       VALIDAR VALOR
    ========================= */

    if (!valor || valor <= 0) {

        setErrorAbono(
            "Ingresa un valor de abono válido."
        );

        return;

    }


    /* =========================
       VALIDAR SALDO
    ========================= */

    if (
        valor >
        Number(cuentaSeleccionada.saldo_pendiente)
    ) {

        setErrorAbono(
            "El abono no puede ser mayor al saldo pendiente."
        );

        return;

    }


    try {

        setErrorAbono("");


        const respuesta = await fetch(
            "/api/cartera/abono",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

  body: JSON.stringify({

    id_remision:
        cuentaSeleccionada.id_remision,

    valor: valor,

    comentario:
        comentarioAbono,

    id_usuario: 1

})

            }
        );


        const datos =
            await respuesta.json();


        if (!respuesta.ok) {

            setErrorAbono(
                datos.mensaje ||
                "No se pudo registrar el abono."
            );

            return;

        }


        /* =========================
           RECARGAR ABONOS
        ========================= */

        await cargarAbonos(
            cuentaSeleccionada.id_remision
        );


        /* =========================
           ACTUALIZAR SALDO LOCAL
        ========================= */

        setCuentaSeleccionada((anterior) => ({

            ...anterior,

            saldo_pendiente:
                Number(datos.saldo_pendiente)

        }));


        /* =========================
           RECARGAR CARTERA
        ========================= */

        await cargarCartera();


        /* =========================
           CERRAR MODAL
        ========================= */

        cerrarModalAbono();


    } catch (error) {

        console.error(
            "Error registrando abono:",
            error
        );

        setErrorAbono(
            "No fue posible conectar con el servidor."
        );

    }

};

/* =========================
   FILTRADO
========================= */

const cuentasComercial = cuentas;

const cuentasFiltradas = cuentas.filter((cuenta) => {

    const estado = obtenerEstado(cuenta);

    const coincideFiltro =
        filtro === "Todos" ||
        estado.nombre === filtro;

    const texto =
        `${cuenta.cliente} ${cuenta.documento} ${cuenta.numero_remision}`
            .toLowerCase();

    const coincideBusqueda =
        texto.includes(
            busqueda.toLowerCase()
        );

    return coincideFiltro && coincideBusqueda;

});


/* CANTIDAD DE CUENTAS PAGADAS */

const cuentasPagadas = cuentas
    .filter(
        cuenta =>
            cuenta.estadoPago === "PAGADA"
    )
    .length;

    const abrirDetalleCuenta = async (cuenta) => {

    setCuentaSeleccionada(cuenta);

    try {

        const respuestaProductos = await fetch(
    `/api/cartera/${cuenta.id_remision}/productos`
);

        if (!respuestaProductos.ok) {

            throw new Error(
                "No se pudieron cargar los productos."
            );

        }

        const datosProductos =
            await respuestaProductos.json();

        setProductosRemision(
            datosProductos
        );


        await cargarAbonos(
            cuenta.id_remision
        );

    } catch (error) {

        console.error(
            "Error cargando detalle:",
            error
        );

        setProductosRemision([]);

    }

};

    return (

        <div className="cartera-page">


            {/* =========================
                ENCABEZADO
            ========================= */}

            <div className="cartera-header">

                <div>

                    <span className="cartera-tag">
                        CARTERA
                    </span>

                    <h1>
                        Gestión de cartera
                    </h1>

                    <p>
                        Consulta y administra las cuentas pendientes
                        de los clientes.
                    </p>

                </div>

            </div>

{/* =========================
    FILTRO COMERCIAL
========================= */}

<div className="cartera-comercial-filtro">

    <div className="comercial-filtro-label">

        <span>
            Comercial
        </span>

        <small>
            Selecciona el comercial para consultar su cartera.
        </small>

    </div>


    <select
    value={comercialSeleccionado}
    onChange={(e) =>
        setComercialSeleccionado(e.target.value)
    }
>

    <option value="Todos">
        Todos los comerciales
    </option>

    {comerciales.map((comercial) => (

        <option
            key={comercial.id_comercial}
            value={comercial.id_comercial}
        >
            {comercial.nombre}
        </option>

    ))}

</select>

</div>

            {/* =========================
                KPIS
            ========================= */}

            <div className="cartera-kpis">


                <div className="cartera-kpi">

                    <div className="cartera-kpi-icon total">

                        <WalletCards size={21} />

                    </div>

                    <div>

                        <span>
                            Cartera total
                        </span>

                        <strong>
                            {formatearPrecio(carteraTotal)}
                        </strong>

                    </div>

                </div>


                <div className="cartera-kpi">

                    <div className="cartera-kpi-icon al-dia">

                        <CircleCheck size={21} />

                    </div>

                    <div>

                        <span>
                            0–30 días
                        </span>

                        <strong>
                            {formatearPrecio(carteraAlDia)}
                        </strong>

                    </div>

                </div>


                <div className="cartera-kpi">

                    <div className="cartera-kpi-icon seguimiento">

                        <Clock3 size={21} />

                    </div>

                    <div>

                        <span>
                            31–45 días
                        </span>

                        <strong>
                            {formatearPrecio(carteraSeguimiento)}
                        </strong>

                    </div>

                </div>


                <div className="cartera-kpi">

                    <div className="cartera-kpi-icon vencida">

                        <AlertCircle size={21} />

                    </div>

                    <div>

                        <span>
                            46+ días
                        </span>

                        <strong>
                            {formatearPrecio(carteraVencida)}
                        </strong>

                    </div>

                </div>

            </div>


            {/* =========================
                TABLA
            ========================= */}

            <div className="cartera-card">


                {/* TOOLBAR */}

                <div className="cartera-toolbar">


                    <div className="cartera-search">

                        <Search size={17} />

                        <input
                            type="text"
                            placeholder="Buscar cliente, documento o remisión..."
                            value={busqueda}
                            onChange={(e) =>
                                setBusqueda(e.target.value)
                            }
                        />

                    </div>


                    <div className="cartera-filtros">

                        {[
                            "Todos",
                            "Al día",
                            "Seguimiento",
                            "Vencida",
                        ].map((opcion) => (

                            <button
                                key={opcion}
                                className={
                                    filtro === opcion
                                        ? "filtro-activo"
                                        : ""
                                }
                                onClick={() =>
                                    setFiltro(opcion)
                                }
                            >

                                {opcion}

                            </button>

                        ))}

                    </div>

                </div>


                {/* TABLA */}

                <div className="cartera-table-wrapper">

                    <table className="cartera-table">

                        <thead>

                            <tr>

                                <th>
                                    CLIENTE
                                </th>

                                <th>
                                    REMISIÓN
                                </th>

                                <th>
                                    FECHA REMISIÓN
                                </th>

                                <th>
                                    DÍAS
                                </th>

                                <th>
                                    SALDO PENDIENTE
                                </th>

                                <th>
                                    ABONOS
                                </th>

                                <th>
                                    ESTADO
                                </th>

                                 <th>
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {cuentasFiltradas.map((cuenta) => {

                                const estado =
                                    obtenerEstado(cuenta);

                               return (

   <tr
    key={cuenta.id_remision}
    className={
        Number(cuenta.id_remision) === Number(remisionDestacada)
            ? "remision-destacada"
            : ""
    }
>


                                        {/* CLIENTE */}

                                        <td>

                                            <div className="cliente-cartera">

                                                <strong>
                                                    {cuenta.cliente}
                                                </strong>

                                                <span>
                                                    {cuenta.documento}
                                                </span>

                                            </div>

                                        </td>


                                        {/* REMISIÓN */}

                                        <td>

                                            <span className="remision-cartera">

                                               {cuenta.numero_remision}

                                            </span>

                                        </td>


                                        {/* FECHA */}

                                        <td>

                                            <span className="fecha-cartera">

                                                {cuenta.fechaRemision}

                                            </span>

                                        </td>


                                        {/* DÍAS */}

                                        <td>

                                            {cuenta.estadoPago === "Pagada" ? (

                                                <span className="dias-pagada">

                                                    Pagada

                                                </span>

                                            ) : (

                                                <span
                                                    className={`dias-cartera ${estado.clase}`}
                                                >

                                                    {cuenta.dias}{" "}
                                                    {cuenta.dias === 1
                                                        ? "día"
                                                        : "días"}

                                                </span>

                                            )}

                                        </td>


                                      {/* SALDO PENDIENTE */}

<td>

    <strong className="valor-cartera">

        {formatearPrecio(
            cuenta.saldo_pendiente
        )}

    </strong>

</td>
{/* ABONOS */}

<td>

    {cuenta.cantidad_abonos > 0 ? (

        <div className="abonos-info">

            <strong className="abonos-valor">

                {formatearPrecio(
                    cuenta.total_abonado
                )}

            </strong>

            <span className="abonos-cantidad">

                {cuenta.cantidad_abonos === 1
                    ? "1 abono registrado"
                    : `${cuenta.cantidad_abonos} abonos registrados`}

            </span>

        </div>

    ) : (

        <span className="sin-abonos">

            Sin abonos

        </span>

    )}

</td>
                                        {/* ESTADO */}

                                        <td>

                                            <span
                                                className={`estado-cartera ${estado.clase}`}
                                            >

                                                {estado.nombre}

                                            </span>

                                        </td>


                                        {/* ACCIÓN */}

                                        <td>

                                        <button
    className="btn-ver-cartera"
    title="Ver detalle"
    onClick={() => abrirDetalleCuenta(cuenta)}
>
    <Eye size={16} />
</button>
                                        </td>

                                    </tr>

                                );

                            })}


                            {cuentasFiltradas.length === 0 && (

                                <tr>

                                    <td
                                        colSpan="7"
                                        className="cartera-vacia"
                                    >

                                        No se encontraron cuentas.

                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>


                {/* FOOTER */}

                <div className="cartera-footer">

                    <span>
                        Mostrando {cuentasFiltradas.length} cuentas
                    </span>

                    <button>

                        Ver más

                        <ChevronDown size={15} />

                    </button>

                </div>

            </div>

            {/* =========================
                MODAL DETALLE CARTERA
            ========================= */}

            {cuentaSeleccionada && (

                <div className="modal-overlay-cartera">

                    <div className="modal-detalle-cartera">

                        {/* HEADER */}

                        <div className="detalle-header">

                            <div>

                                <span className="detalle-tag">
                                    CARTERA
                                </span>

                                <h2>
                                    Detalle de cuenta
                                </h2>

                            </div>

                            <button
                                className="detalle-cerrar"
                                onClick={() =>
                                    setCuentaSeleccionada(null)
                                }
                            >
                                ✕
                            </button>

                        </div>

{modalAbono && cuentaSeleccionada && (

    <div className="modal-overlay-abono">

        <div className="modal-abono">

            <div className="abono-header">

                <div>

                    <span>
                        CARTERA
                    </span>

                    <h2>
                        Registrar abono
                    </h2>

                </div>

                <button
                    type="button"
                    onClick={cerrarModalAbono}
                    className="abono-cerrar"
                >
                    ✕
                </button>

            </div>


            <form
                className="abono-form"
                onSubmit={guardarAbono}
            >

                <div className="abono-cliente">

                    <span>
                        CLIENTE
                    </span>

                    <strong>
                        {cuentaSeleccionada.cliente}
                    </strong>

                    <small>
                        {cuentaSeleccionada.numero_remision}
                    </small>

                </div>


                {/* SALDO REAL */}

                <div className="abono-saldo">

                    <span>
                        Saldo pendiente
                    </span>

                <strong>
    {formatearPrecio(
        cuentaSeleccionada.saldo_pendiente
    )}
</strong>

                </div>


             {/* VALOR */}

<div className="abono-grupo">

    <label>
        Valor del abono *
    </label>

    <input
        type="number"
        name="valor"
        min="1"
        max={cuentaSeleccionada.saldo_pendiente}
        value={nuevoAbono.valor}
        onChange={manejarCambioAbono}
        placeholder="Ej. 500000"
        required
    />

</div>
                {/* COMENTARIO */}

                <div className="abono-grupo">

                    <label>
                        Comentario
                    </label>

                   <textarea
    value={comentarioAbono}
    onChange={(e) => {
        setComentarioAbono(e.target.value);
    }}
    placeholder="Ej. Pago parcial, transferencia, observaciones..."
/>

                </div>


                {/* ERROR */}

                {errorAbono && (

                    <div className="alerta-abono-error">

                        {errorAbono}

                    </div>

                )}


                <div className="abono-acciones">

                    <button
                        type="button"
                        onClick={cerrarModalAbono}
                        className="btn-cancelar-abono"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="btn-guardar-abono"
                    >
                        Guardar abono
                    </button>

                </div>

            </form>

        </div>

    </div>

)}


                        {/* INFORMACIÓN DEL CLIENTE */}

                        <div className="detalle-contenido">

                            <div className="detalle-cliente">

                                <div>

                                    <span className="detalle-label">
                                        CLIENTE
                                    </span>

                                    <h3>
                                        {cuentaSeleccionada.cliente}
                                    </h3>

                                    <p>
                                        NIT {cuentaSeleccionada.documento}
                                    </p>

                                </div>

                                <span
                                    className={`estado-cartera ${obtenerEstado(cuentaSeleccionada).clase}`}
                                >
                                    {obtenerEstado(cuentaSeleccionada).nombre}
                                </span>

                            </div>


                            {/* DATOS DE LA REMISIÓN */}

                            <div className="detalle-datos">

                                <div>

                                    <span>
                                        Remisión
                                    </span>

                                    <strong>
    {cuentaSeleccionada.numero_remision}
</strong>

                                </div>

                                <div>

                                    <span>
                                        Fecha
                                    </span>

                                    <strong>
                                        {cuentaSeleccionada.fechaRemision}
                                    </strong>

                                </div>

                                <div>

                                    <span>
                                        Comercial
                                    </span>

                                    <strong>
                                        {cuentaSeleccionada.comercial}
                                    </strong>

                                </div>

                                <div>

                                    <span>
                                        Días
                                    </span>

                                    <strong>
                                        {cuentaSeleccionada.dias} días
                                    </strong>

                                </div>

                            </div>


{/* =========================
    RESUMEN
========================= */}

<div className="detalle-resumen">


    {/* VALOR TOTAL DE LA REMISIÓN */}

    <div>

        <span>
            Valor de la remisión
        </span>

        <strong>

            {formatearPrecio(
                Number(
                    cuentaSeleccionada.valor || 0
                )
            )}

        </strong>

    </div>


 {/* TOTAL ABONADO */}

<div>

    <span>
        Abonado
    </span>

    <strong>

        {formatearPrecio(
            Number(
                cuentaSeleccionada.total_abonado || 0
            )
        )}

    </strong>

</div>


    {/* SALDO PENDIENTE */}

    <div className="saldo-pendiente">

        <span>
            Saldo pendiente
        </span>

        <strong>

            {formatearPrecio(

                Number(
                    cuentaSeleccionada.valor || 0
                )

                -

                (abonos[
                    cuentaSeleccionada.id_remision
                ] || [])

                    .reduce(
                        (total, pago) => {

                            return (
                                total +
                                Number(
                                    pago.valor || 0
                                )
                            );

                        },
                        0
                    )

            )}

        </strong>

    </div>


</div>

                            {/* PRODUCTOS */}

                            <div className="detalle-seccion">

                                <h3>
                                    Productos de la remisión
                                </h3>

<div className="productos-detalle">

    {productosRemision.length === 0 ? (

        <div className="sin-productos">

            No hay productos registrados para esta remisión.

        </div>

    ) : (

        productosRemision.map((producto) => (

            <div
                className="producto-detalle"
                key={producto.id_detalle}
            >

                <div className="producto-detalle-info">

                    <div className="producto-detalle-nombre">

                        <strong>
                            {producto.nombre}
                        </strong>

                        {producto.linea && (

                            <span className="producto-linea">

                                {producto.linea}

                            </span>

                        )}

                    </div>


                    <div className="producto-detalle-datos">

                        <span>

                            <b>Código:</b>{" "}
                            {producto.codigo || "-"}

                        </span>


                        {producto.placa && (

                            <span>

                                <b>Placa:</b>{" "}
                                {producto.placa}

                            </span>

                        )}


                        <span>

                            <b>Cantidad:</b>{" "}
                            {Number(producto.cantidad)}

                        </span>

                    </div>

                </div>


                <div className="producto-detalle-precio">

                    <span>
                        Total
                    </span>

                    <strong>

                        {formatearPrecio(producto.total)}

                    </strong>

                </div>

            </div>

        ))

    )}

</div>
                            </div>


                            {/* PAGOS */}

                            <div className="detalle-seccion">

                                <div className="detalle-seccion-header">

                                    <div>

                                        <h3>
                                            Historial de pagos
                                        </h3>

                                        <span>
                                            Abonos registrados para esta cuenta.
                                        </span>

                                    </div>

                                    <button
    className="btn-registrar-abono"
    onClick={abrirModalAbono}
>
    + Registrar abono
</button>

                                </div>


                              <div className="historial-pagos">

    {(abonos[cuentaSeleccionada.id_remision] || []).length === 0 ? (

        <div className="sin-pagos">

            Aún no hay pagos registrados.

        </div>

    ) : (

        abonos[cuentaSeleccionada.id_remision].map((pago) => (

            <div
                className="pago-item"
                key={pago.id_abono}
            >

                <div>

                    <strong>
                        {formatearPrecio(pago.valor)}
                    </strong>

                    <span>
                        {new Date(
                            pago.fecha
                        ).toLocaleDateString("es-CO")}
                    </span>

                </div>


                <div className="pago-info">

                    {pago.comentario && (

                        <small>
                            {pago.comentario}
                        </small>

                    )}

                </div>

            </div>

        ))

    )}

</div>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}

export default Cartera;