import express from "express";
import cors from "cors";
import db from "./db.js";
import bcrypt from "bcrypt";
import ExcelJS from "exceljs";

const app = express();

const PORT = process.env.PORT || 3001;


/* =========================
   MIDDLEWARES
========================= */

app.use(cors());

app.use(express.json());

app.use((req, res, next) => {

    if (req.url.startsWith("/api/")) {

        req.url = req.url.replace(/^\/api/, "");

    }

    next();

});
/* =========================
   RUTA PRINCIPAL
========================= */

app.get("/", (req, res) => {

    res.json({
        mensaje: "SIREM Backend funcionando"
    });

});


/* =========================
   PRUEBA DEL SERVIDOR
========================= */

app.get("/prueba", (req, res) => {

    res.json({
        mensaje: "Servidor SIREM funcionando correctamente"
    });

});

/* =========================
   PRUEBA DE MYSQL
========================= */

app.get("/prueba-db", async (req, res) => {

    try {

        const [resultado] = await db.query(
            "SELECT 1 AS conectado"
        );

        res.json({
            mensaje: "Conexión con MySQL exitosa",
            resultado
        });

    } catch (error) {

        console.error("Error de conexión:", error);

        res.status(500).json({
            mensaje: "Error conectando con MySQL",
            error: error.message
        });

    }

});

/* =========================
   REMISIONES
========================= */
app.get("/remisiones", async (req, res) => {

    const { mes, anio } = req.query;

    if (!mes || !anio) {

        return res.status(400).json({

            mensaje: "Debes indicar mes y año."

        });

    }

    try {

        const [remisiones] = await db.query(`

            SELECT

                r.id_remision,
                r.numero_remision,
                r.fecha,

                r.id_cliente,
                r.id_comercial,

                r.medio_pago,
                r.total,
                r.saldo_pendiente,
                r.comentarios,
                r.estado,

                CASE
                    WHEN rwo.id_wo IS NOT NULL THEN 1
                    ELSE 0
                END AS wo_bodega_auxiliar,

                rwo.codigo_world_office,

                c.nombre AS cliente,
                c.ciudad,

                co.nombre AS comercial,

                d.id_detalle,
                d.id_producto,
                d.placa,
                d.precio_lista,
                d.cantidad,
                d.precio_venta,
                d.total AS total_producto,

                p.codigo AS codigo_producto,
                p.nombre AS nombre_producto,
                p.linea AS linea_producto

            FROM remisiones r

            LEFT JOIN remisiones_world_office rwo
                ON r.id_remision = rwo.id_remision

            LEFT JOIN clientes c
                ON r.id_cliente = c.id_cliente

            LEFT JOIN comerciales co
                ON r.id_comercial = co.id_comercial

            LEFT JOIN detalle_remision d
                ON r.id_remision = d.id_remision

            LEFT JOIN productos p
                ON d.id_producto = p.id_producto

            WHERE
                MONTH(r.fecha) = ?
                AND YEAR(r.fecha) = ?

            ORDER BY
                r.fecha DESC,
                CAST(
                    REPLACE(r.numero_remision, 'REM ', '')
                    AS UNSIGNED
                ) DESC,
                d.id_detalle ASC

        `, [
            mes,
            anio
        ]);

        res.json(remisiones);

    } catch (error) {

        console.error(
            "Error obteniendo remisiones:",
            error
        );

        res.status(500).json({

            mensaje: "Error obteniendo las remisiones",

            error: error.message

        });

    }

});

/* =========================
   CREAR REMISIÓN
========================= */

app.post("/remisiones", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const {
            numero_remision,
            fecha,
            id_cliente,
            id_comercial,
            medio_pago,
            total,
            comentarios,
            productos
        } = req.body;


        /* =========================
           VALIDACIONES
        ========================= */

        if (
            !numero_remision ||
            !fecha ||
            !id_cliente ||
            !id_comercial ||
            !medio_pago
        ) {

            return res.status(400).json({

                mensaje: "Faltan datos obligatorios de la remisión."

            });

        }


        if (
            !productos ||
            !Array.isArray(productos) ||
            productos.length === 0
        ) {

            return res.status(400).json({

                mensaje: "La remisión debe tener al menos un producto."

            });

        }


        /* =========================
           INICIAR TRANSACCIÓN
        ========================= */

        await connection.beginTransaction();


        /* =========================
           INSERTAR REMISIÓN
        ========================= */

        const [resultadoRemision] = await connection.query(`

            INSERT INTO remisiones (

                numero_remision,
                fecha,
                id_cliente,
                id_comercial,
                medio_pago,
                total,
                saldo_pendiente,
                comentarios,
                estado

            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')

        `, [

            numero_remision,
            fecha,
            id_cliente,
            id_comercial,
            medio_pago,
            total || 0,
            total || 0,
            comentarios || null

        ]);


        const idRemision =
            resultadoRemision.insertId;


        /* =========================
           INSERTAR PRODUCTOS
        ========================= */

        for (const producto of productos) {

            const totalProducto =
                Number(producto.cantidad || 0) *
                Number(producto.precio_venta || 0);


            await connection.query(`

                INSERT INTO detalle_remision (

                    id_remision,
                    id_producto,
                    placa,
                    precio_lista,
                    cantidad,
                    precio_venta,
                    total

                )

                VALUES (?, ?, ?, ?, ?, ?, ?)

            `, [

                idRemision,
                producto.id_producto,
                producto.placa || null,
                producto.precio_lista || 0,
                producto.cantidad || 1,
                producto.precio_venta || 0,
                totalProducto

            ]);

        }


        /* =========================
           CONFIRMAR TRANSACCIÓN
        ========================= */

        await connection.commit();


        res.status(201).json({

            mensaje: "Remisión creada correctamente.",

            id_remision: idRemision,

            numero_remision

        });


    } catch (error) {

        await connection.rollback();

        console.error(
            "Error creando remisión:",
            error
        );


        res.status(500).json({

            mensaje: "Error creando la remisión.",

            error: error.message

        });


    } finally {

        connection.release();

    }

});

/* =========================
   DATOS PARA EXPORTAR REMISIONES
========================= */

