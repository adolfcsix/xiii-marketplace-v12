# XIII — Rà soát và sửa lỗi bản v18

## Phạm vi

Rà cú pháp và import nội bộ của toàn bộ nguồn web, Seller, Admin, API, shared,
test và công cụ kiểm tra. Kiểm tra thêm các luồng phối đồ, lưu bộ phối, chỉnh
sản phẩm, trạng thái công khai của shop/sản phẩm/SKU, link giữa các ứng dụng,
đăng nhập và cấu hình triển khai.

## Đã sửa

1. **Lưu chế độ 2D/3D:** đọc được cả dữ liệu cũ dạng chuỗi và dữ liệu JSON mới.
   Lựa chọn không còn tự về 3D do lệch định dạng khi tải lại trang.
2. **Artwork ở máy local:** cùng một quy tắc URL được dùng trong Seller và Buyer.
   Artwork từ MinIO localhost/127.0.0.1:9000 được hiển thị; URL không hợp lệ
   không được dùng. Artwork SKU lỗi có thể trở về artwork sản phẩm hợp lệ.
3. **Đường dẫn sản phẩm ổn định:** đổi tên/chỉnh nội dung không tự đổi slug.
   Link sản phẩm và tham chiếu trong bộ phối đã lưu tiếp tục hoạt động khi
   sản phẩm được duyệt lại và công khai.
4. **Bỏ thương hiệu:** chỉnh danh mục đồng thời bỏ thương hiệu không kiểm tra
   nhầm thương hiệu cũ đã bị vô hiệu hoá.
5. **Dữ liệu công khai:** danh sách và chi tiết sản phẩm không công khai shop
   không hoạt động. Endpoint SKU không trả dữ liệu của sản phẩm nháp, ẩn,
   chờ duyệt, bị từ chối hoặc của shop không hoạt động.
6. **Link Seller/Admin:** dùng địa chỉ Buyer/Seller cấu hình thay vì trỏ cứng
   về localhost. Docker build và các mẫu môi trường truyền địa chỉ công khai
   đến ứng dụng Next. Ảnh dự phòng dùng tài nguyên của chính ứng dụng.
7. **Mannequin 3D:** thêm hình minh hoạ quần đùi, váy, áo khoác, tay áo dài,
   hoodie, boots, mũ, túi, kính và dây chuyền. Nối phần eo/hông, sửa hướng mặt
   của lưới và mặt quay lưng; logo phía trước không hiện xuyên ra sau.
   Màu hex 3 ký tự nhận ánh sáng đúng. Lưới được lưu trong bộ nhớ khi chỉ
   xoay góc nhìn; các cạnh tam giác được xử lý để giảm đường hở khi vẽ.
8. **Nhãn 2D/3D:** thẻ món ở chế độ 3D không báo rằng đang dùng ảnh mặc thử
   2D. Giải thích cho khách được viết bằng ngôn ngữ dễ hiểu.
9. **Kiểm tra bảng size:** tách xác thực dữ liệu khỏi component giao diện,
   để dùng và kiểm tra độc lập.

## Kết quả kiểm tra trong phiên này

- Phân tích 393 file JS/TS/TSX: không lỗi cú pháp và không thiếu import nội bộ.
- 54 test trong 11 file: 0 thất bại. Bao gồm logic dữ liệu sản phẩm, phiên đăng
  nhập Buyer/Seller/Admin, xử lý ảnh, size, hiệu ứng ThreeUI, tùy chọn phối đồ,
  URL artwork, hình học mannequin, trạng thái công khai và cấu hình AI.
- Các kiểm tra tĩnh runtime-readiness, hardening, auth-session, Windows runner,
  tài nguyên E2E và staging/deploy: qua.
- Renderer Canvas gốc được chạy độc lập để tạo và xem ảnh trước/sau của ba
  bộ phối. Hình nằm trong `docs/qa/review-v18/`.
- Log test nằm trong `docs/qa/review-v18/unit-tests.log`.

### Giới hạn của kết quả

Dependency trong workspace chưa đầy đủ. Npm registry không truy cập được
(proxy không hoạt động và DNS trực tiếp không giải quyết được tên miền).
Vì vậy chưa chạy được `tsc`, Next/Nest build hay toàn bộ stack thực tế.

47 test logic frontend/pure helper chạy bằng bộ chuyển đổi TypeScript sang
JavaScript có sẵn trong runtime. 7 test logic API/config chạy với phần trang trí
DI được bỏ qua và lớp framework thay thế cho test; không kiểm tra Nest khởi
động hay giao dịch MongoDB. Đây không phải kết quả build TypeScript đầy đủ.

Trình duyệt local không khởi động được trong môi trường này. Ảnh QA dùng
renderer Canvas gốc với canvas native; không phải kiểm thử giao diện React
hay E2E trên trình duyệt.

