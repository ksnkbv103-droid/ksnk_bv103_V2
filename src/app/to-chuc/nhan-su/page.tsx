// src/app/to-chuc/nhan-su/page.tsx
import { canAccessDanhMucModuleRoute } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import QuanLyNhanSuPage from "@/modules/to-chuc/nhan-su/views/QuanLyNhanSuPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nhân sự",
  description: "Quản lý hồ sơ nhân sự và phân khoa phòng",
};

export default async function Page() {
  const allowed = await canAccessDanhMucModuleRoute("NHAN_SU");
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền xem module Nhân sự (NHAN_SU) hoặc vai trò quản trị để mở trang này." />
    );
  }
  return <QuanLyNhanSuPage />;
}
