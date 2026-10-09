# XIII Marketplace — Return / Refund / Dispute

This phase implements a real internal after-sales state machine across Buyer, Seller and Admin. It does **not** pretend that a browser action equals a completed bank/gateway refund.

## Buyer flow

- `GET /api/v1/returns/eligible/:subOrderCode` validates ownership, return window and remaining returnable quantities.
- `POST /api/v1/returns` creates an item-level return request from immutable OrderItem snapshots.
- Return eligibility is limited to delivered/completed SubOrders and a 7-day window.
- Requested quantities cannot exceed purchased quantity or quantities already consumed by another open/refunded return.
- Discount allocation is computed server-side. The browser never submits a trusted refund amount.
- `POST /api/v1/returns/:requestCode/shipment` records the return carrier and tracking code after approval.
- `POST /api/v1/returns/:requestCode/dispute` opens an Admin dispute after Seller rejection (or after an unanswered request is older than 48 hours).

Buyer UI:

```text
/account/returns
/account/returns/new?subOrderCode=...
/account/returns/:requestCode
```

## Seller flow

- `GET /api/v1/seller/returns`
- `GET /api/v1/seller/returns/:requestCode`
- `POST /api/v1/seller/returns/:requestCode/approve`
- `POST /api/v1/seller/returns/:requestCode/reject`
- `POST /api/v1/seller/returns/:requestCode/received`

Seller access is scoped by `sellerId`. When the returned parcel is confirmed as received, the API creates one Refund record in `PENDING` instead of marking money as refunded prematurely.

Seller UI:

```text
http://localhost:3001/returns
http://localhost:3001/returns/:requestCode
```

## Admin dispute and refund control

Admin UI:

```text
http://localhost:3002/after-sales
```

Dispute routes:

```text
GET  /api/v1/admin/after-sales/disputes
GET  /api/v1/admin/after-sales/disputes/:disputeCode
POST /api/v1/admin/after-sales/disputes/:disputeCode/resolve
```

Refund routes:

```text
GET  /api/v1/admin/after-sales/refunds
POST /api/v1/admin/after-sales/refunds/:refundCode/start
POST /api/v1/admin/after-sales/refunds/:refundCode/confirm
POST /api/v1/admin/after-sales/refunds/:refundCode/fail
```

`confirm` requires an `externalReference`. This is intentional: the current package has payment collection/IPN integration for MoMo/VNPAY, but does not yet call provider-specific refund APIs. Admin must first perform/verify the real refund through the provider or manual banking workflow, then record its actual reference. Only then does XIII mark the internal Refund as `SUCCEEDED`.

## Inventory reversal

Refund confirmation reverses inventory in the same MongoDB transaction:

- return after `COMPLETED`: `sold -= qty`, `available += qty`
- return after `DELIVERED` before buyer completion: `reserved -= qty`, `available += qty`
- one `InventoryTransaction(type=RETURN)` is written per SKU

The ReturnRequest, Refund, SubOrder, Master Order history and inventory mutation commit together.

Partial item returns are tracked on `ReturnRequest` without falsely changing the entire SubOrder/Master Order to a return state. Order/SubOrder return statuses are only promoted when the cumulative returned quantities cover the full SubOrder.

## Payment accounting

`Order.refundedAmount` and `Payment.refundedAmount` track cumulative refund value. Payment state can be:

```text
SUCCESS
PARTIALLY_REFUNDED
REFUNDED
```

A partial item refund does not incorrectly turn the original payment into fully `REFUNDED`.

## Demo test path

`npm run seed --workspace services/api` creates one completed COD order for `buyer@xiii.local`:

```text
Order:    XIII-DEMO-RETURN-001
SubOrder: XIII-SUB-RETURN-001
```

Password for demo accounts remains `Xiii12345!`.

Suggested manual path:

1. Buyer logs in and opens `/account/orders`.
2. Open `XIII-DEMO-RETURN-001` and choose **Yêu cầu trả hàng**.
3. Seller logs in and opens `/returns`, then approves.
4. Buyer enters a return tracking code.
5. Seller confirms the returned parcel was received.
6. Admin opens `/after-sales`, starts the refund, performs/verifies the external transfer/refund, then records its real reference.
7. Buyer sees `REFUNDED`; stock and refund accounting are updated transactionally.
