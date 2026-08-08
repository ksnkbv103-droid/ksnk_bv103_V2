import React, { Suspense } from "react";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import { parseGscLocPrefill } from "@/modules/giam-sat-chung/lib/gsc-loc-prefill";
import { parseGscPatientPrefill } from "@/modules/giam-sat-chung/lib/gsc-patient-prefill";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Giám sát Tuân thủ Thực hành KSNK | KSNK 103",
  description:
    "Tab giám sát tuân thủ — Mạng lưới KSNK quan sát hành vi NVYT theo bảng kiểm động (cach_tinh_diem TY_LE/TRON_GOI/DAT_KHONG_DAT).",
};

type Props = {
  searchParams: Promise<{
    edit?: string;
    loc?: string;
    ma?: string;
    bk?: string;
    khoa_id?: string;
    ma_benh_an?: string;
    ma_nguoi_benh?: string;
    ten_nguoi_benh?: string;
    bo_sung_nb?: string;
  }>;
};

export default async function GiamSatTuanThuPage({ searchParams }: Props) {
  const params = await searchParams;
  const editId = params.edit || null;
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscFormView
        initialLoaiGiamSat="TUAN_THU"
        editSessionId={editId}
        locPrefill={parseGscLocPrefill({ ...params, edit: editId })}
        patientPrefill={parseGscPatientPrefill(params)}
      />
    </Suspense>
  );
}
