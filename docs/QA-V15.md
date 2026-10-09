# QA v15 — 2026-10-08

## Đã kiểm tra

- `npm run typecheck`: PASS cho admin, seller, web và API.
- `npm run test:home`: PASS (mapping catalog vẫn tương thích).
- `npm --workspace apps/web run build`: PASS bản production (kết quả build cuối hoàn tất trước đóng gói).
- 13 kịch bản Playwright liên quan: PASS.
  - Nút nhấn/hover, bàn phím, giảm chuyển động và thao tác chạm 320px.
  - Mặc cả 4 loại trang phục, đổi/gỡ món, tuỳ chỉnh nhân vật.
  - Lưu/mở lại bộ phối cùng nhân vật sau reload.
  - Bộ phối khách và hai tài khoản tách riêng.
  - Mobile 390px và 320px không tràn ngang.
  - Focus món đang mặc không ghi đè bản nháp.
  - Mở Quick View đúng biến thể đang chọn.
  - Thêm giỏ thành công một phần: retry chỉ gửi những món còn lại.
  - Giá đổi: báo lại trước khi gửi vào giỏ.
- 2 kiểm tra bổ sung: PASS.
  - Artwork trang phục lỗi 404: trở về minh hoạ, không để mất cả nhân vật.
  - API không tải được món đã lưu: giữ nguyên tham chiếu bản nháp, báo để thử lại.

API kiểm thử dùng `e2e/fixtures/shopping-server.cjs` và mock các ghi giỏ hàng. Chưa chạy end-to-end với MongoDB/Redis/MinIO thật trong phiên này. Không khẳng định đã sửa lỗi MinIO trên máy người dùng.

## Ảnh kiểm tra

`docs/qa/v15/fit-studio-desktop.png`, `fit-studio-mobile-320.png`, `fit-studio-mobile-390.png`, `buttons-desktop.png`, `buttons-mobile.png`.

## Phạm vi cần biết

Đây là mannequin minh hoạ 2D. Mặc thử theo ảnh người dùng, 3D xoay 360°, mô phỏng size thật và đồng bộ bộ phối nhiều thiết bị chưa thuộc bản này. Artwork sản phẩm đúng khung trong suốt được hỗ trợ qua metadata; khi chưa có, renderer dùng màu/kiểu dáng. Xem `docs/FIT-STUDIO-V15.md`.
