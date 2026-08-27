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
            .includes(texto)

        ||

        String(remision.cliente || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(texto)

        ||

        String(remision.codigo_producto || "")
            .toLowerCase()
            .includes(texto)

        ||

        String(remision.nombre_producto || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(texto)

        ||

        String(remision.linea_producto || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(texto)

        ||

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


            const url =
                `/api/remisiones?mes=${periodo.mes}&anio=${periodo.anio}`;


            console.log("Cargando:", url);


            const respuesta = await fetch(
                url,
                {
                    signal: controlador.signal
                }
            );


            if (!respuesta.ok) {

                throw new Error(
                    "No se pudieron cargar las remisiones."
                );

            }


            const datos = await respuesta.json();

            console.log(
    "REMISIONES CON W.O.:",
    datos.filter(
        (remision) =>
            Number(remision.wo_bodega_auxiliar) === 1
    )
);
          if (!controlador.signal.aborted) {

    setRemisiones(datos);

    // Obtener las remisiones que ya estaban
    // registradas en World Office
    const remisionesYaWO = [
        ...new Set(
            datos
                .filter(
                    (remision) =>
                        Number(remision.wo_bodega_auxiliar) === 1
                )
                .map(
                    (remision) => remision.id_remision
                )
        )
    ];

    setRemisionesWO(remisionesYaWO);

}

        } catch (error) {

            if (error.name !== "AbortError") {

                console.error(
                    "Error cargando remisiones:",
                    error
                );

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

        setErrorCodigoWO(
            "Ingresa el código de World Office para continuar."
        );

        setErrorPasswordWO("");

        return;

    }


    /* =========================
       VALIDAR CONTRASEÑA
    ========================= */

    if (!passwordWO.trim()) {

        setErrorPasswordWO(
            "Ingresa tu contraseña para continuar."
        );

        setErrorCodigoWO("");

        return;

    }


    try {

        const respuesta = await fetch(
            "/api/remisiones/world-office",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

    id_remisiones:
        remisionesSeleccionadas,

    codigo_world_office:
        codigoWO.trim(),

    id_usuario:
        usuarioActual.id_usuario,

    password:
        passwordWO

})

            }
        );


        const datos = await respuesta.json();


        /* =========================
           ERROR DEL BACKEND
        ========================= */

        if (!respuesta.ok) {

            setErrorPasswordWO(
                datos.mensaje ||
                "No se pudo confirmar el movimiento."
            );

            return;

        }


        /* =========================
           ÉXITO
        ========================= */

        setCodigosWO((anteriores) => {

            const nuevos = {
                ...anteriores
            };

            remisionesSeleccionadas.forEach((id) => {

                nuevos[id] =
                    codigoWO.trim();

            });

            return nuevos;

        });


        setRemisionesWO((anteriores) => [

            ...anteriores,
            ...remisionesSeleccionadas

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

        console.error(
            "Error confirmando World Office:",
            error
        );

        setErrorPasswordWO(
            "No fue posible conectar con el servidor."
        );

    }

};

const seleccionarRemisionWO = (id) => {

    setRemisionesSeleccionadas((actuales) => {

        if (actuales.includes(id)) {

            return actuales.filter(
                (remisionId) => remisionId !== id
            );

        }

        return [...actuales, id];

    });

};



    return (

        <div className="remisiones-page">

            <div className="page-header">

                <div>

                    <span className="page-tag">
                        REMISIONES
                    </span>

                    <h1>
                        Gestión de remisiones
                    </h1>

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

        <button
            type="button"
            onClick={abrirConfirmacionWO}
        >
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

</div>
{remisionesFiltradas.length === 0 ? (

    <div className="remisiones-vacio">

        {busqueda
            ? "No encontramos remisiones con esa búsqueda."
            : "No hay remisiones registradas en este mes."
        }

    </div>

) : (() => {

    let ultimaRemision = null;
    let grupoColor = false;

    return remisionesFiltradas.map((remision) => {

        const esPrimeraFilaRemision =
            ultimaRemision !== remision.numero_remision;

        if (
            ultimaRemision !== null &&
            esPrimeraFilaRemision
        ) {
            grupoColor = !grupoColor;
        }

        ultimaRemision = remision.numero_remision;


    const yaEstaEnWO =
        remisionesWO.includes(remision.id_remision);

        return (

            <div
                className={`tabla-row
                    ${
                        grupoColor
                            ? "remision-grupo-alterno"
                            : "remision-grupo-normal"
                    }
                    ${
                        esPrimeraFilaRemision
                            ? "nueva-remision"
                            : ""
                    }
                `}
                key={remision.id_detalle}
            >

                <span>
                    {remision.numero_remision}
                </span>

                <span>
                    {new Date(remision.fecha).toLocaleDateString("es-CO")}
                </span>

                <span>
                    {remision.codigo_producto}
                </span>

                <span>
                    {remision.nombre_producto}
                </span>

                <span>
                    {remision.linea_producto}
                </span>

                <span>
                    {remision.placa || "-"}
                </span>

                <span>
                    ${Number(remision.precio_lista).toLocaleString("es-CO")}
                </span>

                <span className="cantidad-remision">
    {Number(remision.cantidad).toLocaleString("es-CO", {
        maximumFractionDigits: 0
    })}
</span>

                <span>
                    ${Number(remision.precio_venta).toLocaleString("es-CO")}
                </span>

                <strong className="total-remision">

                    {esPrimeraFilaRemision
                        ? `$${Number(remision.total).toLocaleString("es-CO")}`
                        : ""
                    }

                </strong>

                <span>
                    {remision.cliente}
                </span>

                <span>
                    {remision.medio_pago}
                </span>

                <span>
                    {remision.comercial}
                </span>

<span>
    {remision.observaciones || "-"}
</span>

                <span
    className={`cartera ${
        Number(remision.saldo_pendiente) > 0
            ? "pendiente"
            : "pagada"
    }`}
>
    {Number(remision.saldo_pendiente) > 0
        ? "Pendiente"
        : "Pagada"
    }
</span>

   <div className="wo-tooltip-container">

    <button
        type="button"
        className={`wo-checkbox ${
            yaEstaEnWO ? "marcado" : ""
        } ${
            remisionesSeleccionadas.includes(remision.id_remision)
                ? "seleccionado"
                : ""
        }`}
        disabled={
            usuarioActual.rol !== "ADMINISTRADOR" ||
            yaEstaEnWO
        }
        onClick={() => {

            seleccionarRemisionWO(
                remision.id_remision
            );

        }}
    >
        {yaEstaEnWO
            ? "✓"
            : remisionesSeleccionadas.includes(remision.id_remision)
                ? "✓"
                : "☐"
        }
    </button>

    {yaEstaEnWO && (
    <span className="wo-tooltip">
        {remision.codigo_world_office}
    </span>
)}

</div>

            </div>

        );

    });

})()}

{/* =========================
    MODAL WORLD OFFICE
========================= */}

{modalWO && (

    <div className="modal-overlay-wo">

        <div className="modal-wo">

            <div className="modal-wo-header">

                <div>

                    <span className="modal-wo-tag">
                        WORLD OFFICE
                    </span>

                    <h2>
                        Confirmar movimiento
                    </h2>

                    <p>
                        Vas a registrar que estas remisiones
                        ya fueron pasadas a World Office.
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

        <strong>
            {remisionesSeleccionadas.length}
        </strong>

        <span>
            {remisionesSeleccionadas.length === 1
                ? "remisión seleccionada"
                : "remisiones seleccionadas"
            }
        </span>

    </div>

    <div className="wo-remisiones-lista">

        {[
            ...new Set(
                remisiones
                    .filter((remision) =>
                        remisionesSeleccionadas.includes(
                            remision.id_remision
                        )
                    )
                    .map(
                        (remision) =>
                            remision.numero_remision
                    )
            )
        ].join(", ")}

    </div>

</div>
<label className="label-wo">
    Código World Office
</label>

<input
    type="text"
    value={codigoWO}
    onChange={(e) => {

        setCodigoWO(e.target.value);

        setErrorCodigoWO("");

    }}
    placeholder="Ej. SA 70 - EA 71"   
    className={`input-wo ${
        errorCodigoWO ? "input-wo-error" : ""
    }`}
/>

{errorCodigoWO && (

    <div className="alerta-wo-error">

        <span>!</span>

        <p>
            {errorCodigoWO}
        </p>

    </div>

)}


<label>
    Contraseña
</label>

<input
    type="password"
    value={passwordWO}
    onChange={(e) => {

        setPasswordWO(e.target.value);

        setErrorPasswordWO("");

    }}
    placeholder="Ingresa tu contraseña"
    className={
        errorPasswordWO
            ? "input-password-error"
            : ""
    }
/>

{errorPasswordWO && (

    <div className="alerta-password-wo">

        <span>!</span>

        <p>
            {errorPasswordWO}
        </p>

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
 </div>
</div>

)}
export default Remisiones;
