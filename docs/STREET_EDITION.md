# XIII Street Edition — 07/10/2026

## Giao diện mới

Trang chủ và đăng nhập/đăng ký chuyển sang đen, trắng và xám giấy: ảnh streetwear, nét vẩy sơn, chữ lớn, tiêu đề viền, ticker, bộ sưu tập theo phong cách và footer XIII. Không còn mảng vàng/lime ở đăng nhập.

Hiệu ứng gồm xuất hiện khi cuộn, parallax ảnh hero, chuyển bộ lọc, hover ảnh và phản hồi khi nhấn. Nút “Chuyển động” lưu lựa chọn tại trình duyệt. Khi thiết bị chọn giảm chuyển động, hiệu ứng tự tắt. Nội dung vẫn hiện khi JavaScript chưa khởi tạo; không dùng animation để giữ trang ở trạng thái ẩn.

Đã tạo mới 9 ảnh, nén WebP (tổng khoảng 1,2 MB cho bộ ảnh buyer). Bộ ảnh thay cho hình mẫu cũ, không ghi đè ảnh người bán tự tải lên. 8 đường dẫn sản phẩm mẫu cũ được chuyển hướng sang ảnh mới ở cả Buyer/Seller/Admin, nên không cần seed lại chỉ để đổi ảnh.

## Sửa lỗi trang chủ trống

CMS trả thành công với `sections: []` từng làm mất các khối sản phẩm vì mảng rỗng vẫn là giá trị truthy. Trang chủ hiện tạo khối catalog mặc định khi không có PRODUCT_GRID, kể cả khi CMS chỉ có nội dung trang trí hoặc lỗi tải. Catalog, danh mục và CMS được tải độc lập.

Sản phẩm đến từ API thật. Nếu database chưa có sản phẩm được công khai, trang hiện trạng thái trống rõ ràng, không tạo sản phẩm giả. Nếu API lỗi, có thông báo và nút thử lại. Có thể chuyển Tuyển chọn / Tất cả / Mới nhất / Đang giảm giá; yêu cầu cũ bị hủy khi đổi nhanh bộ lọc.

Banner do quản trị viên cấu hình vẫn được sử dụng. Chỉ các tên ảnh minh họa mặc định cũ được thay bằng bộ ảnh mới. Các section sản phẩm vẫn dùng query và số lượng trong CMS.

## Cập nhật giữ dữ liệu

1. Dừng API và các giao diện đang chạy.
2. Giải nén vào thư mục mới, chép `.env` hiện tại vào thư mục dự án `xiii-marketplace` mới.
3. Chạy `UPDATE_XIII_WINDOWS.bat` để cập nhật dependencies và khởi động, bỏ qua seed. Không dùng RESET nếu muốn giữ dữ liệu.
4. Nếu là môi trường mới hoàn toàn và cần sản phẩm mẫu, dùng `RUN_XIII_WINDOWS.bat`.

Nếu Web chạy trong container hoặc server có địa chỉ API nội bộ riêng, có thể đặt `API_INTERNAL_URL=http://api:4000/api/v1` trong môi trường của tiến trình Web. Biến này chỉ dùng cho request server; trình duyệt tiếp tục dùng `NEXT_PUBLIC_API_URL`. Cấu hình localhost hiện tại không cần thay đổi.

Xem `QA_RESULTS.md` và `docs/qa/` để biết kết quả, log và ảnh desktop/mobile. Các sửa lỗi trước đó được giữ lại; tài liệu `UPGRADE_POLISH_2026_10_07.md` mô tả bản trước, phần giao diện lime ở đó đã được thay thế bởi bản này.
