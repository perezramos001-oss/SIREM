import express from "express";
import db from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const api = express.Router();

const PORT = process.env.PORT || 3001;

/* =========================
   CLAVE DE LOS TOKENS
========================= */

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(48).toString("hex");

  console.warn(
    "JWT_SECRET no está configurado. Se generó una clave temporal: las sesiones se cerrarán cada vez que se reinicie el servidor.",
  );
}

const DURACION_SESION = "12h";

/* =========================
   MIDDLEWARES
========================= */

app.use(express.json());

app.use("/api", api);

/* =========================
   AUTENTICACIÓN
========================= */

const RUTAS_PUBLICAS = ["/login", "/prueba"];

api.use(async (req, res, next) => {
  if (RUTAS_PUBLICAS.includes(req.path)) {
    return next();
  }

  const [tipo, token] = (req.headers.authorization || "").split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ mensaje: "Debes iniciar sesión." });
  }

  let datosToken;

  try {
    datosToken = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({
      mensaje: "La sesión expiró. Inicia sesión de nuevo.",
    });
  }

  const [usuarios] = await db.query(
    `
      SELECT id_usuario, nombre, usuario, rol, activo
      FROM usuarios
      WHERE id_usuario = ?
      LIMIT 1
    `,
    [datosToken.id_usuario],
  );

  if (usuarios.length === 0 || usuarios[0].activo !== 1) {
    return res.status(401).json({
      mensaje: "El usuario no existe o se encuentra inactivo.",
    });
  }

  req.usuario = usuarios[0];

  next();
});

const soloAdministrador = (req, res, next) => {
  if (req.usuario.rol !== "ADMINISTRADOR") {
    return res.status(403).json({
      mensaje: "Esta acción solo está permitida para administradores.",
    });
  }

  next();
};

/* =========================
   AUDITORÍA
========================= */

