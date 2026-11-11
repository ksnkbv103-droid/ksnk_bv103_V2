// src/app/to-chuc/khoa-phong/page.tsx
import { canAccessDanhMucModuleRoute } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import KhoaPhongMasterPage from "@/modules/to-chuc/khoa-phong/KhoaPhongMasterPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Khoa phòng",
  description: "Quản lý danh mục Khoa Phòng trong hệ thống",
};

export default async function Page() {
  const allowed = await canAccessDanhMucModuleRoute("KHOA_PHONG");
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền xem module Khoa phòng (KHOA_PHONG) hoặc vai trò quản trị để mở trang này." />
    );
  }
  return <KhoaPhongMasterPage />;
}
