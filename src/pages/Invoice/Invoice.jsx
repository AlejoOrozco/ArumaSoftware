/**
 * Invoice Component - Coffee Shop Point of Sale System
 * 
 * Features:
 * - Create and manage active invoices (mesas)
 * - Add products to invoices with real-time stock validation
 * - Automatic stock reduction when invoices are completed
 * - Support for custom items (no stock tracking)
 * - Real-time stock level display and warnings
 * - Print receipts for completed sales
 * - Category-based product search for better UX
 * - Modal-based invoice details view
 * 
 * Stock Management:
 * - Validates stock availability before allowing sales
 * - Automatically reduces stock when invoices are finalized
 * - Prevents negative stock levels
 * - Shows stock warnings for low inventory items
 * - Displays current stock levels in product selection and invoice items
 */
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useReactToPrint } from 'react-to-print';
import { db } from "../../config/firebaseConfig";
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, query as firestoreQuery, where } from "firebase/firestore";
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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [searchMode, setSearchMode] = useState('name'); // 'name' or 'category'
  const searchContainerRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  // State for boards, now synced with Firestore
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);

  // Modal state for invoice details
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'transfer'
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const receiptRef = useRef();

  const activeBoard = boards.find(b => b.firestoreId === activeBoardId);

  // Debug log in Receipt
  // (You must also add this in src/components/Receipt/Receipt.jsx)

  // Print handler with debug logs
  const handlePrint = useReactToPrint({
    content: () => {
      console.log("[react-to-print] content callback. receiptRef.current:", receiptRef.current);
      return receiptRef.current;
    },
    onAfterPrint: () => setInvoiceToPrint(null),
  });

  // This effect hook is the key to fixing the timing issue.
  // It waits until `invoiceToPrint` has data before trying to print.
  useEffect(() => {
    if (invoiceToPrint && receiptRef.current) {
      console.log("[Invoice] About to print. invoiceToPrint:", invoiceToPrint);
      console.log("[Invoice] receiptRef.current:", receiptRef.current);
      setTimeout(() => {
        handlePrint();
      }, 100); // Give React time to update DOM
    }
  }, [invoiceToPrint, handlePrint]);

  // Extract unique categories from products
  const extractCategories = (products) => {
    const categorySet = new Set();
    products.forEach(product => {
      if (product.Category && product.Category.trim()) {
        categorySet.add(product.Category.trim());
      }
    });
    return Array.from(categorySet).sort();
  };

  // Fetch all products once on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "Product"));
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllProducts(prods);
        
        // Extract and set categories
        const extractedCategories = extractCategories(prods);
        setCategories(extractedCategories);
        
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

  // Filter products by category
  useEffect(() => {
    if (selectedCategory) {
      const filteredByCategory = allProducts.filter(product => 
        product.Category && product.Category.trim() === selectedCategory
      );
      setCategoryProducts(filteredByCategory);
      setQuery(""); // Clear search query when category is selected
      setFiltered([]);
    } else {
      setCategoryProducts([]);
    }
  }, [selectedCategory, allProducts]);

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

  // Handle table deletion
  const handleDeleteTable = (board) => {
    const productCount = board.products.length;
    const totalAmount = board.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0);
    
    setModalConfig({
      show: true,
      variant: 'warning',
      title: 'Eliminar Mesa',
      message: `¿Estás seguro de que quieres eliminar ${board.name}? Esta acción eliminará permanentemente:
      
• ${productCount} producto${productCount !== 1 ? 's' : ''} agregado${productCount !== 1 ? 's' : ''}
• Total de $${totalAmount.toFixed(2)}
• Todos los datos de la mesa

Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          // Update the invoice status to 'deleted' instead of actually deleting it
          await updateDoc(doc(db, "Invoice", board.firestoreId), {
            status: 'deleted',
            deletedAt: new Date()
          });
          
          // Remove from local state
          const updatedBoards = boards.filter(b => b.firestoreId !== board.firestoreId);
          setBoards(updatedBoards);
          
          // If the deleted board was active, select the first available board
          if (board.firestoreId === activeBoardId) {
            setActiveBoardId(updatedBoards.length > 0 ? updatedBoards[0].firestoreId : null);
          }
          
          setModalConfig({
            show: true,
            variant: 'success',
            title: 'Mesa Eliminada',
            message: `${board.name} ha sido eliminada exitosamente.`,
            onConfirm: () => setModalConfig({ show: false, onConfirm: null })
          });
        } catch (error) {
          setModalConfig({
            show: true,
            variant: 'error',
            title: 'Error',
            message: `No se pudo eliminar ${board.name}: ${error.message}`,
            onConfirm: () => setModalConfig({ show: false, onConfirm: null })
          });
        }
      }
    });
  };

  // Handle table selection (not modal opening)
  const handleTableSelect = (board) => {
    setActiveBoardId(board.firestoreId);
  };

  // Handle invoice modal (separate from table selection)
  const handleViewInvoiceDetails = (board) => {
    setSelectedInvoice(board);
    setShowInvoiceModal(true);
  };

  // Finalize invoice
  const handleSaveInvoice = async () => {
    if (!activeBoard || activeBoard.products.length === 0) {
      setModalConfig({ show: true, variant: 'warning', title: 'Factura Vacía', message: 'Por favor, agrega al menos un producto.' });
      return;
    }

    // Show payment method selection first
    setShowPaymentModal(true);
  };

  // Process invoice completion with payment method
  const handleProcessInvoice = async () => {
    const boardToSave = activeBoard;
    setShowPaymentModal(false);
    setModalConfig({ show: true, isLoading: true, title: 'Verificando Inventario' });

    try {
      // First, validate stock availability for all products
      const stockValidationPromises = boardToSave.products
        .filter(product => !product.isCustom && product.id)
        .map(async (product) => {
          const productRef = doc(db, "Product", product.id);
          const productDoc = await getDoc(productRef);
          
          if (productDoc.exists()) {
            const currentStock = productDoc.data().Stock_Current || 0;
            if (currentStock < product.quantity) {
              return {
                product: product,
                available: currentStock,
                requested: product.quantity
              };
            }
          }
          return null;
        });

      const stockValidationResults = await Promise.all(stockValidationPromises);
      const insufficientStock = stockValidationResults.filter(result => result !== null);

      if (insufficientStock.length > 0) {
        const insufficientProducts = insufficientStock.map(result => 
          `${result.product.Name} (disponible: ${result.available}, solicitado: ${result.requested})`
        ).join(', ');
        
        setModalConfig({ 
          show: true, 
          isLoading: false,
          variant: 'error', 
          title: 'Stock Insuficiente', 
          message: `No hay suficiente stock para: ${insufficientProducts}`,
          onConfirm: null
        });
        return;
      }

      setModalConfig({ show: true, isLoading: true, title: 'Registrando Compra' });

      const finalTotal = boardToSave.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0);
      
      // Update invoice status
      await updateDoc(doc(db, "Invoice", boardToSave.firestoreId), {
        status: 'completed',
        completionDate: new Date(),
        Total: finalTotal,
        paymentMethod: paymentMethod, // Add payment method to invoice
      });

      // Update product stock for non-custom products
      const stockUpdatePromises = boardToSave.products
        .filter(product => !product.isCustom && product.id) // Only update stock for real products, not custom items
        .map(async (product) => {
          try {
            const productRef = doc(db, "Product", product.id);
            const productDoc = await getDoc(productRef);
            
            if (productDoc.exists()) {
              const currentStock = productDoc.data().Stock_Current || 0;
              const newStock = Math.max(0, currentStock - product.quantity); // Prevent negative stock
              
              await updateDoc(productRef, {
                Stock_Current: newStock
              });
              
              console.log(`Stock updated for ${product.Name}: ${currentStock} -> ${newStock} (sold: ${product.quantity})`);
            } else {
              console.warn(`Product ${product.id} not found in database`);
            }
          } catch (error) {
            console.error(`Error updating stock for product ${product.id}:`, error);
            // Continue with other products even if one fails
          }
        });

      // Wait for all stock updates to complete
      await Promise.all(stockUpdatePromises);

      // Count how many products had stock updated
      const productsWithStockUpdate = boardToSave.products.filter(product => !product.isCustom && product.id).length;

      const savedInvoiceData = {
        Products: boardToSave.products,
        Total: finalTotal,
        Date: new Date().toISOString(),
        Comment: boardToSave.comment,
        paymentMethod: paymentMethod,
      };
      
      const successMessage = productsWithStockUpdate > 0 
        ? `La compra para ${boardToSave.name} se ha finalizado y el inventario ha sido actualizado (${productsWithStockUpdate} productos).`
        : `La compra para ${boardToSave.name} se ha finalizado.`;
      
      setModalConfig({ 
        show: true, 
        isLoading: false,
        variant: 'success', 
        title: '¡Éxito!', 
        message: successMessage,
        onConfirm: () => {
          const remainingBoards = boards.filter(b => b.firestoreId !== boardToSave.firestoreId);
          setBoards(remainingBoards);
          setActiveBoardId(remainingBoards.length > 0 ? remainingBoards[0].firestoreId : null);
          setShowInvoiceModal(false);
          setSelectedInvoice(null);
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
      const newQuantity = existing.quantity + 1;
      // Check if we're exceeding available stock
      if (!product.isCustom && product.Stock_Current !== undefined && newQuantity > product.Stock_Current) {
        setModalConfig({ 
          show: true, 
          variant: 'warning', 
          title: 'Stock Insuficiente', 
          message: `No hay suficiente stock de ${product.Name}. Disponible: ${product.Stock_Current}`,
          onConfirm: null
        });
        return;
      }
      newProducts = activeBoard.products.map(prod =>
        prod.id === product.id ? { ...prod, quantity: newQuantity } : prod
      );
    } else {
      newProducts = [...activeBoard.products, { ...product, quantity: 1 }];
    }
    
    updateActiveBoard({ products: newProducts });

    setQuery("");
    setFiltered([]);
    setHighlightedIndex(-1);
    setSelectedCategory(null); // Clear category selection when product is added
  };

  const handleRemoveProduct = (idx) => {
    if (!activeBoard) return;
    const newProducts = activeBoard.products.filter((_, i) => i !== idx);
    const updatedBoard = { ...activeBoard, products: newProducts };
    setActiveBoard(updatedBoard);
    
    // Update the board in the boards array
    const updatedBoards = boards.map(b => 
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);
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
    const updatedBoard = { ...activeBoard, products: newProducts };
    setActiveBoard(updatedBoard);
    
    // Update the board in the boards array
    const updatedBoards = boards.map(b => 
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);
    
    setCustomItem({ showForm: false, name: '', price: '' });
  };
  
  const handlePriceChange = (productIndex, newPrice) => {
    if (!activeBoard) return;
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
    const updatedBoard = { ...activeBoard, products: newProducts };
    setActiveBoard(updatedBoard);
    
    // Update the board in the boards array
    const updatedBoards = boards.map(b => 
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);
  };
  
  const handleQuantityChange = (productIndex, newQuantity) => {
    if (!activeBoard) return;
    const newProducts = activeBoard.products.map((p, idx) => {
      if (idx === productIndex) {
        const quantity = Math.max(1, Number(newQuantity)); // Ensure quantity is at least 1
        
        // Check if we're exceeding available stock for non-custom products
        if (!p.isCustom && p.Stock_Current !== undefined && quantity > p.Stock_Current) {
          setModalConfig({ 
            show: true, 
            variant: 'warning', 
            title: 'Stock Insuficiente', 
            message: `No hay suficiente stock de ${p.Name}. Disponible: ${p.Stock_Current}`,
            onConfirm: null
          });
          return p; // Keep the original quantity
        }
        
        return {
          ...p,
          quantity: quantity,
        };
      }
      return p;
    });
    const updatedBoard = { ...activeBoard, products: newProducts };
    setActiveBoard(updatedBoard);
    
    // Update the board in the boards array
    const updatedBoards = boards.map(b => 
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setQuery(""); // Clear search query
    setFiltered([]);
  };

  const handleClearCategory = () => {
    setSelectedCategory(null);
    setCategoryProducts([]);
  };

  const handleSearchModeChange = (mode) => {
    setSearchMode(mode);
    setQuery("");
    setFiltered([]);
    setSelectedCategory(null);
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

      {/* Payment Method Selection Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <h3>Método de Pago</h3>
            <p>Selecciona el método de pago para esta factura:</p>
            <div className="payment-options">
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span className="payment-option-text">Efectivo</span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span className="payment-option-text">Transferencia</span>
              </label>
            </div>
            <div className="payment-modal-actions">
              <button 
                onClick={handleProcessInvoice} 
                className="payment-confirm-btn"
              >
                Confirmar Pago
              </button>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="payment-cancel-btn"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="receipt-print-wrapper">
        <Receipt ref={receiptRef} invoice={invoiceToPrint} />
      </div>

      <div className="invoice-container">
        <h1 className="invoice-title">Facturación</h1>
        
        <div className="invoice-layout">
          {/* Left Side - Tables and Search */}
          <div className="invoice-left-panel">
            {/* Tables Section */}
            <div className="tables-section">
              <h2 className="section-title">Mesas Activas</h2>
              <div className="boards-container">
                {boards.map(board => {
                  const boardTotal = board.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0);
                  return (
                    <div
                      key={board.firestoreId}
                      className={`board-card ${board.firestoreId === activeBoardId ? 'active' : ''}`}
                      onClick={() => handleTableSelect(board)}
                    >
                      <span className="board-name">{board.name}</span>
                      <span className="board-total">${boardTotal.toFixed(2)}</span>
                      <span className="board-items-count">{board.products.length} productos</span>
                      <button 
                        className="delete-board-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(board);
                        }}
                        title="Eliminar mesa"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
                <button className="add-board-btn" onClick={handleAddBoard}>+</button>
              </div>
            </div>

            {/* Search Section */}
            {activeBoard && (
              <div className="search-section">
                <h2 className="section-title">Agregar Productos a {activeBoard.name}</h2>
                
                <div className="search-controls">
                  <div className="search-row">
                    <div className="search-field">
                      <label className="search-label">Tipo de Búsqueda</label>
                      <select
                        value={searchMode}
                        onChange={(e) => handleSearchModeChange(e.target.value)}
                        className="search-mode-select"
                      >
                        <option value="name">Buscar por nombre</option>
                        <option value="category">Buscar por categoría</option>
                      </select>
                    </div>
                    
                    {searchMode === 'name' && (
                      <div className="search-field">
                        <label className="search-label">Nombre del Producto</label>
                        <div className="invoice-search-container" ref={searchContainerRef}>
                          <input
                            type="text"
                            placeholder="Buscar producto por nombre..."
                            value={query}
                            onChange={e => {
                              setQuery(e.target.value);
                              if (e.target.value.length > 0) {
                                setSelectedCategory(null);
                              }
                            }}
                            className="invoice-search-bar"
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
                                    <div className="product-details">
                                      <span className="product-price">${p.Purchase_Sell || 0}</span>
                                      <span className={`product-stock ${p.Stock_Current <= (p.Stock_Minimum || 0) ? 'low-stock' : ''}`}>
                                        Stock: {p.Stock_Current || 0}
                                      </span>
                                    </div>
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
                      </div>
                    )}
                  </div>

                  {searchMode === 'category' && (
                    <div className="category-section">
                      <div className="category-grid">
                        {categories.map(category => (
                          <div
                            key={category}
                            className="category-card"
                            onClick={() => handleCategorySelect(category)}
                          >
                            <span className="category-name">{category}</span>
                            <span className="category-count">
                              {allProducts.filter(p => p.Category === category).length} productos
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Products Display */}
                  {selectedCategory && categoryProducts.length > 0 && (
                    <div className="category-products-section">
                      <div className="category-header">
                        <h3 className="category-title">Productos en {selectedCategory}</h3>
                        <button 
                          className="clear-category-btn"
                          onClick={handleClearCategory}
                        >
                          ← Volver a categorías
                        </button>
                      </div>
                      <div className="category-products-grid">
                        {categoryProducts.map(product => (
                          <div
                            key={product.id}
                            className="product-card"
                            onClick={() => handleProductSelect(product)}
                          >
                            <div className="product-card-header">
                              <span className="product-card-name">{product.Name}</span>
                              <span className="product-card-price">${product.Purchase_Sell || 0}</span>
                            </div>
                            <div className="product-card-details">
                              {product.Brand && (
                                <span className="product-card-brand">{product.Brand}</span>
                              )}
                              <span className={`product-card-stock ${product.Stock_Current <= (product.Stock_Minimum || 0) ? 'low-stock' : ''}`}>
                                Stock: {product.Stock_Current || 0}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Invoice Details */}
          <div className="invoice-right-panel">
            {activeBoard ? (
              <div className="invoice-details">
                <h2 className="invoice-details-title">Factura - {activeBoard.name}</h2>
                <ul className="invoice-product-list">
                  {activeBoard.products.map((p, idx) => (
                    <li key={p.id || idx} className="invoice-product-item">
                      <span className="product-line">
                        <span className="product-name-display">
                          {p.Name}
                          {!p.isCustom && p.Stock_Current !== undefined && (
                            <span className={`product-stock-indicator ${p.Stock_Current <= (p.Stock_Minimum || 0) ? 'low-stock' : ''}`}>
                              (Stock: {p.Stock_Current})
                            </span>
                          )}
                        </span>
                        <div className="product-inputs">
                          x
                          <input
                            type="number"
                            min="1"
                            max={!p.isCustom && p.Stock_Current !== undefined ? p.Stock_Current : undefined}
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
                <div className="invoice-total-section">
                  <strong className="invoice-total">Total: ${activeBoard.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0).toFixed(2)}</strong>
                  <button
                    className="inventory-add-btn"
                    onClick={handleSaveInvoice}
                    type="button"
                    disabled={activeBoard.products.length === 0}
                  >
                    Finalizar y Registrar Compra
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-invoice-selected">
                <h2 className="invoice-details-title">Selecciona una Mesa</h2>
                <p>Haz clic en una mesa para ver sus detalles y agregar productos.</p>
              </div>
            )}
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