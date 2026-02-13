import { useState, useEffect, type ChangeEvent } from "react";
import { db } from "../../../config/firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import PageLayout from "../../../components/common/PageLayout";
import "./Resupply.css";

type Product = {
  id: string;
  Name?: string;
  Category?: string;
  Brand?: string;
  Stock_Current: number;
  [key: string]: unknown;
};

const Resupply = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Product"));
        const prods: Product[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            Stock_Current: (data?.Stock_Current as number) ?? (data?.stock_current as number) ?? 0,
            ...data,
          } as Product;
        });
        setProducts(prods);
        setFilteredProducts(prods);
        setLoading(false);
      } catch (error: unknown) {
        setMessage("Error al cargar productos: " + (error instanceof Error ? error.message : String(error)));
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          (product.Name &&
            product.Name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.Category &&
            product.Category.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.Brand &&
            product.Brand.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const handleStockUpdate = async (
    productId: string,
    currentStock: number,
    additionalStock: number | string
  ) => {
    const parsedAdditional = typeof additionalStock === "string"
      ? parseInt(additionalStock, 10)
      : additionalStock;

    if (!parsedAdditional || parsedAdditional <= 0) {
      setMessage("Por favor ingresa una cantidad válida");
      return;
    }

    setUpdatingProducts((prev) => new Set(prev).add(productId));
    setMessage("");

    try {
      const newStock = currentStock + parsedAdditional;
      await updateDoc(doc(db, "Product", productId), {
        Stock_Current: newStock,
      });

      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === productId ? { ...product, Stock_Current: newStock } : product
        )
      );

      const updatedProduct = products.find((p) => p.id === productId);
      setMessage(
        `Stock actualizado para ${updatedProduct?.Name ?? "producto desconocido"}`
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido al actualizar stock";
      setMessage("Error al actualizar stock: " + message);
    } finally {
      setUpdatingProducts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  type ProductCardProps = {
    product: Product;
  };

  const ProductCard = ({ product }: ProductCardProps) => {
    const [additionalStock, setAdditionalStock] = useState("");
    const isUpdating = updatingProducts.has(product.id);

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
      setAdditionalStock(e.target.value);
    };

    return (
      <div className="resupply-product-card">
        <div className="product-info">
          <h3 className="product-name">{product.Name}</h3>
          <p className="product-category">{product.Category}</p>
          <p className="product-brand">{product.Brand || "Sin marca"}</p>
          <div className="stock-info">
            <span className="current-stock">
              Stock actual: {product.Stock_Current}
            </span>
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
              onChange={onChange}
              placeholder="0"
              disabled={isUpdating}
            />
          </div>
          <button
            className="update-stock-btn"
            onClick={() =>
              handleStockUpdate(product.id, product.Stock_Current, additionalStock)
            }
            disabled={
              isUpdating || !additionalStock || Number(additionalStock) <= 0
            }
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
              {filteredProducts.length} producto
              {filteredProducts.length !== 1 ? "s" : ""} encontrado
              {filteredProducts.length !== 1 ? "s" : ""}
            </div>
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

        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
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