const registrarAuditoria = (
  ejecutor,
  idUsuario,
  accion,
  modulo,
  idReferencia,
  descripcion,
) =>
  ejecutor.query(
    `
      INSERT INTO auditoria (
          id_usuario,
          accion,
          modulo,
          id_referencia,
          descripcion
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [idUsuario, accion, modulo, idReferencia, descripcion],
  );

/* =========================
   PRUEBA DEL SERVIDOR
========================= */

api.get("/prueba", (req, res) => {
  res.json({
    mensaje: "Servidor SIREM funcionando correctamente",
  });
});

/* =========================
   FUNCIÓN AUXILIAR
   SIGUIENTE NÚMERO REMISIÓN
========================= */

/*
Con bloquear = true (dentro de una transacción) la consulta
bloquea la tabla hasta el commit, así dos remisiones creadas
al mismo tiempo no pueden recibir el mismo número.
*/

const obtenerSiguienteNumeroRemision = async (connection, bloquear = false) => {
  const [remisiones] = await connection.query(`
        SELECT numero_remision
        FROM remisiones
        ${bloquear ? "FOR UPDATE" : ""}
    `);

  let numeroMayor = 1032;

  for (const remision of remisiones) {
    const numero = parseInt(
      String(remision.numero_remision).replace(/\D/g, ""),
      10,
    );

    if (!isNaN(numero) && numero > numeroMayor) {
      numeroMayor = numero;
    }
  }

  const siguienteNumero = numeroMayor + 1;

  return `REM ${siguienteNumero}`;
};

/* =========================
   OBTENER SIGUIENTE
   NÚMERO DE REMISIÓN
========================= */

api.get("/remisiones/siguiente-numero", async (req, res) => {
  let connection;

  try {
    connection = await db.getConnection();

    const numeroRemision = await obtenerSiguienteNumeroRemision(connection);

    res.json({
      numero_remision: numeroRemision,
    });
  } catch (error) {
    console.error("Error obteniendo siguiente número de remisión:", error);

    res.status(500).json({
      mensaje: "No se pudo obtener el siguiente número de remisión.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/* =========================
   REMISIONES
========================= */
api.get("/remisiones", async (req, res) => {
  const { mes, anio } = req.query;

  if (!mes || !anio) {
    return res.status(400).json({
      mensaje: "Debes indicar mes y año.",
    });
  }

  try {
    const [remisiones] = await db.query(
      `

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
    CAST(
        REPLACE(r.numero_remision, 'REM ', '')
        AS UNSIGNED
    ) ASC,
    d.id_detalle ASC

        `,
      [mes, anio],
    );

    res.json(remisiones);
  } catch (error) {
    console.error("Error obteniendo remisiones:", error);

    res.status(500).json({
      mensaje: "Error obteniendo las remisiones",
      error: error.message,
    });
  }
});

/* =========================
   OBTENER REMISIÓN POR NÚMERO
   PARA IMPRIMIR
========================= */

api.get("/remisiones/buscar", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { numero } = req.query;

    if (!numero) {
      return res.status(400).json({
        mensaje: "Debes indicar el número de la remisión.",
      });
    }

    const numeroNormalizado = String(numero).replace(/\D/g, "");


    /* =========================
           DATOS DE LA REMISIÓN
        ========================= */

    const [remisiones] = await connection.query(
      `

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

                    c.nombre AS cliente,
                    c.ciudad,

                    co.nombre AS comercial

                FROM remisiones r

                LEFT JOIN clientes c
                    ON r.id_cliente = c.id_cliente

                LEFT JOIN comerciales co
                    ON r.id_comercial = co.id_comercial

                WHERE CAST(
    REPLACE(
        REPLACE(
            UPPER(TRIM(r.numero_remision)),
            'REM',
            ''
        ),
        ' ',
        ''
    ) AS UNSIGNED
) = ?

                LIMIT 1

            `,
      [numeroNormalizado],
    );

    /* =========================
           VALIDAR
        ========================= */

    if (remisiones.length === 0) {
      return res.status(404).json({
        mensaje: `No existe la remisión ${numeroNormalizado}.`,
      });
    }

    const remision = remisiones[0];

    /* =========================
           PRODUCTOS
        ========================= */

    const [productos] = await connection.query(
      `

                SELECT

                    d.id_detalle,
                    d.id_remision,
                    d.id_producto,

                    d.placa,
                    d.precio_lista,
                    d.cantidad,
                    d.precio_venta,

                    d.total AS total_producto,

                    p.codigo AS codigo_producto,
                    p.nombre AS nombre_producto,
                    p.linea AS linea_producto

                FROM detalle_remision d

                LEFT JOIN productos p
                    ON d.id_producto = p.id_producto

                WHERE d.id_remision = ?

                ORDER BY d.id_detalle ASC

            `,
      [remision.id_remision],
    );

    /* =========================
           RESPUESTA
        ========================= */

    res.json({
      remision: {
        ...remision,

        productos,
      },
    });
  } catch (error) {
    console.error("Error buscando remisión por número:", error);

    res.status(500).json({
      mensaje: "Error buscando la remisión.",

      error: error.message,
    });
  } finally {
    connection.release();
  }
});

/* =========================
   OBTENER REMISIÓN COMPLETA
   PARA EDITAR
========================= */

api.get("/remisiones/:id", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    /* =========================
           DATOS DE LA REMISIÓN
        ========================= */

    const [remisiones] = await connection.query(
      `

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

                c.nombre AS cliente,
                c.ciudad,

                co.nombre AS comercial

            FROM remisiones r

            LEFT JOIN clientes c
                ON r.id_cliente = c.id_cliente

            LEFT JOIN comerciales co
                ON r.id_comercial = co.id_comercial

            WHERE r.id_remision = ?

            LIMIT 1

        `,
      [id],
    );

    /* =========================
           VALIDAR REMISIÓN
        ========================= */

    if (remisiones.length === 0) {
      return res.status(404).json({
        mensaje: "La remisión no existe.",
      });
    }

    const remision = remisiones[0];

    /* =========================
           PRODUCTOS
        ========================= */

    const [productos] = await connection.query(
      `

            SELECT

                d.id_detalle,
                d.id_remision,
                d.id_producto,
                d.placa,
                d.precio_lista,
                d.cantidad,
                d.precio_venta,
                d.total AS total_producto,

                p.codigo AS codigo_producto,
                p.nombre AS nombre_producto,
                p.linea AS linea_producto

            FROM detalle_remision d

            LEFT JOIN productos p
                ON d.id_producto = p.id_producto

            WHERE d.id_remision = ?

            ORDER BY d.id_detalle ASC

        `,
      [id],
    );

    /* =========================
           ABONOS
        ========================= */

    const [abonos] = await connection.query(
      `

            SELECT

                id_abono,
                id_remision,
                valor,
                fecha,
                id_usuario,
                comentario

            FROM abonos_remision

            WHERE id_remision = ?

            ORDER BY fecha ASC, id_abono ASC

        `,
      [id],
    );

    /* =========================
           CONVERTIR ESTADO
        ========================= */

    let estadoPago = "pendiente";

    if (remision.estado === "PAGADA") {
      estadoPago = "pagada";
    } else if (remision.estado === "ABONO") {
      estadoPago = "abono";
    }

    /* =========================
           RESPUESTA
        ========================= */

    res.json({
      remision: {
        ...remision,

        estado_pago: estadoPago,

        productos,

        abonos,
      },
    });
  } catch (error) {
    console.error("Error obteniendo remisión para editar:", error);

    res.status(500).json({
      mensaje: "Error obteniendo la remisión.",

      error: error.message,
    });
  } finally {
    connection.release();
  }
});
/* =========================
   ACTUALIZAR REMISIÓN
========================= */

api.put("/remisiones/:id", soloAdministrador, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const { fecha, estado_pago, medio_pago, comentarios, productos } = req.body;

    const fechaFormateada = fecha ? String(fecha).substring(0, 10) : null;

    if (!fechaFormateada) {
      return res.status(400).json({
        mensaje: "La fecha de la remisión es obligatoria.",
      });
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        mensaje: "La remisión debe tener al menos un producto.",
      });
    }

    if (productos.some((producto) => !producto.id_producto)) {
      return res.status(400).json({
        mensaje: "Uno de los productos no tiene un producto válido seleccionado.",
      });
    }

    /* =========================
           VALIDAR REMISIÓN
        ========================= */

    const [remisionExiste] = await connection.query(
      `
            SELECT
                id_remision,
                numero_remision
            FROM remisiones
            WHERE id_remision = ?
            LIMIT 1
            `,
      [id],
    );

    if (remisionExiste.length === 0) {
      return res.status(404).json({
        mensaje: "La remisión no existe.",
      });
    }

    await connection.beginTransaction();

    /* =========================
           CONVERTIR ESTADO
        ========================= */

    let estado = "PENDIENTE";

    if (estado_pago === "pagada") {
      estado = "PAGADA";
    } else if (estado_pago === "abono") {
      estado = "ABONO";
    }

    /* =========================
           CALCULAR TOTAL
        ========================= */

    let total = 0;

    for (const producto of productos || []) {
      const cantidad = Number(producto.cantidad) || 0;

      const precio = Number(producto.precio_venta) || 0;

      total += cantidad * precio;
    }

    /* =========================
           CALCULAR SALDO
        ========================= */

    let saldoPendiente = total;

    if (estado === "PAGADA") {
      saldoPendiente = 0;
    } else {
      const [abonos] = await connection.query(
        `
                SELECT
                    COALESCE(SUM(valor), 0) AS total_abonos
                FROM abonos_remision
                WHERE id_remision = ?
                `,
        [id],
      );

      const totalAbonos = Number(abonos[0].total_abonos) || 0;

      saldoPendiente = Math.max(total - totalAbonos, 0);

      if (saldoPendiente <= 0) {
        estado = "PAGADA";
      } else if (totalAbonos > 0) {
        estado = "ABONO";
      }
    }

    /* =========================
           ACTUALIZAR REMISIÓN
        ========================= */
    await connection.query(
      `
    UPDATE remisiones

    SET
        fecha = ?,
        medio_pago = ?,
        comentarios = ?,
        estado = ?,
        total = ?,
        saldo_pendiente = ?

    WHERE id_remision = ?
    `,
      [
        fechaFormateada,
        medio_pago,
        comentarios || null,
        estado,
        total,
        saldoPendiente,
        id,
      ],
    );

    /* =========================
   ELIMINAR PRODUCTOS QUITADOS
========================= */

    const idsDetalles = (productos || [])
      .filter((producto) => producto.id_detalle)
      .map((producto) => producto.id_detalle);

    if (idsDetalles.length > 0) {
      const placeholders = idsDetalles.map(() => "?").join(",");

      await connection.query(
        `
        DELETE FROM detalle_remision
        WHERE id_remision = ?
        AND id_detalle NOT IN (${placeholders})
        `,
        [id, ...idsDetalles],
      );
    } else {
      await connection.query(
        `
        DELETE FROM detalle_remision
        WHERE id_remision = ?
        `,
        [id],
      );
    }

    /* =========================
   ACTUALIZAR / INSERTAR PRODUCTOS
========================= */

    for (const producto of productos || []) {
      const cantidad = Number(producto.cantidad) || 0;

      const precio = Number(producto.precio_venta) || 0;

      const totalProducto = cantidad * precio;

      /* =========================
       PRODUCTO NUEVO
    ========================= */

      if (!producto.id_detalle) {
        await connection.query(
          `
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
            `,
          [
            id,
            producto.id_producto,
            producto.placa || null,
            Number(producto.precio_lista) || 0,
            cantidad,
            precio,
            totalProducto,
          ],
        );
      } else {
        /* =========================
       PRODUCTO EXISTENTE
    ========================= */
        await connection.query(
          `
            UPDATE detalle_remision

            SET
                placa = ?,
                cantidad = ?,
                precio_venta = ?,
                total = ?

            WHERE id_detalle = ?
            AND id_remision = ?
            `,
          [
            producto.placa || null,
            cantidad,
            precio,
            totalProducto,
            producto.id_detalle,
            id,
          ],
        );
      }
    }

    await registrarAuditoria(
      connection,
      req.usuario.id_usuario,
      "EDITAR",
      "REMISIONES",
      id,
      `Editó la remisión ${remisionExiste[0].numero_remision}`,
    );

    await connection.commit();

    res.json({
      mensaje: "Remisión actualizada correctamente.",
      total,
      saldo_pendiente: saldoPendiente,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Error actualizando remisión:", error);

    res.status(500).json({
      mensaje: "Error actualizando la remisión.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});
/* =========================
   CREAR REMISIÓN
========================= */

api.post("/remisiones", async (req, res) => {
  const connection = await db.getConnection();

  try {
    /* =========================
           RECIBIR DATOS
        ========================= */

    const {
      fecha,
      id_cliente,
      id_comercial,
      estado_pago,
      medio_pago,
      abonos,
      comentarios,
      productos,
    } = req.body;

    /* =========================
   VALIDACIONES GENERALES
========================= */

    if (!fecha || !id_cliente || !id_comercial || !estado_pago) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios de la remisión.",
      });
    }

    /* =========================
   VALIDAR ESTADO DE PAGO
========================= */

    const estadosPermitidos = ["pagada", "abono", "pendiente"];

    if (!estadosPermitidos.includes(estado_pago)) {
      return res.status(400).json({
        mensaje: "El estado de pago no es válido.",
      });
    }

    /* =========================
   VALIDAR MÉTODO DE PAGO
   SOLO PARA PAGADA
========================= */

    if (estado_pago === "pagada" && !medio_pago) {
      return res.status(400).json({
        mensaje:
          "Debes seleccionar un método de pago para una remisión pagada.",
      });
    }

    /* =========================
   VALIDAR ABONOS
========================= */

    if (estado_pago === "abono") {
      if (!abonos || !Array.isArray(abonos) || abonos.length === 0) {
        return res.status(400).json({
          mensaje: "Debes registrar al menos un abono.",
        });
      }
    }
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        mensaje: "La remisión debe tener al menos un producto.",
      });
    }

    /* =========================
   DEFINIR ESTADO Y SALDO
========================= */

    let estado;
    let saldoPendiente;
    let totalAbonado = 0;

    /* El total se calcula aquí con los productos, igual que el detalle,
       en lugar de confiar en el que envía el navegador. */
    const totalRemision = productos.reduce(
      (suma, producto) =>
        suma +
        (Number(producto.cantidad) || 0) * (Number(producto.precio_venta) || 0),
      0,
    );

    /* =========================
   PAGADA
========================= */

    if (estado_pago === "pagada") {
      estado = "PAGADA";

      totalAbonado = totalRemision;

      saldoPendiente = 0;
    } else if (estado_pago === "abono") {
      /* =========================
   ABONO / PARCIAL
========================= */
      estado = "ABONO";

      totalAbonado = Array.isArray(abonos)
        ? abonos.reduce((suma, abono) => suma + (Number(abono.valor) || 0), 0)
        : 0;

      if (totalAbonado > totalRemision) {
        return res.status(400).json({
          mensaje: "Los abonos no pueden superar el total de la remisión.",
        });
      }

      saldoPendiente = Math.max(totalRemision - totalAbonado, 0);

      if (saldoPendiente <= 0) {
        estado = "PAGADA";
      }
    } else {
      /* =========================
   PENDIENTE
========================= */
      estado = "PENDIENTE";

      totalAbonado = 0;

      saldoPendiente = totalRemision;
    }

    /* =========================
           INICIAR TRANSACCIÓN
        ========================= */

    await connection.beginTransaction();

    const numero_remision = await obtenerSiguienteNumeroRemision(
      connection,
      true,
    );

    /* =========================
           INSERTAR REMISIÓN
        ========================= */

    const [resultadoRemision] = await connection.query(
      `

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

        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

    `,
      [
        numero_remision,
        fecha,
        id_cliente,
        id_comercial,
        medio_pago || null,
        totalRemision,
        saldoPendiente,
        comentarios || null,
        estado,
      ],
    );

    const idRemision = resultadoRemision.insertId;

    /* =========================
           INSERTAR PRODUCTOS
        ========================= */

    for (const producto of productos) {
      /* VALIDAR PRODUCTO */

      if (!producto.id_producto) {
        throw new Error(
          "Uno de los productos no tiene un producto válido seleccionado.",
        );
      }

      const cantidad = Number(producto.cantidad) || 0;

      const precioVenta = Number(producto.precio_venta) || 0;

      const totalProducto = cantidad * precioVenta;

      await connection.query(
        `

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

            `,
        [
          idRemision,
          producto.id_producto,
          producto.placa || null,
          Number(producto.precio_lista) || 0,
          cantidad,
          precioVenta,
          totalProducto,
        ],
      );
    }
    /* =========================
   INSERTAR ABONOS
========================= */

    if (estado_pago === "abono" && Array.isArray(abonos) && abonos.length > 0) {
      for (const abono of abonos) {
        const valorAbono = Number(abono.valor) || 0;

        if (valorAbono <= 0) {
          throw new Error("Uno de los abonos tiene un valor inválido.");
        }

        if (!abono.medioPago) {
          throw new Error("Uno de los abonos no tiene método de pago.");
        }

        await connection.query(
          `

            INSERT INTO abonos_remision (

                id_remision,
                valor,
                medio_pago,
                comprobante,
                fecha,
                id_usuario,
                comentario

            )

            VALUES (?, ?, ?, ?, ?, ?, ?)

        `,
          [
            idRemision,
            valorAbono,
            abono.medioPago,
            abono.comprobante || null,
            abono.fecha || new Date(),
            req.usuario.id_usuario,
            null,
          ],
        );
      }
    }

    /* =========================
   REGISTRAR AUDITORÍA
========================= */

    await registrarAuditoria(
      connection,
      req.usuario.id_usuario,
      "CREAR",
      "REMISIONES",
      idRemision,
      `Registró la remisión ${numero_remision}`,
    );

    /* =========================
           CONFIRMAR TRANSACCIÓN
        ========================= */

    await connection.commit();

    /* =========================
           RESPUESTA
        ========================= */

    res.status(201).json({
      mensaje: "Remisión creada correctamente.",

      id_remision: idRemision,

      numero_remision: numero_remision,
    });
  } catch (error) {
    /* =========================
           DESHACER CAMBIOS
        ========================= */

    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Error al revertir la transacción:", rollbackError);
    }

    console.error("Error creando remisión:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje:
          "Ese número de remisión ya fue usado. Intenta guardar de nuevo.",
      });
    }

    res.status(500).json({
      mensaje: error.message || "Error creando la remisión.",
    });
  } finally {
    connection.release();
  }
});

/* =========================
   DATOS PARA EXPORTAR REMISIONES
========================= */

api.get("/exportaciones/remisiones", async (req, res) => {
  try {
    const { periodo } = req.query;

    if (!periodo) {
      return res.status(400).json({
        mensaje: "Debes indicar el período.",
      });
    }

    /* =========================
               SEPARAR MES Y AÑO
            ========================= */

    const partes = periodo.split(" ");

    const nombreMes = partes[0].toLowerCase();

    const anio = Number(partes[1]);

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
      diciembre: 12,
    };

    const mes = meses[nombreMes];

    if (!mes || !anio) {
      return res.status(400).json({
        mensaje: "El período seleccionado no es válido.",
      });
    }

    /* =========================
               CONSULTAR REMISIONES
            ========================= */

    const [remisiones] = await db.query(
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

      [mes, anio],
    );


    res.json({
      periodo,

      cantidad_remisiones: new Set(
        remisiones.map((remision) => remision.id_remision),
      ).size,

      remisiones,
    });
  } catch (error) {
    console.error("Error obteniendo remisiones para exportar:", error);

    res.status(500).json({
      mensaje: "No se pudieron obtener las remisiones.",

      error: error.message,
    });
  }
});

/* =========================
   LOGIN
========================= */

/*
Límite de intentos: después de 3 contraseñas incorrectas seguidas
el usuario queda bloqueado 15 minutos. Se guarda en memoria, así
que reiniciar el servidor limpia los bloqueos.
*/

const MAX_INTENTOS_LOGIN = 3;

const MINUTOS_BLOQUEO_LOGIN = 15;

const intentosLogin = new Map();

const minutosBloqueoRestantes = (clave) => {
  const registro = intentosLogin.get(clave);

  if (!registro?.bloqueadoHasta) {
    return 0;
  }

  const restante = registro.bloqueadoHasta - Date.now();

  if (restante <= 0) {
    intentosLogin.delete(clave);

    return 0;
  }

  return Math.ceil(restante / 60000);
};

/* Devuelve cuántos intentos le quedan (0 = quedó bloqueado) */

const registrarIntentoFallido = (clave) => {
  const registro = intentosLogin.get(clave) || { fallidos: 0 };

  registro.fallidos += 1;

  if (registro.fallidos >= MAX_INTENTOS_LOGIN) {
    registro.bloqueadoHasta = Date.now() + MINUTOS_BLOQUEO_LOGIN * 60000;
  }

  intentosLogin.set(clave, registro);

  return Math.max(MAX_INTENTOS_LOGIN - registro.fallidos, 0);
};

const mensajeBloqueo = (minutos) =>
  `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} ${
    minutos === 1 ? "minuto" : "minutos"
  }.`;

api.post("/login", async (req, res) => {
  try {
    const { usuario, password } = req.body;

    /* =========================
           VALIDAR DATOS
        ========================= */

    if (!usuario || !password) {
      return res.status(400).json({
        mensaje: "Usuario y contraseña son obligatorios.",
      });
    }

    const claveIntentos = String(usuario).trim().toLowerCase();

    const minutosBloqueo = minutosBloqueoRestantes(claveIntentos);

    if (minutosBloqueo > 0) {
      return res.status(429).json({
        mensaje: mensajeBloqueo(minutosBloqueo),
      });
    }

    /* Respuesta para usuario inexistente o contraseña incorrecta */

    const responderCredencialesIncorrectas = () => {
      const restantes = registrarIntentoFallido(claveIntentos);

      if (restantes === 0) {
        return res.status(429).json({
          mensaje: mensajeBloqueo(MINUTOS_BLOQUEO_LOGIN),
        });
      }

      return res.status(401).json({
        mensaje: `Usuario o contraseña incorrectos. Te ${
          restantes === 1 ? "queda 1 intento" : `quedan ${restantes} intentos`
        }.`,
      });
    };

    /* =========================
           BUSCAR USUARIO
        ========================= */

    const [usuarios] = await db.query(
      `

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

        `,
      [usuario],
    );

    if (usuarios.length === 0) {
      return responderCredencialesIncorrectas();
    }

    const usuarioBD = usuarios[0];

    /* =========================
           VERIFICAR ESTADO
        ========================= */

    if (usuarioBD.activo !== 1) {
      return res.status(403).json({
        mensaje: "Este usuario se encuentra inactivo.",
      });
    }

    /* =========================
           VERIFICAR CONTRASEÑA
        ========================= */

    const passwordCorrecta = await bcrypt.compare(password, usuarioBD.password);

    if (!passwordCorrecta) {
      return responderCredencialesIncorrectas();
    }

    intentosLogin.delete(claveIntentos);

    /* =========================
           GENERAR TOKEN
        ========================= */

    const token = jwt.sign({ id_usuario: usuarioBD.id_usuario }, JWT_SECRET, {
      expiresIn: DURACION_SESION,
    });

    await registrarAuditoria(
      db,
      usuarioBD.id_usuario,
      "INICIAR_SESION",
      "SESION",
      usuarioBD.id_usuario,
      "Inició sesión",
    );

    /* =========================
           RESPUESTA
        ========================= */

    res.json({
      mensaje: "Inicio de sesión correcto.",

      token,

      usuario: {
        id_usuario: usuarioBD.id_usuario,

        nombre: usuarioBD.nombre,

        usuario: usuarioBD.usuario,

        rol: usuarioBD.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);

    res.status(500).json({
      mensaje: "Error interno del servidor.",
    });
  }
});

/* =========================
   WORLD OFFICE
========================= */

api.post("/remisiones/world-office", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id_remisiones, codigo_world_office, password } = req.body;

    const usuario = req.usuario;

    /* =========================
           VALIDACIONES
        ========================= */

    if (!Array.isArray(id_remisiones) || id_remisiones.length === 0) {
      return res.status(400).json({
        mensaje: "No hay remisiones seleccionadas.",
      });
    }

    if (!codigo_world_office || !codigo_world_office.trim()) {
      return res.status(400).json({
        mensaje: "El código de World Office es obligatorio.",
      });
    }

    /* =========================
           VALIDAR ROL
        ========================= */

    if (usuario.rol !== "ADMINISTRADOR") {
      return res.status(403).json({
        mensaje:
          "Solo los administradores pueden confirmar movimientos de World Office.",
      });
    }

    /* =========================
           CONFIRMAR CONTRASEÑA
        ========================= */

    const [[credenciales]] = await connection.query(
      "SELECT password FROM usuarios WHERE id_usuario = ?",
      [usuario.id_usuario],
    );

    if (!password || !(await bcrypt.compare(password, credenciales.password))) {
      return res.status(403).json({
        mensaje: "La contraseña es incorrecta.",
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

      const [remisiones] = await connection.query(
        `

                SELECT
                    id_remision

                FROM remisiones

                WHERE id_remision = ?

                LIMIT 1

            `,
        [idRemision],
      );

      if (remisiones.length === 0) {
        throw new Error(`La remisión ${idRemision} no existe.`);
      }

      // Verificar si ya fue pasada a World Office

      const [worldOffice] = await connection.query(
        `

                SELECT
                    id_wo

                FROM remisiones_world_office

                WHERE id_remision = ?

                LIMIT 1

            `,
        [idRemision],
      );

      if (worldOffice.length > 0) {
        throw new Error(
          `La remisión ${idRemision} ya fue pasada a World Office.`,
        );
      }
    }

    /* =========================
           REGISTRAR WORLD OFFICE
        ========================= */

    for (const idRemision of id_remisiones) {
      await connection.query(
        `

                INSERT INTO remisiones_world_office (

                    id_remision,
                    codigo_world_office,
                    id_usuario

                )

                VALUES (?, ?, ?)

            `,
        [idRemision, codigo_world_office.trim(), usuario.id_usuario],
      );
    }

    await registrarAuditoria(
      connection,
      usuario.id_usuario,
      "WORLD_OFFICE",
      "REMISIONES",
      null,
      `Pasó ${id_remisiones.length} remisión(es) a World Office con el código ${codigo_world_office.trim()}`,
    );

    /* =========================
           CONFIRMAR
        ========================= */

    await connection.commit();

    res.json({
      mensaje: "Movimiento de World Office registrado correctamente.",

      usuario: usuario.nombre,

      codigo_world_office: codigo_world_office.trim(),

      remisiones: id_remisiones,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Error registrando World Office:", error);

    res.status(500).json({
      mensaje:
        error.message || "Error registrando el movimiento de World Office.",
    });
  } finally {
    connection.release();
  }
});

/* =========================
   INICIO - KPIS
========================= */

api.get("/inicio", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    if (!mes || !anio) {
      return res.status(400).json({
        mensaje: "Debes indicar mes y año.",
      });
    }

    /*
        =========================
        MES ACTUAL
        =========================
        */

    const [kpisMes] = await db.query(
      `

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

        `,
      [mes, anio],
    );

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

    const [kpisMesAnterior] = await db.query(
      `

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

        `,
      [mesAnterior, anioAnterior],
    );

    /*
        =========================
        VARIACIÓN VENTAS
        =========================

        Fórmula:

        ((actual - anterior) / anterior) * 100
        */

    const ventasActual = Number(kpisMes[0].ventas_mes || 0);

    const ventasAnterior = Number(kpisMesAnterior[0].ventas_mes_anterior || 0);

    let variacionVentas = null;

    if (ventasAnterior > 0) {
      variacionVentas = Number(
        (((ventasActual - ventasAnterior) / ventasAnterior) * 100).toFixed(1),
      );
    }

    /*
        =========================
        VARIACIÓN REMISIONES
        =========================
        */

    const remisionesActual = Number(kpisMes[0].total_remisiones || 0);

    const remisionesAnterior = Number(
      kpisMesAnterior[0].remisiones_mes_anterior || 0,
    );

    let variacionRemisiones = null;

    if (remisionesAnterior > 0) {
      variacionRemisiones = Number(
        (
          ((remisionesActual - remisionesAnterior) / remisionesAnterior) *
          100
        ).toFixed(1),
      );
    }

    /*
        =========================
        VARIACIÓN CLIENTES
        =========================
        */

    const clientesActual = Number(kpisMes[0].total_clientes || 0);

    const clientesAnterior = Number(
      kpisMesAnterior[0].clientes_mes_anterior || 0,
    );

    let variacionClientes = null;

    if (clientesAnterior > 0) {
      variacionClientes = Number(
        (
          ((clientesActual - clientesAnterior) / clientesAnterior) *
          100
        ).toFixed(1),
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

    /*
    Cartera generada en un mes: lo que sigue pendiente de las
    remisiones de ese mes. Se compara el mes seleccionado con
    el anterior usando la misma medida.
    */

    const consultarCarteraGenerada = async (mesConsulta, anioConsulta) => {
      const [[fila]] = await db.query(
        `
          SELECT COALESCE(SUM(r.saldo_pendiente), 0) AS cartera_generada
          FROM remisiones r
          WHERE r.saldo_pendiente > 0
            AND r.estado <> 'ANULADA'
            AND MONTH(r.fecha) = ?
            AND YEAR(r.fecha) = ?
        `,
        [mesConsulta, anioConsulta],
      );

      return Number(fila.cartera_generada || 0);
    };

    const carteraActual = await consultarCarteraGenerada(mes, anio);

    const carteraAnterior = await consultarCarteraGenerada(
      mesAnterior,
      anioAnterior,
    );

    let variacionCartera = null;

    if (carteraAnterior > 0) {
      variacionCartera =
        ((carteraActual - carteraAnterior) / carteraAnterior) * 100;
    }

    /*
        =========================
        RESPUESTA
        =========================
        */

    res.json({
      ventas_mes: ventasActual,

      total_remisiones: remisionesActual,

      total_clientes: clientesActual,

      cartera_total: Number(cartera[0].cartera_total || 0),

      cartera_mes: carteraActual,

      cuentas_pendientes: Number(cartera[0].cuentas_pendientes || 0),

      variacion_ventas: variacionVentas,

      variacion_remisiones: variacionRemisiones,

      variacion_clientes: variacionClientes,

      variacion_cartera: variacionCartera,
    });
  } catch (error) {
    console.error("Error obteniendo KPIs de Inicio:", error);

    res.status(500).json({
      mensaje: "Error obteniendo los KPIs de Inicio.",

      error: error.message,
    });
  }
});

/* =========================
   INICIO - ÚLTIMAS REMISIONES
========================= */

api.get("/inicio/ultimas-remisiones", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    if (!mes || !anio) {
      return res.status(400).json({
        mensaje: "Debes indicar mes y año.",
      });
    }

    const [remisiones] = await db.query(
      `

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

            LIMIT 5

        `,
      [mes, anio],
    );

    res.json(remisiones);
  } catch (error) {
    console.error("Error obteniendo últimas remisiones:", error);

    res.status(500).json({
      mensaje: "Error obteniendo últimas remisiones.",

      error: error.message,
    });
  }
});

/* =========================
   INICIO - CARTERA VENCIDA
========================= */

api.get("/inicio/cartera-vencida", async (req, res) => {
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


            LIMIT 5

        `);

    res.json(cartera);
  } catch (error) {
    console.error("Error obteniendo cartera vencida:", error);

    res.status(500).json({
      mensaje: "Error obteniendo cartera vencida.",

      error: error.message,
    });
  }
});

