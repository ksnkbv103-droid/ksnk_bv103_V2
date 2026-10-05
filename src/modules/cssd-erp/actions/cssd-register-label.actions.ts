"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getErrorMessage, mapFkError, revalidateCssdInventorySurfaces } from "./cssd-action-common";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { bootstrapCssdQuyTrinhFromBoId } from "../shared/application/cssd-bo-bootstrap";

async function verifyCanRegisterPhysicalLabel(): Promise<void> {
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "create");
    return;
  } catch {
    /* fall through */
  }
  try {
    await verifyPermission("CSSD_WORKFLOW", "create");
    return;
  } catch {
    /* fall through */
  }
  await verifyPermission("CSSD_WORKFLOW", "edit");
}

async function verifyCanReadBoListForCssd(): Promise<void> {
  const checks: Array<[string, string]> = [
    ["CSSD_KHO_DUNGCU", "view"],
    ["CSSD_KHO_DUNGCU", "edit"],
    ["CSSD_KHO_DUNGCU", "create"],
    ["CSSD_KHO_DUNGCU", "import"],
    ["CSSD_WORKFLOW", "view"],
  ];
  for (const [moduleKey, action] of checks) {
    try {
      await verifyPermission(moduleKey, action);
      return;
    } catch {
      /* try next permission candidate */
    }
  }
  await verifyPermission("CSSD_KHO_DUNGCU", "view");
}

/** Danh sách bộ đang hoạt động để đăng ký nhãn QR (đọc từ `cssd_dm_bo_dung_cu`). */
export async function listActiveBoDungCuForCssdLabel(search?: string): Promise<
  { success: true; data: { id: string; ten_bo: string; ma_bo: string | null }[] } | { success: false; error: string }
> {
  try {
    await verifyCanReadBoListForCssd();
    const supabase = createAdminSupabaseClient();
    let q = supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ten_bo, ma_bo")
      .eq("is_active", true)
      .order("ma_bo", { ascending: true });

    const searchFilter = buildSupabaseSearchFilter(search, ["ten_bo", "ma_bo"]);
    if (searchFilter) q = q.or(searchFilter);

    const { data, error } = await q;
    if (error) return { success: false, error: mapFkError(error.message) };
    const rows = (data || []).map((r: { id?: string; ten_bo?: string; ma_bo?: string | null }) => ({
      id: String(r.id || ""),
      ten_bo: String(r.ten_bo || "").trim() || "—",
      ma_bo: r.ma_bo != null ? String(r.ma_bo).trim() : null,
    }));
    return { success: true, data: rows.filter((x) => x.id) };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

/**
 * Tạo/cập nhật quy_trinh — mã quét = ma_bo (SSOT, vd. B01.SET.01).
 */
export async function registerPhysicalBoLabelFromDmAction(boDungCuId: string): Promise<
  | { success: true; ma_vach_qr: string; ten_bo: string; bo_id: string }
  | { success: false; error: string }
> {
  try {
    await verifyCanRegisterPhysicalLabel();
    const supabase = createAdminSupabaseClient();
    const boId = String(boDungCuId || "").trim();
    if (!boId) return { success: false, error: "Thiếu bộ dụng cụ (danh mục)." };

    const boot = await bootstrapCssdQuyTrinhFromBoId(supabase, boId);
    revalidateCssdInventorySurfaces();

    return {
      success: true,
      ma_vach_qr: boot.ma_vach_qr,
      ten_bo: boot.ten_bo,
      bo_id: boot.bo_id,
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

/**
 * CSSD-04: tách nhiệt chỉ tại danh mục (parent_bo_id) — không tách SUB trên trạm.
 */
export async function registerSplitSubQrFromMainMaAction(
  _maQrMain: string,
): Promise<{ success: true; ma_vach_qr_phu: string; quy_trinh_cha_id: string } | { success: false; error: string }> {
  return {
    success: false,
    error:
      "Tách nhiệt làm tại danh mục dụng cụ (bộ thành phần chịu nhiệt / không chịu nhiệt). Không tách trên trạm Đóng gói.",
  };
}
