import { useEffect, useState } from "react";
import { db } from "../../config/firebaseConfig";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import PageLayout from "../../components/common/PageLayout";
import { printUtf8DocumentAsImage, getDaySummaryPrintHtml } from "../../utils/printUtf8";
import { sendDaySummaryNotification } from "../../services/telegramNotification";
import "./CloseDay.css";

type InvoiceRecord = {
  id: string;
  Total?: number;
  paymentMethod?: "cash" | "transfer" | string;
  completionDate?: { toDate?: () => Date } | Date | string | null;
  Comment?: string;
  Products?: InvoiceProductLite[];
  products?: InvoiceProductLite[];
};

type InvoiceProductLite = {
  id?: string;
  Name?: string;
  name?: string;
  quantity?: number;
  Quantity?: number;
  Purchase_Sell?: number;
  PurchaseSell?: number;
  price?: number;
  overridePrice?: number;
  [key: string]: unknown;
};

/** Resolves unit price from product; returns undefined when missing so caller can show N/A or fallback. */
function getProductPrice(p: InvoiceProductLite): number | undefined {
  const value =
    p.Purchase_Sell ??
    p.PurchaseSell ??
    p.price ??
    p.overridePrice;
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

type Summary = {
  totalCash: number;
  totalTransfer: number;
  totalIncome: number;
  invoiceCount: number;
  cashCount: number;
  transferCount: number;
};

const CloseDay = () => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [summary, setSummary] = useState<Summary>({
    totalCash: 0,
    totalTransfer: 0,
    totalIncome: 0,
    invoiceCount: 0,
    cashCount: 0,
    transferCount: 0,
  });
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [selectedDate]);

  const fetchInvoices = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const parts = selectedDate.split("-");
      const year = Number(parts[0] ?? 0);
      const month = Number(parts[1] ?? 1);
      const day = Number(parts[2] ?? 0);
      const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      const [productsSnapshot, invoicesSnapshot] = await Promise.all([
        getDocs(collection(db, "Product")),
        getDocs(
          query(
            collection(db, "Invoice"),
            where("status", "==", "completed"),
            orderBy("completionDate"),
            where("completionDate", ">=", startDate),
            where("completionDate", "<=", endDate)
          )
        ),
      ]);

      const allProductsMap = new Map<string, { Name?: string; Purchase_Sell?: number }>();
      productsSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        allProductsMap.set(docSnap.id, {
          Name: data.Name ?? data.name,
          Purchase_Sell: data.Purchase_Sell ?? data.PurchaseSell ?? data.price,
        });
      });

      const hydrateInvoiceProducts = (items: InvoiceProductLite[]): InvoiceProductLite[] =>
        (items || []).map((p): InvoiceProductLite => {
          const fromDb = p.id ? allProductsMap.get(p.id) : undefined;
          const hydrated = {
            ...p,
            Name: p.Name ?? p.name ?? fromDb?.Name,
            name: p.name ?? p.Name ?? fromDb?.Name,
            Purchase_Sell:
              p.Purchase_Sell ??
              p.PurchaseSell ??
              p.price ??
              p.overridePrice ??
              fromDb?.Purchase_Sell,
            quantity: p.quantity ?? p.Quantity,
            Quantity: p.Quantity ?? p.quantity,
          };
          return hydrated as InvoiceProductLite;
        });

      const invoicesData: InvoiceRecord[] = invoicesSnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<InvoiceRecord, "id">;
        const rawProducts = data.Products ?? data.products ?? [];
        const hydrated = hydrateInvoiceProducts(rawProducts as InvoiceProductLite[]);
        return {
          id: docSnap.id,
          ...data,
          Products: hydrated,
          products: hydrated,
        };
      });

      setInvoices(invoicesData);
      calculateSummary(invoicesData);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (invoicesData: InvoiceRecord[]) => {
    let totalCash = 0;
    let totalTransfer = 0;
    let cashCount = 0;
    let transferCount = 0;

    invoicesData.forEach((invoice) => {
      const paymentMethod = invoice.paymentMethod || "cash";

      if (paymentMethod === "cash") {
        totalCash += invoice.Total || 0;
        cashCount++;
      } else if (paymentMethod === "transfer") {
        totalTransfer += invoice.Total || 0;
        transferCount++;
      }
    });

    setSummary({
      totalCash,
      totalTransfer,
      totalIncome: totalCash + totalTransfer,
      invoiceCount: invoicesData.length,
      cashCount,
      transferCount,
    });
  };

  const formatDateLabel = (dateString: string) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    const year = Number(parts[0] ?? 0);
    const month = Number(parts[1] ?? 1);
    const day = Number(parts[2] ?? 0);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInvoiceDate = (completionDate: { toDate?: () => Date } | Date | string | null): Date | null => {
    if (!completionDate) return null;
    if (typeof completionDate === "object" && completionDate !== null && "toDate" in completionDate && typeof (completionDate as { toDate: () => Date }).toDate === "function") {
      return (completionDate as { toDate: () => Date }).toDate();
    }
    if (typeof completionDate === "string" || completionDate instanceof Date) {
      return new Date(completionDate);
    }
    return null;
  };

  const formatDate = (dateObj: Date | null) => {
    if (!dateObj) return "";
    return dateObj.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateObj: Date | null) => {
    if (!dateObj) return "";
    return dateObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <PageLayout pageTitle="Cerrar Día">
        <div className="close-day-container">
          <div className="loading-message">Cargando datos del día...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Cerrar Día">
      <div className="close-day-container">
        <h1 className="close-day-title">Cerrar Día</h1>
        <p className="close-day-description">
          Revisa el resumen de ingresos del día seleccionado
        </p>

        <div className="date-selector">
          <label htmlFor="date-select">Seleccionar Fecha:</label>
          <input
            type="date"
            id="date-select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>

        <div className="summary-cards">
          <div className="summary-card total">
            <h3>Ingresos Totales</h3>
            <div className="summary-amount">
              ${summary.totalIncome.toFixed(2)}
            </div>
            <div className="summary-detail">
              {summary.invoiceCount} facturas
            </div>
          </div>

          <div className="summary-card cash">
            <h3>Efectivo</h3>
            <div className="summary-amount">
              ${summary.totalCash.toFixed(2)}
            </div>
            <div className="summary-detail">
              {summary.cashCount} transacciones
            </div>
          </div>

          <div className="summary-card transfer">
            <h3>Transferencias</h3>
            <div className="summary-amount">
              ${summary.totalTransfer.toFixed(2)}
            </div>
            <div className="summary-detail">
              {summary.transferCount} transacciones
            </div>
          </div>
        </div>

        <div className="invoices-section">
          <h2>Facturas del {formatDateLabel(selectedDate ?? "")}</h2>

          {invoices.length === 0 ? (
            <div className="no-invoices">
              <p>No hay facturas completadas para esta fecha.</p>
            </div>
          ) : (
            <div className="invoices-list">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className={`invoice-item ${invoice.paymentMethod || "cash"}`}
                  onClick={() => setSelectedInvoice(invoice)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="invoice-header">
                    <span className="invoice-id">
                      Factura #{invoice.id.substring(0, 8)}
                    </span>
                    <span className="invoice-time">
                      {formatTime(getInvoiceDate(invoice.completionDate ?? null))}
                    </span>
                  </div>
                  <div className="invoice-details">
                    <div className="invoice-total">
                      ${invoice.Total?.toFixed(2)}
                    </div>
                    <div
                      className={`payment-method ${
                        invoice.paymentMethod || "cash"
                      }`}
                    >
                      {(invoice.paymentMethod || "cash") === "cash"
                        ? "Efectivo"
                        : "Transferencia"}
                    </div>
                  </div>
                  {invoice.Comment && (
                    <div className="invoice-comment">
                      <strong>Comentario:</strong> {invoice.Comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedInvoice && (
          <div
            className="invoice-modal-overlay"
            onClick={() => setSelectedInvoice(null)}
          >
            <div
              className="invoice-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="invoice-modal-close"
                onClick={() => setSelectedInvoice(null)}
              >
                ×
              </button>
              <h3>Detalles de la Factura</h3>
              <div>
                <b>ID:</b> {selectedInvoice.id}
              </div>
              <div>
                <b>Fecha:</b>{" "}
                {formatDate(getInvoiceDate(selectedInvoice.completionDate ?? null))}
              </div>
              <div>
                <b>Hora:</b>{" "}
                {formatTime(getInvoiceDate(selectedInvoice.completionDate ?? null))}
              </div>
              <div>
                <b>Total:</b> ${selectedInvoice.Total?.toFixed(2)}
              </div>
              <div>
                <b>Método de Pago:</b>{" "}
                {(selectedInvoice.paymentMethod || "cash") === "cash"
                  ? "Efectivo"
                  : "Transferencia"}
              </div>
              {selectedInvoice.Comment && (
                <div>
                  <b>Comentario:</b> {selectedInvoice.Comment}
                </div>
              )}
              <div>
                <b>Productos:</b>
                {(() => {
                  const productList =
                    selectedInvoice.Products || selectedInvoice.products || [];
                  if (productList.length === 0) {
                    return (
                      <div>No hay productos registrados en esta factura.</div>
                    );
                  }
                  const getProductName = (p: InvoiceProductLite) =>
                    p.Name || p.name || "Producto";
                  const getProductQuantity = (p: InvoiceProductLite) =>
                    p.quantity ?? p.Quantity ?? 1;
                  return (
                    <ul>
                      {productList.map((p: InvoiceProductLite, idx: number) => {
                        const price = getProductPrice(p);
                        const qty = getProductQuantity(p);
                        const lineTotal =
                          price !== undefined ? price * qty : undefined;
                        return (
                          <li key={idx}>
                            {getProductName(p)} | Cantidad: {qty} | Precio:{" "}
                            {price !== undefined
                              ? `$${price.toFixed(2)}`
                              : "N/A"}
                            {lineTotal !== undefined &&
                              ` | Total: $${lineTotal.toFixed(2)}`}
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {invoices.length > 0 && (
          <>
            <div className="print-section">
              <button
                className="print-btn"
                onClick={async () => {
                  const dateLabel = formatDateLabel(selectedDate ?? "");
                  const html = getDaySummaryPrintHtml(
                    summary,
                    invoices,
                    dateLabel,
                    formatTime,
                    (d) =>
                      getInvoiceDate(
                        d as
                          | { toDate?: () => Date }
                          | Date
                          | string
                          | null
                      )
                  );
                  const telegramPayload = {
                    dateLabel,
                    totalIncome: summary.totalIncome,
                    totalCash: summary.totalCash,
                    totalTransfer: summary.totalTransfer,
                    invoiceCount: summary.invoiceCount,
                    invoices: invoices.map((inv) => {
                      const productList = inv.Products ?? inv.products ?? [];
                      const getProductName = (p: InvoiceProductLite) => p.Name ?? p.name ?? "Producto";
                      const getProductQty = (p: InvoiceProductLite) => p.quantity ?? p.Quantity ?? 1;
                      const productLines = productList.map((p: InvoiceProductLite) => {
                        const price = getProductPrice(p);
                        const qty = getProductQty(p);
                        const name = getProductName(p);
                        if (price !== undefined) {
                          return `${name} × ${qty} — $${(price * qty).toFixed(2)}`;
                        }
                        return `${name} × ${qty}`;
                      });
                      const item: import("../../services/telegramNotification").DaySummaryInvoiceForTelegram = {
                        id: inv.id,
                        total: inv.Total ?? 0,
                        time: formatTime(getInvoiceDate(inv.completionDate ?? null)),
                        productLines,
                      };
                      if (inv.paymentMethod != null) item.paymentMethod = inv.paymentMethod;
                      return item;
                    }),
                  };
                  sendDaySummaryNotification(telegramPayload).catch((err) =>
                    console.warn("Telegram day summary failed:", err)
                  );
                  printUtf8DocumentAsImage(html, "Resumen del Día");
                }}
              >
                Imprimir Resumen del Día
              </button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default CloseDay;

