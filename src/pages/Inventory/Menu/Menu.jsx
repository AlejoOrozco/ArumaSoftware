import React from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../components/common/PageLayout";
import "./Menu.css";

const Menu = () => {
  const navigate = useNavigate();

  return (
    <PageLayout pageTitle="Inventario">
      <div className="inventory-menu-container">
        <h1 className="inventory-title">Servicio de inventario</h1>
        <p className="inventory-description">
          Elije la acción que quieres realizar con el inventario
        </p>
        <div className="inventory-menu-buttons">
          <button
            className="inventory-menu-btn"
            onClick={() => navigate("/inventario/agregar")}
          >
            Agregar producto
          </button>
          <button
            className="inventory-menu-btn"
            onClick={() => navigate("/inventario/editar")}
          >
            Editar producto
          </button>
          <button
            className="inventory-menu-btn"
            onClick={() => navigate("/inventario/todos")}
          >
            Ver todos los productos
          </button>
        </div>
      </div>
    </PageLayout>
  );
};

export default Menu;