app.get(
    "/exportaciones/remisiones",
    async (req, res) => {

        try {

            const {
                periodo
            } = req.query;


            if (!periodo) {

                return res.status(400).json({

                    mensaje:
                        "Debes indicar el período."

                });

            }


            /* =========================
               SEPARAR MES Y AÑO
            ========================= */

            const partes =
                periodo.split(" ");


            const nombreMes =
                partes[0]
                    .toLowerCase();


            const anio =
                Number(
                    partes[1]
                );


            const meses = {

                enero: 1,
                febrero: 2,
                marzo: 3,
                abril: 4,
                mayo: 5,
                junio: 6,
                julio: 7,
                agosto: 8,
                septiembre: 9,
                octubre: 10,
                noviembre: 11,
                diciembre: 12

            };


            const mes =
                meses[nombreMes];


            if (!mes || !anio) {

                return res.status(400).json({

                    mensaje:
                        "El período seleccionado no es válido."

                });

            }


            /* =========================
               CONSULTAR REMISIONES
            ========================= */

            const [remisiones] =
                await db.query(

                    `

                    SELECT

                        r.id_remision,

                        r.numero_remision,

                        r.fecha,

                        r.medio_pago,

                        r.total,

                        r.saldo_pendiente,

                        r.comentarios,

                        r.estado,


                        CASE

                            WHEN rwo.id_wo IS NOT NULL

                            THEN 1

                            ELSE 0

                        END AS wo_bodega_auxiliar,


                        rwo.codigo_world_office,


                        c.nombre AS cliente,

                        c.documento,

                        c.ciudad,


                        co.nombre AS comercial,


                        d.id_detalle,

                        d.placa,

                        d.precio_lista,

                        d.cantidad,

                        d.precio_venta,

                        d.total AS total_producto,


                        p.codigo AS codigo_producto,

                        p.nombre AS nombre_producto,

                        p.linea AS linea_producto


                    FROM remisiones r


                    LEFT JOIN remisiones_world_office rwo

                        ON r.id_remision =
                            rwo.id_remision


                    LEFT JOIN clientes c

                        ON r.id_cliente =
                            c.id_cliente


                    LEFT JOIN comerciales co

                        ON r.id_comercial =
                            co.id_comercial


                    LEFT JOIN detalle_remision d

                        ON r.id_remision =
                            d.id_remision


                    LEFT JOIN productos p

                        ON d.id_producto =
                            p.id_producto


                    WHERE

                        MONTH(r.fecha) = ?

                        AND YEAR(r.fecha) = ?


                    ORDER BY

                        r.fecha DESC,

                        CAST(
                            REPLACE(
                                r.numero_remision,
                                'REM ',
                                ''
                            )
                            AS UNSIGNED
                        ) DESC,

                        d.id_detalle ASC

                    `,

                    [
                        mes,
                        anio
                    ]

                );


            console.log(
                "REMISIONES PARA EXPORTACIÓN:",
                remisiones
            );


            res.json({

                periodo,

                cantidad_remisiones:
                    new Set(
                        remisiones.map(
                            remision =>
                                remision.id_remision
                        )
                    ).size,

                remisiones

            });


        } catch (error) {

            console.error(
                "Error obteniendo remisiones para exportar:",
                error
            );


            res.status(500).json({

                mensaje:
                    "No se pudieron obtener las remisiones.",

                error:
                    error.message

            });

        }

    }
);

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {

    try {

        const { usuario, password } = req.body;


        /* =========================
           VALIDAR DATOS
        ========================= */

        if (!usuario || !password) {

            return res.status(400).json({

                mensaje: "Usuario y contraseña son obligatorios."

            });

        }


        /* =========================
           BUSCAR USUARIO
        ========================= */

        const [usuarios] = await db.query(`

            SELECT
                id_usuario,
                nombre,
                usuario,
                password,
                rol,
                activo

            FROM usuarios

            WHERE usuario = ?

            LIMIT 1

        `, [usuario]);


        if (usuarios.length === 0) {

            return res.status(401).json({

                mensaje: "Usuario o contraseña incorrectos."

            });

        }


        const usuarioBD = usuarios[0];


        /* =========================
           VERIFICAR ESTADO
        ========================= */

        if (usuarioBD.activo !== 1) {

            return res.status(403).json({

                mensaje: "Este usuario se encuentra inactivo."

            });

        }


        /* =========================
           VERIFICAR CONTRASEÑA
        ========================= */

        const passwordCorrecta =
            await bcrypt.compare(
                password,
                usuarioBD.password
            );


        if (!passwordCorrecta) {

            return res.status(401).json({

                mensaje: "Usuario o contraseña incorrectos."

            });

        }

        /* =========================
           RESPUESTA
        ========================= */

        res.json({

            mensaje: "Inicio de sesión correcto.",

            usuario: {

                id_usuario: usuarioBD.id_usuario,

                nombre: usuarioBD.nombre,

                usuario: usuarioBD.usuario,

                rol: usuarioBD.rol

            }

        });


    } catch (error) {

        console.error(
            "Error en login:",
            error
        );

        res.status(500).json({

            mensaje: "Error interno del servidor.",

            error: error.message

        });

    }

});

/* =========================
   WORLD OFFICE
========================= */

app.post("/remisiones/world-office", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const {
            id_remisiones,
            codigo_world_office,
            id_usuario
        } = req.body;


        /* =========================
           VALIDACIONES
        ========================= */

        if (
            !Array.isArray(id_remisiones) ||
            id_remisiones.length === 0
        ) {

            return res.status(400).json({
                mensaje: "No hay remisiones seleccionadas."
            });

        }


        if (!codigo_world_office || !codigo_world_office.trim()) {

            return res.status(400).json({
                mensaje:
                    "El código de World Office es obligatorio."
            });

        }


        if (!id_usuario) {

            return res.status(400).json({
                mensaje:
                    "No se recibió el usuario."
            });

        }


        /* =========================
           VERIFICAR USUARIO
        ========================= */

        const [usuarios] = await connection.query(`

            SELECT
                id_usuario,
                nombre,
                rol,
                activo

            FROM usuarios

            WHERE id_usuario = ?

            LIMIT 1

        `, [id_usuario]);


        if (usuarios.length === 0) {

            return res.status(401).json({
                mensaje:
                    "Usuario no encontrado."
            });

        }


        const usuario = usuarios[0];


        /* =========================
           VALIDAR ROL
        ========================= */

        if (usuario.rol !== "ADMINISTRADOR") {

            return res.status(403).json({
                mensaje:
                    "Solo los administradores pueden confirmar movimientos de World Office."
            });

        }


        if (usuario.activo !== 1) {

            return res.status(403).json({
                mensaje:
                    "El usuario se encuentra inactivo."
            });

        }


        /* =========================
           INICIAR TRANSACCIÓN
        ========================= */

        await connection.beginTransaction();


        /* =========================
           COMPROBAR REMISIONES
        ========================= */

        for (const idRemision of id_remisiones) {

            // Verificar que la remisión exista

            const [remisiones] = await connection.query(`

                SELECT
                    id_remision

                FROM remisiones

                WHERE id_remision = ?

                LIMIT 1

            `, [idRemision]);


            if (remisiones.length === 0) {

                throw new Error(
                    `La remisión ${idRemision} no existe.`
                );

            }


            // Verificar si ya fue pasada a World Office

            const [worldOffice] = await connection.query(`

                SELECT
                    id_wo

                FROM remisiones_world_office

                WHERE id_remision = ?

                LIMIT 1

            `, [idRemision]);


            if (worldOffice.length > 0) {

                throw new Error(
                    `La remisión ${idRemision} ya fue pasada a World Office.`
                );

            }

        }


        /* =========================
           REGISTRAR WORLD OFFICE
        ========================= */

        for (const idRemision of id_remisiones) {

            await connection.query(`

                INSERT INTO remisiones_world_office (

                    id_remision,
                    codigo_world_office,
                    id_usuario

                )

                VALUES (?, ?, ?)

            `, [

                idRemision,
                codigo_world_office.trim(),
                id_usuario

            ]);

        }


        /* =========================
           CONFIRMAR
        ========================= */

        await connection.commit();


        res.json({

            mensaje:
                "Movimiento de World Office registrado correctamente.",

            usuario: usuario.nombre,

            codigo_world_office:
                codigo_world_office.trim(),

            remisiones:
                id_remisiones

        });


    } catch (error) {

        await connection.rollback();

        console.error(
            "Error registrando World Office:",
            error
        );

        res.status(500).json({

            mensaje:
                error.message ||
                "Error registrando el movimiento de World Office."

        });

    } finally {

        connection.release();

    }

});

