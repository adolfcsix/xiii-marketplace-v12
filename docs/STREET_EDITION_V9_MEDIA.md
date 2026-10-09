# Street Edition v9 — Xem trước, chỉnh và tải ảnh

## Dùng bộ chỉnh ảnh

Seller Product Editor vẫn có upload nhanh như v8.2. Mở **Chỉnh ảnh trước khi tải** khi muốn xem trước/cắt/xoay. Admin cũng có mục chỉnh ảnh riêng cạnh upload banner chính, banner điện thoại, ảnh danh mục và logo thương hiệu.

1. Chọn file. Nội dung file được kiểm tra theo chính sách định dạng/dung lượng v8.2 trước khi hiển thị; bước này chưa upload lên storage.
2. Chọn tỷ lệ gốc, 1:1, 4:5, 16:9, 3:1 hoặc 9:16. Xoay 90°, phóng vùng cắt và dịch ngang/dọc bằng thanh trượt. Canvas hiển thị đúng vùng sẽ xuất.
3. Bấm **Áp dụng chỉnh sửa** nếu muốn chỉnh tiếp trên kết quả. Hoặc bấm **Tải N ảnh lên** để áp dụng vùng cắt hiện tại và tải ngay. Vùng cắt được giữ riêng khi chuyển giữa các ảnh trong danh sách.
4. Ảnh chưa chỉnh giữ nguyên bytes. Ảnh chỉnh được xuất PNG, giữ alpha; không upscale hay đặt kích thước cố định. Kích thước xuất dựa trên vùng cắt; giới hạn 32 triệu pixel khi chỉnh để tránh canvas quá lớn. File PNG sau chỉnh vẫn phải nằm trong giới hạn MB theo mục đích.
5. GIF tải nguyên để giữ chuyển động; canvas chỉ xem trước một khung hình và các nút chỉnh bị bỏ khỏi GIF. HEIC/HEIF cần xuất JPG/PNG như v8.2.

Upload thành công thêm URL vào biểu mẫu. File thất bại giữ trong hàng đợi để thử lại; không gửi lại file đã thành công. **Bỏ ảnh đã chọn** hủy hàng đợi, không xóa file đã upload. Các biểu mẫu khóa lưu/gửi trong lúc xử lý và khi còn file chưa upload, để tránh mất ảnh đã chọn.

## Sắp xếp gallery sản phẩm

Tất cả ảnh URL đều có thẻ xem trước, ảnh đầu tiên được ghi **Ảnh bìa**. Kéo một thẻ vào vị trí khác để đổi thứ tự; nút tiến/lùi và xóa hỗ trợ bàn phím và điện thoại. Thứ tự mới được ghi đúng vào payload images khi lưu sản phẩm. Không giới hạn xem trước ở sáu ảnh như trước.

## Upload trực tiếp mới

| Nơi dùng | Purpose | Dữ liệu được lưu | Giới hạn |
|---|---|---|---|
| Seller shop logo | SHOP_LOGO | logo | 5 MB |
| Seller shop banner | SHOP_BANNER | banner | 10 MB |
| Seller ảnh riêng SKU | PRODUCT_IMAGE | variant.image | 10 MB |
| Buyer đánh giá | REVIEW_IMAGE | review.media | 6 ảnh, 10 MB/ảnh |
| Buyer trả hàng | RETURN_IMAGE | evidenceUrls | 8 URL tổng, 10 MB/ảnh |

Shop vẫn giữ ô URL chỉnh tay; ảnh upload cập nhật đúng ô và bản xem trước. Tài khoản thiếu SHOP_SETTINGS không chọn hoặc lưu được ảnh shop. Ảnh SKU không tự thêm vào gallery sản phẩm. Ảnh review hiển thị trong danh sách đánh giá của người mua và đánh giá công khai ở trang sản phẩm; có thể mở ảnh gốc. Review dialog khóa đóng khi upload đang chạy. Trả hàng giữ ô URL cho bằng chứng ảnh/video; uploader mới chỉ nhận ảnh, tính số URL có sẵn vào giới hạn tám và kiểm tra lại số chỗ trống trước upload.

Các URL upload chỉ được gắn vào product/shop/review/return khi người dùng lưu hoặc gửi biểu mẫu. Bỏ biểu mẫu sau upload có thể để lại object chưa được tham chiếu; bản này chưa có dọn object tự động.

## Xác minh

35/35 kiểm tra Chromium qua (12 workflow mới, 8 upload v8.2, 15 shopping). 16 kiểm tra unit/policy/size/hash, typecheck và production build cả bốn workspace qua. Các verifier CMS, Seller catalog, reviews, after-sales và hardening qua; verifier là kiểm tra tĩnh.

Đã sửa các grid item không co lại và ô file có min-width tự động gây tràn ngang. Bộ kiểm tra chạy với route cache đã xóa sau build để không dùng trang HTML từ bản dựng cũ.

Kiểm tra trên production builds, Chromium desktop và mobile 375×812. Kiểm tra mới bao phủ pixels sau cắt/xoay (gồm alpha), giữ vùng cắt mỗi file, bytes ảnh chưa chỉnh, kéo thả/nút/xóa và thứ tự payload, shop logo/banner, SKU riêng, review và return attachments, giới hạn số lượng, retry chỉ file thất bại, ảnh pending khóa lưu, quyền xem shop và layout điện thoại. Có ba bài geometry unit kiểm tra vùng cắt trong biên sau xoay/zoom/pan. Xem kết quả và hình chụp ở docs/qa/media-v9.

Bộ shopping-tools và upload v8.2 cũng được chạy lại. Test pointer 3D chờ motion được khởi tạo và di chuyển chuột sau auto-scroll để tránh scroll cleanup làm mất thuộc tính trước khi kiểm tra; renderer/runtime 3D không đổi.

Dữ liệu API và ghi storage trong kiểm tra trình duyệt là fixture/mock cục bộ; không thay thế kiểm thử MongoDB/MinIO thật. API review đã hỗ trợ media và return đã hỗ trợ evidenceUrls, không đổi schema. Chính sách MIME/dung lượng và kiểm tra hash ThreeUI vẫn được giữ.

## Cập nhật

ZIP đầy đủ tiếp nối v8.2, giữ toàn bộ các phần 3D và shopping. Dừng bản cũ, giải nén sang thư mục mới, giữ cấu hình .env và chạy UPDATE_XIII_WINDOWS.bat để cập nhật không seed lại dữ liệu. Khởi động lại Buyer, Seller và Admin. Không cần migration database cho bản này.

Kiểm tra đơn vị: npm run test:image-editor và npm run test:uploads. Kiểm tra trình duyệt dùng fixture local với E2E_SHOPPING_FIXTURE=1, không dùng cờ fixture với dữ liệu khách hàng thật.
