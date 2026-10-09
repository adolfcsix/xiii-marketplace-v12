# Street Edition v12 — Chiều sâu cho nhận diện và trạng thái web

Bản đầy đủ nối tiếp v11. Giữ Energy Orb/Constellation cùng file nguồn ThreeUI và bản quyền MIT; không thêm dependency, CDN hoặc WebGL context. Các phần mới dùng CSS perspective/transform và vòng pointer depth chung.

## Thay đổi

- Logo header giữ chữ XIII và liên kết về trang chủ. Thêm chiều dày qua bóng chữ, nghiêng theo chuột và ánh bạc lướt qua khi hover/focus. Không trì hoãn điều hướng hoặc tạo vòng xoay liên tục.
- Nút chọn màu có viên màu dạng cầu với ánh sáng/bóng đổ. Viên màu đang chọn nâng lên khi chuyển động bật. Giữ chữ tên màu, aria-pressed và cơ chế khóa khi thêm giỏ; hình ảnh/SKU vẫn lấy từ biến thể thật. Không suy đoán màu cho SKU thiếu dữ liệu.
- StateSculpture dựng túi từ mặt trước, cạnh, đáy và quai bằng CSS. Dùng trong route loading trang chủ/chi tiết sản phẩm và trạng thái giỏ: tải, khách chưa đăng nhập, trống. Mô hình trang trí aria-hidden, không thêm nút hoặc lời thông báo trùng lặp. Loading giữ role=status; lỗi mạng vẫn là lỗi có nút thử lại.
- Túi tải chuyển động bằng CSS chỉ khi IntersectionObserver xác nhận trong viewport và document không hidden. Khi tắt chuyển động hoặc giảm chuyển động hệ thống, túi tĩnh. Túi ở trạng thái trống chỉ có một chuyển tiếp xuất hiện, không chạy vòng lặp lâu dài. Không có requestAnimationFrame hoặc GPU context mới.
- Sửa bug v11: CartFlight chọn .bag-link đầu tiên nên sau đăng nhập có thể bay tới Tin nhắn. Nay tìm đúng .bag-link[href="/cart"]. Kiểm thử đo tọa độ điểm kết thúc với tâm biểu tượng giỏ, trong header có cả Tin nhắn và Thông báo.

Các hình khối là chiều sâu của giao diện CSS, không phải mô hình sản phẩm 360° hay file GLB/glTF.

## Kiểm chứng

**53/53 trường hợp Chromium đã xác minh, 7/7 kiểm tra đơn vị/hash, typecheck bốn workspace và production build Buyer từ cache sạch qua.** Lượt đầy đủ qua 51 bài; hai bài chạy lại thành công sau khi giới hạn selector vào ô màu đang hiển thị và chờ gallery tải xong trước khi hover, tránh DOM ẩn và trạng thái loading của streaming. Không sửa mã production sau lượt đầy đủ.

Năm trường hợp mới về logo/điều hướng, đổi màu/SKU và khóa trong lúc gửi, pause loading ngoài màn hình/ẩn tab, giảm chuyển động/mobile 320 px, đích ảnh bay khi đăng nhập. Chạy cùng 48 kiểm tra v11 về gallery, outfit, giỏ, shopping và ThreeUI. Typecheck bốn workspace; production build Buyer. Bảy kiểm tra đơn vị/hash giữ nguồn ThreeUI và ngân sách/timing runtime.

Catalog dùng fixture; thao tác giỏ dùng mock, không chạy database/checkout/payment thật. Các ảnh khác màu trong fixture chỉ phục vụ xác minh thay đổi src/SKU, không phải dữ liệu sản phẩm mới. WebGL dùng SwiftShader phần mềm; không thay thế đo FPS trên điện thoại thật. Báo cáo và ảnh nằm trong docs/qa/threeui-v12.

## Cập nhật

Giải nén bản đầy đủ vào thư mục mới, giữ .env, chạy UPDATE_XIII_WINDOWS.bat. Không có migration database. Các chức năng Seller/Admin, upload/chỉnh ảnh và mua sắm của các bản trước được giữ lại.
