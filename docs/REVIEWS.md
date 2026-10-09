# XIII Marketplace — Reviews / Ratings

Implemented lifecycle:

- Only a buyer owning an `OrderItem` inside a `COMPLETED` Order/SubOrder can create a review.
- One review per buyer + order item; the API derives Product/Shop/Variant/Order from the order snapshot instead of trusting frontend identifiers.
- Public reviews expose a masked buyer display name and only `PUBLISHED` records.
- Product and Shop `ratingAverage` / `ratingCount` are recalculated from `PUBLISHED` reviews inside the same transaction as create/moderation.
- Seller can list reviews for the authenticated shop and create/update one public reply.
- Admin can hide/restore a review. Hiding requires a moderation reason and preserves the database row/audit fields.
- `customerreviews` is deliberately separate from the existing `productreviews` collection, which stores product-listing approval history.

Main routes:

- `GET /api/v1/reviews/product/:productId`
- `GET /api/v1/reviews/mine?status=PENDING|REVIEWED`
- `POST /api/v1/reviews`
- `GET /api/v1/seller/reviews`
- `POST /api/v1/seller/reviews/:id/reply`
- `GET /api/v1/admin/reviews`
- `PATCH /api/v1/admin/reviews/:id/moderate`

UI:

- Buyer: `/account/reviews`
- Seller: `http://localhost:3001/reviews`
- Admin: `http://localhost:3002/reviews`
- Product Detail now renders real public review cards.
