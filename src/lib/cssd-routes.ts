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

/** Deep-link một cửa sự cố dụng cụ (`/cssd-su-co`). */
export function cssdSuCoInstrumentHref(params?: {
  type?: "INSTRUMENT_BROKEN" | "INSTRUMENT_MISSING" | "INSTRUMENT_REPLENISH" | "INSTRUMENT_RETURN" | "INSTRUMENT_TRANSFER";
  ma?: string | null;
  loai?: string | null;
  chiTiet?: string | null;
}): string {
  const q = new URLSearchParams();
  q.set("group", "INSTRUMENT");
  if (params?.type) q.set("type", params.type);
  const ma = String(params?.ma || "").trim();
  if (ma) q.set("ma", ma);
  const loai = String(params?.loai || "").trim();
  if (loai) q.set("loai", loai);
  const chiTiet = String(params?.chiTiet || "").trim();
  if (chiTiet) q.set("chiTiet", chiTiet);
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
