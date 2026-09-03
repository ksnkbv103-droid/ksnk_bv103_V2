import {
  needsBomApproval,
  summarizeSetReconcile,
  type SetReconcileLineInput,
  type SetReconcileStatus,
} from "@/lib/domain/cssd-set-reconcile";

export type SetReconcileSnapshot = {
  boDungCuId: string;
  maBo?: string;
  tenBo?: string;
  lines: SetReconcileLineInput[];
};

export function parseSetReconcileSnapshot(raw: unknown): SetReconcileSnapshot | null {
  const text = typeof raw === "string" ? raw : raw != null ? JSON.stringify(raw) : "";
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(text) as SetReconcileSnapshot;
    if (!parsed || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readSetReconcileStatus(attrs: Record<string, unknown>): SetReconcileStatus | null {
  const raw = String(attrs.SET_RECONCILE_STATUS ?? attrs.set_reconcile_status ?? "").trim();
  if (raw === "DRAFT" || raw === "NONE" || raw === "BOM_PENDING" || raw === "BOM_APPROVED" || raw === "BOM_REJECTED") {
    return raw;
  }
  return null;
}

export function readSetReconcileBoId(attrs: Record<string, unknown>): string | null {
  const text = String(attrs.BO_DUNG_CU_ID ?? attrs.bo_dung_cu_id ?? "").trim();
  return text || null;
}

export function isSetReconcileDraftAttr(attrs: Record<string, unknown>): boolean {
  return readSetReconcileStatus(attrs) === "DRAFT";
}

export function buildSetReconcileAttributePatch(args: {
  boDungCuId: string;
  snapshot: SetReconcileSnapshot;
  status: SetReconcileStatus;
}): Record<string, string> {
  const sum = summarizeSetReconcile(args.snapshot.lines);
  const status: SetReconcileStatus =
    args.status === "DRAFT"
      ? "DRAFT"
      : needsBomApproval(args.snapshot.lines)
        ? args.status === "BOM_APPROVED" || args.status === "BOM_REJECTED"
          ? args.status
          : "BOM_PENDING"
        : "NONE";
  return {
    SET_RECONCILE: "1",
    BO_DUNG_CU_ID: args.boDungCuId,
    SET_RECONCILE_STATUS: status,
    SET_RECONCILE_SNAPSHOT: JSON.stringify(args.snapshot),
    SET_RECONCILE_SUMMARY: `hong:${sum.hong};mat:${sum.mat};boSung:${sum.boSung};doiChuan:${sum.doiChuan};doiLoai:${sum.doiLoai};dieuChuyen:${sum.dieuChuyen}`,
  };
}
