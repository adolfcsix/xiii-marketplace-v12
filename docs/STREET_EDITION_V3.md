# Street Edition v3 — rà lỗi và hoàn thiện thao tác

## Lỗi đã sửa

- Xóa toàn bộ giỏ thành công nhưng request tải lại giỏ lỗi từng giữ lại sản phẩm cũ và nút thanh toán. Hiện giỏ được đặt về trạng thái rỗng ngay sau khi API xác nhận xóa; không phụ thuộc lần tải lại. Bộ đếm trên header nhận số lượng đã xác nhận và bỏ qua phản hồi đồng bộ cũ.
- Thao tác đọc thông báo/đọc tất cả từng không bắt lỗi Promise. Hiện có thông báo lỗi, giữ trạng thái chưa đọc khi ghi thất bại, mở lại nút để thử lại và không điều hướng sang chi tiết khi chưa ghi nhận thành công.
- Lỗi tải thông báo lần đầu từng bị hiển thị như đang tải mãi. Hiện có trạng thái lỗi, nút thử lại và xóa lỗi cũ khi tải thành công.
- Nút Xem gian hàng từng tìm theo tên hoặc thương hiệu, nên có thể thiếu sản phẩm của shop hoặc lẫn shop khác. Catalog/API hiện hỗ trợ `shop` theo ID hoặc slug; chỉ lấy shop ACTIVE. Shop không tồn tại trả catalog rỗng. Nút ở sản phẩm và giỏ đều dùng đúng shop ID.
- Bấm Chat với shop liên tiếp từng gửi nhiều yêu cầu. Hiện khóa yêu cầu đang chạy, hiện “Đang mở chat…” và cho thử lại nếu lỗi.

## Hoàn thiện giao diện

- Hộp xác nhận xóa giỏ nằm trong giao diện, cùng màu giấy/đen, có nền mờ và focus vào Giữ lại. Esc hủy trước khi gửi; thao tác đang ghi được khóa để tránh gửi trùng.
- Thông báo có số lượng chưa đọc, trạng thái đang xử lý, lỗi/khôi phục rõ ràng và layout đen/trắng trên điện thoại.
- Nút tăng/giảm số lượng giỏ có tên cho trình đọc màn hình; dòng đang cập nhật có trạng thái bận.
- Bộ lọc Gian hàng được hiển thị như các bộ lọc khác và có thể gỡ riêng.

Bản này giữ toàn bộ dự án, bộ ảnh và các cải tiến của v1/v2. Cập nhật theo `STREET_EDITION.md`: chép `.env` cũ vào dự án mới và chạy `UPDATE_XIII_WINDOWS.bat` để không seed lại dữ liệu.

Kiểm tra mới bao gồm lỗi DELETE/GET của giỏ, hủy/thử lại hộp xác nhận, lỗi tải/ghi thông báo, bấm nhanh mở chat và lọc shop. Các lỗi mạng được tiêm ở trình duyệt; dữ liệu, ghi thành công và luồng mua hàng vẫn chạy với API/MongoDB thử nghiệm thật. Kết quả cuối ở `QA_RESULTS.md` và `docs/qa/`.
