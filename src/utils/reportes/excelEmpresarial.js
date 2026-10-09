import * as XLSX from "xlsx-js-style";

/*
Formato empresarial común a los Excel de SIREM.
xlsx-js-style no permite insertar imágenes, así que el encabezado
lleva el nombre de la marca como texto con el color del logo.
*/

const COLOR = {
  marca: "8B1A1A",
  oscuro: "2B1B12",
  dorado: "A56A2A",
  texto: "2D1C10",
  gris: "80756B",
  linea: "E8DED2",
  fondoSuave: "FAF7F2",
  fondoTotal: "F5EEE5",
  peligro: "B84A3D",
};

const FORMATOS = {
  moneda: '"$" #,##0',
  // "#,##0.##" dejaba una coma suelta en los enteros ("15,")
  numero: "General",
  entero: "#,##0",
  texto: "@",
};

const FILA_ENCABEZADOS = 5; // índice 0: la fila 6 de Excel

const fuente = (extra = {}) => ({ name: "Calibri", sz: 10, color: { rgb: COLOR.texto }, ...extra });

const borde = (color = COLOR.linea, estilo = "thin") => ({ style: estilo, color: { rgb: color } });

/**
 * Crea una hoja con formato empresarial.
 *
 * columnas: [{ titulo, valor: (fila) => any, ancho, formato, alinear }]
 *   formato: "moneda" | "numero" | "entero" | "texto"
 * filas: datos de origen
 * totales: { [titulo de columna]: valor } para la fila final (opcional)
 * estiloFila: (fila, indice) => { fondo?, separador? } (opcional)
 * estiloCelda: (fila, columna) => estilo de fuente extra (opcional)
 * resumen: bloque debajo de la tabla (opcional):
 *   { titulo, columnas: [{ titulo, formato }], filas: [[...]], total: [...] }
 */
