/**
 * Báo cáo % tuân thủ — field khớp `docs/modules/giam-sat/13-BAO-CAO-PCT-SSOT.md`.
 * Công thức khóa: round(×100, 1). n_ap_dung = 0 → null / «—».
 * Không gộp WHO ↔ BK. Không đưa Chéo vào do_lech. Không dùng cách thức làm lens.
 */

import { classifyVstAction } from "@/modules/giam-sat-vst/lib/vst-action-classifier";
import { formatPercent1 } from "@/lib/analytics/supervision-percent";

/** «—» khi mẫu số = 0. */
export const PCT_EMPTY = "—" as const;

/** Top lỗi item: chỉ xếp khi đủ mẫu tiêu chí. */
export const MIN_N_ITEM = 5;

/**
 * Ngưỡng diễn giải §G / phụ lục đủ mẫu — cờ, không đổi tử/mẫu.
 * WHO: cơ hội. BK: tiêu chí áp dụng.
 */
export const MIN_N_PHIEN_WHO = 20;
export const MIN_N_PHIEN_BK = 30;

export type LensId = "tgs" | "ksnk" | "cheo";

function nonNeg(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** round(x, 1) với x đã là phần trăm. */
export function roundPct1(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.round(percent * 10) / 10;
}

export function formatPctOrDash(tyLe: number | null, nApDung: number): string {
  if (nApDung <= 0 || tyLe == null) return PCT_EMPTY;
  return formatPercent1(tyLe);
}

export function duMauWho(tongCoHoi: number): boolean {
  return tongCoHoi >= MIN_N_PHIEN_WHO;
}

export function duMauBk(nApDung: number): boolean {
  return nApDung >= MIN_N_PHIEN_BK;
}

export type TyLeVst = {
  so_tuan_thu: number;
  tong_co_hoi: number;
  ty_le_vst: number | null;
};

/** WHO BM.01 — tử so_tuan_thu, mẫu tong_co_hoi (ô trống / không quan sát đã loại). */
export function tyLeVst(soTuanThu: number, tongCoHoi: number): TyLeVst {
  const so_tuan_thu = nonNeg(soTuanThu);
  const tong_co_hoi = nonNeg(tongCoHoi);
  const ty_le_vst = tong_co_hoi > 0 ? roundPct1((so_tuan_thu / tong_co_hoi) * 100) : null;
  return { so_tuan_thu, tong_co_hoi, ty_le_vst };
}

/**
 * Đếm cơ hội WHO: bỏ ô trống và hành động không quan sát (không thuộc tuân thủ / bỏ sót).
 */
export function countWhoOpportunities(
  rows: readonly { hanh_dong?: string | null }[],
): { so_tuan_thu: number; tong_co_hoi: number } {
  let so_tuan_thu = 0;
  let tong_co_hoi = 0;
  for (const row of rows) {
    const c = classifyVstAction(row.hanh_dong);
    if (!c.isKnown) continue;
    tong_co_hoi += 1;
    if (c.isCompliant) so_tuan_thu += 1;
  }
  return { so_tuan_thu, tong_co_hoi };
}

export type TyLeBk = {
  n_dat: number;
  n_kd: number;
  n_ap_dung: number;
  /** ≡ ty_le_gsc ≡ ty_le_bm. NA không nằm trong tử hay mẫu. */
  ty_le_bk: number | null;
  ty_le_gsc: number | null;
  ty_le_bm: number | null;
};

/** BK: n_dat / (n_dat + n_kd). NA không truyền vào. */
export function tyLeBk(nDat: number, nKd: number): TyLeBk {
  const n_dat = nonNeg(nDat);
  const n_kd = nonNeg(nKd);
  const n_ap_dung = n_dat + n_kd;
  const ty = n_ap_dung > 0 ? roundPct1((n_dat / n_ap_dung) * 100) : null;
  return { n_dat, n_kd, n_ap_dung, ty_le_bk: ty, ty_le_gsc: ty, ty_le_bm: ty };
}

/**
 * Từ counts view (NA đã loại khỏi tong_quan_sat).
 * Có tong_vi_pham thì mẫu = n_dat + n_kd (KHONG_DAT), không cộng NA.
 */
export function tyLeBkFromCounts(
  tongDat: number,
  tongQuanSat: number,
  tongViPham?: number | null,
): TyLeBk {
  const n_dat = nonNeg(tongDat);
  const n_kd =
    tongViPham == null || !Number.isFinite(Number(tongViPham))
      ? Math.max(0, nonNeg(tongQuanSat) - n_dat)
      : nonNeg(Number(tongViPham));
  return tyLeBk(n_dat, n_kd);
}

export type TyLeVstKyThuat = TyLeBk & { ty_le_vst_ky_thuat: number | null };
export type TyLeVstNgoaiKhoa = TyLeBk & { ty_le_vst_ngoai_khoa: number | null };

/** BM.02 — cùng engine BK. */
export function tyLeVstKyThuat(nDat: number, nKd: number): TyLeVstKyThuat {
  const bk = tyLeBk(nDat, nKd);
  return { ...bk, ty_le_vst_ky_thuat: bk.ty_le_bk };
}

/** BM.03 — cùng engine BK. */
export function tyLeVstNgoaiKhoa(nDat: number, nKd: number): TyLeVstNgoaiKhoa {
  const bk = tyLeBk(nDat, nKd);
  return { ...bk, ty_le_vst_ngoai_khoa: bk.ty_le_bk };
}

/** do_lech = ty_le_tgs − ty_le_ksnk. Chỉ khi cả hai mẫu > 0. Chéo không vào. */
export function doLechLens(
  tyLeTgs: number | null,
  tyLeKsnk: number | null,
  mauSoTgs: number,
  mauSoKsnk: number,
): number | null {
  if (mauSoTgs <= 0 || mauSoKsnk <= 0 || tyLeTgs == null || tyLeKsnk == null) return null;
  return roundPct1(tyLeTgs - tyLeKsnk);
}

export function tyLeLoi(nLoi: number, nApDung: number): number | null {
  const n_loi = nonNeg(nLoi);
  const n_ap_dung = nonNeg(nApDung);
  if (n_ap_dung <= 0) return null;
  return roundPct1((n_loi / n_ap_dung) * 100);
}

export type TopLoiInput = {
  id: string;
  ten: string;
  ma_bk?: string;
  ten_bang_kiem?: string;
  n_loi: number;
  n_ap_dung: number;
  /** NA bị loại dù n_loi > 0. Bỏ trống = dòng vi phạm KHONG_DAT. */
  ket_qua?: "DAT" | "KHONG_DAT" | "NA" | null;
};

export type TopLoiRanked = TopLoiInput & { ty_le_loi: number };

/**
 * Top lỗi: chỉ KHONG_DAT (n_loi > 0), min-N n_ap_dung ≥ 5.
 * Rank n_loi ↓ rồi ty_le_loi ↓.
 */
export function rankTopLoi<T extends TopLoiInput>(
  items: readonly T[],
  minN: number = MIN_N_ITEM,
): (T & { ty_le_loi: number })[] {
  const ranked: (T & { ty_le_loi: number })[] = [];
  for (const item of items) {
    if (item.ket_qua === "NA" || item.ket_qua === "DAT") continue;
    if (item.n_loi <= 0) continue;
    if (item.n_ap_dung < minN) continue;
    const ty_le_loi = tyLeLoi(item.n_loi, item.n_ap_dung);
    if (ty_le_loi == null) continue;
    ranked.push({ ...item, ty_le_loi });
  }
  ranked.sort(
    (a, b) => b.n_loi - a.n_loi || b.ty_le_loi - a.ty_le_loi || a.ten.localeCompare(b.ten, "vi"),
  );
  return ranked;
}

/** Hình thức → lens. Cách thức không map được → null (không giả lens). */
export function classifyHinhThucLens(ten: string | null | undefined): LensId | null {
  const n = String(ten ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!n.trim()) return null;
  if (n.includes("cheo")) return "cheo";
  if (n.includes("chuyen trach") || n.includes("ksnk")) return "ksnk";
  if (n.includes("tu giam sat") || n === "tgs") return "tgs";
  return null;
}

export type HinhThucCountRow = {
  ten: string;
  tong_co_hoi?: number;
  da_tuan_thu?: number;
  tong_quan_sat?: number;
  tong_dat?: number;
  tong_vi_pham?: number | null;
};

export type LensRate = {
  lens: LensId;
  ty_le: number | null;
  n_ap_dung: number;
  display: string;
};

export type LensBundle = {
  tgs: LensRate;
  ksnk: LensRate;
  cheo: LensRate;
  do_lech: number | null;
};

/** Cộng counts theo lens rồi một %, không trung bình các %. */
export function aggregateLensRates(
  rows: readonly HinhThucCountRow[] | null | undefined,
  engine: "who" | "bk",
): LensBundle {
  const acc: Record<LensId, { num: number; denDat: number; denKd: number }> = {
    tgs: { num: 0, denDat: 0, denKd: 0 },
    ksnk: { num: 0, denDat: 0, denKd: 0 },
    cheo: { num: 0, denDat: 0, denKd: 0 },
  };
  for (const row of rows ?? []) {
    const lens = classifyHinhThucLens(row.ten);
    if (!lens) continue;
    if (engine === "who") {
      acc[lens].num += nonNeg(row.da_tuan_thu ?? 0);
      acc[lens].denDat += nonNeg(row.tong_co_hoi ?? 0);
    } else {
      const bk = tyLeBkFromCounts(row.tong_dat ?? 0, row.tong_quan_sat ?? 0, row.tong_vi_pham);
      acc[lens].num += bk.n_dat;
      acc[lens].denDat += bk.n_dat;
      acc[lens].denKd += bk.n_kd;
    }
  }

  const pack = (lens: LensId): LensRate => {
    const a = acc[lens];
    if (engine === "who") {
      const r = tyLeVst(a.num, a.denDat);
      return { lens, ty_le: r.ty_le_vst, n_ap_dung: r.tong_co_hoi, display: formatPctOrDash(r.ty_le_vst, r.tong_co_hoi) };
    }
    const r = tyLeBk(a.denDat, a.denKd);
    return { lens, ty_le: r.ty_le_bk, n_ap_dung: r.n_ap_dung, display: formatPctOrDash(r.ty_le_bk, r.n_ap_dung) };
  };

  const tgs = pack("tgs");
  const ksnk = pack("ksnk");
  const cheo = pack("cheo");
  return {
    tgs,
    ksnk,
    cheo,
    do_lech: doLechLens(tgs.ty_le, ksnk.ty_le, tgs.n_ap_dung, ksnk.n_ap_dung),
  };
}

export type VeSinhTayHub = {
  who: TyLeVst & { display: string; du_mau: boolean };
  ky_thuat: TyLeVstKyThuat & { display: string; du_mau: boolean };
  ngoai_khoa: TyLeVstNgoaiKhoa & { display: string; du_mau: boolean };
};

/** Ba KPI cạnh nhau. Không có field % gộp. */
export function buildVeSinhTayHub(input: {
  so_tuan_thu: number;
  tong_co_hoi: number;
  ky_thuat: { n_dat: number; n_kd: number } | null;
  ngoai_khoa: { n_dat: number; n_kd: number } | null;
}): VeSinhTayHub {
  const who = tyLeVst(input.so_tuan_thu, input.tong_co_hoi);
  const kt = input.ky_thuat
    ? tyLeVstKyThuat(input.ky_thuat.n_dat, input.ky_thuat.n_kd)
    : tyLeVstKyThuat(0, 0);
  const nk = input.ngoai_khoa
    ? tyLeVstNgoaiKhoa(input.ngoai_khoa.n_dat, input.ngoai_khoa.n_kd)
    : tyLeVstNgoaiKhoa(0, 0);
  return {
    who: { ...who, display: formatPctOrDash(who.ty_le_vst, who.tong_co_hoi), du_mau: duMauWho(who.tong_co_hoi) },
    ky_thuat: { ...kt, display: formatPctOrDash(kt.ty_le_vst_ky_thuat, kt.n_ap_dung), du_mau: duMauBk(kt.n_ap_dung) },
    ngoai_khoa: {
      ...nk,
      display: formatPctOrDash(nk.ty_le_vst_ngoai_khoa, nk.n_ap_dung),
      du_mau: duMauBk(nk.n_ap_dung),
    },
  };
}
