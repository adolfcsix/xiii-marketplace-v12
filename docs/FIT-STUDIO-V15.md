# XIII v15 — Fit Studio & Fluid Buttons

## Cách dùng

1. Mở `/outfit`. Nhân vật hiển thị ngay cả khi chưa chọn món.
2. Chọn dáng nam, nữ hoặc trung tính; chỉnh form cơ thể, màu da và tóc.
3. Chọn danh mục áo, quần, giày, phụ kiện. Chọn sản phẩm → chọn biến thể màu/size → Chọn cho outfit.
4. Nhân vật đổi trang phục theo màu biến thể và kiểu món. Ảnh sản phẩm thật nằm ở thẻ bên dưới.
5. Nhấn tên món đang mặc để làm nổi bật lớp đó. Đổi hoặc gỡ món từ thẻ sản phẩm.
6. Đặt tên rồi Lưu bộ phối. Bộ đã lưu có thể mở lại hoặc xoá (tối đa 12 bộ).
7. Thêm các món vào giỏ vẫn kiểm tra giá/tồn kho với API thật.

## Phạm vi phiên bản

- Nhân vật SVG 2D; nút tạo chiều sâu 3D bằng CSS. Không gọi dịch vụ AI.
- Bản minh hoạ tự động phản ánh màu và nhóm kiểu dáng: tee, hoodie, jacket, sweater, pants, shorts, skirt, cargo, sneakers, boots, clogs, cap, bag, glasses, chain.
- Bản minh hoạ mặc định không sao chép chính xác hoạ tiết, không mô phỏng kích cỡ hay độ vừa theo số đo. Sản phẩm phải có lớp ảnh riêng để hiển thị đúng artwork.
- Dáng/form nhân vật là tuỳ chỉnh thẩm mỹ. Không giới hạn danh mục theo giới tính.
- Lưu bản nháp, nhân vật và bộ phối bằng localStorage, tách theo ID tài khoản; khách có vùng lưu riêng. Chưa đồng bộ giữa thiết bị. Đăng xuất chuyển về bộ phối khách. Dữ liệu v1 dùng chung không tự nhập sang tài khoản để tránh lẫn người dùng.
- Trạng thái áo/quần độc lập từng trình duyệt/phiên React; không phát qua socket tới người khác.
- Phân loại ưu tiên category ở dữ liệu sản phẩm, dùng tên sản phẩm làm dự phòng. Món chưa nhận diện được có thể chọn theo danh mục hiện tại.

## Thêm artwork mặc lên nhân vật

Không ghép ảnh chụp sản phẩm nền trắng lên cơ thể. Chuẩn bị PNG/WebP trong suốt cho cùng tư thế nhìn thẳng, khung `360 × 620`.

Các mốc mặc định (pixel trên khung): đầu 180,115; vai 125,180 và 235,180; thân áo 133..228,173..317; quần 130..230,305..535; giày 106..254,547..578. Nhân vật gọn/rộng co giãn các lớp áo/quần/giày cùng cơ thể.

Trong `product.attributes`, cấu hình:

```json
{
  "outfitPreview": {
    "kind": "hoodie",
    "color": "#272a30",
    "overlays": {
      "neutral": "/outfit-assets/hoodie-black.png",
      "masculine": "/outfit-assets/hoodie-black.png",
      "feminine": "/outfit-assets/hoodie-black.png"
    }
  }
}
```

Mỗi biến thể có thể ghi đè bằng `product.attributes.outfitPreview.variantOverlays`, dạng `{ "variant-id": { "neutral": "/outfit-assets/variant.png" } }`. URL chỉ chấp nhận đường dẫn nội bộ bắt đầu `/` hoặc HTTPS. Các ảnh phải cùng khung và nền trong suốt; không được lấy ảnh catalog bình thường để thay thế.

## Nút chuyển động

`fluid-ui.css` điều chỉnh các CTA mua hàng, chọn trang phục, danh mục, lưu bộ phối, icon đầu trang và điều khiển chuyển động. Hiệu ứng viền nổi/gradient/lún phỏng theo Launch Button trong ThreeUI Community, có giữ giấy phép MIT tại `docs/licenses/THREEUI-BUTTONS-LICENSE.txt`.

- Hover trên thiết bị chuột: nổi lên 3px, scale 1.025, bóng chuyển mềm 300ms.
- Nhấn/chạm: lún 3px, scale .985, phản hồi 90ms.
- Dừng chuyển động hoặc prefers-reduced-motion: giữ chiều sâu tĩnh, bỏ chuyển động.
- Không chạy shader/WebGL riêng cho từng nút và không có vòng lặp idle cho nút.

## Kiểm tra

Kết quả kiểm tra v15 tại `docs/QA-V15.md`; lần rà soát và sửa lỗi mới tại `docs/QA-V15.1.md`. Các báo cáo QA v13/v14 là lịch sử, không chứng minh v15.
