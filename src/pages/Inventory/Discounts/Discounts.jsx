import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query as firestoreQuery, where } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import PageLayout from "../../../components/common/PageLayout";
import "./Discounts.css";

const Discounts = () => {
  const [discounts, setDiscounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    percentaje: '',
    products: []
  });

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDiscounts();
    fetchProducts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const discountsRef = collection(db, 'Discount');
      const querySnapshot = await getDocs(discountsRef);
      const discountsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          code: data.code || '',
          percentaje: data.percentaje || 0,
          products: data.products || []
        };
      });
      setDiscounts(discountsData);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsRef = collection(db, 'Product');
      const querySnapshot = await getDocs(productsRef);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        firestoreId: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Only create products array if there are selected products
      const productsToSave = selectedProducts.length > 0
        ? selectedProducts.map(id => doc(db, 'Product', id))
        : [];

      const discountData = {
        code: formData.code,
        percentaje: parseFloat(formData.percentaje),
        products: productsToSave
      };

      if (editingDiscount) {
        await updateDoc(doc(db, 'Discount', editingDiscount.id), discountData);
      } else {
        await addDoc(collection(db, 'Discount'), discountData);
      }

      setShowForm(false);
      setEditingDiscount(null);
      setFormData({ code: '', percentaje: '', products: [] });
      setSelectedProducts([]);
      fetchDiscounts();
    } catch (error) {
      console.error('Error saving discount:', error);
      alert('Error al guardar el descuento');
    }
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      percentaje: discount.percentaje,
      products: []
    });
    
    // Extract product IDs from Firestore document references
    const productIds = discount.products && Array.isArray(discount.products)
      ? discount.products.map(ref => {
          // Handle Firestore document references
          if (ref && typeof ref === 'object') {
            // If it's a Firestore document reference, get the ID
            if (ref.id) {
              return ref.id;
            }
            // If it has a path property, extract ID from path
            if (ref.path) {
              return ref.path.split('/')[1];
            }
          }
          // If it's already a string ID
          if (typeof ref === 'string') {
            return ref.split('/').length > 1 ? ref.split('/')[1] : ref;
          }
          return null;
        }).filter(Boolean)
      : [];
    setSelectedProducts(productIds);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este descuento?')) {
      try {
        await deleteDoc(doc(db, 'Discount', id));
        fetchDiscounts();
      } catch (error) {
        console.error('Error deleting discount:', error);
        alert('Error al eliminar el descuento');
      }
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter(product =>
    product.Name && product.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout pageTitle="Gestión de Descuentos">
      <div className="discounts-container">
        <div className="discounts-header">
          <h1>Gestión de Descuentos</h1>
          <button className="add-discount-btn" onClick={() => {
            setShowForm(true);
            setEditingDiscount(null);
            setFormData({ code: '', percentaje: '', products: [] });
            setSelectedProducts([]);
          }}>
            + Agregar Descuento
          </button>
        </div>

        {isLoading ? (
          <p>Cargando descuentos...</p>
        ) : discounts.length === 0 ? (
          <div className="empty-state">
            <p>No hay descuentos creados</p>
            <p className="empty-hint">Haz clic en "Agregar Descuento" para crear uno nuevo</p>
          </div>
        ) : (
          <div className="discounts-grid">
            {discounts.map(discount => (
              <div key={discount.id} className="discount-card">
                <div className="discount-card-header">
                  <h3>Código: {discount.code || 'Sin código'}</h3>
                  <div className="discount-card-actions">
                    <button className="edit-btn" onClick={() => handleEdit(discount)}>Editar</button>
                    <button className="delete-btn" onClick={() => handleDelete(discount.id)}>Eliminar</button>
                  </div>
                </div>
                <div className="discount-card-body">
                  <p><strong>Descuento:</strong> {discount.percentaje}%</p>
                  <p><strong>Productos específicos:</strong> {discount.products?.length || 0}</p>
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
              <h2>{editingDiscount ? 'Editar Descuento' : 'Agregar Nuevo Descuento'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="code">Código del descuento:</label>
                  <input
                    id="code"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, percentaje: e.target.value })}
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
                        ? 'Si no seleccionas productos, el descuento aplicará a toda la factura'
                        : `${selectedProducts.length} producto(s) seleccionado(s)`}
                    </p>
                    <div className="products-list">
                      {filteredProducts.map(product => (
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
                    {editingDiscount ? 'Actualizar' : 'Guardar'}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => {
                      setShowForm(false);
                      setEditingDiscount(null);
                      setFormData({ code: '', percentaje: '', products: [] });
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