api.get("/notificaciones/cartera-vencida", async (req, res) => {
  try {
    const { id_usuario } = req.usuario;

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
      const [existente] = await db.query(
        `

                SELECT id_notificacion

                FROM notificaciones

                WHERE id_usuario = ?
                AND id_remision = ?

                LIMIT 1

            `,
        [id_usuario, remision.id_remision],
      );

      if (existente.length === 0) {
        await db.query(
          `

                    INSERT INTO notificaciones (

                        id_usuario,
                        id_remision,
                        tipo,
                        titulo,
                        mensaje,
                        leida

                    )

                    VALUES (?, ?, ?, ?, ?, 0)

                `,
          [
            id_usuario,

            remision.id_remision,

            "alerta",

            "Cartera vencida",

            `${remision.cliente} tiene la remisión ` +
              `${remision.numero_remision} con un saldo pendiente de ` +
              `$${Number(remision.saldo_pendiente).toLocaleString("es-CO")}.`,
          ],
        );
      }
    }

    /* =========================================
           OBTENER NOTIFICACIONES DEL USUARIO
        ========================================= */

    const [notificaciones] = await db.query(
      `

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

        `,
      [id_usuario],
    );

    res.json(notificaciones);
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);

    res.status(500).json({
      mensaje: "Error obteniendo notificaciones.",

      error: error.message,
    });
  }
});

