## Bản rà soát v17.2

Sửa xung đột giỏ hàng, phân bổ tiền giảm giá, thông báo khi retry giao dịch và đăng ký trùng. Thêm `npm run test:commerce` vào CI. Xem [QA-V17.2](docs/QA-V17.2.md) để biết kết quả và phạm vi chưa kiểm chứng.

## Cập nhật v17.1 — kiểm trước triển khai

- Sửa Docker thiếu source workspace/dùng chung; cài đúng lockfile và thêm CI build image.
- Sửa schema ID của job AI, kiểm lại tài khoản/quyền trước gọi AI và xử lý quota khi lỗi database chưa rõ kết quả.
- Nâng thư viện xử lý ảnh lên bản vá, chặn ảnh giả định dạng và kết quả khác SKU/dáng; siết cấu hình production.
- Kết quả kiểm tra và phần chưa xác minh: [QA-V17.1](docs/QA-V17.1.md). Chưa xác nhận chạy Docker/MongoDB/MinIO/OpenAI thật trong phiên này.

## Cập nhật v17 — AI tạo áo mặc thử (pilot)

- Seller tạo lớp áo 2D từ ảnh riêng SKU, chọn dáng nam/nữ/trung tính; kiểm tra ảnh gốc/kết quả trước khi dùng.
- Có hàng đợi, lưu ảnh vào kho, tái sử dụng kết quả và hạn mức tạo; không tự gọi lại sau lỗi.
- AI tắt mặc định. Chạy thật cần khoá API phía máy chủ, MongoDB và kho ảnh; chất lượng ảnh thật chưa được kiểm chứng trong phiên này.
- [Bật AI và phạm vi v17](docs/AI-OUTFIT-V17.md) · [Kiểm tra v17](docs/QA-V17.md).

## Cập nhật v16 — XIII Dress Up

- Phòng thay đồ 2D: tủ đồ cạnh mẫu, giữ mẫu trên mobile, tuỳ chỉnh nam/nữ, tóc và khuôn mặt.
- Áo trong và áo khoác là hai lớp riêng; lưu/khôi phục cả năm lớp, giữ dữ liệu bản cũ.
- Seller gắn artwork theo đúng SKU/dáng, xem trước, upload ảnh trong suốt và tải khung mẫu.
- Catalog có tải thêm sản phẩm; màu/size/giá/tồn kho vẫn lấy từ hàng đang bán.
- [Hướng dẫn v16](docs/DRESS-UP-V16.md) · [Kiểm tra v16](docs/QA-V16.md).

## Cập nhật v15.1 — Rà soát và sửa lỗi

- Sửa nhận diện màu Đen/Denim, màu hex và tên danh mục tiếng Anh số nhiều.
- Màu biến thể được ưu tiên đúng; dữ liệu nhân vật lỗi không chặn khôi phục outfit.
- Giữ đúng tài khoản khi thông tin profile cũ/hỏng; ngừng batch giỏ khi đổi tài khoản/rời trang.
- Chọn lại SKU đã thêm không gửi trùng; tắt chuyển động loại bỏ transition ở nút bo tròn.
- Báo cáo kiểm tra và giới hạn: [QA-V15.1](docs/QA-V15.1.md).

## Cập nhật v15 — Fit Studio & Fluid Buttons

- Phòng phối đồ có nhân vật 2D đổi áo/quần/giày/phụ kiện theo biến thể đã chọn.
- Tuỳ chỉnh dáng, form, da, tóc; lưu tối đa 12 bộ riêng theo tài khoản trên trình duyệt.
- Nút bo tròn có chiều sâu, hover/nhấn mượt, hỗ trợ tắt chuyển động.
- Hướng dẫn/phạm vi: [FIT-STUDIO-V15](docs/FIT-STUDIO-V15.md). Kết quả kiểm tra mới: [QA-V15](docs/QA-V15.md).

> **Street Edition v12 — Nhận diện và trạng thái 3D:** Logo nổi, nút màu dạng cầu, túi CSS ở màn hình tải/giỏ trống; sửa đích ảnh bay khi đã đăng nhập. Xem [hướng dẫn v12](docs/STREET_EDITION_V12_INTERFACE_3D.md).

