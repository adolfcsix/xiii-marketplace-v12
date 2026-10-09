# XIII Marketplace — Payment setup (MoMo + VNPAY)

The source code contains the gateway integration, but merchant credentials are **not** embedded in the repository. Use credentials issued to your own sandbox/production merchant account.

## 1. Environment

Copy `.env.example` to `.env` in the monorepo root and fill only the provider you want to test.

```env
WEB_URL=http://localhost:3000
API_PUBLIC_URL=https://YOUR-PUBLIC-HTTPS-API
PAYMENT_EXPIRES_MINUTES=15

MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_PARTNER_CODE=...
MOMO_ACCESS_KEY=...
MOMO_SECRET_KEY=...
MOMO_REQUEST_TYPE=captureWallet

VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=...
VNPAY_HASH_SECRET=...
```

`MOMO_SECRET_KEY` and `VNPAY_HASH_SECRET` must stay server-side. Never prefix them with `NEXT_PUBLIC_` and never copy them into browser code.

## 2. Public callback URL is required

Payment providers cannot call `localhost`. During local development, expose port 4000 through a secure HTTPS tunnel and set `API_PUBLIC_URL` to that public origin.

MoMo IPN is passed automatically in the create-payment request as:

```text
${API_PUBLIC_URL}/api/v1/payments/webhooks/momo
```

For VNPAY, configure your sandbox merchant IPN URL as:

```text
https://YOUR-PUBLIC-HTTPS-API/api/v1/payments/webhooks/vnpay
```

The customer return page is:

```text
${WEB_URL}/payment-result?orderCode=...&provider=...
```

The browser return is informational only. The backend IPN/checksum result is the source of truth.

## 3. Start and verify

```powershell
docker compose down
docker compose up -d
npm install
npm run seed --workspace services/api
npm run verify:phase1
npm run verify:payment
npm run dev
```

Open:

```text
http://localhost:4000/api/v1/payments/providers
```

Configured providers return `configured: true`; only those methods become selectable in the Checkout UI.

## 4. Payment state flow

```text
Checkout online
  ↓
Order = PENDING_PAYMENT
Inventory.available → Inventory.reserved
  ↓
Payment record + hosted gateway URL
  ↓
MoMo/VNPAY hosted page
  ↓
Provider IPN/webhook
  ├─ verified success → Order/SubOrders = PAID
  └─ failure/timeout → Order = CANCELLED
                       reserved stock → available
                       voucher usage reversed
```

The default reservation window is 15 minutes. For this local/single-instance build an idempotent sweep runs inside the API process once per minute. Use a dedicated queue/worker in a multi-instance production deployment.

## 5. Official references

- MoMo Developers: https://developers.momo.vn/
- VNPAY sandbox docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
