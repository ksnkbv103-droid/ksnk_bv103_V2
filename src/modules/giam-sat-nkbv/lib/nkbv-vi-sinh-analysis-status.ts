/**
 * Hàng đợi XN vi sinh (+) chưa phân tích — neo phiếu + metadata disposition.
 */

export type ViSinhAnalysisStatus =
  | "CHUA_PHAN_TICH"
  | "DA_PHAN_TICH"
  | "BO_QUA"
  | "KHONG_DU_TC";

export type ViSinhAnalysisDisposition =
  | "BO_QUA"
  | "DA_PHAN_TICH"
  | "KHONG_DU_TC"
  | null;

export type ViSinhAnalysisDispositionRow = {
  /** Id XN (Index case hoặc chính bản ghi metadata). */
  index_vi_sinh_id?: string | null;
  analysis_disposition?: ViSinhAnalysisDisposition;
  is_active?: boolean | null;
  /** DOE/ngày Index sự kiện đủ TC đã annotate (tuỳ chọn). */
  belongs_event_doe?: string | null;
  belongs_event_label?: string | null;
};

/** UUID thô từ id chip LIS `lis:<uuid>`. */
export function bareViSinhIdFromMilestoneId(milestoneId: string): string | null {
  const s = String(milestoneId || "").trim();
  if (s.startsWith("lis:")) return s.slice(4) || null;
  if (/^[0-9a-f-]{36}$/i.test(s)) return s;
  return null;
}

function normViSinhId(raw: string): string {
  const s = String(raw || "").trim();
  if (s.startsWith("lis:")) return s.slice(4) || s;
  return s;
}

export function resolveViSinhAnalysisStatus(
  viSinhId: string,
  dispositions: ViSinhAnalysisDispositionRow[],
): ViSinhAnalysisStatus {
  const id = normViSinhId(viSinhId);
  if (!id) return "CHUA_PHAN_TICH";
  let sawAnalyzed = false;
  for (const row of dispositions) {
    if (!row || row.is_active === false) continue;
    if (normViSinhId(String(row.index_vi_sinh_id || "")) !== id) continue;
    if (row.analysis_disposition === "BO_QUA") return "BO_QUA";
    if (row.analysis_disposition === "KHONG_DU_TC") return "KHONG_DU_TC";
    // Case Index link (null disposition) hoặc metadata DA_PHAN_TICH
    if (
      row.analysis_disposition === "DA_PHAN_TICH" ||
      row.analysis_disposition == null
    ) {
      sawAnalyzed = true;
    }
  }
  return sawAnalyzed ? "DA_PHAN_TICH" : "CHUA_PHAN_TICH";
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
  if (status === "KHONG_DU_TC") return "Không đủ TC";
  return "Chưa PT";
}

export function statusBadgeClass(status: ViSinhAnalysisStatus): string {
  if (status === "DA_PHAN_TICH") return "bg-emerald-100 text-emerald-900";
  if (status === "BO_QUA") return "bg-slate-200 text-slate-700";
  if (status === "KHONG_DU_TC") return "bg-amber-100 text-amber-950";
  return "bg-amber-100 text-amber-950";
}

/** Nhãn kết luận cố định khi đóng Index không đủ tạo sự kiện (ngày = ngày xét nghiệm/Index). */
export function khongDuTcKetLuanLabel(indexDate: string): string {
  const d = String(indexDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return "Không phải sự kiện tại ngày xét nghiệm";
  }
  const [, m, day] = d.split("-");
  return `Không phải sự kiện tại ngày ${Number(day)}/${Number(m)}`;
}
