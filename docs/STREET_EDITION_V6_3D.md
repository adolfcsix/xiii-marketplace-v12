# XIII Street Edition v6 — Energy Orb 3D

## Hiệu ứng mới

Trang chủ có thêm khu vực **XIII / NEXT DIMENSION**, sau các thẻ phong cách và trước phần tuyên ngôn thương hiệu. Khối cầu Energy Orb từ ThreeUI dùng WebGL để dựng bề mặt cầu với pháp tuyến, ánh sáng, lớp nhiễu chuyển động và viền sáng. Đây là khối cầu trang trí, không phải mô hình 3D của sản phẩm quần áo.

- Mặc định sắc bạc; nút **Tím** chuyển sang màu tím của renderer gốc.
- Nút **Tạm dừng** gỡ renderer động và hiển thị khối cầu tĩnh dự phòng; **Tiếp tục** tạo lại renderer.
- Công tắc chuyển động ở banner vẫn áp dụng cho toàn trang. Thiết bị bật giảm chuyển động sẽ thấy hình tĩnh.
- Renderer chỉ được tải và chạy khi khu vực nằm trong màn hình và chuyển động được cho phép. Khi rời màn hình hoặc ẩn tab, component được gỡ và giải phóng tài nguyên WebGL.
- Máy không tạo được WebGL vẫn thấy hình tĩnh và dùng được các nút, liên kết mua sắm. Mất context có nút **Thử lại**.
- Hiệu ứng được giới hạn trong khung riêng, không chiếm vùng bấm của liên kết và không thêm điểm dừng bàn phím cho canvas trang trí.
- Cập nhật các điều khiển chuyển động để lần render đầu ở server/client nhất quán trước khi bật phần nâng cấp động.

## Cài và cập nhật

Bản ZIP chứa toàn bộ dự án v5 cộng phần 3D mới: Buyer, Seller, Admin, API, ảnh và các công cụ Windows. Không cần tài khoản ThreeUI Pro, tải CDN hoặc cài thêm npm package hiệu ứng.

Dừng ứng dụng cũ, giải nén vào thư mục mới, sao chép `.env` riêng nếu cần, rồi chạy `UPDATE_XIII_WINDOWS.bat` trong thư mục `xiii-marketplace`. Script này bỏ qua seed khi cập nhật. Cấu hình database của bạn quyết định dữ liệu được dùng.

## Kiểm tra lượt v6

- Typecheck cả bốn workspace; production build của ứng dụng web sau thay đổi cuối.
- Ba bài xác minh hash nguồn ThreeUI.
- 16 bài Chromium giao diện: 4 Street UI, 6 Constellation, 6 Energy Orb.
- WebGL được chạy bằng SwiftShader trong môi trường kiểm thử không có GPU. Kiểm tra program link thành công và pixel WebGL có được vẽ; kiểm tra uniform màu sau thao tác đổi sắc thái.
- Kiểm tra tạm dừng, offscreen, tab ẩn, giảm chuyển động, WebGL không khả dụng, mất context/khởi động lại và bố cục 320 px.
- Ảnh desktop, mobile và sắc tím trong `docs/qa/threeui-3d`. Catalog/CMS ở lượt trình duyệt dùng API fixture cục bộ.

Chưa chạy lại quy trình checkout với database hoặc thanh toán thật trong lượt này. Những kết quả v4/v5 là lịch sử kiểm tra, không phải kết quả runtime mới của v6.

Chạy lại trên hệ thống đang hoạt động:

```powershell
npm run test:threeui
npm run e2e -- threeui-orb.spec.ts threeui-motion.spec.ts street-ui.spec.ts
```

`E2E_WEBGL_SOFTWARE=1` là tùy chọn cho môi trường kiểm thử dùng Chromium tùy chỉnh không có GPU, cần các thư viện SwiftShader đi cùng Chromium. Người dùng website không cần bật tùy chọn này.

Nguồn: https://github.com/MengTo/threeui. Chi tiết và giấy phép MIT ở `third-party/threeui`.
