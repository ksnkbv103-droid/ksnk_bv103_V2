"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { buildQuyTrinhTramPatch } from "../lib/cssd-tram-persist";
import { getErrorMessage, mapFkError, revalidateCssdInventorySurfaces } from "./cssd-action-common";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { buildCssdSubBoMa, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import { bootstrapCssdQuyTrinhFromBoId } from "../shared/application/cssd-bo-bootstrap";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";

async function verifyCanRegisterPhysicalLabel(): Promise<void> {
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "create");
    return;
  } catch {
    /* fall through */
  }
  await verifyPermission("CSSD_WORKFLOW", "create");
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
 * Tách mã SUB — `{ma_bo MAIN}-SUB`, liên kết quy_trinh_cha.
 */
export async function registerSplitSubQrFromMainMaAction(maQrMain: string): Promise<
  { success: true; ma_vach_qr_phu: string; quy_trinh_cha_id: string } | { success: false; error: string }
> {
  try {
    try {
      await verifyCanRegisterPhysicalLabel();
    } catch {
      await verifyPermission("CSSD_WORKFLOW", "edit");
    }
    const supabase = createAdminSupabaseClient();
    const mainCode = normalizeBoMa(maQrMain);
    if (!mainCode) return { success: false, error: "Thiếu mã QR bộ chính." };

    const main = await fetchActiveQuyTrinhByScanCode(supabase, mainCode);
    if (!main) return { success: false, error: "Không tìm thấy quy trình MAIN." };

    const mainMa =
      normalizeBoMa(String((main as { ma_bo?: string | null }).ma_bo || "")) ||
      normalizeBoMa(String((main as { ma_qr_quy_trinh?: string }).ma_qr_quy_trinh || mainCode));
    const subQr = buildCssdSubBoMa(mainMa);

    const { data: subHit } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id")
      .eq("ma_qr_quy_trinh", subQr)
      .eq("is_active", true)
      .maybeSingle();
    if (subHit?.id) {
      return { success: false, error: `Mã SUB ${subQr} đã tồn tại.` };
    }

    const sta = String((main as { ma_trang_thai_hien_tai?: string }).ma_trang_thai_hien_tai || "DONG_GOI").trim();
    const staPatch = await buildQuyTrinhTramPatch(supabase, sta);
    const boId = String((main as { bo_dung_cu_id?: string | null }).bo_dung_cu_id || "").trim();
    const mainId = String((main as { id?: string }).id || "").trim();

    const { error: tagMainErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .update({ ma_vai_tro_bo: "MAIN", updated_at: new Date().toISOString() })
      .eq("id", mainId);
    if (tagMainErr) return { success: false, error: mapFkError(tagMainErr.message) };

    const { error: insSubErr } = await supabase.from("cssd_fact_quy_trinh").insert({
      ma_qr_quy_trinh: subQr,
      ma_qr_bo_vinh_vien: subQr,
      bo_dung_cu_id: boId || null,
      ...staPatch,
      quy_trinh_cha_id: mainId,
      ma_vai_tro_bo: "SUB",
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    if (insSubErr) return { success: false, error: mapFkError(insSubErr.message) };

    revalidateCssdInventorySurfaces();

    return { success: true, ma_vach_qr_phu: subQr, quy_trinh_cha_id: mainId };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
