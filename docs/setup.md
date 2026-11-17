# Cài đặt & chạy NowEvent

## Yêu cầu

- Node.js 18+ (khuyên dùng 20 LTS) và npm.
- BE cào đã chạy (hoặc chưa có — dashboard vẫn chạy được ở Demo Mode với
  dữ liệu mẫu, xem mục Demo Mode bên dưới).
- Không cần Firebase project ở phía FE. Firebase chỉ cần ở phía BE để gửi
  FCM thật.

## Cài đặt

```bash
git clone <repo NowEvent>
cd nowevent
npm install
cp .env.example .env.local   # sửa NEXT_PUBLIC_API_BASE_URL theo BE của bạn
```

## Biến môi trường

| Biến                       | Mặc định                    | Mô tả                                                                                    |
| -------------------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080/api` | Base URL của BE cào. Có thể đổi lúc chạy ở trang Cài đặt (lưu localStorage, ghi đè env). |

Không có biến môi trường nào chứa credential Firebase — FE không cần và
không được giữ service account. Service account chỉ nằm phía BE.

## Chạy local

```bash
npm run dev     # http://localhost:3000 — dev, hot reload
npm run build   # build production (bắt buộc pass trước khi giao)
npm start       # chạy bản production vừa build, http://localhost:3000
npm run lint    # kiểm tra ESLint
npm run format  # Prettier toàn bộ src/
```

## Cắm BE thật

1. BE chạy ở đâu thì đặt `NEXT_PUBLIC_API_BASE_URL` trỏ tới đó (VD
   `https://be-truong.example/api`), hoặc đổi ở trang Cài đặt sau khi đăng
   nhập.
2. BE cần implement đúng hợp đồng trong `docs/api.md`: `GET /health`,
   CRUD `/events`, `/users`, `/topics`, `/notifications`,
   `POST /api/auth/login`, và (khuyên có) SSE `GET /events/stream`.
3. Thiếu `GET /events/stream` thì dashboard vẫn chạy nhờ polling 5 giây.
4. Kiểm tra kết nối ở trang Cài đặt (bấm kiểm tra → báo latency nếu OK).
5. Đăng nhập bằng tài khoản thật do BE cấp. Khi BE chưa kết nối được, trang
   login hiện hộp DEMO MODE với tài khoản demo `admin@nowevent.local` /
   `demo123` (xem `docs/usage.md`).

## Tạo Firebase project cho BE (FE không làm bước này)

1. Vào Firebase Console → tạo project → bật Cloud Messaging.
2. Project Settings → Service accounts → tạo key JSON cho BE.
3. BE dùng Firebase Admin SDK với key đó để gửi FCM qua
   `POST /api/notifications/send` (FE chỉ kích hoạt gửi, không giữ key).
4. Sinh viên đăng ký 2 topic: 1 khoa + 1 khóa của mình.

## Deploy Vercel

1. Import repo lên Vercel.
2. Đặt biến môi trường `NEXT_PUBLIC_API_BASE_URL` trỏ tới BE production.
3. Deploy. Không cần cấu hình gì thêm.

## Demo Mode (khi chưa có BE)

Nếu BE chưa chạy hoặc sai địa chỉ, dashboard tự hiện banner vàng
**DEMO MODE — dữ liệu mẫu** và dùng dữ liệu mẫu cục bộ (chỉ trong phiên,
không lưu lên server). Đăng nhập demo: `admin@nowevent.local` / `demo123`.
Mọi CRUD lúc này chỉ đổi dữ liệu mẫu để thử giao diện.
