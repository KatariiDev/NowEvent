# NowEvent — Dashboard quản lý thông báo sự kiện Đoàn trường

Web dashboard (FE-only) để quản lý hệ thống thông báo sự kiện của Đoàn trường:
BE cào dữ liệu từ web Đoàn trường, lưu sự kiện vào DB và gửi thông báo FCM;
dashboard này hiển thị và quản lý toàn bộ: sinh viên đăng ký, sự kiện cào về,
danh sách đăng ký theo sự kiện, topic FCM và lịch sử gửi thông báo —
**realtime, không cần tải lại trang**.

## Bài toán

- 15 khoa × 5 khóa gần nhất (K18–K22) = tối đa 75 nhóm nhận.
- FCM dùng **20 topic**: 15 topic khoa (`faculty_*`) + 5 topic khóa (`cohort_*`).
  Mỗi client đăng ký đúng 2 topic: 1 khoa + 1 khóa của mình.
- Khi gửi, BE ghép condition từ 2 topic, ví dụ:
  `'faculty_cntt' in topics && ('cohort_k21' in topics || 'cohort_k22' in topics)`.
  Quy tắc quan trọng: **khóa nào muốn gửi thì tên khóa đó bắt buộc phải có trong
  `condition`** — ghi trong body hay data không có tác dụng chọn người nhận.
  Chi tiết xem `docs/api.md` và bản tóm tắt FCM gốc.

## Kiến trúc

```text
Web Đoàn trường
      │  (cào: 75 luồng = 15 khoa × 5 khóa, tối đa 5–10 luồng cùng lúc)
      ▼
BE cào (đã có sẵn) ──► Database (users, events, registrations)
      │  gửi FCM qua Firebase Admin SDK (service account chỉ nằm phía BE)
      ▼
Firebase Cloud Messaging ──► Điện thoại sinh viên (đăng ký 2 topic)
      ▲
      │  REST API + SSE
      │
NowEvent Dashboard (repo này, Next.js — FE-only, không giữ credential Firebase)
```

FE chỉ gọi REST API của BE để GET/hiển thị dữ liệu và CRUD, và chỉ kích hoạt
gửi thông báo qua `POST /api/notifications/send` — việc gửi FCM thật do BE làm.

## Tính năng

| Trang            | Nội dung                                                                                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` Tổng quan    | Tổng sinh viên, tổng sự kiện, slot đã đăng ký, thông báo đã gửi, tỉ lệ gửi thành công, biểu đồ 7 ngày, sự kiện mới nhất                                                                                                                                                                                    |
| `/login`         | Đăng nhập bằng email + mật khẩu (ghi nhớ đăng nhập, hiện/ẩn mật khẩu, quên mật khẩu → liên hệ quản trị viên); chưa đăng nhập thì mọi trang đều chuyển về đây; tài khoản demo khi BE không kết nối được                                                                                                     |
| `/events`        | Danh sách sự kiện cào về + tìm kiếm/lọc theo ngành, khóa, trạng thái; drawer chi tiết kèm danh sách đăng ký (tên, MSSV, giờ đăng ký, SUCCESS/FAILED); tạo/xóa — không có sửa vì BE không có API sửa sự kiện                                                                                                |
| `/users`         | Sinh viên — khớp đúng collection users của BE: MSSV (khóa chính), họ tên, giới tính, email, Zalo UID, ngành, khóa (21 = K21); tìm kiếm/lọc theo ngành, khóa; tạo/sửa/xóa (sửa không đổi được MSSV và giới tính vì PUT của BE không nhận 2 trường này); mật khẩu sinh viên không bao giờ hiện lên dashboard |
| `/topics`        | 20 topic (15 khoa + 5 khóa), số người đăng ký, sửa metadata, bật/tắt, thêm/xóa topic                                                                                                                                                                                                                       |
| `/notifications` | Soạn thông báo (lấy nội dung từ sự kiện hoặc tự soạn), xem trước FCM condition, gửi qua BE, lịch sử gửi với trạng thái sent/delivered/failed, gửi lại khi lỗi                                                                                                                                              |
| `/settings`      | Đổi API Base URL lúc chạy (lưu localStorage), kiểm tra kết nối BE (`GET /health`), theme Sáng/Tối                                                                                                                                                                                                          |

**Realtime:** kênh chính là SSE `GET /events/stream` (EventSource); nếu BE chưa có
hoặc mất kết nối thì tự fallback sang polling mỗi 5 giây, tạm dừng khi tab ẩn.
Có nút làm mới thủ công và badge trạng thái LIVE / Polling / Tạm dừng / DEMO.
Chi tiết: `docs/realtime.md`.

**Demo Mode:** nếu BE không kết nối được, dashboard hiển thị banner
**DEMO MODE — dữ liệu mẫu** rõ ràng và dùng dữ liệu mẫu cục bộ (chỉ trong phiên,
không lưu lên server), không bao giờ giả vờ đó là dữ liệu thật.

**Giao diện:** sidebar layout, responsive, 2 theme Sáng/Tối (lưu localStorage),
màu chuyên nghiệp: nền slate, điểm nhấn indigo solid `#1E40AF`, không gradient.

## Đăng nhập

- Mọi trang trừ `/login` đều yêu cầu đăng nhập (chưa đăng nhập → chuyển về
  `/login`; đã đăng nhập mà vào `/login` → chuyển về Tổng quan).
