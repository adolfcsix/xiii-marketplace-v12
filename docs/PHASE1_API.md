# XIII Marketplace — Phase 1 API

Base URL: `http://localhost:4000/api/v1`

## Implemented modules

- Auth: register, login, refresh-token rotation, logout
- User profile and delivery addresses
- Seller application + admin approve/reject
- Shop public profile + seller shop settings
- Categories + admin create/update
- Brands + admin create/update
- Products + seller product CRUD
- Product variants / SKU
- Inventory + adjustment history
- Standard success/error response wrapper
- JWT + role guard + ownership checks

## Health

`GET /health`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout` — Bearer token

## User

- `GET /users/me`
- `PATCH /users/me`
- `GET /users/me/addresses`
- `POST /users/me/addresses`
- `PATCH /users/me/addresses/:id`
- `DELETE /users/me/addresses/:id`

## Seller application

- `POST /seller/application`
- `GET /seller/application/me`
- `GET /admin/seller-applications?status=PENDING` — Admin
- `POST /admin/seller-applications/:id/approve` — Admin
- `POST /admin/seller-applications/:id/reject` — Admin

Approving an application creates a Shop and grants the user the `SELLER` role.

## Shop

- `GET /shops/:slug`
- `GET /seller/shop`
- `PATCH /seller/shop`

Seller routes check shop ownership server-side.

## Categories

- `GET /categories`
- `POST /admin/categories` — Admin
- `PATCH /admin/categories/:id` — Admin

## Brands

- `GET /brands`
- `POST /admin/brands` — Admin
- `PATCH /admin/brands/:id` — Admin

## Products

- `GET /products?q=&page=1&limit=24`
- `GET /products/:slug` — enriched detail includes public shop, category and brand summary
- `GET /seller/products`
- `POST /seller/products`
- `PATCH /seller/products/:id`
- `DELETE /seller/products/:id`

Seller-created products start as `DRAFT`. Phase 2/Admin moderation will control publishing to `ACTIVE`.

## Variants / SKU

- `GET /products/:productId/variants` — public active SKUs enriched with available/reserved/sold inventory counts
- `POST /seller/products/:productId/variants`
- `PATCH /seller/variants/:id`
- `DELETE /seller/variants/:id` — soft-disables the SKU

Creating a variant automatically creates its Inventory row.

## Inventory

- `GET /seller/inventory`
- `PATCH /seller/inventory/:variantId`
- `GET /seller/inventory/:variantId/history`

Every manual stock adjustment produces an `InventoryTransaction` audit entry.

## Standard response

Success:

```json
{
  "success": true,
  "data": {}
}
```

Paginated:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 24,
    "total": 532,
    "totalPages": 23
  }
}
```

Error:

```json
{
  "success": false,
  "code": "PRODUCT_NOT_FOUND",
  "message": "PRODUCT_NOT_FOUND"
}
```

## Public catalog filtering (Search UI)

```http
GET /api/v1/products?q=hoodie&category=ao-hoodie&brand=xiii-official&color=Gray&size=M&priceMin=200000&priceMax=600000&rating=4&sort=popular&page=1&limit=12
```

Supported `sort` values: `popular`, `newest`, `rating`, `price_asc`, `price_desc`.
The response includes the primary active variant plus category, brand, and shop summaries so the Buyer Search page can render price/filter metadata without hard-coded product data.

## Cart — Phase 2 slice 1

All Cart routes require a Buyer bearer token.

- `GET /cart`
- `POST /cart/items` body: `{ "variantId": "...", "quantity": 1 }`
- `PATCH /cart/items/:variantId` body: `{ "quantity": 2 }`
- `DELETE /cart/items/:variantId`
- `DELETE /cart`

Cart rules implemented server-side:

- cart is unique per authenticated user
- SKU must exist and be `ACTIVE`
- parent Product must be `ACTIVE`
- owning Shop must be `ACTIVE`
- requested quantity must not exceed current `Inventory.available`
- cart line price is hydrated from the current ProductVariant; the cart does not trust a frontend-provided price
- cart response is grouped by Shop and returns live stock/current subtotal

Inventory is **not reserved** by adding to cart. Reservation now occurs only inside `POST /checkout/create`, within the MongoDB order-creation transaction.


## Checkout + Orders — Phase 2 slice 2

All routes require an authenticated Buyer bearer token.

### Checkout preview

```http
POST /checkout/preview
Content-Type: application/json

{
  "addressId": "<mongo id>",
  "shippingMethod": "STANDARD",
  "voucherCode": "XIII120"
}
```

The server re-reads Cart, ProductVariant, Product, Shop and Inventory state, validates the address belongs to the current user, applies the voucher and returns a non-persistent price/fee preview.

### Create order

```http
POST /checkout/create
Content-Type: application/json

{
  "addressId": "<mongo id>",
  "shippingMethod": "STANDARD",
  "voucherCode": "XIII120",
  "paymentMethod": "COD"
}
```

`checkout/create` runs inside a MongoDB transaction. It atomically:

1. validates cart/catalog/stock/address/voucher again
2. creates a Master Order
3. creates one SubOrder per Shop
4. creates immutable Order Item snapshots
5. moves Inventory `available → reserved`
6. creates InventoryTransaction audit rows
7. writes OrderStatusHistory
8. consumes voucher usage when applicable
9. clears the buyer cart

If any step fails, the transaction is rolled back.

### Buyer orders

```http
GET /orders
GET /orders/:orderCode
```

Local Docker MongoDB is configured as single-node replica set `rs0` because transactions are not supported on standalone MongoDB servers.


## Online Payments — Phase 3 slice

### Provider availability

```http
GET /payments/providers
```

Returns whether MoMo/VNPAY credentials are configured, without exposing secrets.

### Create hosted payment

```http
POST /payments/create
Authorization: Bearer <buyer token>
Content-Type: application/json

{
  "orderCode": "XIII-...",
  "provider": "MOMO"
}
```

The server loads the authenticated buyer's order and uses its trusted `totalAmount`; amount is never accepted from the browser. The order must still be `PENDING_PAYMENT` and its checkout payment method must match the requested provider.

Supported providers: `MOMO`, `VNPAY`. MoMo create requests are HMAC-SHA256 signed. VNPAY payment URLs are HMAC-SHA512 signed using API version 2.1.0.

### Buyer payment status

```http
GET /payments/order/:orderCode
Authorization: Bearer <buyer token>
```

Used by `/payment-result` to poll trusted backend state after the customer returns from a hosted gateway. Browser query parameters are not accepted as proof of success.

### Provider callbacks

```http
POST /payments/webhooks/momo
GET  /payments/webhooks/vnpay
```

These endpoints intentionally bypass the normal `{ success, data }` response wrapper because payment providers require their own callback response format/status. Invalid checksums never update order state. Verified success updates Order + SubOrders to `PAID`; final failure/expiry cancels the unpaid order and releases reserved inventory.
