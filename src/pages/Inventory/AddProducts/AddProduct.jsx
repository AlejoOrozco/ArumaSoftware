import React, { useState } from "react";
import { db } from "../../../config/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import PageLayout from "../../../components/common/PageLayout";
import "./AddProduct.css";

const initialState = {
  Name: "",
  Purchase_Sell: "",
  Stock_Current: "",
  Weight: "",
  Unit_Measure: "ML",
  Brand: "",
  Category: "",
  Purchase_Price: "",
  Stock_Minimum: ""
};

const unitOptions = ["ML", "L", "G", "KG"];

const AddProduct = () => {
  const [product, setProduct] = useState(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["Purchase_Sell", "Stock_Current", "Weight", "Purchase_Price", "Stock_Minimum"].includes(name)) {
      // Only allow numbers and decimal point for numeric fields
      setProduct({ ...product, [name]: value.replace(/[^0-9.]/g, "") });
    } else {
      setProduct({ ...product, [name]: value });
    }
  };

  const validateForm = () => {
    // Required fields
    const requiredFields = ["Name", "Purchase_Sell", "Stock_Current", "Weight", "Unit_Measure"];
    for (const field of requiredFields) {
      if (!product[field]) {
        setError(`El campo ${field === "Name" ? "Nombre" : 
                          field === "Purchase_Sell" ? "Precio de venta" :
                          field === "Stock_Current" ? "Stock actual" :
                          field === "Weight" ? "Peso" :
                          "Unidad de medida"} es obligatorio.`);
        return false;
      }
    }

    // Validate numeric fields are positive
    const numericFields = ["Purchase_Sell", "Stock_Current", "Weight", "Purchase_Price", "Stock_Minimum"];
    for (const field of numericFields) {
      if (product[field] && Number(product[field]) < 0) {
        setError(`${field === "Purchase_Sell" ? "Precio de venta" :
                   field === "Stock_Current" ? "Stock actual" :
                   field === "Weight" ? "Peso" :
                   field === "Purchase_Price" ? "Precio de compra" :
                   "Stock mínimo"} no puede ser negativo.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    const dataToSend = {
      ...product,
      Purchase_Sell: Number(product.Purchase_Sell),
      Stock_Current: Number(product.Stock_Current),
      Weight: Number(product.Weight),
      Purchase_Price: product.Purchase_Price ? Number(product.Purchase_Price) : null,
      Stock_Minimum: product.Stock_Minimum ? Number(product.Stock_Minimum) : null
    };

    try {
      await addDoc(collection(db, "Product"), dataToSend);
      setSuccess("¡Producto agregado correctamente!");
      setProduct(initialState);
    } catch (e) {
      setError("Error al agregar producto: " + e.message);
    }
  };

  return (
    <PageLayout pageTitle="Agregar producto">
      <div className="inventory-container">
        <h1 className="inventory-title">Agregar Nuevo Producto</h1>
        <p className="inventory-description">
          Ingresa los detalles del nuevo producto para Aruma Café.
        </p>

        <form className="inventory-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="Name">Nombre *</label>
            <input
              type="text"
              id="Name"
              name="Name"
              placeholder="Nombre del producto"
              value={product.Name}
              onChange={handleChange}
              required
              className="inventory-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="Purchase_Sell">Precio de venta *</label>
            <input
              type="text"
              id="Purchase_Sell"
              name="Purchase_Sell"
              placeholder="Precio de venta (ej: 2500)"
              value={product.Purchase_Sell}
              onChange={handleChange}
              required
              className="inventory-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="Purchase_Price">Precio de compra</label>
            <input
              type="text"
              id="Purchase_Price"
              name="Purchase_Price"
              placeholder="Precio de compra (opcional)"
              value={product.Purchase_Price}
              onChange={handleChange}
              className="inventory-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="Stock_Current">Stock actual *</label>
            <input
              type="text"
              id="Stock_Current"
              name="Stock_Current"
              placeholder="Stock actual"
              value={product.Stock_Current}
              onChange={handleChange}
              required
              className="inventory-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="Stock_Minimum">Stock mínimo</label>
            <input
              type="text"
              id="Stock_Minimum"
              name="Stock_Minimum"
              placeholder="Stock mínimo (opcional)"
              value={product.Stock_Minimum}
              onChange={handleChange}
              className="inventory-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="Weight">Peso *</label>
              <input
                type="text"
                id="Weight"
                name="Weight"
                placeholder="Peso"
                value={product.Weight}
                onChange={handleChange}
                required
                className="inventory-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="Unit_Measure">Unidad de medida *</label>
              <select
                id="Unit_Measure"
                name="Unit_Measure"
                value={product.Unit_Measure}
                onChange={handleChange}
                required
                className="inventory-select"
              >
                {unitOptions.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="Brand">Marca</label>
            <input
              type="text"
              id="Brand"
              name="Brand"
              placeholder="Marca del producto (opcional)"
              value={product.Brand}
              onChange={handleChange}
              className="inventory-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="Category">Categoría</label>
            <input
              type="text"
              id="Category"
              name="Category"
              placeholder="Categoría del producto (opcional)"
              value={product.Category}
              onChange={handleChange}
              className="inventory-input"
            />
          </div>

          {error && <div className="inventory-error">{error}</div>}
          {success && <div className="inventory-success">{success}</div>}

          <div className="form-actions">
            <button type="submit" className="inventory-submit-btn">
              Agregar producto
            </button>
            <button
              type="button"
              className="inventory-cancel-btn"
              onClick={() => setProduct(initialState)}
            >
              Limpiar formulario
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default AddProduct;