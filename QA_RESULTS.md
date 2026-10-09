# Kiểm tra v12 — Nhận diện và trạng thái 3D

53/53 trường hợp Chromium đã qua: lượt đầy đủ qua 51 bài; hai bài chạy lại thành công sau khi giới hạn selector vào điều khiển màu đang hiển thị và chờ gallery tải xong trước khi hover. Mã production không đổi sau lượt đầy đủ. 7 kiểm tra đơn vị/hash, typecheck bốn workspace và build Buyer từ cache sạch qua. Đã kiểm tra pause loading ngoài viewport/ẩn tab, mobile 320 px, chọn đúng SKU và đo đích ảnh bay ở header đã đăng nhập. API/giỏ dùng fixture/mock; shader dùng SwiftShader, không chạy database/checkout/payment thật. Xem [báo cáo v12](docs/STREET_EDITION_V12_INTERFACE_3D.md).

# Kiểm tra v11 — Hoạt ảnh 3D trong mua sắm

48/48 Chromium (8 kiểm tra mới + 40 regression v10), 7 kiểm tra đơn vị/hash, typecheck cả bốn workspace và production build Buyer qua. Đã kiểm tra desktop/mobile 320 px, giảm chuyển động, lightbox, focus trong Quick View, chỉ phát hoạt ảnh sau thành công và retry từng món outfit. API/giỏ dùng fixture/mock; shader dùng SwiftShader. Không kiểm tra lại database/checkout/payment thật. Xem [báo cáo v11](docs/STREET_EDITION_V11_SHOPPING_MOTION.md).

# Kiểm tra v10 — Buyer web và ThreeUI 3D

40/40 Chromium và 7 kiểm tra đơn vị/hash qua; typecheck cả bốn workspace và production build Buyer qua. WebGL được render bằng SwiftShader, có kiểm tra timing, uniform xoay, DPR, giới hạn draw calls, cleanup context, fallback và shopping regression. Dữ liệu API/ghi mua sắm dùng fixture/mock; không kiểm tra lại checkout/payment/database thật. Xem [báo cáo v10](docs/STREET_EDITION_V10_WEB_3D.md).

# Kiểm tra v9 — Xem trước, chỉnh và tải ảnh

35/35 Chromium (12 workflow mới + 8 upload + 15 shopping regression), 16 unit/policy/size/hash checks, typecheck và production build cả bốn workspace qua. Verifier CMS/Seller catalog/reviews/after-sales/hardening qua. Đã sửa tràn ngang ô chọn file trên điện thoại. Fixture/mock cục bộ; không gọi object storage hoặc giao dịch MongoDB thật. Xem [báo cáo v9](docs/STREET_EDITION_V9_MEDIA.md).

# Kiểm tra v8.2 — Định dạng upload ảnh

23/23 Chromium (8 upload + 15 shopping regression), 13 kiểm tra đơn vị/policy/size/hash ThreeUI, typecheck và production build cả bốn workspace qua. Verifier CMS, Seller catalog và hardening qua. Upload dùng storage mock; policy API ký bằng credential giả, không gọi S3. Xem [báo cáo v8.2](docs/STREET_EDITION_V8_2_UPLOADS.md).

# Kiểm tra v8.1 — Sửa lỗi v8

Ba lỗi outfit đã tái hiện trước sửa; bản mới qua 36/36 kiểm tra Chromium, 21 kiểm tra đơn vị / regression, typecheck cả bốn workspace và production build Buyer. Verifier Seller catalog/auth-session qua. Dùng fixture và mock cho thao tác ghi; không chạy lại database/checkout/payment thật. Xem [chi tiết sửa lỗi](docs/STREET_EDITION_V8_1_FIXES.md). Các phần dưới là lịch sử.

---

# Kiểm tra bản v8 — Modern Shopping

Typecheck bốn workspace; production build Buyer và Seller. 26 bài đơn vị / regression qua (4 size, 3 nguồn ThreeUI, 14 client/session, 5 home). 30 trường hợp Chromium qua với fixture; các bài shopping/depth được xác minh lại sau khi điều chỉnh selector cho DOM streaming và cờ fixture. Không kiểm tra lại MongoDB, checkout, payment hoặc duyệt sản phẩm thật. Chi tiết: [STREET_EDITION_V8_SHOPPING.md](docs/STREET_EDITION_V8_SHOPPING.md). Các phần dưới là lịch sử.

