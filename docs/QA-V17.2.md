# QA v17.2 — 2026-10-09

## Phạm vi và thay đổi

Đợt này tập trung đọc sâu auth, cart, checkout và orders; rà soát dấu hiệu giao dịch ở payments, returns, finance; chạy lại các bộ kiểm tra chung. Không khẳng định đã đọc thủ công từng dòng của toàn bộ dự án hoặc loại bỏ mọi lỗi.

- Giỏ hàng: thay lưu snapshot không có kiểm soát bằng cập nhật có điều kiện theo nội dung đã đọc. Tối đa 5 lần đọc lại khi xung đột; mỗi lần kiểm tra lại số lượng và tồn kho. Xóa món/xóa giỏ dùng thao tác nguyên tử. Xử lý cuộc đua tạo giỏ theo unique userId.
- Giảm giá: phân bổ theo phần dư lớn nhất, giữ đủ từng đồng và không vượt giá trị từng dòng, kể cả dòng cuối miễn phí.
- Checkout: xóa danh sách thông báo của lần giao dịch trước khi MongoDB gọi lại callback, tránh gửi thông báo cho đơn của lần đã rollback.
- Đăng ký: trim số điện thoại và bỏ giá trị trống, tránh va chạm unique index trên chuỗi rỗng. Chuyển duplicate key email/phone do đăng ký đồng thời thành 409.
- Cải tiến bảo trì: thêm test:commerce vào CI, bao phủ số tiền, cập nhật đồng thời, giới hạn giỏ, đăng ký và thông báo khi retry.

## Kiểm tra tại môi trường này

- API production build: PASS.
- Typecheck 4 workspace: PASS.
- 41 TypeScript tests: PASS.
- 47 API/config/schema/realtime/storage tests: PASS.
- 7 commerce regression tests: PASS. Dùng model/session giả lập, không thay thế kiểm thử MongoDB replica set.
- 22 verify:* scripts: PASS; phần lớn là kiểm tra tĩnh/domain, không chứng minh tích hợp production.
- Không sửa giao diện; không chạy lại browser E2E hoặc build frontend trong đợt này. Kết quả browser/build trước đây nằm trong QA-V17.1.md.

## Giới hạn còn lại

Chưa có MongoDB replica set, Docker, object storage, thanh toán và tài khoản AI thật để chạy tích hợp. Cần kiểm tra race bằng database thật, payment callback, tải thực, backup/restore trước khi phát hành. Thông báo sau commit vẫn chưa có durable outbox; tiến trình chết ngay sau commit có thể mất thông báo. Checkout chưa có khóa idempotency cho yêu cầu người mua. Phòng phối đồ vẫn dùng mannequin 2D và AI pilot cho áo, không mô phỏng độ vừa size hoặc trang phục 3D.
