"use server";

/**
 * Đọc danh mục theo `loaiDanhMuc` (registry) — cổng trung lập cho module vận hành.
 * UI quản trị có thể re-export qua `danh-muc.actions.ts`.
 */
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { unstable_cache } from "next/cache";
import { getRegistryEntry } from "@/lib/master-data/domain-registry";
import { verifyPermission } from "@/lib/server-permission";
import { resolveDanhMucViewModuleByType } from "@/lib/master-data/danh-muc-permission-map";

function errDanhMuc(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export async function getCategoriesByType(type: string) {
  const normalizedType = String(type || "").trim().toUpperCase();
  if (!normalizedType) {
    return { success: false as const, error: "Thiếu loại danh mục." };
  }
  const moduleKey = resolveDanhMucViewModuleByType(normalizedType);
  await verifyPermission(moduleKey, "view");

  const isStatic = ["KHOA_PHONG", "NGHE_NGHIEP", "KHU_VUC_GIAM_SAT", "LOAI_NKBV", "CHUC_VU", "CHUC_DANH"].includes(
    normalizedType,
  );

  if (isStatic) {
    const cachedFn = unstable_cache(
      async (t: string) => fetchCategoriesRaw(t),
      ["danh-muc-categories", normalizedType],
      { tags: ["danh-muc-static", `danh-muc-${normalizedType}`], revalidate: 900 },
    );
    return cachedFn(normalizedType);
  }

  return fetchCategoriesRaw(normalizedType);
}

async function fetchCategoriesRaw(type: string) {
  const supabase = createAdminSupabaseClient();
  try {
    const registry = getRegistryEntry(type);
    const columns = `id, ${registry.tenColumn}, ${registry.maColumn}, is_active`;
    const { data, error } = await supabase
      .from(registry.sourceTable)
      .select(columns)
      .eq("is_active", true)
      .order(registry.tenColumn, { ascending: true });
    if (error) throw error;
    const rows = ((data ?? []) as unknown) as Record<string, unknown>[];
    const mapped = rows.map((x) => ({
      id: x.id,
      ten_danh_muc: String(x[registry.tenColumn] || ""),
      ma_danh_muc: String(x[registry.maColumn] || ""),
      is_active: x.is_active,
      loai_danh_muc: type,
    }));
    return { success: true as const, data: mapped };
  } catch (error: unknown) {
    return { success: false as const, error: `Không thể tải danh mục ${type}: ${errDanhMuc(error)}` };
  }
}
