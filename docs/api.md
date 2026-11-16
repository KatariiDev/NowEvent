# API contract — hợp đồng BE mà NowEvent FE đang gọi

Tài liệu này là **kỳ vọng của FE**. Nếu BE hiện tại khác ở điểm nào (tên
endpoint, dạng response, thiếu endpoint), cần chỉnh BE hoặc chỉnh duy nhất
file `src/lib/api.ts` cho khớp — FE không gọi API ở bất kỳ chỗ nào khác.

Base URL: `NEXT_PUBLIC_API_BASE_URL`, mặc định `http://localhost:8080/api`.
Có thể đổi lúc chạy ở trang Cài đặt (lưu localStorage).

Tất cả response thành công trả JSON. List endpoint trả một trong hai dạng:

```json
{ "data": [ ... ], "total": 42 }
```

hoặc mảng JSON trực tiếp `[ ... ]` — FE chấp nhận cả hai.

## Định dạng lỗi

```json
{
  "error": { "code": "NOT_FOUND", "message": "Không tìm thấy sự kiện" }
}
```

FE đọc `error.message`, nếu không có thì dùng `message`, nếu không có nữa thì
hiện `BE trả lỗi <status>`.

## Health check

### `GET /health`

Dùng ở trang Cài đặt để kiểm tra kết nối. Trả `200` với body bất kỳ, ví dụ:

```json
{ "status": "ok" }
```

## Auth — đăng nhập

### `POST /api/auth/login`

FE gọi `{BASE_URL}/auth/login` (base URL đã gồm `/api`, nên đường dẫn đầy đủ
là `/api/auth/login`).

Request:

```json
{
  "email": "admin@truong.edu.vn",
  "password": "********"
}
```

Response `200`:

```json
{
  "token": "jwt_token...",
  "user": { "name": "Quản trị viên", "email": "admin@truong.edu.vn", "role": "admin" }
}
```

- Sai email/mật khẩu → `401` với `error.message` (FE hiển thị nguyên văn).
- FE lưu `token` + `user` vào localStorage (key `nowevent_auth`) khi chọn
  "Ghi nhớ đăng nhập", ngược lại lưu sessionStorage. Token chưa được gắn vào
  các request khác — BE hiện chưa yêu cầu auth cho các endpoint còn lại;
  khi BE bật auth, FE sẽ gửi `Authorization: Bearer <token>`.
- **Tài khoản demo:** khi BE không kết nối được, FE cho đăng nhập demo bằng
  `admin@nowevent.local` / `demo123` — phiên demo chỉ xem dữ liệu mẫu, banner
  DEMO MODE hiện rõ. Không có tài khoản thật nào khác được hardcode trong FE.

## Events — sự kiện cào về

### `GET /events?limit=100`

Danh sách sự kiện, mới nhất trước. Mỗi item:

```json
{
  "id": "ev-001",
  "title": "Hội trại truyền thống Khoa CNTT 2026",
  "content": "Hội trại dành cho sinh viên K21, K22...",
  "sourceUrl": "https://doantruong.example/bai-viet/hoi-trai-cntt",
  "faculty": "cntt",
  "cohorts": ["k21", "k22"],
  "type": "Hoạt động",
  "status": "new",
  "scrapedAt": "2026-11-16T08:00:00.000Z",
  "notifiedAt": null,
  "createdAt": "2026-11-16T08:00:00.000Z"
}
```

- `faculty`: slug khoa, vd `cntt`. Danh sách 15 khoa xem `src/lib/faculties.ts`
  (hiện là placeholder — cần thay bằng danh sách thật của trường).
- `cohorts`: mảng slug khóa, vd `["k21", "k22"]`. Các khóa: `k18`–`k22`.
- `status`: `new` | `notified` | `ignored`.

### `POST /events`

Tạo sự kiện thủ công (dashboard). Body như item trên, không cần `id`,
`createdAt`, `scrapedAt` (BE tự sinh). Trả `201` + item đã tạo.

