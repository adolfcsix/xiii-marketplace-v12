# XIII v17 — AI tạo áo mặc thử: bản thử nghiệm

> Cập nhật v17.1: xem `docs/QA-V17.1.md`. Cấu hình bật AI thiếu key/kho ảnh hoặc quota sai làm API từ chối khởi động; worker kiểm lại quyền trước gọi AI, schema ID đã sửa và sharp đã nâng bản vá. Hướng dẫn chức năng bên dưới vẫn áp dụng.

## Tính năng đã triển khai

Seller → Sản phẩm đã lưu → Ảnh mặc thử 2D → chọn SKU và dáng mẫu → Tạo áo bằng AI.

AI nhận ảnh riêng của SKU và khung mannequin, trả về lớp áo PNG trong suốt. API chuẩn hoá về 360 × 620, kiểm tra khung, độ trong suốt và vùng ngoài áo rồi lưu vào kho ảnh. Người bán xem ảnh gốc cạnh kết quả trên mẫu, đánh dấu đã kiểm tra và bấm dùng ảnh. Đây chỉ là đưa artwork vào bản chỉnh sửa; vẫn phải bấm **Lưu thông tin** và theo quy trình xét duyệt sản phẩm hiện có.

- Hỗ trợ áo thun, shirt, hoodie, sweater; chưa hỗ trợ áo khoác, quần, váy, giày, phụ kiện.
- Tách artwork theo đúng SKU và dáng nam/nữ/trung tính; không tự tạo màu hay SKU để bán.
- Bắt buộc có ảnh riêng đã lưu trên SKU. Không đoán màu từ ảnh bìa chung. Upload JPG/PNG/WebP/AVIF qua kho ảnh website; ảnh GIF và URL ngoài kho ảnh chưa hỗ trợ trong pilot.
- Có hàng đợi MongoDB, trạng thái QUEUED/RUNNING/READY/FAILED/REJECTED. Quay lại trang vẫn kiểm tra được yêu cầu gần nhất của SKU/dáng trên cùng trình duyệt.
- Yêu cầu cùng ảnh/SKU/dáng/model tái sử dụng kết quả READY hoặc yêu cầu đang chạy. Bỏ ảnh rồi bấm tạo lượt mới để tạo lại. requestId và chỉ mục duy nhất hạn chế gửi trùng.
- Giới hạn mặc định 10 lượt mới/shop/ngày UTC; giới hạn được dự trữ bằng cập nhật MongoDB nguyên tử. Lượt thất bại vẫn tính vào hạn mức; OpenAI có thể đã xử lý trước khi lỗi kết nối xảy ra.
- Không tự gọi lại AI sau lỗi, timeout hoặc khởi động lại. Công việc RUNNING quá 12 phút chuyển FAILED; không tự gửi lại yêu cầu có thể đã tính phí.
- Đọc ảnh nguồn qua S3 của chính website, không fetch URL người bán nhập. Quyền PRODUCT_WRITE và kiểm tra shop áp dụng cả tạo, đọc và kiểm tra ảnh.
- SKU tắt, sản phẩm chờ duyệt và ảnh/SKU đổi trước xử lý hoặc trước dùng ảnh đều bị chặn. Giá, tồn kho và gallery không bị job AI sửa.
- Nếu ảnh gốc hoặc ảnh AI không tải được, nút dùng ảnh bị khoá; tránh chấp nhận hình minh hoạ dự phòng của mannequin.

## Bật trên máy chủ

Trong `.env` của API (không đặt khoá vào frontend hoặc biến NEXT_PUBLIC):

```dotenv
AI_OUTFIT_ENABLED=true
OPENAI_API_KEY=your-server-key
AI_OUTFIT_MODEL=gpt-image-1.5
AI_OUTFIT_DAILY_LIMIT=10
```

API còn cần MongoDB và các biến STORAGE_* đang dùng cho upload sản phẩm. Kho S3/MinIO phải đọc được ảnh SKU, ghi được đường dẫn `artwork/ai/` và cho trình duyệt tải ảnh công khai. Production dùng STORAGE_PUBLIC_BASE_URL HTTPS. Local MinIO hỗ trợ ảnh URL `http://localhost:9000/…` hoặc `http://127.0.0.1:9000/…`; cần chạy MinIO và trình duyệt trên đúng máy. Không đưa khoá API vào ZIP hoặc commit Git.

