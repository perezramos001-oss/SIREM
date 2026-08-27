import React from "react";
import * as XLSX from "xlsx-js-style";

import "./Exportaciones.css";

import jsPDF from "jspdf";

import autoTable from "jspdf-autotable";

import {
    FileSpreadsheet,
    FileText,
    BarChart3,
    Receipt,
    WalletCards,
    UsersRound,
    UserRound,
    Package,
    CalendarDays,
    Download,
    Clock3
} from "lucide-react";

function Exportaciones({
    mesSeleccionado
}) {

    const periodo =
    mesSeleccionado || "";

  const exportaciones = [

    {
        id: 1,

        tipo: "general",

        titulo: "Reporte general",

        descripcion:
            "Resumen completo de la actividad de SIREM.",

        icono: BarChart3,

        clase: "general",

        usaPeriodo: true

    },

    {
        id: 2,

        tipo: "remisiones",

        titulo: "Remisiones",

        descripcion:
            "Listado detallado de las remisiones registradas.",

        icono: Receipt,

        clase: "remisiones",

        usaPeriodo: true

    },

    {
        id: 3,

        tipo: "cartera",

        titulo: "Cartera",

        descripcion:
            "Estado y antigüedad de la cartera.",

        icono: WalletCards,

        clase: "cartera",

        usaPeriodo: false

    }

];


const exportar = async (
    tipo,
    formato
) => {

    try {
/* =================================
   EXPORTAR REPORTE GENERAL A EXCEL
================================= */

if (
    tipo === "general" &&
    formato === "PDF"
) {

    const respuesta =
        await fetch(
            `/api/exportaciones/general?periodo=${encodeURIComponent(periodo)}`
        );


    console.log(
        "RESPUESTA REPORTE GENERAL:",
        respuesta.status,
        respuesta.statusText
    );


    if (!respuesta.ok) {

        const errorBackend =
            await respuesta.json();

        console.error(
            "ERROR DEL BACKEND:",
            errorBackend
        );

        throw new Error(
            errorBackend.mensaje ||
            "No se pudo obtener el reporte general."
        );

    }


    const datos =
        await respuesta.json();


    console.log(
        "DATOS RECIBIDOS PARA REPORTE GENERAL:",
        datos
    );


    /* =================================
   CREAR PDF
================================= */

const pdf =
    new jsPDF(
        "p",
        "mm",
        "a4"
    );


/* =================================
   DATOS DEL REPORTE
================================= */

const remisiones =
    datos.remisiones || [];


const totalFacturado =
    remisiones.reduce(
        (total, remision) =>
            total + Number(remision.total || 0),
        0
    );


const saldoPendiente =
    remisiones.reduce(
        (total, remision) =>
            total +
            Number(
                remision.saldo_pendiente || 0
            ),
        0
    );


/* =================================
   CLIENTES ÚNICOS
================================= */

const clientesUnicos =
    new Set(
        remisiones.map(
            (remision) =>
                remision.cliente
        )
    );


/* =================================
   COMERCIALES ÚNICOS
================================= */

const comercialesUnicos =
    new Set(
        remisiones.map(
            (remision) =>
                remision.comercial
        )
    );


/* =================================
   FORMATO MONEDA
================================= */

const formatoMoneda =
    (valor) => {

        return "$ " +
            Number(valor).toLocaleString(
                "es-CO"
            );

    };


/* =================================
   ENCABEZADO PRINCIPAL
================================= */

pdf.setFillColor(
    139,
    94,
    52
);


pdf.roundedRect(
    15,
    15,
    180,
    38,
    4,
    4,
    "F"
);


/* TÍTULO */

pdf.setTextColor(
    255,
    255,
    255
);


pdf.setFont(
    "helvetica",
    "bold"
);


pdf.setFontSize(
    20
);


pdf.text(
    "REPORTE GENERAL",
    25,
    31
);


/* SUBTÍTULO */

pdf.setFont(
    "helvetica",
    "normal"
);


pdf.setFontSize(
    11
);


pdf.text(
    "SISTEMA DE INFORMACIÓN SIREM",
    25,
    41
);


/* PERÍODO */

pdf.setFont(
    "helvetica",
    "bold"
);


pdf.setFontSize(
    12
);


pdf.text(
    periodo.toUpperCase(),
    185,
    30,
    {
        align: "right"
    }
);


/* =================================
   RESUMEN DEL PERÍODO
================================= */

pdf.setTextColor(
    60,
    60,
    60
);


pdf.setFont(
    "helvetica",
    "bold"
);


pdf.setFontSize(
    15
);


pdf.text(
    "Resumen del período",
    15,
    68
);


/* =================================
   TARJETAS
================================= */

const tarjetas = [

    {
        titulo: "Remisiones",
        valor: remisiones.length,
        color: [139, 94, 52]
    },

    {
        titulo: "Total facturado",
        valor: formatoMoneda(totalFacturado),
        color: [166, 116, 74]
    },

    {
        titulo: "Saldo pendiente",
        valor: formatoMoneda(saldoPendiente),
        color: [181, 111, 74]
    },

    {
        titulo: "Clientes",
        valor: clientesUnicos.size,
        color: [112, 91, 72]
    },

    {
        titulo: "Comerciales",
        valor: comercialesUnicos.size,
        color: [91, 70, 54]
    }

];


const margenIzquierdo = 15;

const margenDerecho = 15;

const espacioEntreTarjetas = 3;

const anchoPagina = 210;

const espacioDisponible =
    anchoPagina -
    margenIzquierdo -
    margenDerecho -
    (
        espacioEntreTarjetas *
        (tarjetas.length - 1)
    );


const anchoTarjeta =
    espacioDisponible /
    tarjetas.length;


let x =
    margenIzquierdo;

let y =
    75;


tarjetas.forEach(
    (tarjeta) => {

        /* =================================
           SOMBRA DECORATIVA
        ================================= */

        pdf.setFillColor(
            225,
            220,
            214
        );


        pdf.roundedRect(
    x + 1,
    y + 1.5,
    anchoTarjeta,
    30,
            3,
            3,
            "F"
        );


        /* =================================
           CUERPO DE LA TARJETA
        ================================= */

        pdf.setFillColor(
            255,
            255,
            255
        );


        pdf.roundedRect(
            x,
            y,
            anchoTarjeta,
            30,
            3,
            3,
            "F"
        );


        /* =================================
           FRANJA SUPERIOR
        ================================= */

        pdf.setFillColor(
            ...tarjeta.color
        );


        pdf.roundedRect(
            x,
            y,
            anchoTarjeta,
            5,
            3,
            3,
            "F"
        );


        /* =================================
           CÍRCULO DECORATIVO
        ================================= */

        pdf.setFillColor(
            ...tarjeta.color
        );


        pdf.circle(
    x + anchoTarjeta - 6,
    y + 10,
    3,
    "F"
);


        /* =================================
           TÍTULO
        ================================= */

        pdf.setTextColor(
            125,
            125,
            125
        );


        pdf.setFont(
            "helvetica",
            "normal"
        );


        pdf.setFontSize(
            7.5
        );


        pdf.text(
            tarjeta.titulo,
            x + 4,
            y + 12
        );


        /* =================================
           VALOR
        ================================= */

        pdf.setTextColor(
            55,
            55,
            55
        );


        pdf.setFont(
            "helvetica",
            "bold"
        );


        /*
        Reducimos un poco el tamaño
        para valores monetarios largos
        */

        const valor =
            String(
                tarjeta.valor
            );


        const tamañoValor =
            valor.length > 13
                ? 8
                : valor.length > 8
                    ? 9
                    : 13;


        pdf.setFontSize(
            tamañoValor
        );


        pdf.text(
            valor,
            x + 4,
            y + 23
        );


        /* =================================
           AVANZAR A LA SIGUIENTE TARJETA
        ================================= */

      x +=
    anchoTarjeta +
    espacioEntreTarjetas;

    }
);

/* =================================
   TABLA DE REMISIONES
================================= */

const filas =
    remisiones.map(
        (remision) => [

            remision.numero_remision,

            new Date(
                remision.fecha
            ).toLocaleDateString(
                "es-CO"
            ),

            remision.cliente,

            remision.comercial,

            formatoMoneda(
                remision.total
            ),

            formatoMoneda(
                remision.saldo_pendiente
            )

        ]
    );


autoTable(
    pdf,
    {

        startY:
            112,


        head: [

            [

                "Remisión",

                "Fecha",

                "Cliente",

                "Comercial",

                "Total",

                "Saldo"

            ]

        ],


        body:
            filas,


        theme:
            "striped",


        headStyles: {

            fillColor:
                [
                    139,
                    94,
                    52
                ],

            textColor:
                [
                    255,
                    255,
                    255
                ],

            fontStyle:
                "bold"

        },


        styles: {

            fontSize:
                8,

            cellPadding:
                3,

            textColor:
                [
                    80,
                    80,
                    80
                ]

        },


        columnStyles: {

            0: {
                cellWidth: 23
            },

            1: {
                cellWidth: 22
            },

            2: {
                cellWidth: 43
            },

            3: {
                cellWidth: 43
            },

            4: {
                cellWidth: 28,
                halign: "right"
            },

            5: {
                cellWidth: 28,
                halign: "right"
            }

        }

    }
);


/* =================================
   PIE DE PÁGINA
================================= */

const paginas =
    pdf.getNumberOfPages();


for (
    let pagina = 1;
    pagina <= paginas;
    pagina++
) {

    pdf.setPage(
        pagina
    );


    pdf.setFontSize(
        8
    );


    pdf.setTextColor(
        130,
        130,
        130
    );


    pdf.text(
        `SIREM • Reporte General • Página ${pagina} de ${paginas}`,
        105,
        287,
        {
            align: "center"
        }
    );

}


/* =================================
   DESCARGAR PDF
================================= */

pdf.save(
    `Reporte General - ${periodo}.pdf`
);

    return;

}


/* =================================
   OBTENER REMISIONES PARA EXPORTAR
================================= */

if (
    tipo === "remisiones" &&
    formato === "Excel"
) {

    const respuesta =
        await fetch(
            `/api/exportaciones/remisiones?periodo=${encodeURIComponent(periodo)}`
        );


    if (!respuesta.ok) {

        const errorBackend =
            await respuesta.json();

        throw new Error(
            errorBackend.mensaje ||
            "No se pudieron obtener las remisiones."
        );

    }


    const datos =
        await respuesta.json();


    console.log(
        "REMISIONES RECIBIDAS:",
        datos
    );


    /* =================================
       PREPARAR DATOS
    ================================= */

    const datosExcel =
        datos.remisiones.map(
            (remision) => ({

                "Remisión":
                    remision.numero_remision,

                "Fecha":
    new Date(
        remision.fecha
    ).toLocaleDateString(
        "es-CO"
    ),
                    

                "Cliente":
                    remision.cliente,

                "Ciudad":
                    remision.ciudad,

                "Comercial":
                    remision.comercial,

                "Producto":
                    remision.nombre_producto,

                "Código producto":
                    remision.codigo_producto,

                "Línea":
                    remision.linea_producto,

                "Placa":
                    remision.placa,

                "Cantidad":
                    Number(remision.cantidad),

                "Precio lista":
                    Number(remision.precio_lista),

                "Precio venta":
                    Number(remision.precio_venta),

                "Total producto":
                    Number(remision.total_producto),

                "Total remisión":
                    Number(remision.total),

                "Saldo pendiente":
                    Number(remision.saldo_pendiente),

                "Medio de pago":
                    remision.medio_pago,

                "Estado":
                    remision.estado,

                "Comentarios":
    remision.comentarios || "",


                 "Código WO":
                    remision.codigo_world_office || ""

            })
        );


  const totalFilas =
    datosExcel.length;

    /* =================================
   CREAR EXCEL
================================= */

const libro =
    XLSX.utils.book_new();


const hoja =
    XLSX.utils.json_to_sheet(
        datosExcel,
        {
            origin: "A5"
        }
    );


/* =================================
   ENCABEZADO DEL REPORTE
================================= */

XLSX.utils.sheet_add_aoa(
    hoja,
    [
        ["REMISIONES SIREM"],
        ["Listado detallado de remisiones"],
        [`Período: ${periodo}`]
    ],
    {
        origin: "A1"
    }
);


/* =================================
   UNIR ENCABEZADOS
================================= */

hoja["!merges"] = [

    {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 18 }
    },

    {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 18 }
    },

    {
        s: { r: 2, c: 0 },
        e: { r: 2, c: 18 }
    }

];


/* =================================
   ESTILO TÍTULO
================================= */

hoja["A1"].s = {

    font: {

        bold: true,

        sz: 20,

        color: {
            rgb: "FFFFFF"
        }

    },


    fill: {

        fgColor: {
            rgb: "8B5E34"
        }

    },


    alignment: {

        horizontal: "center",

        vertical: "center"

    }

};

/* =================================
   ALTURA DEL TÍTULO
================================= */

hoja["!rows"] = [

    { hpt: 30 },

    { hpt: 22 },

    { hpt: 18 },

    { hpt: 8 },

    { hpt: 24 }

];


/* =================================
   ESTILO SUBTÍTULO
================================= */

hoja["A2"].s = {

    font: {

        bold: true,

        sz: 12,

        color: {
            rgb: "6B4A2D"
        }

    },


    fill: {

        fgColor: {
            rgb: "F3EADF"
        }

    },


    alignment: {

        horizontal: "center",

        vertical: "center"

    }

};


/* =================================
   ESTILO PERÍODO
================================= */

hoja["A3"].s = {

    font: {
        italic: true,
        sz: 10,
        color: {
            rgb: "777777"
        }
    },

    alignment: {
        horizontal: "center"
    }

};


/* =================================
   ESTILO ENCABEZADOS DE COLUMNAS
================================= */

for (
    let columna = 0;
    columna < 18;
    columna++
) {

    const celda =
        XLSX.utils.encode_cell({
            r: 4,
            c: columna
        });


    if (!hoja[celda]) continue;


    hoja[celda].s = {

        font: {
            bold: true,
            color: {
                rgb: "FFFFFF"
            },
            sz: 10
        },

        fill: {
            fgColor: {
                rgb: "8B5E34"
            }
        },

        alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true
        }

    };

}

/* =================================
   FORMATOS NUMÉRICOS
================================= */

for (
    let fila = 5;
    fila < totalFilas + 5;
    fila++
) {

    /* CANTIDAD */

    const cantidad =
        XLSX.utils.encode_cell({
            r: fila,
            c: 9
        });

    if (hoja[cantidad]) {

        hoja[cantidad].z =
            '#,##0';

    }


    /* PRECIO LISTA */

    const precioLista =
        XLSX.utils.encode_cell({
            r: fila,
            c: 10
        });

    if (hoja[precioLista]) {

        hoja[precioLista].z =
            '$ #,##0';

    }


    /* PRECIO VENTA */

    const precioVenta =
        XLSX.utils.encode_cell({
            r: fila,
            c: 11
        });

    if (hoja[precioVenta]) {

        hoja[precioVenta].z =
            '$ #,##0';

    }


    /* TOTAL PRODUCTO */

    const totalProducto =
        XLSX.utils.encode_cell({
            r: fila,
            c: 12
        });

    if (hoja[totalProducto]) {

        hoja[totalProducto].z =
            '$ #,##0';

    }


    /* TOTAL REMISIÓN */

    const totalRemision =
        XLSX.utils.encode_cell({
            r: fila,
            c: 13
        });

    if (hoja[totalRemision]) {

        hoja[totalRemision].z =
            '$ #,##0';

    }


    /* SALDO PENDIENTE */

    const saldo =
        XLSX.utils.encode_cell({
            r: fila,
            c: 14
        });

    if (hoja[saldo]) {

        hoja[saldo].z =
            '$ #,##0';

    }

}

/* =================================
   DIFERENCIAR GRUPOS DE REMISIONES
================================= */

let remisionAnterior = null;


for (
    let fila = 5;
    fila < totalFilas + 5;
    fila++
) {

    const remision =
        datosExcel[fila - 5]["Remisión"];


    const esNuevaRemision =
        remision !== remisionAnterior;


    /*
       Color de fondo alternado
       para cada grupo de remisión
    */

    const colorFondo =
        esNuevaRemision
            ? "F3E9DD"
            : "FFFFFF";


    /*
       Aplicar color a toda la fila
    */

 /* =================================
   APLICAR COLOR A TODA LA FILA
================================= */

for (
    let columna = 0;
    columna < 19;
    columna++
) {

    const celda =
        XLSX.utils.encode_cell({
            r: fila,
            c: columna
        });


    /* =================================
       CREAR LA CELDA SI ESTÁ VACÍA
    ================================= */

    if (!hoja[celda]) {

        hoja[celda] = {
            t: "s",
            v: ""
        };

    }


    hoja[celda].s = {

        fill: {
            fgColor: {
                rgb: colorFondo
            }
        },

        alignment: {
            vertical: "center"
        },

        border: {

            bottom: {
                style: "thin",

                color: {
                    rgb: "DDCDBD"
                }
            }

        }

    };

}

    /*
       DESTACAR NÚMERO DE REMISIÓN
    */

const celdaNumeroRemision =
    XLSX.utils.encode_cell({
        r: fila,
        c: 0
    });


if (hoja[celdaNumeroRemision]) {

        hoja[celdaNumeroRemision].s = {

            font: {
                bold: true,
                color: {
                    rgb: "8B5E34"
                }
            },

            fill: {
                fgColor: {
                    rgb: esNuevaRemision
                        ? "E8D5BE"
                        : "F8F1E8"
                }
            },

            alignment: {
                horizontal: "center",
                vertical: "center"
            },

            border: {

                top: {
                    style: esNuevaRemision
                        ? "medium"
                        : "thin",

                    color: {
                        rgb: "B98A5D"
                    }
                },

                bottom: {
                    style: "thin",

                    color: {
                        rgb: "D9C4AC"
                    }
                }

            }

        };

    }


    remisionAnterior =
        remision;

}
/* =================================
   AJUSTAR COLUMNAS
================================= */

hoja["!cols"] = [

    { wch: 14 }, // Remisión
    { wch: 14 }, // Fecha
    { wch: 28 }, // Cliente
    { wch: 18 }, // Ciudad
    { wch: 24 }, // Comercial
    { wch: 32 }, // Producto
    { wch: 18 }, // Código producto
    { wch: 22 }, // Línea
    { wch: 14 }, // Placa
    { wch: 10 }, // Cantidad
    { wch: 16 }, // Precio lista
    { wch: 16 }, // Precio venta
    { wch: 18 }, // Total producto
    { wch: 18 }, // Total remisión
    { wch: 18 }, // Saldo pendiente
    { wch: 18 }, // Medio de pago
{ wch: 14 }, // Estado
{ wch: 40 }, // Comentarios
{ wch: 18 }  // Código WO

];

/* =================================
   FILTROS
================================= */

hoja["!autofilter"] = {

    ref:
        `A5:S${totalFilas + 5}`

};


/* =================================
   CONGELAR ENCABEZADOS
================================= */

hoja["!freeze"] = {

    xSplit: 0,

    ySplit: 5

};


/* =================================
   COLOR DE LA PESTAÑA
================================= */

hoja["!tabColor"] = {

    rgb: "8B5E34"

};
XLSX.utils.book_append_sheet(
    libro,
    hoja,
    "Remisiones"
);

    /* =================================
       DESCARGAR
    ================================= */

    XLSX.writeFile(
        libro,
        `Remisiones ${periodo}.xlsx`
    );


    return;

}

