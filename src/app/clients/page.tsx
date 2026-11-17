import { redirect } from "next/navigation";

// Route /clients cũ đã đổi thành /users (theo hợp đồng BE: Users = Sinh viên).
// Giữ lại redirect để link cũ không chết; snapshot push không xóa được file.
export default function ClientsRedirect() {
  redirect("/users");
}
