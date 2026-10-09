> Current UI: Street Edition v4. The original implementation notes below are historical; bundled SVG demo art now redirects to regenerated WebP assets. See [Street Edition](STREET_EDITION.md) , [v2 shopping polish](STREET_EDITION_V2.md) and [v3 reliability fixes](STREET_EDITION_V3.md) and [v4 account/chat fixes](STREET_EDITION_V4.md).

# XIII Marketplace — UI implementation status

## Implemented in this package

### Buyer Homepage (`http://localhost:3000`)

Rebuilt from the approved “Homepage direction 2” into real Next.js/React/CSS code.

Implemented sections:

- top utility bar
- XIII header and global search
- primary navigation
- streetwear hero + three promo tiles
- dynamic category rail
- Flash Sale product grid
- dynamic product cards from NestJS + MongoDB
- local SVG campaign/product assets
- editorial campaign banners
- seller CTA / benefit strip
- responsive desktop/tablet/mobile layout

### Buyer Search / Category (`http://localhost:3000/search`)

The approved Search/Category direction is now implemented as real UI and connected to the public product API.

Implemented behavior:

- keyword search via `q`
- dynamic category and brand filters
- variant color and size filters
- min/max price filtering
- minimum rating filtering
- sorting: popular, newest, rating, price ascending, price descending
- pagination
- query state persisted in the URL
- product cards use variant price / compare-at price from MongoDB
- responsive desktop/tablet/mobile layout
- empty result state

Example:

`/search?q=hoodie&category=ao-hoodie&color=Gray&size=M&priceMax=600000&rating=4&sort=popular&page=1`

The `/products` API was upgraded to perform these filters server-side and returns enriched public catalog data including the primary active variant, category, brand, and shop summary.

## Demo data

The Phase 1 seed creates 8 ACTIVE products with variants and inventory. Therefore the Search UI is functional, but result counts are intentionally small until more products are created through the seller API or added to the seed.

## Not implemented as final UI yet

Buyer Account, Shop Page, Chat and Admin visual mockups have NOT yet all been converted to final UI. Home, Search, Product Detail, Cart, Checkout and Order Success are the Buyer screens implemented in the current package. Seller Center now includes real Order, Product and Inventory screens; Promotions, Finance and Analytics are implemented; Shop Settings is still pending.

Cart, checkout, orders, platform vouchers and signed MoMo/VNPAY online-payment flows are implemented on top of the Phase 1 backend. Chat and seller finance remain outside the current backend scope.

### Buyer Product Detail (`http://localhost:3000/product/:slug`)

Converted from the approved Product Detail mockup into real Next.js UI.

Implemented behavior:

- product breadcrumb and public product metadata
- dynamic product/brand/category/shop data from MongoDB
- gallery with active image selection
- dynamic price / compare-at price / discount state
- variant selector by color and size
- public inventory availability per SKU
- quantity selector bounded by available stock
- wishlist visual state
- seller/shop summary with live shop statistics
- product description/specification block
- rating summary using stored product rating/count
- related products queried by category
- responsive desktop/tablet/mobile layout

Add to cart / Buy now now persist the selected SKU and quantity to the authenticated MongoDB cart and continue into the real checkout flow.

To make variant selection meaningful, the seed now creates multiple size/color SKUs for the Basic Tee and Hoodie demo products.

### Buyer Cart (`http://localhost:3000/cart`)

Converted into a real authenticated cart UI and connected to MongoDB through NestJS.

Implemented behavior:

- Product Detail `Add to cart` persists the selected SKU + quantity
- `Buy now` persists the SKU then navigates to Cart
- client access-token use with refresh-token retry on expired access token
- dynamic header cart quantity badge
- cart lines grouped by shop
- live Product/Variant/Inventory hydration on every cart read
- quantity increase/decrease bounded by current stock
- remove one item / clear all
- current variant price and compare-at price rendered from backend
- unavailable/out-of-stock warning and checkout eligibility state
- responsive desktop/mobile Cart layout

Implemented after Cart: Checkout Preview, address selection/creation, shipping method, platform vouchers, transactional inventory reservation, Master Order/SubOrder/Order Item creation, COD, and hosted MoMo/VNPAY payment redirect when gateway credentials are configured.


### Buyer Checkout (`http://localhost:3000/checkout`)

Implemented behavior:

