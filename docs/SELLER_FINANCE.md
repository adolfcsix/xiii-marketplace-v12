# XIII Marketplace — Seller Finance

This module implements seller accounting as a ledger, not as a manually editable balance field.

## Money lifecycle

1. Checkout calculates `platformFee` from the current marketplace finance setting (`commissionRateBps`). The SubOrder snapshots both `platformFee` and `sellerRevenue` so later setting changes never rewrite old orders.
2. When Buyer confirms receipt, each completed SubOrder posts two idempotent ledger entries inside the same MongoDB transaction:
   - `SALE_GROSS`: positive product revenue before marketplace commission.
   - `PLATFORM_FEE`: negative marketplace commission.
3. Those entries are `PENDING` until `availableAt`. The default settlement delay is 7 days. Reading finance data or creating a withdrawal matures eligible entries to `AVAILABLE`.
4. A successful refund for a previously completed SubOrder posts `REFUND_DEBIT` plus a proportional `FEE_REVERSAL`. This prevents the seller from paying commission on the refunded portion.
5. Withdrawal requests do not immediately mutate the ledger. Requested/approved/processing withdrawals reserve withdrawable funds. Only after Admin confirms a real transfer reference is a negative `WITHDRAWAL` entry posted to the ledger.

## Seller API

- `GET /api/v1/seller/finance/summary`
- `GET /api/v1/seller/finance/ledger`
- `GET /api/v1/seller/finance/payout-account`
- `PATCH /api/v1/seller/finance/payout-account`
- `GET /api/v1/seller/finance/withdrawals`
- `POST /api/v1/seller/finance/withdrawals`
- `POST /api/v1/seller/finance/withdrawals/:code/cancel`

Seller payout account numbers are encrypted at rest with AES-256-GCM. Each withdrawal stores an immutable encrypted payout snapshot, so changing the seller payout account later cannot alter the destination recorded for an old withdrawal. The seller-facing API only returns the masked last four digits.

## Admin API

- `GET /api/v1/admin/finance/summary`
- `GET /api/v1/admin/finance/settings`
- `PATCH /api/v1/admin/finance/settings`
- `GET /api/v1/admin/finance/withdrawals`
- `GET /api/v1/admin/finance/withdrawals/:code`
- `POST /api/v1/admin/finance/withdrawals/:code/approve`
- `POST /api/v1/admin/finance/withdrawals/:code/process`
- `POST /api/v1/admin/finance/withdrawals/:code/reject`
- `POST /api/v1/admin/finance/withdrawals/:code/paid`

The full decrypted bank account is available only on the Admin withdrawal detail endpoint. `paid` requires a real external bank/reference code and creates the withdrawal ledger debit in the same transaction.

## Security / configuration

Set a stable secret in `.env`:

```env
PAYOUT_ENCRYPTION_KEY=<long-random-secret>
```

Do not rotate or lose this key without a data migration; existing payout account ciphertext would become undecryptable. Production should use a managed secret/KMS instead of committing the key to source control.

## Demo seed

`npm run seed --workspace services/api` creates:

- 265,050 VND pending settlement for the completed demo order.
- 650,000 VND available historical demo balance.
- one masked MB Bank payout account.
- one 150,000 VND `REQUESTED` withdrawal so Admin Finance has a queue item immediately.

These are seed-only records and are not hard-coded UI values.
