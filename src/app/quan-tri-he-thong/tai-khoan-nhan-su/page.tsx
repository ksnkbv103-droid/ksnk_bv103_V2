import TaiKhoanNhanSuPage from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/views/TaiKhoanNhanSuPage";
import { canAccessTaiKhoanNhanSuRoute } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";

export const metadata = { title: "Tài khoản nhân sự | BV103" };

export default async function Page() {
  const allowed = await canAccessTaiKhoanNhanSuRoute();
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền sửa ma trận PHAN_QUYEN hoặc vai trò quản trị để quản lý tài khoản nhân sự." />
    );
  }
  return <TaiKhoanNhanSuPage />;
}
