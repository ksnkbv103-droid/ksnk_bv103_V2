import { tyLeBkFromCounts } from "@/lib/domain/bao-cao-pct";

/**
 * Khối chuyên đề Vệ sinh tay (PO 2026-09-22) — map mã QT.07 ↔ catalog project.
 * Domain: WHO lưới = Module A; BM.02/03 = bảng kiểm GSC (không gộp form / %).
 * Không invent tiêu chí — chỉ map mã đã seed / inventory.
 */

export const VE_SINH_TAY_CHUYEN_DE = "VE_SINH_TAY" as const;

/** Mã họ WHO — không vào picker bảng kiểm GSC. */
export const VE_SINH_TAY_WHO_EXCLUDED_MA_BK = [
  "BM.07.01",
  "VST_WHO",
  "KSNK.QT.07.BM.01",
] as const;

export type VeSinhTayBkSlot = "BM02_KY_THUAT_TQ" | "BM03_NGOAI_KHOA";

export type VeSinhTayBkMap = {
  /** Mã viện (inventory file 12). */
  ma_qt: string;
  /** Mã trong `gstt_dm_bang_kiem` (canonical-36 / seed). */
  ma_bk: string;
  /** Alias chấp nhận khi resolve (uppercase). */
  aliases: readonly string[];
  slot: VeSinhTayBkSlot;
  label: string;
  chuyen_de: typeof VE_SINH_TAY_CHUYEN_DE;
  /** Deep-link form GSC tuân thủ. */
  formHref: string;
  /** TODO: seed lại nếu DB lệch tên / thiếu mã — không bịa tiêu chí. */
  seedNote?: string;
};

/** BM.02 / BM.03 → catalog hiện có (seed `BM.07.02` / `BM.07.03`). */
export const VE_SINH_TAY_BK_MAP: readonly VeSinhTayBkMap[] = [
  {
    ma_qt: "KSNK.QT.07.BM.02",
    ma_bk: "BM.07.02",
    aliases: ["BM.07.02", "KSNK.QT.07.BM.02", "QT.07.BM.02"],
    slot: "BM02_KY_THUAT_TQ",
    label: "Kỹ thuật VST thường quy",
    chuyen_de: VE_SINH_TAY_CHUYEN_DE,
    formHref: "/giam-sat-chung/tuan-thu?bk=BM.07.02",
  },
  {
    ma_qt: "KSNK.QT.07.BM.03",
    ma_bk: "BM.07.03",
    aliases: ["BM.07.03", "KSNK.QT.07.BM.03", "QT.07.BM.03"],
    slot: "BM03_NGOAI_KHOA",
    label: "VST ngoại khoa",
    chuyen_de: VE_SINH_TAY_CHUYEN_DE,
    formHref: "/giam-sat-chung/tuan-thu?bk=BM.07.03",
    seedNote: "Catalog project = BM.07.03 (PASS_FAIL) — khớp domain Module B",
  },
] as const;

export const VE_SINH_TAY_WHO = {
  ma_qt: "KSNK.QT.07.BM.01",
  label: "Quan sát 5 thời điểm (WHO)",
  formHref: "/giam-sat-vst",
  chuyen_de: VE_SINH_TAY_CHUYEN_DE,
} as const;

/** Mã BK thuộc khối Vệ sinh tay (engine GSC). */
export const VE_SINH_TAY_GSC_MA_BK: readonly string[] = VE_SINH_TAY_BK_MAP.map((m) => m.ma_bk);

export function normalizeBangKiemMa(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}

/** BM.01 / WHO — không chọn như BK thường trên form GSC. */
export function isWhoObservationBangKiem(maBk: string | null | undefined): boolean {
  const ma = normalizeBangKiemMa(maBk);
  if (!ma) return false;
  if ((VE_SINH_TAY_WHO_EXCLUDED_MA_BK as readonly string[]).includes(ma)) return true;
  return ma.endsWith("QT.07.BM.01") || ma === "BM.07.01";
}

export function filterOutWhoBangKiemRows<T extends { ma_bk?: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => !isWhoObservationBangKiem(r.ma_bk));
}

export function resolveVeSinhTayBkMap(maOrAlias: string | null | undefined): VeSinhTayBkMap | null {
  const ma = normalizeBangKiemMa(maOrAlias);
  if (!ma) return null;
  return (
    VE_SINH_TAY_BK_MAP.find((m) =>
      m.aliases.some((a) => normalizeBangKiemMa(a) === ma) || normalizeBangKiemMa(m.ma_bk) === ma,
    ) ?? null
  );
}

export function isVeSinhTayGscBangKiem(maBk: string | null | undefined): boolean {
  return resolveVeSinhTayBkMap(maBk) != null;
}

export type VeSinhTayChecklistRate = {
  ma_bk: string;
  label: string;
  slot: VeSinhTayBkSlot;
  ty_le_tuan_thu: number | null;
  ty_le_bm: number | null;
  ty_le_vst_ky_thuat: number | null;
  ty_le_vst_ngoai_khoa: number | null;
  n_dat: number;
  n_kd: number;
  n_ap_dung: number;
  tong_quan_sat: number;
  tong_dat: number;
  found: boolean;
};

type ChecklistRateRow = {
  ma_bk?: string | null;
  ty_le_tuan_thu?: number | null;
  tong_quan_sat?: number | null;
  tong_dat?: number | null;
  tong_vi_pham?: number | null;
};

/** Lấy % theo từng BK — không average giữa các khối. */
export function pickVeSinhTayChecklistRates(
  rows: readonly ChecklistRateRow[] | null | undefined,
): VeSinhTayChecklistRate[] {
  const list = rows ?? [];
  return VE_SINH_TAY_BK_MAP.map((m) => {
    const hit = list.find((r) => normalizeBangKiemMa(r.ma_bk) === normalizeBangKiemMa(m.ma_bk));
    const bk = hit
      ? tyLeBkFromCounts(hit.tong_dat ?? 0, hit.tong_quan_sat ?? 0, hit.tong_vi_pham)
      : null;
    const ty = bk?.ty_le_bm ?? null;
    return {
      ma_bk: m.ma_bk,
      label: m.label,
      slot: m.slot,
      ty_le_tuan_thu: ty,
      ty_le_bm: ty,
      ty_le_vst_ky_thuat: m.slot === "BM02_KY_THUAT_TQ" ? ty : null,
      ty_le_vst_ngoai_khoa: m.slot === "BM03_NGOAI_KHOA" ? ty : null,
      n_dat: bk?.n_dat ?? 0,
      n_kd: bk?.n_kd ?? 0,
      n_ap_dung: bk?.n_ap_dung ?? 0,
      tong_quan_sat: hit?.tong_quan_sat ?? 0,
      tong_dat: hit?.tong_dat ?? 0,
      found: Boolean(hit),
    };
  });
}
