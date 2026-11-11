import type { ReactNode } from "react";
import { canAccessToChucModule } from "@/lib/auth/quan-tri-access";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";

export const metadata = { title: "Tổ chức" };

/** AR-8e (PO 2026-11-11): Tổ chức là module riêng, không qua hub Quản trị. */
export default async function ToChucLayout({ children }: { children: ReactNode }) {
  const allowed = await canAccessToChucModule();
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền xem Khoa phòng, Nhân sự hoặc Danh mục tổ chức (hoặc vai trò quản trị)." />
    );
  }
  return children;
}
