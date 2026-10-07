import type { ReactNode } from "react";
import { canAccessQuanTriHub } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";

export const metadata = { title: "Quản trị hệ thống" };

export default async function QuanTriHeThongLayout({ children }: { children: ReactNode }) {
  const allowed = await canAccessQuanTriHub();
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền xem đúng mục quản trị (danh mục, khoa phòng, bảng kiểm, nhân sự hoặc phân quyền)." />
    );
  }
  return children;
}
