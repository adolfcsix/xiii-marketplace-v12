# Runtime integration test

This is the first verification layer that is intended to run the actual XIII stack instead of only parsing source files.

## 1. Preflight

From the repository root:

```powershell
npm run runtime:preflight
```

The check reports Node/npm/Docker/Docker Compose, npm-registry DNS, `.env`, `node_modules`, `package-lock.json`, and the development ports used by the project.

## 2. Install and start infrastructure

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
```

Wait for MongoDB replica initialization, Redis, and MinIO to become ready:

```powershell
docker compose ps
```

The local MongoDB service is intentionally configured as a single-node replica set because Checkout/Orders/Finance use transactions.

## 3. Typecheck and build

```powershell
npm run verify:runtime-readiness
npm run typecheck
npm run build
```

Do not treat parser-only verifiers as a substitute for these commands. A successful `npm run build` is the dependency-aware Next.js/NestJS compilation gate.

After the first successful `npm install`, keep the generated `package-lock.json` in source control and use `npm ci` in CI/production builds.

## 4. Seed and run

```powershell
npm run seed --workspace services/api
npm run dev
```

Expected local endpoints:

```text
Buyer:  http://localhost:3000
Seller: http://localhost:3001
Admin:  http://localhost:3002
API:    http://localhost:4000/api/v1
MinIO:  http://localhost:9001
```

## 5. Non-destructive smoke suite

With the stack running and demo seed loaded:

```powershell
npm run runtime:smoke
```

The smoke suite checks all three frontends, API live/readiness, public catalog/CMS/settings, then logs in as seeded Buyer/Seller/Super Admin and reads representative protected endpoints. It does not create orders, move money, approve products, or mutate inventory.

Seed credentials:

```text
buyer@xiii.local  / Xiii12345!
seller@xiii.local / Xiii12345!
admin@xiii.local  / Xiii12345!
```

You may override hosts/credentials:

```powershell
$env:API_BASE="http://localhost:4000/api/v1"
$env:WEB_BASE="http://localhost:3000"
$env:SELLER_BASE="http://localhost:3001"
$env:ADMIN_BASE="http://localhost:3002"
$env:SEED_PASSWORD="Xiii12345!"
npm run runtime:smoke
```

## 6. Browser E2E checklist

After the smoke suite passes, manually verify one complete stateful flow before calling the release runtime-tested:

```text
Buyer login
→ Product Detail
→ choose SKU
→ Add to Cart
→ Checkout COD
→ Seller confirms/packs/ships/delivers
→ Buyer confirms received
→ Finance ledger created
→ Buyer review
→ Seller reply
→ Admin views order/payment/audit records
```

For MoMo/VNPAY, use actual sandbox credentials and a public HTTPS callback URL. Browser redirects are not proof of payment; the verified provider webhook/IPN must move the order to PAID.

## Generation-environment result

The archive was checked in an environment with Node 22, but that environment could not resolve `registry.npmjs.org` (`EAI_AGAIN`) and did not provide Docker. Therefore dependency installation, Docker startup, NestJS/Next full build, Mongo transactions, MinIO upload, Socket.IO browser delivery, and gateway callback execution could not be honestly marked PASS there. The static readiness verifier and all existing domain-flow verifiers do run in that environment.
