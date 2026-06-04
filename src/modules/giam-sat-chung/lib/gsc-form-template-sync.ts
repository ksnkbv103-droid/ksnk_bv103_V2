import {
  getBangKiemsForGiamSat,
  getTieuChisForGiamSatChung,
} from "@/lib/mdm-read-gateway";
import type { ChecklistCriterion, ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";

import type { BangKiemCachTinhDiem, BangKiemLoaiGiamSat } from "../types";

export type GscTemplateOption = {
  id: string;
  ma_bk: string;
  ten_bang_kiem: string;
  loai_giam_sat?: BangKiemLoaiGiamSat | string | null;
  cach_tinh_diem?: BangKiemCachTinhDiem | string | null;
};

/**
 * Raw tiêu chí element từ `gstt_dm_bang_kiem.tieu_chi_jsonb`.
 * Field naming khớp với JSONB schema do parser sinh (BANGKIEM/TIEUCHI migration).
 */
export type TieuChiJsonbRaw = {
  id: string;
  noi_dung?: string | null;
  stt?: number | null;
  diem_toi_da?: number | null;
  phan_muc?: string | null;
  kieu_du_lieu?: string | null;
  la_then_chot?: boolean | null;
  cho_phep_kpa?: boolean | null;
  cac_lua_chon?: string[] | null;
  ma_csv_goc?: string | null;
  ghi_chu?: string | null;
  weight_type?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  weightType?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  is_red_flag?: boolean;
  isRedFlag?: boolean;
  pham_vi_tags?: readonly string[] | null;
  nguong_min?: number | null;
  nguong_max?: number | null;
  don_vi?: string | null;
};

function normalizeKieuDuLieu(raw?: string | null): ChecklistCriterion["kieu_du_lieu"] {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "LUA_CHON" || v === "ENUM") return "LUA_CHON";
  if (v === "SO_LIEU" || v === "NUMBER") return "SO_LIEU";
  return "BOOLEAN";
}

/**
 * Map 1 element từ `tieu_chi_jsonb` → `ChecklistCriterion` đầy đủ metadata.
 * Dùng chung cho `GiamSatChungPage` (lần đầu chọn bảng kiểm) và
 * `switchGscTemplateByBangKiemId` (đổi bảng kiểm trong form).
 *
 * Trước fix v4: 2 loader chỉ giữ id/label/weight → mất `kieu_du_lieu`,
 * `la_then_chot`, `cho_phep_kpa`, `cac_lua_chon` → LogEntryForm/WhoTimeout không hoạt động.
 */
export function mapTieuChiJsonbToCriterion(c: TieuChiJsonbRaw): ChecklistCriterion {
  return {
    id: c.id,
    label: String(c.noi_dung ?? "").trim() || "Tiêu chí",
    maxScore: c.diem_toi_da ?? 1,
    weightType: c.weightType ?? c.weight_type ?? "MAJOR",
    isRedFlag: c.isRedFlag ?? c.is_red_flag ?? false,
    phan_muc: c.phan_muc ?? null,
    kieu_du_lieu: normalizeKieuDuLieu(c.kieu_du_lieu),
    la_then_chot: Boolean(c.la_then_chot),
    cho_phep_kpa: c.cho_phep_kpa ?? true,
    cac_lua_chon: Array.isArray(c.cac_lua_chon) ? c.cac_lua_chon : null,
    ma_csv_goc: c.ma_csv_goc ?? null,
    pham_vi_tags: Array.isArray(c.pham_vi_tags) ? c.pham_vi_tags : undefined,
    nguong_min: c.nguong_min ?? null,
    nguong_max: c.nguong_max ?? null,
    don_vi: c.don_vi ?? null,
  };
}

export async function loadGscTemplateOptions(): Promise<GscTemplateOption[]> {
  const res = await getBangKiemsForGiamSat();
  if (!res.success) return [];
  return (res.data || []).map((b) => ({
    id: b.id,
    ma_bk: b.ma_bk || "",
    ten_bang_kiem: b.ten_bang_kiem || "",
    loai_giam_sat: (b as { loai_giam_sat?: string }).loai_giam_sat ?? null,
    cach_tinh_diem: (b as { cach_tinh_diem?: string }).cach_tinh_diem ?? null,
  }));
}

function templateMetaFromBk(bk: GscTemplateOption) {
  const lg = String(bk.loai_giam_sat ?? "").trim().toUpperCase() || null;
  const cach = String(bk.cach_tinh_diem ?? "").trim().toUpperCase() || null;
  return {
    loai_giam_sat: lg as BangKiemLoaiGiamSat | null,
    cach_tinh_diem: cach as BangKiemCachTinhDiem | null,
  };
}

type SwitchOk = { ok: true; template: ChecklistTemplate; results: ChecklistResult[] };
type SwitchErr = { ok: false; error: string };
export type SwitchGscTemplateResult = SwitchOk | SwitchErr;

export async function switchGscTemplateByBangKiemId(
  bkId: string,
  dbTemplates: GscTemplateOption[],
): Promise<SwitchGscTemplateResult> {
  const bk = dbTemplates.find((t) => t.id === bkId);
  if (!bk) return { ok: false, error: "Không tìm thấy mẫu" };

  const tcRes = await getTieuChisForGiamSatChung(bkId, true);
  if (!tcRes.success) return { ok: false, error: "Không thể tải tiêu chí: " + tcRes.error };

  const criteria = (tcRes.data || []) as TieuChiJsonbRaw[];
  const ma = String(bk.ma_bk ?? "").trim();
  const template: ChecklistTemplate = {
    id: ma || String(bk.id ?? ""),
    dbId: bk.id,
    title: bk.ten_bang_kiem,
    criteria: criteria.map(mapTieuChiJsonbToCriterion),
    ...templateMetaFromBk(bk),
  };
  const results = template.criteria.map((c) => ({
    criterionId: c.id,
    value: "NA" as const,
    weightType: c.weightType,
    isRedFlag: c.isRedFlag,
  }));
  return { ok: true, template, results };
}

