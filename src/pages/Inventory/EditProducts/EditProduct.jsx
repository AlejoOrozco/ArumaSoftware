import React, { useState } from "react";
import { db } from "../../../config/firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import Fuse from "fuse.js";
import "./EditProduct.css";

const propertyLabels = {
  Name: "Nombre",
  Purchase_Sell: "Precio de venta",
  Stock_Current: "Stock actual",
  Weight: "Peso",
  Unit_Measure: "Unidad de medida",
  Brand: "Marca",
  Category: "Categoría",
  Purchase_Price: "Precio de compra",
  Stock_Minimum: "Stock mínimo"
};

const unitOptions = ["ML", "L", "G", "KG"];

const EditProduct = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Fetch all products from Firestore
    const snapshot = await getDocs(collection(db, "Product"));
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Set up Fuse.js for fuzzy search
    const fuse = new Fuse(products, {
      keys: ["Name"],
      threshold: 0.4
    });

    // Get results
    const fuseResults = fuse.search(query);
    setResults(fuseResults.map(r => r.item));
    setLoading(false);
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditData({ ...product });
    setMessage("");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
  };

  const handleSave = async () => {
    // Prepare data: convert numbers and remove $ for prices
    const updatedData = {
      ...editData,
      Purchase_Sell: Number(editData.Purchase_Sell.toString().replace(/[^0-9.]/g, "")),
      Stock_Current: Number(editData.Stock_Current),
      Weight: Number(editData.Weight),
      Purchase_Price: editData.Purchase_Price ? Number(editData.Purchase_Price.toString().replace(/[^0-9.]/g, "")) : undefined,
      Stock_Minimum: editData.Stock_Minimum ? Number(editData.Stock_Minimum) : undefined
    };
    try {
      const docRef = doc(db, "Product", editingId);
      await updateDoc(docRef, updatedData);
      setMessage("¡Producto actualizado!");
      setEditingId(null);
      // Optionally, refresh results
      setResults(results.map(p => (p.id === editingId ? { ...p, ...updatedData } : p)));
    } catch (e) {
      setMessage("Error al actualizar: " + e.message);
    }
  };

  return (
    <div className="inventory-container">
      <h1 className="inventory-title">Editar Producto</h1>
      <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Buscar producto por nombre..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="edit-product-search-bar"
        />
        <button
          type="submit"
          className="inventory-add-btn"
          style={{ marginLeft: 16, padding: "10px 24px" }}
        >
          Buscar
        </button>
      </form>
      {loading && <div>Buscando...</div>}
      {message && <div className="edit-product-message">{message}</div>}
      {results.length > 0 && (
        <div>
          <h2>Resultados:</h2>
          <ul className="edit-product-results-list">
            {results.map(product => (
              <li key={product.id} className="edit-product-result-item">
                {editingId === product.id ? (
                  <form className="edit-product-edit-form" onSubmit={e => { e.preventDefault(); handleSave(); }}>
                    {Object.keys(propertyLabels).map(key => (
                      key === "Unit_Measure" ? (
                        <div key={key}>
                          <label className="edit-product-label">{propertyLabels[key]}:</label>
                          <select
                            name={key}
                            value={editData[key] || ""}
                            onChange={handleEditChange}
                            className="inventory-select"
                          >
                            {unitOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div key={key}>
                          <label className="edit-product-label">{propertyLabels[key]}:</label>
                          <input
                            type={["Purchase_Sell", "Purchase_Price", "Stock_Current", "Stock_Minimum", "Weight"].includes(key) ? "number" : "text"}
                            name={key}
                            value={editData[key] || ""}
                            onChange={handleEditChange}
                            className="inventory-form-input"
                          />
                        </div>
                      )
                    ))}
                    <div className="edit-product-edit-actions">
                      <button
                        className="edit-product-save-btn"
                        type="submit"
                      >
                        Guardar
                      </button>
                      <button
                        className="edit-product-cancel-btn"
                        onClick={() => setEditingId(null)}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <strong>{product.Name}</strong> <br />
                    Precio: ${product.Purchase_Sell} | Stock: {product.Stock_Current} | Peso: {product.Weight} {product.Unit_Measure}
                    <br />
                    <button
                      className="inventory-add-btn"
                      style={{ marginTop: 8, padding: "6px 18px", maxWidth: 180 }}
                      onClick={() => startEdit(product)}
                      type="button"
                    >
                      Editar
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!loading && results.length === 0 && query && (
        <div>No se encontraron productos similares.</div>
      )}
    </div>
  );
};

export default EditProduct;