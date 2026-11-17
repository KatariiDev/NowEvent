# Hướng dẫn sử dụng NowEvent

Tài liệu này hướng dẫn người dùng cuối dùng dashboard từng bước. Cài đặt và
cắm BE xem `setup.md`; hợp đồng API xem `api.md`.

## 1. Đăng nhập

1. Mở dashboard, trang Đăng nhập hiện ra (không có menu bên trái).
2. Nhập **email** + **mật khẩu**, bấm **Hiện** nếu muốn kiểm tra lại mật khẩu
   vừa gõ.
3. Tick **Ghi nhớ đăng nhập** nếu muốn lần sau mở lại không phải đăng nhập
   (lưu ở localStorage). Không tick thì phiên đăng nhập mất khi đóng trình
   duyệt.
4. Bấm **Đăng nhập**.
   - Sai email/mật khẩu → hiện thông báo đỏ "Sai email hoặc mật khẩu".
   - BE không kết nối được (hoặc BE chưa có endpoint đăng nhập) → hiện lỗi
     kết nối. Lúc này trang login hiện hộp **DEMO MODE** với tài khoản demo
     `admin@nowevent.local` / `demo123` — bấm "Điền tài khoản demo" rồi Đăng
     nhập để xem dữ liệu mẫu.
5. Bấm **Quên mật khẩu?** → hiện hướng dẫn liên hệ quản trị viên (chưa có
   chức năng đặt lại mật khẩu tự động).
6. Đã đăng nhập mà vào lại `/login` thì tự chuyển về trang Tổng quan.

Đăng xuất: bấm **Đăng xuất** ở cuối menu trái (dưới tên + email của bạn).

## 2. Tổng quan (`/`)

- 5 thẻ số: Tổng sinh viên, Tổng sự kiện, Slot đã đăng ký, Thông báo đã
  gửi, Tỉ lệ gửi thành công.
- Biểu đồ 7 ngày: số sự kiện bắt đầu mỗi ngày.
- Sự kiện mới nhất (5 sự kiện) + link "Xem tất cả".
- Badge góc phải cho biết dữ liệu đang **LIVE — SSE**, **LIVE — Polling 5s**,
  **TẠM DỪNG** (tab đang ẩn) hay **DEMO MODE**.
- Nút **↻ Làm mới** để tải lại dữ liệu ngay.

## 3. Sự kiện (`/events`)

- Danh sách sự kiện BE cào từ web Đoàn trường: tiêu đề, ngành, khóa (K21…),
  thời gian bắt đầu, slot đã đăng ký / tối đa, trạng thái (Đang mở / Đã đóng).
- **Tìm kiếm** theo tiêu đề/nội dung; **lọc** theo ngành, khóa, trạng thái.
- Bấm 1 sự kiện để xem chi tiết (drawer bên phải): nội dung, giờ bắt đầu,
  slot — và **danh sách đăng ký** của sự kiện đó (tên sinh viên, MSSV, giờ
  đăng ký, trạng thái Thành công / Thất bại).
- **Thêm sự kiện** (nút trên cùng): nhập tiêu đề, nội dung, ngành, khóa,
  thời gian bắt đầu, slot tối đa, slot đã đăng ký, trạng thái.
- **Xóa** ở từng dòng (xóa hỏi xác nhận).
- **Không có nút Sửa** — BE không có API sửa sự kiện. Muốn đổi nội dung thì
  xóa rồi tạo lại.
- Sự kiện mới cào về tự xuất hiện trong danh sách, không cần tải lại trang
  (polling 5 giây, SSE khi BE có stream).

## 4. Sinh viên (`/users`)

Sinh viên là người đăng ký nhận thông báo — khớp đúng collection `users`
của BE, khóa chính là **MSSV**.

- Bảng có cột: **MSSV | Họ tên | Giới tính | Email | Zalo UID | Ngành |
  Khóa**.
- **Tìm kiếm** theo tên, MSSV, email; **lọc** theo ngành và khóa.
- Bấm vào họ tên để xem chi tiết đầy đủ 7 trường.
- **Thêm sinh viên**: nhập đủ 7 trường — MSSV, họ tên, giới tính, email,
  Zalo UID, ngành, khóa (21 = K21).
- **Sửa**: đổi được họ tên, email, Zalo UID, ngành, khóa — **MSSV và giới
  tính không sửa được** vì API PUT của BE không nhận 2 trường này (form sửa
  khóa 2 ô đó và ghi chú rõ).
- **Xóa**: hỏi xác nhận.
- Mật khẩu web của sinh viên **không bao giờ hiện lên dashboard** — FE không
  lấy trường này từ BE.

## 5. Topic FCM (`/topics`)

- 20 topic chuẩn: 15 khoa (`faculty_*`) + 5 khóa (`cohort_*`), kèm số người
  đăng ký mỗi topic.
- Sửa label/mô tả, bật/tắt topic, thêm/xóa topic.
- Mỗi sinh viên đăng ký đúng 2 topic: 1 khoa + 1 khóa của mình.
- Lưu ý: BE chưa có endpoint topic — trang này hiện chạy bằng dữ liệu mẫu
  cho tới khi BE bổ sung (xem `api.md`).

## 6. Thông báo (`/notifications`)

- **Soạn thông báo**: chọn sự kiện có sẵn để lấy sẵn tiêu đề/nội dung, hoặc
  tự soạn; chọn khoa + khóa nhận; xem trước FCM condition.
- **Cách gửi**: Cách A — gửi 1 lần với condition OR các khóa; Cách B — gửi
  lặp, mỗi khóa 1 lần (BE cần hỗ trợ `send_mode`).
- Bấm gửi → BE gửi FCM thật qua Firebase Admin SDK.
- **Lịch sử gửi**: trạng thái sent / delivered / failed, số gửi thành công /
  lỗi. Thông báo lỗi có nút **gửi lại**.
- Lưu ý: BE chưa có endpoint gửi thông báo — trang này hiện chạy bằng dữ
  liệu mẫu cho tới khi BE bổ sung (xem `api.md`).

## 7. Cài đặt (`/settings`)

- **API Base URL**: đổi địa chỉ BE lúc chạy (lưu localStorage), bấm kiểm tra
  kết nối (`GET /health`).
- **Theme Sáng/Tối**: đổi ở đây hoặc nút cuối menu trái; lựa chọn được nhớ.
- Ghi chú: FE không giữ credential Firebase — service account chỉ nằm ở BE.

## 8. Realtime và Demo Mode là gì?

- **Realtime**: dashboard tự cập nhật khi có dữ liệu mới. Hiện tại dùng
  polling `GET /users` + `GET /events` mỗi 5 giây, tạm dừng khi tab trình
  duyệt đang ẩn. Khi BE có SSE (`GET /events/stream`) thì tự chuyển sang
  SSE. Chi tiết kỹ thuật xem `realtime.md`.
- **Demo Mode**: khi không kết nối được tới BE, dashboard hiện banner vàng
  **DEMO MODE — dữ liệu mẫu** và dùng dữ liệu mẫu cục bộ (chỉ trong phiên,
  không lưu lên server). Mọi thao tác thêm/sửa/xóa lúc này chỉ đổi dữ liệu
  mẫu để thử giao diện. Cắm lại BE đúng địa chỉ là hết demo — bấm nút
  **↻ Làm mới** để tải lại từ BE.