- authenticated address list and inline address creation
- Standard / Express shipping choice with server-side fee calculation per shop
- platform voucher preview and validation (`XIII120`, `SHIP25` in demo seed)
- live checkout preview from Cart + ProductVariant + Inventory + Shop
- COD payment option enabled end-to-end
- MoMo/VNPAY options enabled dynamically only when server-side sandbox/production credentials are configured
- online payment creates a Payment record and PaymentEvent audit rows
- signed provider IPN/webhook is the source of truth for payment success
- `/payment-result` polls trusted backend state after gateway redirect
- unpaid online orders expire and release reserved inventory
- MongoDB transaction on order creation
- atomic `available → reserved` inventory movement
- Master Order + one SubOrder per Shop
- immutable Order Item product/SKU/price snapshots
- InventoryTransaction and OrderStatusHistory audit records
- cart cleared only inside the successful transaction
- responsive desktop/mobile UI

### Order Success (`/order-success/:orderCode`)

Loads the newly created order from `GET /orders/:orderCode`, including shop-split suborders, item snapshots, delivery address, fees, discount and total. For online payment, the user first returns through `/payment-result`; the success screen is linked after backend-confirmed `PAID`.

## Seller Center order UI update

Implemented seller screens: `/login`, `/`, `/orders`, `/orders/:subOrderCode`, `/products`, `/products/new`, `/products/:productId`, `/inventory`. Seller order data is dynamic and scoped through `/api/v1/seller/orders*`. Product and inventory data are dynamic and ownership-scoped through `/api/v1/seller/products*`, `/api/v1/seller/variants*` and `/api/v1/seller/inventory*`. Promotions, Finance and Analytics are implemented; Shop Settings remains marked `soon`.


## Seller Product + Inventory UI update

The Seller Center catalog is now a real implementation. `/products` includes status tabs, catalog search, price/stock/SKU statistics and soft-hide actions. `/products/new` creates Product + initial SKU + Inventory atomically. `/products/:productId` edits product metadata and manages SKU pricing/attributes/status plus available stock. `/inventory` provides stock-health filters, inline available/threshold editing, optimistic concurrency protection and InventoryTransaction history. Image input is URL-based in this slice; binary upload/object storage is not yet implemented.


## Admin Product Review UI update

The Admin app is no longer only a placeholder for product moderation. Implemented screens: `/login`, `/`, `/products`, `/products/:productId`. The review queue is backed by MongoDB and supports status filtering, search, Seller/Category/Brand context, SKU/inventory inspection, approve/reject decisions and review-history rendering. Other Admin modules such as users, payments, disputes, CMS and audit-log browsing remain marked as future work.

## Realtime Chat + Notifications UI update

Buyer realtime screens now implemented:

```text
/account/messages
/account/notifications
```

The Buyer header includes unread badges for chat and persisted notifications. Product Detail now has a working `Chat với shop` action that creates/reopens the Buyer ↔ Shop conversation and opens the realtime chat screen.

Seller Center now includes:

```text
/messages
/notifications
```

Seller sidebar/topbar display unread counts. Conversations are ownership-scoped to the seller account that owns the shop. Messages are stored in MongoDB and delivered in realtime through the authenticated Socket.IO `/realtime` namespace.

The notification center is also backed by MongoDB. Implemented business events currently include chat messages, new orders, seller fulfillment status, buyer cancellations/completions, online payment outcomes, return/refund lifecycle events, verified-purchase reviews and seller review replies.

This slice does **not** yet add media/object-storage uploads to chat or a Redis Socket.IO adapter for horizontal multi-instance deployment.


## Analytics UI update

Seller Center now includes `/analytics` with date-range KPIs, daily GMV chart, product-detail views, order/view rate, returns, top products, inventory health, finance summary and CSV export. Admin now includes `/analytics`, and the Admin overview dashboard reads marketplace analytics instead of placeholder counters. Admin analytics includes GMV, platform revenue, active buyers/sellers/shops, refunds, payment mix, top shops/products, operations queues and inventory risk.

## Admin CMS / Homepage update

Admin now includes `/cms`. Homepage marketing content is stored in MongoDB through the `homebanners` and `homesections` collections instead of being embedded as text/link constants in the Buyer page.

Implemented CMS behavior:

- HERO / PROMO / EDITORIAL banner create and edit
- start/end scheduling window
- active/inactive state
- banner sort order
- Homepage section active/inactive state and ordering
- Admin category list/create/activate/deactivate
- Admin brand list/create/activate/deactivate
- Buyer Homepage reads `GET /api/v1/cms/home`
- inactive/future/expired banners are excluded from public output
- seeded homepage defaults remain editable MongoDB records

Media upload/object storage is not implemented yet; CMS image fields currently store URLs/paths.
