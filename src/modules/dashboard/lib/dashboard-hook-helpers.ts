import type { DashboardSummaryRow } from "../compliance-dashboard.types";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";

export type ParticipationRow = { id: string; ten: string; so_phien: number };

export function mergeParticipationRows(
  vst: VstDashboardPayload | null,
  gsc: Record<string, ComplianceDashboardPayload>,
): ParticipationRow[] {
  const vstPart = vst?.participation ?? [];
  const gscPart: ParticipationRow[] = [];
  Object.values(gsc).forEach((p) => {
    if (p?.participation?.length) gscPart.push(...p.participation);
  });
  const m = new Map<string, ParticipationRow>();
  for (const p of [...vstPart, ...gscPart]) {
    const ex = m.get(p.id);
    if (ex) ex.so_phien += p.so_phien;
    else m.set(p.id, { ...p });
  }
  return Array.from(m.values());
}

/** Chỉ giữ option bảng kiểm khi bảng tổng hợp có ≥1 phiên (tong > 0) trong khoảng lọc. */
export function pickBangKiemOptionIdsWithSessionData(
  bangKiemOptions: { id: string; label?: string }[],
  summaryRows: DashboardSummaryRow[],
): string[] {
  const rows = summaryRows.filter((r) => (r.tong ?? 0) > 0);
  if (rows.length === 0) return [];

  const next: string[] = [];
  for (const opt of bangKiemOptions) {
    const id = opt.id;
    const hit = rows.some((r) => {
      const mb = String(r.ma_bk ?? "").trim();
      if (!mb) return false;
      if (id === "VST_WHO") return mb === "VST_WHO";
      if (id === mb) return true;
      if (id.startsWith("BK_ID:")) {
        const uuid = id.slice(6).trim();
        return mb === uuid;
      }
      return false;
    });
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
