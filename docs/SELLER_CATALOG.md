# Seller Catalog + Inventory

This slice converts the Seller Center catalog from placeholder navigation into MongoDB-backed product, variant/SKU and inventory management.

## Seller UI

```text
http://localhost:3001/products
http://localhost:3001/products/new
http://localhost:3001/products/:productId
http://localhost:3001/inventory
```

The Seller Center now supports catalog search/status filtering, Product editing, multi-SKU creation, per-SKU pricing, color/size attributes, SKU activation/disable, available-stock adjustment, low-stock thresholds, stock status filters and inventory transaction history.

## API

```text
GET    /api/v1/seller/products
GET    /api/v1/seller/products/summary
GET    /api/v1/seller/products/:id
POST   /api/v1/seller/products/catalog
PATCH  /api/v1/seller/products/:id
DELETE /api/v1/seller/products/:id

GET    /api/v1/seller/products/:productId/variants
POST   /api/v1/seller/products/:productId/variants
PATCH  /api/v1/seller/variants/:id
DELETE /api/v1/seller/variants/:id

GET    /api/v1/seller/inventory
GET    /api/v1/seller/inventory/summary
PATCH  /api/v1/seller/inventory/:variantId
GET    /api/v1/seller/inventory/:variantId/history
```

All seller endpoints require an authenticated SELLER/ADMIN/SUPER_ADMIN role and backend ownership validation. Product, Variant and Inventory operations do not rely on a product/shop id supplied by the browser as proof of ownership.

## Atomic new-product creation

`POST /seller/products/catalog` creates the Product, its initial ProductVariants, their Inventory records, initial IMPORT inventory transactions and the Shop product counter in one MongoDB transaction.

A request can save the product as `DRAFT` or submit it as `PENDING_REVIEW`. Seller-created products are **not** silently promoted to `ACTIVE`; admin moderation remains a separate workflow.

## Product deletion behavior

The seller delete action is intentionally a soft archive. It changes Product status to `HIDDEN` rather than physically deleting the product. Existing OrderItem snapshots and historical references therefore remain safe.

## Inventory concurrency

Inventory writes accept `expectedAvailable`. The Seller UI sends the last value it read. The API performs a conditional update and raises `INVENTORY_CONCURRENT_UPDATE` if stock changed in the meantime, preventing a stale Seller screen from overwriting stock that changed because of checkout/order activity.

`reserved` and `sold` are read-only in the Seller UI. Checkout/order flows own those counters.

## Image handling boundary

The current editor accepts image URLs. It does not yet upload binary files to S3/R2/Cloudinary. Object-storage upload and media lifecycle are intentionally deferred to the Media/Storage slice.
