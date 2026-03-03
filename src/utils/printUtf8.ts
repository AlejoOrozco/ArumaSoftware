/**
 * Thermal / ESC-POS friendly print: opens a new window with a full HTML document
 * that declares UTF-8 so the printer receives correct encoding (accents, ñ, etc.).
 * Optionally prints as a raster image so the output matches the preview exactly
 * (no driver text conversion, no encoding issues, borders preserved).
 */

import html2canvas from "html2canvas";

/** 80mm thermal ≈ 48 columns; 58mm ≈ 32. Use 48 for receipt/summary. */
export const THERMAL_COLUMNS_80MM = 48;
export const THERMAL_COLUMNS_58MM = 32;

function truncateToColumns(text: string, maxCols: number): string {
  const s = String(text).trim();
  if (s.length <= maxCols) return s;
  return s.slice(0, maxCols - 1) + "…";
}

const UTF8_HTML_PREFIX = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>__TITLE__</title>
  <style type="text/css">
    body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; color: #000; background: #fff; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>`;

const UTF8_HTML_SUFFIX = `</body>
</html>`;

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

/**
 * Renders the HTML document to a canvas, then opens a new window with only the image
 * and triggers print. The printer receives a bitmap, so output matches the preview
 * (no ESC/POS text conversion, no encoding issues, borders and layout preserved).
 * Preferred for thermal/ESC-POS when the driver would otherwise mangle text/layout.
 */
export function printUtf8DocumentAsImage(
  bodyContent: string,
  documentTitle?: string,
  onAfterPrint?: () => void
): void {
  const title = documentTitle ?? "Document";
  const fullHtml = UTF8_HTML_PREFIX.replace("__TITLE__", escapeHtml(title)) + bodyContent + UTF8_HTML_SUFFIX;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    width: "320px",
    height: "800px",
    border: "none",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    onAfterPrint?.();
    return;
  }
  doc.open();
  doc.write(fullHtml);
  doc.close();

  iframe.onload = () => {
    const body = doc.body;
    if (!body) {
      document.body.removeChild(iframe);
      onAfterPrint?.();
      return;
    }
    const scrollHeight = body.scrollHeight + 40;
    iframe.style.height = `${Math.min(scrollHeight, 2000)}px`;

    const doCapture = () => {
      html2canvas(body, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      })
        .then((canvas) => {
          document.body.removeChild(iframe);
          const dataUrl = canvas.toDataURL("image/png");
          const printWindow = window.open("", "_blank");
          if (!printWindow) {
            console.error("Print: Could not open print window (popup blocked?)");
            onAfterPrint?.();
            return;
          }
          printWindow.document.write(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;"><img src="${dataUrl}" alt="" style="display:block;width:100%;height:auto;" /></body></html>`
          );
          printWindow.document.close();
          const afterPrint = () => {
            printWindow.close();
            onAfterPrint?.();
          };
          printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.onafterprint = afterPrint;
            setTimeout(afterPrint, 500);
          };
        })
        .catch((err) => {
          console.error("Print (image): html2canvas failed", err);
          document.body.removeChild(iframe);
          onAfterPrint?.();
        });
    };
    requestAnimationFrame(() => doCapture());
  };
}

/**
 * Opens a new window, writes a full HTML document with UTF-8 charset and the given body content,
 * then triggers print. Use when the printer/driver handles HTML text well; for thermal ESC/POS
 * that mangles layout/encoding, prefer printUtf8DocumentAsImage.
 */
export function printUtf8Document(
  bodyContent: string,
  documentTitle?: string,
  onAfterPrint?: () => void
): void {
  const title = documentTitle ?? "Document";
  const fullHtml = UTF8_HTML_PREFIX.replace("__TITLE__", escapeHtml(title)) + bodyContent + UTF8_HTML_SUFFIX;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Print: Could not open print window (popup blocked?)");
    onAfterPrint?.();
    return;
  }

  printWindow.document.write(fullHtml);
  printWindow.document.close();

  const afterPrint = () => {
    printWindow.close();
    onAfterPrint?.();
  };

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = afterPrint;
    setTimeout(afterPrint, 500);
  };
}