---

# Kiểm tra bản v7 — 3D tích hợp

Typecheck bốn workspace, production build web và ba kiểm tra hash ThreeUI qua. 16 bài regression Chromium qua; năm bài mới về chiều sâu và thanh chỉnh qua trong lượt cuối. Shader thực sự render bằng SwiftShader. Kiểm tra với dữ liệu mẫu cục bộ, không chạy lại checkout/payment/MongoDB thật. Chi tiết: [STREET_EDITION_V7_3D.md](docs/STREET_EDITION_V7_3D.md). Các phần bên dưới là lịch sử.

---

# Kiểm tra bản v6 — ThreeUI 3D

Typecheck cả bốn workspace và production build web đã qua. Ba kiểm tra hash nguồn ThreeUI qua. Chromium kiểm tra 16 trường hợp với catalog/CMS fixture cục bộ, bao gồm vẽ pixel WebGL, đổi màu, pause, visibility, fallback, context loss và responsive. WebGL chạy bằng SwiftShader trong môi trường không có GPU. Báo cáo và ảnh mới: [STREET_EDITION_V6_3D.md](docs/STREET_EDITION_V6_3D.md).

Lượt v6 không chạy lại checkout/database/payment thật. Phần v5/v4 dưới đây là lịch sử.

---

# Kiểm tra bản v5 — ThreeUI

Bản cập nhật này qua typecheck và production build cả bốn workspace; web được build lại sau thay đổi cuối. Các bài unit/regression: 14 session/API client + 5 dữ liệu home + 24 schema + 1 nguồn ThreeUI. Kiểm tra trình duyệt hiện tại dùng API fixture cục bộ cho catalog/CMS; không chạy lại giao dịch với MongoDB thật. Kết quả và hình ảnh mới xem [STREET_EDITION_V5_THREEUI.md](docs/STREET_EDITION_V5_THREEUI.md).

---

Báo cáo v4 dưới đây được giữ để tham khảo lịch sử; các kết quả runtime trong phần này không phải lượt kiểm tra mới của v5.

# XIII — kết quả kiểm tra ngày 07/10/2026

## Bản Street Edition v4

Bộ E2E đầy đủ **41/41 PASS**, không skip hoặc flaky: 33 bài v3 và 8 bài mới về đơn mua, đánh giá, bản nháp chat, phản hồi chậm/mất kết nối, mobile, tải trực tiếp trang tài khoản và hủy nhập lý do trong chi tiết đơn. Chạy với API và Web build mới trên MongoDB replica set tách biệt; Seller/Admin dùng build đã qua trước đó.

Sau chỉnh màu chữ tab đánh giá, Web được build sạch lại; chụp lại 10 trang trên desktop/mobile và chạy lại riêng 8/8 E2E tài khoản/chat, đều PASS. Hai báo cáo JSON được giữ riêng trong `docs/qa/e2e-full-v4.json` và `docs/qa/e2e-account-final-v4.json`. Log dạng list của lượt đầy đủ bị ngắt phần cuối khi thu thập; số lượng và trạng thái lấy từ báo cáo JSON hoàn chỉnh.

Đã chạy 35/35 runtime checks, 22/22 bộ kiểm tra cấu trúc, 5/5 kiểm thử dữ liệu trang chủ, 7/7 kịch bản phục hồi/bố cục, 14/14 regression API client và typecheck từ mã nguồn sạch không có `.next`/`dist`. 4/4 tình huống lọc shop tiếp tục PASS. TypeScript của bản đóng gói được so khớp với mã nguồn sạch đã typecheck.

Schema 24/24 và audit production là bằng chứng giữ từ lượt sửa trước cùng ngày; v4 không đổi API, schema hay dependencies. Các bài phục hồi dùng phản hồi chậm/lỗi và một số nội dung mẫu tiêm vào trình duyệt; E2E thương mại hiện có vẫn ghi dữ liệu thật bằng API/MongoDB trong môi trường thử nghiệm.

