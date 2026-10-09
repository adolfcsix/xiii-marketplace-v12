# XIII Marketplace — CMS / Homepage Management

## Purpose
Homepage content is no longer hard-coded in the Buyer frontend. Public content is resolved from MongoDB through `GET /api/v1/cms/home`.

## Admin UI
Open `http://localhost:3002/cms` with the seeded admin account.

The screen manages:
- Homepage banners: HERO, PROMO, EDITORIAL
- Banner scheduling with `startAt` / `endAt`
- Active/inactive banner state and sort order
- Homepage section order and visibility
- Categories including parent, image, sort order and active state
- Brands including verified and active state

## Public rendering
The Buyer Homepage requests three sources in parallel:
- `/products`
- `/categories`
- `/cms/home`

Only CMS records that are active and currently inside their scheduling window are returned publicly. Homepage sections are rendered in `sortOrder`, so Admin can change the order without modifying frontend source.

## Seed content
`npm run seed --workspace services/api` creates the default XIII hero, promo, editorial banners and section layout as MongoDB data. Existing SVG files are only media assets; their text/link/order are controlled by CMS records.

## API
Public:
- `GET /api/v1/cms/home`

Admin banners:
- `GET /api/v1/admin/cms/banners`
- `POST /api/v1/admin/cms/banners`
- `PATCH /api/v1/admin/cms/banners/:id`
- `DELETE /api/v1/admin/cms/banners/:id` (soft archive / deactivate)

Admin sections:
- `GET /api/v1/admin/cms/sections`
- `POST /api/v1/admin/cms/sections`
- `PATCH /api/v1/admin/cms/sections/:id`

Catalog management:
- `GET /api/v1/admin/categories`
- `POST /api/v1/admin/categories`
- `PATCH /api/v1/admin/categories/:id`
- `GET /api/v1/admin/brands`
- `POST /api/v1/admin/brands`
- `PATCH /api/v1/admin/brands/:id`

## Notes
Uploads/object storage are still separate from CMS. The CMS stores image URLs. In a later production-hardening phase these URLs can be supplied by S3/Cloudinary-compatible upload APIs without changing the homepage data model.