> **Street Edition v11 — 3D trong mua sắm:** Banner nhiều lớp, gallery chuyển ảnh theo chiều sâu/vuốt ngang, ảnh bay vào giỏ sau thành công và khung xem bộ phối. Xem [hướng dẫn v11](docs/STREET_EDITION_V11_SHOPPING_MOTION.md).

> **Street Edition v10 — Tối ưu web 3D:** Khối cầu xoay theo chuột, chuyển động liên tục và chất lượng thích ứng; depth mềm hơn và giải phóng WebGL khi không dùng. Xem [hướng dẫn v10](docs/STREET_EDITION_V10_WEB_3D.md).

> **Street Edition v9 — Chỉnh và tải ảnh:** Xem trước/cắt/xoay, sắp xếp gallery bằng kéo thả hoặc nút, upload trực tiếp shop/SKU/review/trả hàng. Xem [hướng dẫn v9](docs/STREET_EDITION_V9_MEDIA.md).

> **Street Edition v8.2 — Upload ảnh:** Sửa MIME/đuôi file sai, nhận GIF/AVIF, giữ ảnh thành công trong batch, báo đúng giới hạn và thêm upload banner điện thoại. Xem [thay đổi v8.2](docs/STREET_EDITION_V8_2_UPLOADS.md).

> **Street Edition v8.1 — Bug fixes:** Giữ đúng SKU khi sửa outfit, bảo toàn bản nháp lỗi mạng, sửa retry thêm giỏ, khóa size lúc gửi và giới hạn thời gian tải Quick View. Xem [báo cáo sửa lỗi](docs/STREET_EDITION_V8_1_FIXES.md).

> **Street Edition v8 — Modern Shopping:** Phòng phối đồ có lưu bộ phối và thêm giỏ, Quick View chọn biến thể, gợi ý size theo bảng shop và Seller nhập bảng size. Xem [hướng dẫn v8](docs/STREET_EDITION_V8_SHOPPING.md).

> **Street Edition v7 — 3D tích hợp:** Banner chữ nổi, thẻ sản phẩm và ảnh bộ sưu tập nghiêng theo chuột, gallery có chiều sâu, vòng quỹ đạo và thanh chỉnh Energy Orb. Xem [hướng dẫn v7](docs/STREET_EDITION_V7_3D.md).

> **Street Edition v6 — ThreeUI 3D:** Khối cầu Energy Orb với sắc bạc/tím, nút tạm dừng và hình tĩnh dự phòng. Xem [hướng dẫn cập nhật và kết quả kiểm tra](docs/STREET_EDITION_V6_3D.md).

> **Street Edition v4:** Sửa phản hồi cũ ghi đè khi đổi tab/hội thoại, giữ bản nháp chat và xác nhận hủy đơn rõ ràng. Xem [thay đổi v4](docs/STREET_EDITION_V4.md).

> **Street Edition v3:** Sửa giỏ hiển thị dữ liệu cũ sau khi xóa, xử lý lỗi thông báo, lọc đúng shop và chặn mở chat trùng. Xem [thay đổi v3](docs/STREET_EDITION_V3.md).

> **Street Edition v2:** Gallery phóng to, gỡ từng bộ lọc, skeleton theo trang và giao diện mua sắm đồng bộ. Xem [thay đổi v2](docs/STREET_EDITION_V2.md).

> **Street Edition (07/10/2026):** Giao diện đen/trắng, bộ ảnh mới, chuyển động và sửa trang chủ trống. Xem [hướng dẫn cập nhật](docs/STREET_EDITION.md) và [kết quả kiểm tra](QA_RESULTS.md).

> **Bản cập nhật 07/10/2026:** xem [hướng dẫn cập nhật và thay đổi](docs/UPGRADE_POLISH_2026_10_07.md), [kết quả kiểm tra](QA_RESULTS.md). Dùng `UPDATE_XIII_WINDOWS.bat` khi cập nhật và muốn bỏ qua seed. Các ghi chú kiểm thử cũ bên dưới là lịch sử của những giai đoạn trước.

# XIII Fashion Marketplace

