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
