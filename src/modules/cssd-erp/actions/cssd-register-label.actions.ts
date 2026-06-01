"use server";

import { randomBytes } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { buildQuyTrinhTramPatch } from "../lib/cssd-tram-persist";
import { getErrorMessage, mapFkError, revalidateCssdInventorySurfaces } from "./cssd-action-common";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";

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

/**
 * Combo (mã cố định + độ ngẫu nhiên) để hạn chế đụng và trùng trong thực tế.
 */
function generateMaVachQrBo(): string {
  const rnd = randomBytes(5).toString("hex").toUpperCase();
  return `BV103-DC-${rnd}`;
}

/** Danh sách bộ đang hoạt động để đăng ký nhãn QR (đọc từ `dm_bo_dung_cu`). */
export async function listActiveBoDungCuForCssdLabel(search?: string): Promise<
  { success: true; data: { id: string; ten_bo: string; ma_bo: string | null }[] } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCanReadBoListForCssd();
    let q = supabase
      .from("dm_bo_dung_cu")
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
 * Tạo một dòng `quy_trinh` đã gắn `bo_dung_cu_id` + `ma_vach_qr` (chờ in dán và quét tại các trạm).
 */
export async function registerPhysicalBoLabelFromDmAction(boDungCuId: string): Promise<
  | { success: true; ma_vach_qr: string; ten_bo: string; bo_id: string }
  | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCanRegisterPhysicalLabel();
    const boId = String(boDungCuId || "").trim();
    if (!boId) return { success: false, error: "Thiếu bộ dụng cụ (danh mục)." };

    const { data: bo, error: boErr } = await supabase
      .from("dm_bo_dung_cu")
      .select("id, ten_bo")
      .eq("id", boId)
      .eq("is_active", true)
      .maybeSingle();
    if (boErr) return { success: false, error: mapFkError(boErr.message) };
    if (!bo) return { success: false, error: "Không tìm thấy bộ dụng cụ hoạt động trong danh mục." };

    // Một bộ dụng cụ vật lý chỉ có 1 QR "định danh" xuyên suốt.
    // Nếu đã từng đăng ký QR trước đó thì tái sử dụng đúng mã cũ.
    const { data: existing, error: existingErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id, ma_qr_quy_trinh, bo_dung_cu_id")
      .eq("bo_dung_cu_id", boId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) return { success: false, error: mapFkError(existingErr.message) };

    let ma_vach_qr = String((existing as { ma_qr_quy_trinh?: string } | null)?.ma_qr_quy_trinh || "").trim();
    if (ma_vach_qr) {
      const { error: upErr } = await supabase
        .from("cssd_fact_quy_trinh")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", String((existing as { id?: string } | null)?.id || ""));
      if (upErr) return { success: false, error: mapFkError(upErr.message) };
    } else {
      ma_vach_qr = generateMaVachQrBo();
      const tiepNhanPatch = await buildQuyTrinhTramPatch(supabase, "TIEP_NHAN");
      const { error: insErr } = await supabase.from("cssd_fact_quy_trinh").insert({
        ma_qr_quy_trinh: ma_vach_qr,
        bo_dung_cu_id: boId,
        ...tiepNhanPatch,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      if (insErr) return { success: false, error: mapFkError(insErr.message) };
    }

    revalidateCssdInventorySurfaces();

    return {
      success: true,
      ma_vach_qr,
      ten_bo: String((bo as { ten_bo?: string }).ten_bo || "").trim() || "Bộ dụng cụ",
      bo_id: boId,
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

/**
 * Tách mã (Trạm 4): sinh QR phụ liên kết MAIN — đóng plasma/EO trong mẻ riêng, hội quân khi Cấp phát.
 */
export async function registerSplitSubQrFromMainMaAction(maQrMain: string): Promise<
  { success: true; ma_vach_qr_phu: string; quy_trinh_cha_id: string } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCanRegisterPhysicalLabel();
    const mainCode = String(maQrMain || "").trim().toUpperCase();
    if (!mainCode) return { success: false, error: "Thiếu mã QR bộ chính." };

    const { data: main, error: mainErr } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("*")
      .eq("ma_qr_quy_trinh", mainCode)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (mainErr) return { success: false, error: mapFkError(mainErr.message) };
    if (!main) return { success: false, error: "Không tìm thấy quy trình MAIN." };

    const subQr = `BV103-SUB-${randomBytes(4).toString("hex").toUpperCase()}`;
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
