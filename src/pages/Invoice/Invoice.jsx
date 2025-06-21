import React, { useEffect, useState, useRef, useCallback } from "react";
import { useReactToPrint } from 'react-to-print';
import { db } from "../../config/firebaseConfig";
import { collection, getDocs, addDoc, updateDoc, doc, query as firestoreQuery, where } from "firebase/firestore";
import PageLayout from "../../components/common/PageLayout";
import CustomModal from "../../components/Modals/CustomModal";
import Receipt from "../../components/Receipt/Receipt";
import "./Invoice.css";

// Debounce function to limit Firestore writes
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
};

const Invoice = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const searchContainerRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  // State for boards, now synced with Firestore
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);

  const [modalConfig, setModalConfig] = useState({
    show: false,
    isLoading: false,
    variant: 'success',
    message: '',
    title: '',
    onConfirm: null,
  });

  // New state for the custom item form
  const [customItem, setCustomItem] = useState({
    showForm: false,
    name: '',
    price: '',
  });

  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const receiptRef = useRef();

  const activeBoard = boards.find(b => b.firestoreId === activeBoardId);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    onAfterPrint: () => setInvoiceToPrint(null),
  });

  // This effect hook is the key to fixing the timing issue.
  // It waits until `invoiceToPrint` has data before trying to print.
  useEffect(() => {
    if (invoiceToPrint && receiptRef.current) {
      handlePrint();
    }
  }, [invoiceToPrint, handlePrint]);

  // Fetch all products once on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "Product"));
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllProducts(prods);
        return prods; // Return for use in active invoice fetching
      } catch (error) {
        console.error("Error fetching products:", error);
        setModalConfig({ show: true, variant: 'error', title: 'Error de Red', message: 'No se pudieron cargar los productos. ' + error.message });
        return [];
      } finally {
        setIsProductsLoading(false);
      }
    };

    const fetchActiveInvoices = async (products) => {
      try {
        const q = firestoreQuery(collection(db, "Invoice"), where("status", "==", "active"));
        const snapshot = await getDocs(q);
        const activeBoards = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            firestoreId: doc.id,
            name: data.mesa || `Mesa #${doc.id.substring(0, 4)}`,
            products: hydrateProducts(data.Products || [], products),
            comment: data.Comment || ''
          };
        });
        setBoards(activeBoards);
        if (activeBoards.length > 0 && !boards.some(b => b.firestoreId === activeBoardId)) {
          setActiveBoardId(activeBoards[0].firestoreId);
        }
      } catch (error) {
        console.error("Error fetching active invoices:", error);
        setModalConfig({ show: true, variant: 'error', title: 'Error', message: 'No se pudieron cargar las mesas activas.' });
      }
    };

    fetchProducts().then(products => {
      fetchActiveInvoices(products);
    });
  }, []);

  // Hydrate products with overridePrice and custom product handling
  const hydrateProducts = (invoiceProducts, allDbProducts) => {
    return invoiceProducts.map(p => {
      if (p.isCustom) {
        return {
          id: p.id || `custom_${Math.random()}`,
          Name: p.Name,
          Purchase_Sell: p.Purchase_Sell,
          quantity: p.Quantity,
          isCustom: true,
        };
      }
      const productDetails = allDbProducts.find(prod => prod.id === p.id);
      if (!productDetails) return null; // Product might have been deleted

      return {
        ...productDetails,
        Purchase_Sell: p.overridePrice ?? productDetails.Purchase_Sell,
        quantity: p.Quantity,
        // Add a flag to know if the price was originally overridden
        hasOverridePrice: p.overridePrice !== undefined,
      };
    }).filter(Boolean);
  };

  // Debounced Firestore update
  const debouncedUpdateFirestore = useCallback(debounce(async (boardId, data) => {
    try {
      await updateDoc(doc(db, "Invoice", boardId), data);
    } catch (error) {
      console.error("Failed to sync with Firestore:", error);
      // Optional: show a small, non-intrusive error indicator
    }
  }, 1000), []);

  const updateActiveBoard = (updatedData) => {
    const updatedBoards = boards.map(b => 
        b.firestoreId === activeBoardId ? { ...b, ...updatedData } : b
    );
    setBoards(updatedBoards);

    const boardToSync = updatedBoards.find(b => b.firestoreId === activeBoardId);
    if (boardToSync) {
      const firestoreProducts = boardToSync.products.map(p => {
        if (p.isCustom) {
          return {
            isCustom: true,
            Name: p.Name,
            Purchase_Sell: p.Purchase_Sell,
            Quantity: p.quantity,
          };
        }
        const data = { id: p.id, Quantity: p.quantity };
        if (p.hasOverridePrice) {
          data.overridePrice = p.Purchase_Sell;
        }
        return data;
      });

      const firestoreData = {
        Comment: boardToSync.comment,
        Products: firestoreProducts,
        Total: boardToSync.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0)
      };
      debouncedUpdateFirestore(boardToSync.firestoreId, firestoreData);
    }
  };

  // Handle adding a new board
  const handleAddBoard = async () => {
    const newMesaName = `Mesa ${boards.length + 1}`;
    try {
      const newInvoiceDoc = await addDoc(collection(db, "Invoice"), {
        Date: new Date(),
        status: 'active',
        mesa: newMesaName,
        Products: [],
        Comment: '',
        Total: 0
      });
      const newBoard = {
        firestoreId: newInvoiceDoc.id,
        name: newMesaName,
        products: [],
        comment: ''
      };
      setBoards([...boards, newBoard]);
      setActiveBoardId(newInvoiceDoc.id);
    } catch (error) {
      setModalConfig({ show: true, variant: 'error', title: 'Error', message: 'No se pudo crear una nueva mesa.' });
    }
  };

  // Finalize invoice
  const handleSaveInvoice = async () => {
    if (!activeBoard || activeBoard.products.length === 0) {
      setModalConfig({ show: true, variant: 'warning', title: 'Factura Vacía', message: 'Por favor, agrega al menos un producto.' });
      return;
    }

    const boardToSave = activeBoard;
    setModalConfig({ show: true, isLoading: true, title: 'Registrando Compra' });

    try {
      const finalTotal = boardToSave.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0);
      await updateDoc(doc(db, "Invoice", boardToSave.firestoreId), {
        status: 'completed',
        completionDate: new Date(),
        Total: finalTotal,
      });

      const savedInvoiceData = {
        Products: boardToSave.products,
        Total: finalTotal,
        Date: new Date().toISOString(),
        Comment: boardToSave.comment,
      };
      
      setModalConfig({ 
        show: true, 
        isLoading: false,
        variant: 'success', 
        title: '¡Éxito!', 
        message: `La compra para ${boardToSave.name} se ha finalizado.`,
        onConfirm: () => {
          const remainingBoards = boards.filter(b => b.firestoreId !== boardToSave.firestoreId);
          setBoards(remainingBoards);
          setActiveBoardId(remainingBoards.length > 0 ? remainingBoards[0].firestoreId : null);
        },
        showPrintButton: true,
        invoiceDataForPrint: savedInvoiceData,
      });

    } catch (e) {
      setModalConfig({ 
        show: true, 
        isLoading: false,
        variant: 'error', 
        title: 'Error al Guardar', 
        message: e.message,
        onConfirm: null, // No action needed on error
      });
    }
  };

  // Autocomplete and selection logic remains mostly the same, just uses `allProducts`
  useEffect(() => {
    if (query.length === 0) {
      setFiltered([]);
      return;
    }
    const filteredProducts = allProducts.filter(p =>
      p.Name && p.Name.toLowerCase().includes(query.toLowerCase())
    );
    setFiltered(filteredProducts);
    setHighlightedIndex(-1);
  }, [query, allProducts]);

  const handleProductSelect = (product) => {
    if (!activeBoard) return;
    const existing = activeBoard.products.find(prod => prod.id === product.id);
    let newProducts;

    if (existing) {
      newProducts = activeBoard.products.map(prod =>
        prod.id === product.id ? { ...prod, quantity: prod.quantity + 1 } : prod
      );
    } else {
      newProducts = [...activeBoard.products, { ...product, quantity: 1 }];
    }
    updateActiveBoard({ products: newProducts });

    setQuery("");
    setFiltered([]);
    setHighlightedIndex(-1);
  };

  const handleRemoveProduct = (idx) => {
    const newProducts = activeBoard.products.filter((_, i) => i !== idx);
    updateActiveBoard({ products: newProducts });
  };
  
  const handleShowCustomItemForm = () => {
    setCustomItem({ showForm: true, name: query, price: '' });
    setQuery('');
    setFiltered([]);
  };

  const handleAddCustomItem = () => {
    if (!customItem.name || !customItem.price || Number(customItem.price) <= 0) {
      setModalConfig({ show: true, variant: 'error', title: 'Datos Inválidos', message: 'Por favor, ingresa un nombre y un precio válido.' });
      return;
    }
    const newCustomProduct = {
      id: `custom_${Date.now()}`,
      Name: customItem.name,
      Purchase_Sell: Number(customItem.price),
      quantity: 1,
      isCustom: true,
    };
    const newProducts = [...activeBoard.products, newCustomProduct];
    updateActiveBoard({ products: newProducts });
    setCustomItem({ showForm: false, name: '', price: '' });
  };
  
  const handlePriceChange = (productIndex, newPrice) => {
    const newProducts = activeBoard.products.map((p, idx) => {
      if (idx === productIndex) {
        const updatedProduct = {
          ...p,
          Purchase_Sell: Number(newPrice) || 0,
        };
        if (!updatedProduct.isCustom) {
          updatedProduct.hasOverridePrice = true;
        }
        return updatedProduct;
      }
      return p;
    });
    updateActiveBoard({ products: newProducts });
  };
  
  const handleQuantityChange = (productIndex, newQuantity) => {
    const newProducts = activeBoard.products.map((p, idx) => {
      if (idx === productIndex) {
        return {
          ...p,
          quantity: Math.max(1, Number(newQuantity)), // Ensure quantity is at least 1
        };
      }
      return p;
    });
    updateActiveBoard({ products: newProducts });
  };
  
  const total = activeBoard?.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0) || 0;

  if (isProductsLoading) {
     return <PageLayout pageTitle="Factura"><p>Cargando datos de la tienda...</p></PageLayout>
  }

  if (boards.length === 0) {
    return (
      <PageLayout pageTitle="Factura">
        <div className="invoice-container centered-prompt">
          <p>No hay mesas activas.</p>
          <button className="add-board-btn big" onClick={handleAddBoard}>
            + Abrir Primera Mesa
          </button>
        </div>
      </PageLayout>
    );
  }

  if (!activeBoard) {
    return (
      <PageLayout pageTitle="Factura">
         <div className="invoice-container centered-prompt">
          <p>Por favor, selecciona o crea una mesa.</p>
          <button className="add-board-btn big" onClick={handleAddBoard}>
            + Nueva Mesa
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Factura">
      <CustomModal
        {...modalConfig}
        onHide={() => {
            if (modalConfig.onConfirm) modalConfig.onConfirm();
            setModalConfig({ show: false, onConfirm: null });
        }}
        onPrintRequest={(invoiceData) => {
            // This is now much simpler. It just sets the data.
            // The useEffect hook will handle the printing.
            if (modalConfig.onConfirm) modalConfig.onConfirm();
            setInvoiceToPrint(invoiceData);
            setModalConfig({ show: false, onConfirm: null });
        }}
      />
      
      <div className="receipt-print-wrapper">
        <Receipt ref={receiptRef} invoice={invoiceToPrint} />
      </div>

      <div className="boards-container">
        {boards.map(board => {
          const boardTotal = board.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0);
          return (
            <div
              key={board.firestoreId}
              className={`board-card ${board.firestoreId === activeBoardId ? 'active' : ''}`}
              onClick={() => setActiveBoardId(board.firestoreId)}
            >
              <span className="board-name">{board.name}</span>
              <span className="board-total">${boardTotal.toFixed(2)}</span>
            </div>
          );
        })}
        <button className="add-board-btn" onClick={handleAddBoard}>+</button>
      </div>
      <div className="invoice-container invoice-flex">
        <div className="invoice-left">
          <h1 className="invoice-title">Nueva Factura - {activeBoard.name}</h1>
          <div className="invoice-search-container" ref={searchContainerRef}>
            <input
              type="text"
              placeholder={isProductsLoading ? "Cargando..." : "Buscar producto..."}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="invoice-search-bar"
              // onKeyDown={handleKeyDown} is omitted for now
              disabled={isProductsLoading}
            />
            {filtered.length > 0 && (
              <ul className="invoice-autocomplete-list">
                {filtered.slice(0, 8).map((p, idx) => (
                  <li
                    key={p.id}
                    className={`invoice-autocomplete-item ${highlightedIndex === idx ? 'highlighted' : ''}`}
                    onClick={() => handleProductSelect(p)}
                  >
                    <div className="product-suggestion">
                      <span className="product-name">{p.Name}</span>
                      <span className="product-price">${p.Purchase_Sell || 0}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {query.length > 0 && filtered.length === 0 && !isProductsLoading && (
              <ul className="invoice-autocomplete-list">
                <li
                  className="invoice-autocomplete-item custom-add"
                  onClick={handleShowCustomItemForm}
                >
                  + Añadir "{query}" como producto personalizado
                </li>
              </ul>
            )}
          </div>
          <textarea
            placeholder="Comentario (opcional)"
            value={activeBoard.comment}
            onChange={e => updateActiveBoard({ comment: e.target.value })}
            className="invoice-comment"
          />
          <br />
          <button
            className="inventory-add-btn"
            onClick={handleSaveInvoice}
            type="button"
          >
            Finalizar y Registrar Compra
          </button>
        </div>
        <div className="invoice-right">
          <h2 className="invoice-summary-title">Factura - {activeBoard.name}</h2>
          <ul className="invoice-product-list">
            {activeBoard.products.map((p, idx) => (
              <li key={p.id || idx} className="invoice-product-item">
                <span className="product-line">
                  <span className="product-name-display">{p.Name}</span>
                  <div className="product-inputs">
                    x
                    <input
                      type="number"
                      min="1"
                      value={p.quantity}
                      onChange={e => handleQuantityChange(idx, e.target.value)}
                      className="quantity-input"
                    />
                    @ $
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.Purchase_Sell}
                      onChange={e => handlePriceChange(idx, e.target.value)}
                      className="price-input"
                    />
                    <span className="product-total-line">= ${(p.Purchase_Sell * p.quantity).toFixed(2)}</span>
                  </div>
                </span>
                <button className="invoice-remove-btn" onClick={() => handleRemoveProduct(idx)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 16 }}>
            <strong>Total: ${total.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Pop-up form for custom item */}
      {customItem.showForm && (
        <div className="custom-item-modal-overlay">
          <div className="custom-item-form">
            <h3>Añadir Producto Personalizado</h3>
            <input
              type="text"
              value={customItem.name}
              onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
              placeholder="Nombre del producto"
              className="custom-item-input"
            />
            <input
              type="number"
              value={customItem.price}
              onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
              placeholder="Precio"
              className="custom-item-input"
            />
            <div className="custom-item-actions">
              <button onClick={handleAddCustomItem} className="custom-item-btn add">Agregar</button>
              <button onClick={() => setCustomItem({ showForm: false, name: '', price: '' })} className="custom-item-btn cancel">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Invoice;