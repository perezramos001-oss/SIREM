import {
  ChartColumn,
  Download,
  FileText,
  History,
  House,
  Package,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

/*
Secciones de SIREM. El menú lateral, la barra superior y el
título de la pestaña se arman a partir de esta lista.
*/

export const SECCIONES = [
  {
    titulo: "General",
    paginas: [
      {
        id: "inicio",
        nombre: "Inicio",
        descripcion: "Resumen del mes",
        icono: House,
      },
      {
        id: "remisiones",
        nombre: "Remisiones",
        descripcion: "Ventas registradas del mes",
        icono: FileText,
      },
      {
        id: "cartera",
        nombre: "Cartera",
        descripcion: "Saldos pendientes y abonos",
        icono: Wallet,
      },
      {
        id: "clientes",
        nombre: "Clientes",
        descripcion: "Directorio de clientes",
        icono: Users,
      },
      {
        id: "productos",
        nombre: "Productos",
        descripcion: "Catálogo y precios de lista",
        icono: Package,
      },
    ],
  },
  {
    titulo: "Análisis",
    paginas: [
      {
        id: "reportes",
        nombre: "Reportes",
        descripcion: "",
        icono: ChartColumn,
      },
      {
        id: "exportaciones",
        nombre: "Exportaciones",
        descripcion: "Excel y PDF",
        icono: Download,
      },
      {
        id: "auditoria",
        nombre: "Auditoría",
        descripcion: "Actividad de los usuarios",
        icono: History,
        soloAdministrador: true,
      },
    ],
  },
  {
    titulo: "Sistema",
    paginas: [
      {
        id: "configuracion",
        nombre: "Configuración",
        descripcion: "Cuenta, usuarios y seguridad",
        icono: Settings,
      },
    ],
  },
];

export const PAGINAS = SECCIONES.flatMap((seccion) => seccion.paginas);

export const PAGINA_INICIAL = "inicio";

export const puedeVer = (pagina, usuario) =>
  !pagina.soloAdministrador || usuario?.rol === "ADMINISTRADOR";

export const buscarPagina = (id) => PAGINAS.find((pagina) => pagina.id === id);

export const buscarSeccion = (id) =>
  SECCIONES.find((seccion) => seccion.paginas.some((pagina) => pagina.id === id));
