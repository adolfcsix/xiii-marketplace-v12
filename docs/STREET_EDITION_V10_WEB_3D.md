# Street Edition v10 — Tối ưu Buyer web và ThreeUI 3D

## Kết quả thay đổi

Buyer web dùng runtime phát triển từ Energy Orb và Constellation Field của MengTo/threeui. Giữ ba file nguồn gốc để kiểm tra hash và bản quyền MIT; bản đang chạy dùng StreetEnergyOrb.tsx cùng shader biến thể của XIII, không tải thư viện hiệu ứng hoặc CDN mới.

- Khối cầu xoay bề mặt theo chuột bằng hai ma trận xoay 3D trong shader. Vị trí theo chuột được nội suy theo thời gian; rời khối cầu sẽ trở lại trung tâm. Các vòng quỹ đạo vẫn phối hợp với chiều nghiêng của khối cầu.
- Thanh tốc độ cập nhật thời gian tích lũy từng frame, không nhân lại toàn bộ thời gian từ lúc mount nên không nhảy pha khi đổi tốc độ. Tạm dừng, rời viewport, tắt chuyển động hoặc ẩn tab giữ pha khối cầu trong host để tiếp tục khi bật lại.
- Tự động / Nhẹ / Chi tiết điều chỉnh ngân sách pixel, DPR và giới hạn lần vẽ. Lưu lựa chọn trên trình duyệt. Đổi chất lượng cập nhật cùng GPU program, không biên dịch lại shader hoặc tạo context mới.
- Chế độ tự động xét chiều rộng, số luồng CPU và saveData; khi các khoảng frame kéo dài liên tục, hạ độ phân giải thêm có giới hạn. Đây là heuristic theo frame delivery, không phải đo GPU time trực tiếp. Đổi mức chất lượng đặt lại tỉ lệ hạ tự động.
- Thẻ sản phẩm, hero, editorial và gallery nghiêng theo chuyển động có nội suy, chỉ duy trì RAF khi cần hội tụ tới vị trí mới. Dừng trên thiết bị không có hover con trỏ chính xác. Dialog mở sẽ xóa chiều nghiêng ngay cả khi chuột chưa di chuyển tiếp.
- Constellation giới hạn DPR/FPS và chuẩn hóa vận tốc, lực hút theo khoảng thời gian giữa frame. Giữ bộ vẽ particle/link từ nguồn gốc. Tiếp tục tải cục bộ trong iframe sandbox, không chặn CTA hoặc mua sắm.
- Shader, program và buffer được dọn khi unmount; context đã tách khỏi DOM được giải phóng qua WEBGL_lose_context nếu trình duyệt hỗ trợ. Cleanup không giả lập lỗi cho nút tạm dừng. Trường hợp không có WebGL, lỗi compile/link hoặc mất context dùng khối cầu tĩnh và nút thử lại.

## Các mức chất lượng

| Mức | DPR tối đa | Ngân sách pixel khối cầu | Giới hạn lần vẽ mục tiêu |
|---|---:|---:|---:|
| Auto — compact / thiết bị hạn chế | 1 | 160.000 | 30/giây |
| Auto — desktop | 1,5 | 450.000 | 45/giây |
| Nhẹ | 1 | 180.000 | 30/giây |
| Chi tiết | 2 | 950.000 | 60/giây |

Đây là mức trần; FPS thực tế phụ thuộc GPU và tần số màn hình. Auto có thể hạ pixel thêm khi frame delivery chậm. Giới hạn pixel áp dụng cho framebuffer shader khối cầu; canvas sao và Constellation dùng trần DPR riêng. Ở phép đo viewport 390×844, deviceScaleFactor 3, kích thước khối cầu 309×309: bản cũ theo DPR 2 cần 618×618 = 381.924 pixel, auto mới 309×309 = 95.481 pixel, giảm 75% pixel. Đây không phải tuyên bố giảm 75% thời gian GPU, RAM hoặc điện năng.

## Xác minh

**40/40 Chromium, 7/7 kiểm tra đơn vị/hash, typecheck cả bốn workspace và production build Buyer đều qua.**

Kiểm thử shader WebGL thực bằng SwiftShader: link program, pixel alpha, màu, uniform tương tác, pha sau đổi tốc độ/pause, profile đổi cùng program, đếm draw calls, giải phóng context và fallback. Có kiểm tra DPR mobile thực với scale factor 3, viewport 320 px và giảm chuyển động.

Chạy lại các bài Constellation, Energy Orb, depth và shopping (Quick View/outfit/size advice). Kiểm tra đơn vị hash gốc, ngân sách pixel, thời gian tích lũy, shader xoay 3D và chuẩn hóa timing Constellation. Kết quả, số đo và ảnh ở docs/qa/threeui-v10. Typecheck cả bốn workspace và production build Buyer. API catalog dùng fixture và thao tác ghi mua sắm dùng mock, không chạy lại checkout/database/payment thật. SwiftShader là GPU phần mềm, không thay thế đo FPS trên điện thoại thật.

## Cập nhật

ZIP đầy đủ tiếp nối v9; giữ các công cụ ảnh, Seller, Admin và mua sắm. Dừng bản cũ, giải nén vào thư mục mới, giữ .env và chạy UPDATE_XIII_WINDOWS.bat để cập nhật không seed. Chạy lại Buyer web; không cần migration database.

Chạy kiểm tra đơn vị: npm run test:threeui-runtime. Bộ browser cần catalog fixture cục bộ và E2E_SHOPPING_FIXTURE=1. Xem third-party/threeui/README.md để biết nguồn và các phần được phát triển tiếp.
