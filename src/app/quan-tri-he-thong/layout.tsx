import type { ReactNode } from "react";
import { canAccessQuanTriHub } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";

export default async function QuanTriHeThongLayout({ children }: { children: ReactNode }) {
  const allowed = await canAccessQuanTriHub();
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền xem Danh mục, Phân quyền, Nhân sự hoặc vai trò quản trị." />
    );
  }
  return children;
}
