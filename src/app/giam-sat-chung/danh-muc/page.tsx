import { OwnedLookupIndex } from "@/components/master-data/generic-dm/OwnedLookupPages";

export const metadata = { title: "Danh mục giám sát" };

/** AR-8f (PO 2026-11-11): danh mục tra cứu của miền, sửa trong module; ghi = ADMIN. */
export default function Page() {
  return <OwnedLookupIndex owner="GIAM_SAT_CHUNG" title="Danh mục giám sát" subtitle="Khu vực, hình thức, cách thức giám sát." />;
}