/* =========================
   INICIO - KPIS
========================= */

app.get("/inicio", async (req, res) => {

    try {

        const { mes, anio } = req.query;

        if (!mes || !anio) {

            return res.status(400).json({
                mensaje: "Debes indicar mes y año."
            });

        }

        /*
        =========================
        MES ACTUAL
        =========================
        */

        const [kpisMes] = await db.query(`

            SELECT

                COALESCE(
                    SUM(r.total),
                    0
                ) AS ventas_mes,

                COUNT(
                    DISTINCT r.id_remision
                ) AS total_remisiones,

                COUNT(
                    DISTINCT r.id_cliente
                ) AS total_clientes

            FROM remisiones r

            WHERE MONTH(r.fecha) = ?
              AND YEAR(r.fecha) = ?

              AND r.estado <> 'ANULADA'

        `, [mes, anio]);


        /*
        =========================
        MES ANTERIOR
        =========================

        Calculamos el mes anterior
        incluso cuando estamos en enero.

        Enero 2026
        ↓
        Diciembre 2025
        */

        let mesAnterior = Number(mes) - 1;
        let anioAnterior = Number(anio);

        if (mesAnterior === 0) {

            mesAnterior = 12;
            anioAnterior--;

        }


        /*
        =========================
        DATOS DEL MES ANTERIOR
        =========================
        */

        const [kpisMesAnterior] = await db.query(`

            SELECT

                COALESCE(
                    SUM(r.total),
                    0
                ) AS ventas_mes_anterior,

                COUNT(
                    DISTINCT r.id_remision
                ) AS remisiones_mes_anterior,

                COUNT(
                    DISTINCT r.id_cliente
                ) AS clientes_mes_anterior

            FROM remisiones r

            WHERE MONTH(r.fecha) = ?
              AND YEAR(r.fecha) = ?

              AND r.estado <> 'ANULADA'

        `, [
            mesAnterior,
            anioAnterior
        ]);


        /*
        =========================
        VARIACIÓN VENTAS
        =========================

        Fórmula:

        ((actual - anterior) / anterior) * 100
        */

        const ventasActual =
            Number(kpisMes[0].ventas_mes || 0);

        const ventasAnterior =
            Number(
                kpisMesAnterior[0].ventas_mes_anterior || 0
            );


        let variacionVentas = null;

        if (ventasAnterior > 0) {

         variacionVentas =
    Number(
        (
            (
                (
                    ventasActual -
                    ventasAnterior
                ) /
                ventasAnterior
            ) * 100
        ).toFixed(1)
    );

        }


        /*
        =========================
        VARIACIÓN REMISIONES
        =========================
        */

        const remisionesActual =
            Number(
                kpisMes[0].total_remisiones || 0
            );

        const remisionesAnterior =
            Number(
                kpisMesAnterior[0]
                    .remisiones_mes_anterior || 0
            );


        let variacionRemisiones = null;

        if (remisionesAnterior > 0) {

           variacionRemisiones =
    Number(
        (
            (
                (
                    remisionesActual -
                    remisionesAnterior
                ) /
                remisionesAnterior
            ) * 100
        ).toFixed(1)
    );

        }


        /*
        =========================
        VARIACIÓN CLIENTES
        =========================
        */

        const clientesActual =
            Number(
                kpisMes[0].total_clientes || 0
            );

        const clientesAnterior =
            Number(
                kpisMesAnterior[0]
                    .clientes_mes_anterior || 0
            );


        let variacionClientes = null;

        if (clientesAnterior > 0) {

           variacionClientes =
    Number(
        (
            (
                (
                    clientesActual -
                    clientesAnterior
                ) /
                clientesAnterior
            ) * 100
        ).toFixed(1)
    );

        }


   /*
=========================
CARTERA ACTUAL
=========================

La cartera NO depende del mes seleccionado.

Siempre muestra el dinero que actualmente
está pendiente de pago.
*/

const [cartera] = await db.query(`

    SELECT

        COALESCE(
            SUM(r.saldo_pendiente),
            0
        ) AS cartera_total,

        COUNT(
            DISTINCT r.id_remision
        ) AS cuentas_pendientes

    FROM remisiones r

    WHERE COALESCE(
        r.saldo_pendiente,
        0
    ) > 0

      AND r.estado <> 'ANULADA'

`);

const [carteraMesAnterior] = await db.query(`

    SELECT

        COALESCE(
            SUM(r.saldo_pendiente),
            0
        ) AS cartera_mes_anterior

    FROM remisiones r

    WHERE r.saldo_pendiente > 0

      AND r.estado = 'PENDIENTE'

      AND MONTH(r.fecha) = ?
      AND YEAR(r.fecha) = ?

`, [
    mesAnterior,
    anioAnterior
]);

const carteraActual = Number(
    cartera[0].cartera_total || 0
);

const carteraAnterior = Number(
    carteraMesAnterior[0].cartera_mes_anterior || 0
);

let variacionCartera = null;

if (carteraAnterior > 0) {

    variacionCartera =
        (
            (
                carteraActual -
                carteraAnterior
            ) /
            carteraAnterior
        ) * 100;

}


        /*
        =========================
        RESPUESTA
        =========================
        */

        res.json({

            ventas_mes:
                ventasActual,

            total_remisiones:
                remisionesActual,

            total_clientes:
                clientesActual,

            cartera_total:
                Number(
                    cartera[0].cartera_total || 0
                ),

            cuentas_pendientes:
                Number(
                    cartera[0].cuentas_pendientes || 0
                ),

            variacion_ventas:
                variacionVentas,

            variacion_remisiones:
                variacionRemisiones,

            variacion_clientes:
                variacionClientes,

             variacion_cartera:
    variacionCartera

        });


    } catch (error) {

        console.error(
            "Error obteniendo KPIs de Inicio:",
            error
        );

        res.status(500).json({

            mensaje:
                "Error obteniendo los KPIs de Inicio.",

            error:
                error.message

        });

    }

});

/* =========================
   INICIO - ÚLTIMAS REMISIONES
========================= */

app.get("/inicio/ultimas-remisiones", async (req, res) => {

    try {

        const { mes, anio } = req.query;

        if (!mes || !anio) {

            return res.status(400).json({
                mensaje: "Debes indicar mes y año."
            });

        }

        const [remisiones] = await db.query(`

            SELECT

                r.id_remision,
                r.numero_remision,
                r.fecha,
                r.total,

                c.nombre AS cliente

            FROM remisiones r

            INNER JOIN clientes c
                ON r.id_cliente = c.id_cliente

            WHERE MONTH(r.fecha) = ?
              AND YEAR(r.fecha) = ?

            ORDER BY
    r.fecha DESC,
    CAST(
        REPLACE(r.numero_remision, 'REM ', '')
        AS UNSIGNED
    ) DESC

            LIMIT 3

        `, [mes, anio]);

        res.json(remisiones);

    } catch (error) {

        console.error(
            "Error obteniendo últimas remisiones:",
            error
        );

        res.status(500).json({

            mensaje: "Error obteniendo últimas remisiones.",

            error: error.message

        });

    }

});

/* =========================
   INICIO - CARTERA POR VENCER
========================= */

