# XIII Marketplace — Analytics & Reports

This phase adds data-driven Seller and Admin analytics. It does not use hard-coded dashboard KPI values.

## Seller

`GET /api/v1/seller/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD`

Requires SELLER/ADMIN role and resolves the shop from the authenticated account. The response aggregates SubOrders, OrderItems, Return/Refund data, Customer Reviews, Inventory, Finance Ledger, Withdrawals and Product View events.

Key metrics include shop GMV, seller revenue before refund, estimated revenue after refund, platform fees, discounts, average order value, product detail page views, order-per-view rate, return rate, ratings, daily trend, top products, inventory health and finance balances.

Seller UI: `http://localhost:3001/analytics`

The CSV export is generated from the API response in the browser. It does not expose DB credentials and does not trust client-calculated financial values.

## Admin

`GET /api/v1/admin/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD`

Requires ADMIN/SUPER_ADMIN. It aggregates marketplace GMV, platform fee revenue, active buyers/sellers/shops, product views, refund totals, order status, payment methods, top shops/products, moderation/after-sales/withdrawal queues, and marketplace inventory risk.

Admin UI: `http://localhost:3002/analytics`

The Admin overview dashboard now also loads `/admin/analytics` instead of placeholder counters.

## Product-view tracking

Every successful public `GET /api/v1/products/:slug` increments the product lifetime `viewCount` and records an `AnalyticsEvent` with `type=PRODUCT_VIEW`. The date-range order/view metric therefore means **orders per product-detail page view**, not unique-user conversion.

The seed creates 30 days of demo product-view events so the time-series chart is visible immediately after `npm run seed --workspace services/api`.

## Date range rules

- Default: last 30 days.
- Maximum: 366 days per request.
- Aggregation timezone: `Asia/Ho_Chi_Minh`.
- Invalid/inverted ranges return an API error.

## Runtime note

Source/parser verification can run without project dependencies. Full NestJS + MongoDB + browser E2E verification still requires installing dependencies and starting the Docker services.