/* =================================
   EXPORTAR REMISIONES A PDF
================================= */

if (
    tipo === "remisiones" &&
    formato === "PDF"
) {

    const respuesta =
        await fetch(
            `/api/exportaciones/remisiones?periodo=${encodeURIComponent(periodo)}`
        );


    if (!respuesta.ok) {

        const errorBackend =
            await respuesta.json();

        throw new Error(
            errorBackend.mensaje ||
            "No se pudieron obtener las remisiones."
        );

    }


    const datos =
        await respuesta.json();


    console.log(
        "REMISIONES PARA PDF:",
        datos
    );


    /* =================================
       VALIDAR REMISIONES
    ================================= */

    if (
        !datos.remisiones ||
        datos.remisiones.length === 0
    ) {

        alert(
            "No hay remisiones para exportar."
        );

        return;

    }


    /* =================================
       CREAR PDF
    ================================= */

    const pdf =
        new jsPDF(
            "l",
            "mm",
            "a4"
        );


    /* =================================
       TÍTULO
    ================================= */

    pdf.setFillColor(
        139,
        94,
        52
    );


    pdf.rect(
        0,
        0,
        297,
        25,
        "F"
    );


    pdf.setTextColor(
        255,
        255,
        255
    );


    pdf.setFontSize(18);


    pdf.setFont(
        "helvetica",
        "bold"
    );


    pdf.text(
        "REMISIONES SIREM",
        148.5,
        12,
        {
            align: "center"
        }
    );


    pdf.setFontSize(10);


    pdf.setFont(
        "helvetica",
        "normal"
    );


    pdf.text(
        `Listado detallado de remisiones - ${datos.periodo}`,
        148.5,
        19,
        {
            align: "center"
        }
    );


    /* =================================
       PREPARAR TABLA
    ================================= */

    const filas =
        datos.remisiones.map(
            (remision) => [

                remision.numero_remision || "",

                new Date(
                    remision.fecha
                ).toLocaleDateString(
                    "es-CO"
                ),

                remision.cliente || "",

                remision.comercial || "",

                remision.nombre_producto || "",

                remision.codigo_producto || "",

                remision.placa || "",

                Number(
                    remision.cantidad || 0
                ),

                Number(
                    remision.precio_venta || 0
                ).toLocaleString(
                    "es-CO"
                ),

                Number(
                    remision.total_producto || 0
                ).toLocaleString(
                    "es-CO"
                ),

                remision.estado || "",

                remision.codigo_world_office || "",

                remision.comentarios || ""

            ]
        );


    /* =================================
       CREAR TABLA
    ================================= */

    autoTable(
        pdf,
        {

            startY: 32,


            head: [

                [

                    "Remisión",

                    "Fecha",

                    "Cliente",

                    "Comercial",

                    "Producto",

                    "Código",

                    "Placa",

                    "Cant.",

                    "Precio venta",

                    "Total",

                    "Estado",

                    "Código WO",

                    "Comentarios"

                ]

            ],


            body:
                filas,


            theme:
                "grid",


            styles: {

                fontSize: 7,

                cellPadding: 2,

                valign:
                    "middle"

            },


            headStyles: {

                fillColor: [
                    91,
                    70,
                    54
                ],

                textColor: [
                    255,
                    255,
                    255
                ],

                fontStyle:
                    "bold",

                halign:
                    "center"

            },


            alternateRowStyles: {

                fillColor: [
                    248,
                    244,
                    240
                ]

            },


            columnStyles: {

                0: {
                    halign:
                        "center"
                },

                1: {
                    halign:
                        "center"
                },

                7: {
                    halign:
                        "center"
                },

                8: {
                    halign:
                        "right"
                },

                9: {
                    halign:
                        "right"
                },

                10: {
                    halign:
                        "center"
                },

                11: {
                    halign:
                        "center"
                }

            },


            margin: {

                top: 32,

                right: 5,

                bottom: 15,

                left: 5

            }

        }
    );


    /* =================================
       PIE DE PÁGINA
    ================================= */

    const totalPaginas =
        pdf.getNumberOfPages();


    for (
        let pagina = 1;
        pagina <= totalPaginas;
        pagina++
    ) {

        pdf.setPage(
            pagina
        );


        pdf.setFontSize(
            8
        );


        pdf.setTextColor(
            120,
            120,
            120
        );


        pdf.text(
            `Página ${pagina} de ${totalPaginas}`,
            292,
            205,
            {
                align:
                    "right"
            }
        );

    }


    /* =================================
       DESCARGAR PDF
    ================================= */

    pdf.save(
        `Remisiones ${datos.periodo}.pdf`
    );


    return;

}

        /* =================================
           EXPORTAR CARTERA A EXCEL
        ================================= */

        if (
            tipo === "cartera" &&
            formato === "Excel"
        ) {

            const respuesta =
                await fetch(
                    "/api/exportaciones/cartera"
                );


            console.log(
                "RESPUESTA EXPORTACIÓN:",
                respuesta.status,
                respuesta.statusText
            );


            if (!respuesta.ok) {

                const errorBackend =
                    await respuesta.json();

                console.error(
                    "ERROR DEL BACKEND:",
                    errorBackend
                );

                throw new Error(
                    errorBackend.mensaje ||
                    "No se pudieron obtener los datos de cartera."
                );

            }


            const datos =
                await respuesta.json();


            console.log(
                "DATOS RECIBIDOS PARA EXPORTACIÓN:",
                datos
            );


            /* =================================
               PREPARAR DATOS PARA EXCEL
            ================================= */

            const datosExcel =
                datos.map((cuenta) => ({

                    "Remisión":
                        cuenta.numero_remision,

                  "Fecha":
    new Date(
        cuenta.fecha
    ).toLocaleDateString(
        "es-CO"
    ),

                    "Cliente":
                        cuenta.cliente,

                    "Documento":
                        cuenta.documento,

                    "Comercial":
                        cuenta.comercial,

                    "Total":
                        Number(cuenta.total),

                    "Total abonado":
                        Number(cuenta.total_abonado),

                    "Saldo pendiente":
                        Number(cuenta.saldo_pendiente),

                    "Cantidad de abonos":
                        Number(cuenta.cantidad_abonos),

                    "Días":
                        Number(cuenta.dias),

                    "Estado":
                        cuenta.estado

                }));


            /* =================================
               CREAR LIBRO EXCEL
            ================================= */

            const libro =
    XLSX.utils.book_new();


const hoja =
    XLSX.utils.json_to_sheet(
        datosExcel,
        {
            origin: "A5"
        }
    );


XLSX.utils.sheet_add_aoa(
    hoja,
    [
        ["CARTERA SIREM"],
        ["Estado actual de la cartera"],
        [`Generado: ${new Date().toLocaleDateString("es-CO")}`]
    ],
    {
        origin: "A1"
    }
);


XLSX.utils.book_append_sheet(
    libro,
    hoja,
    "Cartera"
);

/* =================================
   COMBINAR ENCABEZADOS
================================= */

hoja["!merges"] = [

    {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 10 }
    },

    {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 10 }
    },

    {
        s: { r: 2, c: 0 },
        e: { r: 2, c: 10 }
    }

];