Production-oriented multi-vendor fashion marketplace monorepo. The project started from the Phase 1 foundation and now includes the Buyer commerce flow, payments, Seller/Admin operations, after-sales, reviews, realtime chat/notifications, Seller Finance, Seller Promotions, and Analytics/Reports.

## Chạy nhanh trên Windows

Nếu dùng Windows 10/11 + Docker Desktop, có thể chạy `CHECK_XIII_WINDOWS.bat` để kiểm tra máy rồi double-click `RUN_XIII_WINDOWS.bat` để chuẩn bị `.env`, cài dependencies (nếu cần), bật MongoDB/Redis/MinIO, seed database và chạy API + Buyer + Seller + Admin. Xem `docs/LOCAL_WINDOWS_RUNBOOK.md` để biết chi tiết.

Nếu gặp lỗi, chạy `DIAGNOSE_XIII_WINDOWS.bat`; script tạo báo cáo chẩn đoán đã che giá trị secret trong `.env`.

## Phase 1 status

Implemented with real MongoDB-backed modules:

- Auth: register, login, refresh-token rotation, logout
- Buyer profile + delivery addresses
- Seller application workflow
- Admin seller approval/rejection
- Automatic Shop creation after seller approval
- Buyer / Seller / Admin role model
- Public shop profile + seller shop settings
- Dynamic categories
- Dynamic brands
- Dynamic products
- Separate product variants / SKU collection
- Separate inventory collection
- Inventory adjustment history / audit records
- Ownership checks for seller-owned data
- Admin role checks
- Consistent API success/error format
- Seed data for admin, seller, buyer, shop, categories, products, variants and stock

Phase 2 is layered on top of the Phase 1 catalog foundation. Persistent Cart, Checkout Preview, transactional inventory reservation, Master Order/SubOrder, Order Item snapshots, order history, platform vouchers and Buyer order reads are now wired. Signed MoMo/VNPAY payment adapters, payment-event audit logs and online-payment reservation expiry are now layered on top. Seller finance, settlement ledger, withdrawals, and seller-funded promotions, analytics/reports, and MongoDB-backed CMS homepage operations are now layered on top as well.

## Monorepo

```text
xiii-marketplace/
├── apps/
│   ├── web/        # Buyer UI preview
│   ├── seller/     # Seller UI preview
│   └── admin/      # Admin UI preview
├── services/
│   └── api/        # NestJS API — Phase 1 implementation
├── docs/
│   └── PHASE1_API.md
├── tools/
│   └── verify-phase1.mjs
├── docker-compose.yml
└── .env.example
```

## Local services

- Buyer Web: `http://localhost:3000`
- Seller Center: `http://localhost:3001`
- Admin: `http://localhost:3002`
- API: `http://localhost:4000/api/v1`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379` (rate limiting / runtime readiness)

## Run on Windows / VS Code

1. Install Node.js 20+ and Docker Desktop.
2. Open the project root in VS Code.
3. Create `.env`:

```powershell
Copy-Item .env.example .env
```

4. Start infrastructure:

```powershell
docker compose up -d
```

5. Install dependencies:

```powershell
npm install
```

6. Seed Phase 1 data:

```powershell
npm run seed --workspace services/api
```

7. Verify source:

```powershell
npm run verify:phase1
npm run typecheck --workspace services/api
```

8. Start development apps:

```powershell
npm run dev
```

## Seed accounts

All use password `Xiii12345!`.

```text
admin@xiii.local   -> BUYER + ADMIN
seller@xiii.local  -> BUYER + SELLER
buyer@xiii.local   -> BUYER
```

## Core data model

```text
User
 ├─ Address[]
 └─ SellerApplication
        ↓ admin approval
      Shop
        ↓
      Product
        ↓
   ProductVariant (SKU)
        ↓
     Inventory
        ↓
