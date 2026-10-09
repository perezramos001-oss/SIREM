import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "../../assets/logo-san-fermin.png";

/*
Formato empresarial común a todos los PDF de SIREM:
logo de San Fermín arriba a la izquierda, título a la derecha,
tablas sobrias y pie con fecha de generación y número de página.
*/

export const COLORES = {
  marca: [139, 26, 26], // rojo del logo
  oscuro: [43, 27, 18],
  dorado: [165, 106, 42],
  texto: [45, 28, 16],
  gris: [128, 117, 107],
  linea: [232, 222, 210],
  fondoSuave: [250, 247, 242],
  fondoTotal: [245, 238, 229],
  peligro: [184, 74, 61],
  alerta: [183, 121, 31],
  exito: [47, 125, 87],
};

const MARGEN = 14;
const ALTO_ENCABEZADO = 36;
const PROPORCION_LOGO = 640 / 252;

/* =========================
   LOGO
========================= */

let logoCache = null;

const cargarLogo = async () => {
  if (logoCache) return logoCache;

  try {
    const blob = await (await fetch(logoUrl)).blob();

    logoCache = await new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(lector.result);
      lector.onerror = rechazar;
      lector.readAsDataURL(blob);
    });
  } catch (error) {
    // Sin logo el documento igual se genera
    console.error("No se pudo cargar el logo:", error);
    logoCache = null;
  }

  return logoCache;
};

/* =========================
   FORMATOS
========================= */

export const pesos = (valor) =>
  `$ ${Math.round(Number(valor) || 0).toLocaleString("es-CO")}`;

export const numero = (valor) =>
  (Number(valor) || 0).toLocaleString("es-CO", { maximumFractionDigits: 2 });

const fechaHoraGeneracion = () =>
  new Date().toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/* =========================
   DOCUMENTO
========================= */

/**
 * Crea un documento con el formato de la empresa.
 * Devuelve { pdf, ancho, alto, inicioY, margen, finalizar }.
 * finalizar() dibuja encabezado y pie en todas las páginas y guarda.
 */
export const crearDocumento = async ({
  orientacion = "p",
  titulo,
  subtitulo = "",
  detalle = "",
}) => {
  const pdf = new jsPDF(orientacion, "mm", "a4");
  const logo = await cargarLogo();

  const ancho = pdf.internal.pageSize.getWidth();
  const alto = pdf.internal.pageSize.getHeight();

  const dibujarEncabezado = () => {
    const altoLogo = 15;

    if (logo) {
      pdf.addImage(
        logo,
        "PNG",
        MARGEN,
        10,
        altoLogo * PROPORCION_LOGO,
        altoLogo,
        "logo-san-fermin", // con alias la imagen se guarda una sola vez
        "FAST",
      );
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(...COLORES.marca);
      pdf.text("San Fermín", MARGEN, 20);
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...COLORES.oscuro);
    pdf.text(titulo.toUpperCase(), ancho - MARGEN, 15, { align: "right" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORES.gris);

    if (subtitulo) {
      pdf.text(subtitulo, ancho - MARGEN, 21, { align: "right" });
    }

    if (detalle) {
      pdf.setFontSize(8);
      pdf.text(detalle, ancho - MARGEN, 26, { align: "right" });
    }

    pdf.setDrawColor(...COLORES.dorado);
    pdf.setLineWidth(0.5);
    pdf.line(MARGEN, 30, ancho - MARGEN, 30);
  };

  const dibujarPie = (pagina, total) => {
    const y = alto - 9;

    pdf.setDrawColor(...COLORES.linea);
    pdf.setLineWidth(0.2);
    pdf.line(MARGEN, y - 5, ancho - MARGEN, y - 5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORES.gris);

    pdf.text("San Fermín · Talabarteros desde siempre", MARGEN, y);
    pdf.text(`Generado el ${fechaHoraGeneracion()} · SIREM`, ancho / 2, y, {
      align: "center",
    });
    pdf.text(`Página ${pagina} de ${total}`, ancho - MARGEN, y, {
      align: "right",
    });
  };

  const finalizar = (nombreArchivo) => {
    const total = pdf.getNumberOfPages();

    for (let pagina = 1; pagina <= total; pagina++) {
      pdf.setPage(pagina);
      dibujarEncabezado();
      dibujarPie(pagina, total);
    }

    pdf.save(nombreArchivo);
  };

  return {
    pdf,
    ancho,
    alto,
    margen: MARGEN,
    inicioY: ALTO_ENCABEZADO + 2,
    finalizar,
  };
};

/* =========================
   BLOQUES DE CONTENIDO
========================= */

/** Título de sección con una línea fina debajo. Devuelve la nueva Y. */
export const tituloSeccion = (doc, texto, y) => {
  const { pdf, ancho, margen } = doc;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORES.dorado);
  pdf.text(texto.toUpperCase(), margen, y, { charSpace: 0.6 });

  pdf.setDrawColor(...COLORES.linea);
  pdf.setLineWidth(0.2);
  pdf.line(margen, y + 2, ancho - margen, y + 2);

  return y + 8;
};

/**
 * Fila de indicadores: [{ etiqueta, valor, color? }].
 * Devuelve la Y donde termina.
 */
