import React from 'react';
import { NavLink } from "react-router-dom";
import { FaHome, FaCog, FaChartBar, FaFileInvoiceDollar, FaTimes, FaCalendarDay } from "react-icons/fa";
import "./Sidebar.css";

const Sidebar = ({ isOpen, onClose }) => (
  <>
    <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose}></div>
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          Aruma Café <span className="sidebar-logo-cursive">Software</span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      </div>
      <nav className="sidebar-links">
        <NavLink to="/" end className="sidebar-link" onClick={onClose}>
          <FaHome /> Inicio
        </NavLink>
        <NavLink to="/factura" className="sidebar-link" onClick={onClose}>
          <FaFileInvoiceDollar /> Venta
        </NavLink>
        <NavLink to="/inventario" className="sidebar-link" onClick={onClose}>
          <FaChartBar /> Inventario
        </NavLink>
        <NavLink to="/cerrar-dia" className="sidebar-link" onClick={onClose}>
          <FaCalendarDay /> Cerrar Día
        </NavLink>
      </nav>
    </aside>
  </>
);

export default Sidebar;
