# XIII Marketplace — v18 Liquid Glass

Bản nâng cấp từ toàn bộ mã nguồn v17.2 người dùng cung cấp. Ngày: 09/10/2026.

## Những thay đổi

- Nút kính có viền sáng, nền mờ và ánh sáng theo con trỏ. Khi nhấn, nút biến dạng nhẹ rồi hồi lại. Áp dụng cho các nút mua hàng, giỏ hàng, yêu thích, xem nhanh, phối đồ, đăng nhập và nút chính trên trang chủ.
- Trang chủ mặc định có khối chất lỏng 3D bạc–đen biến đổi liên tục và phản ứng theo chuột; thêm thẻ áo XIII có độ sâu, dẫn đến phòng phối đồ.
- Cân chỉnh bề mặt kính của header, ô tìm kiếm và góc bo ảnh sản phẩm, giữ bố cục streetwear đen trắng.
- Các tương tác lớp sâu, gallery, chuyển động khi cuộn và EnergyOrb từ bản trước tiếp tục được sử dụng cùng bộ nút mới.
- Banner CMS riêng tiếp tục dùng nội dung chiến dịch của người bán/quản trị; hiệu ứng liquid mới dành cho hero mặc định.

## Chuyển động và hiệu năng

- Renderer WebGL được tải riêng; giới hạn tối đa 300.000 pixel và dùng cấu hình chất lượng chung của web (30/45/60 FPS tùy chế độ).
- Dừng vẽ khi hero ra ngoài màn hình hoặc tab bị ẩn. Hồi phục khi WebGL mất và khôi phục context.
- Tắt chuyển động hoặc bật Reduce Motion của hệ điều hành sẽ dùng khối trang trí tĩnh. Khi WebGL không khả dụng, nội dung và nút mua sắm vẫn dùng được.
- Nút sử dụng một bộ xử lý sự kiện chung; không tạo vòng lặp chạy nền cho từng sản phẩm. Giữ hoạt động mặc định của chuột, bàn phím và cảm ứng.

## Nguồn tham khảo

Tham khảo hai video được gửi và https://github.com/MengTo/threeui.
Các bản chuyển thể ThreeUI đã có trong v17.2 cùng thông tin MIT được giữ nguyên, gồm EnergyOrb, Constellation và nền tảng nút Launch Button. Xem docs/licenses/THREEUI-BUTTONS-LICENSE.txt và các tài liệu ThreeUI có sẵn.
Bộ shader giọt nước `liquid-shader.ts`, runtime `liquid-sculpture.tsx` và tương tác `liquid-controls.tsx` được viết riêng cho XIII theo hướng hình ảnh đó. Đây là hiệu ứng web lấy cảm hứng từ Liquid Glass, không sử dụng renderer riêng của Apple hay mã Pro không được cấp quyền.

## Kiểm chứng

- `npm run typecheck --workspace apps/web`: PASS.
- Build production sạch: `npm run build --workspace apps/web`: PASS.
- Tổng cộng 9 kiểm tra Chromium trên production build: PASS (8 trường hợp trong lượt chạy chung và 1 trường hợp giỏ hàng chạy lại sau khi sửa selector kiểm thử chọn đúng nút hiển thị).
- Kiểm tra gồm: ảnh WebGL thực sự được vẽ, điều hướng mua sắm, pointer/keyboard, yêu thích, chặn nhấn lặp khi giỏ hàng đang xử lý, lưu tùy chọn chuyển động, Reduce Motion, không hỗ trợ WebGL, màn hình cảm ứng 320px, dừng renderer ngoài màn hình, khôi phục WebGL context.
- Ảnh đã kiểm tra trực quan: `docs/qa/liquid-v18/desktop.png`, `mobile.png`, `product.png`.
- Dữ liệu API trong kiểm thử là fixture cục bộ. Không kiểm chứng giao dịch thanh toán hoặc backend production trong đợt nâng cấp giao diện này; chưa thử trên thiết bị iOS thật.

## Chạy trên Windows

Giải nén toàn bộ bản này vào một thư mục mới. Sử dụng cấu hình `.env` đang chạy của bạn theo hướng dẫn README; không đưa thông tin bí mật vào repo công khai.

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run dev
```

Khởi động MongoDB/Redis/MinIO theo README hoặc script Windows đi kèm như trước. Nếu đã có API đang chạy và chỉ cần mở giao diện: `npm.cmd run dev:web`.

Gói ZIP chứa toàn bộ source, assets và tài liệu của dự án; không chứa node_modules hay thư mục build .next. Không cần cài thêm dependency riêng cho hiệu ứng mới.