/* =================================
   ESTILO TÍTULO PRINCIPAL
================================= */

hoja["A1"].s = {

    font: {
        bold: true,
        sz: 20,
        color: {
            rgb: "FFFFFF"
        }
    },

    fill: {
        fgColor: {
            rgb: "8B5E34"
        }
    },

    alignment: {
        horizontal: "center",
        vertical: "center"
    }

};


/* =================================
   ESTILO SUBTÍTULO
================================= */

hoja["A2"].s = {

    font: {
        bold: true,
        sz: 13,
        color: {
            rgb: "5B4636"
        }
    },

    fill: {
        fgColor: {
            rgb: "F3EDE7"
        }
    },

    alignment: {
        horizontal: "center",
        vertical: "center"
    }

};


/* =================================
   ESTILO FECHA
================================= */

hoja["A3"].s = {

    font: {
        italic: true,
        sz: 10,
        color: {
            rgb: "777777"
        }
    },

    alignment: {
        horizontal: "center",
        vertical: "center"
    }

};


/* =================================
   ALTURA DE FILAS SUPERIORES
================================= */

hoja["!rows"] = [

    { hpt: 32 },

    { hpt: 24 },

    { hpt: 20 },

    { hpt: 10 },

    { hpt: 24 }

];


/* =================================
   ESTILO ENCABEZADOS TABLA
================================= */