### `PUT /events/{id}`

Cập nhật toàn bộ field của sự kiện. Trả item đã cập nhật.

### `PATCH /events/{id}/status`

Đổi trạng thái nhanh từ drawer chi tiết.

```json
{ "status": "notified" }
```

`status`: `notified` | `ignored`. Trả item đã cập nhật. (Nếu BE không có
endpoint PATCH này, FE có thể đổi sang `PUT /events/{id}` với `{ "status": ... }`.)

### `DELETE /events/{id}`

Xóa sự kiện. Trả `204` hoặc `200`.

## Clients — người dùng (= client đã đăng ký)

**Client chính là User — chỉ 1 thực thể duy nhất, không có bảng `/users`
riêng.** 1 người dùng gồm 5 trường thông tin: họ và tên, mã lớp, khoa, ngành,
SĐT — cộng các trường FCM để gửi thông báo.

### `GET /clients?limit=100`

```json
{
  "id": "cl-001",
  "fullName": "Nguyễn Văn An",
  "classCode": "CNTT-K21A",
  "faculty": "cntt",
  "major": "Công nghệ thông tin",
  "phone": "0901234567",
  "cohort": "k21",
  "fcmToken": "fcm_registration_token...",
  "topics": ["faculty_cntt", "cohort_k21"],
  "enabled": true,
  "lastActiveAt": "2026-11-16T08:00:00.000Z",
  "createdAt": "2026-10-16T08:00:00.000Z"
}
```

- `fullName`, `classCode`, `faculty`, `major`: bắt buộc. `faculty` là slug khoa
  (xem danh sách 15 khoa trong `src/lib/faculties.ts`); `major` là text tự do.
- `phone`: số điện thoại, **nullable — có thể `null` hoặc chuỗi rỗng khi người
  dùng không có SĐT**. FE hiển thị `--` khi trống, cả ở bảng và chi tiết.
  Khi tạo/sửa, để trống trường SĐT thì FE gửi `phone: null`.
- `cohort`: khóa, **suy ra từ mã lớp** (VD `CNTT-K21A` → `k21`), là trường nội
  bộ để tính topic FCM — FE tự tính khi tạo/sửa, BE nên kiểm tra lại.
- `topics`: đúng 2 topic — 1 khoa + 1 khóa. FE tự tính từ `faculty` + `cohort`
  khi tạo/sửa, BE nên kiểm tra lại.
- `enabled: false` = người dùng đã tắt nhận thông báo.
- `fcmToken`: không bắt buộc khi tạo tay (chưa có thiết bị); FE chỉ hiện rút
  gọn trong chi tiết, không hiện đủ token.

### `POST /clients` · `PUT /clients/{id}` · `DELETE /clients/{id}`

CRUD chuẩn như Events. `PUT` cập nhật cả `enabled` (bật/tắt nhận thông báo).
`POST` nhận các trường trên (không cần `id`, `createdAt` do BE sinh).
`DELETE` xóa người dùng, trả `204` hoặc `200`.

## Topics — topic FCM

### `GET /topics`

20 topic chuẩn: 15 khoa + 5 khóa.

```json
{
  "id": "tp-f-cntt",
  "name": "faculty_cntt",
  "kind": "faculty",
  "label": "Công nghệ Thông tin",
  "description": "Topic khoa Công nghệ Thông tin.",
  "subscriberCount": 128,
  "enabled": true
}
```

- `kind`: `faculty` | `cohort`.
- `subscriberCount`: số client đang đăng ký topic (BE đếm từ bảng clients
  hoặc từ Firebase topic management).

### `PUT /topics/{id}` · `DELETE /topics/{id}`

Sửa metadata (label, description, enabled) và xóa topic. FE không tạo topic
mới qua API — 20 topic chuẩn do BE quản lý.

## Notifications — gửi thông báo FCM