app.get("/inicio/cartera-por-vencer", async (req, res) => {

    try {

        const [cartera] = await db.query(`

            SELECT

                r.id_remision,

                r.numero_remision,

                r.fecha,

                r.saldo_pendiente,

                c.nombre AS cliente,

                DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) AS dias_transcurridos,

                45 - DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) AS dias_para_vencer


            FROM remisiones r


            INNER JOIN clientes c
                ON r.id_cliente = c.id_cliente


            WHERE

                COALESCE(
                    r.saldo_pendiente,
                    0
                ) > 0


                AND r.estado <> 'ANULADA'


                AND DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) BETWEEN 31 AND 45


            ORDER BY

                r.fecha ASC


            LIMIT 3

        `);


        res.json(cartera);


    } catch (error) {

        console.error(
            "Error obteniendo cartera por vencer:",
            error
        );


        res.status(500).json({

            mensaje:
                "Error obteniendo cartera por vencer.",

            error:
                error.message

        });

    }

});

/* =========================
   INICIO - CARTERA VENCIDA
========================= */

app.get("/inicio/cartera-vencida", async (req, res) => {

    try {

        const [cartera] = await db.query(`

            SELECT

                r.id_remision,

                r.numero_remision,

                r.fecha,

                r.saldo_pendiente,

                c.nombre AS cliente,


                DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) AS dias


            FROM remisiones r


            INNER JOIN clientes c
                ON r.id_cliente = c.id_cliente


            WHERE

                COALESCE(
                    r.saldo_pendiente,
                    0
                ) > 0


                AND r.estado <> 'ANULADA'


                AND DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) > 45


            ORDER BY

                r.fecha ASC


            LIMIT 3

        `);


        res.json(cartera);


    } catch (error) {

        console.error(
            "Error obteniendo cartera vencida:",
            error
        );


        res.status(500).json({

            mensaje:
                "Error obteniendo cartera vencida.",

            error:
                error.message

        });

    }

});

app.get("/notificaciones/cartera-vencida/:id_usuario", async (req, res) => {

    try {

        const { id_usuario } = req.params;


        /* =========================================
           BUSCAR REMISIONES CON MÁS DE 30 DÍAS
        ========================================= */

        const [remisionesVencidas] = await db.query(`

            SELECT

                r.id_remision,

                r.numero_remision,

                r.fecha,

                r.saldo_pendiente,

                c.nombre AS cliente,

                DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) AS dias_vencida

            FROM remisiones r

            INNER JOIN clientes c
                ON r.id_cliente = c.id_cliente

            WHERE

                COALESCE(
                    r.saldo_pendiente,
                    0
                ) > 0

                AND r.estado <> 'ANULADA'

                AND DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) > 30

            ORDER BY
                r.fecha ASC

        `);


        /* =========================================
           CREAR NOTIFICACIONES QUE NO EXISTAN
        ========================================= */

        for (const remision of remisionesVencidas) {

            const [existente] = await db.query(`

                SELECT id_notificacion

                FROM notificaciones

                WHERE id_usuario = ?
                AND id_remision = ?

                LIMIT 1

            `, [

                id_usuario,
                remision.id_remision

            ]);


            if (existente.length === 0) {

                await db.query(`

                    INSERT INTO notificaciones (

                        id_usuario,
                        id_remision,
                        tipo,
                        titulo,
                        mensaje,
                        leida

                    )

                    VALUES (?, ?, ?, ?, ?, 0)

                `, [

                    id_usuario,

                    remision.id_remision,

                    "alerta",

                    "Cartera vencida",

                    `${remision.cliente} tiene la remisión ` +
                    `${remision.numero_remision} con un saldo pendiente de ` +
                    `$${Number(
                        remision.saldo_pendiente
                    ).toLocaleString("es-CO")}.`

                ]);

            }

        }


        /* =========================================
           OBTENER NOTIFICACIONES DEL USUARIO
        ========================================= */

        const [notificaciones] = await db.query(`

            SELECT

                n.id_notificacion,

                n.id_remision,

                n.tipo,

                n.titulo,

                n.mensaje,

                n.leida,

                n.fecha_creacion,

                r.numero_remision,

                r.saldo_pendiente,

                c.nombre AS cliente,

                DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) AS dias_vencida

            FROM notificaciones n

            INNER JOIN remisiones r
                ON n.id_remision = r.id_remision

            INNER JOIN clientes c
                ON r.id_cliente = c.id_cliente

            WHERE

                n.id_usuario = ?

                AND COALESCE(
                    r.saldo_pendiente,
                    0
                ) > 0

                AND r.estado <> 'ANULADA'

                AND DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) > 30

            ORDER BY
                r.fecha ASC

        `, [

            id_usuario

        ]);


        res.json(notificaciones);

    } catch (error) {

        console.error(
            "Error obteniendo notificaciones:",
            error
        );

        res.status(500).json({

            mensaje:
                "Error obteniendo notificaciones.",

            error:
                error.message

        });

    }

});

app.put(
    "/notificaciones/:id_notificacion/leida",
    async (req, res) => {

        try {

            const { id_notificacion } = req.params;

            await db.query(`

                UPDATE notificaciones

                SET leida = 1

                WHERE id_notificacion = ?

            `, [

                id_notificacion

            ]);


            res.json({

                mensaje:
                    "Notificación marcada como leída."

            });

        } catch (error) {

            console.error(
                "Error marcando notificación como leída:",
                error
            );

            res.status(500).json({

                mensaje:
                    "Error marcando notificación como leída."

            });

        }

    }
);
/* =========================
   INICIO - RENDIMIENTO COMERCIALES
========================= */

app.get("/inicio/rendimiento-comerciales", async (req, res) => {

    try {

        const { mes, anio } = req.query;

        if (!mes || !anio) {

            return res.status(400).json({
                mensaje: "Debes indicar mes y año."
            });

        }


        const [comerciales] = await db.query(`

            SELECT

                c.id_comercial,
                c.nombre,

                COALESCE(
                    SUM(r.total),
                    0
                ) AS total_ventas,

                COUNT(
                    DISTINCT r.id_remision
                ) AS total_remisiones,

                COALESCE(
                    AVG(r.total),
                    0
                ) AS promedio_remision

            FROM comerciales c

            INNER JOIN remisiones r
                ON r.id_comercial = c.id_comercial

            WHERE
                MONTH(r.fecha) = ?
                AND YEAR(r.fecha) = ?

            GROUP BY
                c.id_comercial,
                c.nombre

            ORDER BY
                total_ventas DESC

            LIMIT 10

        `, [mes, anio]);


        res.json(comerciales);

    } catch (error) {

        console.error(
            "Error obteniendo rendimiento de comerciales:",
            error
        );

        res.status(500).json({

            mensaje:
                "Error obteniendo rendimiento de comerciales.",

            error: error.message

        });

    }

});

// ================================
// CLIENTES
// ================================

app.get("/clientes/buscar/:texto", async (req, res) => {

    try {

        const texto = `%${req.params.texto}%`;

        const [clientes] = await db.query(
            `
            SELECT
                id_cliente,
                nombre,
                tipo_documento,
                documento,
                ciudad,
                telefono,
                correo,
                direccion,
                activo
            FROM clientes
            WHERE activo = 1
              AND (
                    nombre LIKE ?
                    OR documento LIKE ?
                    OR telefono LIKE ?
              )
            ORDER BY nombre ASC
            LIMIT 10
            `,
            [
                texto,
                texto,
                texto
            ]
        );

        res.json(clientes);

    } catch (error) {

        console.error(
            "Error buscando clientes:",
            error
        );

        res.status(500).json({
            mensaje: "Error buscando clientes.",
            error: error.message
        });

    }

});

