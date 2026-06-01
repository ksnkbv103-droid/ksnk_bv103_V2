import { revalidateTag } from "next/cache";

/** Invalidate cache static danh mục sau bulk import / mutate lookup. */
export function revalidateCategoriesByTypeTag(loaiDanhMuc: string) {
  const t = String(loaiDanhMuc || "").trim().toUpperCase();
  if (t) revalidateTag(`danh-muc-${t}`, "default");
  revalidateTag("danh-muc-static", "default");
}
