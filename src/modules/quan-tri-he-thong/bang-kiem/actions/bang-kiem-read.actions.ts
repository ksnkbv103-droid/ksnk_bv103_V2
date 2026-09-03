"use server";

import { sanitizeBusinessMaPrefix } from "@/lib/master-data/business-ma-prefix";
import { createServerSupabaseUserClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "../../actions/verify-permission";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import type { DanhMucBangKiem, TieuChiBangKiem } from "../bang-kiem.types";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";

function errMsg(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const anyErr = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [
      typeof anyErr.message === "string" ? anyErr.message : "",
      typeof anyErr.details === "string" ? anyErr.details : "",
      typeof anyErr.hint === "string" ? anyErr.hint : "",
      typeof anyErr.code === "string" ? `(code: ${anyErr.code})` : "",
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" | ");
  }
  return "Lỗi không xác định khi tải danh mục bảng kiểm";
}

function normalizeBangKiemRows(rows: unknown[]): DanhMucBangKiem[] {
  return ((rows || []) as Array<Record<string, unknown>>).map((bk) => {
    const dmChildren = Array.isArray(bk.tieu_chi_jsonb) ? bk.tieu_chi_jsonb : [];
    return {
      ...(bk as DanhMucBangKiem),
      tieu_chi_bang_kiem: dmChildren as TieuChiBangKiem[],
    };
  });
}

