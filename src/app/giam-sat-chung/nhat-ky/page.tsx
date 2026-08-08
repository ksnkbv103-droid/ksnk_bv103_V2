import React, { Suspense } from "react";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import { parseGscLocPrefill } from "@/modules/giam-sat-chung/lib/gsc-loc-prefill";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Nhật ký vận hành KSNK | KSNK 103",
  description:
    "Tab nhật ký vận hành — log số liệu thiết bị/môi trường, không tính rate, cảnh báo ngoài ngưỡng (out-of-range).",
};

type Props = {
  searchParams: Promise<{ edit?: string; loc?: string; ma?: string }>;
};

export default async function NhatKyVanHanhPage({ searchParams }: Props) {
  const params = await searchParams;
  const editId = params.edit || null;
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscFormView
        initialLoaiGiamSat="NHAT_KY_VAN_HANH"
        editSessionId={editId}
        locPrefill={parseGscLocPrefill({ ...params, edit: editId })}
      />
    </Suspense>
  );
}