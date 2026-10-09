# XIII Marketplace — Browser E2E testing

This project includes Playwright coverage for the critical marketplace path rather than only static/source verification.

## What the critical test does

The serial Chromium scenario reseeds deterministic demo data, then drives the actual UI across three applications:

1. Buyer logs in at `localhost:3000`.
2. Buyer opens `xiii-hoodie-gray`, clicks **Mua ngay**, checks the cart and creates a COD order.
3. The test captures the generated Master Order and SubOrder codes from the real response/UI.
4. Seller logs in at `localhost:3001`, opens that exact SubOrder and moves it through packing, ready-to-ship, shipped and delivered. A tracking code is required before shipping.
5. Buyer reopens the exact order, confirms receipt, and submits a verified-purchase review.
6. Admin logs in at `localhost:3002`, searches the exact order and verifies that it is `COMPLETED`, then confirms the review is visible in moderation.
7. Separate smoke cases verify that Buyer/Seller/Admin protected pages do not expose account data without a session.

The test deliberately uses COD so no third-party payment sandbox is required. MoMo/VNPAY still require provider credentials and separate integration tests.

## First run on Windows/macOS/Linux

Prerequisites: Node.js, npm, Docker Desktop/Engine and Docker Compose.

```bash
npm install
npm run e2e:install
npm run e2e:stack
```

`e2e:stack` performs the following in order:

- creates `.env` from `.env.example` when missing;
- executes runtime preflight and static readiness checks;
- starts MongoDB replica set, Redis and MinIO;
- waits for MongoDB replica-set readiness;
- reseeds deterministic demo data;
- starts API + Buyer + Seller + Admin development servers;
- waits for `/health/ready` and all three frontends;
- runs Chromium Playwright tests;
- stops the development server process tree when complete.

Docker infrastructure is intentionally left running for faster reruns. Stop it with:

```bash
docker compose down
```

Use `docker compose down -v` only when you intentionally want to delete local MongoDB/Redis/MinIO volumes.

## When the stack is already running

```bash
npm run e2e
```

Other useful commands:

```bash
npm run e2e:headed
npm run e2e:ui
npm run e2e:report
npm run verify:e2e
```

## Failure artifacts

On a failed test, Playwright keeps useful artifacts under:

- `test-results/` — trace/screenshot/video retained on failure;
- `playwright-report/` — HTML report.

Open the HTML report with `npm run e2e:report`.

## Test data contract

The E2E suite relies on the development seed accounts and deterministic product slug:

- Buyer: `buyer@xiii.local / Xiii12345!`
- Seller: `seller@xiii.local / Xiii12345!`
- Admin: `admin@xiii.local / Xiii12345!`
- Product: `xiii-hoodie-gray`

These are development-only fixtures. Never use the demo password or seeded identities in production.

## Current verification boundary

The test code is included and statically verified in the generated archive. If the generation environment cannot install npm packages, run Docker, or download the Playwright Chromium binary, browser E2E cannot truthfully be marked as executed there. The authoritative runtime result is the exit code of `npm run e2e:stack` on a machine with the prerequisites above.
