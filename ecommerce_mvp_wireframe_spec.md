# E-commerce MVP Wireframe Specification

## Project Goal

Build a clean, professional, user-friendly, elegant online e-commerce platform where customers can visit from social media links, view products, select items, checkout, pay through a payment gateway, and submit orders.

The website should be beginner-friendly, fast, mobile-first, and designed for future migration from Supabase to Spring Boot Kotlin REST API.

---

## Tech Stack

### Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- Server Components where possible
- Server Actions for form submissions and order creation

### Phase 1 Backend
- Supabase
- PostgreSQL
- Supabase Auth only for admin
- Supabase Storage for product images

### Future Backend
- Spring Boot Kotlin REST API
- Self-hosted PostgreSQL
- Same relational database structure should be reusable

---

## Design Direction

The UI must feel:

- Clean
- Professional
- User-friendly
- Elegant
- Trustworthy
- Mobile-first
- Simple for first-time online shoppers

Avoid:

- Too many colors
- Crowded layouts
- Too many animations
- Complicated checkout
- Unnecessary account creation for customers

---

## Visual Style Guide

### Colors

Use a premium but simple color palette.

Recommended:

```txt
Background: #FFFFFF or #F8FAFC
Primary Text: #111827
Secondary Text: #6B7280
Primary Brand Color: #0F172A or #1D4ED8
Accent Color: #F59E0B or #10B981
Border: #E5E7EB
Card Background: #FFFFFF
```

### Typography

Use modern readable fonts.

Recommended:

```txt
Font: Inter, Manrope, or system sans-serif
Heading: Bold, clean, large
Body: Regular, readable
Button: Medium/Semibold
```

### UI Feel

- Rounded corners: medium
- Soft shadow
- Clear spacing
- Large product image
- Strong call-to-action button
- Easy-to-read price
- Clear order summary

---

## Main User Flow

```txt
Social Media Link
   ↓
Home / Product Page
   ↓
Product Details
   ↓
Buy Now / Add to Cart
   ↓
Checkout
   ↓
Payment Gateway
   ↓
Success / Failed Page
   ↓
Admin sees order
```

---

## Pages Required

### Public Pages

1. Home Page
2. Product Listing Page
3. Product Details Page
4. Cart Page
5. Checkout Page
6. Payment Success Page
7. Payment Failed Page
8. Order Tracking Page, optional but recommended

### Admin Pages

1. Admin Login
2. Admin Dashboard
3. Product List
4. Add Product
5. Edit Product
6. Order List
7. Order Details

---

# Wireframe Details

---

## 1. Home Page Wireframe

### Purpose

Home page should quickly explain what the shop sells and guide users to products.

### Layout

```txt
Header
Hero Section
Featured Categories
Featured Products
Why Buy From Us
Customer Trust Section
Footer
```

### Header

Desktop:

```txt
Logo | Search Bar | Home | Products | Cart Icon
```

Mobile:

```txt
Logo | Search Icon | Cart Icon | Menu Icon
```

Header requirements:

- Sticky top header
- Clean white background
- Bottom border
- Cart icon with item count
- Search visible on desktop
- Search compact on mobile

### Hero Section

Content:

```txt
Headline: Shop Quality Products Online
Subtitle: Fast delivery, secure payment, and trusted service.
Primary Button: Shop Now
Secondary Button: View Offers
Hero Image: Product lifestyle image or product collage
```

Design:

- Large clear headline
- One strong CTA button
- Not too much text
- Mobile image below text

### Featured Categories

Card layout:

```txt
Category Image/Icon
Category Name
Short text
```

Example categories:

```txt
Electronics
Fashion
Home & Living
Accessories
Beauty
```

### Featured Products

Product grid:

Desktop:

```txt
4 columns
```

Tablet:

```txt
2 columns
```

Mobile:

```txt
1 or 2 columns
```

Product card must include:

```txt
Product Image
Product Name
Short Description
Price
Discount Price, if available
Stock Status
Buy Now Button
Add to Cart Button
```

### Why Buy From Us Section

Use 3 or 4 cards:

```txt
Secure Payment
Fast Delivery
Quality Product
Customer Support
```

### Footer

Footer content:

```txt
Logo
Short business description
Phone number
Email
Facebook page link
Important links
Copyright
```

---

## 2. Product Listing Page Wireframe

### Purpose

Users can browse all products and filter/search easily.

### Layout

