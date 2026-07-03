/** Deep link query contract: Command Center / Báo cáo tổng hợp → module Thống kê. */

export type SupervisionTabId = "form" | "history" | "analytics";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type AnalyticsUrlSeed = {
  tu_ngay?: string;
  den_ngay?: string;
  khoa_ids?: string[];
};

export function parseSupervisionTab(raw: string | null): SupervisionTabId {
  if (raw === "history" || raw === "analytics") return raw;
  return "form";
}

function parseIsoDate(raw: string | null): string | undefined {
  const v = String(raw ?? "").trim();
  return ISO_DATE.test(v) ? v : undefined;
}

function parseKhoaIds(raw: string | null): string[] | undefined {
  const v = String(raw ?? "").trim();
  if (!v) return undefined;
  const ids = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

export function parseAnalyticsUrlSeed(
  params: Pick<URLSearchParams, "get"> | { get: (key: string) => string | null },
): AnalyticsUrlSeed | null {
  const tu_ngay = parseIsoDate(params.get("tu_ngay"));
  const den_ngay = parseIsoDate(params.get("den_ngay"));
  const khoa_ids = parseKhoaIds(params.get("khoa_ids"));
  if (!tu_ngay && !den_ngay && !khoa_ids) return null;
  return { tu_ngay, den_ngay, khoa_ids };
}

export function hasAnalyticsUrlSeed(seed: AnalyticsUrlSeed | null): seed is AnalyticsUrlSeed {
  return seed != null && Boolean(seed.tu_ngay || seed.den_ngay || seed.khoa_ids?.length);
}

export function buildAnalyticsUrlQuery(seed: AnalyticsUrlSeed): string {
  const q = new URLSearchParams();
  if (seed.tu_ngay) q.set("tu_ngay", seed.tu_ngay);
  if (seed.den_ngay) q.set("den_ngay", seed.den_ngay);
  if (seed.khoa_ids?.length) q.set("khoa_ids", seed.khoa_ids.join(","));
  return q.toString();
}

/** Query do filter bar không quản — giữ khi sync URL (vd. `bk` drill-down GSC). */
export const ANALYTICS_PRESERVED_QUERY_KEYS = ["bk", "view", "loai"] as const;

export function appendPreservedAnalyticsQueryKeys(
  target: URLSearchParams,
  source: Pick<URLSearchParams, "get">,
): void {
  for (const key of ANALYTICS_PRESERVED_QUERY_KEYS) {
    const v = source.get(key);
    if (v) target.set(key, v);
    else target.delete(key);
  }
}

/** Stable dep cho useEffect — tránh object `searchParams` trong mảng deps. */
export function preservedAnalyticsQuerySnapshot(source: Pick<URLSearchParams, "get">): string {
  return ANALYTICS_PRESERVED_QUERY_KEYS.map((k) => `${k}=${source.get(k) ?? ""}`).join("\u0001");
}

/** Các route analytics đồng bộ filter qua URL. */
export const ANALYTICS_FILTER_PATHS = ["/", "/bao-cao-tong-hop", "/thong-ke/vst", "/thong-ke/gsc"] as const;

export function isAnalyticsFilterPath(pathname: string): boolean {
  return ANALYTICS_FILTER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