const encabezados = [

    "A5",
    "B5",
    "C5",
    "D5",
    "E5",
    "F5",
    "G5",
    "H5",
    "I5",
    "J5",
    "K5"

];


encabezados.forEach((celda) => {

    hoja[celda].s = {

        font: {

            bold: true,

            color: {
                rgb: "FFFFFF"
            }

        },

        fill: {

            fgColor: {
                rgb: "5B4636"
            }

        },

        alignment: {

            horizontal: "center",

            vertical: "center",

            wrapText: true

        },

        border: {

            top: {
                style: "thin",
                color: {
                    rgb: "8B5E34"
                }
            },

            bottom: {
                style: "thin",
                color: {
                    rgb: "8B5E34"
                }
            },

            left: {
                style: "thin",
                color: {
                    rgb: "8B5E34"
                }
            },

            right: {
                style: "thin",
                color: {
                    rgb: "8B5E34"
                }
            }

        }

    };

});


/* =================================
   ESTILO FILAS DE DATOS
================================= */

datos.forEach((cuenta, index) => {

    const fila = index + 6;


    const colorFondo =
        index % 2 === 0
            ? "FFFFFF"
            : "F7F3F0";


    for (
        let columna = 0;
        columna <= 10;
        columna++
    ) {

        const letra =
            XLSX.utils.encode_col(
                columna
            );


        const celda =
            hoja[`${letra}${fila}`];


        if (celda) {

            celda.s = {

                fill: {

                    fgColor: {
                        rgb: colorFondo
                    }

                },

                alignment: {

                    vertical: "center"

                },

                border: {

                    bottom: {

                        style: "thin",

                        color: {
                            rgb: "E6DDD5"
                        }

                    }

                }

            };

        }

    }


    /* MONEDA */

    ["F", "G", "H"].forEach(
        (columna) => {

            const celda =
                hoja[`${columna}${fila}`];


            if (celda) {

                celda.z =
                    '$#,##0';

            }

        }
    );


    /* CENTRAR COLUMNAS */

    ["A", "B", "I", "J", "K"].forEach(
        (columna) => {

            const celda =
                hoja[`${columna}${fila}`];


            if (celda) {

                celda.s = {

                    ...celda.s,

                    alignment: {

                        horizontal: "center",

                        vertical: "center"

                    }

                };

            }

        }
    );


    /* COLOR SEGÚN ESTADO */

    const celdaEstado =
        hoja[`K${fila}`];


    if (celdaEstado) {

        let colorEstado =
            "777777";


        if (
            cuenta.estado === "VENCIDA"
        ) {

            colorEstado =
                "B42318";

        }


        if (
            cuenta.estado === "SEGUIMIENTO"
        ) {

            colorEstado =
                "B54708";

        }


        if (
            cuenta.estado === "AL_DIA"
        ) {

            colorEstado =
                "027A48";

        }


        celdaEstado.s = {

            ...celdaEstado.s,

            font: {

                bold: true,

                color: {
                    rgb: colorEstado
                }

            }

        };

    }

});
/* =================================
   ESTILO GENERAL DE LAS FILAS
================================= */

