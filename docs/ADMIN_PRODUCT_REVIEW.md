# Admin Product Review

This slice closes the seller catalog moderation loop.

## Admin UI

```text
http://localhost:3002/login
http://localhost:3002/
http://localhost:3002/products
http://localhost:3002/products/:productId
```

Demo admin:

```text
admin@xiii.local
Xiii12345!
```

The seed includes one `PENDING_REVIEW` product so the review queue is testable immediately without first creating a seller product.

## API

```text
GET  /api/v1/admin/products
GET  /api/v1/admin/products/summary
GET  /api/v1/admin/products/:id
POST /api/v1/admin/products/:id/approve
POST /api/v1/admin/products/:id/reject
```

All endpoints require `ADMIN` or `SUPER_ADMIN`.

## Moderation lifecycle

```text
DRAFT / REJECTED
       ↓ Seller submit
PENDING_REVIEW
   ├─ Admin approve → ACTIVE → visible on Buyer Store
   └─ Admin reject  → REJECTED → seller sees rejection reason
```

Seller product metadata is locked while `PENDING_REVIEW`. The seller can explicitly withdraw the request back to `DRAFT`, edit, and submit again. Editing core metadata of an already `ACTIVE` product automatically moves it back to `PENDING_REVIEW`, preventing unreviewed core content from remaining public.

## Review history

Moderation actions are stored in the separate `productreviews` collection:

- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `WITHDRAWN`

The Product document stores only the current moderation state plus the latest `submittedForReviewAt`, `reviewedAt`, `reviewedBy`, and `rejectionReason` fields. The event collection provides the immutable history shown in Admin Product Detail.

## Approval checks

Before approval the backend revalidates that:

- the Product is still `PENDING_REVIEW`
- the Shop is `ACTIVE`
- the Category is active
- at least one ProductVariant is `ACTIVE`

Approve/reject state changes and their ProductReview event are written inside one MongoDB transaction.
