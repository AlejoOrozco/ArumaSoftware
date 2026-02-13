export type RouteConfig = {
  path: string;
  title: string;
};

const routesConfig: RouteConfig[] = [
  {
    path: "/",
    title: "Inicio",
  },
  {
    path: "/inventario",
    title: "Inventario",
  },
  {
    path: "/inventario/agregar",
    title: "Agregar producto",
  },
  {
    path: "/inventario/editar",
    title: "Editar producto",
  },
  {
    path: "/inventario/reabastecer",
    title: "Reabastecer inventario",
  },
  {
    path: "/inventario/todos",
    title: "Todos los productos",
  },
  {
    path: "/inventario/descuentos",
    title: "Gestión de descuentos",
  },
  {
    path: "/factura",
    title: "Factura",
  },
  {
    path: "/cerrar-dia",
    title: "Cerrar día",
  },
];

export default routesConfig;