// ================================
// CREAR CLIENTE
// ================================

app.post("/clientes", async (req, res) => {

    try {

        const {
            nombre,
            tipo_documento,
            documento,
            telefono,
            correo,
            direccion
        } = req.body;

        if (!nombre || !tipo_documento || !documento) {

            return res.status(400).json({
                mensaje: "Nombre, tipo de documento y documento son obligatorios."
            });

        }

        const [resultado] = await db.query(
            `
            INSERT INTO clientes (
                nombre,
                tipo_documento,
                documento,
                telefono,
                correo,
                direccion
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                nombre.trim(),
                tipo_documento,
                documento.trim(),
                telefono?.trim() || null,
                correo?.trim() || null,
                direccion?.trim() || null
            ]
        );

        res.status(201).json({
            mensaje: "Cliente creado correctamente.",
            id_cliente: resultado.insertId
        });

    } catch (error) {

        console.error(
            "Error creando cliente:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                mensaje: "Ya existe un cliente con ese documento."
            });

        }

        res.status(500).json({
            mensaje: "Error creando cliente.",
            error: error.message
        });

    }

});

/* =========================
   COMERCIALES
========================= */

app.get("/comerciales", async (req, res) => {

    try {

        const [comerciales] = await db.query(`

            SELECT
                id_comercial,
                nombre

            FROM comerciales

            WHERE activo = 1

            ORDER BY nombre ASC

        `);

        res.json(comerciales);

    } catch (error) {

        console.error(
            "Error obteniendo comerciales:",
            error
        );

        res.status(500).json({

            mensaje: "Error obteniendo comerciales.",
            error: error.message

        });

    }

});

/* =========================
   PRODUCTO POR CÓDIGO
========================= */

app.get("/productos/codigo/:codigo", async (req, res) => {

    try {

        const { codigo } = req.params;

        const [productos] = await db.query(`

            SELECT
                id_producto,
                codigo,
                nombre,
                linea,
                precio_lista,
                activo

            FROM productos

            WHERE codigo = ?
              AND activo = 1

            LIMIT 1

        `, [codigo]);


        if (productos.length === 0) {

            return res.status(404).json({

                mensaje: "No se encontró un producto con ese código."

            });

        }


        res.json(productos[0]);

    } catch (error) {

        console.error(
            "Error buscando producto:",
            error
        );

        res.status(500).json({

            mensaje: "Error buscando el producto.",

            error: error.message

        });

    }

});

/* =========================
   BUSCAR PRODUCTOS POR CÓDIGO
========================= */

app.get("/productos/buscar-codigo/:texto", async (req, res) => {

    try {

        const { texto } = req.params;

        if (!texto.trim()) {
            return res.json([]);
        }

        const [productos] = await db.query(`

            SELECT
                id_producto,
                codigo,
                nombre,
                linea,
                precio_lista

            FROM productos

            WHERE codigo LIKE ?
              AND activo = 1

            ORDER BY codigo ASC

            LIMIT 10

        `, [`${texto}%`]);

        res.json(productos);

    } catch (error) {

        console.error(
            "Error buscando productos por código:",
            error
        );

        res.status(500).json({

            mensaje: "Error buscando productos.",

            error: error.message

        });

    }

});

/* =========================
   BUSCAR PRODUCTOS POR PRODUCTO
========================= */

app.get("/productos/buscar-nombre/:texto", async (req, res) => {

    try {

        const { texto } = req.params;

        const [productos] = await db.query(`
            SELECT
                id_producto,
                codigo,
                nombre,
                linea,
                precio_lista
            FROM productos
            WHERE activo = 1
              AND nombre LIKE ?
            ORDER BY nombre ASC
            LIMIT 10
        `, [`%${texto}%`]);

        res.json(productos);

    } catch (error) {

        console.error("Error buscando productos por nombre:", error);

        res.status(500).json({
            mensaje: "Error buscando productos.",
            error: error.message
        });

    }

});

/* =========================
   CARTERA
========================= */

app.get("/cartera", async (req, res) => {

    try {

        const {
            comercial,
            estado,
            busqueda
        } = req.query;


        let sql = `

            SELECT

    r.id_remision,

    r.numero_remision,

    r.fecha,

    r.total,

    COALESCE(
        r.saldo_pendiente,
        0
    ) AS saldo_pendiente,

    COALESCE(
        a.cantidad_abonos,
        0
    ) AS cantidad_abonos,

    COALESCE(
        a.total_abonado,
        0
    ) AS total_abonado,

                /*
                =========================
                ESTADO CALCULADO
                =========================
                */

                CASE

                    WHEN COALESCE(
                        r.saldo_pendiente,
                        0
                    ) <= 0

                    THEN 'PAGADA'


                    WHEN DATEDIFF(
                        CURDATE(),
                        r.fecha
                    ) > 45

                    THEN 'VENCIDA'


                    WHEN DATEDIFF(
                        CURDATE(),
                        r.fecha
                    ) > 30

                    THEN 'SEGUIMIENTO'


                    ELSE 'AL_DIA'

                END AS estado,


                c.id_cliente,

                c.nombre AS cliente,

                c.documento,


                co.id_comercial,

                co.nombre AS comercial,


                DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) AS dias


            FROM remisiones r


            INNER JOIN clientes c
                ON r.id_cliente = c.id_cliente


            INNER JOIN comerciales co
                ON r.id_comercial = co.id_comercial

            LEFT JOIN (

    SELECT

        id_remision,

        COUNT(*) AS cantidad_abonos,

        COALESCE(
            SUM(valor),
            0
        ) AS total_abonado

    FROM abonos_remision

    GROUP BY id_remision

) a
    ON r.id_remision = a.id_remision

           WHERE r.estado <> 'ANULADA'

AND COALESCE(
    r.saldo_pendiente,
    0
) > 0

        `;


        const parametros = [];


        /* =========================
           FILTRO POR COMERCIAL
        ========================= */

        if (comercial) {

            sql += `
                AND r.id_comercial = ?
            `;

            parametros.push(
                comercial
            );

        }


        /* =========================
           FILTRO POR ESTADO
        ========================= */


        if (estado === "AL_DIA") {

            sql += `

                AND COALESCE(
                    r.saldo_pendiente,
                    0
                ) > 0

                AND DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) <= 30

            `;

        }


        if (estado === "SEGUIMIENTO") {

            sql += `

                AND COALESCE(
                    r.saldo_pendiente,
                    0
                ) > 0

                AND DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) > 30

                AND DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) <= 45

            `;

        }


        if (estado === "VENCIDA") {

            sql += `

                AND COALESCE(
                    r.saldo_pendiente,
                    0
                ) > 0

                AND DATEDIFF(
                    CURDATE(),
                    r.fecha
                ) > 45

            `;

        }


        /* =========================
           BÚSQUEDA
        ========================= */

        if (busqueda) {

            sql += `

                AND (

                    c.nombre LIKE ?

                    OR c.documento LIKE ?

                    OR r.numero_remision LIKE ?

                )

            `;


            const texto =
                `%${busqueda}%`;


            parametros.push(

                texto,

                texto,

                texto

            );

        }


        /* =========================
           ORDEN
        ========================= */

        sql += `

            ORDER BY

                r.fecha DESC,

                r.id_remision DESC

        `;

const [cartera] =
    await db.query(
        sql,
        parametros
    );

console.log(
    "CARTERA CON ABONOS:",
    cartera
);

res.json(cartera);


    } catch (error) {

        console.error(
            "Error cargando cartera:",
            error
        );


        res.status(500).json({

            mensaje:
                "Error cargando la cartera.",

            error:
                error.message

        });

    }

});
/* =========================
   DATOS PARA EXPORTAR CARTERA
========================= */

app.get(
    "/exportaciones/cartera",
    async (req, res) => {

        try {

            const [cartera] =
                await db.query(

                    `

                    SELECT

                        r.id_remision,

                        r.numero_remision,

                        r.fecha,

                        r.total,

                        COALESCE(
                            r.saldo_pendiente,
                            0
                        ) AS saldo_pendiente,


                        COALESCE(
                            a.cantidad_abonos,
                            0
                        ) AS cantidad_abonos,


                        COALESCE(
                            a.total_abonado,
                            0
                        ) AS total_abonado,


                        CASE

                            WHEN COALESCE(
                                r.saldo_pendiente,
                                0
                            ) <= 0

                            THEN 'PAGADA'


                            WHEN DATEDIFF(
                                CURDATE(),
                                r.fecha
                            ) > 45

                            THEN 'VENCIDA'


                            WHEN DATEDIFF(
                                CURDATE(),
                                r.fecha
                            ) > 30

                            THEN 'SEGUIMIENTO'


                            ELSE 'AL_DIA'

                        END AS estado,


                        c.nombre AS cliente,

                        c.documento,


                        co.nombre AS comercial,


                        DATEDIFF(
                            CURDATE(),
                            r.fecha
                        ) AS dias


                    FROM remisiones r


                    INNER JOIN clientes c

                        ON r.id_cliente =
                            c.id_cliente


                    INNER JOIN comerciales co

                        ON r.id_comercial =
                            co.id_comercial


                    LEFT JOIN (

                        SELECT

                            id_remision,

                            COUNT(*) AS cantidad_abonos,

                            COALESCE(
                                SUM(valor),
                                0
                            ) AS total_abonado


                        FROM abonos_remision


                        GROUP BY id_remision

                    ) a

                        ON r.id_remision =
                            a.id_remision


                    WHERE

                        r.estado <> 'ANULADA'

                        AND COALESCE(
                            r.saldo_pendiente,
                            0
                        ) > 0


                    ORDER BY

                        r.fecha ASC,

                        r.id_remision ASC

                    `

                );


            console.log(
                "CARTERA ACTUAL PARA EXPORTACIÓN:",
                cartera
            );


            res.json(cartera);


        } catch (error) {

            console.error(
                "Error obteniendo datos para exportar cartera:",
                error
            );


            res.status(500).json({

                mensaje:
                    "No se pudieron obtener los datos de cartera.",

                error:
                    error.message

            });

        }

    }
);

/* =========================
   DATOS PARA REPORTE GENERAL
========================= */

app.get(
    "/exportaciones/general",
    async (req, res) => {

        try {

            const {
                periodo
            } = req.query;


            /* =========================
               VALIDAR PERÍODO
            ========================= */

            if (!periodo) {

                return res.status(400).json({

                    mensaje:
                        "Debes enviar un período."

                });

            }


            /* =========================
               CONVERTIR MES A NÚMERO
            ========================= */

            const meses = {

                Enero: 1,
                Febrero: 2,
                Marzo: 3,
                Abril: 4,
                Mayo: 5,
                Junio: 6,
                Julio: 7,
                Agosto: 8,
                Septiembre: 9,
                Octubre: 10,
                Noviembre: 11,
                Diciembre: 12

            };


            const partes =
                periodo.trim().split(" ");


            const nombreMes =
                partes[0];


            const anio =
                Number(partes[1]);


            const mes =
                meses[nombreMes];


            if (!mes || !anio) {

                return res.status(400).json({

                    mensaje:
                        "El período recibido no es válido."

                });

            }


            /* =========================
               CONSULTAR REMISIONES
               DEL PERÍODO
            ========================= */

            const [remisiones] =
                await db.query(

                    `

                    SELECT

                        r.id_remision,

                        r.numero_remision,

                        r.fecha,

                        r.total,

                        COALESCE(
                            r.saldo_pendiente,
                            0
                        ) AS saldo_pendiente,

                        c.nombre AS cliente,

                        c.documento,

                        co.nombre AS comercial


                    FROM remisiones r


                    INNER JOIN clientes c

                        ON r.id_cliente =
                            c.id_cliente


                    INNER JOIN comerciales co

                        ON r.id_comercial =
                            co.id_comercial


                    WHERE

                        r.estado <> 'ANULADA'

                        AND MONTH(r.fecha) = ?

                        AND YEAR(r.fecha) = ?


                    ORDER BY

                        r.fecha ASC,

                        r.id_remision ASC

                    `,

                    [

                        mes,
                        anio

                    ]

                );


            console.log(
                `REPORTE GENERAL ${periodo}:`,
                remisiones
            );


            res.json({

                periodo,

                cantidad_remisiones:
                    remisiones.length,

                remisiones

            });


        } catch (error) {

            console.error(
                "Error obteniendo reporte general:",
                error
            );


            res.status(500).json({

                mensaje:
                    "No se pudo obtener el reporte general.",

                error:
                    error.message

            });

        }

    }
);
/* =========================
   KPIs DE CARTERA
========================= */

app.get("/cartera/kpis", async (req, res) => {

    try {

        const {
            comercial
        } = req.query;


        let sql = `

            SELECT

                /* =========================
                   CARTERA TOTAL
                ========================= */

                COALESCE(
                    SUM(
                        CASE

                            WHEN COALESCE(
                                r.saldo_pendiente,
                                0
                            ) > 0

                            THEN r.saldo_pendiente

                            ELSE 0

                        END
                    ),
                    0
                ) AS cartera_total,


                /* =========================
                   0 - 30 DÍAS
                ========================= */

                COALESCE(
                    SUM(
                        CASE

                            WHEN DATEDIFF(
                                CURDATE(),
                                r.fecha
                            ) <= 30

                            AND COALESCE(
                                r.saldo_pendiente,
                                0
                            ) > 0

                            THEN r.saldo_pendiente

                            ELSE 0

                        END
                    ),
                    0
                ) AS al_dia,


                /* =========================
                   31 - 45 DÍAS
                ========================= */

                COALESCE(
                    SUM(
                        CASE

                            WHEN DATEDIFF(
                                CURDATE(),
                                r.fecha
                            ) > 30

                            AND DATEDIFF(
                                CURDATE(),
                                r.fecha
                            ) <= 45

                            AND COALESCE(
                                r.saldo_pendiente,
                                0
                            ) > 0

                            THEN r.saldo_pendiente

                            ELSE 0

                        END
                    ),
                    0
                ) AS seguimiento,


                /* =========================
                   46+ DÍAS
                ========================= */

                COALESCE(
                    SUM(
                        CASE

                            WHEN DATEDIFF(
                                CURDATE(),
                                r.fecha
                            ) > 45

                            AND COALESCE(
                                r.saldo_pendiente,
                                0
                            ) > 0

                            THEN r.saldo_pendiente

                            ELSE 0

                        END
                    ),
                    0
                ) AS vencida


            FROM remisiones r


            WHERE r.estado <> 'ANULADA'

            AND COALESCE(
                r.saldo_pendiente,
                0
            ) > 0

        `;


        const parametros = [];


        /* =========================
           FILTRO POR COMERCIAL
        ========================= */

        if (comercial) {

            sql += `

                AND r.id_comercial = ?

            `;


            parametros.push(
                comercial
            );

        }


        const [resultado] =
            await db.query(
                sql,
                parametros
            );


        res.json(
            resultado[0]
        );


    } catch (error) {

        console.error(
            "Error cargando KPIs de cartera:",
            error
        );


        res.status(500).json({

            mensaje:
                "No se pudieron cargar los indicadores de cartera.",

            error:
                error.message

        });

    }

});

/* =========================
   USUARIOS
========================= */

/* OBTENER USUARIOS */

app.get("/usuarios", async (req, res) => {

    try {

        const [usuarios] = await db.query(`

            SELECT
                id_usuario,
                nombre,
                usuario,
                rol,
                activo,
                fecha_creacion

            FROM usuarios

            ORDER BY id_usuario ASC

        `);

        res.json(usuarios);

    } catch (error) {

        console.error(
            "Error obteniendo usuarios:",
            error
        );

        res.status(500).json({
            mensaje: "Error obteniendo los usuarios."
        });

    }

});
/* CREAR USUARIO */

app.post("/usuarios", async (req, res) => {

    try {

        const {
            nombre,
            usuario,
            password,
            rol,
            activo
        } = req.body;


        console.log(
            "DATOS RECIBIDOS PARA CREAR USUARIO:",
            req.body
        );


        /* VALIDAR DATOS */

        if (
            !nombre ||
            !usuario ||
            !password ||
            !rol
        ) {

            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios."
            });

        }


        /* VALIDAR USUARIO DUPLICADO */

        const [usuarioExistente] =
            await db.query(
                `
                SELECT id_usuario
                FROM usuarios
                WHERE usuario = ?
                `,
                [usuario]
            );


        if (usuarioExistente.length > 0) {

            return res.status(409).json({
                mensaje:
                    "Ya existe un usuario con este nombre de usuario."
            });

        }


        /* ENCRIPTAR CONTRASEÑA */

        const passwordHash =
            await bcrypt.hash(password, 10);


        /* CREAR USUARIO */

        const [resultado] =
            await db.query(
                `
                INSERT INTO usuarios (
                    nombre,
                    usuario,
                    password,
                    rol,
                    activo
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    nombre,
                    usuario,
                    passwordHash,
                    rol,
                    activo
                ]
            );


        res.status(201).json({

            mensaje:
                "Usuario creado correctamente.",

            usuario: {

                id_usuario:
                    resultado.insertId,

                nombre,

                usuario,

                rol,

                activo

            }

        });


    } catch (error) {

        console.error(
            "Error creando usuario:",
            error
        );

        res.status(500).json({

            mensaje:
                "Error creando el usuario.",

            error:
                error.message

        });

    }

});
/* =========================
   CAMBIAR CONTRASEÑA
========================= */

