import { redirect } from "next/navigation";
import { canAccessTaiKhoanNhanSuRoute } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";

export const metadata = { title: "Tài khoản nhân sự | BV103" };

/** Gộp vào Nhân sự — cùng list account + role + Tạo TK. */
export default async function Page() {
  const allowed = await canAccessTaiKhoanNhanSuRoute();
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền sửa ma trận PHAN_QUYEN hoặc vai trò quản trị để quản lý tài khoản nhân sự." />
    );
  }
  redirect("/quan-tri-he-thong/nhan-su");
}
