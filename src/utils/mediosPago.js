/*
Medios de pago tal como se guardan en la base de datos
(el valor) y como se muestran en pantalla (la etiqueta).
"PENDIENTE PAGO" viene de las remisiones importadas.
*/

export const MEDIOS_PAGO = [
  { valor: "dolares", etiqueta: "Dólares" },
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "otro", etiqueta: "Otro" },
  { valor: "regalo", etiqueta: "Regalo" },
  { valor: "t_credito", etiqueta: "T. Crédito" },
  { valor: "transferencia", etiqueta: "Transferencia" },
  { valor: "t_debito", etiqueta: "T. Débito" },
  { valor: "PENDIENTE PAGO", etiqueta: "Pendiente pago" },
];

export const etiquetaMedioPago = (valor) => {
  if (!valor) {
    return "";
  }

  const medio = MEDIOS_PAGO.find(
    (item) => item.valor.toLowerCase() === String(valor).toLowerCase(),
  );

  return medio ? medio.etiqueta : valor;
};
