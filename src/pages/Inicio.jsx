import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { useAvisos } from "../components/Avisos/Avisos";
import { obtenerPeriodo, fechaDeRemision } from "../utils/fechas";
import "./Inicio.css";
import { DollarSign, Receipt, Wallet, Users } from "lucide-react";

function Inicio({ setPaginaActiva, nombreUsuario, mesSeleccionado }) {
  const { avisar } = useAvisos();

  const fechaActual = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const fechaFormateada =
    fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1);

  const [kpis, setKpis] = useState({
    ventas_mes: 0,
    total_remisiones: 0,
    total_clientes: 0,
    cartera_total: 0,
  });

  const [ultimasRemisiones, setUltimasRemisiones] = useState([]);
  const [carteraVencida, setCarteraVencida] = useState([]);
  const [rendimientoComerciales, setRendimientoComerciales] = useState([]);

  const mostrarVariacion = (valor) => {
    if (valor === null || valor === undefined) {
      return "Sin comparación";
    }

    const numero = Number(valor);

    if (numero === 0) {
      return "0% vs mes anterior";
    }

    const porcentaje = Math.abs(numero).toFixed(0);

    return numero > 0
      ? `+${porcentaje}% vs mes anterior`
      : `-${porcentaje}% vs mes anterior`;
  };

  useEffect(() => {
    const cargarKPIs = async () => {
      try {
        const periodo = obtenerPeriodo(mesSeleccionado);

        const respuesta = await apiFetch(
          `/api/inicio?mes=${periodo.mes}&anio=${periodo.anio}`,
        );

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar los KPIs.");
        }

        const datos = await respuesta.json();

        setKpis(datos);
      } catch (error) {
        console.error("Error cargando KPIs:", error);

        avisar.fallo(error, "No se pudo cargar toda la información del inicio.");
      }
    };

    cargarKPIs();
  }, [mesSeleccionado]);

  useEffect(() => {
    const cargarUltimasRemisiones = async () => {
      try {
        const periodo = obtenerPeriodo(mesSeleccionado);

        const respuesta = await apiFetch(
          `/api/inicio/ultimas-remisiones?mes=${periodo.mes}&anio=${periodo.anio}`,
        );

        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las últimas remisiones.");
        }

        const datos = await respuesta.json();

        setUltimasRemisiones(datos);
      } catch (error) {
        console.error("Error cargando últimas remisiones:", error);

        avisar.fallo(error, "No se pudo cargar toda la información del inicio.");
      }
    };

    cargarUltimasRemisiones();
  }, [mesSeleccionado]);

  useEffect(() => {
    const cargarCarteraVencida = async () => {
      try {
        const respuesta = await apiFetch("/api/inicio/cartera-vencida");

        if (!respuesta.ok) {
          throw new Error("No se pudo cargar la cartera vencida.");
        }

        const datos = await respuesta.json();

        setCarteraVencida(datos);
      } catch (error) {
        console.error("Error cargando cartera vencida:", error);

        avisar.fallo(error, "No se pudo cargar toda la información del inicio.");
      }
    };

    cargarCarteraVencida();
  }, []);

  useEffect(() => {
    const cargarRendimientoComerciales = async () => {
      try {
        const periodo = obtenerPeriodo(mesSeleccionado);

        const respuesta = await apiFetch(
          `/api/inicio/rendimiento-comerciales?mes=${periodo.mes}&anio=${periodo.anio}`,
        );

        if (!respuesta.ok) {
          throw new Error("No se pudo cargar el rendimiento de comerciales.");
        }

        const datos = await respuesta.json();

        setRendimientoComerciales(datos);
      } catch (error) {
        console.error("Error cargando rendimiento de comerciales:", error);

        avisar.fallo(error, "No se pudo cargar toda la información del inicio.");
      }
    };

    cargarRendimientoComerciales();
  }, [mesSeleccionado]);

  return (
    <div className="inicio">
      <span className="page-tag">INICIO</span>

      <h1 className="page-title">Buen día, {nombreUsuario}</h1>

      <p className="page-subtitle">
        {fechaFormateada} • Resumen general de la operación durante el mes.
      </p>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon sales">
            <DollarSign size={22} strokeWidth={2.2} />
          </div>

          <div className="kpi-info">
            <span className="kpi-label">Ventas del mes</span>

            <h3>${Number(kpis.ventas_mes).toLocaleString("es-CO")}</h3>
          </div>
          <span
            className={`kpi-badge ${
              kpis.variacion_ventas === null ||
              kpis.variacion_ventas === undefined
                ? "neutral"
                : Number(kpis.variacion_ventas) >= 0
                  ? "positive"
                  : "negative"
            }`}
          >
            {mostrarVariacion(kpis.variacion_ventas)}
          </span>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon remision">
            <Receipt size={24} strokeWidth={2.2} />
          </div>

          <div>
            <span className="kpi-label">Remisiones</span>

            <h3>{Number(kpis.total_remisiones).toLocaleString("es-CO")}</h3>

            <small>
              ${Number(kpis.ventas_mes || 0).toLocaleString("es-CO")}
            </small>
          </div>
          <span
            className={`kpi-badge ${
              kpis.variacion_remisiones === null ||
              kpis.variacion_remisiones === undefined
                ? "neutral"
                : Number(kpis.variacion_remisiones) >= 0
                  ? "positive"
                  : "negative"
            }`}
          >
            {mostrarVariacion(kpis.variacion_remisiones)}
          </span>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon factura">
            <Users size={24} strokeWidth={2.2} />
          </div>

          <div>
            <span className="kpi-label">Clientes</span>

            <h3>{Number(kpis.total_clientes).toLocaleString("es-CO")}</h3>

            <small>Este mes</small>
          </div>
          <span
            className={`kpi-badge ${
              kpis.variacion_clientes === null ||
              kpis.variacion_clientes === undefined
                ? "neutral"
                : Number(kpis.variacion_clientes) >= 0
                  ? "positive"
                  : "negative"
            }`}
          >
            {mostrarVariacion(kpis.variacion_clientes)}
          </span>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon cartera">
            <Wallet size={24} strokeWidth={2.2} />
          </div>
          <div>
            <span className="kpi-label">Cartera generada</span>

            <h3>${Number(kpis.cartera_mes || 0).toLocaleString("es-CO")}</h3>

            <small>
              Total pendiente $
              {Number(kpis.cartera_total || 0).toLocaleString("es-CO")}
            </small>
          </div>
          <div className="cartera-badges">
            <span
              className={`kpi-badge ${
                kpis.variacion_cartera === null ||
                kpis.variacion_cartera === undefined
                  ? "neutral"
                  : Number(kpis.variacion_cartera) > 0
                    ? "negative"
                    : "positive"
              }`}
            >
              {mostrarVariacion(kpis.variacion_cartera)}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header cartera-header">
            <h3>Últimas remisiones</h3>

            <button onClick={() => setPaginaActiva("remisiones")}>
              Ver todo
            </button>
          </div>

          <div className="activity-list">
            {ultimasRemisiones.length === 0 ? (
              <div className="activity-empty">
                No hay remisiones registradas en este mes.
              </div>
            ) : (
              ultimasRemisiones.map((remision) => (
                <div className="activity-item" key={remision.id_remision}>
                  <div>
                    <strong>{remision.numero_remision}</strong>

                    <span>{remision.cliente}</span>
                  </div>

                  <div className="activity-right">
                    <strong>
                      ${Number(remision.total).toLocaleString("es-CO")}
                    </strong>

                    <small>
                      {fechaDeRemision(remision.fecha).toLocaleDateString("es-CO")}
                    </small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CARTERA VENCIDA */}
        <div className="dashboard-card cartera-dashboard">
          <div className="card-header">
            <h3>Cartera</h3>

            <button onClick={() => setPaginaActiva("cartera")}>Ver todo</button>
          </div>

          <div className="cartera-seccion cartera-vencida">
            {carteraVencida.length === 0 ? (
              <div className="activity-empty">No hay cartera vencida.</div>
            ) : (
              <div className="activity-list">
                {carteraVencida.map((cuenta) => {
                  const diasVencida = Number(cuenta.dias) - 45;

                  return (
                    <div className="activity-item" key={cuenta.id_remision}>
                      <div>
                        <strong>{cuenta.cliente}</strong>

                        <span>
                          {diasVencida === 1
                            ? "Vencida hace 1 día"
                            : `Vencida hace ${diasVencida} días`}
                        </span>
                      </div>

                      <div className="status danger">
                        $
                        {Number(cuenta.saldo_pendiente).toLocaleString("es-CO")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-card mt">
        <div className="card-header">
          <h3>Rendimiento de comerciales</h3>

          <span>Resultados del mes seleccionado</span>
        </div>

        {rendimientoComerciales.length === 0 ? (
          <div className="activity-empty">No hay resultados para este mes.</div>
        ) : (
          <div className="ranking-lista">
            {rendimientoComerciales.map((comercial, indice) => {
              const mayorVenta = Number(rendimientoComerciales[0].total_ventas);

              const porcentaje =
                mayorVenta > 0
                  ? (Number(comercial.total_ventas) / mayorVenta) * 100
                  : 0;

              const iniciales = comercial.nombre
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((palabra) => palabra[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  className={`ranking-fila ${indice === 0 ? "lider" : ""}`}
                  key={comercial.id_comercial}
                >
                  <span className="ranking-posicion">{indice + 1}</span>

                  <div className="ranking-avatar">{iniciales}</div>

                  <div className="ranking-centro">
                    <div className="ranking-nombre">
                      <h4>{comercial.nombre}</h4>

                      <span>
                        {Number(comercial.total_remisiones).toLocaleString(
                          "es-CO",
                        )}{" "}
                        {Number(comercial.total_remisiones) === 1
                          ? "remisión"
                          : "remisiones"}{" "}
                        · Prom. $
                        {Number(comercial.promedio_remision).toLocaleString(
                          "es-CO",
                        )}
                      </span>
                    </div>

                    <div className="progress">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${porcentaje}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="ranking-total">
                    <strong>
                      ${Number(comercial.total_ventas).toLocaleString("es-CO")}
                    </strong>

                    <small>{porcentaje.toFixed(0)}% del líder</small>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Inicio;
