# XIII Dress Up v16

## Trải nghiệm người mua

- Nhân vật 2D nam, nữ, trung tính; ba form cơ thể, ba màu da, bốn kiểu tóc và hai kiểu khuôn mặt.
- Năm lớp: áo trong, quần/váy, giày, phụ kiện, áo khoác. Áo khoác thay độc lập và được mặc ngoài áo trong.
- Tủ sản phẩm cạnh nhân vật trên desktop; điện thoại giữ mẫu khi cuộn chọn đồ. Thanh đầu trang không che mẫu trên trang này.
- Chọn đúng SKU trong Quick View: màu, size, giá và tồn kho lấy từ catalog. Avatar không tạo thêm màu/size để bán.
- Tải thêm sản phẩm theo phân trang API, thay vì chỉ lọc tập sản phẩm đầu tiên.
- Lưu tối đa 12 bộ riêng theo tài khoản trên trình duyệt; giữ bản nháp cũ bốn lớp, chuyển áo khoác sang lớp ngoài khi tải được dữ liệu.
- Kiểm tra lại giá/tồn kho trước khi thêm giỏ; không lặp lại các món đã thêm thành công trong lần thử lại.

## Artwork gắn với mặt hàng

Seller → Sản phẩm → chọn sản phẩm đã lưu → “Ảnh mặc thử 2D”.

1. Chọn SKU đã lưu. Đối chiếu ảnh riêng SKU trong panel với mặt hàng thực tế.
2. Chọn dáng mẫu trung tính/nam/nữ, tải khung mẫu SVG 360 × 620.
3. Trong phần mềm đồ hoạ, đặt hình trang phục theo đường vai/eo/chân của khung. Giữ đúng màu, logo, hoạ tiết, đường cắt, chiều dài của sản phẩm.
4. Ẩn khung hướng dẫn và nhân vật; chỉ xuất lớp trang phục thành PNG, WebP hoặc AVIF trong suốt, kích thước 360 × 620. Không dùng ảnh chụp sản phẩm có nền làm lớp mặc thử.
5. Upload artwork. Hệ thống kiểm tra kích thước và hai góc nền trên có alpha bằng 0; đây không phải kiểm tra toàn bộ nền hay chứng nhận hình giống sản phẩm. Có thể dán URL HTTPS hoặc đường dẫn nội bộ; URL không được kiểm tra kích thước/alpha tại bước lưu.
6. Xem artwork trên mẫu, lưu thông tin sản phẩm. Chỉnh sản phẩm ACTIVE vẫn theo quy trình xét duyệt hiện có trước khi hiển thị lại cho buyer.
7. Làm tương tự cho SKU/mẫu khác. Cùng màu khác size có thể dùng lại URL nếu artwork không mô phỏng độ vừa size; mỗi SKU vẫn có liên kết riêng.

Artwork riêng SKU được ưu tiên; artwork trung tính của SKU là dự phòng khi dáng hiện tại chưa có ảnh. Metadata artwork chung cũ của sản phẩm vẫn được hỗ trợ để giữ tương thích. Khi ảnh không tải được, renderer trở về minh hoạ.

Một SKU bị tắt/hết hàng không được thêm vào giỏ chỉ vì còn có artwork. Panel không sửa giá, tồn kho hay ảnh gallery khi lưu artwork.

## Chuẩn vị trí lớp

Canvas 360 × 620, điểm giữa x180. Vai khoảng y172, eo y315, cổ chân y535, đế giày y575. Quần ở dưới áo; áo khoác ở trên áo; phụ kiện là lớp trên cùng. Tất cả artwork là toàn khung, phần không có trang phục trong suốt.

Các khung nằm tại `apps/seller/public/outfit/guide-*.svg` và `apps/web/public/outfit/guide-*.svg`. Đây là hướng dẫn dựng ảnh, không phải artwork hàng bán sẵn.

## Phạm vi bản này

Không thêm hàng giả vào catalog thật. Jacket dùng trong Playwright chỉ nằm trong fixture kiểm thử, không được seed vào cửa hàng. Chưa sản xuất artwork cho toàn bộ hàng bán: shop cần chuẩn bị/gắn artwork để thấy đúng logo/hoạ tiết thay vì minh hoạ.

Đây là game thay đồ 2D nhìn chính diện. Chưa có mô hình 3D, xoay sau/lưng, AI tự tạo hoặc gợi ý đồ, thử trên ảnh người thật, mô phỏng độ vừa theo số đo, hay lưu bộ phối qua nhiều thiết bị.