InventoryTransaction
```

Stock does not live inside `Product`. This prevents the common marketplace mistake of mixing catalog, variant pricing and stock in one document.

## API documentation

See [`docs/PHASE1_API.md`](docs/PHASE1_API.md) for implemented endpoints and request flow.

## Verification performed in this archive

- Required Phase 1 module/file presence check: passed.
- TypeScript parser/transpile check across the API source: passed.
- Full dependency-based NestJS typecheck/build could not be executed in the generation environment because package installation timed out. Run `npm install` then `npm run typecheck --workspace services/api` locally before treating the phase as runtime-verified.

## Current runtime verification focus

Phase 2 buyer purchase flow reaches real order creation for COD: Cart → Checkout Preview → address/shipping/voucher validation → MongoDB transaction → Inventory reserve → Master Order/SubOrder → Order Item snapshots → order history → success screen. Payment/webhook + reservation expiry, seller ledger, refunds/returns, withdrawals, realtime chat/notifications and Seller Promotions are included in this package. Shop staff/RBAC, audit logs, object-storage upload and production hardening are now included. The remaining release gate is dependency-aware build/runtime verification and full browser E2E on a machine with Docker and npm registry access. See `docs/RUNTIME_INTEGRATION.md`.

## Buyer homepage UI update

This package includes the first approved production-style Buyer screen: the XIII homepage at `http://localhost:3000`. It uses real Next.js components/CSS and loads product/category data from the Phase 1 API. Run the seed again after updating so the 8 demo products and their local product artwork are available.

See `docs/UI_STATUS.md` for the exact UI implementation boundary. Screens not listed there should not be considered final UI yet.

## Buyer Search UI update

The Buyer Search / Category page is now a real implementation rather than a placeholder. It uses the approved XIII marketplace visual direction and persists filters in URL query parameters.

Supported product query parameters:

```text
q
category
brand
color
size
priceMin
priceMax
rating
sort=popular|newest|rating|price_asc|price_desc
page
limit
```

Example:

```text
http://localhost:3000/search?q=hoodie&category=ao-hoodie&priceMax=600000&sort=popular&page=1
```

Filtering and sorting are performed by the NestJS `/api/v1/products` endpoint against MongoDB product + variant data. See `docs/UI_STATUS.md` for the exact implementation boundary.

## Buyer Product Detail UI update

The approved Product Detail screen is now implemented at:

```text
http://localhost:3000/product/:slug
```

The page loads product, shop, brand, category, variant/SKU and inventory availability from the NestJS API and MongoDB. Color/size selection, price changes, stock state, quantity limits, seller summary, rating summary and related products are rendered from dynamic data.

The demo seed now includes multiple color/size SKUs for selected products so variant selection can be tested immediately.

`Add to cart` and `Buy now` persist the selected SKU and quantity to the authenticated buyer cart. Pricing and availability are re-read from Variant + Inventory on the backend. `Buy now` opens `/cart`, and the current package continues through real Checkout + COD order creation.


## Buyer Cart — first Phase 2 slice

The approved Cart direction is now implemented at `http://localhost:3000/cart`. Cart data is stored in MongoDB per authenticated user. It does not store a trusted product price snapshot: every cart read hydrates the current active ProductVariant, Product, Shop and Inventory data.

