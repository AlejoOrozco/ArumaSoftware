import React, { useEffect, useState } from "react";
import { db } from "../../config/firebaseConfig";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import PageLayout from "../../components/common/PageLayout";
import "./CloseDay.css";

const CloseDay = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({
    totalCash: 0,
    totalTransfer: 0,
    totalIncome: 0,
    invoiceCount: 0,
    cashCount: 0,
    transferCount: 0
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, [selectedDate]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Parse selectedDate as UTC
      const [year, month, day] = selectedDate.split('-');
      const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      // Query completed invoices for the selected date
      const q = query(
        collection(db, "Invoice"),
        where("status", "==", "completed"),
        orderBy("completionDate"),
        where("completionDate", ">=", startDate),
        where("completionDate", "<=", endDate)
      );

      const snapshot = await getDocs(q);
      const invoicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setInvoices(invoicesData);
      calculateSummary(invoicesData);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (invoicesData) => {
    let totalCash = 0;
    let totalTransfer = 0;
    let cashCount = 0;
    let transferCount = 0;

    invoicesData.forEach(invoice => {
      // Handle invoices without payment method (legacy data)
      const paymentMethod = invoice.paymentMethod || 'cash'; // Default to cash for old invoices
      
      if (paymentMethod === 'cash') {
        totalCash += invoice.Total || 0;
        cashCount++;
      } else if (paymentMethod === 'transfer') {
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
      transferCount
    });
  };

  // Helper to format the label at the bottom using the selected date string
  const formatDateLabel = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper to handle Firestore Timestamp or string for modal
  const getInvoiceDate = (completionDate) => {
    if (!completionDate) return null;
    if (typeof completionDate.toDate === 'function') {
      return completionDate.toDate();
    }
    return new Date(completionDate);
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateObj) => {
    if (!dateObj) return '';
    return dateObj.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
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

        {/* Date Selector */}
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

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card total">
            <h3>Ingresos Totales</h3>
            <div className="summary-amount">${summary.totalIncome.toFixed(2)}</div>
            <div className="summary-detail">{summary.invoiceCount} facturas</div>
          </div>
          
          <div className="summary-card cash">
            <h3>Efectivo</h3>
            <div className="summary-amount">${summary.totalCash.toFixed(2)}</div>
            <div className="summary-detail">{summary.cashCount} transacciones</div>
          </div>
          
          <div className="summary-card transfer">
            <h3>Transferencias</h3>
            <div className="summary-amount">${summary.totalTransfer.toFixed(2)}</div>
            <div className="summary-detail">{summary.transferCount} transacciones</div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="invoices-section">
          <h2>Facturas del {formatDateLabel(selectedDate)}</h2>
          
          {invoices.length === 0 ? (
            <div className="no-invoices">
              <p>No hay facturas completadas para esta fecha.</p>
            </div>
          ) : (
            <div className="invoices-list">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className={`invoice-item ${invoice.paymentMethod || 'cash'}`}
                  onClick={() => setSelectedInvoice(invoice)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="invoice-header">
                    <span className="invoice-id">Factura #{invoice.id.substring(0, 8)}</span>
                    <span className="invoice-time">{formatTime(getInvoiceDate(invoice.completionDate))}</span>
                  </div>
                  <div className="invoice-details">
                    <div className="invoice-total">${invoice.Total?.toFixed(2)}</div>
                    <div className={`payment-method ${invoice.paymentMethod || 'cash'}`}>
                      {(invoice.paymentMethod || 'cash') === 'cash' ? 'Efectivo' : 'Transferencia'}
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

        {/* Invoice Details Modal */}
        {selectedInvoice && (
          <div className="invoice-modal-overlay" onClick={() => setSelectedInvoice(null)}>
            <div className="invoice-modal" onClick={e => e.stopPropagation()}>
              <button className="invoice-modal-close" onClick={() => setSelectedInvoice(null)}>×</button>
              <h3>Detalles de la Factura</h3>
              <div><b>ID:</b> {selectedInvoice.id}</div>
              <div><b>Fecha:</b> {formatDate(getInvoiceDate(selectedInvoice.completionDate))}</div>
              <div><b>Hora:</b> {formatTime(getInvoiceDate(selectedInvoice.completionDate))}</div>
              <div><b>Total:</b> ${selectedInvoice.Total?.toFixed(2)}</div>
              <div><b>Método de Pago:</b> {(selectedInvoice.paymentMethod || 'cash') === 'cash' ? 'Efectivo' : 'Transferencia'}</div>
              {selectedInvoice.Comment && (
                <div><b>Comentario:</b> {selectedInvoice.Comment}</div>
              )}
              <div><b>Productos:</b>
                {(() => {
                  const productList = selectedInvoice.Products || selectedInvoice.products || [];
                  if (productList.length === 0) {
                    return <div>No hay productos registrados en esta factura.</div>;
                  }
                  // Helper functions for robust display
                  const getProductName = (p) => p.Name || p.name || "Producto";
                  const getProductQuantity = (p) => p.quantity ?? p.Quantity ?? 1;
                  const getProductPrice = (p) =>
                    p.Purchase_Sell ??
                    p.PurchaseSell ??
                    p.price ??
                    (typeof p.Purchase_Sell === "undefined" && typeof p.price === "undefined" ? "" : 0);
                  return (
                    <ul>
                      {productList.map((p, idx) => (
                        <li key={idx}>
                          {getProductName(p)} | Cantidad: {getProductQuantity(p)} | Precio: {getProductPrice(p) !== "" ? `$${Number(getProductPrice(p)).toFixed(2)}` : "N/A"}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Print Button */}
        {invoices.length > 0 && (
          <div className="print-section">
            <button 
              className="print-btn"
              onClick={() => window.print()}
            >
              Imprimir Resumen del Día
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default CloseDay; 