```txt
Header
Page Title
Search + Filter
Product Grid
Pagination / Load More
Footer
```

### Product Grid Card

Each product card:

```txt
Image
Name
Price
Old price, optional
Rating, optional
Stock status
Buy Now
Add to Cart
```

### Filters

Beginner version:

```txt
Category
Price range
Sort by latest
Sort by price low to high
Sort by price high to low
```

Mobile filter should open as bottom sheet or drawer.

---

## 3. Product Details Page Wireframe

### Purpose

Help customer understand product and buy quickly.

### Layout

Desktop:

```txt
Left: Product Images
Right: Product Info + Buy Actions
Bottom: Description / Specification / Delivery Info
```

Mobile:

```txt
Product Images
Product Info
Buy Buttons
Description
Delivery Info
Related Products
```

### Product Info

Must include:

```txt
Product Name
Price
Discount Price
Stock Status
Short Description
Quantity Selector
Buy Now Button
Add to Cart Button
Delivery Info
Payment Info
```

### Buy Buttons

Primary button:

```txt
Buy Now
```

Secondary button:

```txt
Add to Cart
```

### Trust Elements

Add below buttons:

```txt
Secure payment
Fast delivery
Easy support
Cash on delivery, if available
```

---

## 4. Cart Page Wireframe

### Purpose

Users can review selected products before checkout.

### Layout

```txt
Header
Cart Items
Order Summary
Checkout Button
Footer
```

### Cart Item

Each cart item:

```txt
Product Image
Product Name
Price
Quantity Selector
Subtotal
Remove Button
```

### Order Summary

```txt
Subtotal
Delivery Charge
Discount, if any
Total
Proceed to Checkout Button
```

Mobile:

- Order summary should stay below cart items
- Checkout button should be very visible

---

## 5. Checkout Page Wireframe

### Purpose

Collect customer information and start payment.

### Layout

Desktop:

```txt
Left: Customer Information Form
Right: Order Summary
```

Mobile:

```txt
Order Summary
Customer Information Form
Payment Button
```

### Checkout Form Fields

Required:

```txt
Customer Name
Phone Number
District
Full Address
Delivery Note, optional
```

Payment section:

```txt
Payment Method
Pay Now Button
```

### Validation

Rules:

```txt
Name is required
Phone number is required
Phone number must be valid Bangladesh number
Address is required
District is required
```

### Order Creation Flow

```txt
User submits checkout form
Create order with status = pending
Create payment with status = pending
Redirect to payment gateway
Gateway returns success/fail/cancel
Update payment status
Update order status
Show success or failed page
```

---

## 6. Payment Success Page Wireframe

### Purpose

Confirm the order and build trust.

### Content

```txt
Success Icon
Order Confirmed Message
Order ID
Payment Status
Total Amount
Customer Phone
Button: Continue Shopping
Button: Track Order
```

Message example:

```txt
Thank you! Your order has been confirmed.
We will contact you soon for delivery confirmation.
```

---

## 7. Payment Failed Page Wireframe

### Purpose

Tell customer payment failed and allow retry.

### Content

```txt
Failed Icon
Payment Failed Message
Reason, if available
Button: Try Again
Button: Contact Support
Button: Back to Products
```

---

## 8. Admin Dashboard Wireframe

### Purpose

Admin can manage products and orders.

### Layout

```txt
Sidebar
Top Bar
Dashboard Cards
Recent Orders
Low Stock Products
```

### Dashboard Cards

```txt
Total Orders
Pending Orders
Paid Orders
Total Sales
Total Products
```

---

## 9. Admin Product Management

### Product List

Columns:

```txt
Image
Product Name
Category
Price
Stock
Status
Edit Button
Delete Button
```

### Add/Edit Product Form

Fields:

```txt
Product Name
Slug
Category
Short Description
Full Description
Price
Discount Price
Stock Quantity
Product Images
Status: active/inactive
Featured: yes/no
```

---

## 10. Admin Order Management

### Order List

Columns:

```txt
Order ID
Customer Name
Phone
Total Amount
Payment Status
Order Status
Created Date
View Button
```

### Order Details

Sections:

```txt
Customer Info
Delivery Address
Ordered Items
Payment Info
Order Status Update
Admin Note
```

Order status options:

```txt
pending
confirmed
processing
shipped
delivered
cancelled
```

Payment status options:

```txt
pending
paid
failed
cancelled
refunded
```

---

# Database Tables for MVP

