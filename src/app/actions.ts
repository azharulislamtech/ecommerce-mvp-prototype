"use server";

import { CHECKOUT_MESSAGES, INTEREST_MESSAGES, checkoutErrorMessage } from "@/lib/order-copy";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import {
  getPaymentConfigError,
  initiateOnlinePaymentForOrder,
  isOnlinePaymentMethod,
  normalizeCheckoutPaymentMethod
} from "@/lib/payments/payment-service";
import { getCanonicalDistrict } from "@/lib/delivery";
import { cleanEnv } from "@/lib/env";
import { canToggleCategory } from "@/lib/admin/category-admin";
import {
  comingSoonStockError,
  extrasColumns,
  parseProductExtras,
  willGoOnSale,
  type ProductExtras,
  type ProductExtrasField
} from "@/lib/admin/product-fields";
import { sendTelegramNotification } from "@/lib/notifications/telegram";
import { composeOrderNote } from "@/lib/gift";
import { buildOrderAlert } from "@/lib/notifications/order-alert";
import { getSiteUrl } from "@/lib/site";
import { createSupabaseAuthServerClient, requireAdmin } from "@/lib/supabase/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PRODUCT_IMAGE_COUNT = 6;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type ProductField =
  | "name"
  | "slug"
  | "category_id"
  | "price"
  | "discount_price"
  | "stock_quantity"
  | "short_description"
  | "description"
  | "images"
  | ProductExtrasField;

export type ProductFormState = {
  status: "idle" | "error";
  message: string;
  fieldErrors: Partial<Record<ProductField, string>>;
  // Echoed back on error so React's post-action form reset does not wipe the admin's input.
  values?: Record<string, string>;
};

const PRODUCT_TEXT_FIELDS = [
  "name", "slug", "category_id", "status", "price", "discount_price", "stock_quantity", "short_description",
  "description", "is_featured", "availability", "estimated_price", "age_min_months", "age_max_months",
  "problem_tags", "learning_goals", "video_url"
] as const;

function productFormValues(formData: FormData) {
  return Object.fromEntries(PRODUCT_TEXT_FIELDS.map((name) => [name, getText(formData, name)]));
}

type CheckoutField =
  | "cart_items"
  | "customer_name"
  | "customer_phone"
  | "customer_district"
  | "customer_address"
  | "payment_method";

export type CheckoutFormState = {
  status: "idle" | "error";
  message: string;
  fieldErrors: Partial<Record<CheckoutField, string>>;
  // Echoed back on error so React's post-action form reset does not wipe what the customer typed.
  values?: Partial<Record<"customer_name" | "customer_phone" | "customer_address" | "customer_note" | "send_as_gift", string>>;
};

type ProductReviewField = "order_number" | "customer_phone" | "rating" | "title" | "body";

export type ProductReviewFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Partial<Record<ProductReviewField, string>>;
  // Echoed back on error so React's post-action form reset does not wipe what the
  // customer typed (same fix as checkout, R2.9).
  values?: Partial<Record<"order_number" | "customer_phone" | "rating" | "title" | "body", string>>;
};

type CheckoutItemPayload = {
  product_id: string;
  quantity: number;
};

type ProductPayload = {
  name: string;
  slug: string;
  categoryId: string;
  price: number;
  discountPrice: number | null;
  stockQuantity: number;
  shortDescription: string;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
  imageFiles: File[];
  extras: ProductExtras;
};

function loginRedirect(message: string): never {
  redirect(`/admin/login?error=${encodeURIComponent(message)}`);
}

function checkoutFormError(
  message: string,
  fieldErrors: CheckoutFormState["fieldErrors"] = {},
  values?: CheckoutFormState["values"]
): CheckoutFormState {
  return {
    status: "error",
    message,
    fieldErrors,
    ...(values ? { values } : {})
  };
}

function productReviewFormError(
  message: string,
  fieldErrors: ProductReviewFormState["fieldErrors"] = {},
  values?: ProductReviewFormState["values"]
): ProductReviewFormState {
  return {
    status: "error",
    message,
    fieldErrors,
    values
  };
}



function parseCheckoutItems(value: string): CheckoutItemPayload[] | null {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const items = parsed.map((item) => ({
      product_id: String(item.product_id ?? ""),
      quantity: Number(item.quantity ?? 0)
    }));

    if (!items.length || items.length > 30) {
      return null;
    }

    if (items.some((item) => !item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
      return null;
    }

    return items;
  } catch {
    return null;
  }
}

