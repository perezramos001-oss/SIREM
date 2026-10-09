import { useState, useEffect } from "react";
import { apiGetJson } from "../utils/api";
import { obtenerPeriodo } from "../utils/fechas";
import { useAvisos } from "../components/Avisos/Avisos";
import "./Reportes.css";

import {
  TrendingUp,
  FileText,
  UsersRound,
  WalletCards,
  Award,
  Package,
} from "lucide-react";

const DETALLE_VACIO = {
  ventas_diarias: [],
  comerciales: [],
  productos: [],
  cartera: { al_dia: 0, seguimiento: 0, vencida: 0 },
};

const formatearPrecio = (valor) =>
  Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

/* $1.250.000 → "$1.3M", $450.000 → "$450K" (eje del gráfico) */
const formatearCorto = (valor) => {
  if (valor >= 1000000) {
    return `$${(valor / 1000000).toLocaleString("es-CO", {
      maximumFractionDigits: 1,
    })}M`;
  }

  if (valor >= 1000) {
    return `$${Math.round(valor / 1000)}K`;
  }

  return `$${valor}`;
};

/* Tope "redondo" para el eje: 1, 2 o 5 × 10ⁿ por encima del máximo */
const calcularTope = (maximo) => {
  if (maximo <= 0) return 1000000;

  const magnitud = 10 ** Math.floor(Math.log10(maximo));

  return [1, 2, 5, 10].map((factor) => factor * magnitud).find((tope) => tope >= maximo);
};

