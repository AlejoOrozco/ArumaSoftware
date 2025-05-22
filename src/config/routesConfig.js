import DashBoard from "../pages/Dashboard/Dashboard";
import Inventory from "../pages/Inventory/AddProducts/AddProduct";

const routesConfig = [
  {
    path: "/",
    componentName: DashBoard,
    headerTitle: "Dashboard",
    icon: "fa-solid fa-house",
    showInSidebar: true,
    headerDescription: "Bienvenido al dashboard",

  },
  {
    path: "/Inventory",
    componentName: Inventory,
    headerTitle: "Inventario",
    icon: "fa-solid fa-box",
    showInSidebar: true,
    headerDescription: "Bienvenido al inventario",

  },
];

export default routesConfig;