/** Receipt product for HTML generation */
export type ReceiptProductForPrint = {
  Name?: string;
  name?: string;
  quantity?: number;
  Quantity?: number;
  Purchase_Sell?: number;
  PurchaseSell?: number;
  price?: number;
};

/** Invoice data for receipt HTML generation */
export type ReceiptInvoiceForPrint = {
  Products: ReceiptProductForPrint[];
  Total: number;
  Date: string;
  Comment?: string;
  paymentMethod?: string;
};

/**
 * Returns the body HTML for a receipt (80mm thermal). Use with printUtf8Document or printUtf8DocumentAsImage.
 * Product names and comment are truncated to fit 80mm (~48 columns) so ESC/POS text mode doesn't wrap badly.
 */
export function getReceiptPrintHtml(invoice: ReceiptInvoiceForPrint): string {
  const { Products, Total, Date: invoiceDate, Comment, paymentMethod } = invoice;
  const dateStr = new Date(invoiceDate).toLocaleString("es-ES");

  /** Product name column ~24 chars so table fits 48 cols on 80mm. */
  const NAME_MAX = 24;
  const rows = Products.map((item) => {
    const rawName = item.Name ?? item.name ?? "Producto";
    const name = truncateToColumns(rawName, NAME_MAX);
    const qty = item.quantity ?? item.Quantity ?? 1;
    const price = item.Purchase_Sell ?? item.PurchaseSell ?? item.price ?? 0;
    const lineTotal = price * qty;
    return `<tr><td>${escapeHtml(String(name))}</td><td>${qty}</td><td>$${Number(price).toFixed(2)}</td><td>$${lineTotal.toFixed(2)}</td></tr>`;
  }).join("");

  let html = `
<div style="width:280px;padding:8px;margin:0;">
  <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
    <strong style="font-size:14px;">Aruma Café</strong>
    <p style="margin:4px 0 0 0;font-size:11px;">Gracias por tu compra</p>
  </div>
  <div style="margin-bottom:8px;font-size:11px;">Fecha: ${escapeHtml(dateStr)}</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead>
      <tr><th style="text-align:left;">Producto</th><th style="text-align:center;">Cant.</th><th style="text-align:right;">Precio</th><th style="text-align:right;">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #000;text-align:right;font-size:12px;"><strong>TOTAL: $${Total.toFixed(2)}</strong></div>`;

  if (paymentMethod) {
    const method = paymentMethod === "cash" ? "Efectivo" : "Transferencia";
    html += `<div style="margin-top:6px;padding-top:6px;border-top:1px dotted #000;text-align:center;font-size:11px;"><strong>Método de Pago:</strong> ${escapeHtml(method)}</div>`;
  }
  if (Comment) {
    const commentSafe = truncateToColumns(Comment, THERMAL_COLUMNS_80MM - 2);
    html += `<div style="margin-top:6px;text-align:center;font-size:11px;"><strong>Comentario:</strong> ${escapeHtml(commentSafe)}</div>`;
  }
  html += `<div style="margin-top:8px;text-align:center;font-size:11px;">¡Vuelve pronto!</div></div>`;
  return html;
}

/** Day summary invoice item for HTML generation */
export type DaySummaryInvoiceForPrint = {
  id: string;
  Total?: number;
  paymentMethod?: string;
  completionDate?: unknown;
  Comment?: string;
  Products?: Array<{
    id?: string;
    Name?: string;
    name?: string;
    quantity?: number;
    Quantity?: number;
    Purchase_Sell?: number;
    PurchaseSell?: number;
    price?: number;
    overridePrice?: number;
  }>;
  products?: Array<Record<string, unknown>>;
};