export async function getBangKiems() {
  try {
    await verifyPermission("BANG_KIEM", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("*")
      .order("is_active", { ascending: false })
      .order("ma_bk", { ascending: true });
    if (error) throw error;
    return { success: true, data: normalizeBangKiemRows(data || []) };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

export async function getExportData() {
  try {
    await verifyPermission("BANG_KIEM", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("*")
      .order("is_active", { ascending: false })
      .order("ma_bk", { ascending: true });
    if (error) throw error;
    return { success: true, data: normalizeBangKiemRows(data || []) };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

/**
 * Gợi ý mã bảng kiểm kế tiếp theo tiền tố (một RPC, không tải toàn bộ ma_bk).
 */
export async function suggestNextBangKiemMaAction(prefixRaw: string) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("BANG_KIEM", "view");
    const prefix = sanitizeBusinessMaPrefix(prefixRaw);
    if (!prefix) {
      return { success: false as const, error: "Tiền tố mã không hợp lệ." };
    }
    const { data, error } = await supabase.rpc("rpc_gstt_dm_bang_kiem_max_numeric_suffix", {
      p_prefix: prefix,
    });
    if (error) throw error;
    const maxSuffix = typeof data === "number" ? data : Number.parseInt(String(data ?? "0"), 10);
    const maxSafe = Number.isFinite(maxSuffix) ? maxSuffix : 0;
    const nextNum = maxSafe + 1;
    const nextCode = `${prefix}${nextNum.toString().padStart(3, "0")}`;
    return { success: true as const, nextCode };
  } catch (error: unknown) {
    return { success: false as const, error: errMsg(error) };
  }
}

export async function getTieuChis(bangKiemId: string, activeOnly = false) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("gstt_dm_bang_kiem").select("tieu_chi_jsonb").eq("id", bangKiemId).single();
    if (error) throw error;
    let tieuChis = Array.isArray(data?.tieu_chi_jsonb) ? data.tieu_chi_jsonb : [];
    if (activeOnly) tieuChis = tieuChis.filter((t: any) => t.is_active !== false);
    tieuChis.sort((a: any, b: any) => (a.stt || 0) - (b.stt || 0));
    return { success: true, data: tieuChis };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

/** Tiêu chí bảng kiểm khi làm việc trong module Giám sát chung (không yêu cầu BANG_KIEM_DETAIL). */
export async function getTieuChisForGiamSatChung(bangKiemId: string, activeOnly = false) {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("gstt_dm_bang_kiem").select("tieu_chi_jsonb").eq("id", bangKiemId).single();
    if (error) throw error;
    let tieuChis = Array.isArray(data?.tieu_chi_jsonb) ? data.tieu_chi_jsonb : [];
    if (activeOnly) tieuChis = tieuChis.filter((t: any) => t.is_active !== false);
    tieuChis.sort((a: any, b: any) => (a.stt || 0) - (b.stt || 0));
    return { success: true, data: tieuChis };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

export async function getBangKiemsForGiamSat() {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const { getActorKsnkScope } = await import("@/lib/actor-ksnk-scope-server");
    const { resolveBkApDungChoKhoa } = await import("@/lib/domain/bang-kiem-ap-dung");
    const scope = await getActorKsnkScope();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("*")
      .eq("is_active", true)
      .order("ma_bk", { ascending: true });
    if (error) throw error;
    let filteredData = normalizeBangKiemRows(data || []).map((bk) => ({
      ...bk,
      tieu_chi_bang_kiem: (bk.tieu_chi_bang_kiem || []).filter(
        (tc: TieuChiBangKiem) => tc.is_active === true,
      ),
    }));
    // Mạng lưới KSNK: chỉ mẫu áp dụng cho khoa hồ sơ (KSNK/ADMIN giữ toàn bộ).
    if (scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk) {
      if (!scope.actorKhoaId) {
        return { success: true, data: [] };
      }
      const { data: khoaRow } = await supabase
        .from("mdm_dm_khoa_phong")
        .select("id, khoi_id, ma_khoa, ten_khoa, is_active")
        .eq("id", scope.actorKhoaId)
        .maybeSingle();
      if (!khoaRow) {
        return { success: true, data: [] };
      }
      const khoaCtx = {
        id: String(khoaRow.id),
        khoi_id: khoaRow.khoi_id ? String(khoaRow.khoi_id) : null,
        ma_khoa: khoaRow.ma_khoa ? String(khoaRow.ma_khoa) : null,
        ten_khoa: khoaRow.ten_khoa ? String(khoaRow.ten_khoa) : null,
        is_active: khoaRow.is_active !== false,
      };
      filteredData = filteredData.filter((bk) =>
        resolveBkApDungChoKhoa(
          {
            id: String(bk.id),
            ma_bk: bk.ma_bk,
            ten_bang_kiem: bk.ten_bang_kiem,
            is_active: true,
            ap_dung_jsonb: (bk as { ap_dung_jsonb?: unknown }).ap_dung_jsonb,
          },
          khoaCtx,
        ),
      );
    }
    return { success: true, data: filteredData };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * BK-5: đọc 1 mẫu theo mã/UUID kể cả đã tắt — chỉ để mở/in phiếu cũ.
 * Không dùng cho danh sách chọn phiếu mới (vẫn `getBangKiemsForGiamSat`).
 */
export async function getBangKiemByMaOrIdForGscLookup(maOrId: string) {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const q = String(maOrId ?? "").trim();
    if (!q) return { success: false as const, error: "Thiếu mã bảng kiểm." };
    const supabase = createAdminSupabaseClient();
    const byId = UUID_RE.test(q);
    const { data, error } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("*")
      .eq(byId ? "id" : "ma_bk", q)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id && byId) {
      const { data: byMa, error: maErr } = await supabase
        .from("gstt_dm_bang_kiem")
        .select("*")
        .eq("ma_bk", q)
        .maybeSingle();
      if (maErr) throw maErr;
      if (!byMa?.id) return { success: false as const, error: "Không tìm thấy mẫu bảng kiểm." };
      return { success: true as const, data: normalizeBangKiemRows([byMa])[0] };
    }
    if (!data?.id) return { success: false as const, error: "Không tìm thấy mẫu bảng kiểm." };
    return { success: true as const, data: normalizeBangKiemRows([data])[0] };
  } catch (error: unknown) {
    return { success: false as const, error: errMsg(error) };
  }
}

/** Dropdown “Loại hình giám sát” — đồng bộ với hub `HINH_THUC_GIAM_SAT` / `gstt_dm_hinh_thuc_giam_sat`. */
/** Khoa/khối cho form «Áp dụng & bắt buộc» — quyền BANG_KIEM. */
export async function getBangKiemApDungFormOptionsAction() {
  try {
    await verifyPermission("BANG_KIEM", "view");
    const supabase = createAdminSupabaseClient();
    const [khoiRes, khoaRes] = await Promise.all([
      fetchActiveRegistryDmRows(supabase, "KHOI_KHOA"),
      supabase
        .from("mdm_dm_khoa_phong")
        .select("id, ma_khoa, ten_khoa, khoi_id, is_active")
        .eq("is_active", true)
        .order("ma_khoa"),
    ]);
    if (khoaRes.error) throw khoaRes.error;
    return {
      success: true as const,
      khoiOptions: khoiRes.map((r) => ({
        id: r.id,
        label: r.ma ? `[${r.ma}] ${r.ten}` : r.ten,
      })),
      khoaOptions: (khoaRes.data ?? []).map((k) => ({
        id: String(k.id),
        label: formatKhoaPickerLabel({ ma_khoa: k.ma_khoa, ten_khoa: k.ten_khoa }),
        khoi_id: k.khoi_id ? String(k.khoi_id) : undefined,
      })),
    };
  } catch (error: unknown) {
    return { success: false as const, error: errMsg(error) };
  }
}

export async function getHinhThucGiamSatOptionsForBangKiemAction() {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("BANG_KIEM", "view");
    const rows = await fetchActiveRegistryDmRows(supabase, "HINH_THUC_GIAM_SAT");
    return { success: true as const, data: rows };
  } catch (error: unknown) {
    return { success: false as const, error: errMsg(error), data: [] as RegistrySelectRow[] };
  }
}
