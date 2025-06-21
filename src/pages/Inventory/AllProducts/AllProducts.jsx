import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../config/firebaseConfig";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import PageLayout from "../../../components/common/PageLayout";
import "./AllProducts.css";

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const navigate = useNavigate();

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

  // Get unique categories from products
  const getUniqueCategories = () => {
    const categories = products
      .map(product => product.Category)
      .filter(category => category && category.trim() !== "")
      .filter((category, index, self) => self.indexOf(category) === index)
      .sort();
    return categories;
  };

  // Filter products based on search query and category
  useEffect(() => {
    let filtered = products;

    // Filter by search query
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(product =>
        product.Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.Brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.Category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== "") {
      filtered = filtered.filter(product => product.Category === selectedCategory);
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchQuery, selectedCategory, products]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Handle product deletion
  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${productName}"?`)) {
      try {
        await deleteDoc(doc(db, "Product", productId));
        setProducts(products.filter(p => p.id !== productId));
        setMessage(`Producto "${productName}" eliminado correctamente`);
        setTimeout(() => setMessage(""), 3000);
      } catch (error) {
        setMessage("Error al eliminar producto: " + error.message);
      }
    }
  };

  // Handle product editing - navigate to edit page with product data
  const handleEditProduct = (product) => {
    // Store product data in localStorage for the edit page to access
    localStorage.setItem('editProductData', JSON.stringify(product));
    navigate('/inventario/editar');
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <PageLayout pageTitle="Todos los Productos">
        <div className="all-products-container">
          <div className="loading-message">Cargando productos...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Todos los Productos">
      <div className="all-products-container">
        <h1 className="all-products-title">Todos los Productos</h1>
        <p className="all-products-description">
          Gestiona todos los productos del inventario de Aruma Café
        </p>

        {/* Search and Filter Controls */}
        <div className="controls-container">
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar productos por nombre, marca o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-container">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              <option value="">Todas las categorías</option>
              {getUniqueCategories().map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="items-per-page"
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={15}>15 por página</option>
              <option value={20}>20 por página</option>
            </select>
            
            <button
              onClick={clearFilters}
              className="clear-filters-btn"
              type="button"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {/* Products Table */}
        <div className="table-container">
          {filteredProducts.length === 0 ? (
            <div className="no-products">
              {searchQuery || selectedCategory ? 'No se encontraron productos que coincidan con los filtros.' : 'No hay productos registrados.'}
            </div>
          ) : (
            <>
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Precio de Venta</th>
                    <th>Stock Actual</th>
                    <th>Peso</th>
                    <th>Unidad</th>
                    <th>Marca</th>
                    <th>Categoría</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProducts.map((product) => (
                    <tr key={product.id} className="product-row">
                      <td className="product-name">{product.Name}</td>
                      <td className="product-price">${product.Purchase_Sell?.toLocaleString()}</td>
                      <td className={`product-stock ${product.Stock_Current <= (product.Stock_Minimum || 0) ? 'low-stock' : ''}`}>
                        {product.Stock_Current}
                      </td>
                      <td className="product-weight">{product.Weight}</td>
                      <td className="product-unit">{product.Unit_Measure}</td>
                      <td className="product-brand">{product.Brand || '-'}</td>
                      <td className="product-category">{product.Category || '-'}</td>
                      <td className="product-actions">
                        <button
                          className="edit-btn"
                          onClick={() => handleEditProduct(product)}
                          title="Editar producto"
                        >
                          Editar
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteProduct(product.id, product.Name)}
                          title="Eliminar producto"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} productos
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary */}
        <div className="summary">
          <p>Total de productos: {filteredProducts.length}</p>
          {products.length > 0 && (
            <p>Productos con stock bajo: {
              products.filter(p => p.Stock_Current <= (p.Stock_Minimum || 0)).length
            }</p>
          )}
          {filteredProducts.length > 0 && (
            <p>Página {currentPage} de {totalPages}</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default AllProducts;
