import { NavLink } from "react-router-dom";
import { FaHome, FaCog, FaChartBar, FaFileInvoiceDollar } from "react-icons/fa";
import "./Sidebar.css";

const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-logo">
      Aruma Café <span className="sidebar-logo-cursive">Software</span>
    </div>
    <nav className="sidebar-links">
      <NavLink to="/" end className="sidebar-link">
        <FaHome /> Inicio
      </NavLink>
      <NavLink to="/Venta" className="sidebar-link">
        <FaFileInvoiceDollar /> Venta
      </NavLink>
      <NavLink to="/inventario" className="sidebar-link">
        <FaChartBar /> Inventario
      </NavLink>
      <NavLink to="/reportes" className="sidebar-link">
        <FaCog /> Reportes
      </NavLink>
      
    </nav>
  </aside>
);

export default Sidebar;
