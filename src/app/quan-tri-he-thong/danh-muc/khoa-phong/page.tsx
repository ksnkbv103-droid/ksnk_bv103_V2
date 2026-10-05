// src/app/quan-tri-he-thong/danh-muc/khoa-phong/page.tsx
import KhoaPhongMasterPage from "@/modules/quan-tri-he-thong/danh-muc/khoa-phong/KhoaPhongMasterPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Khoa phòng",
  description: "Quản lý danh mục Khoa Phòng trong hệ thống",
};

export default function Page() {
  return <KhoaPhongMasterPage />;
}
