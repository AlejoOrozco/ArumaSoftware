import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import PageLayout from "../../../components/common/PageLayout";
import "./Discounts.css";

type Discount = {
  id: string;
  code: string;
  percentaje: number;
  products: unknown[];
};

type Product = {
  id: string;
  Name?: string;
};

const Discounts = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    percentaje: "",
    products: [] as unknown[],
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDiscounts();
    fetchProducts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const discountsRef = collection(db, "Discount");
      const querySnapshot = await getDocs(discountsRef);
      const discountsData: Discount[] = querySnapshot.docs.map((snap) => {
        const data = snap.data() as Record<string, unknown>;
        return {
          id: snap.id,
          code: (data.code as string) || "",
          percentaje: (data.percentaje as number) || 0,
          products: (data.products as unknown[]) || [],
        };
      });
      setDiscounts(discountsData);
    } catch (error) {
      console.error("Error fetching discounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsRef = collection(db, "Product");
      const querySnapshot = await getDocs(productsRef);
      const productsData: Product[] = querySnapshot.docs.map((snap) => ({
        id: snap.id,
        ...(snap.data() as Omit<Product, "id">),
      }));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const productsToSave =
        selectedProducts.length > 0
          ? selectedProducts.map((id) => doc(db, "Product", id))
          : [];

      const discountData = {
        code: formData.code,
        percentaje: parseFloat(formData.percentaje),
        products: productsToSave,
      };

      if (editingDiscount) {
        await updateDoc(doc(db, "Discount", editingDiscount.id), discountData);
      } else {
        await addDoc(collection(db, "Discount"), discountData);
      }

      setShowForm(false);
      setEditingDiscount(null);
      setFormData({ code: "", percentaje: "", products: [] });
      setSelectedProducts([]);
      fetchDiscounts();
    } catch (error) {
      console.error("Error saving discount:", error);
      alert("Error al guardar el descuento");
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      percentaje: String(discount.percentaje),
      products: [],
    });

    const productIds =
      discount.products && Array.isArray(discount.products)
        ? discount.products
            .map((ref) => {
              if (ref && typeof ref === "object") {
                const obj = ref as { id?: string; path?: string };
                if (obj.id) return obj.id;
                if (obj.path) return obj.path.split("/")[1];
              }
              if (typeof ref === "string") {
                return ref.split("/").length > 1 ? ref.split("/")[1] : ref;
              }
              return null;
            })
            .filter((x): x is string => !!x)
        : [];

    setSelectedProducts(productIds);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este descuento?")) {
      try {
        await deleteDoc(doc(db, "Discount", id));
        fetchDiscounts();
      } catch (error) {
        console.error("Error deleting discount:", error);
        alert("Error al eliminar el descuento");
      }
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter(
    (product) =>
      product.Name &&
      product.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onPercentChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, percentaje: e.target.value });
  };

  return (
    <PageLayout pageTitle="Gestión de Descuentos">
      <div className="discounts-container">
        <div className="discounts-header">
          <h1>Gestión de Descuentos</h1>
          <button
            className="add-discount-btn"
            onClick={() => {
              setShowForm(true);
              setEditingDiscount(null);
              setFormData({ code: "", percentaje: "", products: [] });
              setSelectedProducts([]);
            }}
          >
            + Agregar Descuento
          </button>
        </div>

        {isLoading ? (
          <p>Cargando descuentos...</p>
        ) : discounts.length === 0 ? (
          <div className="empty-state">
            <p>No hay descuentos creados</p>
            <p className="empty-hint">
              Haz clic en "Agregar Descuento" para crear uno nuevo
            </p>
          </div>
        ) : (
          <div className="discounts-grid">
            {discounts.map((discount) => (
              <div key={discount.id} className="discount-card">
                <div className="discount-card-header">
                  <h3>Código: {discount.code || "Sin código"}</h3>
                  <div className="discount-card-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(discount)}
                    >
                      Editar
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(discount.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="discount-card-body">
                  <p>
                    <strong>Descuento:</strong> {discount.percentaje}%
                  </p>
                  <p>
                    <strong>Productos específicos:</strong>{" "}
                    {discount.products?.length || 0}
                  </p>
                  {discount.products && discount.products.length > 0 ? (
                    <p className="applies-to">Aplica solo a productos específicos</p>
                  ) : (
                    <p className="applies-to">Aplica a toda la factura</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>{editingDiscount ? "Editar Descuento" : "Agregar Nuevo Descuento"}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="code">Código del descuento:</label>
                  <input
                    id="code"
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                    placeholder="Ej: SUMMER2024"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="percentaje">Porcentaje de descuento:</label>
                  <input
                    id="percentaje"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.percentaje}
                    onChange={onPercentChange}
                    required
                    placeholder="Ej: 20"
                  />
                </div>

                <div className="form-group">
                  <label>Productos específicos (opcional):</label>
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="product-search"
                  />
                  <div className="product-selection">
                    <p className="selection-hint">
                      {selectedProducts.length === 0
                        ? "Si no seleccionas productos, el descuento aplicará a toda la factura"
                        : `${selectedProducts.length} producto(s) seleccionado(s)`}
                    </p>
                    <div className="products-list">
                      {filteredProducts.map((product) => (
                        <label key={product.id} className="product-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                          />
                          <span>{product.Name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="save-btn">
                    {editingDiscount ? "Actualizar" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowForm(false);
                      setEditingDiscount(null);
                      setFormData({ code: "", percentaje: "", products: [] });
                      setSelectedProducts([]);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Discounts;

