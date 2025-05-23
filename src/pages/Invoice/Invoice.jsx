import React, { useEffect, useState } from "react";
import { db } from "../../config/firebaseConfig";
import { collection, getDocs, addDoc } from "firebase/firestore";
import "./Invoice.css";

const Invoice = () => {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [invoiceProducts, setInvoiceProducts] = useState([]);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);

  // Fetch all products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      const snapshot = await getDocs(collection(db, "Product"));
      const prods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(prods);
    };
    fetchProducts();
  }, []);

  // Filter products as user types
  useEffect(() => {
    if (query.length === 0) {
      setFiltered([]);
      setSelectedProduct(null);
      return;
    }
    setFiltered(
      products.filter(p =>
        p.Name.toLowerCase().includes(query.toLowerCase())
      )
    );
  }, [query, products]);

  // Add product to invoice
  const handleAddProduct = () => {
    if (!selectedProduct || quantity < 1) return;
    setInvoiceProducts([
      ...invoiceProducts,
      {
        ...selectedProduct,
        quantity: Number(quantity)
      }
    ]);
    setQuery("");
    setSelectedProduct(null);
    setQuantity(1);
  };

  // Remove product from invoice
  const handleRemoveProduct = (idx) => {
    setInvoiceProducts(invoiceProducts.filter((_, i) => i !== idx));
  };

  // Calculate total
  const total = invoiceProducts.reduce(
    (sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity,
    0
  );

  // Save invoice to Firestore
  const handleSaveInvoice = async () => {
    if (invoiceProducts.length === 0) {
      setMessage("Agrega al menos un producto.");
      return;
    }
    const invoiceData = {
      Date: new Date().toLocaleString(),
      Products: invoiceProducts.map(p => ({
        id: p.id,
        Quantity: p.quantity
      })),
      Total: total,
      Comment: comment,
      Is_Selling: true
    };
    try {
      await addDoc(collection(db, "Invoice"), invoiceData);
      setSavedInvoice({
        ...invoiceData,
        Products: invoiceProducts.map(p => ({
          ...p,
          Quantity: p.quantity
        }))
      });
      setShowSummary(true);
      setMessage("");
    } catch (e) {
      setMessage("Error al guardar: " + e.message);
    }
  };

  // Edit after saving
  const handleEditInvoice = () => {
    setShowSummary(false);
    setSavedInvoice(null);
    setMessage("");
  };

  return (
    <div className="invoice-container invoice-flex">
      {!showSummary ? (
        <>
          <div className="invoice-left">
            <h1 className="invoice-title">Nueva Factura</h1>
            <div style={{ marginBottom: 24 }}>
              <input
                type="text"
                placeholder="Buscar producto..."
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelectedProduct(null);
                }}
                className="invoice-search-bar"
              />
              {filtered.length > 0 && (
                <ul className="invoice-autocomplete-list">
                  {filtered.slice(0, 5).map(p => (
                    <li
                      key={p.id}
                      className="invoice-autocomplete-item"
                      onClick={() => {
                        // If already in invoice, do nothing or increase quantity
                        const existing = invoiceProducts.find(prod => prod.id === p.id);
                        if (existing) {
                          setInvoiceProducts(invoiceProducts.map(prod =>
                            prod.id === p.id
                              ? { ...prod, quantity: prod.quantity + 1 }
                              : prod
                          ));
                        } else {
                          setInvoiceProducts([
                            ...invoiceProducts,
                            { ...p, quantity: 1 }
                          ]);
                        }
                        setQuery("");
                        setSelectedProduct(null);
                        setFiltered([]);
                      }}
                    >
                      {p.Name}
                    </li>
                  ))}
                </ul>
              )}
              {selectedProduct && (
                <div style={{ marginTop: 12 }}>
                  <span>{selectedProduct.Name} - ${selectedProduct.Purchase_Sell}</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    style={{ marginLeft: 12, width: 60, borderRadius: 6, border: "1px solid #e0c9b3", padding: 4 }}
                  />
                  <button
                    className="inventory-add-btn"
                    style={{ marginLeft: 12, padding: "6px 18px" }}
                    onClick={handleAddProduct}
                    type="button"
                  >
                    Agregar
                  </button>
                </div>
              )}
            </div>
            <textarea
              placeholder="Comentario (opcional)"
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="invoice-comment"
            />
            <br />
            <button
              className="inventory-add-btn"
              onClick={handleSaveInvoice}
              type="button"
            >
              Guardar factura
            </button>
            {message && <div className="invoice-message">{message}</div>}
          </div>
          <div className="invoice-right">
            <h2 className="invoice-summary-title">Factura</h2>
            <ul className="invoice-product-list">
              {invoiceProducts.map((p, idx) => (
                <li key={idx} className="invoice-product-item">
                  <span>
                    {p.Name} x
                    <input
                      type="number"
                      min={1}
                      value={p.quantity}
                      onChange={e => {
                        const newQty = Number(e.target.value);
                        setInvoiceProducts(invoiceProducts.map((prod, i) =>
                          i === idx ? { ...prod, quantity: newQty } : prod
                        ));
                      }}
                      style={{
                        width: 50,
                        margin: "0 8px",
                        borderRadius: 6,
                        border: "1px solid #e0c9b3",
                        padding: 4
                      }}
                    />
                    = ${p.Purchase_Sell * p.quantity}
                  </span>
                  <button
                    className="invoice-remove-btn"
                    onClick={() => handleRemoveProduct(idx)}
                    type="button"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 16 }}>
              <strong>Total: ${total}</strong>
            </div>
          </div>
        </>
      ) : (
        <div className="invoice-summary-confirmation">
          <h2>¡Factura guardada!</h2>
          <div className="invoice-summary">
            <h3 className="invoice-summary-title">Resumen de la factura</h3>
            <ul className="invoice-product-list">
              {savedInvoice.Products.map((p, idx) => (
                <li key={idx} className="invoice-product-item">
                  {p.Name} x {p.Quantity} = ${p.Purchase_Sell * p.Quantity}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 16 }}>
              <strong>Total: ${savedInvoice.Total}</strong>
            </div>
            {savedInvoice.Comment && (
              <div style={{ marginTop: 8, color: "#a9744f" }}>
                Comentario: {savedInvoice.Comment}
              </div>
            )}
          </div>
          <button
            className="inventory-add-btn"
            onClick={handleEditInvoice}
            type="button"
          >
            Editar factura
          </button>
        </div>
      )}
    </div>
  );
};

export default Invoice;