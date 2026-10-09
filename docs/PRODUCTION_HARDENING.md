# XIII Marketplace — Production hardening

This phase adds deployment/security infrastructure without changing the commerce state machines.

## What changed

- Request IDs (`X-Request-Id`) are attached to every API request and returned on errors.
- Structured JSON request logs include route, status and duration, but never request bodies or tokens.
- Helmet security headers, strict CORS allow-list, proxy awareness and request body limits are enabled.
- Redis-backed fixed-window rate limiting is global. Auth, uploads and payment endpoints have stricter limits. If Redis is unavailable the API uses a bounded in-memory fallback, while production readiness can still fail when `REQUIRE_REDIS=true`.
- `/api/v1/health/live` is process liveness. `/api/v1/health/ready` checks MongoDB and Redis.
- Production environment validation refuses default/short secrets and wildcard CORS.
- S3-compatible object storage supports direct browser upload using presigned POSTs. The policy enforces MIME type and byte limit. Seller Product Editor and Admin CMS now use it. Supported public image types are JPEG, PNG and WEBP.
- Local development includes MinIO on ports 9000/9001. The `xiii-media` bucket is created automatically.
- Production Dockerfiles, Nginx reverse proxy configuration, Mongo backup/restore scripts and a production environment checker are included.

## Local storage test

1. Copy `.env.example` to `.env`.
2. Run `docker compose up -d`.
3. MinIO API is at `http://localhost:9000`; console is at `http://localhost:9001`.
4. Start the apps normally. A seller can upload product images from Product Editor. An admin can upload CMS/category/brand images from `/cms`.

Files upload directly from the browser to object storage. The API only creates a short-lived signed policy and never receives the image bytes.

## Production storage

Set `STORAGE_*` to an S3-compatible service such as AWS S3, Cloudflare R2 or a managed MinIO cluster. Configure the bucket CORS policy to allow POST from the Buyer/Seller/Admin origins and expose the public bucket through `STORAGE_PUBLIC_BASE_URL` (preferably a CDN/custom domain).

Uploaded images are type/size constrained and get random keys. This phase does **not** add image transcoding, EXIF stripping, malware scanning, or orphan-object garbage collection; add an asynchronous media-processing pipeline before accepting untrusted file formats beyond images.

## Production deployment sample

Copy `.env.production.example` to `.env.production`, replace every placeholder, then validate:

```bash
set -a; . ./.env.production; set +a
node scripts/check-production-env.mjs
```

Build/start the sample stack:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The sample compose expects MongoDB/object storage to be external production services. It starts the API, three Next.js apps, Redis and Nginx. Replace `xiii.example.com` hostnames in `ops/nginx/xiii.conf` with your domains. TLS should terminate at a managed load balancer/CDN or be added to Nginx with real certificates; do not expose the sample HTTP listener directly to the public internet.

## Health and deploy checks

- Liveness: `GET /api/v1/health/live`
- Readiness: `GET /api/v1/health/ready`
- Keep `REQUIRE_REDIS=true` in production.
- Configure your orchestrator/load balancer to send traffic only to ready API instances.
- Do not put payment provider secrets or JWT secrets into images, source control or `NEXT_PUBLIC_*` variables.

## Backups

Install MongoDB Database Tools on the backup runner and run:

```bash
MONGODB_URI='...' BACKUP_DIR=/secure/backups ./scripts/backup-mongo.sh
```

The default retention is 14 days. Backups should be encrypted at rest and copied off-host. Test restores regularly on an isolated database:

```bash
CONFIRM_RESTORE=YES MONGODB_URI='mongodb://restore-target/...' ./scripts/restore-mongo.sh /secure/backups/xiii-mongodb-....archive.gz
```

A backup that has never been restore-tested is not a verified backup.

## Remaining production work

This is stronger production-oriented source, not a certification that the service is production-ready. Before a real launch, run dependency-based builds, automated integration/E2E tests, load tests, dependency/container vulnerability scans, payment-provider sandbox certification, monitoring/alerting, backup restore drills, and a security review. For horizontal Socket.IO scaling, add a Redis Socket.IO adapter or sticky sessions; this sample keeps one API realtime instance.
