import { getRegistryEntryOrNull } from "@/lib/master-data/domain-registry";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import { notFound, redirect } from "next/navigation";
import { normalizeLoaiParam } from "@/components/master-data/generic-dm/OwnedLookupPages";

/**
 * AR-8g (PO 2026-11-11): danh mục sửa trong module sở hữu — route cũ chỉ còn chuyển hướng
 * bookmark. Trang đích tự kiểm quyền; loại không có trong registry → 404.
 */
export default async function Page(props: { params: Promise<{ loai: string }> }) {
  const loai = normalizeLoaiParam((await props.params).loai);
  if (!getRegistryEntryOrNull(loai)) notFound();
  redirect(getDanhMucAdminPath(loai));
}
