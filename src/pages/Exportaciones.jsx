import { apiFetch } from "../utils/api";
import { etiquetaMedioPago } from "../utils/mediosPago";
import { fechaDeRemision } from "../utils/fechas";
import { useAvisos } from "../components/Avisos/Avisos";
import {
  crearDocumento,
  tituloSeccion,
  indicadores,
  datosEnColumnas,
  tabla,
  pesos,
  numero,
  etiquetaEstado,
  colorEstado,
  COLORES,
} from "../utils/reportes/pdfEmpresarial";
import {
  crearHoja,
  descargarLibro,
  COLOR_PELIGRO,
} from "../utils/reportes/excelEmpresarial";

import { useState } from "react";

// Exportaciones.css se conserva: también tiene estilos de Configuración
import "./Exportaciones.css";
import "./ExportacionesDiseno.css";

import {
  FileSpreadsheet,
  FileText,
  BarChart3,
  Receipt,
  WalletCards,
  Printer,
  CalendarDays,
  CalendarRange,
  Clock3,
  Check,
  LoaderCircle,
} from "lucide-react";

function Exportaciones({ mesSeleccionado }) {
  const { avisar } = useAvisos();

  const periodo = mesSeleccionado || "";

  /* Archivo que se está generando ("remisiones-PDF", "remision"...) */
  const [generando, setGenerando] = useState(null);

  const [numeroImprimir, setNumeroImprimir] = useState("");

  const avisarDescarga = (nombreArchivo) =>
    avisar.exito(`Se descargó «${nombreArchivo}».`, "Archivo generado");

  const exportaciones = [
    {
      tipo: "general",
      titulo: "Reporte general",
      descripcion: "Resumen ejecutivo de la actividad del mes.",
      icono: BarChart3,
      usaPeriodo: true,
      contenido: [
        "Indicadores de ventas, saldo, clientes y comerciales",
        "Detalle de cada remisión del período",
        "Totales del mes",
      ],
      formatos: ["PDF"],
    },
    {
      tipo: "remisiones",
      titulo: "Remisiones",
      descripcion: "Listado detallado, producto por producto.",
      icono: Receipt,
      usaPeriodo: true,
      contenido: [
        "Cliente, comercial, productos y placas",
        "Pagos, saldos y estado de cada remisión",
        "Código de World Office y comentarios",
      ],
      formatos: ["PDF", "Excel"],
    },
    {
      tipo: "anual",
      titulo: "Remisiones anuales",
      descripcion: "Consolidado de todo el año del período seleccionado.",
      icono: CalendarRange,
      alcance: `Año ${periodo.split(" ")[1] || ""}`,
      contenido: [
        "Todas las remisiones de enero a diciembre",
        "Resumen mes a mes de ventas, abonos y cartera",
        "Total de remisiones y cartera del año",
      ],
      formatos: ["PDF", "Excel"],
    },
    {
      tipo: "cartera",
      titulo: "Cartera",
      descripcion: "Cuentas pendientes y su antigüedad.",
      icono: WalletCards,
      usaPeriodo: false,
      contenido: [
        "Saldo por rangos: 0–30, 31–45 y más de 45 días",
        "Abonos y saldo de cada cuenta",
        "Cuentas vencidas resaltadas",
      ],
      formatos: ["PDF", "Excel"],
    },
  ];

  /* =================================
   APOYOS
================================= */

  const obtenerJson = async (url, mensajeError) => {
    const respuesta = await apiFetch(url);

    if (!respuesta.ok) {
      let errorBackend = {};

      try {
        errorBackend = await respuesta.json();
      } catch {
        errorBackend = {};
      }

      throw new Error(errorBackend.mensaje || mensajeError);
    }

    return respuesta.json();
  };

  /* Formato dd/mm/aaaa (siempre con dos dígitos en día y mes) */
  const fechaCorta = (fecha) =>
    fecha
      ? fechaDeRemision(fecha).toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";

  const sumar = (lista, campo) =>
    lista.reduce((total, item) => total + (Number(item[campo]) || 0), 0);

  /* Pinta el texto del estado con su color en las tablas PDF */

  const colorearEstado = (indiceColumna, obtenerEstado) => (data) => {
    if (data.section === "body" && data.column.index === indiceColumna) {
      const estado = obtenerEstado(data.row.index);

      if (estado) {
        data.cell.styles.textColor = colorEstado(estado);
        data.cell.styles.fontStyle = "bold";
      }
    }
  };

  /* =================================
   IMPRIMIR UNA REMISIÓN
================================= */

  const imprimirRemision = async (numeroIngresado) => {
    try {
      if (!numeroIngresado.trim()) {
        avisar.advertencia("Escribe el número de la remisión que quieres imprimir.");

        return;
      }

      /* Permite escribir "REM 1033", "REM1033" o "1033" */

      let numeroBuscado = numeroIngresado.trim().toUpperCase();

      if (!numeroBuscado.startsWith("REM ")) {
        numeroBuscado = `REM ${numeroBuscado.replace(/^REM\s*/i, "")}`;
      }

      const datos = await obtenerJson(
        `/api/remisiones/buscar?numero=${encodeURIComponent(numeroBuscado)}`,
        `No se encontró la remisión ${numeroBuscado}.`,
      );

      const remision = datos.remision;

      if (!remision) {
        throw new Error("El servidor no devolvió la información de la remisión.");
      }

      const productos = remision.productos || [];

      if (productos.length === 0) {
        avisar.advertencia("La remisión no tiene productos registrados.");

        return;
      }

      const doc = await crearDocumento({
        titulo: "Remisión",
        subtitulo: remision.numero_remision,
        detalle: `Fecha: ${fechaCorta(remision.fecha)}`,
      });

      const { pdf, ancho, alto, margen } = doc;

      /* DATOS GENERALES */

      let y = tituloSeccion(doc, "Datos de la remisión", doc.inicioY + 4);

      y = datosEnColumnas(
        doc,
        [
          { etiqueta: "Cliente", valor: remision.cliente },
          { etiqueta: "Ciudad", valor: remision.ciudad },
          { etiqueta: "Comercial", valor: remision.comercial },
          { etiqueta: "Fecha", valor: fechaCorta(remision.fecha) },
          { etiqueta: "Estado", valor: etiquetaEstado(remision.estado) },
          {
            etiqueta: "Medio de pago",
            valor: etiquetaMedioPago(remision.medio_pago),
          },
        ],
        y + 2,
      );

      /* PRODUCTOS */

      y = tituloSeccion(doc, "Productos", y + 2);

      y = tabla(doc, {
        startY: y,
        head: [["Código", "Producto", "Placa", "Cant.", "Precio", "Total"]],
        body: productos.map((producto) => [
          producto.codigo_producto || "",
          producto.nombre_producto || "",
          producto.placa || "—",
          numero(producto.cantidad),
          pesos(producto.precio_venta),
          pesos(producto.total_producto),
        ]),
        columnStyles: {
          0: { cellWidth: 26 },
          2: { cellWidth: 24 },
          3: { cellWidth: 14, halign: "center" },
          4: { cellWidth: 28, halign: "right" },
          5: { cellWidth: 30, halign: "right" },
        },
      });

      /* TOTALES (alineados a la derecha) */

      const totalAbonado = Math.max(
        Number(remision.total || 0) - Number(remision.saldo_pendiente || 0),
        0,
      );

      if (y > alto - 85) {
        pdf.addPage();
        y = doc.inicioY;
      }

      const anchoTotales = 80;
      const xTotales = ancho - margen - anchoTotales;

      y += 6;

      [
        ["Total remisión", pesos(remision.total), false],
        ["Abonado", pesos(totalAbonado), false],
        ["Saldo pendiente", pesos(remision.saldo_pendiente), true],
      ].forEach(([etiqueta, valor, destacado]) => {
        if (destacado) {
          pdf.setFillColor(...COLORES.fondoTotal);
          pdf.rect(xTotales, y - 4.5, anchoTotales, 7.5, "F");
        }

        pdf.setFont("helvetica", destacado ? "bold" : "normal");
        pdf.setFontSize(destacado ? 9.5 : 8.5);
        pdf.setTextColor(...(destacado ? COLORES.oscuro : COLORES.gris));
        pdf.text(etiqueta, xTotales + 3, y);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...COLORES.oscuro);
        pdf.text(valor, ancho - margen - 3, y, { align: "right" });

        y += 7.5;
      });

      /* COMENTARIOS */

      if (remision.comentarios) {
        y = tituloSeccion(doc, "Comentarios", y + 6);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...COLORES.texto);

        const lineas = pdf.splitTextToSize(remision.comentarios, ancho - margen * 2);

        pdf.text(lineas, margen, y);

        y += lineas.length * 4.5;
      }

      /* FIRMAS (al final de la última página) */

      const yFirmas = alto - 34;

      if (y > yFirmas - 12) {
        pdf.addPage();
      }

      pdf.setDrawColor(...COLORES.gris);
      pdf.setLineWidth(0.3);
      pdf.line(margen + 6, yFirmas, margen + 76, yFirmas);
      pdf.line(ancho - margen - 76, yFirmas, ancho - margen - 6, yFirmas);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORES.gris);
      pdf.text("Quien realiza la remisión", margen + 41, yFirmas + 5, {
        align: "center",
      });
      pdf.text("Jefe", ancho - margen - 41, yFirmas + 5, { align: "center" });

      const nombreArchivo = `Remisión ${remision.numero_remision}.pdf`;

      doc.finalizar(nombreArchivo);

      avisarDescarga(nombreArchivo);
    } catch (error) {
      console.error("Error imprimiendo remisión:", error);

      avisar.fallo(error, error.message || "No se pudo imprimir la remisión.");
    }
  };

  /* =================================
   REPORTE GENERAL (PDF)
================================= */

  const exportarGeneralPdf = async () => {
    const datos = await obtenerJson(
      `/api/exportaciones/general?periodo=${encodeURIComponent(periodo)}`,
      "No se pudo obtener el reporte general.",
    );

    const remisiones = datos.remisiones || [];

    const totalFacturado = sumar(remisiones, "total");
    const saldoPendiente = sumar(remisiones, "saldo_pendiente");

    const doc = await crearDocumento({
      titulo: "Reporte general",
      subtitulo: periodo,
      detalle: `${remisiones.length} ${remisiones.length === 1 ? "remisión" : "remisiones"}`,
    });

    let y = tituloSeccion(doc, "Resumen del período", doc.inicioY + 4);

    y = indicadores(
      doc,
      [
        { etiqueta: "Remisiones", valor: remisiones.length },
        { etiqueta: "Total facturado", valor: pesos(totalFacturado) },
        {
          etiqueta: "Saldo pendiente",
          valor: pesos(saldoPendiente),
          color: COLORES.peligro,
        },
        {
          etiqueta: "Clientes",
          valor: new Set(remisiones.map((r) => r.cliente)).size,
          color: COLORES.oscuro,
        },
        {
          etiqueta: "Comerciales",
          valor: new Set(remisiones.map((r) => r.comercial)).size,
          color: COLORES.oscuro,
        },
      ],
      y,
    );

    y = tituloSeccion(doc, "Detalle de remisiones", y);

    if (remisiones.length === 0) {
      doc.pdf.setFont("helvetica", "normal");
      doc.pdf.setFontSize(9);
      doc.pdf.setTextColor(...COLORES.gris);
      doc.pdf.text(`No hay remisiones registradas en ${periodo}.`, doc.margen, y + 4);
    } else {
      tabla(doc, {
        startY: y,
        head: [["Remisión", "Fecha", "Cliente", "Comercial", "Total", "Saldo"]],
        body: remisiones.map((remision) => [
          remision.numero_remision,
          fechaCorta(remision.fecha),
          remision.cliente,
          remision.comercial,
          pesos(remision.total),
          pesos(remision.saldo_pendiente),
        ]),
        foot: [["Total", "", "", "", pesos(totalFacturado), pesos(saldoPendiente)]],
        columnStyles: {
          0: { cellWidth: 20, fontStyle: "bold" },
          1: { cellWidth: 19 },
          4: { cellWidth: 26, halign: "right" },
          5: { cellWidth: 24, halign: "right" },
        },
      });
    }

    const nombreArchivo = `Reporte General - ${periodo}.pdf`;

    doc.finalizar(nombreArchivo);

    avisarDescarga(nombreArchivo);
  };

  /* =================================
   REMISIONES: CONSTRUCCIÓN COMÚN
   (mensual y anual usan las mismas funciones)
================================= */

  const MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  /* Una remisión por cada id (sus filas traen un producto cada una) */

  const remisionesUnicasDe = (filas) => [
    ...new Map(filas.map((fila) => [fila.id_remision, fila])).values(),
  ];

  const abonadoDe = (remision) =>
    Math.max(Number(remision.total || 0) - Number(remision.saldo_pendiente || 0), 0);

  /* Resumen por mes: [{ mes, remisiones, vendido, abonado, cartera }] */

  const resumenPorMes = (filas) => {
    const unicas = remisionesUnicasDe(filas);

    return MESES.map((mes, indice) => {
      const delMes = unicas.filter(
        (remision) => fechaDeRemision(remision.fecha).getMonth() === indice,
      );

      return {
        mes,
        remisiones: delMes.length,
        vendido: sumar(delMes, "total"),
        abonado: delMes.reduce((total, remision) => total + abonadoDe(remision), 0),
        cartera: sumar(delMes, "saldo_pendiente"),
      };
    });
  };

  const totalesResumen = (resumen) => ({
    remisiones: resumen.reduce((t, mes) => t + mes.remisiones, 0),
    vendido: resumen.reduce((t, mes) => t + mes.vendido, 0),
    abonado: resumen.reduce((t, mes) => t + mes.abonado, 0),
    cartera: resumen.reduce((t, mes) => t + mes.cartera, 0),
  });

  const construirExcelRemisiones = ({ filas, titulo, subtitulo, nombreArchivo, resumen }) => {
    /* Cada remisión es un grupo de filas: se marca el inicio de cada una */

    let remisionAnterior = null;
    let grupo = -1;

    const grupos = filas.map((fila) => {
      if (fila.id_remision !== remisionAnterior) {
        grupo += 1;
        remisionAnterior = fila.id_remision;

        return { indice: grupo, inicio: true };
      }

      return { indice: grupo, inicio: false };
    });

    const primerasFilas = new Set(filas.filter((_, indice) => grupos[indice].inicio));

    const columnas = [
      { titulo: "Remisión", valor: (r) => r.numero_remision, ancho: 12 },
      { titulo: "Fecha", valor: (r) => fechaCorta(r.fecha), ancho: 11, alinear: "center" },
      { titulo: "Cliente", valor: (r) => r.cliente, ancho: 30 },
      { titulo: "Ciudad", valor: (r) => r.ciudad || "", ancho: 15 },
      { titulo: "Comercial", valor: (r) => r.comercial, ancho: 24 },
      { titulo: "Producto", valor: (r) => r.nombre_producto || "", ancho: 32 },
      { titulo: "Código producto", valor: (r) => r.codigo_producto || "", ancho: 15 },
      { titulo: "Línea", valor: (r) => r.linea_producto || "", ancho: 18 },
      { titulo: "Placa", valor: (r) => r.placa || "", ancho: 12 },
      { titulo: "Cantidad", valor: (r) => Number(r.cantidad), ancho: 10, formato: "numero" },
      { titulo: "Precio lista", valor: (r) => Number(r.precio_lista), ancho: 14, formato: "moneda" },
      { titulo: "Precio venta", valor: (r) => Number(r.precio_venta), ancho: 14, formato: "moneda" },
      { titulo: "Total producto", valor: (r) => Number(r.total_producto), ancho: 15, formato: "moneda" },
      // Los valores de la remisión van solo en su primera fila,
      // para que no parezcan repetidos ni se sumen varias veces
      {
        titulo: "Total remisión",
        valor: (r) => (primerasFilas.has(r) ? Number(r.total) : ""),
        ancho: 15,
        formato: "moneda",
      },
      {
        titulo: "Total abonado",
        valor: (r) => (primerasFilas.has(r) ? abonadoDe(r) : ""),
        ancho: 15,
        formato: "moneda",
      },
      {
        titulo: "Saldo pendiente",
        valor: (r) => (primerasFilas.has(r) ? Number(r.saldo_pendiente) : ""),
        ancho: 15,
        formato: "moneda",
      },
      { titulo: "Medio de pago", valor: (r) => etiquetaMedioPago(r.medio_pago), ancho: 15 },
      { titulo: "Estado", valor: (r) => etiquetaEstado(r.estado), ancho: 12 },
      { titulo: "Comentarios", valor: (r) => r.comentarios || "", ancho: 40, ajustar: true },
      { titulo: "Código WO", valor: (r) => r.codigo_world_office || "", ancho: 16 },
    ];

    let bloqueResumen = null;

    if (resumen) {
      const total = totalesResumen(resumen);

      bloqueResumen = {
        titulo: "Resumen anual",
        columnas: [
          { titulo: "Mes" },
          { titulo: "Remisiones", formato: "entero" },
          { titulo: "Total vendido", formato: "moneda" },
          { titulo: "Abonado", formato: "moneda" },
          { titulo: "Cartera", formato: "moneda" },
        ],
        filas: resumen.map((mes) => [mes.mes, mes.remisiones, mes.vendido, mes.abonado, mes.cartera]),
        total: ["TOTAL DEL AÑO", total.remisiones, total.vendido, total.abonado, total.cartera],
      };
    }

    const hoja = crearHoja({
      titulo,
      subtitulo,
      columnas,
      filas,
      resumen: bloqueResumen,
      estiloFila: (_, indice) => ({
        // El fondo alterna por remisión, no por fila
        fondo: grupos[indice].indice % 2 === 1 ? "FAF7F2" : "FFFFFF",
        separador: grupos[indice].inicio && indice > 0,
      }),
    });

    descargarLibro(hoja, "Remisiones", nombreArchivo);

    avisarDescarga(nombreArchivo);
  };

  const construirPdfRemisiones = async ({ filas, titulo, subtitulo, nombreArchivo, resumen }) => {
    const remisionesUnicas = remisionesUnicasDe(filas);

    const totalVendido = sumar(remisionesUnicas, "total");
    const saldoPendiente = sumar(remisionesUnicas, "saldo_pendiente");

    const doc = await crearDocumento({
      orientacion: "l",
      titulo,
      subtitulo,
      detalle: `${remisionesUnicas.length} remisiones · ${filas.length} líneas de producto`,
    });

    let y = indicadores(
      doc,
      [
        { etiqueta: "Remisiones", valor: remisionesUnicas.length },
        { etiqueta: "Unidades vendidas", valor: numero(sumar(filas, "cantidad")), color: COLORES.oscuro },
        { etiqueta: "Total vendido", valor: pesos(totalVendido) },
        {
          etiqueta: resumen ? "Cartera anual" : "Saldo pendiente",
          valor: pesos(saldoPendiente),
          color: COLORES.peligro,
        },
      ],
      doc.inicioY + 2,
    );

    /* Los datos de la remisión solo se muestran en su primera fila */

    const esPrimera = filas.map(
      (fila, indice) => indice === 0 || fila.id_remision !== filas[indice - 1].id_remision,
    );

    y = tabla(doc, {
      startY: y,
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
          "Comentarios",
        ],
      ],
      body: filas.map((fila, indice) => {
        const primera = esPrimera[indice];

        return [
          primera ? fila.numero_remision : "",
          primera ? fechaCorta(fila.fecha) : "",
          primera ? fila.cliente : "",
          primera ? fila.comercial : "",
          fila.nombre_producto || "",
          fila.codigo_producto || "",
          fila.placa || "",
          numero(fila.cantidad),
          pesos(fila.precio_venta),
          pesos(fila.total_producto),
          primera ? etiquetaEstado(fila.estado) : "",
          primera ? fila.codigo_world_office || "" : "",
          primera ? fila.comentarios || "" : "",
        ];
      }),
      foot: [
        ["Total", "", "", "", "", "", "", numero(sumar(filas, "cantidad")), "", pesos(sumar(filas, "total_producto")), "", "", ""],
      ],
      // Sin filas alternas: cada remisión se separa con una línea
      alternateRowStyles: {},
      styles: {
        fontSize: 7,
        cellPadding: { top: 1.8, bottom: 1.8, left: 1.8, right: 1.8 },
        textColor: COLORES.texto,
        lineWidth: 0,
        valign: "middle",
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 17, fontStyle: "bold" },
        1: { cellWidth: 16 },
        2: { cellWidth: 30 },
        3: { cellWidth: 26 },
        5: { cellWidth: 16 },
        6: { cellWidth: 14 },
        7: { cellWidth: 10, halign: "center" },
        8: { cellWidth: 19, halign: "right" },
        9: { cellWidth: 21, halign: "right" },
        10: { cellWidth: 16 },
        11: { cellWidth: 17 },
        12: { cellWidth: 30, fontSize: 6.5, textColor: COLORES.gris },
      },
      didParseCell: (data) => {
        if (data.section === "body" && esPrimera[data.row.index] && data.row.index > 0) {
          data.cell.styles.lineWidth = { top: 0.3 };
          data.cell.styles.lineColor = COLORES.linea;
        }

        if (data.section === "body" && data.column.index === 10) {
          data.cell.styles.textColor = colorEstado(filas[data.row.index].estado);
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    /* RESUMEN ANUAL (al final del documento) */

    if (resumen) {
      const total = totalesResumen(resumen);

      // El resumen (título + 12 meses + total) necesita unos 95 mm
      if (y > doc.alto - 110) {
        doc.pdf.addPage();
        y = doc.inicioY;
      }

      y = tituloSeccion(doc, "Resumen anual", y + 12);

      tabla(doc, {
        startY: y,
        head: [["Mes", "Remisiones", "Total vendido", "Abonado", "Cartera"]],
        body: resumen.map((mes) => [
          mes.mes,
          mes.remisiones,
          pesos(mes.vendido),
          pesos(mes.abonado),
          pesos(mes.cartera),
        ]),
        foot: [
          [
            "Total del año",
            total.remisiones,
            pesos(total.vendido),
            pesos(total.abonado),
            pesos(total.cartera),
          ],
        ],
        columnStyles: {
          0: { cellWidth: 60, fontStyle: "bold" },
          1: { halign: "center" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right", fontStyle: "bold" },
        },
        didParseCell: (data) => {
          // Los meses sin movimiento se ven más tenues
          if (data.section === "body" && resumen[data.row.index].remisiones === 0) {
            data.cell.styles.textColor = COLORES.gris;
            data.cell.styles.fontStyle = "normal";
          }
        },
      });
    }

    doc.finalizar(nombreArchivo);

    avisarDescarga(nombreArchivo);
  };

  /* =================================
   REMISIONES DEL MES (EXCEL Y PDF)
================================= */

  const obtenerRemisionesDelMes = async () => {
    const datos = await obtenerJson(
      `/api/exportaciones/remisiones?periodo=${encodeURIComponent(periodo)}`,
      "No se pudieron obtener las remisiones.",
    );

    const filas = datos.remisiones || [];

    if (filas.length === 0) {
      avisar.info(`No hay remisiones registradas en ${periodo}.`, "Nada para exportar");
    }

    return filas;
  };

  const exportarRemisionesExcel = async () => {
    const filas = await obtenerRemisionesDelMes();

    if (filas.length === 0) return;

    construirExcelRemisiones({
      filas,
      titulo: "Remisiones",
      subtitulo: `Listado detallado · ${periodo} · ${remisionesUnicasDe(filas).length} remisiones`,
      nombreArchivo: `Remisiones ${periodo}.xlsx`,
    });
  };

  const exportarRemisionesPdf = async () => {
    const filas = await obtenerRemisionesDelMes();

    if (filas.length === 0) return;

    await construirPdfRemisiones({
      filas,
      titulo: "Remisiones",
      subtitulo: `Listado detallado · ${periodo}`,
      nombreArchivo: `Remisiones ${periodo}.pdf`,
    });
  };

  /* =================================
   REMISIONES DEL AÑO (EXCEL Y PDF)
================================= */

  const anio = periodo.split(" ")[1] || String(new Date().getFullYear());

  /* Se piden los 12 meses con la misma consulta del reporte mensual */

  const obtenerRemisionesDelAnio = async () => {
    const meses = await Promise.all(
      MESES.map((mes) =>
        obtenerJson(
          `/api/exportaciones/remisiones?periodo=${encodeURIComponent(`${mes} ${anio}`)}`,
          `No se pudieron obtener las remisiones de ${mes}.`,
        ),
      ),
    );

    // Orden cronológico: por fecha y número de remisión
    const numeroDe = (fila) => Number(String(fila.numero_remision).replace(/\D/g, "")) || 0;

    const filas = meses
      .flatMap((datos) => datos.remisiones || [])
      .sort(
        (a, b) =>
          String(a.fecha).slice(0, 10).localeCompare(String(b.fecha).slice(0, 10)) ||
          numeroDe(a) - numeroDe(b),
      );

    if (filas.length === 0) {
      avisar.info(`No hay remisiones registradas en ${anio}.`, "Nada para exportar");
    }

    return filas;
  };

  const exportarAnualExcel = async () => {
    const filas = await obtenerRemisionesDelAnio();

    if (filas.length === 0) return;

    construirExcelRemisiones({
      filas,
      titulo: `Remisiones ${anio}`,
      subtitulo: `Consolidado anual · ${remisionesUnicasDe(filas).length} remisiones`,
      nombreArchivo: `Remisiones anuales ${anio}.xlsx`,
      resumen: resumenPorMes(filas),
    });
  };

  const exportarAnualPdf = async () => {
    const filas = await obtenerRemisionesDelAnio();

    if (filas.length === 0) return;

    await construirPdfRemisiones({
      filas,
      titulo: `Remisiones ${anio}`,
      subtitulo: `Consolidado anual · Enero a Diciembre ${anio}`,
      nombreArchivo: `Remisiones anuales ${anio}.pdf`,
      resumen: resumenPorMes(filas),
    });
  };

  /* =================================
   CARTERA (EXCEL)
================================= */

  const exportarCarteraExcel = async () => {
    const cuentas = await obtenerJson(
      "/api/exportaciones/cartera",
      "No se pudieron obtener los datos de cartera.",
    );

    if (cuentas.length === 0) {
      avisar.info("No hay cartera pendiente.", "Nada para exportar");

      return;
    }

    const columnas = [
      { titulo: "Remisión", valor: (c) => c.numero_remision, ancho: 12 },
      { titulo: "Fecha", valor: (c) => fechaCorta(c.fecha), ancho: 11, alinear: "center" },
      { titulo: "Cliente", valor: (c) => c.cliente, ancho: 32 },
      { titulo: "Documento", valor: (c) => c.documento || "", ancho: 15 },
      { titulo: "Comercial", valor: (c) => c.comercial, ancho: 24 },
      { titulo: "Total", valor: (c) => Number(c.total), ancho: 15, formato: "moneda" },
      { titulo: "Total abonado", valor: (c) => Number(c.total_abonado), ancho: 15, formato: "moneda" },
      { titulo: "Saldo pendiente", valor: (c) => Number(c.saldo_pendiente), ancho: 16, formato: "moneda" },
      { titulo: "Cantidad de abonos", valor: (c) => Number(c.cantidad_abonos), ancho: 11, formato: "entero", alinear: "center" },
      { titulo: "Días", valor: (c) => Number(c.dias), ancho: 8, formato: "entero", alinear: "center" },
      { titulo: "Estado", valor: (c) => etiquetaEstado(c.estado), ancho: 13 },
    ];

    const hoja = crearHoja({
      titulo: "Cartera",
      subtitulo: `Estado actual · ${cuentas.length} cuentas pendientes`,
      columnas,
      filas: cuentas,
      totales: {
        Total: sumar(cuentas, "total"),
        "Total abonado": sumar(cuentas, "total_abonado"),
        "Saldo pendiente": sumar(cuentas, "saldo_pendiente"),
      },
      // Las cuentas vencidas (más de 45 días) se resaltan
      estiloCelda: (cuenta, columna) =>
        Number(cuenta.dias) > 45 && ["Días", "Estado"].includes(columna.titulo)
          ? { bold: true, color: { rgb: COLOR_PELIGRO } }
          : null,
    });

    descargarLibro(hoja, "Cartera", "Cartera SIREM.xlsx");

    avisarDescarga("Cartera SIREM.xlsx");
  };

  /* =================================
   CARTERA (PDF)
================================= */

  const exportarCarteraPdf = async () => {
    const cuentas = await obtenerJson(
      "/api/exportaciones/cartera",
      "No se pudieron obtener los datos de cartera.",
    );

    if (cuentas.length === 0) {
      avisar.info("No hay cartera pendiente.", "Nada para exportar");

      return;
    }

    const saldoPorRango = (desde, hasta) =>
      cuentas
        .filter((cuenta) => Number(cuenta.dias) >= desde && Number(cuenta.dias) <= hasta)
        .reduce((total, cuenta) => total + Number(cuenta.saldo_pendiente || 0), 0);

    const doc = await crearDocumento({
      orientacion: "l",
      titulo: "Cartera",
      subtitulo: "Estado actual de la cartera",
      detalle: `${cuentas.length} cuentas pendientes`,
    });

    const y = indicadores(
      doc,
      [
        { etiqueta: "Cartera total", valor: pesos(sumar(cuentas, "saldo_pendiente")), color: COLORES.oscuro },
        { etiqueta: "0 – 30 días", valor: pesos(saldoPorRango(0, 30)), color: COLORES.exito },
        { etiqueta: "31 – 45 días", valor: pesos(saldoPorRango(31, 45)), color: COLORES.alerta },
        { etiqueta: "Más de 45 días", valor: pesos(saldoPorRango(46, Infinity)), color: COLORES.peligro },
      ],
      doc.inicioY + 2,
    );

    tabla(doc, {
      startY: y,
      head: [
        ["Remisión", "Fecha", "Cliente", "Documento", "Comercial", "Total", "Abonado", "Saldo", "Abonos", "Días", "Estado"],
      ],
      body: cuentas.map((cuenta) => [
        cuenta.numero_remision,
        fechaCorta(cuenta.fecha),
        cuenta.cliente,
        cuenta.documento || "",
        cuenta.comercial,
        pesos(cuenta.total),
        pesos(cuenta.total_abonado),
        pesos(cuenta.saldo_pendiente),
        cuenta.cantidad_abonos,
        cuenta.dias,
        etiquetaEstado(cuenta.estado),
      ]),
      foot: [
        [
          "Total",
          "",
          "",
          "",
          "",
          pesos(sumar(cuentas, "total")),
          pesos(sumar(cuentas, "total_abonado")),
          pesos(sumar(cuentas, "saldo_pendiente")),
          "",
          "",
          "",
        ],
      ],
      columnStyles: {
        0: { cellWidth: 20, fontStyle: "bold" },
        1: { cellWidth: 20 },
        3: { cellWidth: 24 },
        5: { cellWidth: 26, halign: "right" },
        6: { cellWidth: 26, halign: "right" },
        7: { cellWidth: 26, halign: "right", fontStyle: "bold" },
        8: { cellWidth: 15, halign: "center" },
        9: { cellWidth: 13, halign: "center" },
        10: { cellWidth: 24 },
      },
      didParseCell: (data) => {
        colorearEstado(10, (fila) => cuentas[fila].estado)(data);

        if (data.section === "body" && data.column.index === 9 && Number(cuentas[data.row.index].dias) > 45) {
          data.cell.styles.textColor = COLORES.peligro;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.finalizar("Cartera SIREM.pdf");

    avisarDescarga("Cartera SIREM.pdf");
  };

  /* =================================
   ELEGIR EXPORTACIÓN
================================= */

  const exportar = async (tipo, formato) => {
    const acciones = {
      "general-PDF": exportarGeneralPdf,
      "remisiones-Excel": exportarRemisionesExcel,
      "remisiones-PDF": exportarRemisionesPdf,
      "anual-Excel": exportarAnualExcel,
      "anual-PDF": exportarAnualPdf,
      "cartera-Excel": exportarCarteraExcel,
      "cartera-PDF": exportarCarteraPdf,
    };

    const accion = acciones[`${tipo}-${formato}`];

    if (!accion || generando) {
      return;
    }

    setGenerando(`${tipo}-${formato}`);

    try {
      await accion();
    } catch (error) {
      console.error("Error exportando:", error);

      avisar.fallo(
        error,
        error.message || "Ocurrió un error al obtener los datos para la exportación.",
      );
    } finally {
      setGenerando(null);
    }
  };

  const generarRemision = async (e) => {
    e.preventDefault();

    if (generando) return;

    setGenerando("remision");

    try {
      await imprimirRemision(numeroImprimir);
    } finally {
      setGenerando(null);
    }
  };

  /* =================================
   VISTA
================================= */

  const ICONO_FORMATO = { PDF: FileText, Excel: FileSpreadsheet };

  const botonFormato = (tipo, formato) => {
    const clave = `${tipo}-${formato}`;
    const Icono = generando === clave ? LoaderCircle : ICONO_FORMATO[formato];

    return (
      <button
        type="button"
        key={formato}
        className={`exp-boton ${formato === "PDF" ? "pdf" : "excel"}`}
        onClick={() => exportar(tipo, formato)}
        disabled={Boolean(generando)}
      >
        <Icono size={16} className={generando === clave ? "exp-girando" : ""} />

        <span>
          {generando === clave ? "Generando…" : `Descargar ${formato}`}
        </span>

        <small>{formato === "PDF" ? ".pdf" : ".xlsx"}</small>
      </button>
    );
  };

  return (
    <div className="exp-pagina">
      {/* ENCABEZADO */}

      <div className="page-header">
        <div>
          <span className="page-tag">ARCHIVOS</span>

          <h1>Exportaciones</h1>

          <p>Descarga reportes de SIREM listos para compartir o imprimir.</p>
        </div>
      </div>

      {/* PERÍODO */}

      <div className="exp-periodo">
        <div className="exp-periodo-icono">
          <CalendarDays size={18} />
        </div>

        <div className="exp-periodo-texto">
          <span>Período de los reportes</span>
          <strong>{periodo || "Sin período seleccionado"}</strong>
        </div>

        <p className="exp-periodo-ayuda">
          Cámbialo con el selector de mes de la parte superior. La cartera
          siempre muestra el estado actual.
        </p>
      </div>

      {/* REPORTES */}

      <div className="exp-grid">
        {exportaciones.map((reporte) => {
          const Icono = reporte.icono;

          return (
            <article className="exp-tarjeta" key={reporte.tipo}>
              <header className="exp-tarjeta-encabezado">
                <div className={`exp-icono ${reporte.tipo}`}>
                  <Icono size={20} />
                </div>

                <span className="exp-alcance">
                  {reporte.alcance ? (
                    <>
                      <CalendarRange size={12} /> {reporte.alcance}
                    </>
                  ) : reporte.usaPeriodo ? (
                    <>
                      <CalendarDays size={12} /> {periodo}
                    </>
                  ) : (
                    <>
                      <Clock3 size={12} /> Estado actual
                    </>
                  )}
                </span>
              </header>

              <h3>{reporte.titulo}</h3>

              <p className="exp-descripcion">{reporte.descripcion}</p>

              <ul className="exp-contenido">
                {reporte.contenido.map((item) => (
                  <li key={item}>
                    <Check size={13} />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="exp-acciones">
                {reporte.formatos.map((formato) =>
                  botonFormato(reporte.tipo, formato),
                )}
              </div>
            </article>
          );
        })}

        {/* REMISIÓN INDIVIDUAL */}

        <article className="exp-tarjeta">
          <header className="exp-tarjeta-encabezado">
            <div className="exp-icono remision">
              <Printer size={20} />
            </div>

            <span className="exp-alcance">
              <FileText size={12} /> Documento
            </span>
          </header>

          <h3>Remisión individual</h3>

          <p className="exp-descripcion">
            Imprime una remisión con sus productos, totales y espacio para
            firmas.
          </p>

          <form className="exp-formulario" onSubmit={generarRemision}>
            <label htmlFor="exp-numero-remision">Número de remisión</label>

            <div className="exp-campo">
              <span>REM</span>

              <input
                id="exp-numero-remision"
                type="text"
                inputMode="numeric"
                placeholder="1033"
                value={numeroImprimir}
                onChange={(e) =>
                  setNumeroImprimir(e.target.value.replace(/^REM\s*/i, ""))
                }
              />
            </div>
          </form>

          <div className="exp-acciones">
            <button
              type="button"
              className="exp-boton pdf"
              onClick={generarRemision}
              disabled={Boolean(generando)}
            >
              {generando === "remision" ? (
                <LoaderCircle size={16} className="exp-girando" />
              ) : (
                <Printer size={16} />
              )}

              <span>
                {generando === "remision" ? "Generando…" : "Generar PDF"}
              </span>

              <small>.pdf</small>
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

export default Exportaciones;
