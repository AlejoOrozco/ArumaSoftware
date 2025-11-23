import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../config/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import PageLayout from "../../../components/common/PageLayout";
import "./EditProduct.css";

const unitOptions = ["ML", "L", "G", "KG"];

const EditProduct = () => {
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [formData, setFormData] = useState({
    Name: "",
    Purchase_Sell: "",
    Stock_Current: "",
    Weight: "",
    Unit_Measure: "ML",
    Brand: "",
    Category: "",
    Purchase_Price: "",
    Stock_Minimum: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  // Check for product data in localStorage on mount
  useEffect(() => {
    const productData = localStorage.getItem('editProductData');
    if (!productData) {
      // No product data, redirect to AllProducts
      navigate('/inventario/todos');
      return;
    }

    try {
      const parsedProduct = JSON.parse(productData);
      setProduct(parsedProduct);
      
      // Pre-fill form with product data
      setFormData({
        Name: parsedProduct.Name || "",
        Purchase_Sell: parsedProduct.Purchase_Sell?.toString() || "",
        Stock_Current: parsedProduct.Stock_Current?.toString() || "",
        Weight: parsedProduct.Weight?.toString() || "",
        Unit_Measure: parsedProduct.Unit_Measure || "ML",
        Brand: parsedProduct.Brand || "",
        Category: parsedProduct.Category || "",
        Purchase_Price: parsedProduct.Purchase_Price?.toString() || "",
        Stock_Minimum: parsedProduct.Stock_Minimum?.toString() || ""
      });
      setLoading(false);
    } catch (e) {
      console.error("Error parsing product data:", e);
      setLoading(false);
      navigate('/inventario/todos');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["Purchase_Sell", "Stock_Current", "Weight", "Purchase_Price", "Stock_Minimum"].includes(name)) {
      // Only allow numbers and decimal point for numeric fields
      setFormData({ ...formData, [name]: value.replace(/[^0-9.]/g, "") });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateForm = () => {
    // Required fields
    const requiredFields = ["Name", "Purchase_Sell", "Stock_Current", "Weight", "Unit_Measure"];
    for (const field of requiredFields) {
      if (!formData[field]) {
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
      if (formData[field] && Number(formData[field]) < 0) {
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

    if (!product || !product.id) {
      setError("Error: No se pudo identificar el producto a editar.");
      return;
    }

    const dataToUpdate = {
      Name: formData.Name,
      Purchase_Sell: Number(formData.Purchase_Sell),
      Stock_Current: Number(formData.Stock_Current),
      Weight: Number(formData.Weight),
      Unit_Measure: formData.Unit_Measure,
      Brand: formData.Brand || null,
      Category: formData.Category || null,
      Purchase_Price: formData.Purchase_Price ? Number(formData.Purchase_Price) : null,
      Stock_Minimum: formData.Stock_Minimum ? Number(formData.Stock_Minimum) : null
    };

    try {
      await updateDoc(doc(db, "Product", product.id), dataToUpdate);
      setSuccess("¡Producto actualizado correctamente!");
      
      // Clear localStorage and redirect after 2 seconds
      setTimeout(() => {
        localStorage.removeItem('editProductData');
        navigate('/inventario/todos');
      }, 2000);
    } catch (e) {
      setError("Error al actualizar producto: " + e.message);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('editProductData');
    navigate('/inventario/todos');
  };

  if (loading) {
    return (
      <PageLayout pageTitle="Editar producto">
        <div className="inventory-container">
          <div className="loading-message">Cargando producto...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Editar producto">
      <div className="inventory-container">
        <h1 className="inventory-title">Editar Producto</h1>
        <p className="inventory-description">
          Modifica los detalles del producto para Aruma Café.
        </p>

        <form className="inventory-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="Name">Nombre *</label>
            <input
              type="text"
              id="Name"
              name="Name"
              placeholder="Nombre del producto"
              value={formData.Name}
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
              value={formData.Purchase_Sell}
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
              value={formData.Purchase_Price}
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
              value={formData.Stock_Current}
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
              value={formData.Stock_Minimum}
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
                value={formData.Weight}
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
                value={formData.Unit_Measure}
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
              value={formData.Brand}
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
              value={formData.Category}
              onChange={handleChange}
              className="inventory-input"
            />
          </div>

          {error && <div className="inventory-error">{error}</div>}
          {success && <div className="inventory-success">{success}</div>}

          <div className="form-actions">
            <button type="submit" className="inventory-submit-btn">
              Guardar cambios
            </button>
            <button
              type="button"
              className="inventory-cancel-btn"
              onClick={handleCancel}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default EditProduct;

