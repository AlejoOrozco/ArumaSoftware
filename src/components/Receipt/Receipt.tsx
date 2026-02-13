import { forwardRef } from "react";
import "./Receipt.css";

export type ReceiptProduct = {
  id?: string;
  Name: string;
  quantity: number;
  Purchase_Sell: number;
};

export type ReceiptInvoice = {
  Products: ReceiptProduct[];
  Total: number;
  Date: string;
  Comment?: string;
  paymentMethod?: string;
};

type ReceiptProps = {
  invoice: ReceiptInvoice | null;
};

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ invoice }, ref) => {
  console.log("[Receipt] Rendering. invoice:", invoice, "ref:", ref);
  if (!invoice) {
    return null;
  }

  const { Products, Total, Date: invoiceDate, Comment, paymentMethod } = invoice;

  return (
    <div className="receipt-container" ref={ref}>
      <div className="receipt-header">
        <h1 className="receipt-shop-name">Aruma Café</h1>
        <p>Gracias por tu compra</p>
      </div>
      <div className="receipt-info">
        <span>Fecha: {new Date(invoiceDate).toLocaleString()}</span>
      </div>
      <table className="receipt-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {Products.map((item, index) => (
            <tr key={item.id || index}>
              <td>{item.Name}</td>
              <td>{item.quantity}</td>
              <td>${item.Purchase_Sell?.toFixed(2)}</td>
              <td>${(item.Purchase_Sell * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-total">
        <strong>TOTAL: ${Total.toFixed(2)}</strong>
      </div>
      {paymentMethod && (
        <div className="receipt-payment">
          <p>
            <strong>Método de Pago:</strong>{" "}
            {paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
          </p>
        </div>
      )}
      {Comment && (
        <div className="receipt-footer">
          <p>
            <strong>Comentario:</strong> {Comment}
          </p>
        </div>
      )}
      <div className="receipt-footer">
        <p>¡Vuelve pronto!</p>
      </div>
    </div>
  );
});

export default Receipt;

