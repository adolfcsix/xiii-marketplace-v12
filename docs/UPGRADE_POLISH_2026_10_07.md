# XIII — bản sửa lỗi và hoàn thiện trải nghiệm ngày 07/10/2026

Bản này được chỉnh trực tiếp từ gói `xiii-marketplace-auth-session-complete(2).zip`. Hai gói `(1)` và `(2)` được gửi trong cuộc hội thoại có nội dung giống nhau.

## Những lỗi đã sửa

- 107 trường ObjectId trong 24 schema từng bị Nest/Mongoose nhận thành `Mixed`, khiến truy vấn địa chỉ và dữ liệu liên kết không tự chuyển chuỗi ID thành ObjectId. Đổi phần khai báo schema sang `Schema.Types.ObjectId`, giữ `Types.ObjectId` cho giá trị và kiểu TypeScript.

- Hủy đơn và xác nhận nhận hàng từng gặp HTTP 500 vì ghi nhiều bản ghi lịch sử trong transaction bằng `create()` thiếu `ordered: true`. Hiện ghi tuần tự trong transaction.
- API không biên dịch được vì import `TooManyRequestsException` không tồn tại trong NestJS đang dùng. Thay bằng `HttpException` với mã HTTP 429.
- Kiểu bộ lọc tồn kho không khớp kiểu mà service nhận.
- Các bảng ánh xạ đơn hàng/shop/người mua thiếu kiểu cặp khóa–giá trị, gây lỗi TypeScript.
- Các thao tác catalog chưa xử lý shop không tồn tại.
- Hai trường ngày của banner CMS thiếu `type: Date`, làm API dừng ngay khi khởi động.
- Tham số giá không được nhập bị chuyển thành `0`, khiến tìm kiếm bị lọc mất sản phẩm.
- Phân trang chỉ hiển thị các trang đầu, kể cả khi đang ở trang xa hơn; cửa sổ trang hiện bám theo trang đang chọn.
- Từ khóa `sale` không lọc được sản phẩm giảm giá. API hiện lọc biến thể có giá so sánh cao hơn giá bán; các khối sản phẩm CMS cũng áp dụng từ khóa được cấu hình.
- Các dòng chữ trong banner bị áp CSS định vị của khung ngoài, gây chồng chữ.
- Thẻ sản phẩm có nút yêu thích và nút túi chưa hoạt động. Trái tim hiện lưu được; nút túi mở trang chọn màu/size trước khi mua.
- Cập nhật giỏ có thể chồng nhau và ghi đè giao diện. Các thay đổi từ màn hình giỏ hiện được khóa trong lúc yêu cầu đang chạy.
- Thêm vào giỏ/đặt hàng có thể nhận nhiều lần bấm. Dùng khóa đồng bộ và trạng thái đang xử lý để chặn yêu cầu trùng từ giao diện.
- Kết quả tính tiền có thể trả về sai thứ tự khi đổi địa chỉ/vận chuyển/voucher. Yêu cầu cũ được hủy, kết quả cũ bị bỏ qua, nút đặt hàng chỉ hoạt động với báo giá tương ứng lựa chọn hiện tại.
- Lỗi tải giỏ từng bị trình bày như giỏ trống. Hiện có thông báo và nút thử lại.
- Lỗi CMS hoặc dữ liệu phụ từng có thể làm biến mất cả catalog/sản phẩm. Các nguồn dữ liệu phụ được tải độc lập.
- Đường dẫn `next` sau đăng nhập có thể nhận `//...` hoặc dấu gạch chéo ngược. Buyer/Seller/Admin hiện chỉ nhận đường dẫn nội bộ hợp lệ.
- Làm mới phiên bị lỗi kết nối từng có thể xóa phiên đang dùng. Lỗi tạm thời hiện giữ dữ liệu phiên để người dùng thử lại.
- Phản hồi làm mới phiên đang chạy có thể ghi lại token sau khi đăng xuất cục bộ. Có kiểm tra phiên bản phiên và token trước khi ghi.
- Refresh JWT từng được đưa trực tiếp vào bcrypt, vốn giới hạn độ dài đầu vào. Hiện băm toàn bộ token bằng SHA-256 trước bcrypt, thêm định danh ngẫu nhiên và thay token bằng cập nhật có điều kiện để chặn phát lại đồng thời.
- Các hàm API hiện xử lý phản hồi không phải JSON, HTTP 204, đối tượng `Headers` và giới hạn thời gian chờ.

## Giao diện và tính năng mới

