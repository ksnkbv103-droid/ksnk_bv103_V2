/**
 * Ch.2 RIT hard-stop (DoD 20a = A) — không tạo tử số mới cùng major/specific type trong RIT.
 * SSI / VAE bypass. ENDO: RIT = hết đợt nằm viện (không 14d).
 * Pure — không I/O; caller (evaluate* / bridge / write) truyền prior events.
 *
 * Prior chỉ lấy sự kiện NHSN đã đủ tiêu chí (POA/HAI dương tính cùng major);
 * không lấy CONTAMINATION/NO_EVENT/RIT/secondary BSI/nháp/BO_QUA.
 */

import { nkbvMajorTypeFromClassification } from "./nkbv-classification-taxonomy";
import {
  resolveNkbvMajorType,
  sameMajorType,
  type NkbvMajorType,
} from "./nkbv-major-type";
import {
  clinicalRitEnd,
  endoRitSbapToDischarge,
  poaOrHai,
} from "./nkbv-shared-timeline";

/** Kết luận không mở RIT (không đủ tiêu chí sự kiện NHSN). */
const RIT_INELIGIBLE_CLASSIFICATIONS = new Set([
  "RIT",
  "CONTAMINATION",
  "NO_EVENT",
  "COMMUNITY_INFECTION",
]);

const RIT_INELIGIBLE_STATUSES = new Set(["LOAI_TRU"]);
const RIT_INELIGIBLE_DISPOSITIONS = new Set(["BO_QUA"]);

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

export type RitVerifiedSiblingRow = {
  id?: string;
  /** Bắt buộc — thiếu → không làm prior (không đoán từ Index). */
  calculated_doe?: string | null;
  ngay_vao_vien?: string | null;
  classification?: string | null;
  is_positive?: boolean | null;
  is_secondary_bsi?: boolean | null;
  analysis_disposition?: string | null;
  trang_thai_ma?: string | null;
  poa_major_type?: string | null;
  loai_ma?: string | null;
  loai_ten?: string | null;
  vi_tri_nhiem_khuan?: string | null;
  discharge_date?: string | null;
  ngay_ra_vien?: string | null;
  ch17_type_code?: string | null;
};

/** Ca đủ tiêu chí mở RIT: HAI dương tính hoặc POA cùng hội chứng; loại ngoại nhiễm/RIT/nháp/BSI 2°. */
export function isRitEligiblePrior(row: RitVerifiedSiblingRow): boolean {
  const status = String(row.trang_thai_ma || "").toUpperCase();
  if (RIT_INELIGIBLE_STATUSES.has(status)) return false;
  const disp = String(row.analysis_disposition || "").toUpperCase();
  if (RIT_INELIGIBLE_DISPOSITIONS.has(disp)) return false;

  const cls = String(row.classification || "").trim().toUpperCase();
  if (!cls) return false;
  if (RIT_INELIGIBLE_CLASSIFICATIONS.has(cls)) return false;
  if (row.is_secondary_bsi === true || cls === "SECONDARY_BSI") return false;

  if (cls === "POA") {
    const poaMajor = String(row.poa_major_type || "").toUpperCase();
    if (poaMajor === "BSI" || poaMajor === "UTI" || poaMajor === "PNEU" || poaMajor === "CH17") {
      return true;
    }
    const fromLoai = resolveNkbvMajorType({
      loai_ma: row.loai_ma,
      vi_tri_nhiem_khuan: row.vi_tri_nhiem_khuan,
    });
    return fromLoai === "BSI" || fromLoai === "UTI" || fromLoai === "PNEU" || fromLoai === "CH17";
  }

  if (row.is_positive === true) {
    const major = nkbvMajorTypeFromClassification(cls);
    return major !== "OTHER" && major !== "SSI" && major !== "VAE";
  }
  return false;
}

function resolvePriorMajorType(row: RitVerifiedSiblingRow): NkbvMajorType | null {
  const cls = String(row.classification || "").trim().toUpperCase();
  if (cls === "POA") {
    const poa = String(row.poa_major_type || "").toUpperCase();
    if (poa === "BSI" || poa === "UTI" || poa === "PNEU" || poa === "CH17") {
      return poa;
    }
    const fromLoai = resolveNkbvMajorType({
      loai_ma: row.loai_ma,
      vi_tri_nhiem_khuan: row.vi_tri_nhiem_khuan,
    });
    if (fromLoai === "OTHER" || fromLoai === "SSI" || fromLoai === "VAE") return null;
    return fromLoai;
  }
  const fromCls = nkbvMajorTypeFromClassification(cls);
  if (fromCls === "OTHER" || fromCls === "SSI" || fromCls === "VAE") return null;
  return fromCls;
}

/**
 * Prior từ phiếu đã có kết luận đủ tiêu chí.
 * DOE = calculated_doe (bắt buộc); DOE < HD1 → clamp HD1.
 */