/* CAMBIAR CONTRASEÑA */

app.put(
    "/usuarios/:id/password",
    async (req, res) => {

        try {

            const { id } = req.params;

            const {
                passwordActual,
                passwordNueva
            } = req.body;


            if (
                !passwordActual ||
                !passwordNueva
            ) {

                return res.status(400).json({

                    mensaje:
                        "Todos los campos son obligatorios."

                });

            }


            /* BUSCAR USUARIO */

            const [usuarios] =
                await db.query(

                    `
                    SELECT
                        id_usuario,
                        password

                    FROM usuarios

                    WHERE id_usuario = ?
                    `,

                    [id]

                );


            if (usuarios.length === 0) {

                return res.status(404).json({

                    mensaje:
                        "Usuario no encontrado."

                });

            }


            const usuario =
                usuarios[0];


            /* VERIFICAR CONTRASEÑA ACTUAL */

            const passwordCorrecta =
                await bcrypt.compare(

                    passwordActual,

                    usuario.password

                );


            if (!passwordCorrecta) {

                return res.status(400).json({

                    mensaje:
                        "La contraseña actual es incorrecta."

                });

            }


            /* ENCRIPTAR NUEVA CONTRASEÑA */

            const passwordHash =
                await bcrypt.hash(
                    passwordNueva,
                    10
                );


            /* ACTUALIZAR */

            await db.query(

                `
                UPDATE usuarios

                SET password = ?

                WHERE id_usuario = ?
                `,

                [

                    passwordHash,

                    id

                ]

            );


            res.json({

                mensaje:
                    "Contraseña actualizada correctamente."

            });


        } catch (error) {

            console.error(
                "Error cambiando contraseña:",
                error
            );


            res.status(500).json({

                mensaje:
                    "Error cambiando la contraseña."

            });

        }

    }
);