export const crearHoja = ({
  titulo,
  subtitulo = "",
  columnas,
  filas,
  totales = null,
  estiloFila = null,
  estiloCelda = null,
  resumen = null,
}) => {
  const ultimaColumna = columnas.length - 1;

  const generado = new Date().toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ENCABEZADO DEL DOCUMENTO */

  const hoja = XLSX.utils.aoa_to_sheet([
    ["San Fermín"],
    ["Talabarteros desde siempre"],
    [titulo.toUpperCase()],
    [[subtitulo, `Generado el ${generado}`].filter(Boolean).join("   ·   ")],
    [],
    columnas.map((columna) => columna.titulo),
  ]);

  const estilosEncabezado = [
    { font: fuente({ sz: 18, bold: true, color: { rgb: COLOR.marca } }) },
    { font: fuente({ sz: 9, italic: true, color: { rgb: COLOR.gris } }) },
    {
      font: fuente({ sz: 13, bold: true, color: { rgb: COLOR.oscuro } }),
      border: { bottom: borde(COLOR.dorado, "medium") },
    },
    { font: fuente({ sz: 9, color: { rgb: COLOR.gris } }) },
  ];

  estilosEncabezado.forEach((estilo, fila) => {
    for (let c = 0; c <= ultimaColumna; c++) {
      const ref = XLSX.utils.encode_cell({ r: fila, c });
      hoja[ref] = hoja[ref] || { t: "s", v: "" };
      hoja[ref].s = { ...estilo, alignment: { vertical: "center" } };
    }
  });

  /* ENCABEZADOS DE COLUMNA */

  columnas.forEach((columna, c) => {
    const ref = XLSX.utils.encode_cell({ r: FILA_ENCABEZADOS, c });

    hoja[ref].s = {
      font: fuente({ bold: true, sz: 9, color: { rgb: "FFFFFF" } }),
      fill: { fgColor: { rgb: COLOR.oscuro } },
      alignment: {
        horizontal: columna.alinear || "left",
        vertical: "center",
        wrapText: true,
      },
      border: { right: borde("4A3628") },
    };
  });

  /* FILAS DE DATOS */

  filas.forEach((fila, indice) => {
    const r = FILA_ENCABEZADOS + 1 + indice;
    const extra = estiloFila?.(fila, indice) || {};
    const fondo = extra.fondo || (indice % 2 === 1 ? COLOR.fondoSuave : "FFFFFF");

    columnas.forEach((columna, c) => {
      const valor = columna.valor(fila);
      const esNumero = typeof valor === "number" && !Number.isNaN(valor);

      const celda = esNumero
        ? { t: "n", v: valor, z: FORMATOS[columna.formato] || FORMATOS.numero }
        : { t: "s", v: valor ?? "" };

      celda.s = {
        font: fuente(estiloCelda?.(fila, columna) || {}),
        fill: { fgColor: { rgb: fondo } },
        alignment: {
          horizontal: columna.alinear || (esNumero ? "right" : "left"),
          vertical: "center",
          wrapText: columna.ajustar || false,
        },
        border: {
          bottom: borde(),
          ...(extra.separador && { top: borde(COLOR.dorado) }),
        },
      };

      hoja[XLSX.utils.encode_cell({ r, c })] = celda;
    });
  });

  /* FILA DE TOTALES */

  let ultimaFila = FILA_ENCABEZADOS + filas.length;

  if (totales) {
    ultimaFila += 1;

    columnas.forEach((columna, c) => {
      const valor = c === 0 ? "TOTAL" : totales[columna.titulo];
      const esNumero = typeof valor === "number";

      hoja[XLSX.utils.encode_cell({ r: ultimaFila, c })] = {
        t: esNumero ? "n" : "s",
        v: valor ?? "",
        ...(esNumero && { z: FORMATOS[columna.formato] || FORMATOS.numero }),
        s: {
          font: fuente({ bold: true, color: { rgb: COLOR.oscuro } }),
          fill: { fgColor: { rgb: COLOR.fondoTotal } },
          alignment: { horizontal: esNumero ? "right" : "left", vertical: "center" },
          border: { top: borde(COLOR.dorado, "medium"), bottom: borde(COLOR.dorado) },
        },
      };
    });
  }

  /* BLOQUE DE RESUMEN (debajo de la tabla, opcional) */

  let combinarTituloResumen = null;

  if (resumen) {
    let r = ultimaFila + 3;

    combinarTituloResumen = {
      s: { r, c: 0 },
      e: { r, c: resumen.columnas.length - 1 },
    };

    const escribir = (c, valor, estilo, formato) => {
      const esNumero = typeof valor === "number";

      hoja[XLSX.utils.encode_cell({ r, c })] = {
        t: esNumero ? "n" : "s",
        v: valor ?? "",
        ...(esNumero && { z: FORMATOS[formato] || FORMATOS.numero }),
        s: estilo,
      };
    };

    // Título del bloque
    resumen.columnas.forEach((_, c) =>
      escribir(c, c === 0 ? resumen.titulo.toUpperCase() : "", {
        font: fuente({ sz: 12, bold: true, color: { rgb: COLOR.oscuro } }),
        border: { bottom: borde(COLOR.dorado, "medium") },
      }),
    );

    r += 1;

    // Encabezados
    resumen.columnas.forEach((columna, c) =>
      escribir(c, columna.titulo, {
        font: fuente({ bold: true, sz: 9, color: { rgb: "FFFFFF" } }),
        fill: { fgColor: { rgb: COLOR.oscuro } },
        alignment: { horizontal: c === 0 ? "left" : "right", vertical: "center" },
      }),
    );

    // Filas
    resumen.filas.forEach((fila, indice) => {
      r += 1;

      fila.forEach((valor, c) =>
        escribir(
          c,
          valor,
          {
            font: fuente(),
            fill: { fgColor: { rgb: indice % 2 === 1 ? COLOR.fondoSuave : "FFFFFF" } },
            alignment: { horizontal: c === 0 ? "left" : "right", vertical: "center" },
            border: { bottom: borde() },
          },
          resumen.columnas[c].formato,
        ),
      );
    });

    // Total
    if (resumen.total) {
      r += 1;

      resumen.total.forEach((valor, c) =>
        escribir(
          c,
          valor,
          {
            font: fuente({ bold: true, color: { rgb: COLOR.oscuro } }),
            fill: { fgColor: { rgb: COLOR.fondoTotal } },
            alignment: { horizontal: c === 0 ? "left" : "right", vertical: "center" },
            border: { top: borde(COLOR.dorado, "medium"), bottom: borde(COLOR.dorado) },
          },
          resumen.columnas[c].formato,
        ),
      );
    }

    ultimaFila = r;
  }

  /* DIMENSIONES Y AJUSTES */

  hoja["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: ultimaFila, c: Math.max(ultimaColumna, (resumen?.columnas.length || 1) - 1) },
  });

  hoja["!merges"] = [0, 1, 2, 3].map((r) => ({
    s: { r, c: 0 },
    e: { r, c: ultimaColumna },
  }));

  if (combinarTituloResumen) {
    hoja["!merges"].push(combinarTituloResumen);
  }

  hoja["!cols"] = columnas.map((columna) => ({ wch: columna.ancho || 14 }));

  hoja["!rows"] = [
    { hpt: 26 },
    { hpt: 15 },
    { hpt: 24 },
    { hpt: 16 },
    { hpt: 8 },
    { hpt: 26 },
  ];

  hoja["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: FILA_ENCABEZADOS, c: 0 },
      e: { r: FILA_ENCABEZADOS + filas.length, c: ultimaColumna },
    }),
  };

  return hoja;
};

/** Crea el libro con una hoja y lo descarga */
export const descargarLibro = (hoja, nombreHoja, nombreArchivo) => {
  const libro = XLSX.utils.book_new();

  hoja["!tabColor"] = { rgb: COLOR.marca };

  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);

  XLSX.writeFile(libro, nombreArchivo);
};

export const COLOR_PELIGRO = COLOR.peligro;
