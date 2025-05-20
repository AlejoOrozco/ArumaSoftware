import DashBoard from "../pages/Dashboard/Dashboard";
import Inventory from "../pages/Inventory/Inventory";

const routesConfig = [
  {
    path: "/",
    componentName: DashBoard,
    headerTitle: "Dashboard",
    icon: "fa-solid fa-house",
    showInSidebar: true,
    headerDescription: "Welcome to the dashboard",

  },
  {
    path: "/inventory",
    componentName: Inventory,
    headerTitle: "Inventory",
    icon: "fa-solid fa-box",
    showInSidebar: true,
    headerDescription: "Welcome to the inventory",

  },
];

export default routesConfig;