import { eachMonthOfInterval, format, parseISO, startOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import {
  loaiCodeFromClassification,
} from "./nkbv-classification-taxonomy";
import { formatNkbvLoaiDisplay } from "./nkbv-loai-labels";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

export type NkbvCasRowMinimal = {
  ngay_phat_hien?: string | null;
  /** DOE báo cáo (cột doe hoặc calculated_doe) — kỳ theo DOE; fallback Index. */
  report_date?: string | null;
  loai_nkbv?: { ma_loai?: string | null; ten_loai?: string | null } | null;
  trang_thai_row?: { ma_trang_thai?: string | null; ten_trang_thai?: string | null } | null;
  khoa_ghi_nhan?: { ma_khoa?: string | null; ten_khoa?: string | null } | null;
  /** verification_data.classification — nguồn by_loai khi đã xác nhận NKBV. */
  classification?: string | null;
  /** verification_data.is_positive — KPI «Đã xác nhận NKBV» = XAC_NHAN ∧ true. */
  is_positive?: boolean | null;
};

/** Ngày kỳ báo cáo phiếu: report_date → DOE → Index. */
export function nkbvReportDate(row: NkbvCasRowMinimal): string | null {
  const d = row.report_date || row.ngay_phat_hien;
  return d ? String(d).slice(0, 10) : null;
}

/**
 * Một dòng kết quả `fn_nkbv_dich_te_hoc_rates`.
 * DUR và các trường tỷ suất RPC: mẫu số bằng 0 → hiển thị «—» (không phải 0).
 * Trường SIR/SUR từ RPC không dùng trên dashboard pilot.
 */
export type NkbvEpidemiologyRate = {
  khoa_id: string;
  ma_khoa: string | null;
  ten_khoa: string | null;
  obs_vap_cases: number;
  obs_vae_cases: number;
  obs_clabsi_cases: number;
  obs_mbi_lcbi_cases: number;
  obs_cauti_cases: number;
  obs_ssi_cases: number;
  obs_vent_days: number;
  obs_cvc_days: number;
  obs_foley_days: number;
  obs_patient_days: number;
  obs_emv_episodes: number;
  obs_total_surgeries: number;
  clabsi_rate_per_1000: number | null;
  mbi_lcbi_rate_per_1000: number | null;
  cvc_dur: number | null;
  clabsi_sir: number | null;
  cvc_sur: number | null;
  vap_rate_per_1000: number | null;
  vae_rate_per_1000: number | null;
  vae_rate_per_100_emv: number | null;
  vent_dur: number | null;
  vae_sir: number | null;
  vent_sur: number | null;
  cauti_rate_per_1000: number | null;
  foley_dur: number | null;
  cauti_sir: number | null;
  foley_sur: number | null;
  ssi_raw_rate: number | null;
  ssi_sir: number | null;
};

export type NkbvDashboardPayload = {
  tu_ngay: string;
  den_ngay: string;
  kpis: {
    tong_phieu: number;
    da_xac_nhan: number;
    dang_va_cho_xn: number;
    loai_tru: number;
    da_dong: number;
    /** Phiếu trạng thái XAC_NHAN (mọi kết cục) — mẫu số kết luận cùng loại trừ. */
    phieu_xac_nhan_trang_thai: number;
    /** 0–100, làm tròn 1 chữ số; null khi mẫu số = 0 */
    ti_le_xac_nhan_so_voi_pa: number | null;
  };
  monthly: { ky: string; label: string; so_phieu: number }[];
  by_loai: { ma: string; ten: string; so_phieu: number }[];
  by_trang_thai: { ma: string; ten: string; so_phieu: number }[];
  top_khoa: { ten_khoa: string; so_phieu: number }[];
  epidemiologyRates?: NkbvEpidemiologyRate[];
  /** Có giá trị khi RPC tỷ suất lỗi — UI phải báo, không được hiển thị bảng rỗng. */
  epidemiologyError?: string | null;
};

/**
 * Phiếu chưa chốt — KPI «Đang ghi / Chờ XN» và hàng đợi Tổng quan.
 * CHO_DUYET = khoa đã gửi form, KSNK chưa duyệt (domain §4.1).
 */
export const NKBV_CHO_TAC_STATUS_MAS = [
  "DANG_GHI_NHAN",
  "CHO_XAC_MINH",
  "CHO_XAC_NHAN",
  "CHO_DUYET",
] as const;

const CHO_TAC = new Set<string>(NKBV_CHO_TAC_STATUS_MAS);

/** Lọc theo tu/den (**yyyy-MM-dd**), tổng hợp dashboard. */
export function aggregateNkbvDashboard(
  rows: NkbvCasRowMinimal[],
  tuNgayISO: string,
  denNgayISO: string,
): NkbvDashboardPayload {
  const tuStart = parseISO(`${tuNgayISO}T00:00:00`);
  const denEnd = parseISO(`${denNgayISO}T23:59:59`);

  const inRange = rows.filter((r) => {
    const d = nkbvReportDate(r);
    if (!d) return false;
    const t = parseISO(`${d}T12:00:00`);
    return t >= tuStart && t <= denEnd;
  });

  let da_xac_nhan = 0;
  let phieu_xac_nhan_trang_thai = 0;
  let loai_tru = 0;
  let da_dong = 0;
  let dang_va_cho_xn = 0;

  const monthCount: Record<string, number> = {};
  const loaiMap = new Map<string, { ma: string; ten: string; n: number }>();
  const ttMap = new Map<string, { ma: string; ten: string; n: number }>();
  const khoaCount = new Map<string, number>();

  for (const r of inRange) {
    const ma_tt = String(r.trang_thai_row?.ma_trang_thai || "").trim();
    const ten_tt = String(r.trang_thai_row?.ten_trang_thai || "").trim() || ma_tt;
    const portalLoai = String(r.loai_nkbv?.ma_loai || "").trim();
    const reportDay = nkbvReportDate(r) || String(r.ngay_phat_hien).slice(0, 10);
    const tn = parseISO(`${reportDay}T12:00:00`);

    const yk = format(tn, "yyyy-MM");
    monthCount[yk] = (monthCount[yk] ?? 0) + 1;

    const confirmedNkbv = ma_tt === "XAC_NHAN" && r.is_positive === true;
    if (confirmedNkbv) da_xac_nhan += 1;
    if (ma_tt === "XAC_NHAN") phieu_xac_nhan_trang_thai += 1;
    else if (ma_tt === "LOAI_TRU") loai_tru += 1;
    else if (ma_tt === "DA_DONG") da_dong += 1;
    else if (CHO_TAC.has(ma_tt)) dang_va_cho_xn += 1;

    // by_loai: chỉ ca XAC_NHAN ∧ is_positive, nhóm theo classification
    if (confirmedNkbv) {
      const ma_loai = loaiCodeFromClassification(r.classification, portalLoai);
      const ten_loai = formatNkbvLoaiDisplay(ma_loai, r.loai_nkbv?.ten_loai);
      const lk = ma_loai || `_null_${ten_loai}`;
      const curLo = loaiMap.get(lk) ?? { ma: ma_loai || "—", ten: ten_loai, n: 0 };
      curLo.n += 1;
      loaiMap.set(lk, curLo);
    }

    const tk = ma_tt || "_NONE";
    const curT = ttMap.get(tk) ?? { ma: ma_tt || "—", ten: ten_tt, n: 0 };
    curT.n += 1;
    ttMap.set(tk, curT);

    const kten = formatKhoaCompactLabel({
      ma_khoa: r.khoa_ghi_nhan?.ma_khoa,
      ten_khoa: r.khoa_ghi_nhan?.ten_khoa,
    });
    const khoaKey = kten === "—" ? "Không xác định khoa" : kten;
    khoaCount.set(khoaKey, (khoaCount.get(khoaKey) ?? 0) + 1);
  }

  const monthsSeq = eachMonthOfInterval({
    start: startOfMonth(tuStart),
    end: startOfMonth(denEnd),
  });
  const monthly = monthsSeq.map((m) => {
    const ky = format(m, "yyyy-MM");
    return {
      ky,
      label: format(m, "MM/yyyy", { locale: vi }),
      so_phieu: monthCount[ky] ?? 0,
    };
  });

  const by_loai = [...loaiMap.values()]
    .map((x) => ({ ma: x.ma, ten: x.ten, so_phieu: x.n }))
    .sort((a, b) => b.so_phieu - a.so_phieu);

  const by_trang_thai = [...ttMap.values()]
    .map((x) => ({ ma: x.ma, ten: x.ten, so_phieu: x.n }))
    .sort((a, b) => b.so_phieu - a.so_phieu);

  const top_khoa = [...khoaCount.entries()]
    .map(([ten_khoa, so_phieu]) => ({ ten_khoa, so_phieu }))
    .sort((a, b) => b.so_phieu - a.so_phieu)
    .slice(0, 12);

  const tong_phieu = inRange.length;
  const ket_luan_mau_so = phieu_xac_nhan_trang_thai + loai_tru;
  const ti_le_xac_nhan_so_voi_pa =
    ket_luan_mau_so > 0
      ? Math.round((da_xac_nhan / ket_luan_mau_so) * 1000) / 10
      : null;

  return {
    tu_ngay: tuNgayISO,
    den_ngay: denNgayISO,
    kpis: {
      tong_phieu,
      da_xac_nhan,
      phieu_xac_nhan_trang_thai,
      dang_va_cho_xn,
      loai_tru,
      da_dong,
      ti_le_xac_nhan_so_voi_pa,
    },
    monthly,
    by_loai,
    by_trang_thai,
    top_khoa,
  };
}

/** Mẫu số tỷ lệ xác nhận = phiếu XAC_NHAN + LOAI_TRU (đã kết luận). */
export function nkbvPaMauSo(kpis: {
  phieu_xac_nhan_trang_thai: number;
  loai_tru: number;
}): number {
  return Math.max(kpis.phieu_xac_nhan_trang_thai + kpis.loai_tru, 0);
}

/** Nhãn khối lượng BCTH/in — khớp metric-dictionary. */
export function formatNkbvXacNhanVolume(kpis: {
  da_xac_nhan: number;
  phieu_xac_nhan_trang_thai: number;
  loai_tru: number;
}): string {
  const mau = nkbvPaMauSo(kpis);
  return `${kpis.da_xac_nhan.toLocaleString()}/${mau.toLocaleString()} đã kết luận`;
}
