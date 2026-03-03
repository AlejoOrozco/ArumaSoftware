import type { VercelRequest, VercelResponse } from "@vercel/node";

const ALLOWED_ORIGINS = [
  "https://www.cafearuma.com",
  "https://cafearuma.com",
  "http://localhost:5173",
];

function setCors(res: VercelResponse, req: VercelRequest) {
  const origin = req.headers.origin;
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCors(res, req);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const internalSecret = process.env.INTERNAL_SECRET;

  if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { text } = req.body as { text?: string };
    const chatId = (req.body as { chatId?: string }).chatId ?? process.env.TELEGRAM_CHAT_ID;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'text'" });
    }

    const token = process.env.TELEGRAM_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "TELEGRAM_TOKEN not configured" });
    }

    if (!chatId) {
      return res.status(400).json({ error: "Missing chatId (send in body or set TELEGRAM_CHAT_ID)" });
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      }
    );

    if (!telegramRes.ok) {
      const err = await telegramRes.text();
      console.error("Telegram API error:", err);
      return res.status(502).json({ error: "Telegram request failed", details: err });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("sendTelegram error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
}
