# Buyer Orders — implemented flow

## Pages

- `GET /account/orders` — buyer order history with exact-status tabs and pagination.
- `GET /account/orders/:orderCode` — order detail, status timeline, shop groups, item snapshots, shipping snapshot and payment snapshot.

## API

- `GET /api/v1/orders?page=1&limit=10&status=CONFIRMED`
- `GET /api/v1/orders/:orderCode`
- `POST /api/v1/orders/:orderCode/cancel`
- `POST /api/v1/orders/:orderCode/confirm-received`

## Buyer cancellation contract

Buyer cancellation is intentionally limited to `PENDING_PAYMENT` and `CONFIRMED`.

- `PENDING_PAYMENT`: cancels pending/processing Payment records, releases reserved inventory, restores consumed voucher usage, cancels master/sub-orders and writes history.
- `CONFIRMED`: this is currently the COD-before-fulfilment state; reserved inventory and voucher usage are released in the same MongoDB transaction.
- `PAID` is **not** directly cancellable because a paid online order requires a refund workflow. That is a separate module and must not be faked by only changing order text.

## Confirm received

`DELIVERED -> COMPLETED` is transactional. Reserved inventory is finalized to `sold`, an inventory `SALE` transaction is recorded, sub-orders are completed, and COD payment status becomes `SUCCESS`.

## Important limitation

Seller fulfilment (`CONFIRMED -> PACKING -> READY_TO_SHIP -> SHIPPED -> DELIVERED`) and carrier tracking are not implemented yet. The buyer detail page therefore shows the saved shipping method/address and displays tracking as pending until the Seller Orders/Shipping phase is added.
