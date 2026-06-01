/**
 * /giam-sat-chung/tuan-thu — Slice 5 (giam-sat-tuan-thu reform v4).
 *
 * Tab "Giám sát tuân thủ": chỉ list bảng kiểm có `loai_giam_sat='TUAN_THU'`.
 * Reuse view chính `GiamSatChungPage` + filter param `tab=tuan-thu` để giữ
 * 1 codebase form. Slice 5 v1: route alias chuyển hướng → /giam-sat-chung
 * với tab pre-selected; logic filter sẽ làm sau ở GiamSatChungPage.
 */

import React from "react";
import GiamSatChungPage from "@/modules/giam-sat-chung/views/GiamSatChungPage";

export const metadata = {
  title: "Giám sát Tuân thủ Thực hành KSNK | KSNK 103",
  description:
    "Tab giám sát tuân thủ — Mạng lưới KSNK quan sát hành vi NVYT theo bảng kiểm động (cach_tinh_diem TY_LE/TRON_GOI/DAT_KHONG_DAT).",
};

export default function GiamSatTuanThuPage() {
  return <GiamSatChungPage initialLoaiGiamSat="TUAN_THU" />;
}
