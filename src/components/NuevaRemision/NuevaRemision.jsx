import "./NuevaRemision.css";
import { useEffect, useState } from "react";
import BuscarCliente from "../BuscarCliente/BuscarCliente";
import Alerta from "../Alerta/Alerta";

function NuevaRemision({ abierto, cerrar }) {

    const [modalCliente, setModalCliente] = useState(false);
    const [comentarios, setComentarios] = useState("");
    const [alerta, setAlerta] = useState({
    visible: false,
    tipo: "exito",
    titulo: "",
    mensaje: ""
    });

    const mostrarAlerta = (tipo, titulo, mensaje) => {

    setAlerta({
        visible: true,
        tipo,
        titulo,
        mensaje
    });

};

const cerrarAlerta = () => {

    setAlerta(prev => ({
        ...prev,
        visible: false
    }));

};
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

    const [comercial, setComercial] = useState("");
    const [comerciales, setComerciales] = useState([]);
    const [medioPago, setMedioPago] = useState("");

    const buscarProductoPorCodigo = async (id, codigo) => {

    if (!codigo.trim()) return;

    try {

        const respuesta = await fetch(
            `/api/productos/codigo/${encodeURIComponent(codigo)}`
        );

        if (!respuesta.ok) {
            throw new Error("Producto no encontrado");
        }

        const productoEncontrado = await respuesta.json();

        setProductos(prev =>
            prev.map(producto =>
                producto.id === id
                    ? {
                        ...producto,
                        codigo: productoEncontrado.codigo,
                        nombre: productoEncontrado.nombre,
                        linea: productoEncontrado.linea,
                        precioLista: productoEncontrado.precio_lista,
                        precioVenta: productoEncontrado.precio_lista
                    }
                    : producto
            )
        );

    } catch (error) {

        console.error("Error buscando producto:", error);

    }

};

const buscarProductos = async (id, texto, tipo) => {

    // Primero actualizamos lo que la persona está escribiendo
    actualizarProducto(
        id,
        tipo === "codigo" ? "codigo" : "nombre",
        texto
    );

    // Si borró el texto, quitamos sugerencias
    if (!texto.trim()) {

        setSugerenciasProducto(prev => ({
            ...prev,
            [id]: []
        }));

        return;
    }

    try {

        const endpoint =
            tipo === "codigo"
                ? "buscar-codigo"
                : "buscar-nombre";

        const respuesta = await fetch(
            `/api/productos/${endpoint}/${encodeURIComponent(texto)}`
        );

        if (!respuesta.ok) {
            throw new Error("No se pudieron buscar los productos.");
        }

        const datos = await respuesta.json();

        setSugerenciasProducto(prev => ({
            ...prev,
            [id]: datos
        }));

    } catch (error) {

        console.error("Error buscando productos:", error);

        setSugerenciasProducto(prev => ({
            ...prev,
            [id]: []
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
        precioVenta: ""
    });

    const [productos, setProductos] = useState([
        crearProductoVacio()
    ]);
    const [sugerenciasProducto, setSugerenciasProducto] = useState({});
    const [sugerenciasCodigo, setSugerenciasCodigo] = useState({});

    const agregarProducto = () => {
        setProductos(prev => [
            ...prev,
            crearProductoVacio()
        ]);
    };

    const eliminarProducto = (id) => {

        if (productos.length === 1) return;

        setProductos(prev =>
            prev.filter(producto => producto.id !== id)
        );
    };

    const actualizarProducto = (id, campo, valor) => {

        setProductos(prev =>
            prev.map(producto =>
                producto.id === id
                    ? {
                        ...producto,
                        [campo]: valor
                    }
                    : producto
            )
        );
    };

    const buscarCodigo = async (id, texto) => {

    actualizarProducto(id, "codigo", texto);

    if (!texto.trim()) {

        setSugerenciasCodigo(prev => ({
            ...prev,
            [id]: []
        }));

        return;
    }

    try {

        const respuesta = await fetch(
            `/api/productos/buscar-codigo/${encodeURIComponent(texto)}`
        );

        if (!respuesta.ok) {
            throw new Error("Error buscando productos");
        }

        const datos = await respuesta.json();

        setSugerenciasCodigo(prev => ({
            ...prev,
            [id]: datos
        }));

    } catch (error) {

        console.error(
            "Error buscando códigos:",
            error
        );

        setSugerenciasCodigo(prev => ({
            ...prev,
            [id]: []
        }));

    }

};

const seleccionarProducto = (id, productoEncontrado) => {

    setProductos(prev =>
        prev.map(producto =>
            producto.id === id
                ? {
                    ...producto,

                    codigo: productoEncontrado.codigo,
                    nombre: productoEncontrado.nombre,
                    linea: productoEncontrado.linea,
                    precioLista: productoEncontrado.precio_lista,
                    precioVenta: productoEncontrado.precio_lista
                }
                : producto
        )
    );

    // Cerrar las sugerencias
    setSugerenciasProducto(prev => ({
        ...prev,
        [id]: []
    }));
};

    const calcularTotalProducto = (producto) => {

        const precio = Number(producto.precioVenta) || 0;
        const cantidad = Number(producto.cantidad) || 0;

        return precio * cantidad;
    };

    const totalRemision = productos.reduce(
        (total, producto) =>
            total + calcularTotalProducto(producto),
        0
    );

    const formatearPrecio = (valor) => {

        return Number(valor || 0).toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        });
    };

    const limpiarFormulario = () => {

    setProductos([
        crearProductoVacio()
    ]);

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
        mensaje: ""
    });
};

