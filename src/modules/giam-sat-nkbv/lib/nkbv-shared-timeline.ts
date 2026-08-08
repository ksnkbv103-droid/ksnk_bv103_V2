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

/** Device association: placed >2 calendar days by DOE AND present on DOE or removed DOE−1. */
export function isDeviceAssociated(input: {
  placedDate: string;
  removedDate?: string | null;
  doe: string;
}): { placedDays: number; activeOnEvent: boolean; associated: boolean } {
  const placed = input.placedDate?.slice(0, 10) || "";
  const doe = input.doe?.slice(0, 10) || "";
  if (!placed || !doe) {
    return { placedDays: 0, activeOnEvent: false, associated: false };
  }
  const placedDays = daysBetween(placed, doe) + 1;
  const removed = input.removedDate ? input.removedDate.slice(0, 10) : "";
  let activeOnEvent = false;
  if (!removed) {
    activeOnEvent = doe >= placed;
  } else {
    const daysSinceRemoval = daysBetween(removed, doe);
    activeOnEvent = daysSinceRemoval <= 1 && daysSinceRemoval >= 0;
  }
  return {
    placedDays,
    activeOnEvent,
    associated: placedDays >= 3 && activeOnEvent,
  };
}
