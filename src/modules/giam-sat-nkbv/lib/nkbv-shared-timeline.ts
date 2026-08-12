/**
 * Shared timeline helpers — SSOT §0.4 / §3 / §3.6
 * Pure functions; no I/O.
 */

export type NkbvTimelineSyndrome =
  | "CLABSI"
  | "UTI"
  | "PNEU"
  | "VAE"
  | "SSI"
  | "BSI"
  | "OTHER";

export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr.slice(0, 10));
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function subDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

export function daysBetween(d1Str: string, d2Str: string): number {
  if (!d1Str || !d2Str) return 0;
  try {
    const d1 = new Date(d1Str.slice(0, 10));
    const d2 = new Date(d2Str.slice(0, 10));
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/** Clinical IWP ±3 around index date — NOT for VAE / SSI / LabID / PedVAE / ENDO / AU. */
export function clinicalIwp(indexDate: string): { start: string; end: string } {
  const idx = indexDate.slice(0, 10);
  return { start: subDays(idx, 3), end: addDays(idx, 3) };
}

/**
 * IWP với nửa cửa sổ tùy chỉnh (ENDO: halfDays=10 → 21 ngày lịch).
 */
export function clinicalIwpHalf(indexDate: string, halfDays: number): {
  start: string;
  end: string;
} {
  const idx = indexDate.slice(0, 10);
  const n = Math.max(0, Math.floor(halfDays));
  return { start: subDays(idx, n), end: addDays(idx, n) };
}

/** ENDO Extended IWP: Index ± 10 (21 ngày). */
export function endoExtendedIwp(indexDate: string): { start: string; end: string } {
  return clinicalIwpHalf(indexDate, 10);
}

/**
 * ENDO: RIT / SBAP kéo tới ngày ra viện (hoặc ngày hiện tại nếu chưa ra).
 * SBAP start = IWP start (Index−10); end = discharge (hoặc hôm nay).
 */
export function endoRitSbapToDischarge(input: {
  indexDate: string;
  dischargeDate?: string | null;
  asOfDate?: string | null;
}): { ritEnd: string; sbapStart: string; sbapEnd: string } {
  const iwp = endoExtendedIwp(input.indexDate);
  const end =
    (input.dischargeDate && String(input.dischargeDate).slice(0, 10)) ||
    (input.asOfDate && String(input.asOfDate).slice(0, 10)) ||
    new Date().toISOString().slice(0, 10);
  return { ritEnd: end, sbapStart: iwp.start, sbapEnd: end };
}

/** SSI Secondary BSI Attribution Period: fixed 17 calendar days [DOE−3, DOE+13]. */
export function ssiSbapWindow(doe: string): { start: string; end: string } {
  const d = doe.slice(0, 10);
  return { start: subDays(d, 3), end: addDays(d, 13) };
}

/**
 * Clinical SBAP (UTI / PNEU / CLABSI receiving from those sites) = IWP ∪ RIT:
 * `[Index − 3, DOE + 13]` — length 14–17 calendar days when DOE ∈ [Index−3, Index].
 * Do **not** use for SSI (use `ssiSbapWindow`) or VAE Event Period.
 */
export function clinicalSbapWindow(
  indexDate: string,
  doe: string,
): { start: string; end: string } {
  const idx = indexDate.slice(0, 10);
  const d = doe.slice(0, 10);
  return { start: subDays(idx, 3), end: addDays(d, 13) };
}

/**
 * Resolve clinical SBAP preferring precomputed bounds; else Index from
 * `indexDate` / IWP start (+3) / DOE fallback (17d when Index unknown).
 */
export function resolveClinicalSbap(input: {
  sbapStart?: string | null;
  sbapEnd?: string | null;
  indexDate?: string | null;
  iwpStart?: string | null;
  doe?: string | null;
}): { start: string; end: string } {
  const preStart = input.sbapStart ? String(input.sbapStart).slice(0, 10) : "";
  const preEnd = input.sbapEnd ? String(input.sbapEnd).slice(0, 10) : "";
  if (preStart && preEnd) return { start: preStart, end: preEnd };

  const doe = input.doe ? String(input.doe).slice(0, 10) : "";
  if (!doe) return { start: "", end: "" };

  const fromIndex = input.indexDate ? String(input.indexDate).slice(0, 10) : "";
  const iwpStart = input.iwpStart ? String(input.iwpStart).slice(0, 10) : "";
  const index = fromIndex || (iwpStart ? addDays(iwpStart, 3) : doe);
  return clinicalSbapWindow(index, doe);
}

/** RIT end exclusive-of-next: DOE is day 1 → last day of RIT = DOE+13. */
export function clinicalRitEnd(doe: string): string {
  return addDays(doe.slice(0, 10), 13);
}

/** VAE / PedVAE 14-day Event Period from DOE (DOE = day 1). */
export function vaeEventPeriod(doe: string): { start: string; end: string } {
  const d = doe.slice(0, 10);
  return { start: d, end: addDays(d, 13) };
}

export function usesClinicalIwp(syndrome: NkbvTimelineSyndrome): boolean {
  return syndrome === "CLABSI" || syndrome === "BSI" || syndrome === "UTI" || syndrome === "PNEU";
}

export function poaOrHai(admissionDate: string, doe: string): {
  dayOfHospitalization: number;
  haiStatus: "HAI" | "POA";
} {
  const adm = admissionDate.slice(0, 10);
  const d = doe.slice(0, 10);
  if (!adm || !d) return { dayOfHospitalization: 0, haiStatus: "POA" };
  const dayOfHospitalization = daysBetween(adm, d) + 1;
  return {
    dayOfHospitalization,
    haiStatus: dayOfHospitalization >= 3 ? "HAI" : "POA",
  };
}

export type DeviceAssociationResult = {
  /** Số ngày lịch dụng cụ còn trong cơ thể đến (và gồm) ngày cuối có dụng cụ ≤ DOE. */
  placedDays: number;
  /** Hiện diện DOE hoặc rút đúng DOE−1. */
  activeOnEvent: boolean;
  /** NHSN: placedDays ≥ 3 (Day 3+) và activeOnEvent. */
  associated: boolean;
  /** Đầu đợt liên tục dùng để đếm (sau Gap Rule). */
  episodeStart?: string;
  /** Ngày rút suy ra (null = còn mang tại/qua DOE). */
  episodeRemoved?: string | null;
};

/**
 * Device association (CDC/NHSN):
 * - Day 1 = ngày đặt (hoặc đầu đợt liên tục); nếu đặt trước viện → Day 1 = ngày vào viện.
 * - Đủ điều kiện từ Day 3 (đặt >2 ngày lịch liên tục).
 * - Hiện diện tại DOE hoặc rút đúng DOE−1.
 * - Số ngày chỉ đếm khi dụng cụ còn trên người (không đếm ngày sau khi đã rút).
 * - Rút sau DOE vẫn tính hiện diện lúc DOE.
 */
export function isDeviceAssociated(input: {
  placedDate: string;
  removedDate?: string | null;
  doe: string;
  /** Khi có: Day 1 = max(ngày đặt, ngày vào viện). */
  admissionDate?: string | null;
}): DeviceAssociationResult {
  const vv = input.admissionDate?.slice(0, 10) || "";
  let placed = input.placedDate?.slice(0, 10) || "";
  if (vv && placed && placed < vv) placed = vv;
  const doe = input.doe?.slice(0, 10) || "";
  if (!placed || !doe || doe < placed) {
    return {
      placedDays: 0,
      activeOnEvent: false,
      associated: false,
      episodeStart: placed || undefined,
      episodeRemoved: input.removedDate ? String(input.removedDate).slice(0, 10) : null,
    };
  }
  const removed = input.removedDate ? input.removedDate.slice(0, 10) : "";
  // Hiện diện: chưa rút, hoặc rút vào/sau DOE, hoặc rút đúng DOE−1
  const activeOnEvent =
    !removed || removed >= doe || removed === subDays(doe, 1);
  // Đếm ngày dụng cụ đến ngày cuối còn mang ≤ DOE (không cộng ngày sau khi rút)
  const lastInPlace = removed && removed < doe ? removed : doe;
  if (lastInPlace < placed) {
    return {
      placedDays: 0,
      activeOnEvent,
      associated: false,
      episodeStart: placed,
      episodeRemoved: removed || null,
    };
  }
  const placedDays = daysBetween(placed, lastInPlace) + 1;
  return {
    placedDays,
    activeOnEvent,
    associated: placedDays >= 3 && activeOnEvent,
    episodeStart: placed,
    episodeRemoved: removed || null,
  };
}

/** Tách chuỗi ngày can thiệp thành các đợt liên tục; gap ≥1 ngày lịch trọn → đợt mới (Gap Rule). */
export function splitDeviceEpisodes(canThiepDates: string[]): Array<{ start: string; end: string }> {
  const sorted = [
    ...new Set(canThiepDates.map((x) => x.slice(0, 10)).filter(Boolean)),
  ].sort();
  if (!sorted.length) return [];
  const episodes: Array<{ start: string; end: string }> = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (daysBetween(prev, cur) === 1) {
      prev = cur;
      continue;
    }
    episodes.push({ start, end: prev });
    start = cur;
    prev = cur;
  }
  episodes.push({ start, end: prev });
  return episodes;
}

/**
 * Đợt liên tục liên quan DOE: gồm DOE, hoặc kết thúc đúng DOE−1 (rút Day−1).
 * Gap Rule: không nối qua ngày lịch trống.
 */
export function deviceEpisodeForDoe(
  canThiepDates: string[],
  doe: string,
): { start: string; end: string } | null {
  const d = doe.slice(0, 10);
  if (!d) return null;
  const episodes = splitDeviceEpisodes(canThiepDates);
  const doeMinus1 = subDays(d, 1);
  for (const ep of episodes) {
    if (ep.start <= d && d <= ep.end) return ep;
  }
  for (const ep of episodes) {
    if (ep.end === doeMinus1) return ep;
  }
  return null;
}

/**
 * Gắn dụng cụ từ ngày can thiệp trên lưới (+ tùy chọn sổ đăng ký khi lưới trống).
 * Khi lưới có ngày: SSOT = đợt liên tục ∈ lưới (Gap Rule) — không lấy ngày đặt sổ để phình ≥3d.
 * Ngày ngoài [VV…RV] bị loại trước khi đếm (dữ liệu cũ trước viện không tính).
 */
export function deviceAssociationFromCanThiepDates(
  canThiepDates: string[],
  doe: string,
  opts?: {
    placedDate?: string | null;
    removedDate?: string | null;
    admissionDate?: string | null;
    dischargeDate?: string | null;
  },
): DeviceAssociationResult {
  const d = doe.slice(0, 10);
  if (!d) {
    return { placedDays: 0, activeOnEvent: false, associated: false };
  }
  const vv = (opts?.admissionDate || "").slice(0, 10);
  const rv = (opts?.dischargeDate || "").slice(0, 10);
  const sorted = [
    ...new Set(canThiepDates.map((x) => x.slice(0, 10)).filter(Boolean)),
  ]
    .filter((x) => {
      if (vv && x < vv) return false;
      if (rv && x > rv) return false;
      return true;
    })
    .sort();

  if (sorted.length) {
    const ep = deviceEpisodeForDoe(sorted, d);
    if (!ep) {
      return { placedDays: 0, activeOnEvent: false, associated: false };
    }
    // Còn mang sau DOE nếu đợt kéo dài quá DOE; rút = cuối đợt khi đợt kết thúc trước/đúng DOE
    const removed =
      ep.end < d || ep.end === subDays(d, 1) ? ep.end : null;
    const day1 = vv && ep.start < vv ? vv : ep.start;
    return isDeviceAssociated({
      placedDate: day1,
      removedDate: removed,
      doe: d,
      admissionDate: vv || null,
    });
  }

  const placed = (opts?.placedDate || "").slice(0, 10);
  if (!placed) {
    return { placedDays: 0, activeOnEvent: false, associated: false };
  }
  return isDeviceAssociated({
    placedDate: placed,
    removedDate: opts?.removedDate || null,
    doe: d,
    admissionDate: vv || null,
  });
}
