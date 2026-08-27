import express from "express";
import conexion from "../db.js";

const router = express.Router();


// ================================
// REGISTRAR ABONO
// ================================

router.post("/", async (req, res) => {

    try {

        const {
            id_remision,
            fecha_pago,
            valor,
            medio_pago,
            referencia,
            observacion
        } = req.body;


        // ================================
        // VALIDACIONES
        // ================================

        if (!id_remision) {

            return res.status(400).json({
                mensaje: "La remisión es obligatoria."
            });

        }


        if (!fecha_pago) {

            return res.status(400).json({
                mensaje: "La fecha del pago es obligatoria."
            });

        }


        if (!valor || Number(valor) <= 0) {

            return res.status(400).json({
                mensaje: "El valor del abono debe ser mayor a cero."
            });

        }


        // ================================
        // GUARDAR PAGO
        // ================================

        const [resultado] = await conexion.query(

            `INSERT INTO pagos
            (
                id_remision,
                fecha_pago,
                valor,
                medio_pago,
                referencia,
                observacion
            )
            VALUES (?, ?, ?, ?, ?, ?)`

            ,

            [
                id_remision,
                fecha_pago,
                Number(valor),
                medio_pago || null,
                referencia || null,
                observacion || null
            ]

        );


        // ================================
        // RESPUESTA
        // ================================

        res.status(201).json({

            mensaje: "Abono registrado correctamente.",

            id_pago: resultado.insertId

        });


    } catch (error) {

        console.error("Error registrando abono:", error);

        res.status(500).json({

            mensaje: "Error al registrar el abono.",

            error: error.message

        });

    }

});


export default router;