/**
 * Hàng đợi XN vi sinh (+) chưa phân tích — neo phiếu qua verification_data.index_vi_sinh_id.
 */

export type ViSinhAnalysisStatus = "CHUA_PHAN_TICH" | "DA_PHAN_TICH" | "BO_QUA";

export type ViSinhAnalysisDispositionRow = {
  index_vi_sinh_id?: string | null;
  analysis_disposition?: "BO_QUA" | null;
  is_active?: boolean | null;
};

/** UUID thô từ id chip LIS `lis:<uuid>`. */
export function bareViSinhIdFromMilestoneId(milestoneId: string): string | null {
  const s = String(milestoneId || "").trim();
  if (s.startsWith("lis:")) return s.slice(4) || null;
  if (/^[0-9a-f-]{36}$/i.test(s)) return s;
  return null;
}

export function resolveViSinhAnalysisStatus(
  viSinhId: string,
  dispositions: ViSinhAnalysisDispositionRow[],
): ViSinhAnalysisStatus {
  const id = String(viSinhId || "").trim();
  if (!id) return "CHUA_PHAN_TICH";
  for (const row of dispositions) {
    if (!row || row.is_active === false) continue;
    if (String(row.index_vi_sinh_id || "").trim() !== id) continue;
    if (row.analysis_disposition === "BO_QUA") return "BO_QUA";
    return "DA_PHAN_TICH";
  }
  return "CHUA_PHAN_TICH";
}

export function countChuaPhanTich(
  positiveViSinhIds: string[],
  dispositions: ViSinhAnalysisDispositionRow[],
): number {
  let n = 0;
  for (const id of positiveViSinhIds) {
    if (resolveViSinhAnalysisStatus(id, dispositions) === "CHUA_PHAN_TICH") n += 1;
  }
  return n;
}

export function statusBadgeLabel(status: ViSinhAnalysisStatus): string {
  if (status === "DA_PHAN_TICH") return "Đã PT";
  if (status === "BO_QUA") return "Bỏ qua";
  return "Chưa PT";
}
