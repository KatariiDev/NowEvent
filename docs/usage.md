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
   - BE không kết nối được → hiện lỗi kết nối. Lúc này trang login hiện hộp
     **DEMO MODE** với tài khoản demo `admin@nowevent.local` / `demo123` —
     bấm "Điền tài khoản demo" rồi Đăng nhập để xem dữ liệu mẫu.
5. Bấm **Quên mật khẩu?** → hiện hướng dẫn liên hệ quản trị viên (chưa có
   chức năng đặt lại mật khẩu tự động).
6. Đã đăng nhập mà vào lại `/login` thì tự chuyển về trang Tổng quan.

Đăng xuất: bấm **Đăng xuất** ở cuối menu trái (dưới tên + email của bạn).

## 2. Tổng quan (`/`)

- 4 thẻ số: Tổng sự kiện, Người dùng, Client đang hoạt động, Thông báo đã
  gửi, Tỉ lệ gửi thành công.
- Biểu đồ 7 ngày: số sự kiện cào về mỗi ngày.
- Sự kiện mới nhất (5 sự kiện) + link "Xem tất cả".
- Badge góc phải cho biết dữ liệu đang **LIVE — SSE**, **LIVE — Polling 5s**,
  **TẠM DỪNG** (tab đang ẩn) hay **DEMO MODE**.
- Nút **↻ Làm mới** để tải lại dữ liệu ngay.

## 3. Sự kiện cào (`/events`)

- Danh sách sự kiện BE cào từ web Đoàn trường: tiêu đề, khoa, khóa, trạng
  thái (Mới / Đã gửi / Bỏ qua).
- **Tìm kiếm** theo tiêu đề/nội dung; **lọc** theo khoa, khóa, trạng thái.
- Bấm 1 sự kiện để xem chi tiết (drawer bên phải) kèm FCM condition xem
  trước — condition này là thứ FCM dùng để chọn người nhận.
- **Thêm sự kiện** (nút trên cùng): nhập tiêu đề, nội dung, khoa, khóa, loại.
- **Sửa / Xóa** ở từng dòng (xóa hỏi xác nhận).
- **Đánh dấu đã gửi / Bỏ qua** để đổi trạng thái sự kiện.
- Sự kiện mới cào về tự xuất hiện trong danh sách, không cần tải lại trang
  (SSE, fallback polling 5 giây).

## 4. Người dùng — Client (`/clients`)

Người dùng chính là Client: 1 người = 1 client đăng ký nhận thông báo.

- Bảng có cột: **Họ và tên | Mã lớp | Khoa | Ngành | SĐT | Trạng thái nhận
  TB | Thao tác**.
- **SĐT trống hiển thị `--`** (cả bảng và chi tiết) — người không có SĐT vẫn
  quản lý bình thường.
- **Tìm kiếm** theo tên, mã lớp, SĐT; **lọc** theo khoa và ngành.
- Bấm vào họ tên để xem chi tiết: đầy đủ 5 trường + khóa (suy ra từ mã lớp,
  VD `CNTT-K21A` → K21), topic đã đăng ký, FCM token hiện rút gọn, trạng
  thái nhận thông báo.
- **Thêm người dùng**: nhập họ tên, mã lớp, khoa (dropdown), ngành, SĐT
  (không bắt buộc — để trống nếu không có), FCM token (không bắt buộc khi
  tạo tay), tick bật nhận thông báo. Khóa và topic tự tính từ mã lớp + khoa.
- **Sửa**: đổi mã lớp sẽ tự tính lại khóa + topic.
- **Xóa**: hỏi xác nhận, người đó không nhận thông báo nữa.
- Bấm badge **Đang bật / Đã tắt** để bật/tắt nhận thông báo nhanh.

## 5. Topic FCM (`/topics`)

- 20 topic chuẩn: 15 khoa (`faculty_*`) + 5 khóa (`cohort_*`), kèm số người
  đăng ký mỗi topic.
- Sửa label/mô tả, bật/tắt topic, thêm/xóa topic.
- Mỗi người dùng đăng ký đúng 2 topic: 1 khoa + 1 khóa của mình.

## 6. Thông báo (`/notifications`)

- **Soạn thông báo**: chọn sự kiện có sẵn để lấy sẵn tiêu đề/nội dung, hoặc
  tự soạn; chọn khoa + khóa nhận; xem trước FCM condition.
- **Cách gửi**: Cách A — gửi 1 lần với condition OR các khóa; Cách B — gửi
  lặp, mỗi khóa 1 lần (BE cần hỗ trợ `send_mode`).
- Bấm gửi → BE gửi FCM thật qua Firebase Admin SDK.
- **Lịch sử gửi**: trạng thái sent / delivered / failed, số gửi thành công /
  lỗi. Thông báo lỗi có nút **gửi lại**.

## 7. Cài đặt (`/settings`)

- **API Base URL**: đổi địa chỉ BE lúc chạy (lưu localStorage), bấm kiểm tra
  kết nối (`GET /health`).
- **Theme Sáng/Tối**: đổi ở đây hoặc nút cuối menu trái; lựa chọn được nhớ.
- Ghi chú: FE không giữ credential Firebase — service account chỉ nằm ở BE.

## 8. Realtime và Demo Mode là gì?

- **Realtime**: dashboard tự cập nhật khi có sự kiện mới. Kênh chính là SSE
  (`GET /events/stream`); nếu BE chưa có stream hoặc mất kết nối thì tự
  chuyển sang polling mỗi 5 giây, tạm dừng khi tab trình duyệt đang ẩn.
  Chi tiết kỹ thuật xem `realtime.md`.
- **Demo Mode**: khi không kết nối được tới BE, dashboard hiện banner vàng
  **DEMO MODE — dữ liệu mẫu** và dùng dữ liệu mẫu cục bộ (chỉ trong phiên,
  không lưu lên server). Mọi thao tác thêm/sửa/xóa lúc này chỉ đổi dữ liệu
  mẫu để thử giao diện. Cắm lại BE đúng địa chỉ là hết demo.
