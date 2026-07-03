import { redirect } from "next/navigation";
import { quanTriHubHref } from "@/lib/master-data/quan-tri-paths";
import { canAccessPhanQuyenRoute } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";

export const metadata = { title: "Phân quyền | BV103" };

/** Deep link — chặn server-side trước khi redirect hub tab Phân quyền. */
export default async function PhanQuyenRedirectPage() {
  const allowed = await canAccessPhanQuyenRoute();
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền xem module PHAN_QUYEN hoặc vai trò quản trị để mở ma trận phân quyền." />
    );
  }
  redirect(quanTriHubHref("PHAN_QUYEN"));
}
