import React, { Suspense } from "react";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import { parseGscLocPrefill } from "@/modules/giam-sat-chung/lib/gsc-loc-prefill";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { pickGscEditSessionId } from "@/modules/giam-sat-chung/lib/gsc-edit-session-param";

export const metadata = {
  title: "Đánh giá hệ thống",
  description:
    "Tab đánh giá hệ thống nội bộ — thanh tra JCI/APSIC, review SOP/policy.",
};

type Props = {
  searchParams: Promise<{ edit?: string; session?: string; loc?: string; ma?: string }>;
};

export default async function DanhGiaHeThongPage({ searchParams }: Props) {
  const params = await searchParams;
  const editId = pickGscEditSessionId(params);
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscFormView
        initialLoaiGiamSat="DANH_GIA_HE_THONG"
        editSessionId={editId}
        locPrefill={parseGscLocPrefill({ ...params, edit: editId })}
      />
    </Suspense>
  );
}
