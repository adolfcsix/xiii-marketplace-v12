# Street Edition v8.2 — Sửa định dạng ảnh tải lên

## Thay đổi

- Seller ảnh sản phẩm và Admin CMS dùng chung xử lý ảnh: nhận diện JPEG, PNG, WebP, GIF, AVIF từ chữ ký nội dung thay vì tin vào tên hoặc MIME do trình duyệt cung cấp. JPG/JPEG/JFIF hợp lệ được chuẩn hóa thành MIME image/jpeg và đuôi .jpg; các định dạng khác cũng được đồng bộ.
- Kiểm tra file rỗng, dung lượng và khả năng giải mã ảnh trước khi xin URL upload. Báo rõ ảnh hỏng hoặc định dạng không hỗ trợ. HEIC/HEIF cần xuất sang JPG/PNG; SVG không nhận.
- Không resize hay nén lại: giữ nguyên bytes, nền trong suốt và GIF động. Không tự cắt ảnh theo tỷ lệ banner.
- Seller tải từng ảnh và giữ ngay URL thành công; một file lỗi không làm mất các ảnh còn lại, batch tiếp tục xử lý. Xóa giá trị input sau chọn để chọn lại cùng file khi cần.
- Admin thêm input upload riêng cho banner điện thoại. Banner chính/điện thoại, danh mục và thương hiệu áp dụng đúng mục đích upload. Hiển thị định dạng và giới hạn tương ứng.
- Khóa thao tác lưu/gửi duyệt Seller trong lúc tải ảnh; khóa lưu biểu mẫu và đổi tab/chọn banner Admin để tránh lưu thiếu ảnh hoặc áp dụng ảnh sang biểu mẫu khác.
- Upload có thời hạn 60 giây và báo rõ lỗi mạng, HTTP hoặc liên kết hết hạn. File được đặt cuối multipart, sau các trường presigned POST.
- API cho phép GIF/AVIF và các MIME JPEG/PNG phổ biến, ký policy bằng MIME chuẩn, giữ giới hạn theo mục đích. Từ chối cả tên MIME trùng khóa prototype.

| Mục đích | Tối đa mỗi ảnh |
|---|---:|
| PRODUCT_IMAGE, SHOP_BANNER, REVIEW_IMAGE, RETURN_IMAGE | 10 MB |
| SHOP_LOGO, AVATAR, BRAND_LOGO | 5 MB |
| CMS_BANNER | 12 MB |
| CATEGORY_IMAGE | 8 MB |

Luồng nhận diện nội dung mới áp dụng cho các input upload hiện có ở Seller Product Editor và Admin CMS. Buyer review/return và Seller shop settings đang nhập URL; bản này không thêm upload mới cho các trang đó.

## Xác minh

- Typecheck và production build cả bốn workspace qua.
- 4 kiểm tra đơn vị nhận diện/filename/giới hạn; 2 kiểm tra policy API; 4 size advice và 3 hash ThreeUI qua.
- 8 kiểm tra Chromium upload: MIME trống, đuôi sai, chọn lại cùng file, batch có lỗi, ảnh hỏng, HEIC, dung lượng, lỗi storage, đúng trường Admin và khóa thao tác. Cả năm định dạng được kiểm tra bằng ảnh thật; bytes multipart bằng bytes gốc, gồm GIF hai frame.
- Chạy lại bộ shopping-tools với fixture để kiểm tra tính năng mua sắm v8.1. Kết quả ở docs/qa/uploads-v8-2/e2e-summary.json.
- Verifier CMS, Seller catalog và production hardening qua; đây là kiểm tra tĩnh.

Kiểm tra trình duyệt dùng API fixture và storage mock cục bộ, không ghi lên object storage thật. Kiểm tra API thực sự tạo và đọc presigned policy bằng credential giả, không gọi S3. API kiểm tra metadata và policy; không kiểm tra bytes ở server sau upload. Browser decoder support phụ thuộc trình duyệt; ảnh không giải mã được sẽ báo lỗi để xuất lại JPG/PNG.

## Cập nhật

Đây là ZIP đầy đủ, giữ các phần 3D và shopping đã có. Dừng ứng dụng cũ, giải nén vào thư mục mới, giữ cấu hình .env đang dùng và chạy UPDATE_XIII_WINDOWS.bat để cập nhật không seed lại dữ liệu. Cần khởi động lại API, Seller và Admin vì cả frontend lẫn danh sách MIME backend đã thay đổi.

Để chạy kiểm tra: npm run test:uploads. Bộ trình duyệt yêu cầu fixture cục bộ và E2E_SHOPPING_FIXTURE=1; không bật cờ này với dữ liệu khách hàng thật.
