/**
 * NKBV-L11 — VAE Event Period 14d suppress (SSOT §C.4.10.4 / C.4.8 bước 8–9).
 *
 * **Không** tái sử dụng RIT Ch.2 (`findPriorRitOwner` / L01). VAE bypass RIT;
 * cửa sổ khóa VAE mới = Event Period từ DOE ca VAE đang mở (DOE = ngày 1 → DOE+13).
 * Secondary BSI: chỉ PVAP + máu matching trong Event Period (đã có trong evaluateVaeVap).
 */
import { daysBetween, vaeEventPeriod } from "./nkbv-shared-timeline";

export const VAE_EVENT_PERIOD_SUPPRESS_CLASSIFICATION = "EVENT_PERIOD_SUPPRESS" as const;

export const VAE_EVENT_PERIOD_SUPPRESS_REASON_PREFIX =
  "DOE nằm trong Event Period 14 ngày của VAE trước";

export type PriorVaeForEventPeriod = {
  id: string;
  /** DOE của VAC/IVAC/PVAP đã mở (ngay_phat_hien / calculated_doe). */
  doe: string;
  classification?: string | null;
};

/** Candidate DOE ∈ Event Period của prior VAE? (inclusive; DOE = day 1). */
export function isDoeInPriorVaeEventPeriod(
  candidateDoe: string,
  priorVaeDoe: string,
): boolean {
  const c = String(candidateDoe || "").slice(0, 10);
  const p = String(priorVaeDoe || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c) || !/^\d{4}-\d{2}-\d{2}$/.test(p)) return false;
  const ep = vaeEventPeriod(p);
  return c >= ep.start && c <= ep.end;
}

/**
 * Tìm ca VAE mở có Event Period chứa candidateDoe.
 * Chỉ VAC/IVAC/PVAP (hoặc thiếu classification = coi là VAE dương tính đã lưu).
 */
export function findPriorVaeEventPeriodOwner(
  candidateDoe: string,
  priorVaes: PriorVaeForEventPeriod[],
  opts?: { excludeEventIds?: ReadonlySet<string> | string[] },
): PriorVaeForEventPeriod | null {
  const sample = String(candidateDoe || "").slice(0, 10);
  if (!sample) return null;
  const exclude = opts?.excludeEventIds
    ? new Set([...opts.excludeEventIds].map(String))
    : null;
  for (const e of priorVaes) {
    if (exclude?.has(String(e.id))) continue;
    const doe = String(e.doe || "").slice(0, 10);
    if (!doe) continue;
    const cls = String(e.classification || "")
      .trim()
      .toUpperCase();
    if (cls && !/^(VAC|IVAC|PVAP)/.test(cls) && cls !== "VAE") continue;
    if (!isDoeInPriorVaeEventPeriod(sample, doe)) continue;
    return e;
  }
  return null;
}

/** Pure gate — dùng trong evaluateVaeVap khi bridge truyền prior_open_vae_doe. */
export function evaluateVaeEventPeriodSuppress(input: {
  candidateDoe: string | null | undefined;
  priorOpenVaeDoe: string | null | undefined;
}): {
  suppressed: boolean;
  classification?: typeof VAE_EVENT_PERIOD_SUPPRESS_CLASSIFICATION;
  reason?: string;
} {
  const candidate = String(input.candidateDoe || "").slice(0, 10);
  const prior = String(input.priorOpenVaeDoe || "").slice(0, 10);
  if (!candidate || !prior) return { suppressed: false };
  if (!isDoeInPriorVaeEventPeriod(candidate, prior)) return { suppressed: false };
  const ep = vaeEventPeriod(prior);
  const diff = daysBetween(prior, candidate);
  return {
    suppressed: true,
    classification: VAE_EVENT_PERIOD_SUPPRESS_CLASSIFICATION,
    reason: `${VAE_EVENT_PERIOD_SUPPRESS_REASON_PREFIX} (DOE ${prior}, Event Period ${ep.start}→${ep.end}, Δ=${diff}d) — không tạo VAE mới chồng (SSOT §C.4.10.4). Không dùng RIT Ch.2.`,
  };
}