app.put("/usuarios/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            nombre,
            usuario,
            rol,
            activo
        } = req.body;


        console.log(
            "DATOS RECIBIDOS PARA ACTUALIZAR:",
            req.body
        );


        if (
            !nombre ||
            !usuario ||
            !rol
        ) {

            return res.status(400).json({

                mensaje:
                    "Nombre, usuario y rol son obligatorios."

            });

        }


        await db.query(

            `

            UPDATE usuarios

            SET

                nombre = ?,

                usuario = ?,

                rol = ?,

                activo = ?

            WHERE id_usuario = ?

            `,

            [

                nombre,

                usuario,

                rol,

                activo,

                id

            ]

        );


        res.json({

            mensaje:
                "Usuario actualizado correctamente."

        });


    } catch (error) {

        console.error(
            "Error actualizando usuario:",
            error
        );


        res.status(500).json({

            mensaje:
                "Error al actualizar el usuario.",

            error:
                error.message

        });

    }

});

/* =========================
   REGISTRAR ABONO
========================= */

app.post("/cartera/abono", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const {
            id_remision,
            valor,
            comentario,
            id_usuario
        } = req.body;


        /* =========================
           VALIDACIONES
        ========================= */

        if (!id_remision) {

            return res.status(400).json({

                mensaje: "No se recibió la remisión."

            });

        }


        if (!valor || Number(valor) <= 0) {

            return res.status(400).json({

                mensaje:
                    "El valor del abono debe ser mayor a cero."

            });

        }


        if (!id_usuario) {

            return res.status(400).json({

                mensaje: "No se recibió el usuario."

            });

        }


        await connection.beginTransaction();


        /* =========================
           CONSULTAR REMISIÓN
        ========================= */

        const [remisiones] = await connection.query(`

            SELECT

                id_remision,
                total,
                saldo_pendiente,
                estado

            FROM remisiones

            WHERE id_remision = ?

            FOR UPDATE

        `, [id_remision]);


        if (remisiones.length === 0) {

            throw new Error(
                "La remisión no existe."
            );

        }


        const remision = remisiones[0];


        /* =========================
           VALIDAR SALDO
        ========================= */

        const saldoPendiente =
            Number(remision.saldo_pendiente);


        const valorAbono =
            Number(valor);


        if (saldoPendiente <= 0) {

            throw new Error(
                "Esta remisión ya se encuentra pagada."
            );

        }


        if (valorAbono > saldoPendiente) {

            throw new Error(
                `El abono no puede ser mayor al saldo pendiente de $${saldoPendiente.toLocaleString("es-CO")}.`
            );

        }


        /* =========================
           REGISTRAR ABONO
        ========================= */

        await connection.query(`

            INSERT INTO abonos_remision (

                id_remision,
                valor,
                id_usuario,
                comentario

            )

            VALUES (?, ?, ?, ?)

        `, [

            id_remision,

            valorAbono,

            id_usuario,

            comentario?.trim() || null

        ]);


        /* =========================
           CALCULAR NUEVO SALDO
        ========================= */
let nuevoSaldo =
    saldoPendiente - valorAbono;

if (nuevoSaldo < 0) {

    nuevoSaldo = 0;

}


        /* =========================
           ACTUALIZAR REMISIÓN
        ========================= */

        await connection.query(`

            UPDATE remisiones

            SET

                saldo_pendiente = ?,

                estado = ?

            WHERE id_remision = ?

        `, [

            nuevoSaldo,

            nuevoSaldo <= 0
                ? "PAGADA"
                : "PENDIENTE",

            id_remision

        ]);


        await connection.commit();


        res.json({

            mensaje:
                nuevoSaldo <= 0
                    ? "Pago registrado. La remisión quedó totalmente pagada."
                    : "Abono registrado correctamente.",

            valor_abonado:
                valorAbono,

            saldo_pendiente:
                nuevoSaldo,

            pagada:
                nuevoSaldo <= 0

        });


    } catch (error) {

        await connection.rollback();

        console.error(
            "Error registrando abono:",
            error
        );


        res.status(400).json({

            mensaje:
                error.message ||
                "No se pudo registrar el abono."

        });


    } finally {

        connection.release();

    }

});

