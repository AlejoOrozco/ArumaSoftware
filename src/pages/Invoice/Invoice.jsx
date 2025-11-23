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

  // State for addition modal
  const [additionModal, setAdditionModal] = useState({
    show: false,
    productIndex: null,
    productName: '',
    additionName: '',
    additionPrice: '',
  });

  // State for discount
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'transfer'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashAmountPaid, setCashAmountPaid] = useState('');

  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const receiptRef = useRef();

  const activeBoard = boards.find(b => b.firestoreId === activeBoardId);

  // Helper function to update the active board
  const setActiveBoard = (updatedBoard) => {
    const updatedBoards = boards.map(b => 
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);
  };

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
    
    // Recalculate totals to ensure we have the latest value
    const currentTotals = calculateTotals();
    
    // If cash payment, validate and calculate change
    if (paymentMethod === 'cash') {
      const total = currentTotals.total;
      const amountPaid = Number(cashAmountPaid);
      
      if (!cashAmountPaid || amountPaid <= 0) {
        setModalConfig({ 
          show: true, 
          variant: 'error', 
          title: 'Monto Inválido', 
          message: 'Por favor, ingresa el monto que pagó el cliente.',
          onConfirm: null
        });
        return;
      }
      
      if (amountPaid < total) {
        setModalConfig({ 
          show: true, 
          variant: 'error', 
          title: 'Monto Insuficiente', 
          message: `El monto pagado ($${amountPaid.toLocaleString()}) es menor al total ($${total.toLocaleString()}).`,
          onConfirm: null
        });
        return;
      }
      
      const change = amountPaid - total;
      
      // Show change calculation message
      setShowPaymentModal(false);
      setModalConfig({ 
        show: true, 
        variant: 'info', 
        title: 'Cambio Calculado', 
        message: `Total: $${total.toLocaleString()}\nMonto pagado: $${amountPaid.toLocaleString()}\n\nCambio a entregar: $${change.toLocaleString()}`,
        onConfirm: () => {
          setModalConfig({ show: false, onConfirm: null });
          // Continue with invoice processing
          processInvoiceAfterCashValidation();
        }
      });
      return;
    }
    
    // For transfer, proceed directly
    setShowPaymentModal(false);
    processInvoiceAfterCashValidation();
  };

  // Separate function to process invoice after cash validation
  const processInvoiceAfterCashValidation = async () => {
    const boardToSave = activeBoard;
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

      // Calculate final total including discount
      const subtotal = boardToSave.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0);
      let discountAmount = 0;
      
      if (appliedDiscount) {
        const discountPercentage = appliedDiscount.percentaje || 0;
        if (appliedDiscount.products && appliedDiscount.products.length > 0) {
          // Apply discount only to specific products
          discountAmount = boardToSave.products.reduce((sum, p) => {
            const productId = p.firestoreId || p.id;
            const productDiscount = appliedDiscount.products.some(ref => {
              const refId = ref.path ? ref.path.split('/')[1] : ref;
              return refId === productId;
            }) ? (p.Purchase_Sell * p.quantity * discountPercentage / 100) : 0;
            return sum + productDiscount;
          }, 0);
        } else {
          // Apply general discount to all products
          discountAmount = subtotal * discountPercentage / 100;
        }
      }
      
      const finalTotal = subtotal - discountAmount;
      
      // Prepare payment data
      const paymentData = {
        paymentMethod: paymentMethod,
      };
      
      // Add cash-specific data if payment is cash
      if (paymentMethod === 'cash') {
        paymentData.cashAmountPaid = Number(cashAmountPaid);
        paymentData.cashChange = Number(cashAmountPaid) - finalTotal;
      }
      
      // Update invoice status
      await updateDoc(doc(db, "Invoice", boardToSave.firestoreId), {
        status: 'completed',
        completionDate: new Date(),
        Total: finalTotal,
        ...paymentData,
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
        ...(paymentMethod === 'cash' && {
          cashAmountPaid: Number(cashAmountPaid),
          cashChange: Number(cashAmountPaid) - finalTotal,
        }),
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
          // Reset payment state
          setCashAmountPaid('');
          setPaymentMethod('cash');
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

  // Handle addition modal
  const handleShowAdditionModal = (productIndex) => {
    const product = activeBoard.products[productIndex];
    setAdditionModal({
      show: true,
      productIndex: productIndex,
      productName: product.Name,
      additionName: '',
      additionPrice: '',
    });
  };

  const handleAddAddition = () => {
    if (!additionModal.additionName || !additionModal.additionPrice || Number(additionModal.additionPrice) <= 0) {
      setModalConfig({ 
        show: true, 
        variant: 'error', 
        title: 'Datos Inválidos', 
        message: 'Por favor, ingresa un nombre y un precio válido para la adición.' 
      });
      return;
    }

    if (!activeBoard) return;
    
    const additionPrice = Number(additionModal.additionPrice);
    const newProducts = activeBoard.products.map((p, idx) => {
      if (idx === additionModal.productIndex) {
        const currentPrice = p.Purchase_Sell || 0;
        const newPrice = currentPrice + additionPrice;
        
        return {
          ...p,
          Purchase_Sell: newPrice,
          hasOverridePrice: true,
          additions: [...(p.additions || []), {
            name: additionModal.additionName,
            price: additionPrice,
          }],
        };
      }
      return p;
    });
    
    updateActiveBoard({ products: newProducts });
    
    setAdditionModal({
      show: false,
      productIndex: null,
      productName: '',
      additionName: '',
      additionPrice: '',
    });
  };

  const handleRemoveAddition = (productIndex, additionIndex) => {
    if (!activeBoard) return;
    
    const newProducts = activeBoard.products.map((p, idx) => {
      if (idx === productIndex) {
        const additionToRemove = p.additions[additionIndex];
        const newPrice = (p.Purchase_Sell || 0) - additionToRemove.price;
        const updatedAdditions = p.additions.filter((_, addIdx) => addIdx !== additionIndex);
        
        return {
          ...p,
          Purchase_Sell: newPrice,
          additions: updatedAdditions,
        };
      }
      return p;
    });
    
    updateActiveBoard({ products: newProducts });
  };

  // Discount handler
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    
    setIsValidatingDiscount(true);
    try {
      // Fetch discount from Firestore
      const discountsRef = collection(db, 'Discount');
      const q = firestoreQuery(discountsRef, where('code', '==', discountCode.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const discountData = querySnapshot.docs[0].data();
        setAppliedDiscount(discountData);
      } else {
        alert('Código de descuento no válido');
        setDiscountCode('');
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      alert('Error al aplicar el descuento');
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  // Calculate totals with discount
  const calculateTotals = () => {
    if (!activeBoard) return { subtotal: 0, discount: 0, total: 0 };
    
    const subtotal = activeBoard.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0);
    
    if (!appliedDiscount) {
      return { subtotal, discount: 0, total: subtotal };
    }

    const discountPercentage = appliedDiscount.percentaje || 0;
    let discountAmount = 0;

    if (appliedDiscount.products && appliedDiscount.products.length > 0) {
      // Apply discount only to specific products
      discountAmount = activeBoard.products.reduce((sum, p) => {
        // Check if product is in the discount's products array
        const productId = p.firestoreId || p.id;
        const productDiscount = appliedDiscount.products.some(ref => {
          const refId = ref.path ? ref.path.split('/')[1] : ref;
          return refId === productId;
        }) ? (p.Purchase_Sell * p.quantity * discountPercentage / 100) : 0;
        return sum + productDiscount;
      }, 0);
    } else {
      // Apply general discount to all products
      discountAmount = subtotal * discountPercentage / 100;
    }

    return {
      subtotal,
      discount: discountAmount,
      total: subtotal - discountAmount
    };
  };

  const totals = calculateTotals();
  
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
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setCashAmountPaid(''); // Reset cash amount when switching
                  }}
                />
                <span className="payment-option-text">Efectivo</span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setCashAmountPaid(''); // Clear cash amount when switching
                  }}
                />
                <span className="payment-option-text">Transferencia</span>
              </label>
            </div>
            
            {/* Cash amount input - only show when cash is selected */}
            {paymentMethod === 'cash' && (
              <div className="cash-amount-section">
                <label htmlFor="cashAmount" className="cash-amount-label">
                  Monto pagado por el cliente:
                </label>
                <input
                  id="cashAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashAmountPaid}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setCashAmountPaid(value);
                  }}
                  placeholder={`Total: $${totals.total.toLocaleString()}`}
                  className="cash-amount-input"
                  autoFocus
                />
                {cashAmountPaid && Number(cashAmountPaid) > 0 && (
                  <>
                    {Number(cashAmountPaid) >= totals.total ? (
                      <div className="change-calculation">
                        <span className="change-label">Cambio a entregar:</span>
                        <span className="change-amount">
                          ${(Number(cashAmountPaid) - totals.total).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <div className="change-warning">
                        Monto insuficiente. Faltan: ${(totals.total - Number(cashAmountPaid)).toLocaleString()}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            <div className="payment-modal-actions">
              <button 
                onClick={handleProcessInvoice} 
                className="payment-confirm-btn"
                disabled={paymentMethod === 'cash' && (!cashAmountPaid || Number(cashAmountPaid) < totals.total)}
              >
                Confirmar Pago
              </button>
              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  setCashAmountPaid('');
                }} 
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

      <div className="invoice-container-three-column">
        <h1 className="invoice-title">Facturación</h1>
        
        <div className="three-column-layout">
          {/* Column 1: Tables (25%) */}
          <div className="tables-column">
            <h2 className="column-title">Mesas Activas</h2>
            <div className="tables-container">
              {boards.map(board => {
                const boardTotal = board.products.reduce((sum, p) => sum + (p.Purchase_Sell || 0) * p.quantity, 0);
                return (
                  <div
                    key={board.firestoreId}
                    className={`table-card ${board.firestoreId === activeBoardId ? 'active' : ''}`}
                    onClick={() => handleTableSelect(board)}
                  >
                    <div className="table-header">
                      <span className="table-name">{board.name}</span>
                      <button 
                        className="delete-table-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(board);
                        }}
                        title="Eliminar mesa"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                    <div className="table-info">
                      <span className="table-total">${boardTotal.toFixed(2)}</span>
                      <span className="table-items">{board.products.length} productos</span>
                    </div>
                  </div>
                );
              })}
              <button className="add-table-btn" onClick={handleAddBoard}>
                <span className="add-icon">+</span>
                <span className="add-text">Nueva Mesa</span>
              </button>
            </div>
          </div>

          {/* Column 2: Products (40%) */}
          <div className="products-column">
            <h2 className="column-title">Productos</h2>
            {activeBoard ? (
              <div className="products-section">
                <div className="search-controls">
                  <div className="search-mode-selector">
                    <button 
                      className={`mode-btn ${searchMode === 'name' ? 'active' : ''}`}
                      onClick={() => handleSearchModeChange('name')}
                    >
                      Por Nombre
                    </button>
                    <button 
                      className={`mode-btn ${searchMode === 'category' ? 'active' : ''}`}
                      onClick={() => handleSearchModeChange('category')}
                    >
                      Por Categoría
                    </button>
                  </div>
                  
                  {searchMode === 'name' && (
                    <div className="search-input-container" ref={searchContainerRef}>
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={query}
                        onChange={e => {
                          setQuery(e.target.value);
                          if (e.target.value.length > 0) {
                            setSelectedCategory(null);
                          }
                        }}
                        className="product-search-input"
                        disabled={isProductsLoading}
                      />
                      {filtered.length > 0 && (
                        <ul className="search-results">
                          {filtered.slice(0, 6).map((p, idx) => (
                            <li
                              key={p.id}
                              className={`search-result-item ${highlightedIndex === idx ? 'highlighted' : ''}`}
                              onClick={() => handleProductSelect(p)}
                            >
                              <span className="result-name">{p.Name}</span>
                              <span className="result-price">${p.Purchase_Sell || 0}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {query.length > 0 && filtered.length === 0 && !isProductsLoading && (
                        <ul className="search-results">
                          <li
                            className="search-result-item custom-add"
                            onClick={handleShowCustomItemForm}
                          >
                            + Añadir "{query}" como personalizado
                          </li>
                        </ul>
                      )}
                    </div>
                  )}

                  {searchMode === 'category' && (
                    <div className="categories-grid">
                      {categories.map(category => (
                        <div
                          key={category}
                          className="category-item"
                          onClick={() => handleCategorySelect(category)}
                        >
                          <span className="category-name">{category}</span>
                          <span className="category-count">
                            {allProducts.filter(p => p.Category === category).length}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Category Products Display */}
                  {selectedCategory && categoryProducts.length > 0 && (
                    <div className="category-products">
                      <div className="category-header">
                        <h3 className="category-title">{selectedCategory}</h3>
                        <button 
                          className="back-btn"
                          onClick={handleClearCategory}
                        >
                          ← Volver
                        </button>
                      </div>
                      <div className="products-grid">
                        {categoryProducts.map(product => (
                          <div
                            key={product.id}
                            className="product-item"
                            onClick={() => handleProductSelect(product)}
                          >
                            <div className="product-item-header">
                              <span className="product-item-name">{product.Name}</span>
                              <span className="product-item-price">${product.Purchase_Sell || 0}</span>
                            </div>
                            <div className="product-item-details">
                              {product.Brand && (
                                <span className="product-item-brand">{product.Brand}</span>
                              )}
                              <span className={`product-item-stock ${product.Stock_Current <= (product.Stock_Minimum || 0) ? 'low-stock' : ''}`}>
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
            ) : (
              <div className="no-table-selected">
                <p>Selecciona una mesa para agregar productos</p>
              </div>
            )}
          </div>

          {/* Column 3: Invoice (35%) */}
          <div className="invoice-column">
            <h2 className="column-title">Factura</h2>
            {activeBoard ? (
              <div className="invoice-details">
                <div className="invoice-header">
                  <h3 className="invoice-table-name">{activeBoard.name}</h3>
                  <span className="invoice-items-count">{activeBoard.products.length} productos</span>
                </div>
                
                <div className="invoice-items">
                  {activeBoard.products.map((p, idx) => (
                    <div key={p.id || idx} className="invoice-item">
                      <div className="item-main">
                        <div className="item-info">
                          <span className="item-name">{p.Name}</span>
                          {!p.isCustom && p.Stock_Current !== undefined && (
                            <span className={`item-stock ${p.Stock_Current <= (p.Stock_Minimum || 0) ? 'low-stock' : ''}`}>
                              Stock: {p.Stock_Current}
                            </span>
                          )}
                        </div>
                        <div className="item-controls">
                          <div className="quantity-control">
                            <label>x</label>
                            <input
                              type="number"
                              min="1"
                              max={!p.isCustom && p.Stock_Current !== undefined ? p.Stock_Current : undefined}
                              value={p.quantity}
                              onChange={e => handleQuantityChange(idx, e.target.value)}
                              className="quantity-input"
                            />
                          </div>
                          <div className="price-control">
                            <label>@ $</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={p.Purchase_Sell}
                              onChange={e => handlePriceChange(idx, e.target.value)}
                              className="price-input"
                            />
                          </div>
                          <span className="item-total">${(p.Purchase_Sell * p.quantity).toFixed(2)}</span>
                        </div>
                        <div className="item-actions">
                          <button 
                            className="addition-btn" 
                            onClick={() => handleShowAdditionModal(idx)}
                            title="Agregar adición"
                          >
                            +
                          </button>
                          <button className="remove-btn" onClick={() => handleRemoveProduct(idx)}>
                            ×
                          </button>
                        </div>
                      </div>
                      
                      {/* Display additions */}
                      {p.additions && p.additions.length > 0 && (
                        <div className="item-additions">
                          {p.additions.map((addition, addIdx) => (
                            <div key={addIdx} className="addition-item">
                              <span className="addition-name">{addition.name}</span>
                              <span className="addition-price">+${addition.price.toFixed(2)}</span>
                              <button 
                                className="remove-addition-btn"
                                onClick={() => handleRemoveAddition(idx, addIdx)}
                                title="Quitar adición"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Total and Finalize Button - Now follows the last product */}
                  {activeBoard.products.length > 0 && (
                    <div className="invoice-footer-inline">
                      {/* Discount Input */}
                      <div className="discount-section">
                        <label htmlFor="discount-code" className="discount-label">Código de descuento:</label>
                        <div className="discount-input-group">
                          {!appliedDiscount ? (
                            <>
                              <input
                                id="discount-code"
                                type="text"
                                value={discountCode}
                                onChange={(e) => setDiscountCode(e.target.value)}
                                placeholder="Ingresa el código"
                                className="discount-input"
                              />
                              <button
                                className="apply-discount-btn"
                                onClick={handleApplyDiscount}
                                disabled={!discountCode.trim() || isValidatingDiscount}
                              >
                                {isValidatingDiscount ? 'Validando...' : 'Aplicar'}
                              </button>
                            </>
                          ) : (
                            <div className="applied-discount">
                              <span className="discount-name">Descuento aplicado ({appliedDiscount.percentaje}%)</span>
                              <button className="remove-discount-btn" onClick={handleRemoveDiscount}>
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Totals */}
                      <div className="invoice-totals">
                        <div className="total-row">
                          <span className="total-label">Subtotal:</span>
                          <span className="total-amount">${totals.subtotal.toFixed(2)}</span>
                        </div>
                        {appliedDiscount && (
                          <div className="total-row discount-row">
                            <span className="total-label">Descuento:</span>
                            <span className="total-amount discount-amount">-${totals.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="total-row final-total">
                          <span className="total-label">Total:</span>
                          <span className="total-amount final-amount">${totals.total.toFixed(2)}</span>
                        </div>
                      </div>

                      <button
                        className="finalize-btn"
                        onClick={handleSaveInvoice}
                        disabled={activeBoard.products.length === 0}
                      >
                        Finalizar Compra
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Empty state when no products */}
                {activeBoard.products.length === 0 && (
                  <div className="empty-invoice-state">
                    <p>No hay productos en esta mesa</p>
                    <p className="empty-state-hint">Agrega productos desde la columna de productos</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-invoice-selected">
                <p>Selecciona una mesa para ver la factura</p>
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

      {/* Addition Modal */}
      {additionModal.show && (
        <div className="custom-item-modal-overlay">
          <div className="custom-item-form">
            <h3>Agregar Adición a {additionModal.productName}</h3>
            <input
              type="text"
              value={additionModal.additionName}
              onChange={(e) => setAdditionModal({ ...additionModal, additionName: e.target.value })}
              placeholder="Nombre de la adición (ej: Alcohol, Leche extra)"
              className="custom-item-input"
            />
            <input
              type="number"
              value={additionModal.additionPrice}
              onChange={(e) => setAdditionModal({ ...additionModal, additionPrice: e.target.value })}
              placeholder="Precio adicional"
              className="custom-item-input"
              min="0"
              step="0.01"
            />
            <div className="custom-item-actions">
              <button onClick={handleAddAddition} className="custom-item-btn add">Agregar Adición</button>
              <button 
                onClick={() => setAdditionModal({ show: false, productIndex: null, productName: '', additionName: '', additionPrice: '' })} 
                className="custom-item-btn cancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Invoice;