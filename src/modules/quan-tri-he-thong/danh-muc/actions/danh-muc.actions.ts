"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath, unstable_cache, revalidateTag } from "next/cache";
import type { DanhMuc } from "../lib/danh-muc-flat-record";
import { addResolvedLoaiValues, getDanhMucItemById } from "@/lib/master-data/repository";
import { verifyPermission } from "../../actions/verify-permission";
import { verifyAnyPermission } from "@/lib/server-permission";
import { DASHBOARD_CC_WIDGET } from "@/lib/dashboard-command-center-widget-keys";
import { getRegistryEntry } from "@/lib/master-data/domain-registry";
import { buildNextDmBusinessCode, buildMigratedUpsertPayload, setDanhMucActiveFlag } from "@/lib/master-data/danh-muc-routing";

function errDanhMuc(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Đọc dropdown danh mục: đặt ở đầu `getCategoriesByType` (không đặt trong callback `unstable_cache` — tránh cache chung bỏ qua kiểm tra quyền). */
const VIEW_ANY_FOR_DM_CATEGORIES = [
  { moduleKey: "DASHBOARD", action: "view" },
  { moduleKey: DASHBOARD_CC_WIDGET.OVERVIEW, action: "view" },
  { moduleKey: DASHBOARD_CC_WIDGET.SUPERVISION, action: "view" },
  { moduleKey: DASHBOARD_CC_WIDGET.GAP, action: "view" },
  { moduleKey: "DANH_MUC", action: "view" },
  { moduleKey: "NHAN_SU", action: "view" },
  { moduleKey: "PHAN_QUYEN", action: "view" },
  { moduleKey: "BANG_KIEM", action: "view" },
  { moduleKey: "BANG_KIEM_DETAIL", action: "view" },
  { moduleKey: "LOAI_DC", action: "view" },
  { moduleKey: "BO_DC", action: "view" },
  { moduleKey: "DC_LE", action: "view" },
  { moduleKey: "THIET_BI", action: "view" },
  { moduleKey: "HOA_CHAT", action: "view" },
  { moduleKey: "KHOA_PHONG", action: "view" },
  { moduleKey: "GIAM_SAT_VST", action: "view" },
  { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
  { moduleKey: "GIAM_SAT_NKBV", action: "view" },
  { moduleKey: "CONG_VIEC", action: "view" },
  { moduleKey: "CSSD_WORKFLOW", action: "view" },
  { moduleKey: "CSSD_KHO_DUNGCU", action: "view" },
  { moduleKey: "CSSD_REPORT", action: "view" },
  { moduleKey: "CSSD_ME_TIET_KHUAN", action: "view" },
  { moduleKey: "KSNK_KHO_HOACHAT", action: "view" },
  { moduleKey: "BAO_SU_CO", action: "view" },
] as const;

export async function saveDanhMuc(data: Partial<DanhMuc>) {
  try {
    await verifyPermission("DANH_MUC", "edit");
    const supabase = createAdminSupabaseClient();
    const { id, ...updateData } = data;
    const resolvedData = await addResolvedLoaiValues(supabase, updateData as Record<string, unknown>);
    const loai = String((resolvedData as { loai_danh_muc?: string }).loai_danh_muc || "").trim();
    if (!loai) throw new Error("Thiếu loai_danh_muc.");
    const reg = getRegistryEntry(loai);

    let ten = String((resolvedData as { ten_danh_muc?: string }).ten_danh_muc || "").trim();
    let ma = String((resolvedData as { ma_danh_muc?: string }).ma_danh_muc || "").trim();
    if (id) {
      const cur = await getDanhMucItemById(supabase, id);
      if (!cur) throw new Error("Không tìm thấy bản ghi.");
      if (!ma) ma = cur.ma_danh_muc || "";
      if (!ten) ten = cur.ten_danh_muc || "";
    }
    if (!ten) throw new Error("Vui lòng nhập tên danh mục.");
    if (!ma) ma = await buildNextDmBusinessCode(supabase, reg);
    const isActive =
      (resolvedData as { is_active?: boolean }).is_active !== undefined
        ? Boolean((resolvedData as { is_active?: boolean }).is_active)
        : data.is_active !== false;
    const patch = buildMigratedUpsertPayload(reg, { ma, ten, isActive });
    if (id) {
      const { error } = await supabase.from(reg.sourceTable).update(patch).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from(reg.sourceTable).insert([patch]);
      if (error) throw error;
    }

    revalidatePath("/quan-tri-he-thong");
    revalidateTag("danh-muc-static", "default");
    return { success: true, message: id ? "Cập nhật thành công" : "Thêm mới thành công" };
  } catch (error: unknown) {
    const msg = errDanhMuc(error);
    console.error("LỖI saveDanhMuc:", msg);
    let userMessage = "Lỗi kết nối cơ sở dữ liệu";
    if (msg.includes("fetch failed"))
      userMessage = "Không thể kết nối đến máy chủ Supabase (Kiểm tra internet hoặc DNS)";
    return { success: false, error: `${userMessage}: ${msg || "Unknown error"}` };
  }
}

export async function deleteDanhMuc(id: string) {
  try {
    await verifyPermission("DANH_MUC", "delete");
    const supabase = createAdminSupabaseClient();
    await setDanhMucActiveFlag(supabase, id, false);
    revalidatePath("/quan-tri-he-thong");
    revalidateTag("danh-muc-static", "default");
    return { success: true, message: "Đã xóa danh mục thành công" };
  } catch (error: unknown) {
    console.error("LỖI deleteDanhMuc:", error);
    return { success: false, error: `Không thể xóa danh mục: ${errDanhMuc(error) || "Lỗi kết nối"}` };
  }
}

export async function getCategoriesByType(type: string) {
  await verifyAnyPermission(VIEW_ANY_FOR_DM_CATEGORIES);

  // Những loại danh mục "tĩnh" ít thay đổi sẽ được cache 15 phút
  const isStatic = ["KHOA_PHONG", "NGHE_NGHIEP", "KHU_VUC_GIAM_SAT", "LOAI_NKBV", "CHUC_VU", "CHUC_DANH"].includes(type);

  if (isStatic) {
    const cachedFn = unstable_cache(
      async (t: string) => fetchCategoriesRaw(t),
      ["danh-muc-categories", type],
      { tags: ["danh-muc-static", `danh-muc-${type}`], revalidate: 900 } // 15 mins
    );
    return cachedFn(type);
  }

  return fetchCategoriesRaw(type);
}

async function fetchCategoriesRaw(type: string) {
  console.log(`[ACTION] Đang fetch database cho danh mục: ${type}`);
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
    return { success: true, data: mapped };
  } catch (error: unknown) {
    console.error(`[ACTION FATAL] Lỗi fetchCategoriesRaw (${type}):`, error);
    return { success: false, error: `Không thể tải danh mục ${type}: ${errDanhMuc(error)}` };
  }
}