Implemented cart actions: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:variantId`, `DELETE /cart/items/:variantId`, `DELETE /cart`. The page groups lines by shop, updates/removes quantities, surfaces out-of-stock state, and computes current subtotal. Checkout, shipping fee, platform voucher calculation and COD order creation are implemented in the current package.


## Buyer Checkout + Order creation — Phase 2 slice 2

Implemented routes:

```text
POST /api/v1/checkout/preview
POST /api/v1/checkout/create
GET  /api/v1/orders
GET  /api/v1/orders/:orderCode
```

Checkout now validates the selected account-owned address, current Cart, active Product/Variant/Shop state, live Inventory, shipping method and optional platform voucher. `checkout/create` uses a MongoDB transaction to reserve stock and create the Master Order, one SubOrder per shop, immutable Order Item snapshots, InventoryTransaction records and OrderStatusHistory before clearing the cart.

The local MongoDB Docker service now runs as a single-node replica set (`rs0`) because MongoDB transactions require a replica set. Recreate infrastructure after updating:

```powershell
docker compose down
docker compose up -d
```

Demo vouchers after seeding:

```text
XIII120  -> 120.000đ off orders from 1.000.000đ
SHIP25   -> up to 25.000đ shipping discount from 299.000đ
```

The Buyer UI now includes `/checkout`, `/payment-result`, and `/order-success/:orderCode`. COD is enabled end-to-end. MoMo and VNPAY become selectable only when their required credentials are present in `.env`. Online orders reserve stock for a bounded payment window; verified provider IPN updates the order to `PAID`, while failed/expired payments cancel the online order and release reserved stock.


## Online payments — MoMo + VNPAY

Implemented routes:

```text
GET  /api/v1/payments/providers
POST /api/v1/payments/create
GET  /api/v1/payments/order/:orderCode
POST /api/v1/payments/webhooks/momo
GET  /api/v1/payments/webhooks/vnpay
```

The backend never trusts the browser redirect as proof of payment. MoMo IPN is verified with HMAC-SHA256 and VNPAY IPN with HMAC-SHA512. A successful verified callback moves Master Order/SubOrders from `PENDING_PAYMENT` to `PAID`. Failed or expired online payment releases `Inventory.reserved` back to `Inventory.available`, writes a RELEASE inventory audit event, reverses demo voucher usage, and cancels the unpaid order.

Online gateway credentials are intentionally **not** committed. Copy `.env.example` to `.env` and add credentials issued to your own sandbox merchant account. For local testing, provider servers cannot reach `localhost`; expose the API with a secure HTTPS tunnel and set `API_PUBLIC_URL` to that public origin. Configure the VNPAY merchant IPN URL to:

```text
https://<public-api-origin>/api/v1/payments/webhooks/vnpay
```

MoMo receives its IPN URL in the create-payment request from `API_PUBLIC_URL`. Keep `MOMO_SECRET_KEY` and `VNPAY_HASH_SECRET` server-only. The frontend receives only provider availability and the hosted payment URL.

Payment reservations default to 15 minutes (`PAYMENT_EXPIRES_MINUTES`). This package runs an idempotent periodic expiry sweep inside the API process for local/single-instance development. A production multi-instance deployment should move that scheduler to a single queue/worker (for example Redis/BullMQ) to avoid duplicated scheduling work.

## Buyer Orders update

Buyer order history/detail is now implemented at `/account/orders` and `/account/orders/:orderCode`. Buyer cancellation is transactional for `PENDING_PAYMENT` and COD `CONFIRMED` orders: inventory reservation and voucher usage are restored, and pending online Payment records are cancelled. Paid online orders deliberately require the future refund module instead of being silently cancelled. See `docs/BUYER_ORDERS.md`.

## Seller Order Management update

Seller fulfilment is now implemented at `http://localhost:3001`. The Seller Center has its own login, dynamic dashboard, scoped order list and SubOrder detail/action page. Seller API access is scoped by the authenticated user's resolved shop membership and `SubOrder.shopId`; the UI cannot use a guessed SubOrder code to access another shop's order. Owner/Manager/Staff permissions are enforced by the access-control layer.

Fulfilment is forward-only: `PAID -> CONFIRMED -> PACKING -> READY_TO_SHIP -> SHIPPED -> DELIVERED`. COD orders begin at `CONFIRMED`; online orders reach `PAID` only from a verified MoMo/VNPAY callback. `SHIPPED` requires a tracking code. Each transition writes an order-history record and recomputes the Master Order status across all shops in the same MongoDB transaction.

Run the static verification with:

```powershell
npm run verify:seller-orders
```

See `docs/SELLER_ORDERS.md` for endpoints and test flow.

## Seller Product + Inventory Management update

Seller catalog management is now implemented at `http://localhost:3001/products` and `http://localhost:3001/inventory`. Seller can create a Product with multiple initial SKU/Inventory rows atomically, edit product metadata, add/update/disable variants, adjust available stock and low-stock thresholds, filter inventory health, and inspect InventoryTransaction history.

New Product creation uses a MongoDB transaction across Product → ProductVariant → Inventory → initial IMPORT history. Seller deletion is soft (`HIDDEN`) so order/history references are not destroyed. Inventory editing includes an optimistic `expectedAvailable` guard so stale Seller screens cannot overwrite concurrent checkout stock changes. See `docs/SELLER_CATALOG.md`.


## Admin Product Review update

Admin moderation is now implemented at `http://localhost:3002`. The Admin app has its own authenticated login, moderation dashboard, product review queue, product detail/SKU inspection, approve/reject actions and immutable review history. Only `ADMIN`/`SUPER_ADMIN` can call `/api/v1/admin/products*`.

