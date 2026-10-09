# QA v17 — 2026-10-08

## Kết quả

- Typecheck toàn workspace web/seller/admin/API: PASS. Seller production build sau chỉnh sửa cuối cũng kiểm tra lại kiểu dữ liệu: PASS.
- Nest API build: PASS. Production builds web và seller: PASS.
- 8 test API/xử lý ảnh: PASS. Kiểm tra canvas/alpha/vùng ngoài áo, giới hạn bucket chống fetch URL tuỳ ý, tái sử dụng job, quota, quyền shop, SKU bị tắt/thiếu ảnh, chờ duyệt, request provider hai ảnh, chấp nhận chỉ trả asset không sửa sản phẩm, lỗi provider không lặp, ảnh nguồn đổi trước chạy hoặc trước dùng ảnh.
- 11 test Playwright trên production web/seller với fixture: PASS, 0 skipped, 0 flaky trong lượt cuối.
  - 5 AI: kết quả chưa tự lưu; đợi xử lý và kiểm tra thủ công; reload không tạo thêm job; chưa cấu hình không có nút gọi AI; lỗi tạo không thay artwork; ảnh AI tải lỗi chặn dùng; phục hồi lỗi mạng giữ ID và chặn tạo lượt mới đến khi kiểm tra lại.
  - 6 Dress Up v16: năm lớp, tuỳ chỉnh/lưu mẫu, chuyển bản nháp cũ, artwork theo SKU/dáng, giữ thuộc tính sản phẩm, tải thêm catalog, upload khung đúng và khoá đích SKU.
- Giao diện AI tại 390 px không tràn ngang. Đã xem ảnh chụp mobile; khung đối chiếu và nút kiểm tra/dùng/bỏ hiển thị được.

## Phạm vi xác minh

Các test API dùng model MongoDB giả lập, fake storage và fake OpenAI response; xử lý ảnh bằng sharp thật. UI dùng catalog fixture và route mock. Chưa chạy MongoDB/MinIO/OpenAI thật trong phiên này: chưa kiểm chứng unique index, quota dưới tải đồng thời nhiều tiến trình, phân quyền qua HTTP thật, khôi phục sau crash toàn tuyến, tính phí hoặc chất lượng giữ logo/vải của ảnh tạo thật.

Không có khoá API nên không gửi ảnh cho OpenAI và không phát sinh lượt tạo ảnh thật. AI mặc định tắt. Cần thực hiện các bước pilot trong `docs/AI-OUTFIT-V17.md` trước triển khai cho shop. Không coi test mock hoặc build PASS là bằng chứng ảnh AI giống hàng bán.

Ảnh chụp `docs/qa/v17/ai-seller-desktop.png` và `ai-seller-mobile.png` minh hoạ **luồng giao diện bằng ảnh giả lập**, không phải ảnh tạo từ OpenAI. Kết quả kiểm tra v15/v16 giữ nguyên như lịch sử; không cộng lại các số test cũ vào v17.

## Bàn giao

ZIP giữ đủ file từ v14 và v16, bổ sung code/docs/test mới; kiểm tra CRC. Không chứa node_modules, build/cache, kết quả chạy test tạm hoặc khoá API. Hướng dẫn bật AI nằm ở `docs/AI-OUTFIT-V17.md`; `.env.example`, `.env.production.example` và `.env.staging.example` có cấu hình tắt mặc định.
