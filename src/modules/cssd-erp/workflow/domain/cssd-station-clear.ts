/**
 * Clear stamp cột trạm khi trả lui / domino rollback — tránh báo cáo/sản lượng
 * vẫn đếm bước đã hủy (thoi_gian_* / nguoi_* / cycle / BOM audit).
 */
import type { Station } from "../../types/cssd.types";
import { WORKFLOW_STEPS, stepIndex } from "./cssd-stations";

export const STATION_STAMP_COLS: Record<
  Station,
  { nguoiCol: string; thoiGianCol: string }
> = {
  TIEP_NHAN: { nguoiCol: "nguoi_tiep_nhan_id", thoiGianCol: "thoi_gian_tiep_nhan" },
  LAM_SACH: { nguoiCol: "nguoi_lam_sach_id", thoiGianCol: "thoi_gian_lam_sach" },
  QC: { nguoiCol: "nguoi_kiem_tra_id", thoiGianCol: "thoi_gian_qc" },
  DONG_GOI: { nguoiCol: "nguoi_dong_goi_id", thoiGianCol: "thoi_gian_dong_goi" },
  TIET_KHUAN: { nguoiCol: "nguoi_tiet_khuan_id", thoiGianCol: "thoi_gian_tiet_khuan" },
  CAP_PHAT: { nguoiCol: "nguoi_cap_phat_id", thoiGianCol: "thoi_gian_cap_phat" },
};

/** Extra audit fields gắn Đóng gói — clear khi DONG_GOI nằm trong tập hủy. */
export const DONG_GOI_EXTRA_CLEAR_COLS = [
  "ma_cycle_qr",
  "bom_kiem_dem_at",
  "bom_kiem_dem_boi_id",
] as const;

/**
 * Trạm cần clear khi lui về `keepStation` (giữ stamp) từ `throughStation` (trạm hiện tại).
 * Ví dụ reject QC←DONG_GOI: keep=QC, through=DONG_GOI → [DONG_GOI].
 * Domino về LAM_SACH từ CAP_PHAT → clear QC…CAP_PHAT không; clear sau LAM_SACH.
 */
export function stationsToClearAfter(
  keepStation: Station,
  throughStation: Station,
): Station[] {
  const keepIdx = stepIndex(keepStation);
  const throughIdx = stepIndex(throughStation);
  if (keepIdx < 0 || throughIdx < 0 || throughIdx <= keepIdx) return [];
  return WORKFLOW_STEPS.filter((_, i) => i > keepIdx && i <= throughIdx);
}

/** Cột SELECT đủ để snapshot before-clear. */
export function listStationStampSelectColumns(stations: readonly Station[]): string[] {
  const cols = new Set<string>();
  for (const s of stations) {
    const c = STATION_STAMP_COLS[s];
    if (!c) continue;
    cols.add(c.thoiGianCol);
    cols.add(c.nguoiCol);
  }
  if (stations.includes("DONG_GOI")) {
    for (const c of DONG_GOI_EXTRA_CLEAR_COLS) cols.add(c);
  }
  return [...cols];
}

export function collectStationStampSnapshot(
  row: Record<string, unknown> | null | undefined,
  stations: readonly Station[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!row || !stations.length) return out;
  for (const col of listStationStampSelectColumns(stations)) {
    const v = row[col];
    if (v !== undefined && v !== null && String(v).trim() !== "") out[col] = v;
  }
  return out;
}

/** Patch null hóa stamp các trạm hủy (+ cycle/BOM nếu đụng Đóng gói). */
export function buildClearStationsPatch(stations: readonly Station[]): Record<string, null> {
  const patch: Record<string, null> = {};
  for (const s of stations) {
    const c = STATION_STAMP_COLS[s];
    if (!c) continue;
    patch[c.thoiGianCol] = null;
    patch[c.nguoiCol] = null;
  }
  if (stations.includes("DONG_GOI")) {
    for (const c of DONG_GOI_EXTRA_CLEAR_COLS) patch[c] = null;
  }
  return patch;
}

export function buildClearAfterKeepPatch(
  keepStation: Station,
  throughStation: Station,
): { stations: Station[]; patch: Record<string, null> } {
  const stations = stationsToClearAfter(keepStation, throughStation);
  return { stations, patch: buildClearStationsPatch(stations) };
}
