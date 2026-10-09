# Street Edition v4 — Tin nhắn và tài khoản

## Đã sửa

- Chat lấy tin nhắn từ phản hồi POST thành công, không phụ thuộc vào socket để hiện tin vừa gửi. Khử trùng theo ID và khóa gửi đồng bộ để bấm liên tục không tạo thêm yêu cầu.
- Đổi hội thoại hủy lượt tải cũ, xóa nội dung màn hình trước và giữ bản nháp riêng cho từng shop. Nội dung gõ thêm trong lúc gửi được giữ lại. Hội thoại không tồn tại trong URL chuyển sang một hội thoại hợp lệ.
- Khôi phục lịch sử khi socket kết nối lại, hiển thị trạng thái đã xem từ sự kiện của shop. Cuộn theo tin mới khi đang ở cuối khung chat; khi đọc phía trên, không kéo xuống tự động.
- Đơn mua và đánh giá hủy yêu cầu cũ, chặn phản hồi lỗi thời, tách trạng thái đang tải/lỗi/rỗng và hỗ trợ thử lại. Đơn mua đọc bộ lọc trạng thái từ URL.
- Sửa lỗi bấm Cancel ở prompt lý do vẫn hủy đơn: thay confirm/prompt bằng hộp xác nhận có nút Giữ đơn, Escape và lý do tối đa 200 ký tự. Giữ lý do khi API lỗi; chặn gửi yêu cầu hủy trùng.

- Sửa sai lệch HTML lúc tải trực tiếp trang đã đăng nhập: đơn mua, chi tiết đơn, trả hàng và kết quả thanh toán đều dựng trạng thái ban đầu thống nhất. Bổ sung kiểm tra không có lỗi React hydration. Nút Cancel ở prompt lý do trong chi tiết đơn cũng dừng thao tác đúng nghĩa.

## Giao diện

Chat sử dụng màu đen, trắng và giấy xám đồng bộ với Street Edition. Làm rõ hội thoại đang chọn, trạng thái tải, nút gửi và nút thử lại. Hộp hủy đơn có chuyển động mở nhẹ, nền mờ và nút xác nhận rõ ràng; tôn trọng chế độ giảm chuyển động hiện có.

## Kiểm tra

Bổ sung tám E2E kiểm tra đổi tab/đổi hội thoại khi phản hồi chậm, mất kết nối, lưu bản nháp, gửi khi socket ngắt, bấm nhiều lần hộp hủy đơn, bố cục mobile và tải trực tiếp trang tài khoản. Các phản hồi chậm/lỗi và nội dung chat trong các bài phục hồi này là fixture được tiêm qua trình duyệt. Bộ E2E thương mại hiện có vẫn kiểm tra ghi dữ liệu thật bằng API và MongoDB tách biệt.

Bộ E2E đầy đủ 41/41 PASS; sau tinh chỉnh tương phản tab, 8/8 bài liên quan chạy lại PASS trên build cuối. 10 trang desktop/mobile không có ảnh lỗi, lỗi React hoặc tràn ngang trong lượt chụp cuối. Kết quả chi tiết nằm trong [QA_RESULTS](../QA_RESULTS.md), log và ảnh trong [qa](qa). API, schema và dependencies không thay đổi ở v4. Không seed lại database đang sử dụng.

## Cập nhật

Giải nén bản đầy đủ vào thư mục mới, chép `.env` cũ và dùng `UPDATE_XIII_WINDOWS.bat`. Tất cả file gốc được giữ trong bản ZIP; không kèm database, dependencies hay build cache.