api.put("/notificaciones/:id_notificacion/leida", async (req, res) => {
  try {
    const { id_notificacion } = req.params;

    await db.query(
      `

                UPDATE notificaciones

                SET leida = 1

                WHERE id_notificacion = ?
                AND id_usuario = ?

            `,
      [id_notificacion, req.usuario.id_usuario],
    );

    res.json({
      mensaje: "Notificación marcada como leída.",
    });
  } catch (error) {
    console.error("Error marcando notificación como leída:", error);

    res.status(500).json({
      mensaje: "Error marcando notificación como leída.",
    });
  }
});
/* =========================
   INICIO - RENDIMIENTO COMERCIALES
========================= */

api.get("/inicio/rendimiento-comerciales", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    if (!mes || !anio) {
      return res.status(400).json({
        mensaje: "Debes indicar mes y año.",
      });
    }

    const [comerciales] = await db.query(
      `

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

        `,
      [mes, anio],
    );

    res.json(comerciales);
  } catch (error) {
    console.error("Error obteniendo rendimiento de comerciales:", error);

    res.status(500).json({
      mensaje: "Error obteniendo rendimiento de comerciales.",

      error: error.message,
    });
  }
});

// ================================
// CLIENTES
// ================================

api.get("/clientes/buscar/:texto", async (req, res) => {
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
      [texto, texto, texto],
    );

    res.json(clientes);
  } catch (error) {
    console.error("Error buscando clientes:", error);

    res.status(500).json({
      mensaje: "Error buscando clientes.",
      error: error.message,
    });
  }
});

