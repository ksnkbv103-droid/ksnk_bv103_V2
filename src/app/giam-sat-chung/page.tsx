// src/app/giam-sat-chung/page.tsx
import React, { Suspense } from "react";
import GiamSatChungPage from "@/modules/giam-sat-chung/views/GiamSatChungPage";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Giám sát Tổng hợp | KSNK 103",
  description: "Hệ thống bảng kiểm giám sát chung Kiểm soát nhiễm khuẩn",
};

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GiamSatChungPage />
    </Suspense>
  );
}