const totalFilas =
    datosExcel.length;


/* BORDES SUAVES */

const bordes = {

    top: {
        style: "thin",
        color: {
            rgb: "E8E1DA"
        }
    },

    bottom: {
        style: "thin",
        color: {
            rgb: "E8E1DA"
        }
    },

    left: {
        style: "thin",
        color: {
            rgb: "F3EEE9"
        }
    },

    right: {
        style: "thin",
        color: {
            rgb: "F3EEE9"
        }
    }

};


/* RECORRER TODAS LAS FILAS */

for (
    let fila = 5;
    fila < totalFilas + 5;
    fila++
) {

    const esFilaAlterna =
        (fila - 5) % 2 === 0;


    for (
        let columna = 0;
        columna < 18;
        columna++
    ) {

        const celda =
            XLSX.utils.encode_cell({

                r: fila,
                c: columna

            });


        if (!hoja[celda]) continue;


        hoja[celda].s = {

            font: {

                sz: 9,

                color: {
                    rgb: "4F4F4F"
                }

            },


            fill: {

                fgColor: {

                    rgb:
                        esFilaAlterna
                            ? "F8F4F0"
                            : "FFFFFF"

                }

            },


            border:
                bordes,


            alignment: {

                vertical:
                    "center",

                horizontal:

                    columna >= 9
                        ? "right"
                        : "left"

            }

        };

    }

}

