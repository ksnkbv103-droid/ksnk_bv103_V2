import { coerceInstrumentFormTypeId } from "@/modules/cssd-su-co/domain/cssd-incident-taxonomy";
import {
  resolveBatchRecallReason,
  type BatchRecallReasonCode,
} from "@/modules/cssd-su-co/domain/cssd-batch-recall";

/**
 * SSOT đường dẫn App Router — module CSSD BV103 (pilot).
 */
export const CSSD_ROUTES = {
  quyTrinh: "/cssd-quy-trinh",
  dungCu: "/cssd-dung-cu",
  suCo: "/cssd-su-co",
  thietBi: "/cssd-thiet-bi",
  hoaChat: "/cssd-hoa-chat",
  /** Mẻ tiệt khuẩn (deep link; tab batch cũng có trên quyTrinh). */
  batch: "/cssd-erp/batch",
  report: "/cssd-erp/report",
} as const;

/** URL canonical tab Mẻ TK trên shell quy trình. */
export function cssdQuyTrinhBatchTabHref(): string {
  return `${CSSD_ROUTES.quyTrinh}?tab=batch`;
}

/**
 * Deep-link một cửa sự cố dụng cụ (`/cssd-su-co`).
 * D4 SSOT: legacy TRANSFER/REPLENISH/BROKEN/MISSING chỉ coerce → 3 cửa (SET_RECONCILE / PHYSICAL / MOVE).
 * URL mới không emit legacy; mã lịch sử sổ vẫn qua submit bridge.
 */
export function cssdCatalogEditProposalHref(params: {
  kind: "LOAI" | "BO" | "BOM";
  ma?: string | null;
  loai?: string | null;
  ten?: string | null;
  targetId?: string | null;
  hint?: string | null;
}): string {
  const q = new URLSearchParams();
  q.set("tab", "DE_NGHI");
  q.set("kind", params.kind);
  const ma = String(params.ma || params.loai || "").trim();
  if (ma) q.set("ma", ma);
  const ten = String(params.ten || "").trim();
  if (ten) q.set("ten", ten);
  const targetId = String(params.targetId || "").trim();
  if (targetId) q.set("targetId", targetId);
  const hint = String(params.hint || "").trim();
  if (hint) q.set("note", hint);
  return `${CSSD_ROUTES.dungCu}?${q.toString()}`;
}

/** Luân chuyển kho↔bộ / bộ↔bộ — trên Dụng cụ (không phải sự cố). */
export function cssdLuanChuyenHref(params?: {
  ma?: string | null;
  loai?: string | null;
  chiTiet?: string | null;
}): string {
  const q = new URLSearchParams();
  q.set("tab", "LUAN_CHUYEN");
  const ma = String(params?.ma || "").trim();
  if (ma) q.set("ma", ma);
  const loai = String(params?.loai || "").trim();
  if (loai) q.set("loai", loai);
  const chiTiet = String(params?.chiTiet || "").trim();
  if (chiTiet) q.set("chiTiet", chiTiet);
  return `${CSSD_ROUTES.dungCu}?${q.toString()}`;
}

export function cssdSuCoInstrumentHref(params?: {
  type?:
    | "INSTRUMENT_SET_RECONCILE"
    | "INSTRUMENT_PHYSICAL"
    | "INSTRUMENT_MOVE"
    | "INSTRUMENT_BROKEN"
    | "INSTRUMENT_MISSING"
    | "INSTRUMENT_REPLENISH"
    | "INSTRUMENT_TRANSFER";
  ma?: string | null;
  loai?: string | null;
  chiTiet?: string | null;
}): string {
  const rawType = String(params?.type || "").trim();
  // B 2026-09-18: «Đổi danh mục» → đề nghị; MOVE/TRANSFER/REPLENISH → Luân chuyển trên Dụng cụ.
  if (rawType === "INSTRUMENT_SET_RECONCILE") {
    return cssdCatalogEditProposalHref({
      kind: "BOM",
      ma: params?.ma,
      loai: params?.loai,
      hint: params?.chiTiet,
    });
  }
  if (
    rawType === "INSTRUMENT_MOVE" ||
    rawType === "INSTRUMENT_TRANSFER" ||
    rawType === "INSTRUMENT_REPLENISH"
  ) {
    return cssdLuanChuyenHref({
      ma: params?.ma,
      loai: params?.loai,
      chiTiet: params?.chiTiet,
    });
  }
  const q = new URLSearchParams();
  q.set("group", "INSTRUMENT");
  if (params?.type) q.set("type", coerceInstrumentFormTypeId(params.type));
  const ma = String(params?.ma || "").trim();
  if (ma) q.set("ma", ma);
  const loai = String(params?.loai || "").trim();
  if (loai) q.set("loai", loai);
  const chiTiet = String(params?.chiTiet || "").trim();
  if (chiTiet) q.set("chiTiet", chiTiet);
  return `${CSSD_ROUTES.suCo}?${q.toString()}`;
}

/**
 * Deep-link thu hồi theo mẻ (QT.24) — sự cố an toàn PROCESS + lo_tiet_khuan_id.
 * D1: không dùng group INSTRUMENT / 3 cửa biến động dụng cụ.
 */
export function cssdSuCoBatchRecallHref(params?: {
  loTietKhuanId?: string | null;
  maLo?: string | null;
  reason?: BatchRecallReasonCode | string | null;
}): string {
  const q = new URLSearchParams();
  q.set("group", "PROCESS");
  q.set("entry", "batch-recall");
  const reason = resolveBatchRecallReason(params?.reason);
  q.set("type", reason.typeId);
  q.set("reason", reason.code);
  const loId = String(params?.loTietKhuanId || "").trim();
  if (loId) q.set("loTietKhuanId", loId);
  const maLo = String(params?.maLo || "").trim().toUpperCase();
  if (maLo) q.set("maLo", maLo);
  return `${CSSD_ROUTES.suCo}?${q.toString()}`;
}

/** Deep-link nhật ký sự cố trên báo cáo CSSD (tab Sự cố), optional highlight theo `id`. */
export function cssdSuCoIncidentJournalHref(incidentId?: string | null): string {
  const q = new URLSearchParams({ tab: "incident" });
  const id = String(incidentId || "").trim();
  if (id) q.set("id", id);
  return `${CSSD_ROUTES.report}?${q.toString()}`;
}

/** Deep-link báo cáo CSSD (sản lượng / bộ / máy / NV) với kỳ lọc tùy chọn. */
export function cssdReportAnalyticsHref(params?: {
  tab?: "overview" | "volume" | "sets" | "equipment" | "staff" | "incident";
  from?: string | null;
  to?: string | null;
  station?: string | null;
}): string {
  const q = new URLSearchParams();
  const tab = params?.tab || "volume";
  q.set("tab", tab);
  const from = String(params?.from || "").trim();
  const to = String(params?.to || "").trim();
  const station = String(params?.station || "").trim();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  if (station && station !== "ALL") q.set("station", station);
  return `${CSSD_ROUTES.report}?${q.toString()}`;
}

/** Prefix cho shell CSSD (canonical + batch/report). */
export const CSSD_APP_SHELL_PREFIXES: readonly string[] = [
  CSSD_ROUTES.quyTrinh,
  CSSD_ROUTES.dungCu,
  CSSD_ROUTES.suCo,
  CSSD_ROUTES.thietBi,
  CSSD_ROUTES.hoaChat,
  "/cssd-erp",
];