// ================================
// CREAR CLIENTE
// ================================

api.post("/clientes", async (req, res) => {
  try {
    const {
      nombre,
      tipo_documento,
      documento,
      ciudad,
      telefono,
      correo,
      direccion,
    } = req.body;

    if (!nombre || !tipo_documento || !documento) {
      return res.status(400).json({
        mensaje: "Nombre, tipo de documento y documento son obligatorios.",
      });
    }

    const [resultado] = await db.query(
      `
            INSERT INTO clientes (
                nombre,
                tipo_documento,
                documento,
                ciudad,
                telefono,
                correo,
                direccion
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
      [
        nombre.trim(),
        tipo_documento,
        documento.trim(),
        ciudad?.trim() || null,
        telefono?.trim() || null,
        correo?.trim() || null,
        direccion?.trim() || null,
      ],
    );

    await registrarAuditoria(
      db,
      req.usuario.id_usuario,
      "CREAR",
      "CLIENTES",
      resultado.insertId,
      `Creó el cliente ${nombre.trim()}`,
    );

    res.status(201).json({
      mensaje: "Cliente creado correctamente.",
      id_cliente: resultado.insertId,
    });
  } catch (error) {
    console.error("Error creando cliente:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje: "Ya existe un cliente con ese documento.",
      });
    }

    res.status(500).json({
      mensaje: "Error creando cliente.",
      error: error.message,
    });
  }
});

/* =========================
   COMERCIALES
========================= */

api.get("/comerciales", async (req, res) => {
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
    console.error("Error obteniendo comerciales:", error);

    res.status(500).json({
      mensaje: "Error obteniendo comerciales.",
      error: error.message,
    });
  }
});

// ================================
// LISTAR Y BUSCAR CLIENTES
// ================================

api.get("/clientes", async (req, res) => {
  try {
    const pagina = Math.max(Number(req.query.page) || 1, 1);

    const limite = 20;

    const offset = (pagina - 1) * limite;

    const busqueda = (req.query.busqueda || "").trim();

    // ================================
    // CONDICIÓN DE BÚSQUEDA
    // ================================

    let where = "";
    let parametrosBusqueda = [];

    if (busqueda) {
      where = `
                WHERE
                    nombre LIKE ?
                    OR documento LIKE ?
                    OR telefono LIKE ?
            `;

      const texto = `%${busqueda}%`;

      parametrosBusqueda = [texto, texto, texto];
    }

    // ================================
    // TOTAL
    // ================================

    const [[resultadoTotal]] = await db.query(
      `
                SELECT COUNT(*) AS total
                FROM clientes
                ${where}
                `,
      parametrosBusqueda,
    );

    const total = Number(resultadoTotal.total) || 0;

    // ================================
    // CLIENTES
    // ================================

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
                ${where}
                ORDER BY nombre ASC
                LIMIT ? OFFSET ?
                `,
      [...parametrosBusqueda, limite, offset],
    );

    // ================================
    // RESPUESTA
    // ================================

    res.json({
      clientes,

      total,

      pagina,

      limite,

      totalPaginas: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error("Error obteniendo clientes:", error);

    res.status(500).json({
      mensaje: "Error obteniendo clientes.",

      error: error.message,
    });
  }
});

// ================================
// ACTUALIZAR CLIENTE
// ================================

api.put("/clientes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombre,
      tipo_documento,
      documento,
      ciudad,
      telefono,
      correo,
      direccion,
    } = req.body;

    if (!nombre || !tipo_documento || !documento) {
      return res.status(400).json({
        mensaje: "Nombre, tipo de documento y documento son obligatorios.",
      });
    }

    const [resultado] = await db.query(
      `
            UPDATE clientes
            SET
                nombre = ?,
                tipo_documento = ?,
                documento = ?,
                ciudad = ?,
                telefono = ?,
                correo = ?,
                direccion = ?
            WHERE id_cliente = ?
        `,
      [
        nombre.trim(),
        tipo_documento,
        documento.trim(),
        ciudad?.trim() || null,
        telefono?.trim() || null,
        correo?.trim() || null,
        direccion?.trim() || null,
        id,
      ],
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Cliente no encontrado.",
      });
    }

    await registrarAuditoria(
      db,
      req.usuario.id_usuario,
      "EDITAR",
      "CLIENTES",
      id,
      `Editó el cliente ${nombre.trim()}`,
    );

    res.json({
      mensaje: "Cliente actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando cliente:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje: "Ya existe otro cliente con ese documento.",
      });
    }

    res.status(500).json({
      mensaje: "Error actualizando cliente.",
      error: error.message,
    });
  }
});

// ================================
// DESACTIVAR CLIENTE
// ================================

api.delete("/clientes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [resultado] = await db.query(
      `
            UPDATE clientes
            SET activo = 0
            WHERE id_cliente = ?
        `,
      [id],
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Cliente no encontrado.",
      });
    }

    const [[registro]] = await db.query(
      "SELECT nombre FROM clientes WHERE id_cliente = ?",
      [id],
    );

    await registrarAuditoria(
      db,
      req.usuario.id_usuario,
      "DESACTIVAR",
      "CLIENTES",
      id,
      `Desactivó el cliente ${registro.nombre}`,
    );

    res.json({
      mensaje: "Cliente desactivado correctamente.",
    });
  } catch (error) {
    console.error("Error desactivando cliente:", error);

    res.status(500).json({
      mensaje: "Error desactivando cliente.",
      error: error.message,
    });
  }
});

/* =========================
   AUDITORÍA
========================= */

