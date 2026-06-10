import React, { Suspense } from "react";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Giám sát Tuân thủ Thực hành KSNK | KSNK 103",
  description:
    "Tab giám sát tuân thủ — Mạng lưới KSNK quan sát hành vi NVYT theo bảng kiểm động (cach_tinh_diem TY_LE/TRON_GOI/DAT_KHONG_DAT).",
};

export default function GiamSatTuanThuPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscFormView initialLoaiGiamSat="TUAN_THU" />
    </Suspense>
  );
}