Ảnh cuối gồm Home, catalog, login, product, cart, checkout, notifications, chat, orders và reviews trên desktop/mobile, cùng hộp xác nhận xóa giỏ. Chat có tin gửi và trả lời shop qua API thật. Không có ảnh lỗi, `pageerror` hoặc tràn ngang ở các trang được chụp. Ảnh hộp hủy đơn và bài chat bấm nhanh dùng fixture kiểm thử. Mua thử dùng COD, không thanh toán bên ngoài.

## Kết quả cuối cùng

| Phần kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| Typecheck | PASS | Buyer, Seller, Admin, API |
| Typecheck bản mã nguồn sạch | PASS | Không có `.next` hoặc `dist`; dùng dependencies đã cài |
| Production build | PASS | Ba giao diện Next.js và API NestJS |
| Regression API client / bộ lọc / điều hướng | 14/14 PASS | Lỗi mạng, cạnh tranh refresh, logout, HTTP 204, Headers, giá không nhập |
| Regression schema | 24/24 PASS | 107 trường ID liên kết trong 24 file; xác nhận chuỗi ID được cast thành BSON ObjectId |
| Bộ kiểm tra cấu trúc hiện có | 22/22 PASS | Các lệnh `verify:*`; đây là kiểm tra cấu trúc, không thay thế kiểm thử runtime |
| Runtime smoke | 35/35 PASS | Endpoint công khai, Buyer/Seller/Admin, địa chỉ mẫu, logout và refresh bị thu hồi |
| Chromium E2E | 41/41 PASS + 8/8 kiểm tra lại ở build cuối | Các thao tác thực tế trên trình duyệt với API và MongoDB |
| Dependency audit production | 0 lỗ hổng được báo | `npm audit --omit=dev`, theo cơ sở dữ liệu tại thời điểm kiểm tra |
| Kiểm tra hiển thị | PASS ở các trang đã thử | 10 trang và hộp xác nhận trên desktop/mobile; thêm catalog/product 320 px, bộ lọc 680 px và home 320/768 px |

Các E2E đã đi qua: đăng nhập/đăng xuất ở ba vai trò; hết hiệu lực refresh; mua COD; Seller đóng gói và giao hàng; Buyer xác nhận nhận hàng và gửi đánh giá; Admin tìm đơn hoàn tất và đánh giá; trang bảo vệ chưa đăng nhập; yêu thích và tải lại; mobile; bấm thêm giỏ nhiều lần; đổi vận chuyển khi báo giá đang chạy; refresh rotation/phát lại đồng thời; chặn redirect ngoài; banner không chồng chữ; đăng ký/hiện mật khẩu; hủy đơn COD.

Trong lượt mua thử, đơn đã đi từ CONFIRMED → PACKING → READY_TO_SHIP → SHIPPED → DELIVERED → COMPLETED. Bài hủy đơn xác minh trạng thái CANCELLED từ giao diện.

## Môi trường và bằng chứng

- Node.js, MongoDB 7.0.14 replica set thật, dữ liệu mẫu trong database tách biệt; NestJS và ba ứng dụng Next.js chạy cục bộ.
- Các production build của giao diện được tạo thành công và dùng lại trong lượt E2E cuối; API được build lại sau sửa transaction.
- Chromium chạy tự động, video tắt trong môi trường kiểm thử này; cấu hình mặc định của dự án vẫn giữ trace, ảnh và video khi kiểm thử thất bại.
- Không thấy `pageerror` hoặc tràn ngang ở các trang/viewport được chụp.
- Log và ảnh nằm trong [docs/qa](docs/qa). Bản phát hành không chứa dependencies, build cache hoặc database thử nghiệm.

## Giới hạn

Các kiểm tra này không khẳng định mọi tình huống đều không còn lỗi. Chưa chạy merchant MoMo/VNPAY thật, IPN công khai, S3/MinIO, Redis vận hành hoặc Docker/PowerShell trực tiếp trên Windows. Wishlist lưu tại trình duyệt, chưa đồng bộ thiết bị. Logout thu hồi refresh token; access token đã cấp vẫn theo thời hạn JWT hiện có.

## Cập nhật

Xem [thay đổi v4](docs/STREET_EDITION_V4.md) và [hướng dẫn cập nhật Street Edition](docs/STREET_EDITION.md). Nếu có dữ liệu cũ, dùng `UPDATE_XIII_WINDOWS.bat` để bỏ qua seed, rồi đăng nhập lại để nhận định dạng refresh token mới.
