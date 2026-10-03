import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Reportes.css";

import {
  TrendingUp,
  FileText,
  UsersRound,
  WalletCards,
  Award,
  Package,
  CalendarDays,
} from "lucide-react";

function Reportes() {
  const [mesSeleccionado, setMesSeleccionado] = useState(
    new Date().getMonth() + 1,
  );

  const [anioSeleccionado, setAnioSeleccionado] = useState(
    new Date().getFullYear(),
  );

  const [ventasMes, setVentasMes] = useState(0);

  const [totalRemisiones, setTotalRemisiones] = useState(0);

  const [totalClientes, setTotalClientes] = useState(0);

  const [carteraGenerada, setCarteraGenerada] = useState(0);

  const cargarKPIs = async () => {
    try {
      const respuesta = await axios.get("/api/reportes/kpis", {
        params: {
          mes: mesSeleccionado,
          anio: anioSeleccionado,
        },
      });

      const datos = respuesta.data;
      console.log("KPIs recibidos:", mesSeleccionado, anioSeleccionado, datos);

      setVentasMes(Number(datos.ventas_mes) || 0);

      setTotalRemisiones(Number(datos.total_remisiones) || 0);

      setTotalClientes(Number(datos.clientes) || 0);

      setCarteraGenerada(Number(datos.cartera_generada) || 0);
    } catch (error) {
      console.error("Error cargando KPIs:", error);
    }
  };

  useEffect(() => {
    cargarKPIs();
  }, [mesSeleccionado, anioSeleccionado]);

  const ventasDiarias = [
    { dia: "01", ventas: 420000 },
    { dia: "03", ventas: 650000 },
    { dia: "05", ventas: 780000 },
    { dia: "07", ventas: 520000 },
    { dia: "09", ventas: 930000 },
    { dia: "11", ventas: 710000 },
    { dia: "13", ventas: 1150000 },
    { dia: "15", ventas: 890000 },
    { dia: "17", ventas: 1280000 },
    { dia: "19", ventas: 970000 },
    { dia: "21", ventas: 1430000 },
    { dia: "23", ventas: 1180000 },
    { dia: "25", ventas: 1560000 },
    { dia: "27", ventas: 1320000 },
    { dia: "29", ventas: 1710000 },
    { dia: "31", ventas: 1480000 },
  ];

  const comerciales = [
    {
      nombre: "Leidy Johanna",
      ventas: 5200000,
    },
    {
      nombre: "Marisela Perea",
      ventas: 4100000,
    },
    {
      nombre: "Francid Duvallier",
      ventas: 3250000,
    },
    {
      nombre: "Luis Fernando",
      ventas: 2180000,
    },
  ];

  const productos = [
    {
      nombre: "Silla de montar",
      cantidad: 28,
    },
    {
      nombre: "Cabezal",
      cantidad: 22,
    },
    {
      nombre: "Riendas",
      cantidad: 18,
    },
    {
      nombre: "Freno",
      cantidad: 14,
    },
    {
      nombre: "Accesorios",
      cantidad: 11,
    },
  ];

  const formatearPrecio = (valor) => {
    return Number(valor).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  };

  const meses = [
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

  const nombreMes = meses[mesSeleccionado - 1];

  return (
    <div className="reportes-page">
      {/* =================================
                ENCABEZADO
            ================================= */}

      <div className="reportes-header">
        <div>
          <span className="reportes-tag">ANÁLISIS</span>

          <h1>Reportes</h1>

          <p>Análisis mensual del comportamiento de SIREM.</p>
        </div>

        <div className="reportes-periodo">
          <CalendarDays size={17} />

          <span>
            {nombreMes} {anioSeleccionado}
          </span>
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

            <strong>{formatearPrecio(ventasMes)}</strong>
          </div>
        </div>

        <div className="reporte-kpi">
          <div className="reporte-kpi-icon remisiones">
            <FileText size={20} />
          </div>

          <div>
            <span>Remisiones</span>

            <strong>{totalRemisiones}</strong>
          </div>
        </div>

        <div className="reporte-kpi">
          <div className="reporte-kpi-icon clientes">
            <UsersRound size={20} />
          </div>

          <div>
            <span>Clientes</span>

            <strong>{totalClientes}</strong>
          </div>
        </div>

        <div className="reporte-kpi">
          <div className="reporte-kpi-icon cartera">
            <WalletCards size={20} />
          </div>

          <div>
            <span>Cartera generada</span>

            <strong>{formatearPrecio(carteraGenerada)}</strong>
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

            <strong>$16.840.000</strong>
          </div>
        </div>

        <div className="ventas-chart">
          <div className="chart-y-axis">
            <span>$2M</span>
            <span>$1.5M</span>
            <span>$1M</span>
            <span>$500K</span>
            <span>$0</span>
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
                    style={{
                      height: `${(item.ventas / 2000000) * 100}%`,
                    }}
                    title={formatearPrecio(item.ventas)}
                  ></div>

                  <span>{item.dia}</span>
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
        {/* COMERCIALES */}

        <div className="reporte-panel">
          <div className="reporte-panel-header">
            <div>
              <h2>Ventas por comercial</h2>

              <p>Rendimiento durante el mes.</p>
            </div>

            <Award size={20} />
          </div>

          <div className="ranking-comerciales">
            {comerciales.map((comercial, index) => (
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
                        width: `${(comercial.ventas / comerciales[0].ventas) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PRODUCTOS */}

        <div className="reporte-panel">
          <div className="reporte-panel-header">
            <div>
              <h2>Productos más vendidos</h2>

              <p>Productos con mayor movimiento.</p>
            </div>

            <Package size={20} />
          </div>

          <div className="productos-ranking">
            {productos.map((producto, index) => (
              <div className="producto-ranking-row" key={producto.nombre}>
                <span className="producto-ranking-number">{index + 1}</span>

                <span className="producto-ranking-name">{producto.nombre}</span>

                <strong>{producto.cantidad}</strong>
              </div>
            ))}
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

            <p>Distribución de la cartera según su antigüedad.</p>
          </div>

          <WalletCards size={20} />
        </div>

        <div className="cartera-report-bars">
          <div className="cartera-report-item">
            <div>
              <span>0–30 días</span>

              <strong>$8.250.000</strong>
            </div>

            <div className="cartera-progress">
              <div className="verde" style={{ width: "72%" }}></div>
            </div>
          </div>

          <div className="cartera-report-item">
            <div>
              <span>31–45 días</span>

              <strong>$2.850.000</strong>
            </div>

            <div className="cartera-progress">
              <div className="amarillo" style={{ width: "43%" }}></div>
            </div>
          </div>

          <div className="cartera-report-item">
            <div>
              <span>46+ días</span>

              <strong>$1.320.000</strong>
            </div>

            <div className="cartera-progress">
              <div className="rojo" style={{ width: "24%" }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================
                RESUMEN
            ================================= */}

      <div className="reporte-resumen">
        <div className="resumen-item">
          <span>🏆 Comercial destacado</span>

          <strong>Leidy Johanna</strong>
        </div>

        <div className="resumen-item">
          <span>📦 Producto más vendido</span>

          <strong>Silla de montar</strong>
        </div>

        <div className="resumen-item">
          <span>📈 Mejor día</span>

          <strong>29 de agosto</strong>
        </div>

        <div className="resumen-item">
          <span>👥 Clientes atendidos</span>

          <strong>84</strong>
        </div>
      </div>
    </div>
  );
}

export default Reportes;
