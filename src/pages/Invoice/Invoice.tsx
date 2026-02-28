import { useEffect, useState, useRef, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import { db } from "../../config/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  query as firestoreQuery,
  where,
} from "firebase/firestore";
import PageLayout from "../../components/common/PageLayout";
import CustomModal from "../../components/Modals/CustomModal";
import Receipt from "../../components/Receipt/Receipt";
import "./Invoice.css";

// NOTE: This file is a direct TypeScript port of the existing JSX logic.
// Many values are typed as `any` for now to keep the migration fast.
// A later hardening step can refine these types.

type AnyRecord = Record<string, any>;

const debounce = (func: (..._args: any[]) => void, delay: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(undefined, args), delay);
  };
};

const Invoice = () => {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [searchMode, setSearchMode] = useState<"name" | "category">("name");
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  const [_showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [_selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const [modalConfig, setModalConfig] = useState<AnyRecord>({
    show: false,
    isLoading: false,
    variant: "success",
    message: "",
    title: "",
    onConfirm: null,
  });

  const [customItem, setCustomItem] = useState({
    showForm: false,
    name: "",
    price: "",
  });

  const [additionModal, setAdditionModal] = useState({
    show: false,
    productIndex: null as number | null,
    productName: "",
    additionName: "",
    additionPrice: "",
  });

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<any | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashAmountPaid, setCashAmountPaid] = useState("");
  const [selectedBills, setSelectedBills] = useState<Record<number, number>>({});

  const [invoiceToPrint, setInvoiceToPrint] = useState<any | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  const activeBoard = boards.find((b) => b.firestoreId === activeBoardId) || null;

  const setActiveBoard = (updatedBoard: any) => {
    const updatedBoards = boards.map((b) =>
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);
  };

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    onAfterPrint: () => setInvoiceToPrint(null),
    pageStyle: `
      @page { margin: 5mm; size: 80mm auto; }
      body, .receipt-container {
        display: block !important;
        visibility: visible !important;
        color: #000 !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .receipt-container {
        font-family: 'Courier New', Courier, monospace;
        width: 280px;
        padding: 10px;
        margin: 0;
      }
      .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
      .receipt-shop-name { font-size: 1.2rem; font-weight: bold; margin: 0; color: #000; }
      .receipt-header p { margin: 0; font-size: 0.8rem; color: #000; }
      .receipt-info { margin-bottom: 10px; font-size: 0.8rem; color: #000; }
      .receipt-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; color: #000; }
      .receipt-table th, .receipt-table td { padding: 4px 2px; text-align: left; color: #000; }
      .receipt-table th:nth-child(2), .receipt-table td:nth-child(2) { text-align: center; }
      .receipt-table th:nth-child(3), .receipt-table td:nth-child(3),
      .receipt-table th:nth-child(4), .receipt-table td:nth-child(4) { text-align: right; }
      .receipt-table thead { border-bottom: 1px dashed #000; }
      .receipt-total { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #000; text-align: right; font-size: 1.1rem; color: #000; }
      .receipt-payment { margin-top: 8px; padding-top: 8px; border-top: 1px dotted #000; text-align: center; font-size: 0.9rem; color: #000; }
      .receipt-payment p { margin: 0; }
      .receipt-footer { margin-top: 10px; text-align: center; font-size: 0.8rem; color: #000; }
    `,
  });

  useEffect(() => {
    if (invoiceToPrint && receiptRef.current) {
      console.log("[Invoice] About to print. invoiceToPrint:", invoiceToPrint);
      console.log("[Invoice] receiptRef.current:", receiptRef.current);
      setTimeout(() => {
        handlePrint();
      }, 100);
    }
  }, [invoiceToPrint, handlePrint]);

  const extractCategories = (products: any[]) => {
    const categorySet = new Set<string>();
    products.forEach((product) => {
      if (product.Category && product.Category.trim()) {
        categorySet.add(product.Category.trim());
      }
    });
    return Array.from(categorySet).sort();
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "Product"));
        const prods = snapshot.docs.map((snap) => ({
          id: snap.id,
          ...snap.data(),
        }));
        setAllProducts(prods);

        const extractedCategories = extractCategories(prods);
        setCategories(extractedCategories);

        return prods;
      } catch (error: any) {
        console.error("Error fetching products:", error);
        setModalConfig({
          show: true,
          variant: "error",
          title: "Error de Red",
          message: "No se pudieron cargar los productos. " + error.message,
        });
        return [];
      } finally {
        setIsProductsLoading(false);
      }
    };

    const fetchActiveInvoices = async (products: any[]) => {
      try {
        const q = firestoreQuery(
          collection(db, "Invoice"),
          where("status", "==", "active")
        );
        const snapshot = await getDocs(q);
        const activeBoards = snapshot.docs.map((snap) => {
          const data = snap.data() as any;
          return {
            firestoreId: snap.id,
            name: data.mesa || `Mesa #${snap.id.substring(0, 4)}`,
            products: hydrateProducts(data.Products || [], products),
            comment: data.Comment || "",
          };
        });
        setBoards(activeBoards);
        if (activeBoards.length > 0 && !boards.some((b) => b.firestoreId === activeBoardId)) {
          setActiveBoardId(activeBoards[0]?.firestoreId ?? null);
        }
      } catch (error) {
        console.error("Error fetching active invoices:", error);
        setModalConfig({
          show: true,
          variant: "error",
          title: "Error",
          message: "No se pudieron cargar las mesas activas.",
        });
      }
    };

    fetchProducts().then((products) => {
      fetchActiveInvoices(products);
    });
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const filteredByCategory = allProducts.filter(
        (product) =>
          product.Category && product.Category.trim() === selectedCategory
      );
      setCategoryProducts(filteredByCategory);
      setQuery("");
      setFiltered([]);
    } else {
      setCategoryProducts([]);
    }
  }, [selectedCategory, allProducts]);

  const hydrateProducts = (invoiceProducts: any[], allDbProducts: any[]) => {
    return invoiceProducts
      .map((p) => {
        if (p.isCustom) {
          return {
            id: p.id || `custom_${Math.random()}`,
            Name: p.Name,
            Purchase_Sell: p.Purchase_Sell,
            Quantity: p.Quantity,
            quantity: p.Quantity,
            isCustom: true,
          };
        }
        const productDetails = allDbProducts.find((prod) => prod.id === p.id);
        if (!productDetails) return null;

        return {
          ...productDetails,
          Purchase_Sell: p.overridePrice ?? productDetails.Purchase_Sell,
          quantity: p.Quantity,
          hasOverridePrice: p.overridePrice !== undefined,
        };
      })
      .filter(Boolean);
  };

  const debouncedUpdateFirestore = useCallback(
    debounce(async (boardId: string, data: any) => {
      try {
        await updateDoc(doc(db, "Invoice", boardId), data);
      } catch (error) {
        console.error("Failed to sync with Firestore:", error);
      }
    }, 1000),
    []
  );

  const updateActiveBoard = (updatedData: any) => {
    const updatedBoards = boards.map((b) =>
      b.firestoreId === activeBoardId ? { ...b, ...updatedData } : b
    );
    setBoards(updatedBoards);

    const boardToSync = updatedBoards.find((b) => b.firestoreId === activeBoardId);
    if (boardToSync) {
      const firestoreProducts = boardToSync.products.map((p: any) => {
        if (p.isCustom) {
          return {
            isCustom: true,
            Name: p.Name,
            Purchase_Sell: p.Purchase_Sell,
            Quantity: p.quantity,
          };
        }
        const data: AnyRecord = { id: p.id, Quantity: p.quantity };
        if (p.hasOverridePrice) {
          data.overridePrice = p.Purchase_Sell;
        }
        return data;
      });

      const firestoreData = {
        Comment: boardToSync.comment,
        Products: firestoreProducts,
        Total: boardToSync.products.reduce(
          (sum: number, p: any) => sum + (p.Purchase_Sell || 0) * p.quantity,
          0
        ),
      };
      debouncedUpdateFirestore(boardToSync.firestoreId, firestoreData);
    }
  };

  const handleAddBoard = async (tableNumber: number | null = null) => {
    let newTableNumber = tableNumber;

    if (!newTableNumber) {
      const existingTableNumbers = boards
        .map((b) => {
          const match = b.name.match(/Mesa\s*(\d+)/i);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((x: number | null): x is number => x !== null);

      for (let i = 1; i <= 6; i++) {
        if (!existingTableNumbers.includes(i)) {
          newTableNumber = i;
          break;
        }
      }
    }

    if (boards.length >= 6) {
      setModalConfig({
        show: true,
        variant: "warning",
        title: "Límite de Mesas",
        message:
          "Ya se han creado todas las mesas disponibles (6 mesas máximo).",
      });
      return;
    }

    if (newTableNumber) {
      const existingTableNumbers = boards
        .map((b) => {
          const match = b.name.match(/Mesa\s*(\d+)/i);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((x: number | null): x is number => x !== null);

      if (existingTableNumbers.includes(newTableNumber)) {
        setModalConfig({
          show: true,
          variant: "warning",
          title: "Mesa Ocupada",
          message: `La Mesa ${newTableNumber} ya está activa.`,
        });
        return;
      }
    }

    if (!newTableNumber) {
      setModalConfig({
        show: true,
        variant: "error",
        title: "Error",
        message: "No se puede crear más mesas. Límite alcanzado.",
      });
      return;
    }

    const newMesaName = `Mesa ${newTableNumber}`;
    try {
      const newInvoiceDoc = await addDoc(collection(db, "Invoice"), {
        Date: new Date(),
        status: "active",
        mesa: newMesaName,
        Products: [],
        Comment: "",
        Total: 0,
      });
      const newBoard = {
        firestoreId: newInvoiceDoc.id,
        name: newMesaName,
        products: [] as any[],
        comment: "",
      };
      setBoards([...boards, newBoard]);
      setActiveBoardId(newInvoiceDoc.id);
    } catch (error) {
      setModalConfig({
        show: true,
        variant: "error",
        title: "Error",
        message: "No se pudo crear una nueva mesa." + error,
      });
    }
  };

  const handleDeleteTable = (board: any) => {
    const productCount = board.products.length;
    const totalAmount = board.products.reduce(
      (sum: number, p: any) => sum + (p.Purchase_Sell || 0) * p.quantity,
      0
    );

    setModalConfig({
      show: true,
      variant: "warning",
      title: "Eliminar Mesa",
      message: `¿Estás seguro de que quieres eliminar ${
        board.name
      }? Esta acción eliminará permanentemente:
      
• ${productCount} producto${productCount !== 1 ? "s" : ""} agregado${
        productCount !== 1 ? "s" : ""
      }
• Total de $${totalAmount.toFixed(2)}
• Todos los datos de la mesa

Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "Invoice", board.firestoreId), {
            status: "deleted",
            deletedAt: new Date(),
          });

          const updatedBoards = boards.filter(
            (b) => b.firestoreId !== board.firestoreId
          );
          setBoards(updatedBoards);

          if (board.firestoreId === activeBoardId) {
            setActiveBoardId(
              updatedBoards.length > 0 ? updatedBoards[0].firestoreId : null
            );
          }

          setModalConfig({
            show: true,
            variant: "success",
            title: "Mesa Eliminada",
            message: `${board.name} ha sido eliminada exitosamente.`,
            onConfirm: () => setModalConfig({ show: false, onConfirm: null }),
          });
        } catch (error: any) {
          setModalConfig({
            show: true,
            variant: "error",
            title: "Error",
            message: `No se pudo eliminar ${board.name}: ${error.message}`,
            onConfirm: () => setModalConfig({ show: false, onConfirm: null }),
          });
        }
      },
    });
  };

  const handleTableSelect = (board: any) => {
    setActiveBoardId(board.firestoreId);
  };

  const handleViewInvoiceDetails = (board: any) => {
    setSelectedInvoice(board);
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = async () => {
    if (!activeBoard || activeBoard.products.length === 0) {
      setModalConfig({
        show: true,
        variant: "warning",
        title: "Factura Vacía",
        message: "Por favor, agrega al menos un producto.",
      });
      return;
    }

    setShowPaymentModal(true);
  };

  const calculateTotals = () => {
    if (!activeBoard) return { subtotal: 0, discount: 0, total: 0 };

    const subtotal = activeBoard.products.reduce(
      (sum: number, p: any) => sum + (p.Purchase_Sell || 0) * p.quantity,
      0
    );

    if (!appliedDiscount) {
      return { subtotal, discount: 0, total: subtotal };
    }

    const discountPercentage = appliedDiscount.percentaje || 0;
    let discountAmount = 0;

    if (appliedDiscount.products && appliedDiscount.products.length > 0) {
      discountAmount = activeBoard.products.reduce((sum: number, p: any) => {
        const productId = p.firestoreId || p.id;
        const productDiscount = appliedDiscount.products.some((ref: any) => {
          const refId = ref.path ? ref.path.split("/")[1] : ref;
          return refId === productId;
        })
          ? (p.Purchase_Sell * p.quantity * discountPercentage) / 100
          : 0;
        return sum + productDiscount;
      }, 0);
    } else {
      discountAmount = (subtotal * discountPercentage) / 100;
    }

    return {
      subtotal,
      discount: discountAmount,
      total: subtotal - discountAmount,
    };
  };

  const totals = calculateTotals();
  const total =
    activeBoard?.products.reduce(
      (sum: number, p: any) => sum + (p.Purchase_Sell || 0) * p.quantity,
      0
    ) || 0;

  const handleProcessInvoice = async () => {
    if (!activeBoard) return;

    const currentTotals = calculateTotals();

    if (paymentMethod === "cash") {
      const totalToPay = currentTotals.total;
      const amountPaid = Number(cashAmountPaid);

      if (!cashAmountPaid || isNaN(amountPaid) || amountPaid <= 0) {
        setModalConfig({
          show: true,
          variant: "error",
          title: "Monto Inválido",
          message: "Por favor, ingresa un monto válido que pagó el cliente.",
          onConfirm: null,
        });
        return;
      }

      if (amountPaid < totalToPay) {
        setModalConfig({
          show: true,
          variant: "error",
          title: "Monto Insuficiente",
          message: `El monto pagado ($${amountPaid.toLocaleString()}) es menor al total ($${totalToPay.toLocaleString()}).`,
          onConfirm: null,
        });
        return;
      }

      const change = amountPaid - totalToPay;

      setShowPaymentModal(false);
      setModalConfig({
        show: true,
        variant: "info",
        title: "Cambio Calculado",
        message: `Total: $${totalToPay.toLocaleString()}\nMonto pagado: $${amountPaid.toLocaleString()}\n\nCambio a entregar: $${change.toLocaleString()}`,
        onConfirm: () => {
          setModalConfig({ show: false, onConfirm: null });
          processInvoiceAfterCashValidation();
        },
      });
      return;
    }

    setShowPaymentModal(false);
    processInvoiceAfterCashValidation();
  };

  const processInvoiceAfterCashValidation = async () => {
    const boardToSave = activeBoard;
    if (!boardToSave) return;

    setModalConfig({
      show: true,
      isLoading: true,
      title: "Verificando Inventario",
    });

    try {
      const stockValidationPromises = boardToSave.products
        .filter((product: any) => !product.isCustom && product.id)
        .map(async (product: any) => {
          const productRef = doc(db, "Product", product.id);
          const productDoc = await getDoc(productRef);

          if (productDoc.exists()) {
            const data = productDoc.data() as any;
            const currentStock = data.Stock_Current || 0;
            if (currentStock < product.quantity) {
              return {
                product,
                available: currentStock,
                requested: product.quantity,
              };
            }
          }
          return null;
        });

      const stockValidationResults = await Promise.all(stockValidationPromises);
      const insufficientStock = stockValidationResults.filter(
        (result): result is any => result !== null
      );

      if (insufficientStock.length > 0) {
        const insufficientProducts = insufficientStock
          .map(
            (result) =>
              `${result.product.Name} (disponible: ${result.available}, solicitado: ${result.requested})`
          )
          .join(", ");

        setModalConfig({
          show: true,
          isLoading: false,
          variant: "error",
          title: "Stock Insuficiente",
          message: `No hay suficiente stock para: ${insufficientProducts}`,
          onConfirm: null,
        });
        return;
      }

      setModalConfig({
        show: true,
        isLoading: true,
        title: "Registrando Compra",
      });

      const subtotal = boardToSave.products.reduce(
        (sum: number, p: any) => sum + (p.Purchase_Sell || 0) * p.quantity,
        0
      );
      let discountAmount = 0;

      if (appliedDiscount) {
        const discountPercentage = appliedDiscount.percentaje || 0;
        if (appliedDiscount.products && appliedDiscount.products.length > 0) {
          discountAmount = boardToSave.products.reduce((sum: number, p: any) => {
            const productId = p.firestoreId || p.id;
            const productDiscount = appliedDiscount.products.some((ref: any) => {
              const refId = ref.path ? ref.path.split("/")[1] : ref;
              return refId === productId;
            })
              ? (p.Purchase_Sell * p.quantity * discountPercentage) / 100
              : 0;
            return sum + productDiscount;
          }, 0);
        } else {
          discountAmount = (subtotal * discountPercentage) / 100;
        }
      }

      const finalTotal = subtotal - discountAmount;

      const paymentData: AnyRecord = {
        paymentMethod,
      };

      if (paymentMethod === "cash") {
        paymentData.cashAmountPaid = Number(cashAmountPaid);
        paymentData.cashChange = Number(cashAmountPaid) - finalTotal;
      }

      await updateDoc(doc(db, "Invoice", boardToSave.firestoreId), {
        status: "completed",
        completionDate: new Date(),
        Total: finalTotal,
        ...paymentData,
      });

      const stockUpdatePromises = boardToSave.products
        .filter((product: any) => !product.isCustom && product.id)
        .map(async (product: any) => {
          try {
            const productRef = doc(db, "Product", product.id);
            const productDoc = await getDoc(productRef);

            if (productDoc.exists()) {
              const data = productDoc.data() as any;
              const currentStock = data.Stock_Current || 0;
              const newStock = Math.max(0, currentStock - product.quantity);

              await updateDoc(productRef, {
                Stock_Current: newStock,
              });

              console.log(
                `Stock updated for ${product.Name}: ${currentStock} -> ${newStock} (sold: ${product.quantity})`
              );
            } else {
              console.warn(`Product ${product.id} not found in database`);
            }
          } catch (error) {
            console.error(
              `Error updating stock for product ${product.id}:`,
              error
            );
          }
        });

      await Promise.all(stockUpdatePromises);

      const productsWithStockUpdate = boardToSave.products.filter(
        (product: any) => !product.isCustom && product.id
      ).length;

      const savedInvoiceData = {
        Products: boardToSave.products,
        Total: finalTotal,
        Date: new Date().toISOString(),
        Comment: boardToSave.comment,
        paymentMethod,
        ...(paymentMethod === "cash" && {
          cashAmountPaid: Number(cashAmountPaid),
          cashChange: Number(cashAmountPaid) - finalTotal,
        }),
      };

      const successMessage =
        productsWithStockUpdate > 0
          ? `La compra para ${boardToSave.name} se ha finalizado y el inventario ha sido actualizado (${productsWithStockUpdate} productos).`
          : `La compra para ${boardToSave.name} se ha finalizado.`;

      setModalConfig({
        show: true,
        isLoading: false,
        variant: "success",
        title: "¡Éxito!",
        message: successMessage,
        onConfirm: () => {
          const remainingBoards = boards.filter(
            (b) => b.firestoreId !== boardToSave.firestoreId
          );
          setBoards(remainingBoards);
          setActiveBoardId(
            remainingBoards.length > 0 ? remainingBoards[0].firestoreId : null
          );
          setShowInvoiceModal(false);
          setSelectedInvoice(null);
          setCashAmountPaid("");
          setPaymentMethod("cash");
          setSelectedBills({});
        },
        showPrintButton: true,
        invoiceDataForPrint: savedInvoiceData,
      });
    } catch (e: any) {
      setModalConfig({
        show: true,
        isLoading: false,
        variant: "error",
        title: "Error al Guardar",
        message: e.message,
        onConfirm: null,
      });
    }
  };

  useEffect(() => {
    if (query.length === 0) {
      setFiltered([]);
      return;
    }
    const filteredProducts = allProducts.filter(
      (p) => p.Name && p.Name.toLowerCase().includes(query.toLowerCase())
    );
    setFiltered(filteredProducts);
    setHighlightedIndex(-1);
  }, [query, allProducts]);

  const handleProductSelect = (product: any) => {
    if (!activeBoard) return;
    const existing = activeBoard.products.find((prod: any) => prod.id === product.id);
    let newProducts;

    if (existing) {
      const newQuantity = existing.quantity + 1;
      if (
        !product.isCustom &&
        product.Stock_Current !== undefined &&
        newQuantity > product.Stock_Current
      ) {
        setModalConfig({
          show: true,
          variant: "warning",
          title: "Stock Insuficiente",
          message: `No hay suficiente stock de ${product.Name}. Disponible: ${product.Stock_Current}`,
          onConfirm: null,
        });
        return;
      }
      newProducts = activeBoard.products.map((prod: any) =>
        prod.id === product.id ? { ...prod, quantity: newQuantity } : prod
      );
    } else {
      newProducts = [...activeBoard.products, { ...product, quantity: 1 }];
    }

    updateActiveBoard({ products: newProducts });

    setQuery("");
    setFiltered([]);
    setHighlightedIndex(-1);
    setSelectedCategory(null);
  };

  const handleRemoveProduct = (idx: number) => {
    if (!activeBoard) return;
    const newProducts = activeBoard.products.filter(
      (_: any, i: number) => i !== idx
    );
    const updatedBoard = { ...activeBoard, products: newProducts };
    setActiveBoard(updatedBoard);

    const updatedBoards = boards.map((b) =>
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);
  };

  const handleShowCustomItemForm = () => {
    setCustomItem({ showForm: true, name: query, price: "" });
    setQuery("");
    setFiltered([]);
  };

  const handleAddCustomItem = () => {
    if (!customItem.name || !customItem.price || Number(customItem.price) <= 0) {
      setModalConfig({
        show: true,
        variant: "error",
        title: "Datos Inválidos",
        message: "Por favor, ingresa un nombre y un precio válido.",
      });
      return;
    }
    if (!activeBoard) return;
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

    const updatedBoards = boards.map((b) =>
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);

    setCustomItem({ showForm: false, name: "", price: "" });
  };

  const handlePriceChange = (productIndex: number, newPrice: string) => {
    if (!activeBoard) return;
    const newProducts = activeBoard.products.map((p: any, idx: number) => {
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

    const updatedBoards = boards.map((b) =>
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);
  };

  const handleQuantityChange = (productIndex: number, newQuantity: string) => {
    if (!activeBoard) return;
    const newProducts = activeBoard.products.map((p: any, idx: number) => {
      if (idx === productIndex) {
        const quantity = Math.max(1, Number(newQuantity));

        if (
          !p.isCustom &&
          p.Stock_Current !== undefined &&
          quantity > p.Stock_Current
        ) {
          setModalConfig({
            show: true,
            variant: "warning",
            title: "Stock Insuficiente",
            message: `No hay suficiente stock de ${p.Name}. Disponible: ${p.Stock_Current}`,
            onConfirm: null,
          });
          return p;
        }

        return {
          ...p,
          quantity,
        };
      }
      return p;
    });
    const updatedBoard = { ...activeBoard, products: newProducts };
    setActiveBoard(updatedBoard);

    const updatedBoards = boards.map((b) =>
      b.firestoreId === activeBoardId ? updatedBoard : b
    );
    setBoards(updatedBoards);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setQuery("");
    setFiltered([]);
  };

  const handleClearCategory = () => {
    setSelectedCategory(null);
    setCategoryProducts([]);
  };

  const handleSearchModeChange = (mode: "name" | "category") => {
    setSearchMode(mode);
    setQuery("");
    setFiltered([]);
    setSelectedCategory(null);
  };

  const handleShowAdditionModal = (productIndex: number) => {
    if (!activeBoard) return;
    const product = activeBoard.products[productIndex];
    setAdditionModal({
      show: true,
      productIndex,
      productName: product.Name,
      additionName: "",
      additionPrice: "",
    });
  };

  const handleAddAddition = () => {
    if (
      !additionModal.additionName ||
      !additionModal.additionPrice ||
      Number(additionModal.additionPrice) <= 0
    ) {
      setModalConfig({
        show: true,
        variant: "error",
        title: "Datos Inválidos",
        message:
          "Por favor, ingresa un nombre y un precio válido para la adición.",
      });
      return;
    }

    if (!activeBoard || additionModal.productIndex === null) return;

    const additionPrice = Number(additionModal.additionPrice);
    const newProducts = activeBoard.products.map((p: any, idx: number) => {
      if (idx === additionModal.productIndex) {
        const currentPrice = p.Purchase_Sell || 0;
        const newPrice = currentPrice + additionPrice;

        return {
          ...p,
          Purchase_Sell: newPrice,
          hasOverridePrice: true,
          additions: [
            ...(p.additions || []),
            {
              name: additionModal.additionName,
              price: additionPrice,
            },
          ],
        };
      }
      return p;
    });

    updateActiveBoard({ products: newProducts });

    setAdditionModal({
      show: false,
      productIndex: null,
      productName: "",
      additionName: "",
      additionPrice: "",
    });
  };

  const handleRemoveAddition = (productIndex: number, additionIndex: number) => {
    if (!activeBoard) return;

    const newProducts = activeBoard.products.map((p: any, idx: number) => {
      if (idx === productIndex) {
        const additionToRemove = p.additions[additionIndex];
        const newPrice = (p.Purchase_Sell || 0) - additionToRemove.price;
        const updatedAdditions = p.additions.filter(
          (_: any, addIdx: number) => addIdx !== additionIndex
        );

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

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;

    setIsValidatingDiscount(true);
    try {
      const discountsRef = collection(db, "Discount");
      const q = firestoreQuery(
        discountsRef,
        where("code", "==", discountCode.trim())
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        const discountData = firstDoc ? firstDoc.data() : undefined;
        if (discountData) setAppliedDiscount(discountData);
      } else {
        alert("Código de descuento no válido");
        setDiscountCode("");
      }
    } catch (error) {
      console.error("Error applying discount:", error);
      alert("Error al aplicar el descuento");
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
  };

  if (isProductsLoading) {
    return (
      <PageLayout pageTitle="Factura">
        <p>Cargando datos de la tienda...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Factura">
      <CustomModal
        show={Boolean(modalConfig.show)}
        isLoading={modalConfig.isLoading}
        message={modalConfig.message}
        variant={modalConfig.variant ?? "success"}
        title={modalConfig.title}
        showPrintButton={modalConfig.showPrintButton}
        invoiceDataForPrint={modalConfig.invoiceDataForPrint}
        onConfirm={modalConfig.onConfirm ?? undefined}
        onHide={() => {
          if (modalConfig.onConfirm) modalConfig.onConfirm();
          setModalConfig({ show: false, onConfirm: null });
        }}
        onPrintRequest={(invoiceData) => {
          if (modalConfig.onConfirm) modalConfig.onConfirm();
          setInvoiceToPrint(invoiceData);
          setModalConfig({ show: false, onConfirm: null });
        }}
      />

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
                  checked={paymentMethod === "cash"}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value as "cash");
                    setCashAmountPaid("");
                    setSelectedBills({});
                  }}
                />
                <span className="payment-option-text">Efectivo</span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="transfer"
                  checked={paymentMethod === "transfer"}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value as "transfer");
                    setCashAmountPaid("");
                  }}
                />
                <span className="payment-option-text">Transferencia</span>
              </label>
            </div>

            {paymentMethod === "cash" && (
              <div className="cash-amount-section">
                <label htmlFor="cashAmount" className="cash-amount-label">
                  Monto pagado por el cliente:
                </label>

                <div className="bill-cards-container">
                  <div className="bill-cards-grid">
                    {[2000, 5000, 10000, 20000, 50000, 100000].map((billValue) => {
                      const count = selectedBills[billValue] || 0;
                      return (
                        <button
                          key={billValue}
                          type="button"
                          className={`bill-card ${count > 0 ? "selected" : ""}`}
                          onClick={() => {
                            const newCount = (selectedBills[billValue] || 0) + 1;
                            const updatedBills = {
                              ...selectedBills,
                              [billValue]: newCount,
                            };
                            setSelectedBills(updatedBills);

                            const billsTotal = Object.entries(updatedBills).reduce(
                              (sum, [value, c]) =>
                                sum + Number(value) * (c as number),
                              0
                            );
                            setCashAmountPaid(billsTotal.toString());
                          }}
                        >
                          <span className="bill-value">
                            ${billValue.toLocaleString()}
                          </span>
                          {count > 0 && (
                            <span className="bill-count">x{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {Object.values(selectedBills).some((count) => count > 0) && (
                    <button
                      type="button"
                      className="clear-bills-btn"
                      onClick={() => {
                        const billsTotal = Object.entries(selectedBills).reduce(
                          (sum, [value, c]) =>
                            sum + Number(value) * (c as number),
                          0
                        );

                        setSelectedBills({});

                        const currentAmount = cashAmountPaid
                          ? Number(cashAmountPaid)
                          : 0;
                        if (Math.abs(currentAmount - billsTotal) < 0.01) {
                          setCashAmountPaid("");
                        }
                      }}
                    >
                      Limpiar billetes
                    </button>
                  )}
                </div>

                <input
                  id="cashAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashAmountPaid}
                  onChange={(e) => {
                    let value = e.target.value;
                    value = value.replace(/[^0-9.]/g, "");
                    const parts = value.split(".");
                    if (parts.length > 2) {
                      value = parts[0] + "." + parts.slice(1).join("");
                    }
                    setCashAmountPaid(value);
                  }}
                  placeholder={`Total: $${totals.total.toLocaleString()}`}
                  className="cash-amount-input"
                  autoFocus
                />
                {cashAmountPaid &&
                  !isNaN(Number(cashAmountPaid)) &&
                  Number(cashAmountPaid) > 0 && (
                    <>
                      {Number(cashAmountPaid) >= totals.total ? (
                        <div className="change-calculation">
                          <span className="change-label">Cambio a entregar:</span>
                          <span className="change-amount">
                            $
                            {(
                              Number(cashAmountPaid) - totals.total
                            ).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="change-warning">
                          Monto insuficiente. Faltan: $
                          {(totals.total - Number(cashAmountPaid)).toLocaleString()}
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
                disabled={
                  paymentMethod === "cash" &&
                  (!cashAmountPaid ||
                    isNaN(Number(cashAmountPaid)) ||
                    Number(cashAmountPaid) < totals.total)
                }
              >
                Confirmar Pago
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setCashAmountPaid("");
                  setSelectedBills({});
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
          <div className="tables-column">
            <h2 className="column-title">Mesas</h2>
            <div className="tables-container">
              {Array.from({ length: 6 }, (_, index) => {
                const tableNumber = index + 1;
                const board = boards.find((b) => {
                  const match = b.name.match(/Mesa\s*(\d+)/i);
                  return match && parseInt(match[1], 10) === tableNumber;
                });

                if (board) {
                  const boardTotal = board.products.reduce(
                    (sum: number, p: any) =>
                      sum + (p.Purchase_Sell || 0) * p.quantity,
                    0
                  );
                  return (
                    <div
                      key={board.firestoreId}
                      className={`table-card ${
                        board.firestoreId === activeBoardId ? "active" : ""
                      }`}
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
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="table-status active-status">
                        <span className="status-badge active">Activa</span>
                      </div>
                      <div className="table-info">
                        <span className="table-total">
                          ${boardTotal.toFixed(2)}
                        </span>
                        <span className="table-items">
                          {board.products.length} productos
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`table-slot-${tableNumber}`}
                    className="table-card inactive"
                    onClick={() => handleAddBoard(tableNumber)}
                  >
                    <div className="table-header">
                      <span className="table-name">Mesa {tableNumber}</span>
                    </div>
                    <div className="table-status inactive-status">
                      <span className="status-badge inactive">No activa</span>
                    </div>
                    <div className="table-info">
                      <span className="table-placeholder">
                        Haz clic para abrir
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="products-column">
            <h2 className="column-title">Productos</h2>
            {activeBoard ? (
              <div className="products-section">
                <div className="search-controls">
                  <div className="search-mode-selector">
                    <button
                      className={`mode-btn ${
                        searchMode === "name" ? "active" : ""
                      }`}
                      onClick={() => handleSearchModeChange("name")}
                    >
                      Por Nombre
                    </button>
                    <button
                      className={`mode-btn ${
                        searchMode === "category" ? "active" : ""
                      }`}
                      onClick={() => handleSearchModeChange("category")}
                    >
                      Por Categoría
                    </button>
                  </div>

                  {searchMode === "name" && (
                    <div
                      className="search-input-container"
                      ref={searchContainerRef}
                    >
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={query}
                        onChange={(e) => {
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
                              className={`search-result-item ${
                                highlightedIndex === idx ? "highlighted" : ""
                              }`}
                              onClick={() => handleProductSelect(p)}
                            >
                              <span className="result-name">{p.Name}</span>
                              <span className="result-price">
                                ${p.Purchase_Sell || 0}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {query.length > 0 &&
                        filtered.length === 0 &&
                        !isProductsLoading && (
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

                  {searchMode === "category" && (
                    <div className="categories-grid">
                      {categories.map((category) => (
                        <div
                          key={category}
                          className="category-item"
                          onClick={() => handleCategorySelect(category)}
                        >
                          <span className="category-name">{category}</span>
                          <span className="category-count">
                            {
                              allProducts.filter(
                                (p) => p.Category === category
                              ).length
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

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
                        {categoryProducts.map((product: any) => (
                          <div
                            key={product.id}
                            className="product-item"
                            onClick={() => handleProductSelect(product)}
                          >
                            <div className="product-item-header">
                              <span className="product-item-name">
                                {product.Name}
                              </span>
                              <span className="product-item-price">
                                ${product.Purchase_Sell || 0}
                              </span>
                            </div>
                            <div className="product-item-details">
                              {product.Brand && (
                                <span className="product-item-brand">
                                  {product.Brand}
                                </span>
                              )}
                              <span
                                className={`product-item-stock ${
                                  product.Stock_Current <=
                                  (product.Stock_Minimum || 0)
                                    ? "low-stock"
                                    : ""
                                }`}
                              >
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

          <div className="invoice-column">
            <h2 className="column-title">Factura</h2>
            {activeBoard ? (
              <div className="invoice-details">
                <div className="invoice-header">
                  <h3 className="invoice-table-name">{activeBoard.name}</h3>
                  <span className="invoice-items-count">
                    {activeBoard.products.length} productos
                  </span>
                </div>

                <div className="invoice-items">
                  {activeBoard.products.map((p: any, idx: number) => (
                    <div key={p.id || idx} className="invoice-item">
                      <div className="item-main">
                        <div className="item-info">
                          <span className="item-name">{p.Name}</span>
                          {!p.isCustom &&
                            p.Stock_Current !== undefined && (
                              <span
                                className={`item-stock ${
                                  p.Stock_Current <= (p.Stock_Minimum || 0)
                                    ? "low-stock"
                                    : ""
                                }`}
                              >
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
                              max={
                                !p.isCustom && p.Stock_Current !== undefined
                                  ? p.Stock_Current
                                  : undefined
                              }
                              value={p.quantity}
                              onChange={(e) =>
                                handleQuantityChange(idx, e.target.value)
                              }
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
                              onChange={(e) =>
                                handlePriceChange(idx, e.target.value)
                              }
                              className="price-input"
                            />
                          </div>
                          <span className="item-total">
                            ${(p.Purchase_Sell * p.quantity).toFixed(2)}
                          </span>
                        </div>
                        <div className="item-actions">
                          <button
                            className="addition-btn"
                            onClick={() => handleShowAdditionModal(idx)}
                            title="Agregar adición"
                          >
                            +
                          </button>
                          <button
                            className="remove-btn"
                            onClick={() => handleRemoveProduct(idx)}
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {p.additions && p.additions.length > 0 && (
                        <div className="item-additions">
                          {p.additions.map((addition: any, addIdx: number) => (
                            <div key={addIdx} className="addition-item">
                              <span className="addition-name">
                                {addition.name}
                              </span>
                              <span className="addition-price">
                                +${addition.price.toFixed(2)}
                              </span>
                              <button
                                className="remove-addition-btn"
                                onClick={() =>
                                  handleRemoveAddition(idx, addIdx)
                                }
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

                  {activeBoard.products.length > 0 && (
                    <div className="invoice-footer-inline">
                      <div className="discount-section">
                        <label
                          htmlFor="discount-code"
                          className="discount-label"
                        >
                          Código de descuento:
                        </label>
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
                                disabled={
                                  !discountCode.trim() || isValidatingDiscount
                                }
                              >
                                {isValidatingDiscount
                                  ? "Validando..."
                                  : "Aplicar"}
                              </button>
                            </>
                          ) : (
                            <div className="applied-discount">
                              <span className="discount-name">
                                Descuento aplicado ({appliedDiscount.percentaje}
                                %)
                              </span>
                              <button
                                className="remove-discount-btn"
                                onClick={handleRemoveDiscount}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="invoice-totals">
                        <div className="total-row">
                          <span className="total-label">Subtotal:</span>
                          <span className="total-amount">
                            ${totals.subtotal.toFixed(2)}
                          </span>
                        </div>
                        {appliedDiscount && (
                          <div className="total-row discount-row">
                            <span className="total-label">Descuento:</span>
                            <span className="total-amount discount-amount">
                              -${totals.discount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="total-row final-total">
                          <span className="total-label">Total:</span>
                          <span className="total-amount final-amount">
                            ${totals.total.toFixed(2)}
                          </span>
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

                {activeBoard.products.length === 0 && (
                  <div className="empty-invoice-state">
                    <p>No hay productos en esta mesa</p>
                    <p className="empty-state-hint">
                      Agrega productos desde la columna de productos
                    </p>
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

      {customItem.showForm && (
        <div className="custom-item-modal-overlay">
          <div className="custom-item-form">
            <h3>Añadir Producto Personalizado</h3>
            <input
              type="text"
              value={customItem.name}
              onChange={(e) =>
                setCustomItem({ ...customItem, name: e.target.value })
              }
              placeholder="Nombre del producto"
              className="custom-item-input"
            />
            <input
              type="number"
              value={customItem.price}
              onChange={(e) =>
                setCustomItem({ ...customItem, price: e.target.value })
              }
              placeholder="Precio"
              className="custom-item-input"
            />
            <div className="custom-item-actions">
              <button
                onClick={handleAddCustomItem}
                className="custom-item-btn add"
              >
                Agregar
              </button>
              <button
                onClick={() =>
                  setCustomItem({ showForm: false, name: "", price: "" })
                }
                className="custom-item-btn cancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {additionModal.show && (
        <div className="custom-item-modal-overlay">
          <div className="custom-item-form">
            <h3>Agregar Adición a {additionModal.productName}</h3>
            <input
              type="text"
              value={additionModal.additionName}
              onChange={(e) =>
                setAdditionModal({
                  ...additionModal,
                  additionName: e.target.value,
                })
              }
              placeholder="Nombre de la adición (ej: Alcohol, Leche extra)"
              className="custom-item-input"
            />
            <input
              type="number"
              value={additionModal.additionPrice}
              onChange={(e) =>
                setAdditionModal({
                  ...additionModal,
                  additionPrice: e.target.value,
                })
              }
              placeholder="Precio adicional"
              className="custom-item-input"
              min="0"
              step="0.01"
            />
            <div className="custom-item-actions">
              <button
                onClick={handleAddAddition}
                className="custom-item-btn add"
              >
                Agregar Adición
              </button>
              <button
                onClick={() =>
                  setAdditionModal({
                    show: false,
                    productIndex: null,
                    productName: "",
                    additionName: "",
                    additionPrice: "",
                  })
                }
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