api.get("/auditoria", soloAdministrador, async (req, res) => {
  try {
    const [registros] = await db.query(`
            SELECT
                a.id_auditoria,
                a.id_usuario,
                u.nombre AS usuario,
                u.rol,
                a.accion,
                a.modulo,
                a.id_referencia,
                a.descripcion,
                a.fecha

            FROM auditoria a

            LEFT JOIN usuarios u
                ON a.id_usuario = u.id_usuario

            ORDER BY a.fecha DESC
        `);

    res.json(registros);
  } catch (error) {
    console.error("Error obteniendo auditoría:", error);

    res.status(500).json({
      mensaje: "Error obteniendo registros de auditoría.",
      error: error.message,
    });
  }
});

/* =========================
   ADMINISTRAR PRODUCTOS
========================= */

/* =========================
   LISTAR PRODUCTOS
   CON PAGINACIÓN Y BÚSQUEDA
========================= */

api.get("/productos", async (req, res) => {
  try {
    const pagina = Math.max(parseInt(req.query.page) || 1, 1);

    const limite = 20;

    const busqueda = String(req.query.busqueda || "").trim();

    const offset = (pagina - 1) * limite;

    /* =========================
           CONDICIONES
        ========================= */

    let where = "";
    const parametros = [];

    if (busqueda) {
      where = `
                WHERE
                    codigo LIKE ?
                    OR nombre LIKE ?
                    OR linea LIKE ?
            `;

      const texto = `%${busqueda}%`;

      parametros.push(texto, texto, texto);
    }

    /* =========================
           TOTAL DE PRODUCTOS
        ========================= */

    const [totalResultado] = await db.query(
      `
                SELECT COUNT(*) AS total
                FROM productos
                ${where}
                `,
      parametros,
    );

    const total = Number(totalResultado[0].total) || 0;

    const totalPaginas = Math.ceil(total / limite);

    /* =========================
           PRODUCTOS DE LA PÁGINA
        ========================= */

    const [productos] = await db.query(
      `
                SELECT
                    id_producto,
                    codigo,
                    nombre,
                    linea,
                    precio_lista,
                    activo
                FROM productos
                ${where}
                ORDER BY nombre ASC
                LIMIT ? OFFSET ?
                `,
      [...parametros, limite, offset],
    );

    res.json({
      productos,
      total,
      totalPaginas,
      pagina,
    });
  } catch (error) {
    console.error("Error obteniendo productos:", error);

    res.status(500).json({
      mensaje: "Error obteniendo productos.",
      error: error.message,
    });
  }
});

/* =========================
   CREAR PRODUCTO
========================= */

api.post("/productos", async (req, res) => {
  try {
    const { codigo, nombre, linea, precio_lista } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({
        mensaje: "Código y nombre son obligatorios.",
      });
    }

    const [resultado] = await db.query(
      `
            INSERT INTO productos (
                codigo,
                nombre,
                linea,
                precio_lista,
                activo
            )
            VALUES (?, ?, ?, ?, 1)
        `,
      [
        codigo.trim(),
        nombre.trim(),
        linea?.trim() || null,
        Number(precio_lista) || 0,
      ],
    );

    await registrarAuditoria(
      db,
      req.usuario.id_usuario,
      "CREAR",
      "PRODUCTOS",
      resultado.insertId,
      `Creó el producto ${codigo.trim()} - ${nombre.trim()}`,
    );

    res.status(201).json({
      mensaje: "Producto creado correctamente.",
      id_producto: resultado.insertId,
    });
  } catch (error) {
    console.error("Error creando producto:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje: "Ya existe un producto con ese código.",
      });
    }

    res.status(500).json({
      mensaje: "Error creando producto.",
      error: error.message,
    });
  }
});

/* =========================
   ACTUALIZAR PRODUCTO
========================= */

api.put("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { codigo, nombre, linea, precio_lista } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({
        mensaje: "Código y nombre son obligatorios.",
      });
    }

    const [resultado] = await db.query(
      `
            UPDATE productos
            SET
                codigo = ?,
                nombre = ?,
                linea = ?,
                precio_lista = ?
            WHERE id_producto = ?
        `,
      [
        codigo.trim(),
        nombre.trim(),
        linea?.trim() || null,
        Number(precio_lista) || 0,
        id,
      ],
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Producto no encontrado.",
      });
    }

    await registrarAuditoria(
      db,
      req.usuario.id_usuario,
      "EDITAR",
      "PRODUCTOS",
      id,
      `Editó el producto ${codigo.trim()} - ${nombre.trim()}`,
    );

    res.json({
      mensaje: "Producto actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando producto:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje: "Ya existe otro producto con ese código.",
      });
    }

    res.status(500).json({
      mensaje: "Error actualizando producto.",
      error: error.message,
    });
  }
});

/* =========================
   DESACTIVAR PRODUCTO
========================= */

api.delete("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [resultado] = await db.query(
      `
            UPDATE productos
            SET activo = 0
            WHERE id_producto = ?
        `,
      [id],
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Producto no encontrado.",
      });
    }

    const [[registro]] = await db.query(
      "SELECT nombre FROM productos WHERE id_producto = ?",
      [id],
    );

    await registrarAuditoria(
      db,
      req.usuario.id_usuario,
      "DESACTIVAR",
      "PRODUCTOS",
      id,
      `Desactivó el producto ${registro.nombre}`,
    );

    res.json({
      mensaje: "Producto desactivado correctamente.",
    });
  } catch (error) {
    console.error("Error desactivando producto:", error);

    res.status(500).json({
      mensaje: "Error desactivando producto.",
      error: error.message,
    });
  }
});

/* =========================
   PRODUCTO POR CÓDIGO
========================= */

api.get("/productos/codigo/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;

    const [productos] = await db.query(
      `

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

        `,
      [codigo],
    );

    if (productos.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontró un producto con ese código.",
      });
    }

    res.json(productos[0]);
  } catch (error) {
    console.error("Error buscando producto:", error);

    res.status(500).json({
      mensaje: "Error buscando el producto.",

      error: error.message,
    });
  }
});

/* =========================
   BUSCAR PRODUCTOS POR CÓDIGO
========================= */

api.get("/productos/buscar-codigo/:texto", async (req, res) => {
  try {
    const { texto } = req.params;

    if (!texto.trim()) {
      return res.json([]);
    }

    const [productos] = await db.query(
      `

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

        `,
      [`${texto}%`],
    );

    res.json(productos);
  } catch (error) {
    console.error("Error buscando productos por código:", error);

    res.status(500).json({
      mensaje: "Error buscando productos.",

      error: error.message,
    });
  }
});

/* =========================
   BUSCAR PRODUCTOS POR PRODUCTO
========================= */

api.get("/productos/buscar-nombre/:texto", async (req, res) => {
  try {
    const { texto } = req.params;

    const [productos] = await db.query(
      `
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
        `,
      [`%${texto}%`],
    );

    res.json(productos);
  } catch (error) {
    console.error("Error buscando productos por nombre:", error);

    res.status(500).json({
      mensaje: "Error buscando productos.",
      error: error.message,
    });
  }
});

/* =========================
   LÍNEAS DE PRODUCTOS
========================= */

api.get("/productos/lineas", async (req, res) => {
  try {
    const [lineas] = await db.query(`

            SELECT DISTINCT
                TRIM(linea) AS linea

            FROM productos

            WHERE linea IS NOT NULL
              AND TRIM(linea) <> ''

            ORDER BY linea ASC

        `);

    res.json(lineas);
  } catch (error) {
    console.error("Error obteniendo líneas:", error);

    res.status(500).json({
      mensaje: "Error obteniendo las líneas de productos.",
      error: error.message,
    });
  }
});

/* =========================
   CARTERA
========================= */