function isValidBangladeshPhone(value: string) {
  return /^(?:\+?88)?01[3-9]\d{8}$/.test(value);
}
function productFormError(
  message: string,
  fieldErrors: ProductFormState["fieldErrors"] = {},
  values?: Record<string, string>
): ProductFormState {
  return {
    status: "error",
    message,
    fieldErrors,
    values
  };
}

function getText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseAmount(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : Number.NaN;
}

function parseStock(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function getProductImageFiles(formData: FormData) {
  return formData.getAll("images").filter(isUploadFile);
}

function getImageExtension(file: File) {
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif"
  };

  return extensionByType[file.type] ?? "jpg";
}

function getStoragePathFromPublicUrl(imageUrl: string) {
  const marker = `/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const path = decodeURIComponent(imageUrl.slice(markerIndex + marker.length));
  return path.startsWith("products/") ? path : null;
}

function parseProductForm(formData: FormData): { payload?: ProductPayload; state?: ProductFormState } {
  const name = getText(formData, "name");
  const rawSlug = getText(formData, "slug");
  const slug = slugify(rawSlug || name);
  const categoryId = getText(formData, "category_id");
  const shortDescription = getText(formData, "short_description");
  const description = getText(formData, "description");
  const price = parseAmount(getText(formData, "price"));
  const discountPrice = parseAmount(getText(formData, "discount_price"));
  const stockQuantity = parseStock(getText(formData, "stock_quantity"));
  const imageFiles = getProductImageFiles(formData);
  const intent = getText(formData, "intent");
  const status = getText(formData, "status");

  const parsedExtras = parseProductExtras((field) => getText(formData, field));
  const fieldErrors: ProductFormState["fieldErrors"] = { ...parsedExtras.errors };

  if (name.length < 2 || name.length > 160) {
    fieldErrors.name = "Product name must be between 2 and 160 characters.";
  }

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fieldErrors.slug = "Use a URL-safe slug such as aurora-wireless-earbuds.";
  }

  if (!categoryId) {
    fieldErrors.category_id = "Choose a category.";
  }

  if (price === null || Number.isNaN(price) || price < 0) {
    fieldErrors.price = "Enter a valid non-negative price.";
  }

  if (discountPrice !== null && (Number.isNaN(discountPrice) || discountPrice < 0)) {
    fieldErrors.discount_price = "Enter a valid non-negative discount price.";
  }

  if (
    price !== null &&
    discountPrice !== null &&
    !Number.isNaN(price) &&
    !Number.isNaN(discountPrice) &&
    discountPrice > price
  ) {
    fieldErrors.discount_price = "Discount price cannot be greater than regular price.";
  }

  if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
    fieldErrors.stock_quantity = "Stock quantity must be a non-negative whole number.";
  }

  if (shortDescription.length < 8 || shortDescription.length > 220) {
    fieldErrors.short_description = "Short description must be between 8 and 220 characters.";
  }

  if (description.length < 20) {
    fieldErrors.description = "Full description must be at least 20 characters.";
  }

  if (imageFiles.length > MAX_PRODUCT_IMAGE_COUNT) {
    fieldErrors.images = `Upload up to ${MAX_PRODUCT_IMAGE_COUNT} images at a time.`;
  }

  for (const file of imageFiles) {
    if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(file.type)) {
      fieldErrors.images = "Only JPEG, PNG, WebP, or AVIF product images are allowed.";
      break;
    }

    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      fieldErrors.images = "Each product image must be 5 MB or smaller.";
      break;
    }
  }

  if (Object.keys(fieldErrors).length > 0 || price === null) {
    return {
      state: productFormError("Please fix the highlighted product fields.", fieldErrors, productFormValues(formData))
    };
  }

  return {
    payload: {
      name,
      slug,
      categoryId,
      price,
      discountPrice,
      stockQuantity,
      shortDescription,
      description,
      isActive: intent === "draft" ? false : status !== "inactive",
      isFeatured: getText(formData, "is_featured") === "on",
      imageFiles,
      extras: parsedExtras.extras
    }
  };
}

// R10.1: a product goes in a sub-category of a new section, never in the section root.
async function productCategoryError(
  supabase: Awaited<ReturnType<typeof createSupabaseAuthServerClient>>,
  categoryId: string
) {
  const { data: category } = await supabase
    .from("categories")
    .select("id, section, parent_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (!category) return "Choose a category.";
  if (category.section && !category.parent_id) return "Choose a sub-category, not the section itself.";
  return undefined;
}

async function ensureUniqueProductSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseAuthServerClient>>,
  slug: string,
  currentProductId?: string
) {
  const { data, error } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();

  if (error) {
    return `Could not verify product slug: ${error.message}`;
  }

  if (data && data.id !== currentProductId) {
    return "Another product already uses this slug.";
  }

  return null;
}

async function uploadProductImages(
  supabase: Awaited<ReturnType<typeof createSupabaseAuthServerClient>>,
  productId: string,
  productName: string,
  imageFiles: File[]
) {
  if (!imageFiles.length) {
    return null;
  }

  const { count, error: countError } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (countError) {
    return `Could not prepare image sort order: ${countError.message}`;
  }

  const nextSortOrder = count ?? 0;

  for (const [index, file] of imageFiles.entries()) {
    const extension = getImageExtension(file);
    const filename = `${Date.now()}-${index}-${slugify(file.name.replace(/\.[^.]+$/, "") || productName)}.${extension}`;
    const storagePath = `products/${productId}/${filename}`;

    const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });

    if (uploadError) {
      return `Could not upload product image: ${uploadError.message}`;
    }

    const { data: publicUrlData } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath);
    const { error: imageError } = await supabase.from("product_images").insert({
      product_id: productId,
      image_url: publicUrlData.publicUrl,
      alt_text: productName,
      sort_order: nextSortOrder + index
    });

    if (imageError) {
      await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([storagePath]);
      return `Could not save product image row: ${imageError.message}`;
    }
  }

  return null;
}

function revalidateProductPaths(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/categories/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  if (slug) {
    revalidatePath(`/products/${slug}`);
  }
}

function redirectToProducts(message: string, type: "notice" | "error" = "notice"): never {
  redirect(`/admin/products?${type}=${encodeURIComponent(message)}`);
}

async function getAppBaseUrl() {
  const configuredBaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) ?? cleanEnv(process.env.APP_BASE_URL);

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("Could not determine the public app URL for payment callbacks.");
  }

  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}
export async function createOrderAction(
  _previousState: CheckoutFormState,
  formData: FormData
): Promise<CheckoutFormState> {
  const customerName = getText(formData, "customer_name");
  const customerPhone = getText(formData, "customer_phone");
  const customerDistrict = getText(formData, "customer_district");
  const canonicalDistrict = getCanonicalDistrict(customerDistrict);
  const customerAddress = getText(formData, "customer_address");
  const typedNote = getText(formData, "customer_note");
  const sendAsGift = getText(formData, "send_as_gift") === "on";
  const values = { customer_name: customerName, customer_phone: customerPhone, customer_address: customerAddress, customer_note: typedNote, send_as_gift: sendAsGift ? "on" : "" };
  // R8.1: the gift choice becomes a fixed first line of the note (no RPC change).
  const customerNote = composeOrderNote(typedNote, sendAsGift);
  if (customerNote.length > 1000) return checkoutFormError(CHECKOUT_MESSAGES.noteTooLong, {}, values);
  const paymentMethod = normalizeCheckoutPaymentMethod(getText(formData, "payment_method"));
  const checkoutItems = parseCheckoutItems(getText(formData, "cart_items"));
  const fieldErrors: CheckoutFormState["fieldErrors"] = {};
  const idempotencyKey = getText(formData, "idempotency_key");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return checkoutFormError(CHECKOUT_MESSAGES.refresh, {}, values);
  }
  let onlinePaymentBaseUrl: string | null = null;

  if (!checkoutItems) {
    fieldErrors.cart_items = CHECKOUT_MESSAGES.cartInvalid;
  }

  if (!paymentMethod) {
    fieldErrors.payment_method = CHECKOUT_MESSAGES.paymentMethod;
  }

  if (customerName.length < 2 || customerName.length > 120) {
    fieldErrors.customer_name = CHECKOUT_MESSAGES.name;
  }

  if (!isValidBangladeshPhone(customerPhone)) {
    fieldErrors.customer_phone = CHECKOUT_MESSAGES.phone;
  }

  if (!canonicalDistrict) {
    fieldErrors.customer_district = CHECKOUT_MESSAGES.district;
  }

  if (customerAddress.length < 8 || customerAddress.length > 500) {
    fieldErrors.customer_address = CHECKOUT_MESSAGES.address;
  }

  if (paymentMethod) {
    const configError = getPaymentConfigError(paymentMethod);

    if (configError) {
      fieldErrors.payment_method = configError;
    }

    if (isOnlinePaymentMethod(paymentMethod) && !configError) {
      try {
        onlinePaymentBaseUrl = await getAppBaseUrl();
      } catch (error) {
        fieldErrors.payment_method =
          error instanceof Error ? error.message : "Could not prepare payment callback URLs.";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !checkoutItems || !paymentMethod) {
    return checkoutFormError(CHECKOUT_MESSAGES.fixFields, fieldErrors, values);
  }

  const supabase = createSupabaseServiceClient();
  const requestHeaders = await headers();
  // The deployment's trusted reverse proxy must overwrite forwarded headers.
  const clientIp = requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { data, error } = await supabase.rpc("create_checkout_order", {
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_customer_district: canonicalDistrict ?? "",
    p_customer_address: customerAddress,
    p_customer_note: customerNote || null,
    p_payment_method: paymentMethod,
    p_items: checkoutItems as unknown as Json,
    p_idempotency_key: idempotencyKey,
    p_request_key: createHash("sha256").update(clientIp).digest("hex")
  });

  if (error) {
    console.error("Checkout rejected", { code: error.code });
    return checkoutFormError(checkoutErrorMessage(error.message), {
      cart_items: CHECKOUT_MESSAGES.reviewCart
    }, values);
  }

  const order = data?.[0];

  if (!order) {
    return checkoutFormError(CHECKOUT_MESSAGES.notCreated, {}, values);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/products");

  const itemCount = checkoutItems.reduce((total, item) => total + item.quantity, 0);
  if (!order.replayed) await sendTelegramNotification(buildOrderAlert({
    orderNumber: order.order_number,
    totalAmount: Number(order.total_amount),
    itemCount,
    paymentMethod,
    district: canonicalDistrict ?? customerDistrict,
    siteUrl: getSiteUrl(),
    isGift: sendAsGift
  }));

  if (isOnlinePaymentMethod(paymentMethod)) {
    if (order.payment_status === "paid") redirect(`/payment/success?t=${encodeURIComponent(order.tracking_token)}`);
    const payment = await initiateOnlinePaymentForOrder(order.order_id, paymentMethod, onlinePaymentBaseUrl!);

    if (!payment.ok) {
      redirect(
        `/payment/failed?order=${encodeURIComponent(order.order_number)}&status=pending&reason=${encodeURIComponent(payment.message)}`
      );
    }

    redirect(payment.redirectUrl);
  }

  redirect(`/payment/success?t=${encodeURIComponent(order.tracking_token)}`);
}

export async function retryPaymentAction() {
  redirect("/checkout");
}

export async function submitProductReviewAction(
  productId: string,
  productSlug: string,
  _previousState: ProductReviewFormState,
  formData: FormData
): Promise<ProductReviewFormState> {
  if (getText(formData, "website")) {
    return productReviewFormError("রিভিউ পাঠানো যায়নি। আবার চেষ্টা করুন।");
  }

  const orderNumber = getText(formData, "order_number").toUpperCase();
  const customerPhone = getText(formData, "customer_phone");
  const rating = Number(getText(formData, "rating"));
  const title = getText(formData, "title");
  const body = getText(formData, "body");
  const values = { order_number: getText(formData, "order_number"), customer_phone: customerPhone, rating: getText(formData, "rating"), title, body };
  const fieldErrors: ProductReviewFormState["fieldErrors"] = {};

  if (!/^[A-Z0-9-]{6,64}$/.test(orderNumber)) {
    fieldErrors.order_number = "অর্ডার নিশ্চিত হওয়ার পেজ বা SMS থেকে অর্ডার নম্বর লিখুন।";
  }

  if (!isValidBangladeshPhone(customerPhone)) {
    fieldErrors.customer_phone = "চেকআউটে দেওয়া মোবাইল নম্বর লিখুন।";
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    fieldErrors.rating = "১ থেকে ৫-এর মধ্যে রেটিং বাছুন।";
  }

  if (title && (title.length < 3 || title.length > 120)) {
    fieldErrors.title = "শিরোনাম ৩ থেকে ১২০ অক্ষরের মধ্যে রাখুন।";
  }

  if (body.length < 20 || body.length > 1500) {
    fieldErrors.body = "রিভিউ ২০ থেকে ১৫০০ অক্ষরের মধ্যে লিখুন।";
  }

  if (Object.keys(fieldErrors).length) {
    return productReviewFormError("লাল চিহ্নিত ঘরগুলো ঠিক করুন।", fieldErrors, values);
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.rpc("submit_verified_product_review", {
    p_product_id: productId,
    p_order_number: orderNumber,
    p_customer_phone: customerPhone,
    p_rating: rating,
    p_title: title || null,
    p_body: body
  });

  if (error) {
    return productReviewFormError(
      "এই পণ্যের কোনো ডেলিভারি হওয়া অর্ডার মেলানো যায়নি। অর্ডার নম্বর আর চেকআউটের মোবাইল নম্বর দেখে আবার চেষ্টা করুন।",
      { order_number: "শুধু এই পণ্যসহ ডেলিভারি হওয়া অর্ডারের রিভিউ দেওয়া যায়।" },
      values
    );
  }

  revalidatePath("/products");
  revalidatePath("/products/" + productSlug);

  await sendTelegramNotification(
    [
      "New review pending approval",
      "Product: /products/" + productSlug,
      "Rating: " + rating + "/5",
      "Order: " + orderNumber,
      "Approve at /admin/reviews"
    ].join("\n")
  );

  return {
    status: "success",
    message: "ধন্যবাদ। আপনার রিভিউ পাওয়া গেছে, যাচাইয়ের পরে দেখানো হবে।",
    fieldErrors: {}
  };
}

export async function moderateProductReviewAction(formData: FormData) {
  await requireAdmin();

  const reviewId = getText(formData, "review_id");
  const nextStatus = getText(formData, "status");

  if (!reviewId || !["approved", "rejected"].includes(nextStatus)) {
    redirect("/admin/reviews?error=" + encodeURIComponent("Invalid review update."));
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data: review, error: reviewError } = await supabase
    .from("product_reviews")
    .select("product_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (reviewError || !review) {
    redirect("/admin/reviews?error=" + encodeURIComponent("Review was not found."));
  }

  const { data: product } = await supabase.from("products").select("slug").eq("id", review.product_id).maybeSingle();
  const { error: updateError } = await supabase
    .from("product_reviews")
    .update({ status: nextStatus as "approved" | "rejected", moderated_at: new Date().toISOString() })
    .eq("id", reviewId);

  if (updateError) {
    redirect("/admin/reviews?error=" + encodeURIComponent("Could not update the review."));
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/products");

  if (product?.slug) {
    revalidatePath("/products/" + product.slug);
  }

  redirect(
    "/admin/reviews?notice=" +
      encodeURIComponent(nextStatus === "approved" ? "Review approved and published." : "Review rejected.")
  );
}


export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    loginRedirect("Email and password are required.");
  }

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginRedirect("Invalid admin email or password.");
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  if (adminError || !isAdmin) {
    await supabase.auth.signOut();
    loginRedirect("This account is not authorized for admin access.");
  }

  redirect("/admin");
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireAdmin();

  const orderNumber = getText(formData, "order_number");
  const orderStatus = getText(formData, "order_status");
  const paymentStatus = getText(formData, "payment_status");
  const validOrderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  const validPaymentStatuses = ["pending", "paid", "failed", "cancelled", "refunded"];

  if (!orderNumber || !validOrderStatuses.includes(orderStatus) || !validPaymentStatuses.includes(paymentStatus)) {
    redirect(`/admin/orders/${encodeURIComponent(orderNumber || "")}?error=${encodeURIComponent("Invalid order status update.")}`);
  }

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.rpc("update_admin_order", {
    p_order_number: orderNumber, p_order_status: orderStatus, p_payment_status: paymentStatus
  });

  if (error) {
    redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?error=${encodeURIComponent(`Could not update order: ${error.message}`)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/track-order");
  revalidatePath("/products", "layout");
  revalidatePath("/");
  revalidatePath("/payment/success");
  redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?notice=${encodeURIComponent("Order status updated.")}`);
}
export async function adminLogoutAction() {
  const supabase = await createSupabaseAuthServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function reconcileCancelledStockAction(formData: FormData) {
  await requireAdmin();
  const orderNumber = getText(formData, "order_number");
  const inventoryState = getText(formData, "inventory_state");
  const confirmed = getText(formData, "receipt_confirmed") === "yes";
  const path = `/admin/orders/${encodeURIComponent(orderNumber)}`;
  if (!orderNumber || !confirmed || !["returned", "already-restocked"].includes(inventoryState)) {
    redirect(`${path}?error=${encodeURIComponent("Confirm that all returned items are physically received and sellable.")}`);
  }
  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.rpc("reconcile_cancelled_stock", {
    p_order_number: orderNumber, p_already_restocked: inventoryState === "already-restocked"
  });
  if (error) redirect(`${path}?error=${encodeURIComponent("Could not reconcile cancelled inventory. Please check the order and try again.")}`);
  revalidatePath(path);
  revalidateProductPaths();
  revalidatePath("/products/[slug]", "page");
  redirect(`${path}?notice=${encodeURIComponent("Physical inventory confirmed. Repeated saves will not add stock again.")}`);
}

export async function createProductAction(
  _previousState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);

  if (parsed.state || !parsed.payload) {
    return parsed.state ?? productFormError("Could not read product form data.");
  }

  const supabase = await createSupabaseAuthServerClient();
  const values = productFormValues(formData);
  const duplicateSlugMessage = await ensureUniqueProductSlug(supabase, parsed.payload.slug);
  const categoryMessage = await productCategoryError(supabase, parsed.payload.categoryId);
  const stockMessage = comingSoonStockError(parsed.payload.extras.availability, parsed.payload.stockQuantity, null);

  if (duplicateSlugMessage || categoryMessage || stockMessage) {
    return productFormError("Please fix the highlighted product fields.", {
      slug: duplicateSlugMessage ?? undefined,
      category_id: categoryMessage,
      stock_quantity: stockMessage
    }, values);
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      category_id: parsed.payload.categoryId,
      name: parsed.payload.name,
      slug: parsed.payload.slug,
      short_description: parsed.payload.shortDescription,
      description: parsed.payload.description,
      price: parsed.payload.price,
      discount_price: parsed.payload.discountPrice,
      stock_quantity: parsed.payload.stockQuantity,
      is_active: parsed.payload.isActive,
      is_featured: parsed.payload.isFeatured,
      ...extrasColumns(parsed.payload.extras, null)
    })
    .select("id, slug")
    .single();

  if (error) {
    return productFormError(`Could not create product: ${error.message}`, {}, values);
  }

  const imageError = await uploadProductImages(
    supabase,
    product.id,
    parsed.payload.name,
    parsed.payload.imageFiles
  );

  revalidateProductPaths(product.slug);

  if (imageError) {
    redirect(`/admin/products/${product.id}/edit?error=${encodeURIComponent(imageError)}`);
  }

  redirectToProducts("Product created successfully.");
}

