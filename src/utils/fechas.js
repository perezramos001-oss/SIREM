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