/**
 * CSSD analytics thuần — SSOT công thức: docs/modules/dashboard/metric-dictionary.md
 * Không gộp vào ty_le_ccs.
 */

import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

export const CSSD_ANALYTICS_STATIONS = [
  "TIEP_NHAN",
  "LAM_SACH",
  "QC",
  "DONG_GOI",
  "TIET_KHUAN",
  "CAP_PHAT",
] as const;

export type CssdAnalyticsStation = (typeof CSSD_ANALYTICS_STATIONS)[number];

export type CssdVolumeBucket = "day" | "month" | "year";

const STATION_TIME_FIELD: Record<CssdAnalyticsStation, string> = {
  TIEP_NHAN: "thoi_gian_tiep_nhan",
  LAM_SACH: "thoi_gian_lam_sach",
  QC: "thoi_gian_qc",
  DONG_GOI: "thoi_gian_dong_goi",
  TIET_KHUAN: "thoi_gian_tiet_khuan",
  CAP_PHAT: "thoi_gian_cap_phat",
};

const STATION_OPERATOR_FIELD: Record<CssdAnalyticsStation, string> = {
  TIEP_NHAN: "nguoi_tiep_nhan_id",
  LAM_SACH: "nguoi_lam_sach_id",
  QC: "nguoi_kiem_tra_id",
  DONG_GOI: "nguoi_dong_goi_id",
  TIET_KHUAN: "nguoi_tiet_khuan_id",
  CAP_PHAT: "nguoi_cap_phat_id",
};

export type CssdQuyTrinhAnalyticsRow = Record<string, unknown> & {
  id?: string;
  bo_dung_cu_id?: string | null;
  ma_bo?: string | null;
  ten_bo?: string | null;
  ten_khoa?: string | null;
  /** Khoa sở hữu danh mục bộ (join). */
  khoa_su_dung_id?: string | null;
  /** Khoa nhận lúc cấp phát (SSOT destination). */
  khoa_nhan_id?: string | null;
  ten_khoa_nhan?: string | null;
  suds_count?: number | null;
  created_at?: string | null;
  thoi_gian_cap_phat?: string | null;
};

export type CssdCapPhatByKhoaNhanRow = {
  khoa_key: string;
  ten_khoa: string;
  so_cap_phat: number;
};

export type CssdStationVolumeRow = {
  station: CssdAnalyticsStation;
  label: string;
  completed: number;
};

export type CssdVolumeTrendPoint = {
  bucket: string;
  station: CssdAnalyticsStation;
  count: number;
};

export type CssdBoByKhoaRow = {
  khoa_key: string;
  ten_khoa: string;
  so_bo: number;
};

export type CssdReuseRow = {
  bo_dung_cu_id: string;
  ma_bo: string;
  ten_bo: string;
  ten_khoa: string;
  suds_hien_tai: number;
  chu_trinh_ky: number;
};

export type CssdStaffScanRow = {
  nguoi_id: string;
  station: CssdAnalyticsStation;
  so_quet: number;
};

export type CssdMeQcSummary = {
  so_me_ky: number;
  so_me_da_qc: number;
  so_me_dat: number;
  ty_le_qc_dat_me: number | null;
};

export type CssdMayUsageRow = {
  thiet_bi_id: string;
  ten_thiet_bi: string;
  so_lan_dung: number;
};

function parseIsoDatePart(raw: unknown): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

function inInclusiveDateRange(isoDay: string, from: string, to: string): boolean {
  return isoDay >= from && isoDay <= to;
}

export function stationTimeBucketKey(isoTs: string, bucket: CssdVolumeBucket): string | null {
  const day = parseIsoDatePart(isoTs);
  if (!day) return null;
  if (bucket === "day") return day;
  if (bucket === "month") return day.slice(0, 7);
  return day.slice(0, 4);
}

export function stationLabel(station: CssdAnalyticsStation): string {
  return station.replace(/_/g, " ");
}

/** Sản lượng hoàn thành theo trạm trong kỳ (theo timestamp trạm). */
export function computeStationVolume(
  rows: CssdQuyTrinhAnalyticsRow[],
  from: string,
  to: string,
): CssdStationVolumeRow[] {
  return CSSD_ANALYTICS_STATIONS.map((station) => {
    const field = STATION_TIME_FIELD[station];
    let completed = 0;
    for (const row of rows) {
      const day = parseIsoDatePart(row[field]);
      if (day && inInclusiveDateRange(day, from, to)) completed += 1;
    }
    return { station, label: stationLabel(station), completed };
  });
}

