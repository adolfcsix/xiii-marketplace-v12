# Street Edition v8.1 — Rà soát và sửa lỗi v8

## Những lỗi đã sửa

1. Khi mở “Đổi lựa chọn” của món đã chọn size L, Quick View trước đây tự chọn SKU mặc định M. Nay cửa sổ nhận đúng variant đã chọn; nếu SKU đó không còn tồn tại, người mua cần chọn một lựa chọn hiện có.
2. Khi một món trong outfit không tải lại được, sửa món khác trước đây ghi null lên tham chiếu đã lưu và làm mất món lỗi mạng. Nay bản nháp giữ tham chiếu riêng với dữ liệu đã tải. Có nút thử tải lại từng vị trí và gỡ tham chiếu rõ ràng.
3. Sau khi món đầu tiên đã thêm vào giỏ nhưng món thứ hai lỗi, thử lại trước đây vẫn kiểm tra tồn kho món đầu tiên. Nếu món đầu hết hàng sau đó, món thứ hai bị chặn. Nay chỉ kiểm tra và gửi các món chưa thêm thành công.
4. Nút gợi ý size trong Quick View trước đây vẫn đổi được SKU trong khi yêu cầu thêm giỏ đang chạy, dù dropdown đã khóa. Nay cả phần gợi ý kích cỡ được khóa; callback cũng bảo vệ việc đổi variant. Trang chi tiết áp dụng cùng trạng thái khóa.
5. Di chuột trong cửa sổ Quick View trước đây khiến listener 3D tác động lên thẻ sản phẩm phía sau cửa sổ. Nay mọi thao tác trong dialog đang mở đều reset chiều nghiêng và ánh sáng của thẻ phía sau.
6. Các request tải preview dùng AbortSignal riêng nên bỏ qua timeout mặc định của API helper. Một kết nối bị treo có thể chờ vô hạn. Nay hai bước tải sản phẩm / biến thể có chung giới hạn 15 giây, báo lỗi dễ hiểu để thử lại, và hủy request khi đóng cửa sổ. Preflight outfit cũng hủy các request còn lại khi kết thúc.

Ba lỗi outfit đầu tiên được tái hiện trên production build v8 bằng ba kiểm tra hồi quy mới, cả ba thất bại trước sửa. Các kiểm tra mới trong `shopping-tools.spec.ts` bao phủ các hành vi đã sửa, gồm request chậm được kiểm tra bằng đồng hồ mô phỏng của trình duyệt.

## Phạm vi xác minh

Typecheck bốn workspace, production build Buyer; 4 bài chọn size, 14 client/session regression và 3 kiểm tra hash renderer ThreeUI. Các verifier Seller catalog và auth/session là kiểm tra tĩnh, không thay thế việc chạy giao dịch với database.

Kiểm tra trình duyệt dùng catalog/CMS/product/variant fixture cục bộ và mock cho việc ghi giỏ / Seller. WebGL chạy thực bằng SwiftShader. Không chạy lại MongoDB, checkout, thanh toán hoặc quy trình xét duyệt thật trong lượt này. Kết quả hiện tại ở `docs/qa/shopping-v8-1/e2e-summary.json`. Báo cáo v8/v7 trong dự án là lịch sử.

## Cập nhật

Đây là toàn bộ dự án trên nền v8. Giữ cấu hình và dữ liệu hiện tại, giải nén rồi chạy `UPDATE_XIII_WINDOWS.bat`. Không cần seed lại. Buyer cần rebuild để nhận bản sửa. Bảng size Seller và các tính năng 3D vẫn được giữ.
