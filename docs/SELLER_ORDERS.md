# Seller Order Management

Seller order fulfilment is implemented on top of Master Order / SubOrder. A seller can only query and mutate SubOrders whose `sellerId` matches the authenticated JWT user.

## Seller routes

```text
GET   /api/v1/seller/orders/summary
GET   /api/v1/seller/orders?status=&page=&limit=
GET   /api/v1/seller/orders/:subOrderCode
PATCH /api/v1/seller/orders/:subOrderCode/status
```

Allowed forward-only transitions:

```text
PAID -> CONFIRMED
CONFIRMED -> PACKING
PACKING -> READY_TO_SHIP
READY_TO_SHIP -> SHIPPED
SHIPPED -> DELIVERED
```

COD checkout already creates the order as `CONFIRMED`; online orders become `PAID` only after a verified payment webhook, then the seller confirms them.

Moving to `SHIPPED` requires a tracking code. Shipping provider and tracking code are stored on the SubOrder and exposed to Buyer Order Detail.

Every seller transition is executed inside a MongoDB transaction, writes `OrderStatusHistory`, and recomputes the Master Order status from all active SubOrders. The Master Order advances only when all active shops have reached at least that fulfilment stage, preventing one fast seller from making a multi-shop order appear fully shipped.

## Seller UI

```text
http://localhost:3001/login
http://localhost:3001/
http://localhost:3001/orders
http://localhost:3001/orders/:subOrderCode
```

Demo seller:

```text
seller@xiii.local
Xiii12345!
```
