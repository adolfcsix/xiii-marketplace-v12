# XIII Street Edition v5 — ThreeUI

## Thay đổi

- Thêm hiệu ứng hạt và đường nối **Constellation Field** từ ThreeUI vào banner trang chủ, giữ mã renderer gốc đã xác minh.
- Tông đen trắng, độ đậm thấp hơn trên điện thoại. Hiệu ứng nằm dưới chữ và không chặn nút hoặc bàn phím.
- Tải hiệu ứng khi banner hiện trên màn hình và chuyển động được bật. Dừng bằng cách gỡ iframe khi cuộn khỏi banner, chuyển tab hoặc tắt chuyển động.
- Công tắc chuyển động lưu lựa chọn qua lần tải trang. Cài đặt giảm chuyển động của thiết bị luôn được ưu tiên, kể cả khi bấm bật trên giao diện.
- Thêm vệt sáng khi hover/focus nút khám phá chính; chỉ chạy khi chuyển động được phép.
- Sửa banner mobile bị cắt nội dung khi tiêu đề tiếng Việt xuống nhiều dòng: chiều cao theo nội dung và nhóm nút tự xuống hàng.
- Hủy animation frame parallax khi tắt chuyển động hoặc rời trang; trả vị trí banner về trạng thái ban đầu.

## Cập nhật trên Windows

1. Dừng các cửa sổ ứng dụng đang chạy.
2. Giải nén bản đầy đủ vào thư mục mới. Sao chép `.env` riêng từ bản đang dùng sang thư mục mới nếu cần.
3. Chạy `UPDATE_XIII_WINDOWS.bat` trong thư mục `xiii-marketplace` để khởi động và bỏ qua seed. Dữ liệu MongoDB hiện có tiếp tục được sử dụng theo cấu hình của bạn.
4. Mở trang chủ và dùng công tắc **Chuyển động bật/tắt** ở cuối banner.

Không cần cài ThreeUI riêng, tài khoản Pro hoặc CDN. Bản ZIP chứa cả Buyer, Seller, Admin, API, công cụ Windows và các tài nguyên trước đó.

## Kiểm tra trong lượt cập nhật này

- Typecheck của Buyer, Seller, Admin, API.
- Production build của cả bốn workspace; web được build lại sau sửa mobile và reduced-motion.
- 14 bài regression API client/session/điều hướng; 5 bài dữ liệu trang chủ; 24 bài schema; 1 bài xác minh nguồn ThreeUI.
- Chromium: 4 bài Street UI hiện có và 6 bài ThreeUI, dùng API fixture cục bộ cho catalog/CMS. Bao gồm canvas có vẽ và thay đổi qua frame, điều hướng, bật/tắt và tải lại, offscreen/visibility, giảm chuyển động, lỗi tải nguồn, resize mobile và vị trí nút.
- Kiểm tra hình ảnh ở 1440, 390 và 320 px trong `docs/qa/threeui`. Dữ liệu catalog trong các ảnh là fixture kiểm thử.

Lượt này không chạy lại toàn bộ mua hàng/thanh toán với MongoDB thật. Báo cáo các lượt v4 trước đó được giữ trong `QA_RESULTS.md`; không coi chúng là kiểm thử runtime mới của v5.

## Kiểm tra lại hiệu ứng

Với hệ thống XIII đã chạy và Playwright đã cài Chromium:

```powershell
npm run test:threeui
npm run e2e -- threeui-motion.spec.ts street-ui.spec.ts
```

Nguồn và giấy phép được ghi trong `third-party/threeui/README.md` và `third-party/threeui/LICENSE`.