/** Xu hướng sản lượng theo bucket × trạm. */
export function computeStationVolumeTrend(
  rows: CssdQuyTrinhAnalyticsRow[],
  from: string,
  to: string,
  bucket: CssdVolumeBucket,
  stationFilter: CssdAnalyticsStation | "ALL" = "ALL",
): CssdVolumeTrendPoint[] {
  const map = new Map<string, number>();
  const stations =
    stationFilter === "ALL" ? CSSD_ANALYTICS_STATIONS : ([stationFilter] as CssdAnalyticsStation[]);

  for (const station of stations) {
    const field = STATION_TIME_FIELD[station];
    for (const row of rows) {
      const ts = String(row[field] || "").trim();
      const day = parseIsoDatePart(ts);
      if (!day || !inInclusiveDateRange(day, from, to)) continue;
      const key = stationTimeBucketKey(ts, bucket);
      if (!key) continue;
      const compound = `${key}::${station}`;
      map.set(compound, (map.get(compound) || 0) + 1);
    }
  }

  return Array.from(map.entries())
    .map(([compound, count]) => {
      const [b, station] = compound.split("::") as [string, CssdAnalyticsStation];
      return { bucket: b, station, count };
    })
    .sort((a, b) => a.bucket.localeCompare(b.bucket) || a.station.localeCompare(b.station));
}

