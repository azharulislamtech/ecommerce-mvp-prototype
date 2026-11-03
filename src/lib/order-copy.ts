// Bangla customer-facing copy for cart, checkout, order success and tracking (R2.9).
// Keep wording honest: no promise the system cannot keep.

export const SUPPORT_PHONE_DISPLAY = "০১৭১৭-১২১৮৩৯";
export const SUPPORT_PHONE_TEL = "tel:+8801717121839";

// R2.5: the one return line used everywhere (header, trust cards, product page, policy).
// Never write "৭ দিনে রিটার্ন".
export const RETURN_WINDOW_LINE = "ভাঙা/ভুল/অসম্পূর্ণ পণ্য? ডেলিভারির ৭২ ঘণ্টার মধ্যে জানান";
export const RETURN_POLICY_PATH = "/return-policy";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  confirmed: "নিশ্চিত হয়েছে",
  processing: "প্রস্তুত হচ্ছে",
  shipped: "পাঠানো হয়েছে",
  delivered: "পৌঁছে গেছে",
  cancelled: "বাতিল"
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "পরিশোধ বাকি",
  paid: "পরিশোধিত",
  failed: "ব্যর্থ",
  cancelled: "বাতিল",
  refunded: "টাকা ফেরত দেওয়া হয়েছে"
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function paymentStatusLabel(status: string) {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function itemCountLabel(count: number) {
  return `${count}টি পণ্য`;
}

export function formatBanglaDate(value: string, withTime = true) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("bn-BD", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

export const CHECKOUT_MESSAGES = {
  fixFields: "লাল দাগ দেওয়া ঘরগুলো ঠিক করে আবার চেষ্টা করুন।",
  refresh: "পেজটা রিফ্রেশ করে আবার অর্ডার করুন।",
  noteTooLong: "নোট ১,০০০ অক্ষরের মধ্যে রাখুন।",
  cartInvalid: "কার্ট খালি বা ঠিক নেই। কার্ট দেখে আবার চেষ্টা করুন।",
  paymentMethod: "পেমেন্টের একটা ধরন বেছে নিন।",
  name: "নাম ২ থেকে ১২০ অক্ষরের মধ্যে লিখুন।",
  phone: "সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন, যেমন ০১৭১২০০০০০০।",
  district: "তালিকা থেকে একটা জেলা বেছে নিন।",
  address: "ঠিকানা ৮ থেকে ৫০০ অক্ষরের মধ্যে লিখুন।",
  notCreated: "অর্ডারটা তৈরি হয়নি। আবার চেষ্টা করুন।",
  reviewCart: "কার্টের পণ্য আর পরিমাণ দেখে আবার চেষ্টা করুন।",
  network:
    "ইন্টারনেট সংযোগে সমস্যা হয়েছে, অর্ডার নিশ্চিত হয়নি। সংযোগ দেখে আবার “অর্ডার নিশ্চিত করুন” চাপুন। একই অর্ডার দুবার তৈরি হবে না।"
} as const;

// Maps a database checkout error to a safe Bangla message. Unknown errors never
// leak internal details.
export function checkoutErrorMessage(dbMessage: string | null | undefined) {
  const message = dbMessage ?? "";
  if (message.startsWith("Too many orders")) {
    return "অল্প সময়ে অনেক অর্ডার হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন, অথবা আমাদের ফোন করুন।";
  }
  if (message.startsWith("Checkout details changed")) {
    return "অর্ডারের তথ্য বদলে গেছে। পেজটা রিফ্রেশ করে আবার অর্ডার করুন।";
  }
  if (message.includes("no longer available") || message.startsWith("Insufficient stock")) {
    return "কার্টের কোনো পণ্য এখন পাওয়া যাচ্ছে না, বা যথেষ্ট স্টক নেই। কার্ট দেখে আবার চেষ্টা করুন।";
  }
  return "অর্ডার নেওয়া যায়নি। একটু পরে আবার চেষ্টা করুন, অথবা আমাদের ফোন করুন।";
}
