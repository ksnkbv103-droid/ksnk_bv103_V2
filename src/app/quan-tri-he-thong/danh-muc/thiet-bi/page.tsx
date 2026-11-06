// src/app/quan-tri-he-thong/danh-muc/thiet-bi/page.tsx
import { canAccessDanhMucModuleRoute } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import ThietBiMasterPage from "@/modules/quan-tri-he-thong/danh-muc/thiet-bi/ThietBiMasterPage";

export const metadata = {
  title: "Thiết bị",
  description: "Quản trị danh mục máy móc và thiết bị CSSD",
};

export default async function Page() {
  const allowed = await canAccessDanhMucModuleRoute("THIET_BI");
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền xem module Thiết bị (THIET_BI) hoặc vai trò quản trị để mở trang này." />
    );
  }
  return <ThietBiMasterPage />;
}