/** Pivot trend → rows for bar chart (một cột tổng tất cả trạm hoặc 1 trạm). */
export function pivotVolumeTrendTotals(points: CssdVolumeTrendPoint[]): { bucket: string; total: number }[] {
  const map = new Map<string, number>();
  for (const p of points) {
    map.set(p.bucket, (map.get(p.bucket) || 0) + p.count);
  }
  return Array.from(map.entries())
    .map(([bucket, total]) => ({ bucket, total }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export function computeBoByKhoa(
  sets: {
    id: string;
    ten_khoa?: string | null;
    ma_khoa?: string | null;
    khoa_su_dung_id?: string | null;
    is_active?: boolean | null;
  }[],
): CssdBoByKhoaRow[] {
  const map = new Map<string, CssdBoByKhoaRow>();
  for (const s of sets) {
    if (s.is_active === false) continue;
    const compact = formatKhoaCompactLabel({ ma_khoa: s.ma_khoa, ten_khoa: s.ten_khoa });
    const ten = compact !== "—" ? compact : "Dùng chung";
    const key = String(s.khoa_su_dung_id || "").trim() || "__CHUNG__";
    const cur = map.get(key) || { khoa_key: key, ten_khoa: ten, so_bo: 0 };
    cur.so_bo += 1;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.so_bo - a.so_bo || a.ten_khoa.localeCompare(b.ten_khoa));
}

/**
 * Snapshot số bộ theo khoa sở hữu danh mục (`khoa_su_dung_id`).
 * Tách khỏi cấp phát theo `khoa_nhan_id`.
 */
export function describeCssdKhoaOwnershipProxy(
  boByKhoa: CssdBoByKhoaRow[],
  limit = 3,
): {
  mode: "ownership_catalog";
  disclaimer: string;
  top: { ten_khoa: string; so_bo: number }[];
  summary: string;
} {
  const top = boByKhoa.slice(0, limit).map((r) => ({ ten_khoa: r.ten_khoa, so_bo: r.so_bo }));
  const disclaimer =
    "Số bộ theo khoa sở hữu danh mục — khác với «cấp phát theo khoa nhận» (khoa_nhan_id).";
  const summary =
    top.length === 0
      ? "Chưa có bộ active theo khoa sở hữu danh mục."
      : `Top khoa sở hữu bộ: ${top.map((t) => `${t.ten_khoa} (${t.so_bo})`).join("; ")}.`;
  return { mode: "ownership_catalog", disclaimer, top, summary };
}

/** Đếm lượt cấp phát trong kỳ theo khoa nhận (`khoa_nhan_id` / ten_khoa_nhan). */
export function computeCapPhatByKhoaNhan(
  rows: CssdQuyTrinhAnalyticsRow[],
  from: string,
  to: string,
): CssdCapPhatByKhoaNhanRow[] {
  const map = new Map<string, CssdCapPhatByKhoaNhanRow>();
  for (const row of rows) {
    const day = parseIsoDatePart(row.thoi_gian_cap_phat);
    if (!day || !inInclusiveDateRange(day, from, to)) continue;
    const kid = String(row.khoa_nhan_id || "").trim();
    const compact = formatKhoaCompactLabel({
      ten_khoa: row.ten_khoa_nhan,
    });
    const ten =
      (compact !== "—" ? compact : "") ||
      (kid ? "Khoa nhận" : "Chưa ghi khoa nhận");
    const key = kid || "__CHUA_GHI__";
    const cur = map.get(key) || { khoa_key: key, ten_khoa: ten, so_cap_phat: 0 };
    cur.so_cap_phat += 1;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.so_cap_phat - a.so_cap_phat || a.ten_khoa.localeCompare(b.ten_khoa),
  );
}

export function describeCssdCapPhatByKhoaNhan(
  rows: CssdCapPhatByKhoaNhanRow[],
  limit = 3,
): {
  mode: "destination_cap_phat";
  disclaimer: string;
  top: { ten_khoa: string; so_cap_phat: number }[];
  summary: string;
} {
  const withDest = rows.filter((r) => r.khoa_key !== "__CHUA_GHI__");
  const top = withDest.slice(0, limit).map((r) => ({
    ten_khoa: r.ten_khoa,
    so_cap_phat: r.so_cap_phat,
  }));
  const chuaGhi = rows.find((r) => r.khoa_key === "__CHUA_GHI__")?.so_cap_phat ?? 0;
  const disclaimer =
    "Cấp phát theo khoa nhận lúc xuất (`khoa_nhan_id`) — SSOT destination; khác khoa sở hữu danh mục bộ.";
  let summary =
    top.length === 0
      ? "Chưa có lượt cấp phát có khoa nhận trong kỳ."
      : `Top khoa nhận cấp phát: ${top.map((t) => `${t.ten_khoa} (${t.so_cap_phat})`).join("; ")}.`;
  if (chuaGhi > 0) {
    summary += ` · ${chuaGhi} lượt chưa ghi khoa nhận.`;
  }
  return { mode: "destination_cap_phat", disclaimer, top, summary };
}

/**
 * Tái sử dụng / tần suất: chu trình trong kỳ theo bộ + suds_count cao nhất thấy trong mẫu.
 * Giả định rows đã lọc kỳ (hoặc truyền from/to để lọc theo tiếp nhận/created).
 */
export function computeReuseFrequency(
  rows: CssdQuyTrinhAnalyticsRow[],
  from: string,
  to: string,
  limit = 50,
): CssdReuseRow[] {
  const map = new Map<string, CssdReuseRow>();

  for (const row of rows) {
    const boId = String(row.bo_dung_cu_id || "").trim();
    if (!boId) continue;
    const day =
      parseIsoDatePart(row.thoi_gian_tiep_nhan) || parseIsoDatePart(row.created_at);
    if (!day || !inInclusiveDateRange(day, from, to)) continue;

    const cur =
      map.get(boId) ||
      ({
        bo_dung_cu_id: boId,
        ma_bo: String(row.ma_bo || "—"),
        ten_bo: String(row.ten_bo || "—"),
        ten_khoa: (() => {
          const compact = formatKhoaCompactLabel({ ten_khoa: row.ten_khoa });
          return compact !== "—" ? compact : "Dùng chung";
        })(),
        suds_hien_tai: 0,
        chu_trinh_ky: 0,
      } satisfies CssdReuseRow);

    cur.chu_trinh_ky += 1;
    const suds = Number(row.suds_count ?? 0);
    if (Number.isFinite(suds) && suds > cur.suds_hien_tai) cur.suds_hien_tai = suds;
    if (row.ma_bo) cur.ma_bo = String(row.ma_bo);
    if (row.ten_bo) cur.ten_bo = String(row.ten_bo);
    if (row.ten_khoa) {
      const compact = formatKhoaCompactLabel({ ten_khoa: row.ten_khoa });
      if (compact !== "—") cur.ten_khoa = compact;
    }
    map.set(boId, cur);
  }

  return Array.from(map.values())
    .sort((a, b) => b.suds_hien_tai - a.suds_hien_tai || b.chu_trinh_ky - a.chu_trinh_ky)
    .slice(0, limit);
}

export function computeStaffScans(
  rows: CssdQuyTrinhAnalyticsRow[],
  from: string,
  to: string,
): CssdStaffScanRow[] {
  const map = new Map<string, CssdStaffScanRow>();

  for (const station of CSSD_ANALYTICS_STATIONS) {
    const timeField = STATION_TIME_FIELD[station];
    const opField = STATION_OPERATOR_FIELD[station];
    for (const row of rows) {
      const day = parseIsoDatePart(row[timeField]);
      if (!day || !inInclusiveDateRange(day, from, to)) continue;
      const nguoiId = String(row[opField] || "").trim();
      if (!nguoiId) continue;
      const key = `${nguoiId}::${station}`;
      const cur = map.get(key) || { nguoi_id: nguoiId, station, so_quet: 0 };
      cur.so_quet += 1;
      map.set(key, cur);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.so_quet - a.so_quet);
}

export function computeMeQcSummary(
  mes: { ket_qua_test?: boolean | null }[],
): CssdMeQcSummary {
  const so_me_ky = mes.length;
  let so_me_da_qc = 0;
  let so_me_dat = 0;
  for (const m of mes) {
    if (m.ket_qua_test === true || m.ket_qua_test === false) {
      so_me_da_qc += 1;
      if (m.ket_qua_test === true) so_me_dat += 1;
    }
  }
  const ty_le_qc_dat_me =
    so_me_da_qc > 0 ? Math.round((so_me_dat / so_me_da_qc) * 1000) / 10 : null;
  return { so_me_ky, so_me_da_qc, so_me_dat, ty_le_qc_dat_me };
}

export function computeMayUsage(
  mes: { thiet_bi_id?: string | null; ten_thiet_bi?: string | null }[],
): CssdMayUsageRow[] {
  const map = new Map<string, CssdMayUsageRow>();
  for (const m of mes) {
    const id = String(m.thiet_bi_id || "").trim();
    if (!id) continue;
    const cur =
      map.get(id) ||
      ({
        thiet_bi_id: id,
        ten_thiet_bi: String(m.ten_thiet_bi || "—").trim() || "—",
        so_lan_dung: 0,
      } satisfies CssdMayUsageRow);
    cur.so_lan_dung += 1;
    if (m.ten_thiet_bi) cur.ten_thiet_bi = String(m.ten_thiet_bi).trim() || cur.ten_thiet_bi;
    map.set(id, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.so_lan_dung - a.so_lan_dung);
}

/** Tóm tắt mỏng cho Command Center / BCTH phụ lục. */
export function summarizeCssdAnalyticsBrief(args: {
  stationVolume: CssdStationVolumeRow[];
  tyLeQuyTrinhKhongSuCo: number | null;
  soBo: number;
  meQc: CssdMeQcSummary;
  mayReady: number;
  mayRepairing: number;
  redAlertTotal: number;
  frozenTotal: number;
}): {
  tong_hoan_thanh_tram: number;
  san_luong_cap_phat: number;
  ty_le_quy_trinh_khong_su_co: number | null;
  so_bo_danh_muc: number;
  so_me_ky: number;
  ty_le_qc_dat_me: number | null;
  may_ready: number;
  may_repairing: number;
  red_alert_total: number;
  frozen_total: number;
} {
  const tong = args.stationVolume.reduce((s, r) => s + r.completed, 0);
  const cap = args.stationVolume.find((r) => r.station === "CAP_PHAT")?.completed ?? 0;
  return {
    tong_hoan_thanh_tram: tong,
    san_luong_cap_phat: cap,
    ty_le_quy_trinh_khong_su_co: args.tyLeQuyTrinhKhongSuCo,
    so_bo_danh_muc: args.soBo,
    so_me_ky: args.meQc.so_me_ky,
    ty_le_qc_dat_me: args.meQc.ty_le_qc_dat_me,
    may_ready: args.mayReady,
    may_repairing: args.mayRepairing,
    red_alert_total: args.redAlertTotal,
    frozen_total: args.frozenTotal,
  };
}

export function roundIncidentFreeRate(quyTrinhCount: number, suCoCount: number): number | null {
  if (quyTrinhCount <= 0) return quyTrinhCount === 0 && suCoCount === 0 ? 100 : null;
  return Math.round((100 - (suCoCount / quyTrinhCount) * 100) * 10) / 10;
}