Seller catalog now completes the moderation lifecycle: `DRAFT/REJECTED -> PENDING_REVIEW -> ACTIVE|REJECTED`. Core product metadata cannot be edited while a product is under review; seller can withdraw to draft. Editing core metadata of an already ACTIVE product automatically sends it back to review. Rejection reason is displayed in Seller Product Editor.

See `docs/ADMIN_PRODUCT_REVIEW.md`.


## Return / Refund / Dispute update

Buyer, Seller and Admin after-sales workflows are now implemented. Buyer can create item-level return requests from eligible delivered/completed SubOrders, Seller can approve/reject and confirm receipt of a returned parcel, and Admin can resolve disputes and reconcile refunds. Inventory reversal and refund/payment accounting are transactional.

The package deliberately does **not** fake an online gateway refund. Admin must enter the real external refund/transfer reference before the internal Refund becomes `SUCCEEDED`; partial refunds use `PARTIALLY_REFUNDED` instead of incorrectly closing the full payment. See `docs/AFTER_SALES.md`.

Run:

```powershell
npm run verify:after-sales
```

## Realtime Buyer ↔ Seller chat + notifications

Realtime communication is now implemented with persisted MongoDB history plus Socket.IO delivery.

Buyer:

```text
http://localhost:3000/account/messages
http://localhost:3000/account/notifications
```

Seller:

```text
http://localhost:3001/messages
http://localhost:3001/notifications
```

The Socket.IO namespace is `/realtime`. Clients authenticate with the existing JWT access token during the handshake. The API then joins only the authenticated user's room; conversation rooms require an additional server-side Buyer/Seller ownership check before join/send/read operations.

Chat and notification records are durable: realtime events are not treated as the source of truth. Reloading the page reads the stored `conversations`, `chatmessages` and `notifications` collections again.

The current single-process/local configuration uses Socket.IO's in-memory adapter. Horizontal production deployment should add the Redis adapter so events cross API instances. See `docs/REALTIME_CHAT_NOTIFICATIONS.md`.

## Seller Finance / Commission / Withdrawal update

Seller finance is now implemented at `http://localhost:3001/finance`, with Admin payout operations at `http://localhost:3002/finance`.

The system uses a signed seller ledger instead of a directly editable balance. Checkout snapshots the current commission into each SubOrder. When Buyer confirms receipt, the completed SubOrder posts `SALE_GROSS` and `PLATFORM_FEE` entries. These remain `PENDING` until the settlement delay expires, then become `AVAILABLE`. Successful refunds post `REFUND_DEBIT` plus a proportional `FEE_REVERSAL` so refunded revenue and commission are reversed consistently.

Withdrawal requests reserve the seller's available amount while `REQUESTED/APPROVED/PROCESSING`. The ledger is debited only when Admin confirms the real bank transfer reference and marks the request `PAID`. Payout account numbers are AES-256-GCM encrypted and each withdrawal keeps an immutable encrypted payout snapshot.

The default policy is 5% commission, 7-day settlement, 100,000 VND minimum withdrawal. Admin can change these values for future checkout/settlement behavior without rewriting historical SubOrder fee snapshots.

Run the finance verifier with:

```powershell
npm run verify:finance
```

See `docs/SELLER_FINANCE.md` for the API and accounting lifecycle.


## Seller Promotions update

Seller Center now implements `/promotions` with seller vouchers and scheduled product campaigns. Shop vouchers support fixed/percentage discounts, minimum spend, usage caps, per-user limits and whole-shop/selected-product scope. Campaigns apply automatic fixed/percentage discounts to selected products or the whole shop. Buyer Product Detail displays current public offers and Checkout accepts one platform voucher plus one shop voucher per shop. Pricing snapshots preserve campaign/shop/platform discount allocation for later returns and seller-finance accounting. See `docs/PROMOTIONS.md`.


## Analytics & Reports update

