# QA v17.1 — kiểm tiếp trước triển khai — 2026-10-08

## Các lỗi và thiếu sót đã sửa

1. **Docker thiếu source dùng chung.** Dockerfile Next cũ chỉ chép thư mục app, nhưng seller import renderer từ web và các app import `shared`. Đổi sang giữ cấu trúc workspace, chép đủ source, cài bằng `npm ci` với lockfile. Runtime giữ đúng đường dẫn build và next.config. Dockerfile API cũng dùng cùng lockfile thay vì cài lại theo range. CI có job build image cho API/web/seller/admin; job này chưa được chạy trên GitHub trong phiên bàn giao.
2. **ID trong schema job AI bị Mixed.** Dùng `Types.ObjectId` làm schema type khiến Mongoose không cast chuỗi thành BSON ObjectId. Đổi shopId/productId sang `MongooseSchema.Types.ObjectId`; kiểm thử schema thật xác nhận việc cast.
3. **Worker chưa kiểm lại đủ quyền.** Worker trước đây gọi sellerOne, chỉ kiểm tra shop có liên hệ với tài khoản. Nay kiểm tra tài khoản ACTIVE, vai trò SELLER/ADMIN/SUPER_ADMIN, quyền PRODUCT_WRITE và shop ACTIVE cả lúc chuẩn bị ảnh và ngay trước gửi tới provider. Job bị thu quyền/block trong lúc xếp hàng hoặc tải ảnh dừng trước gọi AI.
4. **Hoàn quota khi insert chưa rõ kết quả.** Lỗi network có thể xảy ra sau khi database đã ghi job; hoàn lượt trong tình huống này có thể vượt hạn mức. Nay chỉ hoàn reservation cho lỗi duplicate chắc chắn, giữ lượt khi kết quả ghi chưa rõ. Khi quota đầy vẫn kiểm lại job trùng để tái sử dụng. Lỗi database của worker được ghi log an toàn, không nuốt im lặng.
5. **Cấu hình production chưa chặt.** Chặn secret mặc định `change-me`/`REPLACE_ME`, public image base URL HTTP hoặc có credentials/query/fragment. AI bật nhưng thiếu key/kho ảnh, boolean sai hoặc quota ngoài 1–100 bị chặn ngay lúc khởi động API.
6. **Thư viện xử lý ảnh có advisory mức High.** Nâng và cố định sharp 0.35.5 cho API và dependency Next, cập nhật lockfile/overrides. Đổi cách import type để build Nest/CommonJS tương thích bản mới. Advisory gốc: [librsvg](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), [libheif](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c), [libvips](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj).
7. **Ảnh nguồn giả định dạng và kết quả sai SKU.** Chặn SVG/GIF giả đuôi ảnh trước decode; JPG/PNG/WebP/AVIF thực được kiểm tra bằng xử lý ảnh thật. Kết quả provider phải là PNG đúng khung. UI kiểm tra SKU/dáng của job ở các bước tải lại, tạo và polling trước khi hiển thị; không đặt ảnh của SKU/dáng khác lên lựa chọn hiện tại.
8. **Hai selector E2E trùng desktop/mobile.** Chọn các nút/gallery đang hiển thị để kiểm đúng viewport; không bỏ test hoặc giảm yêu cầu trạng thái busy, chống gửi trùng và swipe.

## Kết quả xác minh

- 41 test TypeScript: PASS, gồm phiên đăng nhập/logout/refresh của buyer/seller/admin, upload, bảng size và renderer/chuyển động.
- 39 test API/ảnh/config/schema: PASS — 12 AI/xử lý ảnh, 2 cấu hình, 25 nhóm schema. Test dùng schema Mongoose thật để kiểm cast, fake models/provider cho job.
- 8 test realtime auth và presigned storage: PASS. Một test seed yêu cầu database thật được SKIP; không tính vào số đạt.
- Typecheck toàn workspace: PASS.
- `npm ci` từ thư mục kiểm tra riêng rồi build đủ admin/seller/web/API: PASS. Đã cài lại và build lại sau nâng thư viện ảnh. Không dùng node_modules đang có sẵn của thư mục phát triển để thay cho lần cài sạch.
- Runtime được kiểm bằng dependency tree `npm ci --omit=dev`; giao diện chạy bằng production build trên Node của môi trường kiểm tra.
- `npm audit --omit=dev` sau bản vá: 0 advisory ở mọi mức trong lượt quét. Điều này không chứng nhận toàn bộ ứng dụng an toàn hoặc các advisory mới sẽ không xuất hiện.
- 22 verifier cấu trúc/domain: PASS. Các verifier không thay cho kiểm thử thanh toán/đơn hàng qua server thật.

- 48 kịch bản Playwright khác nhau đạt qua các lượt chạy: 6 AI, 6 Dress Up, 9 Fit Studio, 15 shopping tools, 3 button feedback và 9 shopping motion (gồm tối ưu ảnh WebP thật qua Next/sharp).
- Lượt bộ 48 sau nâng thư viện đạt 47, còn một test nút bị selector trùng; sau ghi đúng selector, chạy lại cả 3 test button feedback đều PASS. Lượt trước cũng có selector gallery trùng, đã sửa và đạt trong lượt bộ 48. Không cộng số test chạy lặp, không che giấu các lượt thất bại và không khẳng định một lượt duy nhất đã đạt cả 48.
- UI và giỏ/upload dùng fixture/mock. Test tối ưu ảnh dùng file WebP thực và production image optimizer với sharp 0.35.5; nó không gọi OpenAI.

## Chưa thể xác nhận production hoàn chỉnh

Môi trường phiên này không có Docker/Compose, MongoDB/Redis/MinIO thật hoặc khoá OpenAI. Preflight báo thiếu Docker/Compose; một lượt DNS registry lỗi tạm thời nhưng các lượt npm ci/audit sau đó thành công. **Chưa chạy `docker build` hoặc compose trên host thật**: việc build workspace trên host và CI job đã thêm không phải bằng chứng image container đã build/run thành công. Node kiểm tra là 24; Dockerfile dự kiến Node 22 Alpine, cần CI/host Docker xác minh khác biệt native binaries/musl.

Chưa thử tạo ảnh AI thật, thanh toán merchant thật/sandbox toàn tuyến, index MongoDB dưới tải đồng thời, backup/restore trên database thật, TLS/domain thực hoặc kiểm thử tải. Không khẳng định mọi chức năng của marketplace đã đạt end-to-end. Bản này tiếp tục phù hợp cho staging có kiểm soát; chưa coi là chứng nhận sẵn sàng mở bán đại trà.

AI vẫn tắt mặc định. Khi bật, dùng hướng dẫn `docs/AI-OUTFIT-V17.md`; trong v17.1, cấu hình bật AI thiếu điều kiện sẽ làm API từ chối khởi động, thay vì chạy với tính năng âm thầm tắt. Quota có thể bị giữ khi lỗi database chưa rõ đã ghi job hay chưa; ưu tiên không vượt lượt gọi trả phí, cần người vận hành kiểm tra job/quota để xử lý tình huống này.

## Bàn giao

ZIP đầy đủ dự án kế thừa v17, giữ file gốc và tài liệu lịch sử. Không chứa runtime .env/khoá API, node_modules, build/cache hoặc log tạm. CRC và tính đầy đủ so với ZIP v17 được kiểm trước bàn giao. Không push code, deploy hoặc bật AI trên hệ thống thật trong phiên này.
