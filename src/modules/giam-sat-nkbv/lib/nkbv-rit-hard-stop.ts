/**
 * Ch.2 RIT hard-stop (DoD 20a = A) — không tạo tử số mới cùng major/specific type trong RIT.
 * SSI / VAE bypass. ENDO: RIT = hết đợt nằm viện (không 14d).
 * Pure — không I/O; caller (evaluate* / bridge / write) truyền prior events.
 */

import {
  resolveNkbvMajorType,
  sameMajorType,
  type NkbvMajorType,
} from "./nkbv-major-type";
import {
  clinicalRitEnd,
  endoRitSbapToDischarge,
} from "./nkbv-shared-timeline";

export type RitPriorEvent = {
  id?: string;
  /** DOE / ngày phát hiện của ca trước. */
  doe: string;
  majorType: NkbvMajorType;
  /** Ch.17 specific type (SKIN ≠ DECU). ENDO → RIT hết admission. */
  specificType?: string | null;
  /** Ngày ra viện (ENDO RIT end). */
  dischargeDate?: string | null;
  loaiLabel?: string | null;
};

export type RitHardStopOpts = {
  admissionDischargeDate?: string | null;
  asOfDate?: string | null;
  excludeEventIds?: ReadonlyArray<string> | ReadonlySet<string>;
};

export type RitHardStopHit =
  | {
      blocked: true;
      priorDoe: string;
      ritEnd: string;
      priorMajorType: NkbvMajorType;
      priorSpecificType?: string | null;
      priorEventId?: string;
      reason: string;
    }
  | { blocked: false };

/** Ch.17 specific from loai_ma / ch17_type_code — no invent organism list. */
export function resolveCh17SpecificType(input: {
  loai_ma?: string | null;
  ch17_type_code?: string | null;
  vi_tri_nhiem_khuan?: string | null;
}): string | null {
  const explicit = String(input.ch17_type_code || "")
    .trim()
    .toUpperCase();
  if (explicit) return explicit;

  const loai = String(input.loai_ma || "")
    .trim()
    .toUpperCase();
  if (loai.startsWith("CH17:")) {
    const code = loai.slice(5).trim();
    return code || null;
  }
  if (loai.startsWith("SSI:")) {
    const code = loai.slice(4).trim();
    return code || null;
  }
  // Standalone Ch.17 codes (ENDO, SKIN, …) — major resolves to CH17
  const major = resolveNkbvMajorType({
    loai_ma: loai,
    vi_tri_nhiem_khuan: input.vi_tri_nhiem_khuan,
  });
  if (major === "CH17" && loai && loai !== "CH17") return loai;
  return null;
}

export function ritPriorFromCaseLike(row: {
  id?: string;
  doe?: string | null;
  ngay_phat_hien?: string | null;
  loai_ma?: string | null;
  vi_tri_nhiem_khuan?: string | null;
  loai_ten?: string | null;
  discharge_date?: string | null;
  ngay_ra_vien?: string | null;
  ch17_type_code?: string | null;
}): RitPriorEvent | null {
  const doe = String(row.doe || row.ngay_phat_hien || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doe)) return null;
  const majorType = resolveNkbvMajorType({
    loai_ma: row.loai_ma,
    vi_tri_nhiem_khuan: row.vi_tri_nhiem_khuan,
  });
  if (majorType === "OTHER" || majorType === "SSI" || majorType === "VAE") {
    return null;
  }
  const specificType =
    majorType === "CH17"
      ? resolveCh17SpecificType({
          loai_ma: row.loai_ma,
          ch17_type_code: row.ch17_type_code,
          vi_tri_nhiem_khuan: row.vi_tri_nhiem_khuan,
        })
      : null;
  return {
    id: row.id ? String(row.id) : undefined,
    doe,
    majorType,
    specificType,
    dischargeDate: row.discharge_date || row.ngay_ra_vien || null,
    loaiLabel: row.loai_ten || row.loai_ma || majorType,
  };
}

export function resolveRitEndForPrior(
  prior: RitPriorEvent,
  opts?: RitHardStopOpts,
): string {
  const specific = String(prior.specificType || "").toUpperCase();
  const isEndo = prior.majorType === "CH17" && specific === "ENDO";
  if (isEndo) {
    return endoRitSbapToDischarge({
      indexDate: prior.doe,
      dischargeDate: prior.dischargeDate || opts?.admissionDischargeDate,
      asOfDate: opts?.asOfDate,
    }).ritEnd;
  }
  return clinicalRitEnd(prior.doe);
}

function typeLabel(major: NkbvMajorType, specific?: string | null): string {
  if (major === "CH17" && specific) return `CH17:${String(specific).toUpperCase()}`;
  return major;
}