api.get("/cartera", async (req, res) => {
  try {
    const { comercial, estado, busqueda } = req.query;

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

      parametros.push(comercial);
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

      const texto = `%${busqueda}%`;

      parametros.push(
        texto,

        texto,

        texto,
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

    const [cartera] = await db.query(sql, parametros);


    res.json(cartera);
  } catch (error) {
    console.error("Error cargando cartera:", error);

    res.status(500).json({
      mensaje: "Error cargando la cartera.",

      error: error.message,
    });
  }
});
/* =========================
   DATOS PARA EXPORTAR CARTERA
========================= */

api.get("/exportaciones/cartera", async (req, res) => {
  try {
    const [cartera] = await db.query(
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

                    `,
    );


    res.json(cartera);
  } catch (error) {
    console.error("Error obteniendo datos para exportar cartera:", error);

    res.status(500).json({
      mensaje: "No se pudieron obtener los datos de cartera.",

      error: error.message,
    });
  }
});

/* =========================
   DATOS PARA REPORTE GENERAL
========================= */

api.get("/exportaciones/general", async (req, res) => {
  try {
    const { periodo } = req.query;

    /* =========================
               VALIDAR PERÍODO
            ========================= */

    if (!periodo) {
      return res.status(400).json({
        mensaje: "Debes enviar un período.",
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
      Diciembre: 12,
    };

    const partes = periodo.trim().split(" ");

    const nombreMes = partes[0];

    const anio = Number(partes[1]);

    const mes = meses[nombreMes];

    if (!mes || !anio) {
      return res.status(400).json({
        mensaje: "El período recibido no es válido.",
      });
    }

    /* =========================
               CONSULTAR REMISIONES
               DEL PERÍODO
            ========================= */

    const [remisiones] = await db.query(
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

      [mes, anio],
    );


    res.json({
      periodo,

      cantidad_remisiones: remisiones.length,

      remisiones,
    });
  } catch (error) {
    console.error("Error obteniendo reporte general:", error);

    res.status(500).json({
      mensaje: "No se pudo obtener el reporte general.",

      error: error.message,
    });
  }
});
/* =========================
   KPIs DE CARTERA
========================= */

api.get("/cartera/kpis", async (req, res) => {
  try {
    const { comercial } = req.query;

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

      parametros.push(comercial);
    }

    const [resultado] = await db.query(sql, parametros);

    res.json(resultado[0]);
  } catch (error) {
    console.error("Error cargando KPIs de cartera:", error);

    res.status(500).json({
      mensaje: "No se pudieron cargar los indicadores de cartera.",

      error: error.message,
    });
  }
});

/* =========================
   USUARIOS
========================= */

/* OBTENER USUARIOS */

api.get("/usuarios", soloAdministrador, async (req, res) => {
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
    console.error("Error obteniendo usuarios:", error);

    res.status(500).json({
      mensaje: "Error obteniendo los usuarios.",
    });
  }
});
/* CREAR USUARIO */

api.post("/usuarios", soloAdministrador, async (req, res) => {
  try {
    const { nombre, usuario, password, rol, activo } = req.body;


    /* VALIDAR DATOS */

    if (!nombre || !usuario || !password || !rol) {
      return res.status(400).json({
        mensaje: "Todos los campos son obligatorios.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        mensaje: "La contraseña debe tener al menos 6 caracteres.",
      });
    }

    /* VALIDAR USUARIO DUPLICADO */

    const [usuarioExistente] = await db.query(
      `
                SELECT id_usuario
                FROM usuarios
                WHERE usuario = ?
                `,
      [usuario],
    );

    if (usuarioExistente.length > 0) {
      return res.status(409).json({
        mensaje: "Ya existe un usuario con este nombre de usuario.",
      });
    }

    /* ENCRIPTAR CONTRASEÑA */

    const passwordHash = await bcrypt.hash(password, 10);

    /* CREAR USUARIO */

    const [resultado] = await db.query(
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
      [nombre, usuario, passwordHash, rol, activo === undefined ? 1 : activo ? 1 : 0],
    );

    await registrarAuditoria(
      db,
      req.usuario.id_usuario,
      "CREAR",
      "USUARIOS",
      resultado.insertId,
      `Creó el usuario ${usuario}`,
    );

    res.status(201).json({
      mensaje: "Usuario creado correctamente.",

      usuario: {
        id_usuario: resultado.insertId,

        nombre,

        usuario,

        rol,

        activo,
      },
    });
  } catch (error) {
    console.error("Error creando usuario:", error);

    res.status(500).json({
      mensaje: "Error creando el usuario.",

      error: error.message,
    });
  }
});
/* =========================
   CAMBIAR CONTRASEÑA
========================= */

api.put("/usuarios/:id/password", async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) !== req.usuario.id_usuario) {
      return res.status(403).json({
        mensaje: "Solo puedes cambiar tu propia contraseña.",
      });
    }

    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({
        mensaje: "Todos los campos son obligatorios.",
      });
    }

    if (String(passwordNueva).length < 6) {
      return res.status(400).json({
        mensaje: "La contraseña nueva debe tener al menos 6 caracteres.",
      });
    }

    /* BUSCAR USUARIO */

    const [usuarios] = await db.query(
      `
                    SELECT
                        id_usuario,
                        password

                    FROM usuarios

                    WHERE id_usuario = ?
                    `,

      [id],
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado.",
      });
    }

    const usuario = usuarios[0];

    /* VERIFICAR CONTRASEÑA ACTUAL */

    const passwordCorrecta = await bcrypt.compare(
      passwordActual,

      usuario.password,
    );

    if (!passwordCorrecta) {
      return res.status(400).json({
        mensaje: "La contraseña actual es incorrecta.",
      });
    }

    /* ENCRIPTAR NUEVA CONTRASEÑA */

    const passwordHash = await bcrypt.hash(passwordNueva, 10);

    /* ACTUALIZAR */

    await db.query(
      `
                UPDATE usuarios

                SET password = ?

                WHERE id_usuario = ?
                `,

      [passwordHash, id],
    );

    await registrarAuditoria(
      db,
      req.usuario.id_usuario,
      "CAMBIAR_PASSWORD",
      "USUARIOS",
      id,
      "Cambió su contraseña",
    );

    res.json({
      mensaje: "Contraseña actualizada correctamente.",
    });
  } catch (error) {
    console.error("Error cambiando contraseña:", error);

    res.status(500).json({
      mensaje: "Error cambiando la contraseña.",
    });
  }
});

api.put("/usuarios/:id", soloAdministrador, async (req, res) => {
  try {
    const { id } = req.params;

    const { nombre, usuario, rol, activo } = req.body;


    if (!nombre || !usuario || !rol) {
      return res.status(400).json({
        mensaje: "Nombre, usuario y rol son obligatorios.",
      });
    }

    const activoNormalizado = activo === undefined ? 1 : activo ? 1 : 0;

    /* Evita que el administrador se bloquee a sí mismo */

    if (
      Number(id) === req.usuario.id_usuario &&
      (activoNormalizado === 0 || rol !== "ADMINISTRADOR")
    ) {
      return res.status(400).json({
        mensaje:
          "No puedes desactivar tu propio usuario ni quitarte el rol de administrador.",
      });
    }

    const [usuarioDuplicado] = await db.query(
      "SELECT id_usuario FROM usuarios WHERE usuario = ? AND id_usuario <> ?",
      [usuario, id],
    );

    if (usuarioDuplicado.length > 0) {
      return res.status(409).json({
        mensaje: "Ya existe un usuario con este nombre de usuario.",
      });
    }

    const [resultadoUsuario] = await db.query(
      `

            UPDATE usuarios

            SET

                nombre = ?,

                usuario = ?,

                rol = ?,

                activo = ?

            WHERE id_usuario = ?

            `,

      [nombre, usuario, rol, activoNormalizado, id],
    );

    if (resultadoUsuario.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado.",
      });
    }

    await registrarAuditoria(
      db,
      req.usuario.id_usuario,
      "EDITAR",
      "USUARIOS",
      id,
      `Editó el usuario ${usuario}`,
    );

    res.json({
      mensaje: "Usuario actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando usuario:", error);

    res.status(500).json({
      mensaje: "Error al actualizar el usuario.",

      error: error.message,
    });
  }
});

/* =========================
   REGISTRAR ABONO
========================= */

api.post("/cartera/abono", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id_remision, valor, comentario } = req.body;

    const { id_usuario } = req.usuario;

    /* =========================
           VALIDACIONES
        ========================= */

    if (!id_remision) {
      return res.status(400).json({
        mensaje: "No se recibió la remisión.",
      });
    }

    if (!valor || Number(valor) <= 0) {
      return res.status(400).json({
        mensaje: "El valor del abono debe ser mayor a cero.",
      });
    }

    await connection.beginTransaction();

    /* =========================
           CONSULTAR REMISIÓN
        ========================= */

    const [remisiones] = await connection.query(
      `

            SELECT

                id_remision,
                numero_remision,
                total,
                saldo_pendiente,
                estado

            FROM remisiones

            WHERE id_remision = ?

            FOR UPDATE

        `,
      [id_remision],
    );

    if (remisiones.length === 0) {
      throw new Error("La remisión no existe.");
    }

    const remision = remisiones[0];

    /* =========================
           VALIDAR SALDO
        ========================= */

    const saldoPendiente = Number(remision.saldo_pendiente);

    const valorAbono = Number(valor);

    if (saldoPendiente <= 0) {
      throw new Error("Esta remisión ya se encuentra pagada.");
    }

    if (valorAbono > saldoPendiente) {
      throw new Error(
        `El abono no puede ser mayor al saldo pendiente de $${saldoPendiente.toLocaleString("es-CO")}.`,
      );
    }

    /* =========================
           REGISTRAR ABONO
        ========================= */

    await connection.query(
      `

            INSERT INTO abonos_remision (

                id_remision,
                valor,
                id_usuario,
                comentario

            )

            VALUES (?, ?, ?, ?)

        `,
      [id_remision, valorAbono, id_usuario, comentario?.trim() || null],
    );

    /* =========================
           CALCULAR NUEVO SALDO
        ========================= */
    let nuevoSaldo = saldoPendiente - valorAbono;

    if (nuevoSaldo < 0) {
      nuevoSaldo = 0;
    }

    /* =========================
           ACTUALIZAR REMISIÓN
        ========================= */

    await connection.query(
      `

            UPDATE remisiones

            SET

                saldo_pendiente = ?,

                estado = ?

            WHERE id_remision = ?

        `,
      [nuevoSaldo, nuevoSaldo <= 0 ? "PAGADA" : "ABONO", id_remision],
    );

    await registrarAuditoria(
      connection,
      id_usuario,
      "ABONO",
      "CARTERA",
      id_remision,
      `Registró un abono de $${valorAbono.toLocaleString("es-CO")} a la remisión ${remision.numero_remision}`,
    );

    await connection.commit();

    res.json({
      mensaje:
        nuevoSaldo <= 0
          ? "Pago registrado. La remisión quedó totalmente pagada."
          : "Abono registrado correctamente.",

      valor_abonado: valorAbono,

      saldo_pendiente: nuevoSaldo,

      pagada: nuevoSaldo <= 0,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Error registrando abono:", error);

    res.status(400).json({
      mensaje: error.message || "No se pudo registrar el abono.",
    });
  } finally {
    connection.release();
  }
});

/* =========================
   DETALLE DE PRODUCTOS
========================= */

api.get("/cartera/:id_remision/productos", async (req, res) => {
  try {
    const { id_remision } = req.params;

    const [productos] = await db.query(
      `

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

            `,
      [id_remision],
    );

    res.json(productos);
  } catch (error) {
    console.error("Error obteniendo productos de la remisión:", error);

    res.status(500).json({
      mensaje: "No se pudieron cargar los productos de la remisión.",
    });
  }
});

/* =========================
   OBTENER ABONOS REMISIÓN
========================= */

api.get("/cartera/:id_remision/abonos", async (req, res) => {
  try {
    const { id_remision } = req.params;

    const [abonos] = await db.query(
      `

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

        `,
      [id_remision],
    );

    res.json(abonos);
  } catch (error) {
    console.error("Error obteniendo abonos:", error);

    res.status(500).json({
      mensaje: "Error obteniendo los abonos.",

      error: error.message,
    });
  }
});

/* =========================
   KPIs DE REPORTES
========================= */

api.get("/reportes/kpis", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    /* =========================
           VALIDAR PERÍODO
        ========================= */

    if (!mes || !anio) {
      return res.status(400).json({
        mensaje: "Debe enviar el mes y el año.",
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

      [Number(mes), Number(anio)],
    );

    res.json(resultado[0]);
  } catch (error) {
    console.error("Error cargando KPIs de reportes:", error);

    res.status(500).json({
      mensaje: "No se pudieron cargar los KPIs de reportes.",

      error: error.message,
    });
  }
});

/* =========================
   REPORTES - DETALLE DEL MES
========================= */

api.get("/reportes/detalle", async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const anio = Number(req.query.anio);

    if (!mes || !anio) {
      return res.status(400).json({
        mensaje: "Debe enviar el mes y el año.",
      });
    }

    const [ventasDiarias] = await db.query(
      `
        SELECT
            DAY(r.fecha) AS dia,
            COALESCE(SUM(r.total), 0) AS ventas
        FROM remisiones r
        WHERE r.estado <> 'ANULADA'
          AND MONTH(r.fecha) = ?
          AND YEAR(r.fecha) = ?
        GROUP BY DAY(r.fecha)
        ORDER BY dia
      `,
      [mes, anio],
    );

    const [comerciales] = await db.query(
      `
        SELECT
            c.nombre,
            COALESCE(SUM(r.total), 0) AS ventas
        FROM comerciales c
        INNER JOIN remisiones r
            ON r.id_comercial = c.id_comercial
        WHERE r.estado <> 'ANULADA'
          AND MONTH(r.fecha) = ?
          AND YEAR(r.fecha) = ?
        GROUP BY c.id_comercial, c.nombre
        ORDER BY ventas DESC
        LIMIT 5
      `,
      [mes, anio],
    );

    const [productos] = await db.query(
      `
        SELECT
            p.nombre,
            COALESCE(SUM(d.cantidad), 0) AS cantidad
        FROM detalle_remision d
        INNER JOIN remisiones r
            ON r.id_remision = d.id_remision
        INNER JOIN productos p
            ON p.id_producto = d.id_producto
        WHERE r.estado <> 'ANULADA'
          AND MONTH(r.fecha) = ?
          AND YEAR(r.fecha) = ?
        GROUP BY p.id_producto, p.nombre
        ORDER BY cantidad DESC
        LIMIT 5
      `,
      [mes, anio],
    );

    /* La cartera es la pendiente hoy, sin importar el mes */

    const [[cartera]] = await db.query(`
        SELECT
            COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), r.fecha) <= 30
                THEN r.saldo_pendiente END), 0) AS al_dia,
            COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), r.fecha) BETWEEN 31 AND 45
                THEN r.saldo_pendiente END), 0) AS seguimiento,
            COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), r.fecha) > 45
                THEN r.saldo_pendiente END), 0) AS vencida
        FROM remisiones r
        WHERE r.saldo_pendiente > 0
          AND r.estado <> 'ANULADA'
    `);

    res.json({
      ventas_diarias: ventasDiarias,
      comerciales,
      productos,
      cartera,
    });
  } catch (error) {
    console.error("Error cargando detalle de reportes:", error);

    res.status(500).json({
      mensaje: "No se pudo cargar el detalle de reportes.",
    });
  }
});

api.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada." });
});

/* =========================
   SERVIR FRONTEND
========================= */

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const frontendPath = path.join(__dirname, "..", "dist");

app.use(express.static(frontendPath));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

/* =========================
   ÍNDICE ÚNICO DE REMISIONES
========================= */

const asegurarNumeroRemisionUnico = async () => {
  const [indices] = await db.query(`
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'remisiones'
      AND column_name = 'numero_remision'
      AND non_unique = 0
    LIMIT 1
  `);

  if (indices.length > 0) {
    return;
  }

  const [duplicados] = await db.query(`
    SELECT numero_remision, COUNT(*) AS cantidad
    FROM remisiones
    GROUP BY numero_remision
    HAVING cantidad > 1
  `);

  if (duplicados.length > 0) {
    console.error(
      "No se pudo crear el índice UNIQUE de numero_remision porque hay números repetidos. Corrígelos y reinicia el servidor:",
      duplicados.map((fila) => `${fila.numero_remision} (${fila.cantidad})`),
    );

    return;
  }

  await db.query(`
    ALTER TABLE remisiones
    ADD UNIQUE INDEX uq_remisiones_numero_remision (numero_remision)
  `);

  console.log("Índice UNIQUE creado en remisiones.numero_remision.");
};

/* =========================
   INICIAR SERVIDOR
========================= */

app.listen(PORT, "0.0.0.0", (error) => {
  /* En Express 5 los errores al abrir el puerto llegan aquí. Sin esto,
     con el puerto ocupado el servidor decía que estaba funcionando y
     seguía abierto sin recibir peticiones. */
  if (error) {
    console.error(
      error.code === "EADDRINUSE"
        ? `El puerto ${PORT} ya está en uso: hay otro servidor SIREM abierto. Ciérralo y vuelve a intentarlo.`
        : "No se pudo iniciar el servidor:",
      error.code === "EADDRINUSE" ? "" : error,
    );

    process.exit(1);
  }

  console.log(`Servidor SIREM ejecutándose en el puerto ${PORT}`);

  asegurarNumeroRemisionUnico().catch((error) => {
    console.error("Error verificando el índice de numero_remision:", error);
  });
});
