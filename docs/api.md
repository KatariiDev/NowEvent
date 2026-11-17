# API contract — hợp đồng BE Go mà NowEvent FE đang gọi

Tài liệu này ghi đúng **tài liệu BE Go do anh cung cấp (17/11) + sơ đồ DB
MongoDB** — không phải kỳ vọng phỏng đoán của FE. Nếu BE đổi endpoint, dạng
response hay thêm endpoint mới, chỉ cần chỉnh duy nhất file
`src/lib/api.ts` cho khớp — FE không gọi API ở bất kỳ chỗ nào khác.

Base URL: `http://localhost:8080`, prefix API: `/api`.
FE cấu hình qua `NEXT_PUBLIC_API_BASE_URL`, mặc định
`http://localhost:8080/api`. Có thể đổi lúc chạy ở trang Cài đặt
(lưu localStorage).

Tất cả request/response dùng JSON (`Content-Type: application/json`).
List endpoint trả một trong hai dạng — FE chấp nhận cả hai:

```json
{ "data": [ ... ], "total": 42 }
```

hoặc mảng JSON trực tiếp `[ ... ]`.

## Định dạng lỗi

```json
{
  "error": { "code": "NOT_FOUND", "message": "Không tìm thấy sinh viên" }
}
```

FE đọc `error.message`, nếu không có thì dùng `message`, nếu không có nữa
thì hiện `BE trả lỗi <status>`.

## Health check

### `GET /health`

Dùng ở trang Cài đặt để kiểm tra kết nối. Trả `200` với body bất kỳ, ví dụ:

```json
{ "status": "ok" }
```

## Users — sinh viên (collection `users`)

Khóa chính là **`student_id`** (MSSV, số nguyên, VD `21084201`) — không phải
`_id`. DB còn lưu `_id` (ObjectId) và `Student_web_password`, nhưng FE
**không bao giờ lấy, lưu hay hiển thị mật khẩu sinh viên**; `_id` cũng không
hiện lên giao diện.

### `GET /api/users`

Danh sách sinh viên. Mỗi item (dạng BE trả về):

```json
{
  "student_id": 21084201,
  "student_name": "Nguyễn Đăng Dương",
  "gender": "male",
  "email": "duong@iuh.edu.vn",
  "zalo_uid": "zalo_123456",
  "major": "Công nghệ thông tin",
  "batch": 21
}
```

- `gender`: `"male" | "female" | "other"`.
- `batch`: số nguyên, VD `21` = khóa K21.
- `major`: tên ngành dạng text, VD `"Công nghệ thông tin"`.

FE map snake_case của BE sang camelCase trong `src/lib/api.ts`:
`student_id` → `studentId`, `student_name` → `studentName`,
`zalo_uid` → `zaloUid`.

### `POST /api/users`

Thêm sinh viên mới. Body đủ 7 trường như item trên (gồm cả `student_id` và
`gender`). Trả `201` + sinh viên đã tạo.

### `PUT /api/users/{student_id}`

Sửa thông tin sinh viên. **Body KHÔNG có `student_id` và `gender`** — 2
trường này không sửa được:

```json
{
  "student_name": "Nguyễn Đăng Dương",
  "email": "duong.cntt@iuh.edu.vn",
  "zalo_uid": "zalo_999999",
  "major": "Công nghệ thông tin",
  "batch": 21
}
```

Trả sinh viên đã cập nhật. Dashboard cũng khóa 2 ô MSSV + giới tính ở form
sửa cho đúng với BE.

### `DELETE /api/users/{student_id}`

Xóa sinh viên. Trả `204` hoặc `200`.

## Events — sự kiện (collection `events`)

Khóa chính là **`_id`** (ObjectId, VD `"6738c111222333444555666"`).
FE map `_id` sang `id` trong `src/lib/api.ts`.

### `GET /api/events`

Danh sách sự kiện. Mỗi item (dạng BE trả về):

```json
{
  "_id": "6738c111222333444555666",
  "major": "Công nghệ thông tin",
  "batch": 21,
  "title": "Chào Tân Sinh Viên K21",
  "content": "Chương trình giao lưu văn nghệ",
  "event_time_start": "2026-11-20T08:00:00Z",
  "current_slot": 123,
  "max_slot": 300,
  "status": "Open"
}
```

