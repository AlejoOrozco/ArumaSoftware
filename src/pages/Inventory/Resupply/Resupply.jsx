import React, { useState, useEffect } from "react";
import { db } from "../../../config/firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import PageLayout from "../../../components/common/PageLayout";
import "./Resupply.css";

const Resupply = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingProducts, setUpdatingProducts] = useState(new Set());

  // Fetch all products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Product"));
        const prods = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(prods);
        setFilteredProducts(prods);
        setLoading(false);
      } catch (error) {
        setMessage("Error al cargar productos: " + error.message);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Filter products based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        (product.Name && product.Name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.Category && product.Category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.Brand && product.Brand.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const handleStockUpdate = async (productId, currentStock, additionalStock) => {
    if (!additionalStock || additionalStock <= 0) {
      setMessage("Por favor ingresa una cantidad válida");
      return;
    }

    setUpdatingProducts(prev => new Set(prev).add(productId));
    setMessage("");

    try {
      const newStock = currentStock + parseInt(additionalStock);
      await updateDoc(doc(db, "Product", productId), {
        Stock_Current: newStock
      });

      // Update local state
      setProducts(prevProducts =>
        prevProducts.map(product =>
          product.id === productId
            ? { ...product, Stock_Current: newStock }
            : product
        )
      );

      setMessage(`Stock actualizado para ${products.find(p => p.id === productId)?.Name}`);
    } catch (error) {
      setMessage("Error al actualizar stock: " + error.message);
    } finally {
      setUpdatingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const ProductCard = ({ product }) => {
    const [additionalStock, setAdditionalStock] = useState("");
    const isUpdating = updatingProducts.has(product.id);

    return (
      <div className="resupply-product-card">
        <div className="product-info">
          <h3 className="product-name">{product.Name}</h3>
          <p className="product-category">{product.Category}</p>
          <p className="product-brand">{product.Brand || "Sin marca"}</p>
          <div className="stock-info">
            <span className="current-stock">Stock actual: {product.Stock_Current}</span>
          </div>
        </div>
        <div className="stock-update-section">
          <div className="stock-input-group">
            <label htmlFor={`stock-${product.id}`}>Cantidad a agregar:</label>
            <input
              id={`stock-${product.id}`}
              type="number"
              min="1"
              value={additionalStock}
              onChange={(e) => setAdditionalStock(e.target.value)}
              placeholder="0"
              disabled={isUpdating}
            />
          </div>
          <button
            className="update-stock-btn"
            onClick={() => handleStockUpdate(product.id, product.Stock_Current, additionalStock)}
            disabled={isUpdating || !additionalStock || additionalStock <= 0}
          >
            {isUpdating ? "Actualizando..." : "Actualizar Stock"}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <PageLayout pageTitle="Reabastecer inventario">
        <div className="resupply-container">
          <div className="loading">Cargando productos...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Reabastecer inventario">
      <div className="resupply-container">
        <div className="resupply-header">
          <h1 className="resupply-title">Reabastecer Inventario</h1>
          <p className="resupply-description">
            Busca productos y actualiza su stock agregando nuevas cantidades
          </p>
        </div>

        <div className="search-section">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar productos por nombre, categoría o marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="search-results-count">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="no-products">
              <p>No se encontraron productos que coincidan con tu búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Resupply;
