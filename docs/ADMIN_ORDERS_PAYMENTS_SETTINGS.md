# Admin Orders, Payments & Marketplace Settings

This phase replaces the remaining Admin placeholders for Orders, Payments and Settings.

## Admin routes
- `GET /api/v1/admin/orders` and `GET /api/v1/admin/orders/:orderCode`
- `GET /api/v1/admin/payments` and `GET /api/v1/admin/payments/:paymentCode`
- `POST /api/v1/admin/payments/maintenance/expire-due`
- `GET /api/v1/admin/settings` and `PATCH /api/v1/admin/settings`
- Public provider/config surface remains `GET /api/v1/payments/providers`.

## Operational rules
- Admin order screens are observability-first. They do not permit arbitrary status rewrites that could bypass inventory/payment/refund state machines.
- Payment detail exposes PaymentEvents while redacting common signature/secret fields.
- The expiry sweep calls the same transactional release path used by the automatic payment timeout worker, returning reserved inventory and voucher usage for due unpaid orders.
- Marketplace Settings affect new checkouts: STANDARD/EXPRESS shipping fees, online payment timeout, and COD/MoMo/VNPAY enable flags.
- MoMo/VNPAY enable flags do not replace provider credentials. Online methods still require the matching `.env` secrets.
- Historical orders keep their snapshots and are not rewritten when settings change.
