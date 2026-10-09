const mesesNumericos = {
    Enero: "01",
    Febrero: "02",
    Marzo: "03",
    Abril: "04",
    Mayo: "05",
    Junio: "06",
    Julio: "07",
    Agosto: "08",
    Septiembre: "09",
    Octubre: "10",
    Noviembre: "11",
    Diciembre: "12"
};

export const obtenerPeriodo = (mesSeleccionado) => {

    const [nombreMes, anio] =
        mesSeleccionado.split(" ");

    return {
        mes: mesesNumericos[nombreMes],
        anio: anio
    };

};

/*
Fecha de hoy en formato AAAA-MM-DD según la hora local.
(toISOString() usa UTC: en Colombia, después de las 7 p. m.
devolvería la fecha del día siguiente).
*/

export const hoyLocal = () => {
    const hoy = new Date();

    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
};

/*
Convierte la fecha de una remisión (columna DATE) en una fecha local.
El servidor la envía como "2026-10-08T00:00:00.000Z" o similar;
new Date() la tomaría en UTC y en Colombia mostraría el día anterior,
así que solo se usa la parte AAAA-MM-DD.
*/

export const fechaDeRemision = (fecha) => {
    const [anio, mes, dia] = String(fecha).slice(0, 10).split("-").map(Number);

    return new Date(anio, mes - 1, dia);
};
