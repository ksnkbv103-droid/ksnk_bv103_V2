// src/app/quan-tri-he-thong/bang-kiem/page.tsx
import BangKiemView from "@/modules/quan-tri-he-thong/bang-kiem/views/BangKiemView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danh mục Bảng kiểm | KSNK BV103",
  description: "Quản lý mẫu bảng kiểm và tiêu chí giám sát",
};

export default function Page() {
  return <BangKiemView />;
}
