# XIII Marketplace — Users, Seller Applications & Shop Settings

This increment replaces three former placeholder areas with real API-backed flows.

## Admin users

Routes:
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/:id`
- `PATCH /api/v1/admin/users/:id/status`
- `PATCH /api/v1/admin/users/:id/verification`

All routes require `ADMIN`/`SUPER_ADMIN` and `USERS_MANAGE` (SUPER_ADMIN bypasses the permission profile). Blocking an account clears its refresh token. JWT validation now re-reads the current user status/roles from MongoDB, so a blocked account cannot continue using an otherwise-valid access token.

Admin UI:
- `http://localhost:3002/users`
- `http://localhost:3002/users/:id`

## Seller applications

Routes:
- `GET /api/v1/admin/seller-applications`
- `GET /api/v1/admin/seller-applications/:id`
- `POST /api/v1/admin/seller-applications/:id/review`
- `POST /api/v1/admin/seller-applications/:id/approve`
- `POST /api/v1/admin/seller-applications/:id/reject`

The queue supports search, status filtering and pagination. Approval runs in a MongoDB transaction and creates/reuses the seller Shop, grants the `SELLER` role, creates the `ShopMember` OWNER record, then marks the application APPROVED. Rejection requires a reason.

Admin UI:
- `http://localhost:3002/seller-applications`
- `http://localhost:3002/seller-applications/:id`

## Seller shop settings

Routes:
- `GET /api/v1/seller/shop`
- `PATCH /api/v1/seller/shop`

Write access requires `SHOP_SETTINGS`. The settings page manages identity, logo/banner URLs, public description, contact details, preparation lead time, operational address, return policy and active business categories. Shop rename regenerates a unique slug rather than blindly colliding with another shop.

Seller UI:
- `http://localhost:3001/settings`

## Development seed

Password for development accounts remains `Xiii12345!`.

Additional records:
- `applicant@xiii.local` — ACTIVE buyer with a PENDING seller application (`404 Street Lab`).
- `blocked@xiii.local` — BLOCKED buyer for Admin Users testing.

Use `npm run seed --workspace services/api` after MongoDB is available.