- `batch`: số nguyên, VD `21` = khóa K21.
- `event_time_start`: ISO 8601 (UTC, VD `"2026-11-20T08:00:00Z"`).
- `current_slot` / `max_slot`: số slot đã đăng ký / tối đa.
- `status`: chỉ 2 giá trị — `"Open"` (đang mở) | `"Closed"` (đã đóng).

FE map: `_id` → `id`, `event_time_start` → `eventTimeStart`,
`current_slot` → `currentSlot`, `max_slot` → `maxSlot`.

### `POST /api/events`

Tạo sự kiện thủ công (dashboard). Body như item trên (không cần `_id`, BE
tự sinh). Trả `201` + sự kiện đã tạo.

### `DELETE /api/events/{event_id}`

Xóa sự kiện. Trả `204` hoặc `200`.

**BE không có API sửa sự kiện (không PUT/PATCH)** — dashboard chỉ có nút
tạo mới + xóa; muốn đổi nội dung thì xóa rồi tạo lại. FE đã bỏ nút Sửa và
nút đổi trạng thái ở trang Sự kiện cho đúng với BE.

## Registrations — đăng ký (collection `registrations`)

1 sinh viên đăng ký nhiều sự kiện; 1 sự kiện có nhiều sinh viên đăng ký.
Khóa nối: `registrations.student_id` → `users.student_id`,
`registrations.event_id` → `events._id`.

### `GET /api/registrations/event/{event_id}`

Danh sách người đã đăng ký 1 sự kiện. Mỗi item:

```json
{
  "student_id": 21084201,
  "event_id": "6738c111222333444555666",
  "registered_at": "2026-11-08T10:00:00Z",
  "status": "SUCCESS"
}
```

- `registered_at`: ISO 8601, giờ đăng ký.
- `status`: `"SUCCESS"` | `"FAILED"`.
- Dashboard hiện tên sinh viên bằng cách tra `student_id` trong danh sách
  users đã tải (`GET /api/users`).

FE map: `student_id` → `studentId`, `event_id` → `eventId`,
`registered_at` → `registeredAt`.

## Topics — topic FCM

> Chưa có trong tài liệu BE. Các endpoint dưới đây là kỳ vọng cũ của FE,
> giữ lại để BE bổ sung sau — hiện tại trang Topic chạy bằng dữ liệu mẫu
> khi BE chưa có endpoint.

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
- `subscriberCount`: số sinh viên đang đăng ký topic.

### `PUT /topics/{id}` · `DELETE /topics/{id}`

Sửa metadata (label, description, enabled) và xóa topic. FE không tạo topic
mới qua API — 20 topic chuẩn do BE quản lý.

## Notifications — gửi thông báo FCM

> Chưa có trong tài liệu BE. Các endpoint dưới đây là kỳ vọng cũ của FE,
> giữ lại để BE bổ sung sau — hiện tại trang Thông báo chạy bằng dữ liệu mẫu
> khi BE chưa có endpoint. **Việc gửi FCM thật do BE thực hiện** bằng
> Firebase Admin SDK; FE chỉ gửi yêu cầu, service account không bao giờ
> xuất hiện ở FE.

### `POST /notifications/send`

```json
{
  "event_id": "6738c111222333444555666",
  "title": "Chào Tân Sinh Viên K21",
  "body": "Chương trình giao lưu văn nghệ.",
  "faculty": "cntt",
  "cohorts": ["k21"],
  "condition": "'faculty_cntt' in topics && 'cohort_k21' in topics",
  "send_mode": "condition"
}
```

- `event_id`: có thể `null` khi soạn thông báo tự do, không gắn sự kiện.
- `condition`: FE đã tính sẵn và gửi kèm để BE dùng trực tiếp. BE vẫn nên
  tự tính lại từ `major` + `batch` của sự kiện để tránh client gửi condition
  sai — sự kiện BE chỉ có `major` (text) + `batch` (số), không có slug khoa.
