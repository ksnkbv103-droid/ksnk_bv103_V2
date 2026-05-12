// src/app/quan-tri-he-thong/nhan-su/page.tsx
import QuanLyNhanSuPage from "@/modules/quan-tri-he-thong/nhan-su/views/QuanLyNhanSuPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý Nhân sự | KSNK BV103",
  description: "Quản lý hồ sơ nhân sự và phân khoa phòng",
};

export default function Page() {
  return <QuanLyNhanSuPage />;
}