/** Case-like row → PriorVaeForEventPeriod (bridge Soft Soft Soft-safe). */
export type PriorVaeCaseLike = {
  id: string;
  doe?: string | null;
  ngay_phat_hien?: string | null;
  calculated_doe?: string | null;
  loai_ma?: string | null;
  vi_tri_nhiem_khuan?: string | null;
  classification?: string | null;
  verification_classification?: string | null;
};

function isVaeMajorCase(row: PriorVaeCaseLike): boolean {
  const blob = `${row.loai_ma || ""} ${row.vi_tri_nhiem_khuan || ""} ${row.classification || ""} ${row.verification_classification || ""}`
    .toUpperCase();
  return /\b(VAE|VAC|IVAC|PVAP|VAP)\b/.test(blob);
}

function extractDoe(row: PriorVaeCaseLike): string {
  return String(
    row.doe || row.calculated_doe || row.ngay_phat_hien || "",
  ).slice(0, 10);
}

function extractClassification(row: PriorVaeCaseLike): string | null {
  const raw = String(
    row.classification || row.verification_classification || row.loai_ma || "",
  )
    .trim()
    .toUpperCase();
  if (!raw) return null;
  if (/^(VAC|IVAC|PVAP)/.test(raw) || raw === "VAE" || raw === "VAP") return raw;
  return raw;
}

/**
 * Map prior open VAE cases → lookup list for Event Period (not RIT).
 * Chỉ VAC/IVAC/PVAP/VAE; bỏ LOAI_TRU ở tầng caller.
 */
export function priorCasesToPriorVaesForEventPeriod(
  rows: PriorVaeCaseLike[],
  opts?: { excludeEventIds?: ReadonlySet<string> | string[] },
): PriorVaeForEventPeriod[] {
  const exclude = opts?.excludeEventIds
    ? new Set([...opts.excludeEventIds].map(String))
    : null;
  const out: PriorVaeForEventPeriod[] = [];
  for (const row of rows || []) {
    if (exclude?.has(String(row.id))) continue;
    if (!isVaeMajorCase(row)) continue;
    const doe = extractDoe(row);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doe)) continue;
    out.push({
      id: String(row.id),
      doe,
      classification: extractClassification(row),
    });
  }
  return out;
}

/**
 * Hydrate `prior_open_vae_doe` từ prior open VAE cùng BN khi candidate DOE ∈ Event Period.
 * Pure Soft Soft Soft-safe bridge — evaluateVaeVap gate khi field set.
 */
export function hydratePriorOpenVaeDoe(input: {
  candidateDoe: string | null | undefined;
  priorCases: PriorVaeCaseLike[];
  excludeEventIds?: ReadonlySet<string> | string[];
  /** Giữ field thủ công nếu đã set và vẫn ∈ period. */
  existingPriorOpenVaeDoe?: string | null;
}): string | null {
  const existing = String(input.existingPriorOpenVaeDoe || "").slice(0, 10);
  const candidate = String(input.candidateDoe || "").slice(0, 10);
  if (existing && /^\d{4}-\d{2}-\d{2}$/.test(existing)) {
    if (!candidate || isDoeInPriorVaeEventPeriod(candidate, existing)) {
      return existing;
    }
  }
  if (!candidate) {
    const priors = priorCasesToPriorVaesForEventPeriod(input.priorCases, {
      excludeEventIds: input.excludeEventIds,
    });
    return priors[0]?.doe ?? null;
  }
  const priors = priorCasesToPriorVaesForEventPeriod(input.priorCases, {
    excludeEventIds: input.excludeEventIds,
  });
  const owner = findPriorVaeEventPeriodOwner(candidate, priors, {
    excludeEventIds: input.excludeEventIds,
  });
  return owner?.doe ?? null;
}
