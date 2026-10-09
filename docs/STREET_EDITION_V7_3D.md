# Street Edition v7 — 3D trong giao diện mua sắm

Bản này giữ toàn bộ Buyer, Seller, Admin, API và bổ sung chiều sâu cho giao diện Buyer, trên nền v6.

## Tính năng mới

- Thẻ sản phẩm nghiêng theo vị trí chuột, có vùng sáng dịch chuyển. Nút yêu thích và liên kết sản phẩm vẫn hoạt động.
- Ảnh bộ sưu tập nghiêng theo chuột. Hiệu ứng nằm trên ảnh nên không xung đột với chuyển động xuất hiện của cả thẻ.
- Banner có chữ nổi nhiều lớp và phần nội dung chuyển góc nhìn nhẹ, cùng nền parallax và Constellation của v5.
- Ảnh lớn ở trang chi tiết sản phẩm có góc nhìn nghiêng; vẫn phóng to ảnh bằng hộp thoại và đóng bằng Esc.
- Ba vòng quỹ đạo 3D quanh Energy Orb, dừng cùng trạng thái của khối cầu.
- Thanh chỉnh tốc độ 0.20–1.60×, ánh sáng 20–150%, giữ hai sắc bạc/tím và nút đặt lại hiệu ứng.

Energy Orb và Constellation tiếp tục dùng nguồn ThreeUI đã được xác minh; renderer và shader gốc không sửa. Nghiêng ảnh, ánh sáng trên thẻ, chữ nổi và vòng quỹ đạo là phần tích hợp CSS/DOM mới của XIII. Ảnh sản phẩm là ảnh 2D có hiệu ứng chiều sâu, không phải mô hình sản phẩm 360 độ.

## Điều khiển và hiệu năng

Di chuột trên banner, ảnh sản phẩm hoặc bộ sưu tập để tương tác. Trên điện thoại, thao tác cảm ứng vẫn dành cho cuộn và chọn sản phẩm. Dùng thanh trượt trong khu vực “CHẤT RIÊNG. KHÔNG GIỚI HẠN.” để chỉnh khối cầu; các thanh trượt hỗ trợ phím mũi tên, Home và End.

Nút “Chuyển động” điều khiển hiệu ứng toàn cục, lưu lựa chọn và tuân theo cài đặt giảm chuyển động của hệ điều hành. Hiệu ứng nghiêng được reset khi rời vùng, cuộn, chuyển tab hoặc tắt chuyển động. Không thêm thư viện hoặc tài nguyên CDN. Chỉ một vùng đang tương tác được cập nhật qua requestAnimationFrame. Shader chỉ chạy khi khối cầu hiện trong màn hình và tab đang hiển thị.

## Cập nhật Windows

Giải nén toàn bộ dự án vào thư mục dùng để chạy XIII, giữ cấu hình môi trường và dữ liệu riêng của bạn. Chạy `UPDATE_XIII_WINDOWS.bat` theo hướng dẫn cập nhật hiện có. Đây là bản đầy đủ của dự án, không phải gói file hiệu ứng rời.

## Phạm vi xác minh

Typecheck bốn workspace; production build web; ba bài kiểm tra hash nguồn ThreeUI. Kiểm tra Chromium dùng catalog, CMS, sản phẩm và biến thể mẫu cục bộ. Shader được chạy bằng SwiftShader trong môi trường không có GPU; kiểm tra pixel, uniform ánh sáng, đổi màu, pause, visibility, fallback và context loss. Kiểm tra nghiêng thẻ, nút yêu thích, liên kết, phóng to ảnh, giảm chuyển động và màn hình 320px.

Lượt này không chạy lại giao dịch thanh toán, checkout hoặc MongoDB thật. Kết quả các phiên bản trước trong QA_RESULTS.md là lịch sử. Báo cáo hiện tại và ảnh chụp nằm ở `docs/qa/street-depth-v7/`.
