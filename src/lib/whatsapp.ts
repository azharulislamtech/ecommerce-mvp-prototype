// R9.1: WhatsApp updates. The consent text a person agreed to is stored by version
// (whatsapp_subscribers.consent_version). Never edit a published text: add a new version
// and point CURRENT_CONSENT_VERSION at it, so every stored consent keeps its exact wording.
export const CONSENT_TEXTS: Record<string, string> = {
  "wa-2026-11-v1":
    "আমি কেনা সাথীর নতুন পণ্য আর স্টকের খবর WhatsApp-এ পেতে চাই। মাসে সর্বোচ্চ ২–৪টি মেসেজ। যেকোনো সময় \"বন্ধ\" লিখে থামাতে পারব।"
};

export const CURRENT_CONSENT_VERSION = "wa-2026-11-v1";
export const CURRENT_CONSENT_TEXT = CONSENT_TEXTS[CURRENT_CONSENT_VERSION];

export const WHATSAPP_MESSAGES = {
  // The same thank-you for every number, so the form never reveals who is on the list.
  // An opted-out number is never switched back on by the form; the second line says how.
  thanks: "ধন্যবাদ! নতুন খবর এলে WhatsApp-এ জানাব। আগে কখনো বন্ধ করে থাকলে, আবার চালু করতে আমাদের WhatsApp-এ একটা মেসেজ দিন।",
  phone: "সঠিক মোবাইল নম্বর লিখুন, যেমন 01712345678।",
  consent: "খবর পেতে সম্মতির ঘরে টিক দিন।",
  tooMany: "অল্প সময়ে অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
  failed: "যোগ করা যায়নি। আবার চেষ্টা করুন, অথবা ফোন করুন।"
} as const;

export const BROADCAST_REMINDER = "WhatsApp-এর broadcast list-এ নম্বরটা থাকলে সেখান থেকেও বাদ দিন।";
