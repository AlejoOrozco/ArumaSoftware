import React from "react";
import { useNavigate } from "react-router-dom";
import "./Menu.css";

const Menu = () => {
  const navigate = useNavigate();

  return (
    <div className="inventory-menu-container">
      <h1 className="inventory-title">Servicio de inventario</h1>
      <p className="inventory-description">
        Elije si quieres agregar o editar un producto del inventario
      </p>
      <div className="inventory-menu-buttons">
        <button
          className="inventory-menu-btn"
          onClick={() => navigate("/productos/agregar")}
        >
          Agregar producto
        </button>
        <button
          className="inventory-menu-btn"
          onClick={() => navigate("/productos/editar")}
        >
          Editar producto
        </button>
      </div>
    </div>
  );
};

export default Menu;
