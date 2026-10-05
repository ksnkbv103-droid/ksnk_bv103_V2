import { Suspense } from "react";
import QuanLyDungCuPage from "@/modules/quan-tri-he-thong/danh-muc/dung-cu/QuanLyDungCuPage";

export const metadata = { title: "Dụng cụ" };

export default function Page() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Đang tải dụng cụ…</div>}>
      <QuanLyDungCuPage />
    </Suspense>
  );
}
