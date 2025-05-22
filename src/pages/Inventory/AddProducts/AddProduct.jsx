import React, { useState } from "react";
import { db } from "../../../config/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import "./AddProduct.css";

const initialState = {
  Name: "",
  Purchase_Sell: "",
  Stock_Current: "",
  Weight: "",
  Unit_Measure: "ML"
};

const Inventory = () => {
  const [product, setProduct] = useState(initialState);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "Purchase_Sell" || name === "Stock_Current" || name === "Weight") {
      setProduct({ ...product, [name]: value.replace(/[^0-9$.,]/g, "") });
    } else {
      setProduct({ ...product, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    for (const key in product) {
      if (!product[key]) {
        setError("Todos los campos son obligatorios.");
        return;
      }
    }
    const dataToSend = {
      ...product,
      Purchase_Sell: Number(product.Purchase_Sell.replace(/[^0-9.]/g, "")),
      Stock_Current: Number(product.Stock_Current),
      Weight: Number(product.Weight)
    };
    try {
      await addDoc(collection(db, "Product"), dataToSend);
      alert("Producto agregado correctamente!");
      setProduct(initialState);
    } catch (e) {
      setError("Error al agregar producto: " + e.message);
    }
  };

  return (
    <div className="inventory-container">
      <h1 className="inventory-title">Productos</h1>
      <p className="inventory-description">
        Agrega un nuevo producto a Aruma Café.
      </p>
      <form className="inventory-form inventory-form-grid" onSubmit={handleSubmit}>
        <input
          type="text"
          name="Name"
          placeholder="Nombre"
          value={product.Name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="Purchase_Sell"
          placeholder="Precio de venta (ej: $2500)"
          value={product.Purchase_Sell}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="Stock_Current"
          placeholder="Stock actual"
          value={product.Stock_Current}
          onChange={handleChange}
          required
        />
        <div className="weight-unit-row">
          <input
            type="text"
            name="Weight"
            placeholder="Peso"
            value={product.Weight}
            onChange={handleChange}
            required
            style={{ flex: 2 }}
          />
          <select
            name="Unit_Measure"
            value={product.Unit_Measure}
            onChange={handleChange}
            className="inventory-select"
            required
            style={{ flex: 1, marginLeft: "8px" }}
          >
            <option value="ML">ML</option>
            <option value="L">L</option>
            <option value="G">G</option>
            <option value="KG">KG</option>
          </select>
        </div>
        {error && <div className="inventory-error">{error}</div>}
        <div className="form-button-row">
          <button className="inventory-add-btn" type="submit">
            Agregar producto
          </button>
        </div>
      </form>
    </div>
  );
};

export default Inventory;