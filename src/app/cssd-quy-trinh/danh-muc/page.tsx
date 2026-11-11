import { OwnedLookupIndex } from "@/components/master-data/generic-dm/OwnedLookupPages";

export const metadata = { title: "Danh mục CSSD" };

/** AR-8f (PO 2026-11-11): danh mục tra cứu của miền, sửa trong module; ghi = ADMIN. */
export default function Page() {
  return <OwnedLookupIndex owner="CSSD_WORKFLOW" title="Danh mục CSSD" subtitle="Trạm CSSD, loại sự cố, loại máy tiệt khuẩn." />;
}
