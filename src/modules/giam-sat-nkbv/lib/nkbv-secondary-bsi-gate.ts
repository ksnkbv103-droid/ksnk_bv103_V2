/**
 * Cổng Secondary BSI — SSOT §4.1–§4.4 (Scenario 1 + Scenario 2 + exclusion).
 * Pure: không I/O.
 */

import { resolveNkbvMajorType, type NkbvMajorType } from "./nkbv-major-type";

export type SecondaryBsiScenario = "S1" | "S2" | null;

export type BloodCultureCandidate = {
  id: string;
  date: string;
  organism: string | null;
};

export type PrimarySiteForSbap = {
  id: string;
  majorType: NkbvMajorType;
  /** Inclusive ISO dates in SBAP (or Event Period for PVAP). */
  sbapDates: string[];
  /** Organism from local culture at site (for S1 match). */
  siteOrganism?: string | null;
  /** Nhiều VK ổ tại chỗ (Index ∪ RIT) — S1 khớp bất kỳ. */
  siteOrganisms?: string[] | null;
  /**
   * Blood culture ids used as constituent criteria to meet site definition
   * (PNU2, SSI Organ/Space Ch.17, …) — Scenario 2.
   */
  bloodCriterionIds?: string[];
  /** Dates of those blood criteria (must fall in site criteria window). */
  bloodCriterionDates?: string[];
  /** Site criteria window dates (IWP / SP) for S2 date check. */
  criteriaWindowDates?: string[];
  /** PVAP-only for VAE secondary. */
  isPvap?: boolean;
  /** Site already meets definition (enough criteria). */
  criteriaMet: boolean;
  /** DOE của site (hiển thị kết luận đa site). */
  doe?: string | null;
};

export type SecondaryBsiVerdict = {
  bloodId: string;
  outcome: "SECONDARY" | "PRIMARY_CANDIDATE" | "EXCLUDED_PRIMARY";
  scenario: SecondaryBsiScenario;
  siteId: string | null;
  siteMajorType: NkbvMajorType | null;
  reason: string;
  /** SSOT §4.1 — máu có thể Secondary từ nhiều site cùng lúc. */
  allSites?: Array<{
    siteId: string;
    siteMajorType: NkbvMajorType;
    scenario: NonNullable<SecondaryBsiScenario>;
    reason: string;
  }>;
};

function normOrg(s: string | null | undefined): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Match loài / chi đơn giản (Wave 1) — genus token đầu hoặc chuỗi bằng nhau. */
export function organismsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normOrg(a);
  const y = normOrg(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const gx = x.split(/[\s./]/)[0] || "";
  const gy = y.split(/[\s./]/)[0] || "";
  if (gx.length >= 3 && gx === gy) return true;
  if (x.includes(y) || y.includes(x)) return true;
  return false;
}

function isYeast(org: string | null | undefined): boolean {
  return /candida|yeast|nấm men|nam men/i.test(String(org || ""));
}

function isPneuSecondaryBannedOrg(org: string | null | undefined): boolean {
  return /candida|yeast|enterococcus|coagulase.?neg|staphylococcus epidermidis|\bcons\b/i.test(
    String(org || ""),
  );
}

/**
 * Exclusion §4.3 — thắng S1/S2 khi áp dụng.
 * lungTissueOrPleuralExempt: IP đánh dấu máu đi kèm mô phổi / dịch màng phổi ≤24h.
 */
export function isSecondaryExcluded(input: {
  siteMajorType: NkbvMajorType;
  bloodOrganism: string | null;
  lungTissueOrPleuralExempt?: boolean;
}): { excluded: boolean; reason: string } {
  const { siteMajorType, bloodOrganism } = input;
  if (siteMajorType === "UTI" && isYeast(bloodOrganism)) {
    return {
      excluded: true,
      reason: "Yeast/Candida sau UTI — cấm Secondary → đánh giá Primary BSI",
    };
  }
  if (
    (siteMajorType === "PNEU" || siteMajorType === "VAE") &&
    isPneuSecondaryBannedOrg(bloodOrganism) &&
    !input.lungTissueOrPleuralExempt
  ) {
    return {
      excluded: true,
      reason:
        "Candida/CoNS/Enterococcus sau PNEU/PVAP — cấm Secondary trừ mô phổi / dịch màng phổi",
    };
  }
  if (siteMajorType === "VAE" && input) {
    /* VAC/IVAC handled by caller via isPvap */
  }
  return { excluded: false, reason: "" };
}