export const indicadores = (doc, items, y) => {
  const { pdf, ancho, margen } = doc;

  const espacio = 4;
  const anchoCaja = (ancho - margen * 2 - espacio * (items.length - 1)) / items.length;
  const altoCaja = 19;

  items.forEach((item, indice) => {
    const x = margen + indice * (anchoCaja + espacio);

    pdf.setFillColor(...COLORES.fondoSuave);
    pdf.setDrawColor(...COLORES.linea);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x, y, anchoCaja, altoCaja, 1.5, 1.5, "FD");

    // Acento de color a la izquierda
    pdf.setFillColor(...(item.color || COLORES.dorado));
    pdf.rect(x, y + 3, 0.8, altoCaja - 6, "F");

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORES.gris);

    const etiqueta = item.etiqueta.toUpperCase();
    let tamanoEtiqueta = 7;
    pdf.setFontSize(tamanoEtiqueta);

    while (
      tamanoEtiqueta > 5.5 &&
      pdf.getTextWidth(etiqueta) + etiqueta.length * 0.3 > anchoCaja - 8
    ) {
      tamanoEtiqueta -= 0.25;
      pdf.setFontSize(tamanoEtiqueta);
    }

    pdf.text(etiqueta, x + 5, y + 7, { charSpace: 0.3 });

    const valor = String(item.valor);

    // Reduce la letra hasta que el valor quepa en la caja
    pdf.setFont("helvetica", "bold");

    let tamano = 12;
    pdf.setFontSize(tamano);

    while (tamano > 7 && pdf.getTextWidth(valor) > anchoCaja - 9) {
      tamano -= 0.5;
      pdf.setFontSize(tamano);
    }

    pdf.setTextColor(...COLORES.oscuro);
    pdf.text(valor, x + 5, y + 14.5);
  });

  return y + altoCaja + 8;
};

/**
 * Pares etiqueta / valor en columnas: [{ etiqueta, valor }].
 * Devuelve la Y donde termina.
 */
export const datosEnColumnas = (doc, pares, y, columnas = 3) => {
  const { pdf, ancho, margen } = doc;

  const anchoColumna = (ancho - margen * 2) / columnas;
  const altoLinea = 4;

  // Valores partidos en líneas (máximo 2) para calcular el alto de cada fila
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);

  const lineas = pares.map((par) =>
    pdf.splitTextToSize(String(par.valor || "—"), anchoColumna - 6).slice(0, 2),
  );

  let yFila = y;

  for (let inicio = 0; inicio < pares.length; inicio += columnas) {
    const maxLineas = Math.max(
      ...lineas.slice(inicio, inicio + columnas).map((texto) => texto.length),
    );

    pares.slice(inicio, inicio + columnas).forEach((par, columna) => {
      const x = margen + columna * anchoColumna;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORES.gris);
      pdf.text(par.etiqueta.toUpperCase(), x, yFila, { charSpace: 0.3 });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORES.texto);
      pdf.text(lineas[inicio + columna], x, yFila + 5);
    });

    yFila += 8 + maxLineas * altoLinea;
  }

  return yFila;
};

/* =========================
   TABLAS
========================= */

/**
 * Tabla con el estilo de la empresa.
 * opciones: { head, body, foot, columnStyles, startY, ...autoTable }
 */
export const tabla = (doc, opciones) => {
  const { pdf, margen, inicioY } = doc;

  const { didParseCell, columnStyles = {}, ...resto } = opciones;

  autoTable(pdf, {
    // Una fila nunca se parte entre dos páginas
    rowPageBreak: "avoid",

    columnStyles,

    // Encabezado y totales se alinean igual que su columna
    didParseCell: (data) => {
      const alineacion = columnStyles[data.column.index]?.halign;

      if (data.section !== "body" && alineacion) {
        data.cell.styles.halign = alineacion;
      }

      didParseCell?.(data);
    },

    theme: "plain",

    margin: { top: inicioY, bottom: 18, left: margen, right: margen },

    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: COLORES.texto,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.2, right: 2.2 },
      valign: "middle",
      lineColor: COLORES.linea,
      lineWidth: { bottom: 0.15 },
      overflow: "linebreak",
    },

    headStyles: {
      fillColor: COLORES.oscuro,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      lineWidth: 0,
    },

    alternateRowStyles: {
      fillColor: COLORES.fondoSuave,
    },

    footStyles: {
      fillColor: COLORES.fondoTotal,
      textColor: COLORES.oscuro,
      fontStyle: "bold",
      lineColor: COLORES.dorado,
      lineWidth: { top: 0.4 },
    },

    showFoot: "lastPage",
    showHead: "everyPage",

    ...resto,
  });

  return pdf.lastAutoTable.finalY;
};

/** Texto de estado de una remisión o cuenta, en formato legible */
export const etiquetaEstado = (estado) =>
  ({
    PAGADA: "Pagada",
    PENDIENTE: "Pendiente",
    ABONO: "Abono",
    AL_DIA: "Al día",
    SEGUIMIENTO: "Seguimiento",
    VENCIDA: "Vencida",
  })[estado] ||
  estado ||
  "";

export const colorEstado = (estado) =>
  ({
    PAGADA: COLORES.exito,
    AL_DIA: COLORES.exito,
    ABONO: COLORES.alerta,
    SEGUIMIENTO: COLORES.alerta,
    PENDIENTE: COLORES.peligro,
    VENCIDA: COLORES.peligro,
  })[estado] || COLORES.texto;