/* =================================
   AJUSTAR ANCHO DE COLUMNAS
================================= */

hoja["!cols"] = [

    { wch: 14 }, // Remisión
    { wch: 14 }, // Fecha
    { wch: 28 }, // Cliente
    { wch: 18 }, // Ciudad
    { wch: 24 }, // Comercial
    { wch: 32 }, // Producto
    { wch: 18 }, // Código producto
    { wch: 24 }, // Línea
    { wch: 14 }, // Placa
    { wch: 10 }, // Cantidad
    { wch: 16 }, // Precio lista
    { wch: 16 }, // Precio venta
    { wch: 18 }, // Total producto
    { wch: 18 }, // Total remisión
    { wch: 18 }, // Saldo pendiente
    { wch: 18 }, // Medio pago
    { wch: 14 }, // Estado
    { wch: 16 }  // Código WO

];

/* =================================
   RESALTAR DÍAS MAYORES A 45
================================= */

datos.forEach(
    (cuenta, index) => {

        const fila =
            index + 6;

        if (
            Number(cuenta.dias) > 45
        ) {

            const celda =
                hoja[`J${fila}`];

            if (celda) {

                celda.s = {

    ...celda.s,

    font: {
        ...(celda.s?.font || {}),
        bold: true,
        color: {
            rgb: "C00000"
        }
    },

    alignment: {
        horizontal: "center",
        vertical: "center"
    }

};

            }

        }

    }
);

            /* =================================
               DESCARGAR ARCHIVO
            ================================= */

            XLSX.writeFile(

                libro,

                "Cartera SIREM.xlsx"

            );

            return;

        }