/* =========================
   DETALLE DE PRODUCTOS
========================= */

app.get(
    "/cartera/:id_remision/productos",
    async (req, res) => {

        try {

            const { id_remision } = req.params;


            const [productos] = await db.query(`

                SELECT

                    d.id_detalle,

                    d.id_producto,

                    d.placa,

                    d.precio_lista,

                    d.cantidad,

                    d.precio_venta,

                    d.total,

                    p.codigo,

                    p.nombre,

                    p.linea

                FROM detalle_remision d

                LEFT JOIN productos p
                    ON d.id_producto = p.id_producto

                WHERE d.id_remision = ?

                ORDER BY d.id_detalle ASC

            `, [id_remision]);


            res.json(productos);


        } catch (error) {

            console.error(
                "Error obteniendo productos de la remisión:",
                error
            );


            res.status(500).json({

                mensaje:
                    "No se pudieron cargar los productos de la remisión."

            });

        }

    }
);

/* =========================
   OBTENER ABONOS REMISIÓN
========================= */

app.get("/cartera/:id_remision/abonos", async (req, res) => {

    try {

        const { id_remision } = req.params;


        const [abonos] = await db.query(`

            SELECT

                a.id_abono,
                a.id_remision,
                a.valor,
                a.fecha,
                a.comentario,

                u.nombre AS usuario

            FROM abonos_remision a

            LEFT JOIN usuarios u
                ON a.id_usuario = u.id_usuario

            WHERE a.id_remision = ?

            ORDER BY a.fecha DESC

        `, [id_remision]);


        res.json(abonos);


    } catch (error) {

        console.error(
            "Error obteniendo abonos:",
            error
        );


        res.status(500).json({

            mensaje:
                "Error obteniendo los abonos.",

            error:
                error.message

        });

    }

});

/* =========================
   KPIs DE REPORTES
========================= */

app.get("/reportes/kpis", async (req, res) => {

    try {

        const {
            mes,
            anio
        } = req.query;


        /* =========================
           VALIDAR PERÍODO
        ========================= */

        if (!mes || !anio) {

            return res.status(400).json({

                mensaje:
                    "Debe enviar el mes y el año."

            });

        }


        const sql = `

            SELECT

                /* =========================
                   VENTAS DEL MES
                ========================= */

                COALESCE(
                    SUM(r.total),
                    0
                ) AS ventas_mes,


                /* =========================
                   TOTAL REMISIONES
                ========================= */

                COUNT(r.id_remision)
                    AS total_remisiones,


                /* =========================
                   CLIENTES ATENDIDOS
                ========================= */

                COUNT(
                    DISTINCT r.id_cliente
                ) AS clientes,


                /* =========================
                   CARTERA GENERADA
                ========================= */

                COALESCE(
                    SUM(
                        CASE

                            WHEN r.saldo_pendiente > 0

                            THEN r.saldo_pendiente

                            ELSE 0

                        END
                    ),
                    0
                ) AS cartera_generada


            FROM remisiones r


            WHERE

                r.estado <> 'ANULADA'

                AND MONTH(r.fecha) = ?

                AND YEAR(r.fecha) = ?

        `;


        const [resultado] = await db.query(

            sql,

            [
                Number(mes),
                Number(anio)
            ]

        );


        res.json(
            resultado[0]
        );


    } catch (error) {

        console.error(
            "Error cargando KPIs de reportes:",
            error
        );


        res.status(500).json({

            mensaje:
                "No se pudieron cargar los KPIs de reportes.",

            error:
                error.message

        });

    }

});

/* =========================
   REPORTES - RESUMEN
========================= */

app.get("/reportes/resumen", async (req, res) => {

    try {

        const [resultado] = await db.query(`

            SELECT

                /* =========================
                   VENTAS DEL MES
                ========================= */

                COALESCE(
                    SUM(
                        CASE

                            WHEN MONTH(fecha) = MONTH(CURDATE())

                            AND YEAR(fecha) = YEAR(CURDATE())

                            AND estado <> 'ANULADA'

                            THEN total

                            ELSE 0

                        END
                    ),
                    0
                ) AS ventas_mes,


                /* =========================
                   TOTAL REMISIONES DEL MES
                ========================= */

                COUNT(
                    CASE

                        WHEN MONTH(fecha) = MONTH(CURDATE())

                        AND YEAR(fecha) = YEAR(CURDATE())

                        AND estado <> 'ANULADA'

                        THEN 1

                        ELSE NULL

                    END
                ) AS total_remisiones,


                /* =========================
                   CLIENTES DEL MES
                ========================= */

                COUNT(
                    DISTINCT CASE

                        WHEN MONTH(fecha) = MONTH(CURDATE())

                        AND YEAR(fecha) = YEAR(CURDATE())

                        AND estado <> 'ANULADA'

                        THEN id_cliente

                        ELSE NULL

                    END
                ) AS clientes,


                /* =========================
                   CARTERA GENERADA
                ========================= */

                COALESCE(
                    SUM(
                        CASE

                            WHEN MONTH(fecha) = MONTH(CURDATE())

                            AND YEAR(fecha) = YEAR(CURDATE())

                            AND estado <> 'ANULADA'

                            THEN saldo_pendiente

                            ELSE 0

                        END
                    ),
                    0
                ) AS cartera_generada


            FROM remisiones

        `);


        res.json(
            resultado[0]
        );


    } catch (error) {

        console.error(
            "Error cargando resumen de reportes:",
            error
        );


        res.status(500).json({

            mensaje:
                "No se pudo cargar el resumen de reportes.",

            error:
                error.message

        });

    }

});

/* =========================
   INICIAR SERVIDOR
========================= */

app.listen(PORT, () => {

    console.log(
        `Servidor SIREM ejecutándose en http://localhost:${PORT}`
    );

});