export function evaluateSecondaryBsiForBlood(input: {
  blood: BloodCultureCandidate;
  sites: PrimarySiteForSbap[];
  lungTissueOrPleuralExempt?: boolean;
}): SecondaryBsiVerdict {
  const bloodDate = input.blood.date.slice(0, 10);
  const eligibleSites = input.sites.filter((s) => s.criteriaMet);

  const secondaryHits: NonNullable<SecondaryBsiVerdict["allSites"]> = [];
  let exclusionHit: SecondaryBsiVerdict | null = null;

  for (const site of eligibleSites) {
    if (site.majorType === "VAE" && !site.isPvap) {
      continue;
    }
    if (site.majorType === "BSI") continue;

    const excl = isSecondaryExcluded({
      siteMajorType: site.majorType,
      bloodOrganism: input.blood.organism,
      lungTissueOrPleuralExempt: input.lungTissueOrPleuralExempt,
    });
    if (excl.excluded) {
      if (
        !exclusionHit &&
        site.sbapDates.map((d) => d.slice(0, 10)).includes(bloodDate)
      ) {
        exclusionHit = {
          bloodId: input.blood.id,
          outcome: "EXCLUDED_PRIMARY",
          scenario: null,
          siteId: site.id,
          siteMajorType: site.majorType,
          reason: excl.reason,
        };
      }
      continue; // site này không Secondary — vẫn xét site khác
    }

    const inSbap = site.sbapDates.map((d) => d.slice(0, 10)).includes(bloodDate);

    // Scenario 2: blood used as constituent criterion
    const usedAsCriterion = (site.bloodCriterionIds || []).includes(input.blood.id);
    const window = (site.criteriaWindowDates || site.sbapDates).map((d) => d.slice(0, 10));
    const inCriteriaWindow = window.includes(bloodDate);
    if (usedAsCriterion && inCriteriaWindow) {
      secondaryHits.push({
        siteId: site.id,
        siteMajorType: site.majorType,
        scenario: "S2",
        reason: `Secondary S2 — máu cấu thành tiêu chuẩn ${site.majorType}`,
      });
      continue;
    }

    // Scenario 1: in SBAP + organism match (Index ∪ pack RIT)
    const siteOrgs = [
      ...(site.siteOrganisms || []).map((o) => String(o || "").trim()).filter(Boolean),
      ...(site.siteOrganism ? [String(site.siteOrganism).trim()] : []),
    ];
    if (
      inSbap &&
      siteOrgs.some((o) => organismsMatch(input.blood.organism, o))
    ) {
      secondaryHits.push({
        siteId: site.id,
        siteMajorType: site.majorType,
        scenario: "S1",
        reason: `Secondary S1 — máu ∈ SBAP ${site.majorType} + khớp loài`,
      });
    }
  }

  if (secondaryHits.length > 0) {
    const first = secondaryHits[0]!;
    const reason =
      secondaryHits.length > 1
        ? secondaryHits.map((h) => h.reason).join(" · ")
        : first.reason;
    return {
      bloodId: input.blood.id,
      outcome: "SECONDARY",
      scenario: first.scenario,
      siteId: first.siteId,
      siteMajorType: first.siteMajorType,
      reason,
      allSites: secondaryHits,
    };
  }

  if (exclusionHit) return exclusionHit;

  return {
    bloodId: input.blood.id,
    outcome: "PRIMARY_CANDIDATE",
    scenario: null,
    siteId: null,
    siteMajorType: null,
    reason: "Không Secondary S1/S2 — ứng viên Primary BSI",
  };
}

export function evaluateAllBloodCultures(input: {
  bloods: BloodCultureCandidate[];
  sites: PrimarySiteForSbap[];
  lungTissueOrPleuralExempt?: boolean;
}): SecondaryBsiVerdict[] {
  return input.bloods.map((blood) =>
    evaluateSecondaryBsiForBlood({
      blood,
      sites: input.sites,
      lungTissueOrPleuralExempt: input.lungTissueOrPleuralExempt,
    }),
  );
}

export function siteMajorFromLoaiMa(loaiMa: string | null | undefined): NkbvMajorType {
  return resolveNkbvMajorType({ loai_ma: loaiMa });
}
