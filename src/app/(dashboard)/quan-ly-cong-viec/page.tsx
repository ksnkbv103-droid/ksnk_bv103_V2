import React, { Suspense } from "react";
import QuanLyCongViecPage from "@/modules/quan-ly-cong-viec/views/QuanLyCongViecPage";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Quản lý công việc | KSNK 103",
  description: "Điều hành công việc nội bộ KSNK — giao việc, checklist, việc định kỳ",
};

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <QuanLyCongViecPage />
    </Suspense>
  );
}