- Đăng nhập qua BE: `POST /api/auth/login` với `{email, password}` → nhận
  `{token, user}`; token + user lưu localStorage khi tick "Ghi nhớ đăng
  nhập", ngược lại lưu sessionStorage (key `nowevent_auth`).
- Sidebar hiện tên + email người đăng nhập và nút **Đăng xuất**.
- **Tài khoản demo** (chỉ khi BE không kết nối được): `admin@nowevent.local`
  / `demo123` — phiên demo chỉ xem dữ liệu mẫu, banner DEMO MODE hiện rõ.
  Không có tài khoản thật nào khác được hardcode trong FE.

## Tài liệu

- `docs/setup.md` — cài đặt & chạy: yêu cầu, env, dev/build, deploy Vercel,
  cắm BE thật, tạo Firebase project cho BE.
- `docs/usage.md` — hướng dẫn sử dụng từng trang, đăng nhập (kể cả demo),
  realtime + demo mode, đổi theme/API URL.
- `docs/api.md` — hợp đồng API BE Go mà FE đang gọi (users, events,
  registrations, topics, notifications, auth, realtime) + bảng BE chưa có gì.
- `docs/realtime.md` — SSE + polling fallback.

## Công nghệ

- Next.js 14 (App Router) + TypeScript (strict) + Tailwind CSS
- Không dùng thư viện chart — biểu đồ 7 ngày vẽ bằng div/CSS
- ESLint + Prettier

## Cấu trúc thư mục

```text
src/
  app/                 # App Router: /, /login, /events, /users, /topics, /notifications, /settings
  components/          # Sidebar, AuthGuard (route guard + app shell), ui.tsx (Card/Button/Badge/Modal/ConfirmDialog/...)
  hooks/               # useRealtime.ts (SSE + polling fallback)
  lib/
    api.ts             # LỚP API DUY NHẤT gọi fetch — mọi trang đều qua đây
    auth.ts            # login/logout/getAuth, session localStorage (key nowevent_auth), tài khoản demo
    faculties.ts       # 15 khoa + 5 khóa (tên khoa hiện là placeholder — xem lưu ý dưới)
    mock.ts            # Dữ liệu mẫu cho Demo Mode
    theme.tsx          # ThemeProvider (light/dark, localStorage)
  types/               # EventItem, Student, Registration, Topic, NotificationLog, ...
docs/
  api.md               # Hợp đồng API BE mà FE đang gọi (kèm ví dụ payload FCM)
  realtime.md          # SSE + polling fallback
  setup.md             # Cài đặt & chạy, deploy, cắm BE thật, Firebase cho BE
  usage.md             # Hướng dẫn sử dụng từng trang
```

## Chạy local

```bash
npm install
cp .env.example .env.local   # sửa NEXT_PUBLIC_API_BASE_URL theo BE của bạn
npm run dev                  # http://localhost:3000
```

## Biến môi trường

| Biến                       | Mặc định                    | Mô tả                                                                                    |
| -------------------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080/api` | Base URL của BE cào. Có thể đổi lúc chạy ở trang Cài đặt (lưu localStorage, ghi đè env). |

Không có biến môi trường nào chứa credential Firebase — FE không cần và không
được giữ service account. Service account chỉ nằm phía BE.

## Build & deploy

```bash
npm run build
npm start
```

Deploy Vercel: import repo, đặt biến môi trường `NEXT_PUBLIC_API_BASE_URL`
trỏ tới BE production, deploy. Không cần cấu hình gì thêm.

## Lưu ý chưa chốt (cần xác nhận với BE)

1. **Tên 15 khoa** trong `src/lib/faculties.ts` hiện là placeholder. Khi có danh
   sách khoa thật của trường, thay ở đó — hoặc tốt hơn: để BE làm nguồn chuẩn
   qua `GET /topics` và chỉ dùng file này làm fallback cho Demo Mode.
2. **Hợp đồng API:** FE đã khớp đúng tài liệu BE Go (users/events/
   registrations) — xem `docs/api.md`. BE chưa có: `POST /api/auth/login`,
   `POST /notifications/send`, `GET /topics`, `GET /events/stream` và
   `PUT /events/{id}` (sửa sự kiện) — các trang liên quan hiện chạy dữ liệu
   mẫu cho tới khi BE bổ sung.
3. **Gửi FCM 1 lần hay gửi lặp:** FE mặc định gửi 1 lần với condition OR các
   khóa (Cách A). Trang Thông báo có tùy chọn đổi sang gửi lặp mỗi khóa 1 lần
   (Cách B) — BE cần hỗ trợ `send_mode` tương ứng (xem `docs/api.md`).
4. **Firebase project:** chưa có. Tạo project ở Firebase Console, bật Cloud
   Messaging, cấp service account cho BE. FE không cần gì thêm.

## Đóng góp

- Code sạch: TypeScript strict, không code chết, mọi gọi API tập trung ở
  `src/lib/api.ts`, không gọi `fetch` trực tiếp từ component.
- Commit theo [Conventional Commits](https://www.conventionalcommits.org/)
  (vd: `feat(events): thêm lọc theo khóa`).
- Nhánh riêng cho mỗi tính năng, không push thẳng `main`.