export async function updateProductAction(
  productId: string,
  _previousState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);

  if (parsed.state || !parsed.payload) {
    return parsed.state ?? productFormError("Could not read product form data.");
  }

  const supabase = await createSupabaseAuthServerClient();
  const values = productFormValues(formData);
  const { data: existingProduct } = await supabase
    .from("products")
    .select("slug, availability")
    .eq("id", productId)
    .maybeSingle();
  // Trust the stored availability, not the form, when deciding what to write.
  const previousAvailability = existingProduct?.availability ?? null;
  const duplicateSlugMessage = await ensureUniqueProductSlug(supabase, parsed.payload.slug, productId);
  const categoryMessage = await productCategoryError(supabase, parsed.payload.categoryId);
  const stockMessage = comingSoonStockError(
    parsed.payload.extras.availability,
    parsed.payload.stockQuantity,
    previousAvailability
  );

  if (duplicateSlugMessage || categoryMessage || stockMessage) {
    return productFormError("Please fix the highlighted product fields.", {
      slug: duplicateSlugMessage ?? undefined,
      category_id: categoryMessage,
      stock_quantity: stockMessage
    }, values);
  }
  const { error } = await supabase
    .from("products")
    .update({
      category_id: parsed.payload.categoryId,
      name: parsed.payload.name,
      slug: parsed.payload.slug,
      short_description: parsed.payload.shortDescription,
      description: parsed.payload.description,
      price: parsed.payload.price,
      discount_price: parsed.payload.discountPrice,
      stock_quantity: parsed.payload.stockQuantity,
      is_active: parsed.payload.isActive,
      is_featured: parsed.payload.isFeatured,
      ...extrasColumns(parsed.payload.extras, previousAvailability)
    })
    .eq("id", productId);

  if (error) {
    return productFormError(`Could not update product: ${error.message}`, {}, values);
  }

  const imageError = await uploadProductImages(
    supabase,
    productId,
    parsed.payload.name,
    parsed.payload.imageFiles
  );

  revalidateProductPaths(existingProduct?.slug);
  revalidateProductPaths(parsed.payload.slug);

  if (imageError) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(imageError)}`);
  }

  const updatedNotice = willGoOnSale(parsed.payload.extras.availability, parsed.payload.stockQuantity, previousAvailability)
    ? "Product updated. Stock was added, so it is now Available (the coming-soon badge is removed)."
    : "Product updated successfully.";
  redirect(`/admin/products?notice=${encodeURIComponent(updatedNotice)}`);
}

export type InterestFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Partial<Record<"customer_phone" | "customer_name" | "quantity", string>>;
  values?: Partial<Record<"customer_phone" | "customer_name" | "quantity", string>>;
};

// R7.1: "আগ্রহ জানান" on a coming-soon product. It records interest only: no order, no money
// (guideline §৩.৩). The same thank-you shows whether or not this number already asked, so
// the form never reveals who is on the list.
export async function submitInterestAction(
  productId: string,
  _previousState: InterestFormState,
  formData: FormData
): Promise<InterestFormState> {
  const thanks: InterestFormState = { status: "success", message: INTEREST_MESSAGES.thanks, fieldErrors: {} };
  if (getText(formData, "website")) return thanks;

  const phone = getText(formData, "customer_phone");
  const name = getText(formData, "customer_name");
  const quantityText = getText(formData, "quantity");
  const values = { customer_phone: phone, customer_name: name, quantity: quantityText };
  const fieldErrors: InterestFormState["fieldErrors"] = {};
  const quantity = quantityText ? Number(quantityText) : null;

  if (!isValidBangladeshPhone(phone)) fieldErrors.customer_phone = INTEREST_MESSAGES.phone;
  if (name.length > 80) fieldErrors.customer_name = INTEREST_MESSAGES.name;
  if (quantity !== null && (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)) fieldErrors.quantity = INTEREST_MESSAGES.quantity;
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: INTEREST_MESSAGES.fix, fieldErrors, values };
  }

  const requestHeaders = await headers();
  const clientIp = requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.rpc("submit_product_interest", {
    p_product_id: productId,
    p_phone: phone,
    p_customer_name: name || null,
    p_quantity: quantity,
    p_request_key: createHash("sha256").update(clientIp).digest("hex")
  });

  if (error) {
    const text = error.message ?? "";
    const message = /Too many requests/i.test(text) ? INTEREST_MESSAGES.tooMany
      : /not taking interest/i.test(text) ? INTEREST_MESSAGES.closed
        : /mobile number/i.test(text) ? INTEREST_MESSAGES.phone
          : INTEREST_MESSAGES.failed;
    return { status: "error", message, fieldErrors: {}, values };
  }

  return thanks;
}

const INTEREST_STATUSES = ["new", "contacted", "purchased", "not_interested"] as const;
const BROADCAST_REMINDER = "WhatsApp-এর broadcast list-এ নম্বরটা থাকলে সেখান থেকেও বাদ দিন।";

// R7.2: the owner updates an interest request. Moving to "contacted" stamps contacted_at once,
// which starts the 30-day deletion clock (R9.2).
export async function updateInterestStatusAction(formData: FormData) {
  await requireAdmin();
  const id = getText(formData, "interest_id");
  const status = getText(formData, "status") as (typeof INTEREST_STATUSES)[number];
  const back = (message: string, kind: "notice" | "error" = "notice") =>
    redirect(`/admin/interest?${kind}=${encodeURIComponent(message)}`);
  if (!id || !INTEREST_STATUSES.includes(status)) back("Invalid interest update.", "error");

  const supabase = await createSupabaseAuthServerClient();
  const { data: current } = await supabase.from("interest_requests").select("contacted_at").eq("id", id).maybeSingle();
  if (!current) back("That interest request no longer exists.", "error");
  const contactedAt = status !== "new" && !current!.contacted_at ? new Date().toISOString() : current!.contacted_at;
  const { data, error } = await supabase
    .from("interest_requests")
    .update({ status, contacted_at: status === "new" ? null : contactedAt })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) back(`Could not update: ${error?.message ?? "no row changed"}`, "error");
  revalidatePath("/admin/interest");
  back("Interest request updated.");
}

// R9.2: delete one interest request on the person's request.
export async function deleteInterestAction(formData: FormData) {
  await requireAdmin();
  const id = getText(formData, "interest_id");
  const back = (message: string, kind: "notice" | "error" = "notice") =>
    redirect(`/admin/interest?${kind}=${encodeURIComponent(message)}`);
  if (!id) back("Invalid delete request.", "error");
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.from("interest_requests").delete().eq("id", id).select("id");
  if (error || !data?.length) back(`Could not delete: ${error?.message ?? "no row deleted"}`, "error");
  revalidatePath("/admin/interest");
  back(`Interest request deleted. ${BROADCAST_REMINDER}`);
}

// R9.2: run every retention rule now (the same function the daily schedule runs).
export async function runDataRetentionAction() {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("run_data_retention", { p_trigger: "admin" });
  if (error) redirect(`/admin/interest?error=${encodeURIComponent(`Retention run failed: ${error.message}`)}`);
  const summary = (data ?? []).map((row) => `${row.rule}: ${row.affected}`).join(", ");
  revalidatePath("/admin/interest");
  redirect(`/admin/interest?notice=${encodeURIComponent(`Retention run finished (${summary}). ${BROADCAST_REMINDER}`)}`);
}

// R10.3: switch a new-section category on or off from the admin. Legacy demo categories
// (no section) are refused: V12 owns them, and its rollback log must stay accurate.
export async function setCategoryActiveAction(formData: FormData) {
  await requireAdmin();

  const categoryId = getText(formData, "category_id");
  const nextActive = getText(formData, "next_active");
  const back = (message: string, kind: "notice" | "error" = "notice") =>
    redirect(`/admin/categories?${kind}=${encodeURIComponent(message)}`);

  if (!categoryId || !["true", "false"].includes(nextActive)) {
    back("Invalid category request.", "error");
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, section")
    .eq("id", categoryId)
    .maybeSingle();

  if (!canToggleCategory(category)) {
    back("Only Kids & Baby and Home Solutions categories can be switched here.", "error");
  }

  // .select() returns the changed row, so an RLS miss (0 rows) cannot look like success.
  const { data: changed, error } = await supabase
    .from("categories")
    .update({ is_active: nextActive === "true" })
    .eq("id", categoryId)
    .select("id");

  if (error || !changed?.length) {
    back(`Could not update the category: ${error?.message ?? "no row changed"}`, "error");
  }

  // Menus, the Kids page, category pages and the sitemap all read categories.
  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
  back(`${category!.name} is now ${nextActive === "true" ? "active" : "inactive"}.`);
}

export async function updateProductStatusAction(formData: FormData) {
  await requireAdmin();

  const productId = getText(formData, "product_id");
  const nextStatus = getText(formData, "next_status");

  if (!productId || !["active", "inactive"].includes(nextStatus)) {
    redirectToProducts("Invalid product status request.", "error");
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data: product, error } = await supabase
    .from("products")
    .update({ is_active: nextStatus === "active" })
    .eq("id", productId)
    .select("slug")
    .single();

  if (error || !product) {
    redirectToProducts(`Could not update product status: ${error?.message ?? "Product was not found."}`, "error");
  }

  revalidateProductPaths(product.slug);
  redirectToProducts(nextStatus === "active" ? "Product restored successfully." : "Product deactivated successfully.");
}

export async function deleteProductImageAction(formData: FormData) {
  await requireAdmin();

  const productId = getText(formData, "product_id");
  const imageId = getText(formData, "image_id");

  if (!productId || !imageId) {
    redirect(`/admin/products/${productId || ""}/edit?error=${encodeURIComponent("Invalid image delete request.")}`);
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data: image, error: loadError } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (loadError || !image) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent("Could not find the product image.")}`);
  }

  const storagePath = getStoragePathFromPublicUrl(image.image_url);

  if (storagePath) {
    const { error: removeError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([storagePath]);

    if (removeError) {
      redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(`Could not remove image file: ${removeError.message}`)}`);
    }
  }

  const { error: deleteError } = await supabase.from("product_images").delete().eq("id", imageId).eq("product_id", productId);

  if (deleteError) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(`Could not delete image row: ${deleteError.message}`)}`);
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${productId}/edit?notice=${encodeURIComponent("Product image removed.")}`);
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();

  const productId = getText(formData, "product_id");

  if (!productId) {
    redirectToProducts("Invalid product delete request.", "error");
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data: product, error: loadError } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();

  if (loadError || !product) {
    redirectToProducts("Could not find the product to delete.", "error");
  }

  const { count, error: countError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (countError) {
    redirectToProducts(`Could not verify product order history: ${countError.message}`, "error");
  }

  if ((count ?? 0) > 0) {
    const { error: deactivateError } = await supabase.from("products").update({ is_active: false }).eq("id", productId);

    if (deactivateError) {
      redirectToProducts(`Product has orders and could not be deactivated: ${deactivateError.message}`, "error");
    }

    revalidateProductPaths(product.slug);
    redirectToProducts("Product has order history, so it was deactivated instead of deleted.");
  }

  const { data: images, error: imageLoadError } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("product_id", productId);

  if (imageLoadError) {
    redirectToProducts(`Could not load product images before delete: ${imageLoadError.message}`, "error");
  }

  const storagePaths = (images ?? [])
    .map((image) => getStoragePathFromPublicUrl(image.image_url))
    .filter((path): path is string => Boolean(path));

  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(storagePaths);

    if (storageError) {
      redirectToProducts(`Could not remove product image files: ${storageError.message}`, "error");
    }
  }

  const { error: deleteError } = await supabase.from("products").delete().eq("id", productId);

  if (deleteError) {
    redirectToProducts(`Could not delete product: ${deleteError.message}`, "error");
  }

  revalidateProductPaths(product.slug);
  redirectToProducts("Product deleted successfully.");
}
