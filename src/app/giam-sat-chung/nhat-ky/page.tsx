import React, { Suspense } from "react";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import { parseGscLocPrefill } from "@/modules/giam-sat-chung/lib/gsc-loc-prefill";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { pickGscEditSessionId } from "@/modules/giam-sat-chung/lib/gsc-edit-session-param";

export const metadata = {
  title: "Nhật ký vận hành",
  description:
    "Tab nhật ký vận hành — log số liệu thiết bị/môi trường, không tính rate, cảnh báo ngoài ngưỡng (out-of-range).",
};

type Props = {
  searchParams: Promise<{ edit?: string; session?: string; loc?: string; ma?: string }>;
};

export default async function NhatKyVanHanhPage({ searchParams }: Props) {
  const params = await searchParams;
  const editId = pickGscEditSessionId(params);
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