- Phong cách đen/trắng kết hợp màu lime; thẻ sản phẩm rộng hơn, khoảng cách và chữ dễ đọc hơn.
- Thanh đầu trang cố định; tìm kiếm và các liên kết catalog dùng điều hướng của Next.js.
- Trang yêu thích `/wishlist`, lưu tối đa 100 sản phẩm trên trình duyệt hiện tại. Danh sách này chưa đồng bộ sang thiết bị khác; giá và tồn kho được xác nhận lại ở trang sản phẩm.
- Màn hình đăng nhập mới, đăng ký tài khoản Buyer và nút hiện/ẩn mật khẩu.
- Form đánh giá bằng hộp thoại trong trang, chọn 1–5 sao, nhận xét tối đa 2.000 ký tự, giữ nội dung khi gửi lỗi.
- Bộ lọc gấp/mở trên điện thoại; nút yêu thích, giỏ và tài khoản vẫn truy cập được.
- Trang trợ giúp `/help`, hướng dẫn chọn size, liên kết đến các phần mô tả/đánh giá, trang lỗi và trang 404.
- Ảnh sản phẩm tải trì hoãn, có ảnh thay thế; hiệu ứng hover/nhấn, thông báo xuất hiện nhẹ và khung tải skeleton.
- Hiệu ứng tôn trọng lựa chọn giảm chuyển động của thiết bị. Có dấu focus khi dùng bàn phím.
- Seller/Admin có cải thiện phản hồi nút, focus và kích cỡ ô nhập trên điện thoại.
- Bổ sung `package-lock.json` và khóa PostCSS đã vá. Tài liệu tham khảo: https://github.com/advisories/GHSA-fxqj-rqcc-2cmp .

## Cập nhật trên Windows và giữ dữ liệu hiện tại

1. Dừng các cửa sổ đang chạy API/Web/Seller/Admin.
2. Giải nén gói mới vào một thư mục riêng; giữ nguyên thư mục dự án con tên `xiii-marketplace`.
3. Chép `.env` đang dùng từ thư mục cũ sang thư mục `xiii-marketplace` mới. Không đưa `.env` lên nơi công khai.
4. Nếu đã có dữ liệu, chạy `UPDATE_XIII_WINDOWS.bat`. File này đồng bộ dependencies và khởi động, nhưng bỏ qua bước seed.
5. Nếu là lần chạy đầu tiên và muốn dữ liệu mẫu, dùng `RUN_XIII_WINDOWS.bat` như trước.
6. Đăng xuất và đăng nhập lại Buyer/Seller/Admin sau khi cập nhật để nhận refresh token theo định dạng mới. Tài khoản và dữ liệu mua hàng vẫn giữ nguyên.

Runner Windows so sánh hash lockfile với bản dependencies đã cài, nên không bỏ qua việc cập nhật chỉ vì thư mục `node_modules` đã tồn tại.

## Các lệnh kiểm tra

```powershell
npm ci
npm run typecheck
npm run build
npm run test:regressions
npm run test:schemas
npm run runtime:smoke
npm run e2e:install
npm run e2e
```

`runtime:smoke` và `e2e` cần API và ba giao diện đang chạy, cùng dữ liệu mẫu phù hợp. Bộ E2E có thao tác tạo đơn và đánh giá, nên chạy trên dữ liệu thử nghiệm. Các kiểm tra regression đơn vị dùng mô phỏng API để kiểm tra cạnh tranh yêu cầu và lỗi mạng; kiểm thử trình duyệt dùng API và MongoDB thật.

## Kết quả xác minh

Kết quả cuối cùng nằm trong [`QA_RESULTS.md`](../QA_RESULTS.md) cùng các log được rút gọn trong `docs/qa/`.

## Phạm vi đã kiểm chứng và phần cần cấu hình riêng

Đã kiểm tra code toàn workspace, các bộ kiểm tra cấu trúc, build, khởi động API, dữ liệu mẫu, các endpoint chính và giao diện máy tính/điện thoại. Luồng thử nghiệm sử dụng MongoDB replica set thật trong môi trường tách biệt.

MoMo/VNPAY với tài khoản merchant thật, IPN công khai, upload S3/MinIO, Redis khi vận hành và Docker/PowerShell trực tiếp trên máy Windows của bạn cần được xác minh trong môi trường tương ứng. Các bài kiểm tra ở đây không thay thế việc kiểm thử triển khai với các dịch vụ đó. Logout hiện thu hồi refresh token; access token đã cấp vẫn tuân theo thời hạn JWT hiện có của hệ thống.

Một lượt kiểm tra không chứng minh mọi tình huống đều không còn lỗi. Bản này sửa các lỗi đã phát hiện và kèm bằng chứng kiểm tra để bạn có thể chạy lại.
