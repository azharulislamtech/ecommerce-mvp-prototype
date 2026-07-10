"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getPaymentConfigError,
  initiateOnlinePaymentForOrder,
  isOnlinePaymentMethod,
  normalizeCheckoutPaymentMethod
} from "@/lib/payments/payment-service";
import { getCanonicalDistrict } from "@/lib/delivery";
import { cleanEnv } from "@/lib/env";
import { sendTelegramNotification } from "@/lib/notifications/telegram";
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
  | "images";

export type ProductFormState = {
  status: "idle" | "error";
  message: string;
  fieldErrors: Partial<Record<ProductField, string>>;
};

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
};

type ProductReviewField = "order_number" | "customer_phone" | "rating" | "title" | "body";

export type ProductReviewFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Partial<Record<ProductReviewField, string>>;
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
};

function loginRedirect(message: string): never {
  redirect(`/admin/login?error=${encodeURIComponent(message)}`);
}

function checkoutFormError(message: string, fieldErrors: CheckoutFormState["fieldErrors"] = {}): CheckoutFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

function productReviewFormError(
  message: string,
  fieldErrors: ProductReviewFormState["fieldErrors"] = {}
): ProductReviewFormState {
  return {
    status: "error",
    message,
    fieldErrors
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
function productFormError(message: string, fieldErrors: ProductFormState["fieldErrors"] = {}): ProductFormState {
  return {
    status: "error",
    message,
    fieldErrors
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

  const fieldErrors: ProductFormState["fieldErrors"] = {};

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
      state: productFormError("Please fix the highlighted product fields.", fieldErrors)
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
      imageFiles
    }
  };
}

async function ensureUniqueProductSlug(
  supabase: ReturnType<typeof createSupabaseAuthServerClient>,
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
  supabase: ReturnType<typeof createSupabaseAuthServerClient>,
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
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  if (slug) {
    revalidatePath(`/products/${slug}`);
  }
}

function redirectToProducts(message: string, type: "notice" | "error" = "notice"): never {
  redirect(`/admin/products?${type}=${encodeURIComponent(message)}`);
}

function getAppBaseUrl() {
  const configuredBaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) ?? cleanEnv(process.env.APP_BASE_URL);

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  const requestHeaders = headers();
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
  const customerNote = getText(formData, "customer_note");
  const paymentMethod = normalizeCheckoutPaymentMethod(getText(formData, "payment_method"));
  const checkoutItems = parseCheckoutItems(getText(formData, "cart_items"));
  const fieldErrors: CheckoutFormState["fieldErrors"] = {};
  let onlinePaymentBaseUrl: string | null = null;

  if (!checkoutItems) {
    fieldErrors.cart_items = "Your cart is empty or invalid.";
  }

  if (!paymentMethod) {
    fieldErrors.payment_method = "Choose a supported payment method.";
  }

  if (customerName.length < 2 || customerName.length > 120) {
    fieldErrors.customer_name = "Customer name must be between 2 and 120 characters.";
  }

  if (!isValidBangladeshPhone(customerPhone)) {
    fieldErrors.customer_phone = "Enter a valid Bangladesh mobile number.";
  }

  if (!canonicalDistrict) {
    fieldErrors.customer_district = "Choose a valid Bangladesh district.";
  }

  if (customerAddress.length < 8 || customerAddress.length > 500) {
    fieldErrors.customer_address = "Address must be between 8 and 500 characters.";
  }

  if (paymentMethod) {
    const configError = getPaymentConfigError(paymentMethod);

    if (configError) {
      fieldErrors.payment_method = configError;
    }

    if (isOnlinePaymentMethod(paymentMethod) && !configError) {
      try {
        onlinePaymentBaseUrl = getAppBaseUrl();
      } catch (error) {
        fieldErrors.payment_method =
          error instanceof Error ? error.message : "Could not prepare payment callback URLs.";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !checkoutItems || !paymentMethod) {
    return checkoutFormError("Please fix the highlighted checkout fields.", fieldErrors);
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("create_checkout_order", {
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_customer_district: canonicalDistrict ?? "",
    p_customer_address: customerAddress,
    p_customer_note: customerNote || null,
    p_payment_method: paymentMethod,
    p_items: checkoutItems as unknown as Json
  });

  if (error) {
    return checkoutFormError(error.message || "Could not create order.", {
      cart_items: "Review cart stock and try again."
    });
  }

  const order = data?.[0];

  if (!order) {
    return checkoutFormError("Order was not created. Please try again.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/products");

  const itemCount = checkoutItems.reduce((total, item) => total + item.quantity, 0);
  await sendTelegramNotification(
    [
      "New order " + order.order_number,
      "Total: BDT " + order.total_amount + " (" + paymentMethod + ")",
      "Items: " + itemCount,
      "Customer: " + customerName,
      "Phone: " + customerPhone,
      "District: " + canonicalDistrict,
      "Address: " + customerAddress,
      customerNote ? "Note: " + customerNote : ""
    ]
      .filter(Boolean)
      .join("\n")
  );

  if (isOnlinePaymentMethod(paymentMethod)) {
    const payment = await initiateOnlinePaymentForOrder(order.order_id, paymentMethod, onlinePaymentBaseUrl!);

    if (!payment.ok) {
      redirect(
        `/payment/failed?order=${encodeURIComponent(order.order_number)}&status=pending&reason=${encodeURIComponent(payment.message)}`
      );
    }

    redirect(payment.redirectUrl);
  }

  redirect(`/payment/success?order=${encodeURIComponent(order.order_number)}`);
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
    return productReviewFormError("We could not submit this review. Please try again.");
  }

  const orderNumber = getText(formData, "order_number").toUpperCase();
  const customerPhone = getText(formData, "customer_phone");
  const rating = Number(getText(formData, "rating"));
  const title = getText(formData, "title");
  const body = getText(formData, "body");
  const fieldErrors: ProductReviewFormState["fieldErrors"] = {};

  if (!/^[A-Z0-9-]{6,64}$/.test(orderNumber)) {
    fieldErrors.order_number = "Enter the order ID from your confirmation.";
  }

  if (!isValidBangladeshPhone(customerPhone)) {
    fieldErrors.customer_phone = "Enter the phone number used at checkout.";
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    fieldErrors.rating = "Choose a rating from 1 to 5.";
  }

  if (title && (title.length < 3 || title.length > 120)) {
    fieldErrors.title = "Use 3 to 120 characters for the review title.";
  }

  if (body.length < 20 || body.length > 1500) {
    fieldErrors.body = "Your review must be between 20 and 1500 characters.";
  }

  if (Object.keys(fieldErrors).length) {
    return productReviewFormError("Please fix the highlighted review fields.", fieldErrors);
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
      "We could not verify a delivered order for this product. Check the order ID and checkout phone number, then try again.",
      { order_number: "Only a delivered order containing this product can be reviewed." }
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
    message: "Thank you. Your verified review has been submitted for approval.",
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

  const supabase = createSupabaseAuthServerClient();
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

  const supabase = createSupabaseAuthServerClient();
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

  const supabase = createSupabaseAuthServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ order_status: orderStatus as never, payment_status: paymentStatus as never })
    .eq("order_number", orderNumber);

  if (error) {
    redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?error=${encodeURIComponent(`Could not update order: ${error.message}`)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/track-order");
  revalidatePath("/payment/success");
  redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?notice=${encodeURIComponent("Order status updated.")}`);
}
export async function adminLogoutAction() {
  const supabase = createSupabaseAuthServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
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

  const supabase = createSupabaseAuthServerClient();
  const duplicateSlugMessage = await ensureUniqueProductSlug(supabase, parsed.payload.slug);

  if (duplicateSlugMessage) {
    return productFormError("Please fix the highlighted product fields.", { slug: duplicateSlugMessage });
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
      is_featured: parsed.payload.isFeatured
    })
    .select("id, slug")
    .single();

  if (error) {
    return productFormError(`Could not create product: ${error.message}`);
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

  const supabase = createSupabaseAuthServerClient();
  const duplicateSlugMessage = await ensureUniqueProductSlug(supabase, parsed.payload.slug, productId);

  if (duplicateSlugMessage) {
    return productFormError("Please fix the highlighted product fields.", { slug: duplicateSlugMessage });
  }

  const { data: existingProduct } = await supabase.from("products").select("slug").eq("id", productId).maybeSingle();
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
      is_featured: parsed.payload.isFeatured
    })
    .eq("id", productId);

  if (error) {
    return productFormError(`Could not update product: ${error.message}`);
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

  redirect(`/admin/products?notice=${encodeURIComponent("Product updated successfully.")}`);
}

export async function updateProductStatusAction(formData: FormData) {
  await requireAdmin();

  const productId = getText(formData, "product_id");
  const nextStatus = getText(formData, "next_status");

  if (!productId || !["active", "inactive"].includes(nextStatus)) {
    redirectToProducts("Invalid product status request.", "error");
  }

  const supabase = createSupabaseAuthServerClient();
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

  const supabase = createSupabaseAuthServerClient();
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

  const supabase = createSupabaseAuthServerClient();
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
