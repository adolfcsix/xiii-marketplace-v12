# QA v16 — 2026-10-08

## Đã kiểm tra

- Typecheck web/seller/admin/API: PASS.
- Production build web và seller sau cập nhật: PASS.
- 41 bài kiểm thử TypeScript: PASS, gồm màu/danh mục/tài khoản và phân loại áo khoác riêng.
- 41 kịch bản Playwright khác nhau đã đạt qua các lần chạy, dùng Chromium và catalog fixture:
  - 6 kịch bản Dress Up mới: năm lớp áo trong/áo khoác; tuỳ chỉnh khuôn mặt/tóc; bộ phối cũ; artwork theo SKU/dáng; seller lưu và kiểm tra URL; phân trang; upload đúng khung và khóa đích SKU.
  - 9 Fit Studio: lưu/mở bộ phối, tách tài khoản, lỗi dữ liệu, artwork lỗi, mobile/keyboard, chống gửi trùng, chuyển tài khoản trong batch và tắt chuyển động.
  - 15 shopping tools: Quick View, đúng biến thể, giá/tồn kho, bản nháp lỗi mạng, size, bảng size seller, mobile, focus, lỗi/timeouts.
  - 3 button feedback; 8 shopping motion.
- 320px và 390px: không tràn ngang; mẫu hiện đầy đủ khi duyệt tủ đồ, áo trong/áo khoác giữ độc lập.
- Đã sửa lỗi hồi quy hoạt ảnh giỏ sau đổi bố cục: khi ảnh món nằm ngoài viewport, ảnh bay xuất phát từ nút thêm; chỉ chạy sau xác nhận API thành công. Thanh đầu trang vẫn sticky trên desktop để đích giỏ nằm trong viewport.
- Khung artwork SVG trung tính/nam/nữ có kích thước 360 × 620, cùng hệ tọa độ với mẫu.
- ZIP kiểm tra CRC và giữ đủ file gốc; không đóng gói node_modules/cache/build/logs.

## Cách xác minh và giới hạn

Playwright dùng `e2e/fixtures/shopping-server.cjs`; ghi giỏ, upload và lưu artwork được mock. Trong quá trình phát triển có các test thất bại; đã sửa selector/test khởi tạo dữ liệu và lỗi hồi quy giao diện, sau đó chạy lại các trường hợp liên quan đến khi đạt. Các con số trên tính theo kịch bản khác nhau, không cộng các lượt chạy lặp.

Không chạy lại hệ thống MongoDB/Redis/MinIO thật, thanh toán và đơn hàng toàn tuyến trong phiên này. Không khẳng định không còn lỗi production. Các QA v15/v15.1 là lịch sử kiểm tra khác.

Chưa có artwork đúng mẫu cho toàn bộ catalog. Ảnh gallery giữ nguyên và là nguồn đối chiếu; món chưa gắn artwork dùng minh hoạ. Kiểm tra kích thước và hai góc alpha không chứng nhận artwork giống hàng bán; shop cần đối chiếu trước khi gửi duyệt. URL dán tay chưa kiểm tra kích thước/alpha trước khi lưu.

Chưa có 3D xoay mẫu, mô phỏng size thật, thử đồ ảnh người dùng, AI tự tạo artwork hoặc đồng bộ bộ phối nhiều thiết bị.

## Ảnh chụp

`docs/qa/v16/dress-up-desktop.png`, `dress-up-mobile-320.png`, `dress-up-mobile-390.png`, cùng các ảnh Fit Studio v16. Ảnh fixture minh hoạ tính năng, không phải hình sản phẩm mới đã đưa vào cửa hàng thật.
