/**
 * Sends Telegram notifications via your Vercel API route (/api/sendTelegram).
 * Token and chatId live only on the server; frontend sends text + Bearer secret.
 */

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
}): Promise<void> {
  const method = params.paymentMethod === "transfer" ? "Transferencia" : "Efectivo";
  const dateStr = params.date ?? new Date().toISOString().slice(0, 10);
  const text = `Nueva compra por $${params.total.toFixed(2)}.\nMesa: ${params.boardName ?? "N/A"}\nFecha: ${dateStr}\nMétodo: ${method}`;
  await sendTelegramText(text);
}

export async function sendDaySummaryNotification(params: {
  dateLabel: string;
  totalIncome: number;
  totalCash: number;
  totalTransfer: number;
  invoiceCount: number;
}): Promise<void> {
  const { dateLabel, totalIncome, totalCash, totalTransfer, invoiceCount } = params;
  const text =
    `Día cerrado — ${dateLabel}\n` +
    `Total vendido: $${totalIncome.toFixed(2)}\n` +
    `Efectivo: $${totalCash.toFixed(2)}\n` +
    `Transferencias: $${totalTransfer.toFixed(2)}\n` +
    `Facturas: ${invoiceCount}`;
  await sendTelegramText(text);
}