**Việc gửi FCM thật do BE thực hiện** bằng Firebase Admin SDK. FE chỉ gửi
yêu cầu; service account không bao giờ xuất hiện ở FE.

### `POST /notifications/send`

```json
{
  "event_id": "ev-001",
  "title": "Hội trại truyền thống Khoa CNTT 2026",
  "body": "Hội trại dành cho sinh viên K21, K22 tại sân trường, 07:00 ngày 15/11.",
  "faculty": "cntt",
  "cohorts": ["k21", "k22"],
  "condition": "'faculty_cntt' in topics && ('cohort_k21' in topics || 'cohort_k22' in topics)",
  "send_mode": "condition"
}
```

- `event_id`: có thể `null` khi soạn thông báo tự do, không gắn sự kiện.
- `condition`: FE đã tính sẵn và gửi kèm để BE dùng trực tiếp. BE vẫn nên
  tự tính lại từ `faculty` + `cohorts` để tránh client gửi condition sai.
- `send_mode`:
  - `"condition"` (Cách A, mặc định): gửi **1 lần**, condition OR các khóa.
  - `"per-cohort"` (Cách B): gửi **lặp**, mỗi khóa 1 lần với condition chỉ chứa
    khóa đó và `data.cohorts` chỉ chứa khóa đó.

Trả `201` + bản ghi lịch sử:

```json
{
  "id": "nt-001",
  "eventId": "ev-001",
  "title": "Hội trại truyền thống Khoa CNTT 2026",
  "body": "Hội trại dành cho sinh viên K21, K22...",
  "condition": "'faculty_cntt' in topics && ('cohort_k21' in topics || 'cohort_k22' in topics)",
  "targetDescription": "Khoa CNTT — K21, K22",
  "status": "delivered",
  "sentAt": "2026-11-16T08:05:00.000Z",
  "successCount": 214,
  "failureCount": 3
}
```

### Payload FCM mẫu mà BE gửi (Cách A — gửi 1 lần)

```json
{
  "condition": "'faculty_cntt' in topics && ('cohort_k21' in topics || 'cohort_k22' in topics)",
  "notification": {
    "title": "Hội trại truyền thống Khoa CNTT 2026",
    "body": "Hội trại dành cho sinh viên K21, K22 tại sân trường, 07:00 ngày 15/11."
  },
  "data": {
    "event_id": "ev-001",
    "type": "event",
    "faculty": "cntt",
    "cohorts": "k21,k22"
  }
}
```

Quy tắc bắt buộc: **khóa nào muốn gửi thì tên khóa đó phải có trong
`condition`**. Ghi trong `body` hay `data` không có tác dụng chọn người nhận.
FCM cho tối đa 5 topic trong 1 condition — với 5 khóa tối đa (K18–K22) + 1
khoa = 6 topic, nên với sự kiện gửi cho cả 5 khóa, BE nên dùng Cách B
(gửi lặp từng khóa) hoặc chia nhỏ condition.

### `GET /notifications?limit=100`

Lịch sử gửi, mới nhất trước. Item như response của `/notifications/send`,
thêm `error?: string` khi thất bại.

- `status`: `sent` | `delivered` | `failed` | `pending`.

### `POST /notifications/{id}/retry`

Gửi lại thông báo đã thất bại. Trả bản ghi đã cập nhật.

## Realtime — SSE

### `GET /events/stream`

SSE stream, `Content-Type: text/event-stream`. Mỗi khi có sự kiện mới hoặc
sự kiện đổi trạng thái, BE push 1 message:

```text
data: {"type":"event.created","event":{...EventItem...}}
```

```text
data: {"type":"event.updated","event":{...EventItem...}}
```

FE cũng gửi kèm `event_id` để client mobile mở chi tiết qua API. Nếu BE chưa
có endpoint này, FE tự fallback sang polling `GET /events` mỗi 5 giây —
không cần sửa FE. Chi tiết xem `docs/realtime.md`.