- `send_mode`:
  - `"condition"` (Cách A, mặc định): gửi **1 lần**, condition OR các khóa.
  - `"per-cohort"` (Cách B): gửi **lặp**, mỗi khóa 1 lần với condition chỉ chứa
    khóa đó và `data.cohorts` chỉ chứa khóa đó.

Trả `201` + bản ghi lịch sử:

```json
{
  "id": "nt-001",
  "eventId": "6738c111222333444555666",
  "title": "Chào Tân Sinh Viên K21",
  "body": "Chương trình giao lưu văn nghệ.",
  "condition": "'faculty_cntt' in topics && 'cohort_k21' in topics",
  "targetDescription": "Khoa CNTT — K21",
  "status": "delivered",
  "sentAt": "2026-11-16T08:05:00.000Z",
  "successCount": 214,
  "failureCount": 3
}
```

### Payload FCM mẫu mà BE gửi (Cách A — gửi 1 lần)

```json
{
  "condition": "'faculty_cntt' in topics && 'cohort_k21' in topics",
  "notification": {
    "title": "Chào Tân Sinh Viên K21",
    "body": "Chương trình giao lưu văn nghệ."
  },
  "data": {
    "event_id": "6738c111222333444555666",
    "type": "event",
    "major": "Công nghệ thông tin",
    "batch": "21"
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

## Auth — đăng nhập

> Chưa có trong tài liệu BE. Endpoint dưới đây là kỳ vọng của FE (trang
> `/login` đang gọi nó); nếu BE chưa có, trang login tự chuyển sang chế độ
> demo (xem dưới). Token hiện chưa được gắn vào các request khác — BE hiện
> chưa yêu cầu auth cho các endpoint users/events/registrations; khi BE bật
> auth, FE sẽ gửi `Authorization: Bearer <token>` (ghi chú trong
> `src/lib/api.ts`).

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
  "Ghi nhớ đăng nhập", ngược lại lưu sessionStorage.
- **Tài khoản demo:** khi BE không kết nối được, FE cho đăng nhập demo bằng
  `admin@nowevent.local` / `demo123` — phiên demo chỉ xem dữ liệu mẫu, banner
  DEMO MODE hiện rõ. Không có tài khoản thật nào khác được hardcode trong FE.

## Realtime — SSE

> Chưa có trong tài liệu BE. Kênh dưới đây là kỳ vọng của FE — hiện tại
> dashboard tự cập nhật bằng polling `GET /users` + `GET /events` mỗi 5
> giây, tạm dừng khi tab trình duyệt đang ẩn. Chi tiết xem `docs/realtime.md`.

### `GET /events/stream`

SSE stream, `Content-Type: text/event-stream`. Mỗi khi có sự kiện mới, BE
push 1 message:

```text
data: {"type":"event.created","event":{...EventItem (dạng BE)...}}
```

```text
data: {"type":"event.updated","event":{...EventItem (dạng BE)...}}
```

## BE chưa có gì — tóm tắt

| Cần cho FE                                                                         | Trạng thái                                            |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `GET /api/users`, `POST/PUT/DELETE /api/users/{id}`                                | ✅ Có trong tài liệu BE                               |
| `GET /api/events`, `POST/DELETE /api/events/{id}`                                  | ✅ Có trong tài liệu BE                               |
| `GET /api/registrations/event/{event_id}`                                          | ✅ Có trong tài liệu BE                               |
| `GET /health`                                                                      | Chưa rõ — trang Cài đặt dùng để kiểm tra kết nối      |
| `POST /api/auth/login`                                                             | ❌ Chưa có — login đang chạy demo khi BE không trả về |
| `POST /notifications/send`, `GET /notifications`, `POST /notifications/{id}/retry` | ❌ Chưa có — trang Thông báo chạy dữ liệu mẫu         |
| `GET /topics`, `PUT/DELETE /topics/{id}`                                           | ❌ Chưa có — trang Topic chạy dữ liệu mẫu             |
| `GET /events/stream` (SSE)                                                         | ❌ Chưa có — FE polling 5s thay thế                   |
| `PUT /events/{id}` (sửa sự kiện)                                                   | ❌ BE không có — FE đã bỏ nút Sửa                     |
