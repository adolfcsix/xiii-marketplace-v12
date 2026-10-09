# XIII Marketplace — Go-live checklist

Do not treat source/static verifier PASS as production approval. A production launch should be blocked until every applicable item below has evidence.

## Release quality gate

- A committed `package-lock.json` exists and CI uses the exact lock file.
- `npm run typecheck`, `npm run build`, all domain verifiers and `npm run e2e:stack` pass on the release commit.
- Staging runs the same commit/image tag intended for production.
- Buyer → Checkout → Seller fulfilment → Buyer completion → Review → Admin verification passes in staging.
- MoMo/VNPAY sandbox create-payment, callback/IPN signature verification, success, failure and expiry paths are tested with provider credentials.

## Infrastructure and data

- Production MongoDB is a backed-up replica set/managed cluster; restore was tested on an isolated target.
- Redis is persistent enough for the chosen rate-limit/realtime behavior and is not Internet-exposed.
- Production object storage uses a separate bucket and least-privilege credentials; CORS only permits approved origins.
- DNS/TLS certificates are active for Buyer, Seller, Admin, API and CDN/media domains.
- MongoDB, Redis and object-storage admin interfaces are not public.
- Resource limits, disk monitoring and log retention are configured.

## Security

- JWT access/refresh secrets and payout encryption key are unique, random and stored in a secret manager or protected environment file.
- CORS is an explicit allow-list; no wildcard origins.
- Admin and deployment accounts use strong credentials; production demo accounts/passwords are removed.
- Payment/provider secrets never use `NEXT_PUBLIC_*` and are not present in images, logs or source control.
- Dependency/container vulnerability scans are reviewed.
- Rate limits, audit logs and account blocking are exercised in staging.
- A manual authorization test confirms Buyer/Seller/Admin cannot access another user's/shop's restricted resources by changing IDs.

## Operations

- Health/readiness probes are connected to the load balancer/orchestrator.
- Alerting exists for API 5xx rate, payment webhook failures, Mongo/Redis readiness, disk pressure and backup failures.
- Runbooks exist for payment incident, overselling/inventory mismatch, refund dispute and credential rotation.
- Backup schedule and retention are documented; at least one restore drill succeeded.
- Rollback procedure was tested with a backward-compatible release.

## Launch decision

Only launch after unresolved P0/P1 defects are zero, all payment/finance invariants are reconciled, staging evidence is retained, and an owner is assigned for launch monitoring. The first production release should use a small traffic window and have an explicit rollback threshold.
