// src/app/cssd-erp/batch/page.tsx
// Backward-compat deep link — canonical UI is /cssd-quy-trinh?tab=batch.
import { redirect } from "next/navigation";
import { cssdQuyTrinhBatchTabHref } from "@/lib/cssd-routes";

export const metadata = {
  title: "Quản lý Mẻ tiệt khuẩn | KSNK 103",
  description: "Hệ thống quản lý thông số kỹ thuật mẻ tiệt khuẩn CSSD",
};

export default function Page() {
  redirect(cssdQuyTrinhBatchTabHref());
}