/** Same major (BSI/UTI/PNEU) or same Ch.17 specific type. SSI/VAE never match. */
export function ritTypesOverlap(
  current: { majorType: NkbvMajorType; specificType?: string | null },
  prior: RitPriorEvent,
): boolean {
  if (
    current.majorType === "SSI" ||
    current.majorType === "VAE" ||
    current.majorType === "OTHER" ||
    prior.majorType === "SSI" ||
    prior.majorType === "VAE" ||
    prior.majorType === "OTHER"
  ) {
    return false;
  }
  if (current.majorType === "CH17" || prior.majorType === "CH17") {
    if (current.majorType !== "CH17" || prior.majorType !== "CH17") return false;
    const a = String(current.specificType || "").toUpperCase();
    const b = String(prior.specificType || "").toUpperCase();
    if (!a || !b) return false;
    return a === b;
  }
  return sameMajorType(current.majorType, prior.majorType);
}

function excluded(
  id: string | undefined,
  exclude?: ReadonlyArray<string> | ReadonlySet<string>,
): boolean {
  if (!id || !exclude) return false;
  if (typeof (exclude as ReadonlySet<string>).has === "function") {
    return (exclude as ReadonlySet<string>).has(id);
  }
  return (exclude as ReadonlyArray<string>).includes(id);
}

/**
 * DOE mới ∈ [priorDoe, ritEnd] cùng loại → block.
 * DOE = priorDoe+14 (sau RIT) → allow.
 */
export function checkRitHardStop(input: {
  currentMajorType: NkbvMajorType;
  currentSpecificType?: string | null;
  doe: string;
  priorEvents: RitPriorEvent[];
} & RitHardStopOpts): RitHardStopHit {
  if (
    input.currentMajorType === "SSI" ||
    input.currentMajorType === "VAE" ||
    input.currentMajorType === "OTHER"
  ) {
    return { blocked: false };
  }
  const doe = String(input.doe || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doe)) return { blocked: false };

  const current = {
    majorType: input.currentMajorType,
    specificType: input.currentSpecificType,
  };

  for (const prior of input.priorEvents || []) {
    if (excluded(prior.id, input.excludeEventIds)) continue;
    if (!ritTypesOverlap(current, prior)) continue;
    const priorDoe = String(prior.doe || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(priorDoe)) continue;
    const ritEnd = resolveRitEndForPrior(prior, input);
    if (doe >= priorDoe && doe <= ritEnd) {
      const label = typeLabel(
        prior.majorType,
        prior.specificType || input.currentSpecificType,
      );
      return {
        blocked: true,
        priorDoe,
        ritEnd,
        priorMajorType: prior.majorType,
        priorSpecificType: prior.specificType,
        priorEventId: prior.id,
        reason: `Thuộc RIT ca trước (DOE ${priorDoe} → hết RIT ${ritEnd}, loại ${label}). Không tạo tử số mới — thêm tác nhân vào ca cũ hoặc mở ca sau khi hết RIT.`,
      };
    }
  }
  return { blocked: false };
}

export type RitGateResultLike = {
  is_positive: boolean;
  classification: string;
  is_secondary_bsi?: boolean;
  lcbi_type?: string;
  reason: string;
};

/**
 * Áp sau Core (+ POA): nếu sẽ dương tính nhưng DOE ∈ RIT ca trước → tắt tử số.
 * Không có rit_prior_events → no-op (cần bridge/write inject).
 */
export function applyCh2RitGate<T extends RitGateResultLike>(
  data: {
    calculated_doe?: string;
    rit_prior_events?: RitPriorEvent[];
    rit_exclude_event_ids?: string[];
    discharge_date?: string | null;
    ngay_ra_vien?: string | null;
  },
  currentMajorType: NkbvMajorType,
  result: T,
  currentSpecificType?: string | null,
): T {
  if (!result.is_positive) return result;
  if (
    currentMajorType === "SSI" ||
    currentMajorType === "VAE" ||
    currentMajorType === "OTHER"
  ) {
    return result;
  }
  const priors = data.rit_prior_events;
  if (!priors?.length) return result;
  const doe = String(data.calculated_doe || "").slice(0, 10);
  if (!doe) return result;

  const hit = checkRitHardStop({
    currentMajorType,
    currentSpecificType,
    doe,
    priorEvents: priors,
    excludeEventIds: data.rit_exclude_event_ids,
    admissionDischargeDate: data.discharge_date || data.ngay_ra_vien,
  });
  if (!hit.blocked) return result;
  return {
    ...result,
    is_positive: false,
    classification: "RIT",
    is_secondary_bsi: false,
    reason: hit.reason,
  };
}
