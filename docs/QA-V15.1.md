# QA v15.1 — Rà soát và sửa lỗi, 2026-10-08

## Lỗi đã sửa

- Nhận diện màu tiếng Việt: `Đen` giờ được chuẩn hoá đúng; `Denim` không còn bị hiểu nhầm là màu đen.
- Phân loại danh mục tiếng Anh dạng số nhiều (Shoes, Sneakers, Boots, Accessories, Shirts, Skirts…).
- Ưu tiên màu biến thể đã chọn thay vì ghi đè bằng màu mặc định artwork; hỗ trợ màu hex 3/6 ký tự.
- Dữ liệu avatar hoặc danh sách bộ phối hỏng không còn chặn bản nháp outfit hợp lệ khôi phục.
- Nhận diện tài khoản ưu tiên `sub` trong token, tránh sử dụng thông tin profile cũ; profile JSON hỏng không đẩy tài khoản về vùng lưu khách.
- Chọn lại SKU vừa thêm giỏ không xoá trạng thái thành công để gửi trùng trong cùng phiên phối.
- Batch thêm giỏ dùng chung giới hạn thời gian và huỷ khi rời phòng phối đồ/đổi tài khoản; không tiếp tục gửi các món còn lại sang tài khoản mới.
- Nút bo tròn loại bỏ transition khi tắt chuyển động thủ công, thay vì bị CSS độ ưu tiên cao ghi đè.

## Kết quả kiểm tra

- Typecheck toàn workspace: PASS (web, seller, admin, API).
- Build production toàn workspace: PASS; web được build lại sau sửa: PASS.
- 40 bài kiểm thử TypeScript: PASS (auth/session, catalog, upload, size, shader, màu/danh mục/tài khoản outfit).
- 32 bài kiểm thử API/schema/storage/realtime: PASS, chạy sau khi build API.
- 22 script `tools/verify-*.mjs`: PASS. Đây là kiểm tra cấu trúc, không thay thế thử nghiệm hệ thống thật.
- 62 kịch bản Playwright: PASS:
  - 32 kịch bản Fit Studio, nút, Quick View, gallery, size, giỏ, giá/tồn kho, lỗi mạng, bố cục 320/390px.
  - 27 kịch bản upload/cắt/xoay ảnh, ảnh SKU/shop/banner/review/return, giới hạn file, lỗi storage, giao diện chuyển động và trang yêu cầu đăng nhập.
  - 3 kiểm tra bổ sung: tắt chuyển động thủ công; đổi tài khoản trong batch giỏ; seller lưu bảng size và từ chối khoảng đảo ngược.
- ZIP cuối được kiểm tra CRC và đối chiếu đủ các file nguồn từ bản đầu vào, không đóng gói node_modules, cache build hay log kiểm thử.

## Giới hạn xác minh

Playwright dùng catalog fixture và mock thao tác ghi/upload. Không có Docker trong môi trường này; chưa chạy MongoDB, Redis, MinIO và quy trình thanh toán/đơn hàng/realtime toàn tuyến bằng dịch vụ thật. Chưa xác minh MinIO trên máy Windows của người dùng hay triển khai production. Không khẳng định dự án hoàn toàn không còn lỗi.

Fit Studio vẫn là nhân vật minh hoạ 2D theo màu/kiểu dáng, có metadata artwork trong suốt. Mặc thử ảnh người thật, xoay avatar 3D, độ vừa theo số đo và đồng bộ bộ phối nhiều thiết bị chưa được triển khai.

Các báo cáo QA cũ là lịch sử. Báo cáo này mô tả lần rà soát hiện tại.