1. `npm ci`
2. Khởi động MongoDB/Redis/MinIO theo hướng dẫn dự án; cấu hình `.env` rồi khởi động API và seller/web.
3. Khi AI bật, API tạo chỉ mục jobs/quota trước khi chạy worker. Tài khoản MongoDB cần quyền tạo index. Unique index là điều kiện để tránh tạo job trùng.
4. Mỗi instance API xử lý một job tại một thời điểm. Chạy nhiều instance tăng số job đồng thời; đặt hạn mức/quota OpenAI phù hợp. Chưa có worker độc lập hoặc hạn mức concurrency toàn cụm.
5. Tạo sản phẩm áo, upload ảnh riêng trên SKU, **lưu SKU**. Chọn dáng và tạo AI. Có thể mất vài phút.
6. Đối chiếu màu, logo, hoạ tiết, độ dài, cổ/tay áo và vị trí. Bỏ ảnh sai. Ảnh tốt: dùng ảnh → lưu thông tin → duyệt sản phẩm → kiểm tra buyer tại `/outfit` bằng đúng SKU/dáng.

Thao tác tạo mới gửi ảnh SKU tới OpenAI và có thể phát sinh phí trên tài khoản API. Pilot tắt mặc định; người vận hành chủ động bật. Model khác phải hỗ trợ image edits, nhiều ảnh tham chiếu, PNG trong suốt và 1024 × 1536. Tham khảo [Images edit API chính thức](https://developers.openai.com/api/reference/resources/images/methods/edit).

## Giới hạn cần hiểu

Đây là tự tạo **lớp ảnh 2D** cho mannequin, không phải tạo mesh trang phục 3D, không xoay được mặt sau, không mô phỏng độ vừa hoặc vải vật lý và chưa thử trên ảnh người mua. AI có thể làm sai logo, chất liệu, hình dáng hoặc vị trí; kiểm tra ảnh tự động chỉ loại lỗi khung/nền rõ ràng, không xác nhận giống hàng thật. Mẫu đổi bề ngang vẫn kéo giãn ảnh theo renderer v16; phải đánh giá chất lượng thực tế với các dáng cơ thể trước phát hành.

Chưa có ảnh AI thật được tạo trong phiên bàn giao vì chưa cấu hình khoá API. Test API dùng provider/kho ảnh giả lập; test UI dùng fixture. Cần chạy pilot với ít nhất 10–20 ảnh áo thật, kiểm tra ba dáng, tỷ lệ ảnh đạt và chi phí trước bật cho mọi shop. Không thể kết luận chất lượng hoặc khả năng giữ chính xác logo khi chưa thử trên hàng thật.

Ảnh chưa dùng vẫn tồn tại trong kho; chưa có tác vụ dọn artwork bị bỏ hoặc job cũ. Chỉ ID yêu cầu gần nhất được lưu trên trình duyệt; chưa có màn hình lịch sử và khôi phục yêu cầu từ trình duyệt/máy khác. Một source URL bị thay nội dung ngoài quy trình upload có thể làm cache lỗi thời; hệ thống upload hiện tạo key mới cho mỗi ảnh, nên hãy thay ảnh bằng upload mới. Chưa đo tải thật, chưa kiểm tra lỗi/khôi phục MongoDB và S3 thật trong phiên này.

## Kiểm tra

- `npm run test:ai-artwork`: build Nest + kiểm thử API/xử lý ảnh bằng fake models/provider.
- `npm run typecheck`: toàn workspace.
- Chạy fixture shopping và seller/web rồi `E2E_SHOPPING_FIXTURE=1 npm run e2e -- e2e/tests/ai-artwork.spec.ts e2e/tests/fashion-game.spec.ts`.

Xem `docs/QA-V17.md` cho các kết quả bàn giao và phạm vi thực tế đã kiểm tra.