const cerrarRemision = () => {

    limpiarFormulario();

    cerrar();

};

const guardarRemision = () => {

    // ================================
    // VALIDAR COMERCIAL
    // ================================

    if (!comercial) {

        mostrarAlerta(
    "advertencia",
    "Información incompleta",
    "Selecciona un comercial antes de guardar la remisión."
);

        return;

    }


    // ================================
    // VALIDAR MEDIO DE PAGO
    // ================================

    if (!medioPago) {

        mostrarAlerta(
    "advertencia",
    "Información incompleta",
    "Selecciona un medio de pago antes de guardar la remisión."
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
    "Selecciona un cliente antes de guardar la remisión."
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
    "Agrega al menos un producto a la remisión."
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
            "Completa el código de todos los productos."
        );

        return;

    }

    if (!producto.nombre.trim()) {

        mostrarAlerta(
            "advertencia",
            "Producto incompleto",
            "Completa el nombre de todos los productos."
        );

        return;

    }

    if (!producto.precioVenta) {

        mostrarAlerta(
            "advertencia",
            "Producto incompleto",
            "Completa el precio de venta de todos los productos."
        );

        return;

    }

    if (Number(producto.cantidad) <= 0) {

        mostrarAlerta(
            "advertencia",
            "Cantidad inválida",
            "La cantidad debe ser mayor a cero."
        );

        return;

    }
}
    // ================================
    // SI TODO ESTÁ CORRECTO
    // ================================

   mostrarAlerta(
    "exito",
    "Remisión guardada",
    "REM-000251 fue registrada correctamente."
);

limpiarFormulario();
};

const seleccionarCliente = (cliente, clienteNuevo = false) => {

    setClienteSeleccionado(cliente);

    setModalCliente(false);

    if (clienteNuevo) {
        mostrarAlerta(
            "exito",
            "Cliente creado correctamente",
            "El cliente fue registrado y seleccionado para esta remisión."
        );
    }

};

