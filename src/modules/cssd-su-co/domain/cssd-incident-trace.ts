import type { Station } from "@/modules/cssd-erp/types/cssd.types";

/** Map khâu phát sinh lỗi → cột người thực hiện trên fact quy trình. */
export const FAULT_STATION_OPERATOR_COLS: Record<
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

export function readFaultStationOperator(
  row: Record<string, unknown>,
  faultStation: Station,
): { operatorId: string | null; stationTime: string | null } {
  const cols = FAULT_STATION_OPERATOR_COLS[faultStation];
  if (!cols) return { operatorId: null, stationTime: null };
  const operatorId = String(row[cols.nguoiCol] || "").trim() || null;
  const stationTime = String(row[cols.thoiGianCol] || "").trim() || null;
  return { operatorId, stationTime };
}

export type CyclePerformer = {
  station: Station;
  operatorId: string;
  stationTime: string | null;
};

/** Người đã ghi nhận trên các khâu của chu kỳ (duy nhất theo operatorId, giữ khâu đầu tiên). */
export function listCyclePerformers(row: Record<string, unknown>): CyclePerformer[] {
  const seen = new Set<string>();
  const out: CyclePerformer[] = [];
  for (const station of Object.keys(FAULT_STATION_OPERATOR_COLS) as Station[]) {
    const { operatorId, stationTime } = readFaultStationOperator(row, station);
    if (!operatorId || seen.has(operatorId)) continue;
    seen.add(operatorId);
    out.push({ station, operatorId, stationTime });
  }
  return out;
}

/** Ảnh minh chứng bắt buộc theo loại sự cố dụng cụ. */
export function isInstrumentIncidentImageRequired(typeId: string): boolean {
  return (
    typeId === "INSTRUMENT_BROKEN" ||
    typeId === "INSTRUMENT_REPLENISH" ||
    typeId === "INSTRUMENT_RETURN"
  );
}

export const CHEMICAL_QUALITY_INCIDENT = {
  typeId: "CHEMICAL_QUALITY",
  typeTen: "Sự cố chất lượng hóa chất/vật tư",
} as const;

export const OTHER_GENERIC_INCIDENT = {
  typeId: "OTHER_CUSTOM",
  typeTen: "Sự cố khác",
} as const;
