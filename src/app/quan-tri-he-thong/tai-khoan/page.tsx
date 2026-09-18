import { canAccessTaiKhoanNhanSuRoute } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import TaiKhoanTruyCapHubPage from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/views/TaiKhoanTruyCapHubPage";

export const metadata = { title: "Tài khoản & truy cập | BV103" };

export default async function Page() {
  const allowed = await canAccessTaiKhoanNhanSuRoute();
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền sửa ma trận PHAN_QUYEN hoặc vai trò quản trị để mở Tài khoản & truy cập." />
    );
  }
  return <TaiKhoanTruyCapHubPage />;
}
