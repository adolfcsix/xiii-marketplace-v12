# Street Edition v11 — Chuyển động 3D trong trải nghiệm mua sắm

Bản đầy đủ nối tiếp v10. Phát triển thêm giao diện từ runtime ThreeUI đã tích hợp; không thêm package, CDN, mô hình hoặc asset trả phí. Energy Orb và Constellation của v10 giữ nguyên cùng ba file nguồn MIT kiểm tra hash.

## Các phần mới

- **Banner nhiều lớp:** ảnh nền, nội dung, spray và dấu tem dịch chuyển ở các độ sâu khác nhau. Dùng chung vòng nội suy theo chuột của StreetDepth, không tạo vòng RAF riêng cho hero. Ảnh nền tiếp tục phản hồi khi cuộn. Không tách người mẫu từ ảnh hoặc dựng thêm góc chụp giả.
- **Gallery chiều sâu:** ảnh chính chuyển với translate/rotateY; hai ảnh kế bên là ảnh thật từ gallery. Thumbnail đang chọn nổi bật. Giữ phóng to, yêu thích, nút trước/sau, phím mũi tên và Esc. Vuốt ngang trên điện thoại đổi ảnh, không tự mở khung phóng to; pan-y và pinch-zoom giữ cuộn dọc/phóng to của trình duyệt.
- **Ảnh bay vào giỏ:** áp dụng cho trang sản phẩm, Quick View và từng món outfit. Chỉ phát sau POST cart thành công; lỗi, chưa đăng nhập hoặc mua ngay không chạy hiệu ứng. Ảnh bay dùng WAAPI và manual popover nằm trên Quick View, không nhận chuột hoặc lấy focus. Túi nảy nhẹ khi ảnh tới nơi. Quick View trả focus về nút thêm giỏ sau khi mở khóa, nếu focus bị mất do nút đang disabled; không giành focus từ điều khiển khác. Tối đa ba hiệu ứng tạm, tự dọn sau khi kết thúc, đổi trang, ẩn tab, blur hoặc tắt chuyển động. Nếu nguồn/đích ngoài viewport thì bỏ hiệu ứng. Trình duyệt thiếu popover vẫn có fallback ở trang thường; trong modal bỏ hiệu ứng để tránh bị che.
- **Phòng phối đồ:** nút Xem bộ phối mở sân khấu ảnh có perspective. Các món từ SKU đã chọn xếp ở các góc khác nhau, nghiêng theo chuột. Chọn một món để nâng lên và làm mờ các món còn lại; chọn lại bỏ tập trung. Nút Thu gọn trở về bảng chọn. Gỡ món đang tập trung sẽ bỏ làm mờ các món còn lại. Không thay đổi giá, size, SKU, dữ liệu đã lưu, phân loại vị trí hoặc cơ chế retry thêm giỏ. Món mới có chuyển động xuất hiện ngắn.

Đây là chiều sâu và hoạt ảnh 3D của ảnh/giao diện. Không có mô hình sản phẩm GLB/glTF hoặc ảnh xoay 360°; các tính năng đó cần tài nguyên sản phẩm riêng.

## Thiết bị và quyền kiểm soát

Các phần dùng chung thiết lập chuyển động v10. Khi tắt chuyển động hoặc bật prefers-reduced-motion, không phát hiệu ứng bay, nghiêng và chuyển ảnh 3D; chức năng mua sắm vẫn dùng được. Pointer depth chỉ chạy với chuột có hover chính xác, không nghiêng theo chạm. Chất lượng v10 điều khiển tần số vòng depth; các chuyển tiếp hữu hạn dùng compositor CSS/WAAPI, không thêm loop WebGL hay RAF vô hạn.

## Kiểm chứng

**48/48 Chromium, 7/7 kiểm tra đơn vị/hash, typecheck cả bốn workspace và production build Buyer đều qua.**

Bộ shopping-motion gồm tám trường hợp: lớp banner và tắt chuyển động; gallery và lightbox; swipe mobile; giỏ chỉ chạy sau thành công và giữ focus; lỗi/retry; giảm chuyển động; outfit focus/lưu/320 px; outfit thành công một phần/retry. Chạy cùng 40 trường hợp v10 về ThreeUI, depth và shopping. Dữ liệu catalog từ fixture cục bộ; POST giỏ dùng mock. Shader được kiểm thử bằng SwiftShader, không thay thế đo GPU điện thoại thật hoặc kiểm thử thanh toán/database thật. Kết quả cuối và ảnh ở docs/qa/threeui-v11.

## Cập nhật

Dừng bản đang chạy, giải nén ZIP đầy đủ vào thư mục mới, giữ .env và chạy UPDATE_XIII_WINDOWS.bat. Không có thay đổi schema hoặc migration database. Nguồn Seller/Admin/API và các công cụ upload/chỉnh ảnh v9 vẫn được giữ.