Use strict relational PostgreSQL design.

## categories

```sql
id uuid primary key default gen_random_uuid(),
name text not null,
slug text not null unique,
description text,
image_url text,
is_active boolean not null default true,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

## products

```sql
id uuid primary key default gen_random_uuid(),
category_id uuid references categories(id),
name text not null,
slug text not null unique,
short_description text,
description text,
price numeric(12,2) not null,
discount_price numeric(12,2),
stock_quantity integer not null default 0,
is_active boolean not null default true,
is_featured boolean not null default false,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

## product_images

```sql
id uuid primary key default gen_random_uuid(),
product_id uuid not null references products(id) on delete cascade,
image_url text not null,
alt_text text,
sort_order integer not null default 0,
created_at timestamptz not null default now()
```

## orders

```sql
id uuid primary key default gen_random_uuid(),
order_number text not null unique,
customer_name text not null,
customer_phone text not null,
customer_district text not null,
customer_address text not null,
customer_note text,
subtotal numeric(12,2) not null,
delivery_charge numeric(12,2) not null default 0,
discount_amount numeric(12,2) not null default 0,
total_amount numeric(12,2) not null,
order_status text not null default 'pending',
payment_status text not null default 'pending',
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

## order_items

```sql
id uuid primary key default gen_random_uuid(),
order_id uuid not null references orders(id) on delete cascade,
product_id uuid references products(id),
product_name text not null,
unit_price numeric(12,2) not null,
quantity integer not null,
total_price numeric(12,2) not null,
created_at timestamptz not null default now()
```

## payments

```sql
id uuid primary key default gen_random_uuid(),
order_id uuid not null references orders(id) on delete cascade,
gateway_name text not null,
gateway_transaction_id text,
amount numeric(12,2) not null,
currency text not null default 'BDT',
payment_method text,
payment_status text not null default 'pending',
gateway_response jsonb,
paid_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

## payment_events

```sql
id uuid primary key default gen_random_uuid(),
payment_id uuid not null references payments(id) on delete cascade,
event_type text not null,
event_payload jsonb,
created_at timestamptz not null default now()
```

---

# Important UX Rules

## Home Page

- Product should be visible quickly.
- Hero section should not be too tall on mobile.
- CTA button should be above the fold.

## Product Page

- Price must be clearly visible.
- Buy Now button must be stronger than Add to Cart.
- Stock status should be clear.

## Checkout Page

- Do not force customer login.
- Keep checkout form short.
- Show total price before payment.
- Show customer support contact.

## Mobile Experience

Most users may come from Facebook, TikTok, Instagram, WhatsApp.

Therefore:

- Mobile design must be priority.
- Buttons must be large enough.
- Product image must load fast.
- Checkout must be simple.
- Page should not feel heavy.

---

# Performance Requirements

- Use server-side rendering where possible.
- Use optimized images.
- Use pagination or load more for product listing.
- Avoid unnecessary client-side state.
- Avoid loading all products at once.
- Use database indexes for slug, category, status, created_at.
- Cache public product pages where possible.

---

# Security Requirements

- Admin routes must be protected.
- Public users can only read active products.
- Customers can create orders.
- Customers cannot update payment status directly.
- Payment status must be updated only from secure server-side gateway callback.
- RLS should be enabled in Supabase.

---

# AI Build Instruction

Build the wireframe and frontend using:

```txt
Next.js App Router
TypeScript
Tailwind CSS
Clean component structure
Mobile-first responsive design
Professional e-commerce UI
```

The design should be close to a premium Shopify-style single-brand store, not a crowded marketplace.

Focus on:

```txt
Product visibility
Easy checkout
Fast loading
Trustworthy UI
Simple payment flow
Clean admin panel
Future backend migration readiness
```

Do not create unnecessary advanced features in the first version.

---

# First Version Feature Scope

Include:

```txt
Product browsing
Product details
Cart
Checkout
Payment gateway placeholder/integration-ready flow
Order success/fail pages
Admin product management
Admin order management
```

Do not include yet:

```txt
Customer login
Wishlist
Review system
Seller panel
Advanced coupon system
Multi-vendor system
Complex inventory system
```

---

# Final Expected Output From AI Builder

The AI should produce:

```txt
Responsive wireframe
Page components
Reusable UI components
Basic navigation
Product card
Cart summary
Checkout form
Admin layout
Clean Tailwind design system
Database-ready data structure
Payment-ready order flow
```
