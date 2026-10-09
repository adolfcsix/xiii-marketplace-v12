# XIII Marketplace — chạy local trên Windows

Tài liệu này dành cho Windows 10/11 + Docker Desktop. Mục tiêu là chạy nguyên stack local: MongoDB replica set, Redis, MinIO, NestJS API, Buyer Next.js, Seller Next.js và Admin Next.js.

## 1. Cài một lần

Cần có:

- Node.js 20 hoặc 22 LTS.
- Docker Desktop với Docker Compose v2.
- Git là khuyến nghị nhưng không bắt buộc nếu bạn dùng file ZIP.

Sau khi cài Docker Desktop, mở ứng dụng và đợi Docker Engine báo Ready.

## 2. Kiểm tra máy

Double-click:

`CHECK_XIII_WINDOWS.bat`

Script kiểm tra Node, npm, Docker, Docker Compose, Docker Engine và các port 3000, 3001, 3002, 4000, 27017, 6379, 9000, 9001.

## 3. Chạy toàn bộ project

Double-click:

`RUN_XIII_WINDOWS.bat`

Lần đầu script sẽ:

1. Tạo `.env` từ `.env.example` nếu chưa có.
2. Sinh JWT/payout secret development ngẫu nhiên; không dùng secret mẫu.
3. Chạy `npm install` nếu chưa có `node_modules`.
4. Chạy runtime-readiness verifier và TypeScript typecheck.
5. Bật MongoDB replica set + Redis + MinIO bằng Docker.
6. Chờ infrastructure sẵn sàng.
7. Seed database development.
8. Chạy API + Buyer + Seller + Admin.

Sau khi app lên:

- Buyer: http://localhost:3000
- Seller: http://localhost:3001
- Admin: http://localhost:3002
- API readiness: http://localhost:4000/api/v1/health/ready
- MinIO Console: http://localhost:9001

Tài khoản seed development dùng mật khẩu `Xiii12345!`:

- `buyer@xiii.local`
- `seller@xiii.local`
- `admin@xiii.local`

Đây chỉ là credential development.

## 4. Dừng

Nhấn `Ctrl+C` trong cửa sổ `RUN_XIII_WINDOWS.bat` để dừng 4 dev server.

Sau đó double-click `STOP_XIII_INFRA.bat` nếu muốn dừng MongoDB/Redis/MinIO. Lệnh này **không xóa dữ liệu**.

`RESET_XIII_LOCAL_DATA.bat` sẽ xóa Docker volumes và toàn bộ dữ liệu local. Script bắt buộc gõ `RESET` để xác nhận.

## 5. Nếu bị lỗi

Double-click:

`DIAGNOSE_XIII_WINDOWS.bat`

Script tạo file trong thư mục `diagnostics/` gồm version, Docker state, container logs, port listeners, health endpoints và runtime-readiness. Giá trị secret trong `.env` không được ghi vào báo cáo.

Gửi file `diagnostics/xiii-diagnostics-*.txt` để debug chính xác.

## 6. Browser E2E

Khi `RUN_XIII_WINDOWS.bat` đã có thể khởi động project và `npm install` đã hoàn tất, có thể đóng dev stack rồi double-click:

`TEST_XIII_E2E_WINDOWS.bat`

Script cài Chromium của Playwright nếu cần và chạy luồng Buyer → Checkout → Seller → Buyer → Review → Admin bằng browser automation.

Nếu fail, chạy:

`npm run e2e:report`

để mở trace/screenshot/video report.

## 7. Một số lỗi thường gặp

**Docker command not found:** cài Docker Desktop rồi mở terminal mới.

**Docker Engine chưa chạy:** mở Docker Desktop và chờ Ready.

**Port already in use:** đóng process đang dùng port hoặc container/project cũ.

**npm install EAI_AGAIN/ENOTFOUND:** lỗi DNS/mạng tới npm registry; kiểm tra Internet, VPN/proxy/DNS rồi chạy lại.

**Mongo replica set timeout:** chạy `docker compose logs mongodb mongo-init-replica`, hoặc dùng diagnostics script.

**Typecheck fail:** không bỏ qua lỗi nếu mục tiêu là test bản chuẩn. Lấy output và diagnostics để sửa source trước khi chạy tiếp.
