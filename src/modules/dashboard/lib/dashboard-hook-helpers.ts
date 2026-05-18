import type { ComplianceDashboardPayload, DashboardSummaryRow } from "../compliance-dashboard.types";
import type { SupervisionTabFilter } from "./fetch-dashboard-payloads-for-type";

function summaryRowMatchesBangKiemOption(row: DashboardSummaryRow, optionId: string): boolean {
  const mb = String(row.ma_bk ?? "").trim();
  if (!mb) return false;
  if (optionId === "VST_WHO") return mb === "VST_WHO";
  if (optionId === mb) return true;
  if (optionId.startsWith("BK_ID:")) {
    const uuid = optionId.slice(6).trim();
    return mb === uuid;
  }
  return false;
}

export function gscPayloadHasSessions(p: ComplianceDashboardPayload | null | undefined): boolean {
  return (p?.summary?.tong_phien ?? 0) > 0;
}

/** Lấy payload GSC theo khóa UI (ma_bk hoặc `BK_ID:uuid`). */
export function resolveCompliancePayloadForKey(
  bk: string,
  payloads: Record<string, ComplianceDashboardPayload>,
): ComplianceDashboardPayload | undefined {
  if (payloads[bk]) return payloads[bk];
  if (bk.startsWith("BK_ID:")) {
    const uuid = bk.slice(6).trim();
    for (const [k, v] of Object.entries(payloads)) {
      if (k === uuid || k.endsWith(uuid)) return v;
    }
  }
  return undefined;
}

/**
 * Khóa bảng kiểm GSC cần render — giao với `selectedBangKiemMas`, chỉ giữ bảng có phiên khi `onlyWithSessions`.
 */
export function listGscBangKiemKeysToRender(
  selectedBangKiemMas: string[],
  compliancePayloads: Record<string, ComplianceDashboardPayload>,
  onlyWithSessions: boolean,
): string[] {
  const keys = selectedBangKiemMas.filter((bk) => bk !== "VST_WHO");
  if (!onlyWithSessions) return keys;
  return keys.filter((bk) => gscPayloadHasSessions(resolveCompliancePayloadForKey(bk, compliancePayloads)));
}

/** Thu hẹp khoa đã chọn khi đổi khối — tránh gửi RPC khoa ngoài khối (lọc “không ăn”). */
export function pruneKhoaIdsForKhoiSelection(
  selectedKhoaIds: string[],
  selectedKhoiIds: string[],
  khoaOptions: { id: string; khoi_id?: string }[],
  khoiOptionCount: number,
): string[] {
  if (khoiOptionCount === 0 || khoaOptions.length === 0) return selectedKhoaIds;
  const allKhoi =
    selectedKhoiIds.length === 0 || selectedKhoiIds.length >= khoiOptionCount;
  if (allKhoi) return selectedKhoaIds;

  const allowed = new Set(
    khoaOptions.filter((k) => k.khoi_id && selectedKhoiIds.includes(k.khoi_id)).map((k) => k.id),
  );
  const pruned = selectedKhoaIds.filter((id) => allowed.has(id));
  if (pruned.length > 0) return pruned;
  return [...allowed];
}

export type SummarySessionMetric = "tong" | "ksnk" | "cheo" | "tu_gs";

export function summaryRowSessionCount(row: DashboardSummaryRow, metric: SummarySessionMetric): number {
  switch (metric) {
    case "ksnk":
      return row.ksnk ?? 0;
    case "cheo":
      return row.cheo ?? 0;
    case "tu_gs":
      return row.tu_gs ?? 0;
    default:
      return row.tong ?? 0;
  }
}

/** Tab giám sát → cột summary tương ứng (tránh auto-chọn bảng chỉ có dữ liệu nguồn khác). */
export function tabToSummarySessionMetric(tab: string): SummarySessionMetric {
  if (tab === "ksnk") return "ksnk";
  if (tab === "cheo") return "cheo";
  if (tab === "tu_giam_sat") return "tu_gs";
  return "tong";
}

/**
 * Thu hẹp danh sách BK trước khi gọi RPC multi (mỗi mã = 1 round-trip DB).
 * Chỉ giữ BK có phiên đúng nguồn tab (KSNK / chéo / tự GS).
 */
function supervisionTypeToMetric(sType: SupervisionTabFilter | "ALL"): SummarySessionMetric {
  if (sType === "KSNK") return "ksnk";
  if (sType === "CHEO") return "cheo";
  if (sType === "TU_GIAM_SAT") return "tu_gs";
  return "tong";
}

export function pickBangKiemMasWithDataForSupervision(
  selectedMas: string[],
  summaryRows: DashboardSummaryRow[],
  sType: SupervisionTabFilter | "ALL",
): string[] {
  const selected = selectedMas.length > 0 ? selectedMas : ["VST_WHO"];
  const metric = supervisionTypeToMetric(sType);
  return selected.filter((id) => {
    if (id === "VST_WHO") {
      const vstRow = summaryRows.find((r) => r.ma_bk === "VST_WHO");
      return vstRow ? summaryRowSessionCount(vstRow, metric) > 0 : false;
    }
    const row = summaryRows.find((r) => summaryRowMatchesBangKiemOption(r, id));
    if (!row) return false;
    return summaryRowSessionCount(row, metric) > 0;
  });
}

/** Thu hẹp BK trước RPC multi/gap — chỉ gọi DB cho bảng có phiên (tong > 0) trong summary. */
export function narrowBangKiemMasForRpcBySummary(
  selectedMas: string[],
  summaryRows: DashboardSummaryRow[],
): string[] {
  return pickBangKiemMasWithDataForSupervision(selectedMas, summaryRows, "ALL");
}

/** Chỉ giữ option bảng kiểm khi summary có ≥1 phiên theo metric (mặc định `tong`). */
export function pickBangKiemOptionIdsWithSessionData(
  bangKiemOptions: { id: string; label?: string }[],
  summaryRows: DashboardSummaryRow[],
  metric: SummarySessionMetric = "tong",
): string[] {
  const rows = summaryRows.filter((r) => summaryRowSessionCount(r, metric) > 0);
  if (rows.length === 0) return [];

  const next: string[] = [];
  for (const opt of bangKiemOptions) {
    const id = opt.id;
    const hit = rows.some((r) => summaryRowMatchesBangKiemOption(r, id));
    if (hit) next.push(id);
  }
  return next;
}

export function sortedJoinIds(ids: string[]): string {
  return [...ids].sort().join("\u0001");
}

/** Trả mảng filter hoặc null nếu chọn hết (= không lọc). */
export function effectiveFilterIds(arr: string[], totalCount: number): string[] | null {
  if (arr.length === 0 || arr.length >= totalCount) return null;
  return arr;
}
