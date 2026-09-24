import type { SupabaseClient } from "@supabase/supabase-js";
import { CSSD_CYCLE_NOT_USED_CLINICALLY_OR } from "@/modules/cssd-erp/shared/domain/cssd-cycle-clinical-use";
import {
  explainSuCoSetOut,
  isOpenCycleEligibleForSuCo,
  isSafeSuCoSetCode,
  normalizeSuCoSetCode,
  SU_CO_OPEN_CYCLE_STATIONS,
  toSuCoOpenCycleInput,
} from "../domain/cssd-su-co-set-eligibility";

const LIST_CAP = 400;

export type SuCoSelectableSet = {
  id: string;
  ten_bo: string;
  ma_bo: string;
};

type CycleRow = {
  id?: string | null;
  bo_dung_cu_id?: string | null;
  ma_bo?: string | null;
  ten_bo?: string | null;
  ma_qr_quy_trinh?: string | null;
  ma_trang_thai_hien_tai?: string | null;
  ma_ca_mo_id?: string | null;
  khoa_nhan_id?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export type SuCoSelectableCycle =
  | { ok: true; code: string; quyTrinhId: string; boDungCuId: string | null; row: Record<string, unknown> }
  | { ok: false; error: string };

function orEq(code: string): string {
  return ["ma_qr_quy_trinh", "ma_cycle_qr", "ma_qr_bo_vinh_vien", "ma_bo"]
    .map((col) => `${col}.eq.${code}`)
    .join(",");
}

function sanitizeSearch(raw: string | undefined): string {
  return String(raw || "").trim().replace(/[%*,()]/g, "");
}

/** Bộ còn chu trình mở, chưa used_clinically (§17.3), trạm thuộc vòng xử lý. */
export async function listSuCoSelectableSets(
  supabase: SupabaseClient,
  search?: string,
): Promise<{ ok: true; data: SuCoSelectableSet[] } | { ok: false; error: string }> {
  const term = sanitizeSearch(search).toUpperCase();
  const { data, error } = await supabase
    .from("v_cssd_quy_trinh_full")
    .select(
      "id, bo_dung_cu_id, ma_bo, ten_bo, ma_trang_thai_hien_tai, ma_ca_mo_id, khoa_nhan_id, is_active",
    )
    .eq("is_active", true)
    .in("ma_trang_thai_hien_tai", [...SU_CO_OPEN_CYCLE_STATIONS])
    .or(CSSD_CYCLE_NOT_USED_CLINICALLY_OR)
    .order("ma_bo", { ascending: true })
    .limit(LIST_CAP);

  if (error) return { ok: false, error: error.message };

  const seen = new Set<string>();
  const out: SuCoSelectableSet[] = [];
  for (const raw of (data || []) as CycleRow[]) {
    if (!isOpenCycleEligibleForSuCo(toSuCoOpenCycleInput(raw))) continue;
    const id = String(raw.bo_dung_cu_id || "").trim();
    const maBo = normalizeSuCoSetCode(raw.ma_bo);
    const tenBo = String(raw.ten_bo || "").trim() || "—";
    if (!id || !maBo || seen.has(id)) continue;
    if (term && !maBo.includes(term) && !tenBo.toUpperCase().includes(term)) continue;
    seen.add(id);
    out.push({ id, ten_bo: tenBo, ma_bo: maBo });
  }
  return { ok: true, data: out };
}

/** Quét / chọn một mã bộ hoặc QR chu trình — từ chối danh mục thuần, chu trình đóng, đã dùng lâm sàng. */
export async function resolveSelectableSuCoSet(
  supabase: SupabaseClient,
  rawCode: string,
): Promise<SuCoSelectableCycle> {
  const code = normalizeSuCoSetCode(rawCode);
  if (!code) return { ok: false, error: "Thiếu mã bộ dụng cụ." };
  if (!isSafeSuCoSetCode(code)) return { ok: false, error: "Mã bộ không hợp lệ." };

  const { data, error } = await supabase
    .from("v_cssd_quy_trinh_full")
    .select("*")
    .or(orEq(code))
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) return { ok: false, error: error.message };

  const rows = (data || []) as Array<CycleRow & Record<string, unknown>>;
  const eligible = rows.find((row) => isOpenCycleEligibleForSuCo(toSuCoOpenCycleInput(row)));
  if (eligible?.id) {
    return {
      ok: true,
      code,
      quyTrinhId: String(eligible.id),
      boDungCuId: eligible.bo_dung_cu_id ? String(eligible.bo_dung_cu_id) : null,
      row: eligible,
    };
  }

  if (rows[0]) return { ok: false, error: explainSuCoSetOut(toSuCoOpenCycleInput(rows[0])) };

  const { data: catalog, error: catalogErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id")
    .eq("ma_bo", code)
    .limit(1)
    .maybeSingle();
  if (catalogErr) return { ok: false, error: catalogErr.message };
  if (catalog?.id) {
    return {
      ok: false,
      error: explainSuCoSetOut({ isActive: true, stationCode: null, maCaMoId: null }),
    };
  }

  return { ok: false, error: "Không tìm thấy bộ trong chu trình đang xử lý." };
}
