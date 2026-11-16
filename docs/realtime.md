# Realtime — SSE + polling fallback

Dashboard phải hiển thị sự kiện mới **mà không cần tải lại trang**.
Cơ chế 2 tầng, triển khai ở `src/hooks/useRealtime.ts`:

## Tầng 1 — SSE (chính)

- FE mở `EventSource` tới `GET {API_BASE_URL}/events/stream`.
- BE push message mỗi khi có sự kiện mới hoặc sự kiện đổi trạng thái:

```text
data: {"type":"event.created","event":{...EventItem...}}
data: {"type":"event.updated","event":{...EventItem...}}
```

- FE nhận được thì chèn/cập nhật trực tiếp vào danh sách (trang Sự kiện) hoặc
  tải lại danh sách (trang Tổng quan). Badge hiển thị **LIVE — SSE**.
- Nếu message không đúng định dạng JSON trên, FE tải lại danh sách thay vì crash.

## Tầng 2 — Polling (dự phòng)

Kích hoạt khi một trong các điều kiện sau xảy ra:

1. SSE lỗi lần đầu (`onerror` của EventSource), hoặc
2. SSE không mở được trong 6 giây đầu.

Khi đó FE gọi lại hàm tải dữ liệu (`GET /events`, `GET /clients`, …) mỗi
**5 giây**. Badge hiển thị **LIVE — Polling 5s**.

## Tạm dừng khi tab ẩn

- Khi tab bị ẩn (`document.visibilitychange` → `hidden`), polling tạm dừng để
  đỡ tốn tài nguyên — badge hiển thị **TẠM DỪNG — tab đang ẩn**.
- Khi quay lại tab, polling nối lại ngay. SSE (nếu đang chạy) do trình duyệt
  tự quản lý và tự nối lại.

## Nút làm mới thủ công

Mọi trang có dữ liệu realtime (Tổng quan, Sự kiện) đều có nút **↻ Làm mới**
gọi lại API ngay, không chờ tới kỳ polling tiếp theo.

## Demo Mode

Khi BE không reachable (fetch lỗi), FE không thử SSE nữa — badge hiển thị
**DEMO MODE — BE không kết nối được** và dùng dữ liệu mẫu cục bộ
(`src/lib/mock.ts`). Polling lúc này chỉ đọc lại dữ liệu mẫu nên không có
thay đổi mới — đó là hành vi đúng, không phải lỗi realtime.

## BE cần làm gì để realtime chạy tốt nhất

1. Triển khai `GET /events/stream` (SSE, xem `docs/api.md`).
2. Push event ngay sau khi crawler ghi sự kiện mới vào DB (sau bước dedupe,
   chỉ bài mới/đổi mới push).
3. Nếu chưa làm được (1), không cần làm gì — polling 5s vẫn đảm bảo sự kiện
   mới xuất hiện tối đa 5 giây sau khi có trên BE.