Seller analytics is available at `http://localhost:3001/analytics` and Admin analytics at `http://localhost:3002/analytics`. Both use MongoDB aggregation over real marketplace collections and support 7/30/90-day UI ranges plus CSV export. Product-detail views are persisted as `AnalyticsEvent` records, enabling date-range order-per-view metrics. See `docs/ANALYTICS_REPORTS.md`.


## CMS / Homepage management

Admin now includes `http://localhost:3002/cms`. The Buyer homepage consumes `GET /api/v1/cms/home`; hero/promo/editorial banners, schedule windows, section visibility/order, categories and brands are controlled from MongoDB-backed Admin screens. See `docs/CMS_HOMEPAGE.md`.


## Shop Staff / Admin Permissions / Audit Logs

Fine-grained access control is now layered on top of JWT roles. Seller Center includes `http://localhost:3001/team` for shop team management. A shop can use `OWNER`, `MANAGER`, and `STAFF`; individual permissions govern product, inventory, order fulfilment, promotions, chat/reviews/returns, analytics, finance, withdrawals, settings, and team administration.

Admin access is managed at `http://localhost:3002/admins`. `SUPER_ADMIN` bypasses the permission profile; ordinary `ADMIN` users require an active profile for the requested module. Audit history is available at `http://localhost:3002/audit-logs`. Authenticated write requests are recorded with actor/route/status/resource metadata while request-body values are deliberately excluded from the audit record.

Development seed accounts (password `Xiii12345!`): `seller@xiii.local` (OWNER), `manager@xiii.local` (MANAGER), `staff@xiii.local` (STAFF), `admin@xiii.local` (SUPER_ADMIN), and `ops@xiii.local` (restricted ADMIN). These credentials are for local development only.

Run:

```powershell
npm run verify:access
```

See `docs/ACCESS_CONTROL_AUDIT.md`.

## Production hardening phase

The current source also includes security/deployment hardening: Redis-backed API rate limiting, strict CORS + Helmet headers, request IDs and structured logs, liveness/readiness probes, S3-compatible presigned image uploads, local MinIO, production Docker/Nginx samples, environment validation and MongoDB backup/restore scripts. See `docs/PRODUCTION_HARDENING.md` before deployment.

## Browser E2E automation

The repository now includes a Playwright Chromium suite for the critical real UI path: Buyer login → Product Detail → Cart → COD Checkout → Seller fulfilment → Buyer confirm receipt → Verified Purchase review → Admin order/review verification. Protected Buyer/Seller/Admin pages also have unauthenticated smoke coverage.

On a machine with Node.js, npm and Docker Desktop/Engine:

```powershell
npm install
npm run e2e:install
npm run e2e:stack
```

`e2e:stack` starts MongoDB replica set + Redis + MinIO, reseeds deterministic demo data, starts API + all three Next.js apps, waits for readiness, runs Playwright, and then stops the dev app process tree. Docker infrastructure remains running for fast reruns; use `docker compose down` when finished.

For an already-running stack, use `npm run e2e`. Failure traces/screenshots/videos are retained under `test-results/`, and the HTML report is available with `npm run e2e:report`. See `docs/E2E_BROWSER_TESTING.md`.

## Staging release

The repository now includes a production-like single-host staging topology and CI/E2E gates. Configure `.env.staging` from `.env.staging.example`, then run `npm run staging:preflight` and `npm run staging:deploy`. See `docs/STAGING_DEPLOY.md` and `docs/GO_LIVE_CHECKLIST.md`. Staging deployment never runs the development seed automatically.

## Rà soát v18: phối đồ và dữ liệu công khai

Xem [báo cáo sửa lỗi và giới hạn kiểm tra](docs/CODE_REVIEW_V18.md).
Bản này sửa lưu tùy chọn 2D/3D, URL artwork local, URL sản phẩm ổn định,
link giữa Buyer/Seller/Admin và trạng thái công khai của sản phẩm/SKU.
Mannequin 3D bổ sung các loại trang phục/phụ kiện và sửa hình học bị hở.
Các test hồi quy mới: `npm run test:outfit` và `npm run test:public-catalog`.

Dùng `NEXT_PUBLIC_WEB_URL` và `NEXT_PUBLIC_SELLER_URL` khi build Next trực tiếp.
Docker Compose truyền các giá trị này từ `WEB_URL` và `SELLER_URL`.