Chưa xác nhận giao dịch mua hàng, thanh toán, upload S3/MinIO hoặc AI với
máy chủ thật. Các phần này cần MongoDB replica set, Redis, kho ảnh và cấu hình
provider tương ứng. Không kết luận toàn bộ hệ thống đã hết lỗi hoặc sẵn sàng
đưa vào vận hành chỉ từ những kiểm tra trên.

## Các lệnh kiểm tra trên máy đã cài dependency

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:regressions
npm.cmd run test:outfit
npm.cmd run test:public-catalog
npm.cmd run test:ai-artwork
npm.cmd run e2e
```

E2E cần stack, seed và biến môi trường theo tài liệu E2E hiện có. `test:outfit`
và `test:public-catalog` được thêm cho các hồi quy trong lần rà soát này.

## Trạng thái AI và 3D

AI hiện có luồng thử nghiệm tạo ảnh áo 2D từ ảnh SKU, cần shop đối chiếu và
chấp nhận. AI chỉ chạy khi cấu hình máy chủ và kho ảnh đầy đủ. Chế độ 2D dùng
ảnh mặc thử của shop khi có; chế độ 3D dùng lưới minh hoạ màu/phom.

Chưa có tái dựng trang phục 3D chính xác từ ảnh sản phẩm, dựng mặt khuất từ AI,
hay mô phỏng độ vừa theo số đo. Một ảnh mặt trước vẫn đủ để đăng sản phẩm;
ảnh góc khác là tùy chọn để khách đối chiếu thêm.

## Rà sâu tiếp theo — SKU, tồn kho và thao tác thử lại

### Các lỗi đã sửa

- Tạo SKU riêng lẻ và tạo inventory dùng chung một MongoDB transaction.
  Inventory thất bại không để lại SKU mồ côi làm lần thử lại bị trùng mã.
- Điều chỉnh tồn kho và ghi lịch sử dùng chung transaction. Lỗi ghi lịch sử
  hoàn tác số tồn, thay vì để tồn mới mà không có dấu vết đối chiếu.
- Số tồn trước điều chỉnh được đọc trong transaction, dùng điều kiện cập nhật
  theo số vừa đọc. `expectedAvailable` sai trả xung đột; `reserved` và `sold`
  được giữ nguyên. Cấu hình MongoDB replica set hiện có vẫn là điều kiện chạy.
- Seller ghi nhận ID SKU ngay khi API tạo SKU thành công, trước request cập
  nhật tồn kho. Khi request tồn kho lỗi, thử lại cập nhật ID đã có thay vì tạo
  lại cùng mã. Những thao tác lưu SKU, lưu sản phẩm và gửi duyệt được chặn
  trong khi thao tác lưu khác đang chạy.
- Mã SKU rỗng/toàn khoảng trắng bị từ chối. Cập nhật mã `null` không gây lỗi
  `.trim()`; xung đột unique index khi tạo/chỉnh SKU trả `SKU_EXISTS`.
- Giá bán trống, giá gốc không hữu hạn/âm, khối lượng âm và ngưỡng tồn kho
  không nguyên bị từ chối ở Seller. Giá 0 và ngưỡng 0 vẫn hợp lệ.
- Xoá giá gốc trong Seller gửi `null` có chủ đích; API xoá giá gốc cũ, giữ
  nguyên giá bán. Trước đây trường bị bỏ khỏi JSON nên giá cũ vẫn tồn tại.

### Bằng chứng và giới hạn

- **76/76 bài kiểm tra logic qua:** 51 bài TypeScript cho các helper/giao diện
  và 25 bài API với model/session giả lập. Log: `docs/qa/review-v18/deep-review-tests.log`.
- Các test mới: `tests/inventory-atomicity.cjs`, `tests/seller-variant.test.ts`.
  Có ca lỗi tạo inventory, lỗi ghi lịch sử, xung đột số tồn, trùng mã và thử lại
  sau lỗi request tồn kho. Session giả lập kiểm tra cách service dùng transaction;
  chưa chứng minh rollback hoặc isolation trên MongoDB thật.
- Parse thành công 396 file nguồn JS/TS; kiểm tra runtime-readiness, hardening,
  auth/session, tài nguyên E2E, Windows runner và tài nguyên staging đều qua.
- Chạy test logic bằng Babel có sẵn; test API dùng framework/model giả lập.
  Đây không phải TypeScript typecheck, Nest boot hoặc build production.
  Chưa xác nhận E2E, MongoDB/Redis, kho ảnh, thanh toán hay AI provider thật.
- Tình huống server đã ghi thành công nhưng client mất phản hồi vẫn cần đối
  chiếu lại dữ liệu; chưa có idempotency key cho mọi thao tác Seller.

Trên máy có dependency và stack, chạy thêm:

```powershell
npm.cmd run test:inventory
npm.cmd run test:seller-variant
npm.cmd run test:commerce
npm.cmd run typecheck
npm.cmd run build
npm.cmd run e2e
```