useEffect(() => {

    const cargarComerciales = async () => {

        try {

            const respuesta = await fetch(
                "/api/comerciales"
            );

            if (!respuesta.ok) {

                throw new Error(
                    "No se pudieron cargar los comerciales."
                );

            }

            const datos = await respuesta.json();

            setComerciales(datos);

        } catch (error) {

            console.error(
                "Error cargando comerciales:",
                error
            );

        }

    };

    cargarComerciales();

}, []);



    if (!abierto) return null;
    return (

        <div className="modal-overlay">

            <div className="modal-remision">

                {/* ENCABEZADO */}

                <div className="modal-header">

                    <div>

                        <span className="modal-tag">
                            REMISIÓN
                        </span>

                        <h3>Nueva Remisión</h3>

                    </div>

                    <button
                        className="btn-cerrar"
                        onClick={cerrarRemision}
                    >
                        ✕
                    </button>

                          </div>

                <div className="modal-body">

                {/* INFORMACIÓN GENERAL */}

                <div className="section-card">

                    <div className="section-title">

                        <h3>Información general</h3>

                        <span>
                            Complete los datos principales de la remisión.
                        </span>

                    </div>

                    <div className="form-grid">

                        <div className="form-group">

                            <label>No. Remisión</label>

                            <input
                                type="text"
                                value="REM-000251"
                                readOnly
                            />

                        </div>


                        <div className="form-group">

                            <label>Fecha</label>

                            <input
                                type="text"
                                value="06/08/2026"
                                readOnly
                            />

                        </div>


                        <div className="form-group">

                            <label>Comercial *</label>

                          <select
    value={comercial}
    onChange={(e) => setComercial(e.target.value)}
>

    <option value="">
        Seleccione un comercial
    </option>

    {comerciales.map((item) => (

        <option
            key={item.id_comercial}
            value={item.id_comercial}
        >
            {item.nombre}
        </option>

    ))}

</select>
                        </div>


                        <div className="form-group">

                            <label>Medio de pago *</label>

                           <select
                                value={medioPago}
                                onChange={(e) => setMedioPago(e.target.value)}
                            >

                                <option value="">
                                    Seleccione un medio de pago
                                </option>

                                <option value="T.Crédito">
                                    T. Crédito
                                </option>

                                <option value="T.Débito">
                                    T. Débito
                                </option>

                                <option value="Transferencia">
                                    Transferencia
                                </option>

                                <option value="Efectivo">
                                    Efectivo
                                </option>

                                <option value="Dólares">
                                    Dólares
                                </option>

                                <option value="Pendiente">
                                    Pendiente
                                </option>

                            </select>

                        </div>


                        <div className="cliente-section">

                            <label>Cliente *</label>

                            <div
    className="cliente-input"
    onClick={() => setModalCliente(true)}
>

    <span className="search-icon">
        🔍
    </span>

    {clienteSeleccionado ? (

    <div className="cliente-seleccionado">

        <strong>
            {clienteSeleccionado.nombre}
        </strong>

        <span>
            📍 {clienteSeleccionado.direccion}
        </span>

        <span>
            📞 {clienteSeleccionado.telefono}
        </span>

    </div>

) : (

        <span className="placeholder">
            Haga clic para seleccionar un cliente
        </span>

    )}

</div>
                        </div>

                    </div>

                </div>


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

            <div
                className="producto-row"
                key={producto.id}
            >

            <div className="producto-codigo-buscador">

    <input
        type="text"
        placeholder="Código"
        value={producto.codigo}
        onChange={(e) =>
            buscarCodigo(
                producto.id,
                e.target.value
            )
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
                                productoEncontrado
                            )
                        }
                    >

                        <strong>
                            {productoEncontrado.codigo}
                        </strong>

                        <span>
                            {productoEncontrado.nombre}
                        </span>

                    </div>

                )
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
            buscarProductos(
                producto.id,
                e.target.value,
                "nombre"
            )
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
                                productoEncontrado
                            )
                        }
                    >
                        <strong>
                            {productoEncontrado.codigo}
                        </strong>

                        <span>
                            {productoEncontrado.nombre}
                        </span>
                    </div>

                )
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
                    placeholder="Placa"
                    value={producto.placa}
                    onChange={(e) =>
                        actualizarProducto(
                            producto.id,
                            "placa",
                            e.target.value
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
                            e.target.value
                        )
                    }
                />


               <input
    type="text"
    inputMode="numeric"
    placeholder="0"
    value={
        producto.precioVenta
            ? Number(producto.precioVenta).toLocaleString("es-CO", {
                  maximumFractionDigits: 0
              })
            : ""
    }
    onChange={(e) => {

        const valor = e.target.value.replace(/\D/g, "");

        actualizarProducto(
            producto.id,
            "precioVenta",
            valor
        );

    }}
/>


                <span className="producto-total">

                    {formatearPrecio(
                        calcularTotalProducto(producto)
                    )}

                </span>


                <button
                    type="button"
                    className="btn-eliminar-producto"
                    onClick={() =>
                        eliminarProducto(producto.id)
                    }
                    disabled={productos.length === 1}
                >
                    🗑️
                </button>

            </div>

        ))}

    </div>


    {/* TOTAL */}

    <div className="total-remision">

        <span>Total remisión</span>

        <strong>
            {formatearPrecio(totalRemision)}
        </strong>

    </div>

</div>


{/* COMENTARIOS */}

<div className="section-card comentarios-remision">

    <div className="section-title">

        <h3>Comentarios</h3>

        <span>
            Agrega observaciones importantes de la remisión.
        </span>

    </div>


                     <textarea
                        value={comentarios}
                        onChange={(e) =>
                            setComentarios(e.target.value)
                        }
                        placeholder="Ej. Cliente solicita entrega el viernes..."
                    />

                </div>

                </div>

                <div className="remision-footer">

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
       

    );

}
export default NuevaRemision;