/** Day summary data for HTML generation */
export type DaySummaryForPrint = {
  totalIncome: number;
  totalCash: number;
  totalTransfer: number;
  invoiceCount: number;
  cashCount: number;
  transferCount: number;
};

/**
 * Returns the body HTML for the day summary (thermal). Use with printUtf8Document or printUtf8DocumentAsImage.
 * Text truncated to fit 80mm (~48 columns).
 */
export function getDaySummaryPrintHtml(
  summary: DaySummaryForPrint,
  invoices: DaySummaryInvoiceForPrint[],
  dateLabel: string,
  formatTime: (date: Date | null) => string,
  getInvoiceDate: (d: unknown) => Date | null
): string {
  const dateEsc = escapeHtml(dateLabel);
  let html = `
<div style="padding:0 4px;max-width:80mm;font-size:9px;">
  <h1 style="font-size:11px;margin:0 0 2px 0;text-align:center;">Resumen del Día</h1>
  <p style="font-size:9px;margin-bottom:4px;text-align:center;">${dateEsc}</p>
  <div style="margin-bottom:6px;">
    <div style="border:1px solid #000;padding:3px 4px;text-align:center;margin-bottom:3px;">
      <strong>Ingresos Totales</strong><br><span style="font-size:11px;">$${summary.totalIncome.toFixed(2)}</span><br>${summary.invoiceCount} facturas
    </div>
    <div style="border:1px solid #000;padding:3px 4px;text-align:center;margin-bottom:3px;">
      <strong>Efectivo</strong><br><span style="font-size:11px;">$${summary.totalCash.toFixed(2)}</span><br>${summary.cashCount} transacciones
    </div>
    <div style="border:1px solid #000;padding:3px 4px;text-align:center;margin-bottom:3px;">
      <strong>Transferencias</strong><br><span style="font-size:11px;">$${summary.totalTransfer.toFixed(2)}</span><br>${summary.transferCount} transacciones
    </div>
  </div>
  <h2 style="font-size:10px;margin:4px 0 3px 0;">Facturas del ${dateEsc}</h2>`;

  invoices.forEach((invoice) => {
    const productList = invoice.Products ?? invoice.products ?? [];
    const timeStr = formatTime(getInvoiceDate(invoice.completionDate ?? null));

    html += `<div style="border:1px solid #000;padding:3px 4px;margin-bottom:4px;">`;
    html += `<div>Factura #${escapeHtml(invoice.id.substring(0, 8))} &nbsp; ${escapeHtml(timeStr)}</div>`;
    html += `<div><strong>$${(invoice.Total ?? 0).toFixed(2)}</strong> &nbsp; ${(invoice.paymentMethod || "cash") === "cash" ? "Efectivo" : "Transferencia"}</div>`;
    if (invoice.Comment) {
      const commentSafe = truncateToColumns(invoice.Comment, THERMAL_COLUMNS_80MM - 2);
      html += `<div>Comentario: ${escapeHtml(commentSafe)}</div>`;
    }
    if (productList.length > 0) {
      html += `<div style="margin-top:3px;padding-top:3px;border-top:1px dashed #000;"><strong>Productos:</strong><ul style="margin:1px 0 0 8px;padding:0;">`;
      productList.forEach((p: Record<string, unknown>) => {
        const rawName = (p.Name ?? p.name ?? "Producto") as string;
        const name = truncateToColumns(rawName, 20);
        const qty = Number(p.quantity ?? p.Quantity ?? 1);
        const price = Number(p.Purchase_Sell ?? p.PurchaseSell ?? p.price ?? p.overridePrice ?? 0);
        if (price > 0) {
          html += `<li>${escapeHtml(name)} — Cant: ${qty} × $${price.toFixed(2)} = $${(qty * price).toFixed(2)}</li>`;
        } else {
          html += `<li>${escapeHtml(name)} — Cant: ${qty} — Precio: N/A</li>`;
        }
      });
      html += `</ul></div>`;
    }
    html += `</div>`;
  });

  html += `</div>`;
  return html;
}
