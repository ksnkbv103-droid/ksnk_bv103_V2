/**
 * Shared Secondary BSI attribution — SSOT §4
 * Pure functions; syndromes pass structured facts.
 */

export type SecondaryBsiPrimarySite =
  | "UTI"
  | "PNEU"
  | "PVAP"
  | "SSI"
  | "IAB"
  | "OTHER"
  | "PEDVAE";

export type SecondaryBsiInput = {
  primarySite: SecondaryBsiPrimarySite;
  bloodCollectionDate: string;
  sbapStart: string;
  sbapEnd: string;
  /** Blood organism display / SNOMED-ish string */
  bloodOrganism: string;
  /** Primary site organism when cultured */
  primaryOrganism?: string | null;
  organismsMatch?: boolean;
  /** Scenario 2: blood is a required criterion of the primary site definition */
  bloodMandatoryForPrimary?: boolean;
  /** Lung tissue / pleural fluid isolate within rules (lifts PNEU Candida ban) */
  lungOrPleuralMatch?: boolean;
};

export type SecondaryBsiResult = {
  isSecondary: boolean;
  reason: string;
};

function norm(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}

function isYeast(organism: string): boolean {
  return /candida|yeast|nấm men|nam men/i.test(organism);
}

function isConsOrEnterococcus(organism: string): boolean {
  return /coagulase|epidermidis|cons\b|enterococ/i.test(organism);
}

function isStaphOrStrepGenus(token: string): boolean {
  return token === "staphylococcus" || token === "streptococcus";
}

function isGenusOnlyLabel(organism: string): boolean {
  // "Pseudomonas species" / "Pseudomonas sp." / single-token genus
  return (
    /\bspecies\b|\bsp\.?\b|\bspp\.?\b/i.test(organism) ||
    organism.trim().split(/\s+/).length === 1
  );
}

/**
 * Matching Organism Rules (SSOT §4.2):
 * - Species-level: identical when both identified to species
 * - Genus-level: only when one side is genus-only AND same genus
 * - CẤM genus-match cho Staphylococcus / Streptococcus (species mơ hồ ↔ CoNS / S. aureus)
 */
export function organismsMatchForSecondary(
  bloodOrganism: string,
  primaryOrganism: string | null | undefined,
): boolean {
  const b = norm(bloodOrganism);
  const p = norm(primaryOrganism);
  if (!b || !p) return false;
  if (b === p) return true;

  const bg = b.split(/\s+/)[0];
  const pg = p.split(/\s+/)[0];
  if (bg && pg && bg === pg) {
    if (isStaphOrStrepGenus(bg)) {
      // Chỉ khớp nếu cả hai cùng chuỗi đầy đủ đã xử lý ở trên; không ghép genus
      return false;
    }
    if (isGenusOnlyLabel(b) || isGenusOnlyLabel(p)) {
      return true;
    }
  }

  // Yeast NOS ↔ Candida species
  if ((/yeast/.test(b) && /candida/.test(p)) || (/yeast/.test(p) && /candida/.test(b))) {
    return true;
  }

  // Không dùng includes substring rộng (tránh faecalis⊂faecium nhầm) — chỉ exact / genus ở trên
  return false;
}

export function dateInInclusiveRange(date: string, start: string, end: string): boolean {
  const d = date.slice(0, 10);
  const s = start.slice(0, 10);
  const e = end.slice(0, 10);
  if (!d || !s || !e) return false;
  return d >= s && d <= e;
}

/**
 * Canonical Secondary BSI gate.
 * PedVAE: absolute ban (SSOT §9).
 */
export function evaluateSecondaryBsi(input: SecondaryBsiInput): SecondaryBsiResult {
  if (input.primarySite === "PEDVAE") {
    return {
      isSecondary: false,
      reason: "PedVAE: CẤM quy kết Secondary BSI dưới mọi hình thức.",
    };
  }

  if (!dateInInclusiveRange(input.bloodCollectionDate, input.sbapStart, input.sbapEnd)) {
    return {
      isSecondary: false,
      reason: "Ngày lấy máu nằm ngoài SBAP của ổ nguyên phát.",
    };
  }

  const blood = input.bloodOrganism;
  const match =
    input.organismsMatch ??
    organismsMatchForSecondary(blood, input.primaryOrganism);

  // UTI: yeast never qualifies UTI → cannot attribute yeast blood as secondary to UTI
  if (input.primarySite === "UTI" && isYeast(blood)) {
    return {
      isSecondary: false,
      reason: "Yeast/Candida máu không được quy kết Secondary từ UTI (yeast không thuộc định nghĩa UTI).",
    };
  }

  // PNEU / PVAP: Candida, Enterococcus, CoNS ban unless lung/pleural
  if (
    (input.primarySite === "PNEU" || input.primarySite === "PVAP") &&
    (isYeast(blood) || isConsOrEnterococcus(blood)) &&
    !input.lungOrPleuralMatch
  ) {
    return {
      isSecondary: false,
      reason:
        "Candida / Enterococcus / CoNS sau PNEU/PVAP không Secondary trừ mô phổi hoặc dịch màng phổi.",
    };
  }

  // VAE adult: only PVAP may receive secondary attribution in event period
  if (input.primarySite !== "PVAP" && input.primarySite === "OTHER") {
    // no-op — caller should pass PVAP explicitly for VAE pathway
  }

  if (match) {
    return {
      isSecondary: true,
      reason: "Matching organism trong SBAP → Secondary BSI.",
    };
  }

  if (input.bloodMandatoryForPrimary) {
    return {
      isSecondary: true,
      reason: "Scenario 2: máu là yếu tố cấu thành tiêu chuẩn ổ nguyên phát.",
    };
  }

  return {
    isSecondary: false,
    reason: "Không match organism và không Scenario 2 → Primary BSI / đánh giá CLABSI độc lập.",
  };
}
