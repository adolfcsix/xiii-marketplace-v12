# Street Edition v8 — Phối đồ, Quick View và gợi ý kích cỡ

Bản đầy đủ trên nền v7, giữ các hiệu ứng 3D cùng Buyer, Seller, Admin và API. Không thêm dependency, dịch vụ AI hoặc tài khoản bên ngoài.

## Dùng các tính năng mới

### Phòng phối đồ

Mở “Phòng phối đồ” trên thanh điều hướng hoặc nút “Phối gu của bạn” trong banner. Trang `/outfit` có bốn vị trí áo, quần, giày và phụ kiện. Chọn vị trí rồi tìm sản phẩm, mở xem nhanh và chọn màu / size còn hàng. Bạn tự quyết định món nào nằm ở vị trí nào; giao diện không tự phân loại sai tên danh mục của shop.

Bạn có thể đổi lựa chọn hoặc gỡ từng món. Một biến thể không xuất hiện hai lần trong cùng outfit. Tạm tính dùng giá biến thể được chọn, chưa gồm vận chuyển và ưu đãi khi checkout. Outfit lưu các tham chiếu sản phẩm / biến thể trên thiết bị; khi mở lại, thông tin và giá được tải lại từ API. Các bản nháp chưa chỉnh sửa được giữ nếu kết nối làm quá trình khôi phục thất bại.

“Thêm các món vào giỏ” yêu cầu đăng nhập. Ứng dụng kiểm tra lại toàn bộ giá và tồn kho trước khi gửi các món. Nếu giá đổi, bạn cần mở lại lựa chọn để xác nhận giá hiện tại. Mỗi món dùng endpoint giỏ hàng hiện có, với số lượng một. Đây là các yêu cầu nối tiếp, không phải giao dịch nguyên tử cho cả bộ. Nếu có lỗi giữa chừng, món đã thành công được giữ trong giỏ và không gửi lại khi thử tiếp trong phiên này. Nếu mất phản hồi sau khi máy chủ đã xử lý một yêu cầu, cần kiểm tra giỏ trước khi thử lại; endpoint hiện có không cung cấp khóa idempotency.

### Quick View

Nút “Xem nhanh” xuất hiện trên thẻ sản phẩm ở trang chủ, tìm kiếm và các khu vực dùng ProductCard. Cửa sổ chỉ tải khi được mở, lấy sản phẩm và biến thể hiện tại, cho chọn màu / size, xem giá và thêm một món vào giỏ. Có liên kết sang trang chi tiết hoặc phối đồ với món này. Có trạng thái tải, thử lại khi lỗi, nút đóng và hỗ trợ Esc; đóng xem nhanh trên thẻ sẽ trả focus về nút đã mở.

### Gợi ý kích cỡ

Mở mục “Gợi ý kích cỡ cho bạn” ở trang chi tiết hoặc Quick View. Khi shop đã cung cấp bảng, nhập chiều cao (cm), cân nặng (kg) và lựa chọn ưu tiên rộng khi nhiều dòng cùng phù hợp. Kết quả dựa trên khoảng của shop, không phải suy đoán AI hoặc bảng chung cho mọi brand. Chỉ áp dụng size còn hàng của màu đang chọn. Nếu ngoài bảng hoặc hết hàng, giao diện giải thích để bạn hỏi shop.

Nếu chưa có bảng, giao diện hướng dẫn đo món đang mặc vừa và hỏi shop, không tạo một size giả. Chiều cao / cân nặng được giữ trong trạng thái cửa sổ đang mở, không lưu vào hồ sơ người dùng.

## Seller nhập bảng kích cỡ

Trong tạo / sửa sản phẩm, dùng bảng “Bảng gợi ý kích cỡ”. Thêm tên size, chiều cao từ / đến, cân nặng từ / đến. Nhập theo thứ tự size nhỏ đến lớn để tùy chọn ưu tiên rộng dùng dòng phù hợp lớn hơn. Số đo phải dương và khoảng từ không lớn hơn khoảng đến. Tối đa 30 dòng; tên size cần khớp với SKU của sản phẩm. Xóa hết dòng để bỏ gợi ý chiều cao / cân nặng. Bảng không thay thế số đo chi tiết của áo, quần hoặc giày.

Bảng lưu ở `product.attributes.sizeChart` qua API sản phẩm hiện có. Editor giữ những thuộc tính khác như form dáng khi cập nhật, và khóa bảng trong lúc sản phẩm đang chờ duyệt. Sản phẩm đang bán tiếp tục đi qua quy trình xét duyệt hiện có sau chỉnh sửa.

## Cập nhật Windows

Giữ cấu hình môi trường và dữ liệu của bạn, giải nén toàn bộ bản mới vào thư mục dự án và chạy `UPDATE_XIII_WINDOWS.bat` theo hướng dẫn hiện có. Bản này cần rebuild Buyer và Seller. Không cần seed lại dữ liệu để có giao diện mới. Bảng size cần shop nhập; không tự gán số đo vào sản phẩm thật.

## Xác minh

- Typecheck bốn workspace; production build Buyer và Seller.
- 4 bài size advice, 3 kiểm tra hash ThreeUI, 14 client/session regression và 5 home-data.
- 30 trường hợp Chromium qua với catalog/CMS/product/variant fixture cục bộ. Sau điều chỉnh cách chọn sản phẩm trong test và cờ fixture, 14 trường hợp shopping/depth được chạy lại. Bao gồm giá đổi, retry sau lỗi thêm giỏ, lưu outfit, thiếu bảng size, Seller lưu bảng và giữ thuộc tính, Quick View, focus/keyboard, màn hình 320px và hiệu ứng WebGL.
- API giỏ/Seller trong các bài mới được kiểm tra bằng phản hồi mẫu; không chạy giao dịch checkout, thanh toán, MongoDB hoặc duyệt sản phẩm thật. Báo cáo và ảnh chụp: `docs/qa/shopping-v8/`.

## Chạy kiểm tra giao diện với dữ liệu mẫu

`shopping-tools.spec.ts` chỉ chạy khi `E2E_SHOPPING_FIXTURE=1` để các SKU/tài khoản mẫu không áp dụng vào dữ liệu thật. Fixture nằm ở `e2e/fixtures/shopping-server.cjs`; nó chỉ mô phỏng API cho kiểm tra, không phải backend của XIII.

Trong môi trường thử nghiệm riêng, dừng API thật trên cổng 4000, chạy fixture bằng `node e2e/fixtures/shopping-server.cjs`, rồi mở Buyer trên 3100 và Seller trên 3101 với các cấu hình API mặc định. Các tiến trình cần ở cùng môi trường mạng.

Ví dụ PowerShell sau khi đã build và mở các tiến trình thử nghiệm:

```powershell
$env:E2E_SHOPPING_FIXTURE='1'
$env:E2E_WEB_URL='http://127.0.0.1:3100'
$env:E2E_SELLER_URL='http://127.0.0.1:3101'
npm.cmd run e2e -- shopping-tools.spec.ts
```

Các bài fixture này được bỏ qua trong full-stack E2E mặc định. Các kiểm tra đơn vị size và nguồn ThreeUI được thêm vào CI.
