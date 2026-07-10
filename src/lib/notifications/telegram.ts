import "server-only";

import { cleanEnv } from "@/lib/env";

const TELEGRAM_TIMEOUT_MS = 5000;

// Failures are logged and swallowed: an unreachable Telegram API must never
// block or fail the checkout/review flow that triggered the notification.
export async function sendTelegramNotification(text: string) {
  const botToken = cleanEnv(process.env.TELEGRAM_BOT_TOKEN);
  const chatId = cleanEnv(process.env.TELEGRAM_CHAT_ID);

  if (!botToken || !chatId) {
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS)
    });

    if (!response.ok) {
      console.error("Telegram notification failed with status " + response.status);
    }
  } catch (error) {
    console.error("Telegram notification failed: " + (error instanceof Error ? error.message : String(error)));
  }
}
