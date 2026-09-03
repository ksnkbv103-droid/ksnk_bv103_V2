import { eachMonthOfInterval, format, parseISO, startOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { formatNkbvLoaiDisplay } from "./nkbv-loai-labels";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

export type NkbvCasRowMinimal = {
  ngay_phat_hien?: string | null;
  loai_nkbv?: { ma_loai?: string | null; ten_loai?: string | null } | null;
  trang_thai_row?: { ma_trang_thai?: string | null; ten_trang_thai?: string | null } | null;
  khoa_ghi_nhan?: { ma_khoa?: string | null; ten_khoa?: string | null } | null;
};

/**
 * Một dòng kết quả `fn_nkbv_dich_te_hoc_rates`.
 * SIR/SUR/DUR là `null` khi không tính được (chưa cấu hình baseline CDC,
 * predicted < 1 theo SSOT §18.4, hoặc mẫu số bằng 0) — **không** phải 0.
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
    /** 0–100, làm tròn số nguyên; null khi mẫu số = 0 */
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

/** Trạng thái còn đang ghi / chờ xác nhận — dùng KPI và hàng đợi Tổng quan. */
export const NKBV_CHO_TAC_STATUS_MAS = ["DANG_GHI_NHAN", "CHO_XAC_NHAN", "CHO_XAC_MINH"] as const;

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
    const d = r.ngay_phat_hien;
    if (!d) return false;
    const t = parseISO(String(d).length > 10 ? String(d) : `${d}T12:00:00`);
    return t >= tuStart && t <= denEnd;
  });

  let da_xac_nhan = 0;
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
    const ma_loai = String(r.loai_nkbv?.ma_loai || "").trim();
    const ten_loai = formatNkbvLoaiDisplay(ma_loai, r.loai_nkbv?.ten_loai);
    const tn = parseISO(`${String(r.ngay_phat_hien).slice(0, 10)}T12:00:00`);

    const yk = format(tn, "yyyy-MM");
    monthCount[yk] = (monthCount[yk] ?? 0) + 1;

    if (ma_tt === "XAC_NHAN") da_xac_nhan += 1;
    else if (ma_tt === "LOAI_TRU") loai_tru += 1;
    else if (ma_tt === "DA_DONG") da_dong += 1;
    else if (CHO_TAC.has(ma_tt)) dang_va_cho_xn += 1;

    const lk = ma_loai || `_null_${ten_loai}`;
    const curLo = loaiMap.get(lk) ?? { ma: ma_loai || "—", ten: ten_loai, n: 0 };
    curLo.n += 1;
    loaiMap.set(lk, curLo);

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
  const pa_denominator = tong_phieu - loai_tru;
  const ti_le_xac_nhan_so_voi_pa =
    pa_denominator > 0 ? Math.round((da_xac_nhan / pa_denominator) * 100) : null;

  return {
    tu_ngay: tuNgayISO,
    den_ngay: denNgayISO,
    kpis: {
      tong_phieu,
      da_xac_nhan,
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