export function ritPriorFromVerifiedSibling(
  row: RitVerifiedSiblingRow,
): RitPriorEvent | null {
  const rawDoe = String(row.calculated_doe || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDoe)) return null;
  if (!isRitEligiblePrior(row)) return null;

  const majorType = resolvePriorMajorType(row);
  if (!majorType) return null;

  const adm = String(row.ngay_vao_vien || "").slice(0, 10);
  const doe =
    adm && /^\d{4}-\d{2}-\d{2}$/.test(adm)
      ? poaOrHai(adm, rawDoe).doeForRit
      : rawDoe;

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

/**
 * Server luôn tự nạp — bỏ qua rit_prior_events client.
 * Chỉ cùng đợt (siblings đã lọc theo ma_benh_an).
 */
export function resolveServerRitPriors(input: {
  siblings: RitVerifiedSiblingRow[];
  admissionDate?: string | null;
  /** SSI/VAE bypass — không nạp prior Ch.2. */
  bypass?: boolean;
}): RitPriorEvent[] {
  if (input.bypass) return [];
  const adm = input.admissionDate ? String(input.admissionDate).slice(0, 10) : null;
  return (input.siblings || [])
    .map((s) =>
      ritPriorFromVerifiedSibling({
        ...s,
        ngay_vao_vien: s.ngay_vao_vien || adm,
      }),
    )
    .filter((x): x is RitPriorEvent => Boolean(x));
}

/** @deprecated Dùng ritPriorFromVerifiedSibling — giữ cho disposition/SBAP không RIT. */
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
  calculated_doe?: string | null;
  classification?: string | null;
  is_positive?: boolean | null;
  is_secondary_bsi?: boolean | null;
  analysis_disposition?: string | null;
  trang_thai_ma?: string | null;
  poa_major_type?: string | null;
  ngay_vao_vien?: string | null;
}): RitPriorEvent | null {
  // Nếu có verification fields → đường verified; ngược lại legacy (chỉ disposition)
  if (row.classification != null || row.is_positive != null || row.calculated_doe) {
    return ritPriorFromVerifiedSibling({
      ...row,
      calculated_doe: row.calculated_doe || row.doe || null,
    });
  }
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

/** Parse verification_data JSON từ sibling DB → RitVerifiedSiblingRow fields. */
export function verifiedSiblingFromCaseRow(s: {
  id?: unknown;
  loai_ma?: unknown;
  loai_ten?: unknown;
  vi_tri_nhiem_khuan?: unknown;
  trang_thai_ma?: unknown;
  verification_data?: unknown;
  ngay_vao_vien?: unknown;
}): RitVerifiedSiblingRow {
  const vd =
    s.verification_data && typeof s.verification_data === "object"
      ? (s.verification_data as Record<string, unknown>)
      : {};
  const calculated_doe =
    typeof vd.calculated_doe === "string"
      ? vd.calculated_doe.slice(0, 10)
      : null;
  const classification =
    typeof vd.classification === "string"
      ? vd.classification
      : typeof vd.evaluation_result === "object" &&
          vd.evaluation_result &&
          typeof (vd.evaluation_result as Record<string, unknown>).classification ===
            "string"
        ? String((vd.evaluation_result as Record<string, unknown>).classification)
        : null;
  const is_positive =
    typeof vd.is_positive === "boolean"
      ? vd.is_positive
      : typeof vd.evaluation_result === "object" &&
          vd.evaluation_result &&
          typeof (vd.evaluation_result as Record<string, unknown>).is_positive ===
            "boolean"
        ? Boolean((vd.evaluation_result as Record<string, unknown>).is_positive)
        : null;
  const is_secondary_bsi = Boolean(vd.is_secondary_bsi);
  const analysis_disposition =
    typeof vd.analysis_disposition === "string" ? vd.analysis_disposition : null;
  const poa_major_type =
    typeof vd.poa_major_type === "string" ? vd.poa_major_type : null;
  const ch17 =
    typeof vd.ch17_type_code === "string" ? vd.ch17_type_code : null;
  return {
    id: s.id ? String(s.id) : undefined,
    calculated_doe,
    ngay_vao_vien: s.ngay_vao_vien ? String(s.ngay_vao_vien).slice(0, 10) : null,
    classification,
    is_positive,
    is_secondary_bsi,
    analysis_disposition,
    trang_thai_ma: s.trang_thai_ma ? String(s.trang_thai_ma) : null,
    poa_major_type,
    loai_ma: s.loai_ma ? String(s.loai_ma) : null,
    loai_ten: s.loai_ten ? String(s.loai_ten) : null,
    vi_tri_nhiem_khuan: s.vi_tri_nhiem_khuan
      ? String(s.vi_tri_nhiem_khuan)
      : null,
    ch17_type_code: ch17,
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
