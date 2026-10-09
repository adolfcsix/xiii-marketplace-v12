# Street Edition v13 — Kiểm tra đầy đủ và sửa lỗi

Bản code đầy đủ phát triển từ ZIP v12. Các phần mua sắm, Seller/Admin, upload/chỉnh ảnh và hiệu ứng ThreeUI/3D được giữ lại.

## Các lỗi đã sửa

- Dependency `shell-quote` 1.9.0 gây hai cảnh báo critical qua `concurrently`. Khóa bản vá 1.11.0 bằng overrides và cập nhật package-lock. Audit cuối: 0 lỗ hổng.
- Realtime trước đây chỉ xác thực lúc kết nối. Nay xác thực lại token, tài khoản ACTIVE và quyền hiện tại trong database cho join/send/read; ngắt kết nối khi token hết hạn, tài khoản bị khóa hoặc đăng xuất. Timer được dọn khi socket đóng.
- Buyer/Seller tự làm mới token và kết nối lại sau khi hết hạn, dùng chung cơ chế refresh để tránh gửi trùng. Seller tham gia lại phòng chat sau reconnect.
- Seed chạy lần hai có thể báo trùng mã đơn `XIII-DEMO-RETURN-001`: tài khoản demo bị xóa/tạo lại làm thay đổi ID, khiến bước dọn đơn cũ không tìm thấy chúng. Nay giữ ID qua upsert, dọn đơn demo còn sót từ bản cũ và review liên quan. Đã thử seed lặp trên database riêng, xác minh ID ổn định và dữ liệu ngoài demo được giữ.

## Kết quả xác minh

| Kiểm tra | Kết quả |
| --- | --- |
| Bộ trình duyệt ban đầu | 114/114 qua: 58 với API/database thật, 56 với fixture/media/shopping/3D |
| Hậu kiểm auth/realtime sau bản sửa | 8/8 qua, gồm 2 trường hợp mới |
| Tổng trường hợp trình duyệt duy nhất | 116; 122 lượt chạy tính cả hậu kiểm |
| Kiểm tra đơn vị, schema, storage và realtime | 69/69 qua |
| Tích hợp socket, upload thật và seed lặp | 7/7 qua |
| Kiểm tra cấu trúc dự án | 22/22 qua |
| TypeScript | Cả 4 workspace qua, đã xóa cache và types sinh tự động trước khi kiểm tra |
| Production build | Web, Seller, Admin, API đều qua |
| npm audit | 0 lỗ hổng |

MongoDB chạy replica set, luồng COD đặt hàng → xử lý → nhận hàng → đánh giá được kiểm tra với API/database. Upload tích hợp dùng URL ký và multipart thật đến kho S3 tương thích cục bộ, tải lại PNG và so sánh toàn bộ byte. Các tình huống lỗi upload/chỉnh ảnh và shopping dùng route mock/fixture theo thiết kế bộ kiểm tra. WebGL dùng SwiftShader; chưa đo FPS trên điện thoại thật. Redis không chạy trong môi trường này, bộ giới hạn tần suất dùng fallback bộ nhớ. Chưa giao dịch với MoMo/VNPAY thật do chưa có credential merchant sandbox.

Báo cáo chi tiết: `docs/qa/full-v13/verification-summary.json` cùng log kiểm tra và ảnh giao diện.

## Cập nhật trên Windows

1. Giải nén ZIP đầy đủ vào thư mục mới.
2. Chép `.env` từ dự án đang chạy sang thư mục mới.
3. Chạy `npm.cmd ci`, rồi `npm.cmd run typecheck`.
4. Chạy `UPDATE_XIII_WINDOWS.bat` để dùng dữ liệu hiện có; script này bỏ qua seed.

Không cần migration database. Seed vẫn là thao tác reset dữ liệu demo; chỉ chạy khi cần tạo lại dữ liệu mẫu.

## Chạy kiểm tra bổ sung

- `npm.cmd run test:realtime-auth`: build API và kiểm tra token/quyền/timer với các đối tượng mô phỏng.
- `npm.cmd run test:live`: kiểm tra tích hợp khi đặt `XIII_LIVE_TESTS=1`, API/kho ảnh cục bộ đang chạy, tài khoản admin demo có sẵn và `JWT_ACCESS_SECRET` trong môi trường trùng cấu hình API.
- `npm.cmd run test:seed`: đặt `XIII_SEED_TESTS=1` và MongoDB replica set cục bộ đang chạy. Bài kiểm tra tạo database riêng theo timestamp và xóa database đó sau khi kết thúc.
- `npm.cmd run e2e:stack`: bộ trình duyệt với Docker/MongoDB/Redis/MinIO cục bộ.

Kiểm tra realtime trình duyệt mới ở `e2e/tests/realtime-session.spec.ts` cần `JWT_ACCESS_SECRET` của API thử nghiệm để tạo token có thời hạn ngắn. Các kiểm tra fixture vẫn cần `E2E_SHOPPING_FIXTURE=1` và server fixture như các bản trước.
