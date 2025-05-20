import { NavLink } from "react-router-dom";
import { FaHome, FaCog, FaChartBar } from "react-icons/fa";
import "./Sidebar.css";

const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-logo">ARUMA CAFÉ</div>
    <nav>
      <NavLink to="/" end className="sidebar-link">
        <FaHome /> Inicio
      </NavLink>
      <NavLink to="/productos" className="sidebar-link">
        <FaChartBar /> Productos
      </NavLink>
      <NavLink to="/reportes" className="sidebar-link">
        <FaCog /> Reportes
      </NavLink>
    </nav>
  </aside>
);

export default Sidebar;
