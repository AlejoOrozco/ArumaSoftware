import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../config/firebaseConfig";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import PageLayout from "../../../components/common/PageLayout";
import "./AllProducts.css";

type Product = {
  id: string;
  Name?: string;
  Purchase_Sell?: number;
  Stock_Current: number;
  Stock_Minimum?: number | null;
  Weight?: number | string;
  Unit_Measure?: string;
  Brand?: string | null;
  Category?: string | null;
};

const AllProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Product"));
        const prods: Product[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Product, "id">),
        }));
        setProducts(prods);
        setFilteredProducts(prods);
        setLoading(false);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Error desconocido al cargar productos";
        setMessage("Error al cargar productos: " + message);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const getUniqueCategories = () => {
    const categories = products
      .map((product) => product.Category)
      .filter((category): category is string => !!category && category.trim() !== "")
      .filter((category, index, self) => self.indexOf(category) === index)
      .sort();
    return categories;
  };

  useEffect(() => {
    let filtered: Product[] = products;

    if (searchQuery.trim() !== "") {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.Name?.toLowerCase().includes(lower) ||
          product.Brand?.toLowerCase().includes(lower) ||
          product.Category?.toLowerCase().includes(lower)
      );
    }

    if (selectedCategory !== "") {
      filtered = filtered.filter(
        (product) => product.Category === selectedCategory
      );
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, products]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handleDeleteProduct = async (productId: string, productName?: string) => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar "${productName ?? "este producto"}"?`
      )
    ) {
      try {
        await deleteDoc(doc(db, "Product", productId));
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setMessage(`Producto "${productName}" eliminado correctamente`);
        setTimeout(() => setMessage(""), 3000);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Error desconocido al eliminar producto";
        setMessage("Error al eliminar producto: " + message);
      }
    }
  };

  const handleEditProduct = (product: Product) => {
    localStorage.setItem("editProductData", JSON.stringify(product));
    navigate("/inventario/editar");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

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
              {getUniqueCategories().map((category) => (
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

        {message && (
          <div
            className={`message ${
              message.includes("Error") ? "error" : "success"
            }`}
          >
            {message}
          </div>
        )}

        <div className="table-container">
          {filteredProducts.length === 0 ? (
            <div className="no-products">
              {searchQuery || selectedCategory
                ? "No se encontraron productos que coincidan con los filtros."
                : "No hay productos registrados."}
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
                      <td className="product-price">
                        ${product.Purchase_Sell?.toLocaleString()}
                      </td>
                      <td
                        className={`product-stock ${
                          product.Stock_Current <= (product.Stock_Minimum || 0)
                            ? "low-stock"
                            : ""
                        }`}
                      >
                        {product.Stock_Current}
                      </td>
                      <td className="product-weight">{product.Weight}</td>
                      <td className="product-unit">{product.Unit_Measure}</td>
                      <td className="product-brand">
                        {product.Brand || "-"}
                      </td>
                      <td className="product-category">
                        {product.Category || "-"}
                      </td>
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
                          onClick={() =>
                            handleDeleteProduct(product.id, product.Name)
                          }
                          title="Eliminar producto"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Mostrando {startIndex + 1}-
                    {Math.min(endIndex, filteredProducts.length)} de{" "}
                    {filteredProducts.length} productos
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          className={`pagination-btn ${
                            currentPage === page ? "active" : ""
                          }`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      )
                    )}

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

        <div className="summary">
          <p>Total de productos: {filteredProducts.length}</p>
          {products.length > 0 && (
            <p>
              Productos con stock bajo:{" "}
              {
                products.filter(
                  (p) => p.Stock_Current <= (p.Stock_Minimum || 0)
                ).length
              }
            </p>
          )}
          {filteredProducts.length > 0 && (
            <p>
              Página {currentPage} de {totalPages}
            </p>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default AllProducts;

