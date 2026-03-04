/**
 * Sends Telegram notifications via your Vercel API route (/api/sendTelegram).
 * Token and chatId live only on the server; frontend sends text + Bearer secret.
 */

import { getColombiaDateString } from "../utils/colombiaTime";

const API_BASE = typeof import.meta.env.VITE_API_BASE_URL === "string"
  ? import.meta.env.VITE_API_BASE_URL
  : "";

export async function sendTelegramText(text: string): Promise<void> {
  const secret = import.meta.env.VITE_INTERNAL_SECRET;
  const res = await fetch(`${API_BASE}/api/sendTelegram`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Failed to send Telegram message");
  }
}

export async function sendPurchaseNotification(params: {
  boardName?: string;
  total: number;
  date?: string;
  paymentMethod?: string;
  cashAmountPaid?: number;
  cashChange?: number;
}): Promise<void> {
  const dateStr = params.date ?? getColombiaDateString();
  let methodLine: string;
  if (params.paymentMethod === "transfer") {
    methodLine = "Método: Transferencia";
  } else {
    const paid = params.cashAmountPaid != null ? `Pagado: $${params.cashAmountPaid.toFixed(2)}` : "";
    const change = params.cashChange != null ? `Cambio: $${params.cashChange.toFixed(2)}` : "";
    methodLine = ["Método: Efectivo", paid, change].filter(Boolean).join(" · ");
  }
  const text =
    `🛒 Nueva compra — $${params.total.toFixed(2)}\n` +
    `Mesa: ${params.boardName ?? "N/A"}\n` +
    `Fecha: ${dateStr}\n` +
    methodLine;
  await sendTelegramText(text);
}

export type LowStockItem = { name: string; current: number; minimum: number };

export async function sendLowStockNotification(products: LowStockItem[]): Promise<void> {
  if (products.length === 0) return;
  const lines = products.map(
    (p) => `• ${p.name}: ${p.current} en stock (mínimo ${p.minimum})`
  );
  const text = `Stock bajo\n${lines.join("\n")}`;
  await sendTelegramText(text);
}

export type DaySummaryInvoiceForTelegram = {
  id: string;
  total: number;
  paymentMethod?: string;
  time?: string;
  productLines?: string[];
};

export async function sendDaySummaryNotification(params: {
  dateLabel: string;
  totalIncome: number;
  totalCash: number;
  totalTransfer: number;
  invoiceCount: number;
  invoices: DaySummaryInvoiceForTelegram[];
}): Promise<void> {
  const { dateLabel, totalIncome, totalCash, totalTransfer, invoiceCount, invoices } = params;
  let text =
    `Día cerrado — ${dateLabel}\n` +
    `Total vendido: $${totalIncome.toFixed(2)}\n` +
    `Efectivo: $${totalCash.toFixed(2)} · Transferencias: $${totalTransfer.toFixed(2)}\n` +
    `Facturas: ${invoiceCount}\n`;

  if (invoices.length > 0) {
    text += "\n— Detalle por factura —\n";
    invoices.forEach((inv) => {
      const method = (inv.paymentMethod || "cash") === "cash" ? "Efectivo" : "Transferencia";
      text += `\n#${inv.id.slice(0, 8)} · $${inv.total.toFixed(2)} · ${method}`;
      if (inv.time) text += ` · ${inv.time}`;
      text += "\n";
      if (inv.productLines?.length) {
        inv.productLines.forEach((line) => {
          text += `  ${line}\n`;
        });
      }
    });
  }

  await sendTelegramText(text);
}
