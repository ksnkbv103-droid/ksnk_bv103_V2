// src/app/giam-sat-chung/page.tsx
import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Giám sát Tổng hợp | KSNK 103",
  description: "Hệ thống bảng kiểm giám sát chung Kiểm soát nhiễm khuẩn",
};

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  if (params.tab === "history") redirect("/lich-su/gsc");
  if (params.tab === "analytics") redirect("/thong-ke/gsc");

  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscFormView />
    </Suspense>
  );
}
