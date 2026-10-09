# XIII Marketplace — Staging deployment

Staging exists to prove the exact release candidate before production. It must use separate data, object storage and payment sandbox credentials. Never point staging at production MongoDB, Redis, S3/R2 buckets, or live MoMo/VNPAY credentials.

## 1. Host prerequisites

Recommended baseline for the current single-host staging topology: Linux x86_64, Docker Engine + Compose v2, Git, at least 4 vCPU / 8 GB RAM / 30 GB free disk. Public DNS should provide four hostnames for Buyer, Seller, Admin and API. TLS should terminate at Cloudflare/a managed load balancer or an HTTPS reverse proxy in front of the sample Nginx container.

Clone the repository to a stable path such as `/srv/xiii-marketplace`. Copy `.env.staging.example` to `.env.staging`, replace every placeholder, then run:

```bash
npm run staging:preflight
```

The preflight intentionally refuses placeholder domains, wildcard CORS, weak secrets, non-HTTPS public URLs, a Mongo URI without `replicaSet=rs0`, and partially configured payment credentials.

## 2. Reproducible dependencies

The current generated source does not contain a verified `package-lock.json` because the generation environment could not reach npm. On a machine with registry access, run `npm install`, run `npm run typecheck && npm run build && npm run e2e:stack`, then commit the generated `package-lock.json`. CI should use that lock file before any production release.

## 3. Deploy

```bash
IMAGE_TAG=$(git rev-parse --short=12 HEAD) npm run staging:deploy
```

The deploy script validates the environment and Compose model, builds images tagged with the release SHA, starts the private Mongo replica set + Redis, starts API/Buyer/Seller/Admin/Nginx, waits for internal readiness, records the previous image tag and finally runs HTTPS smoke checks.

The Mongo and Redis ports are not published by the staging Compose file. Only Nginx port 80 is published. Put TLS in front of it before exposing the host to the Internet.

## 4. Data policy

`deploy.sh` never runs the development seed automatically. This is deliberate: a deployment must not erase or overwrite staging data. If you explicitly need demo data on a disposable staging database, run the seed manually after confirming the database name is `xiii_marketplace_staging` and that no real testing data must be preserved.

Schema changes should be backward-compatible: add fields/indexes first, deploy code that tolerates old and new records, backfill data, then remove old fields in a later release. Do not combine destructive data rewrites with an application deploy.

## 5. Smoke test

External smoke checks are non-destructive and verify API liveness/readiness, all three web surfaces, public categories/brands and CMS home data:

```bash
npm run staging:smoke
```

A successful smoke test is not enough for a release. Run the full Playwright commerce flow against an isolated environment before production. Payment sandbox certification should be performed separately because automated COD E2E does not prove MoMo/VNPAY callbacks.

## 6. Rollback

The deploy script preserves the previous locally built image tag. If the new application release is unhealthy while the data model remains backward-compatible:

```bash
npm run staging:rollback
```

Rollback switches application containers to the previously recorded images and verifies API readiness. It does **not** roll back database data. This is why database changes must be backward-compatible.

## 7. GitHub Actions

`.github/workflows/ci.yml` runs source/domain verifiers, dependency typecheck/build, then browser E2E on GitHub's Linux runner.

`.github/workflows/staging-deploy.yml` is manual-only. Configure a protected GitHub `staging` environment and these secrets: `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_PRIVATE_KEY`, `STAGING_KNOWN_HOSTS`, `STAGING_APP_PATH`. The staging host should already contain a clone and a real `.env.staging` that is not committed.

Use a restricted deploy SSH account. Do not disable host-key verification; `STAGING_KNOWN_HOSTS` exists specifically to pin the host key.
