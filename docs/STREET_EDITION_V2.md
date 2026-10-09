# Street Edition v2 — phần tiếp nối

Bản này chứa toàn bộ dự án của Street Edition, tiếp tục cải tiến các màn hình mua sắm.

- Catalog chuyển sang ảnh lớn, khoảng cách dễ đọc, bảng lọc đen trắng và banner ảnh mới. Gợi ý lấy từ danh mục thực tế thay vì các từ khóa hoodie cố định.
- Hiển thị các bộ lọc đang áp dụng; gỡ riêng màu, size, thương hiệu, giá hoặc từ khóa mà vẫn giữ các lựa chọn còn lại. Có nút xóa tất cả và phản hồi “Đang cập nhật…” khi chuyển kết quả. Các chip dùng điều hướng GET để luôn đồng bộ URL với dữ liệu catalog, kể cả trước khi JavaScript khởi tạo.
- Gallery sản phẩm không tự nhân một ảnh thành bốn thumbnail. Ảnh có thể phóng to trong hộp thoại, đóng bằng Esc/nút đóng; trả focus về nút mở. Sản phẩm có nhiều ảnh có thêm điều hướng ảnh và phím mũi tên.
- Điều khiển màu/size có trạng thái lựa chọn cho trình đọc màn hình. Chặn đổi lựa chọn khi đang thêm giỏ để thông báo và món hàng khớp nhau. Nút tăng/giảm số lượng có tên rõ ràng và vô hiệu hóa ở giới hạn.
- Các phần giá, khuyến mãi, đánh giá, giỏ và thanh toán đồng bộ đen/trắng/xám. Bảng tổng tiền tránh bị header che khi cuộn trên desktop.
- Skeleton riêng cho catalog và sản phẩm để quá trình chuyển trang có phản hồi phù hợp. Bộ lọc gấp/mở áp dụng cả tablet 680 px, ngoài điện thoại.
- Khung phóng to giữ khoảng trống thanh cuộn để hạn chế xê dịch trang khi mở/đóng.

Cập nhật theo `docs/STREET_EDITION.md`: dùng `.env` hiện tại và `UPDATE_XIII_WINDOWS.bat` để giữ dữ liệu. Bộ ảnh mới của bản trước đã có sẵn trong gói; không cần seed lại để đổi ảnh.

Log và ảnh kiểm tra phiên bản này nằm trong `docs/qa/`; kết quả cuối cùng được ghi trong `QA_RESULTS.md`. Chưa triển khai lên server của bạn.