/* =================================
   EXPORTAR CARTERA A PDF
================================= */

if (
    tipo === "cartera" &&
    formato === "PDF"
) {

    const respuesta =
        await fetch(
            "/api/exportaciones/cartera"
        );


    console.log(
        "RESPUESTA PDF:",
        respuesta.status,
        respuesta.statusText
    );


    if (!respuesta.ok) {

        const errorBackend =
            await respuesta.json();

        throw new Error(
            errorBackend.mensaje ||
            "No se pudieron obtener los datos de cartera."
        );

    }


    const datos =
        await respuesta.json();


    /* =================================
       CREAR DOCUMENTO PDF
    ================================= */

    const pdf =
        new jsPDF(
            "l",
            "mm",
            "a4"
        );


   /* =================================
   ENCABEZADO DEL PDF
================================= */


/* Fondo del encabezado */

pdf.setFillColor(
    139,
    94,
    52
);

pdf.roundedRect(
    14,
    12,
    269,
    32,
    3,
    3,
    "F"
);


/* Línea decorativa */

pdf.setFillColor(
    198,
    155,
    109
);

pdf.roundedRect(
    14,
    12,
    7,
    32,
    3,
    3,
    "F"
);


/* Título */

pdf.setTextColor(
    255,
    255,
    255
);

pdf.setFont(
    "helvetica",
    "bold"
);

pdf.setFontSize(23);

pdf.text(
    "CARTERA",
    30,
    27
);


/* Nombre del sistema */

pdf.setFontSize(10);

pdf.setFont(
    "helvetica",
    "normal"
);

pdf.text(
    "SISTEMA DE INFORMACIÓN SIREM",
    30,
    35
);


/* Información derecha */

pdf.setFontSize(9);

pdf.text(
    "ESTADO ACTUAL DE LA CARTERA",
    265,
    23,
    {
        align: "right"
    }
);


pdf.setFontSize(8);

pdf.text(
    `Generado el ${new Date().toLocaleDateString("es-CO")}`,
    265,
    31,
    {
        align: "right"
    }
);


/* Restaurar color */

pdf.setTextColor(
    0,
    0,
    0
);
    /* =================================
       TABLA
    ================================= */

    autoTable(
        pdf,
        {

            startY: 40,


            head: [

                [

                    "Remisión",

                    "Fecha",

                    "Cliente",

                    "Comercial",

                    "Total",

                    "Abonado",

                    "Saldo",

                    "Abonos",

                    "Días",

                    "Estado"

                ]

            ],


            body:

                datos.map(
                    (cuenta) => [

                        cuenta.numero_remision,


                        new Date(
                            cuenta.fecha
                        ).toLocaleDateString(
                            "es-CO"
                        ),


                        cuenta.cliente,


                        cuenta.comercial,


                        `$ ${Number(
                            cuenta.total
                        ).toLocaleString(
                            "es-CO"
                        )}`,


                        `$ ${Number(
                            cuenta.total_abonado
                        ).toLocaleString(
                            "es-CO"
                        )}`,


                        `$ ${Number(
                            cuenta.saldo_pendiente
                        ).toLocaleString(
                            "es-CO"
                        )}`,


                        cuenta.cantidad_abonos,


                        cuenta.dias,


                        cuenta.estado

                    ]

                ),


            styles: {

                fontSize: 7,

                cellPadding: 2,

                valign: "middle"

            },


            headStyles: {

                fillColor: [
                    139,
                    94,
                    52
                ],

                textColor: 255,

                fontStyle: "bold",

                halign: "center"

            },


            alternateRowStyles: {

                fillColor: [
                    248,
                    245,
                    241
                ]

            },


            columnStyles: {

                0: {
                    halign: "center"
                },

                1: {
                    halign: "center"
                },

                4: {
                    halign: "right"
                },

                5: {
                    halign: "right"
                },

                6: {
                    halign: "right"
                },

                7: {
                    halign: "center"
                },

                8: {
                    halign: "center"
                },

                9: {
                    halign: "center"
                }

            }

        }

    );


    /* =================================
       DESCARGAR PDF
    ================================= */

    pdf.save(
        "Cartera SIREM.pdf"
    );

    return;

}

        /* =================================
           DEMÁS EXPORTACIONES
        ================================= */

        alert(
            `${tipo} - ${formato}\n` +
            `Periodo: ${periodo}\n\n` +
            `Esta exportación aún está en desarrollo.`
        );


    } catch (error) {

        console.error(
            "Error exportando:",
            error
        );

        alert(
            error.message ||
            "Ocurrió un error al obtener los datos para la exportación."
        );

    }

};

    return (

        <div className="exportaciones-page">


            {/* =================================
                ENCABEZADO
            ================================= */}

            <div className="exportaciones-header">

                <div>

                    <span className="exportaciones-tag">
                        ARCHIVOS
                    </span>

                    <h1>
                        Exportaciones
                    </h1>

                    <p>
                        Genera y descarga información de SIREM.
                    </p>

                </div>

            </div>


            {/* =================================
                INFORMACIÓN
            ================================= */}

            <div className="exportaciones-nota">

                <div className="exportaciones-nota-icon">

                    <Download size={19} />

                </div>

                <div>

                    <strong>
                        Selecciona el formato de exportación
                    </strong>

                    <p>
                        Puedes generar la información del periodo seleccionado
                        en formato PDF o Excel.
                    </p>

                </div>

            </div>


            {/* =================================
                REPORTES
            ================================= */}

            <div className="exportaciones-grid">

                {exportaciones.map((reporte) => {

                    const Icono = reporte.icono;

                    return (

                        <div
                            className="exportacion-card"
                            key={reporte.id}
                        >

                            <div className="exportacion-card-top">

                                <div
                                    className={`exportacion-icon ${reporte.clase}`}
                                >

                                    <Icono size={22} />

                                </div>

                            </div>


                            <div className="exportacion-content">

                                <h3>
                                    {reporte.titulo}
                                </h3>

                                <p>
                                    {reporte.descripcion}
                                </p>

                            </div>


                            <div className="exportacion-actions">

                          <button
    className="btn-exportar pdf"
    onClick={() =>
        exportar(
            reporte.tipo,
            "PDF"
        )
    }
>

    <FileText size={15} />

    PDF

</button>


                      {reporte.tipo !== "general" && (
    <button
        className="btn-exportar excel"
        onClick={() =>
            exportar(
                reporte.tipo,
                "Excel"
            )
        }
    >
        <FileSpreadsheet size={15} />

        Excel
    </button>
)}

                            </div>

                        </div>

                    );

                })}

            </div>


            {/* =================================
                EXPORTACIONES RECIENTES
            ================================= */}

            <div className="exportaciones-recientes">


                <div className="recientes-header">

                    <div>

                        <h2>
                            Exportaciones recientes
                        </h2>

                        <p>
                            Archivos generados recientemente.
                        </p>

                    </div>

                    <Clock3 size={20} />

                </div>


                <div className="recientes-lista">


                    <div className="reciente-item">

                        <div className="reciente-icon pdf">

                            <FileText size={17} />

                        </div>

                        <div className="reciente-info">

                            <strong>
                                Reporte general
                            </strong>

                            <span>
                                Agosto 2026 · PDF
                            </span>

                        </div>

                        <span className="reciente-fecha">
                            Hoy · 10:32
                        </span>

                        <button
                            className="btn-descargar"
                            title="Descargar"
                        >

                            <Download size={16} />

                        </button>

                    </div>


                    <div className="reciente-item">

                        <div className="reciente-icon excel">

                            <FileSpreadsheet size={17} />

                        </div>

                        <div className="reciente-info">

                            <strong>
                                Cartera
                            </strong>

                            <span>
                                Agosto 2026 · Excel
                            </span>

                        </div>

                        <span className="reciente-fecha">
                            Hoy · 09:15
                        </span>

                        <button
                            className="btn-descargar"
                            title="Descargar"
                        >

                            <Download size={16} />

                        </button>

                    </div>


                    <div className="reciente-item">

                        <div className="reciente-icon pdf">

                            <FileText size={17} />

                        </div>

                        <div className="reciente-info">

                            <strong>
                                Remisiones
                            </strong>

                            <span>
                                Julio 2026 · PDF
                            </span>

                        </div>

                        <span className="reciente-fecha">
                            Ayer · 16:40
                        </span>

                        <button
                            className="btn-descargar"
                            title="Descargar"
                        >

                            <Download size={16} />

                        </button>

                    </div>


                </div>

            </div>


        </div>

    );

}

export default Exportaciones;