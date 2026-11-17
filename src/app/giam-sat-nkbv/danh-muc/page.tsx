import { OwnedLookupIndex } from "@/components/master-data/generic-dm/OwnedLookupPages";

export const metadata = { title: "Danh mục NKBV" };

/** AR-8g (PO 2026-11-11): danh mục NKBV (mã hệ thống, chỉ xem) nằm trong module NKBV. */
export default function Page() {
  return <OwnedLookupIndex owner="GIAM_SAT_NKBV" title="Danh mục NKBV" subtitle="Loại NKBV, trạng thái ca — mã hệ thống, chỉ xem." />;
}