function Reportes({ mesSeleccionado }) {
  const { avisar } = useAvisos();

  const [kpis, setKpis] = useState({
    ventas_mes: 0,
    total_remisiones: 0,
    clientes: 0,
    cartera_generada: 0,
  });

  const [detalle, setDetalle] = useState(DETALLE_VACIO);
  const [cargando, setCargando] = useState(true);

  const { mes, anio } = obtenerPeriodo(mesSeleccionado);
  const [nombreMes] = mesSeleccionado.split(" ");

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);

      const consulta = `mes=${Number(mes)}&anio=${anio}`;

      /* Se cargan por separado: si una falla, la otra igual se muestra */
      const [resultadoKpis, resultadoDetalle] = await Promise.allSettled([
        apiGetJson(`/api/reportes/kpis?${consulta}`),
        apiGetJson(`/api/reportes/detalle?${consulta}`),
      ]);

      if (cancelado) return;

      if (resultadoKpis.status === "fulfilled") {
        setKpis(resultadoKpis.value);
      } else {
        console.error("Error cargando KPIs de reportes:", resultadoKpis.reason);
      }

      if (resultadoDetalle.status === "fulfilled") {
        setDetalle(resultadoDetalle.value);
      } else {
        console.error("Error cargando detalle de reportes:", resultadoDetalle.reason);
        setDetalle(DETALLE_VACIO);
      }

      if (resultadoKpis.status === "rejected" || resultadoDetalle.status === "rejected") {
        avisar.error(
          "No se pudo cargar parte de la información. Verifica que el servidor esté actualizado y en ejecución.",
          "Reportes incompletos",
        );
      }

      setCargando(false);
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [mes, anio]);

  /* =================================
       VENTAS POR DÍA (todos los días del mes)
    ================================= */

  const diasDelMes = new Date(Number(anio), Number(mes), 0).getDate();

  const ventasPorDia = Object.fromEntries(
    detalle.ventas_diarias.map((fila) => [Number(fila.dia), Number(fila.ventas)]),
  );

  const ventasDiarias = Array.from({ length: diasDelMes }, (_, indice) => ({
    dia: indice + 1,
    ventas: ventasPorDia[indice + 1] || 0,
  }));

  const ventaMaxima = Math.max(0, ...ventasDiarias.map((item) => item.ventas));
  const tope = calcularTope(ventaMaxima);
  const ejeY = [1, 0.75, 0.5, 0.25, 0].map((fraccion) => tope * fraccion);

  const mejorDia = ventasDiarias.reduce(
    (mejor, item) => (item.ventas > mejor.ventas ? item : mejor),
    { dia: null, ventas: 0 },
  );

  /* =================================
       CARTERA
    ================================= */

  const cartera = {
    al_dia: Number(detalle.cartera.al_dia) || 0,
    seguimiento: Number(detalle.cartera.seguimiento) || 0,
    vencida: Number(detalle.cartera.vencida) || 0,
  };

  const carteraMaxima = Math.max(cartera.al_dia, cartera.seguimiento, cartera.vencida);

  const porcentajeCartera = (valor) =>
    carteraMaxima > 0 ? `${(valor / carteraMaxima) * 100}%` : "0%";

  const comercialLider = detalle.comerciales[0];
  const productoLider = detalle.productos[0];

  return (
    <div className={`reportes-page ${cargando ? "reportes-cargando" : ""}`}>
      {/* =================================
                ENCABEZADO
            ================================= */}

      <div className="reportes-header">
        <div>
          <span className="reportes-tag">ANÁLISIS</span>

          <h1>Reportes</h1>

          <p>Análisis mensual del comportamiento de SIREM.</p>
        </div>
      </div>

      {/* =================================
                KPIs
            ================================= */}

      <div className="reportes-kpis">
        <div className="reporte-kpi">
          <div className="reporte-kpi-icon ventas">
            <TrendingUp size={20} />
          </div>

          <div>
            <span>Ventas del mes</span>

            <strong>{formatearPrecio(kpis.ventas_mes)}</strong>
          </div>
        </div>

        <div className="reporte-kpi">
          <div className="reporte-kpi-icon remisiones">
            <FileText size={20} />
          </div>

          <div>
            <span>Remisiones</span>

            <strong>{Number(kpis.total_remisiones) || 0}</strong>
          </div>
        </div>

        <div className="reporte-kpi">
          <div className="reporte-kpi-icon clientes">
            <UsersRound size={20} />
          </div>

          <div>
            <span>Clientes atendidos</span>

            <strong>{Number(kpis.clientes) || 0}</strong>
          </div>
        </div>

        <div className="reporte-kpi">
          <div className="reporte-kpi-icon cartera">
            <WalletCards size={20} />
          </div>

          <div>
            <span>Cartera generada</span>

            <strong>{formatearPrecio(kpis.cartera_generada)}</strong>
          </div>
        </div>
      </div>

      {/* =================================
                VENTAS DURANTE EL MES
            ================================= */}

      <div className="reporte-panel ventas-mensuales">
        <div className="reporte-panel-header">
          <div>
            <h2>Ventas durante el mes</h2>

            <p>Comportamiento de las ventas por día.</p>
          </div>

          <div className="panel-total">
            <span>Total</span>

            <strong>{formatearPrecio(kpis.ventas_mes)}</strong>
          </div>
        </div>

        <div className="ventas-chart">
          <div className="chart-y-axis">
            {ejeY.map((valor) => (
              <span key={valor}>{formatearCorto(valor)}</span>
            ))}
          </div>

          <div className="chart-area">
            <div className="chart-grid-line line-1"></div>
            <div className="chart-grid-line line-2"></div>
            <div className="chart-grid-line line-3"></div>
            <div className="chart-grid-line line-4"></div>
            <div className="chart-grid-line line-5"></div>

            <div className="chart-bars">
              {ventasDiarias.map((item) => (
                <div className="chart-column" key={item.dia}>
                  <div
                    className="chart-bar"
                    style={{ height: `${(item.ventas / tope) * 100}%` }}
                    title={`${item.dia} de ${nombreMes.toLowerCase()}: ${formatearPrecio(item.ventas)}`}
                  ></div>

                  <span>{String(item.dia).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =================================
                COMERCIALES + PRODUCTOS
            ================================= */}

      <div className="reportes-two-columns">
        <div className="reporte-panel">
          <div className="reporte-panel-header">
            <div>
              <h2>Ventas por comercial</h2>

              <p>Rendimiento durante el mes.</p>
            </div>

            <Award size={20} />
          </div>

          <div className="ranking-comerciales">
            {detalle.comerciales.length === 0 ? (
              <p className="reporte-vacio">Sin ventas registradas este mes.</p>
            ) : (
              detalle.comerciales.map((comercial, index) => (
                <div className="comercial-row" key={comercial.nombre}>
                  <div className="comercial-position">{index + 1}</div>

                  <div className="comercial-info">
                    <div className="comercial-name">
                      <strong>{comercial.nombre}</strong>

                      <span>{formatearPrecio(comercial.ventas)}</span>
                    </div>

                    <div className="comercial-progress">
                      <div
                        style={{
                          width: `${
                            (Number(comercial.ventas) /
                              Number(comercialLider.ventas || 1)) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="reporte-panel">
          <div className="reporte-panel-header">
            <div>
              <h2>Productos más vendidos</h2>

              <p>Unidades vendidas durante el mes.</p>
            </div>

            <Package size={20} />
          </div>

          <div className="productos-ranking">
            {detalle.productos.length === 0 ? (
              <p className="reporte-vacio">Sin productos vendidos este mes.</p>
            ) : (
              detalle.productos.map((producto, index) => (
                <div className="producto-ranking-row" key={producto.nombre}>
                  <span className="producto-ranking-number">{index + 1}</span>

                  <span className="producto-ranking-name">{producto.nombre}</span>

                  <strong>{Number(producto.cantidad)}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =================================
                CARTERA
            ================================= */}

      <div className="reporte-panel cartera-reporte">
        <div className="reporte-panel-header">
          <div>
            <h2>Estado de cartera</h2>

            <p>Saldo pendiente hoy, según la antigüedad de la remisión.</p>
          </div>

          <WalletCards size={20} />
        </div>

        <div className="cartera-report-bars">
          {[
            { etiqueta: "0–30 días", valor: cartera.al_dia, color: "verde" },
            { etiqueta: "31–45 días", valor: cartera.seguimiento, color: "amarillo" },
            { etiqueta: "46+ días", valor: cartera.vencida, color: "rojo" },
          ].map(({ etiqueta, valor, color }) => (
            <div className="cartera-report-item" key={etiqueta}>
              <div>
                <span>{etiqueta}</span>

                <strong>{formatearPrecio(valor)}</strong>
              </div>

              <div className="cartera-progress">
                <div className={color} style={{ width: porcentajeCartera(valor) }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =================================
                RESUMEN
            ================================= */}

      <div className="reporte-resumen">
        <div className="resumen-item">
          <span>🏆 Comercial destacado</span>

          <strong>{comercialLider?.nombre || "—"}</strong>
        </div>

        <div className="resumen-item">
          <span>📦 Producto más vendido</span>

          <strong>{productoLider?.nombre || "—"}</strong>
        </div>

        <div className="resumen-item">
          <span>📈 Mejor día</span>

          <strong>
            {mejorDia.dia
              ? `${mejorDia.dia} de ${nombreMes.toLowerCase()}`
              : "—"}
          </strong>
        </div>

        <div className="resumen-item">
          <span>👥 Clientes atendidos</span>

          <strong>{Number(kpis.clientes) || 0}</strong>
        </div>
      </div>
    </div>
  );
}

export default Reportes;
