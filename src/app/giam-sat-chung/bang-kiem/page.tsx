import { canAccessDanhMucModuleRoute } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import { Metadata } from "next";
import BangKiemClient from "./BangKiemClient";

export const metadata: Metadata = {
  title: "Bảng kiểm",
  description: "Quản lý mẫu bảng kiểm và tiêu chí giám sát",
};

export default async function Page() {
  const allowed = await canAccessDanhMucModuleRoute("BANG_KIEM");
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền xem module Bảng kiểm (BANG_KIEM) hoặc vai trò quản trị để mở trang này." />
    );
  }
  return <BangKiemClient />;
}
