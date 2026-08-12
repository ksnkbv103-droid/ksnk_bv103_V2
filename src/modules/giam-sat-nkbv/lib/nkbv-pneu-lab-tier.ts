/**
 * Lab-first PNU tier — SSOT §10.4 Table 2/3 + Footnote 10 (IC).
 * PNU1 = đủ lâm sàng+hình ảnh, không có lab đạt ngưỡng.
 * PNU2 = lâm sàng + ≥1 lab Table 2 hoặc Table 3.
 * PNU3 = suy giảm miễn dịch + lab đạt (kể cả ngoại lệ Candida máu+LRT).
 */

import { classifyPathogen, isExcludedPvapPathogen } from "./nkbv-pathogen-rules";

export type PneuLabSpecimen =
  | "NONE"
  | "BLOOD"
  | "PLEURAL"
  | "LUNG_TISSUE"
  | "BAL"
  | "PBAL"
  | "PSB"
  | "ETA"
  | "SPUTUM"
  | "OTHER_LRT";

export type PneuLabSemiQuant =
  | "NONE"
  | "LIGHT"
  | "MODERATE"
  | "HEAVY"
  | "MANY"
  | "PLUS_2"
  | "PLUS_3"
  | "PLUS_4";

/** Facts nhập / prefill — đủ để suy tier vi sinh. */
export type PneuLabFacts = {
  pneu_lab_specimen?: PneuLabSpecimen | null;
  pneu_lab_cfu_per_ml?: number | null;
  pneu_lab_semi_quant?: PneuLabSemiQuant | null;
  pneu_lab_organism?: string | null;
  pneu_lab_is_normal_flora?: boolean;
  /** Table 3 gộp (legacy / derived). */
  pneu_lab_table3_positive?: boolean;
  pneu_lab_bal_intracellular_ge_5pct?: boolean;
  pneu_lab_histopath_positive?: boolean;
  /** Cửa PNU3 gộp (legacy / derived từ atom IC). */
  pneu_is_immunocompromised?: boolean;
  pneu_candida_blood_and_lrt_match?: boolean;
  vent_days?: number;
  microbiology_evidence?: "NONE" | "PNU2" | "PNU3";

  // —— Table 3 atoms (SSOT §10.4) ——
  pneu_t3_influenza?: boolean;
  pneu_t3_rsv?: boolean;
  pneu_t3_other_virus?: boolean;
  pneu_t3_legionella?: boolean;
  pneu_t3_mycoplasma?: boolean;
  pneu_t3_chlamydia?: boolean;
  pneu_t3_bordetella?: boolean;

  // —— Immunocompromised atoms (Footnote 10 lean) ——
  pneu_ic_neutropenia?: boolean;
  pneu_ic_leukemia_lymphoma?: boolean;
  pneu_ic_hiv_cd4_lt_200?: boolean;
  pneu_ic_splenectomy?: boolean;
  pneu_ic_solid_organ_or_hsct?: boolean;
  pneu_ic_chemotherapy?: boolean;
  pneu_ic_steroid_ge_14d?: boolean;
};

export type PneuLabTier = "NONE" | "PNU2" | "PNU3";

export type PneuLabTierResult = {
  tier: PneuLabTier;
  has_qualifying_lab: boolean;
  lab_excluded: boolean;
  reasons: string[];
  used_lab_facts: boolean;
  /** Derived flags — form/engine có thể đồng bộ lại. */
  table3_positive: boolean;
  immunocompromised: boolean;
};

const SEMI_QUALIFYING = new Set<PneuLabSemiQuant>([
  "MODERATE",
  "HEAVY",
  "MANY",
  "PLUS_2",
  "PLUS_3",
  "PLUS_4",
]);

const LRT_QUANT = new Set<PneuLabSpecimen>(["BAL", "PBAL", "PSB", "ETA", "OTHER_LRT"]);

const TABLE3_ORGANISM_RE =
  /influenza|cúm|cum\b|rsv|respiratory syncytial|adenovirus|parainfluenza|metapneumo|hmpv|sars|covid|coronavirus|rhinovirus|enterovirus|legionella|mycoplasma|chlamydia|chlamydophila|bordetella|pertussis/i;

export function isTable3Organism(name: string): boolean {
  return TABLE3_ORGANISM_RE.test(name.trim());
}

function table3FromAtomsOrOrganism(facts: PneuLabFacts): boolean {
  if (
    facts.pneu_t3_influenza ||
    facts.pneu_t3_rsv ||
    facts.pneu_t3_other_virus ||
    facts.pneu_t3_legionella ||
    facts.pneu_t3_mycoplasma ||
    facts.pneu_t3_chlamydia ||
    facts.pneu_t3_bordetella
  ) {
    return true;
  }
  return isTable3Organism(facts.pneu_lab_organism || "");
}

function icFromAtoms(facts: PneuLabFacts): boolean {
  return Boolean(
    facts.pneu_ic_neutropenia ||
      facts.pneu_ic_leukemia_lymphoma ||
      facts.pneu_ic_hiv_cd4_lt_200 ||
      facts.pneu_ic_splenectomy ||
      facts.pneu_ic_solid_organ_or_hsct ||
      facts.pneu_ic_chemotherapy ||
      facts.pneu_ic_steroid_ge_14d,
  );
}

/** Engine: atom / tác nhân Table 3 / cờ gộp legacy. */
export function derivePneuTable3Positive(facts: PneuLabFacts): boolean {
  return table3FromAtomsOrOrganism(facts) || !!facts.pneu_lab_table3_positive;
}

/** Engine: atom IC / cờ gộp legacy. */
export function derivePneuImmunocompromised(facts: PneuLabFacts): boolean {
  return icFromAtoms(facts) || !!facts.pneu_is_immunocompromised;
}

function hasAnyLabFact(f: PneuLabFacts): boolean {
  const specimen = f.pneu_lab_specimen && f.pneu_lab_specimen !== "NONE";
  return Boolean(
    specimen ||
      derivePneuTable3Positive(f) ||
      f.pneu_lab_bal_intracellular_ge_5pct ||
      f.pneu_lab_histopath_positive ||
      (f.pneu_lab_cfu_per_ml != null && f.pneu_lab_cfu_per_ml > 0) ||
      (f.pneu_lab_semi_quant && f.pneu_lab_semi_quant !== "NONE") ||
      (f.pneu_lab_organism && f.pneu_lab_organism.trim()) ||
      f.pneu_lab_is_normal_flora ||
      f.pneu_candida_blood_and_lrt_match ||
      derivePneuImmunocompromised(f),
  );
}

function isCandidaLike(name: string): boolean {
  return /candida|yeast|nấm men|nam men/i.test(name.trim());
}

function isNonCandidaFungus(name: string): boolean {
  const p = name.trim();
  if (!p || isCandidaLike(p)) return false;
  return /aspergil|cryptoc|mucor|rhizopus|fusarium|histoplasm|blastomyc|coccidioid|fungi|nấm/i.test(
    p,
  );
}

function isBannedLrtOrganism(name: string, normalFlora: boolean): boolean {
  if (normalFlora) return true;
  if (!name.trim()) return false;
  if (isTable3Organism(name)) return false;
  if (isExcludedPvapPathogen(name)) return true;
  const cls = classifyPathogen(name);
  return cls.isCommensal || isCandidaLike(name);
}

function cfuMeetsSpecimen(
  specimen: PneuLabSpecimen,
  cfu: number | null | undefined,
  ventDays: number,
): boolean {
  if (cfu == null || !(cfu > 0)) return false;
  switch (specimen) {
    case "BAL":
    case "PBAL":
      return cfu >= 1e4;
    case "PSB":
      return cfu >= 1e3;
    case "ETA":
      return ventDays >= 1 && cfu >= 1e5;
    case "LUNG_TISSUE":
      return cfu >= 1e4;
    default:
      return false;
  }
}

/** Parse `so_luong` LIS → CFU hoặc bán định lượng. */
export function parsePneuSoLuong(raw: string | null | undefined): {
  cfu_per_ml: number | null;
  semi_quant: PneuLabSemiQuant;
} {
  const s = String(raw || "").trim();
  if (!s) return { cfu_per_ml: null, semi_quant: "NONE" };

  const lower = s.toLowerCase();
  if (/\b4\+|xxxx|\+{4}|many|rất nhiều|rat nhieu/i.test(lower)) {
    return { cfu_per_ml: null, semi_quant: "PLUS_4" };
  }
  if (/\b3\+|xxx|\+{3}|heavy|nhiều\b|nhieu\b/i.test(lower)) {
    return { cfu_per_ml: null, semi_quant: "PLUS_3" };
  }
  if (/\b2\+|xx|\+{2}|moderate|vừa|vua\b/i.test(lower)) {
    return { cfu_per_ml: null, semi_quant: "PLUS_2" };
  }
  if (/\b1\+|light|ít|it\b|scant/i.test(lower)) {
    return { cfu_per_ml: null, semi_quant: "LIGHT" };
  }

  // 10^5 → 1e5; 1.5×10^5 / 1.5x10^5 → 1.5e5
  const coefTen = s.match(
    /(\d+(?:[.,]\d+)?)\s*[x×*]\s*10\s*[\^∗*]?\s*(\d+)/i,
  );
  if (coefTen) {
    const coef = parseFloat(coefTen[1].replace(",", "."));
    const exp = parseInt(coefTen[2], 10);
    if (Number.isFinite(coef) && Number.isFinite(exp)) {
      return { cfu_per_ml: coef * Math.pow(10, exp), semi_quant: "NONE" };
    }
  }
  const caret = s.match(/(\d+(?:[.,]\d+)?)\s*[\^∗*]\s*(\d+)/);
  if (caret) {
    const base = parseFloat(caret[1].replace(",", "."));
    const exp = parseInt(caret[2], 10);
    if (Number.isFinite(base) && Number.isFinite(exp)) {
      // "10^5" = 10**5; "2^5" hiếm — vẫn coi base**exp nếu base===10, else base*10**exp
      const cfu = base === 10 ? Math.pow(10, exp) : base * Math.pow(10, exp);
      return { cfu_per_ml: cfu, semi_quant: "NONE" };
    }
  }
  const unicode = s.match(/(\d+(?:[.,]\d+)?)\s*×\s*10\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d+)/i);
  if (unicode) {
    const coef = parseFloat(unicode[1].replace(",", "."));
    const expRaw = unicode[2];
    const expMap: Record<string, string> = {
      "⁰": "0",
      "¹": "1",
      "²": "2",
      "³": "3",
      "⁴": "4",
      "⁵": "5",
      "⁶": "6",
      "⁷": "7",
      "⁸": "8",
      "⁹": "9",
    };
    const expStr = /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(expRaw)
      ? [...expRaw].map((c) => expMap[c] || "").join("")
      : expRaw;
    const exp = parseInt(expStr, 10);
    if (Number.isFinite(coef) && Number.isFinite(exp)) {
      return { cfu_per_ml: coef * Math.pow(10, exp), semi_quant: "NONE" };
    }
  }
  const tenUnicode = s.match(/^10\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/);
  if (tenUnicode) {
    const expMap: Record<string, string> = {
      "⁰": "0",
      "¹": "1",
      "²": "2",
      "³": "3",
      "⁴": "4",
      "⁵": "5",
      "⁶": "6",
      "⁷": "7",
      "⁸": "8",
      "⁹": "9",
    };
    const expStr = [...tenUnicode[1]].map((c) => expMap[c] || "").join("");
    const exp = parseInt(expStr, 10);
    if (Number.isFinite(exp)) {
      return { cfu_per_ml: Math.pow(10, exp), semi_quant: "NONE" };
    }
  }
  const sci = s.match(/(\d+(?:[.,]\d+)?)\s*[eE]\s*([+-]?\d+)/);
  if (sci) {
    const n = parseFloat(sci[1].replace(",", ".") + "e" + sci[2]);
    if (Number.isFinite(n)) return { cfu_per_ml: n, semi_quant: "NONE" };
  }
  const plain = s.replace(/[^\d.,]/g, "").replace(",", ".");
  if (plain && /^\d+(\.\d+)?$/.test(plain)) {
    const n = parseFloat(plain);
    if (Number.isFinite(n) && n >= 100) {
      return { cfu_per_ml: n, semi_quant: "NONE" };
    }
  }
  return { cfu_per_ml: null, semi_quant: "NONE" };
}

export function inferPneuLabSpecimenFromBenhPham(
  benhPham: string | null | undefined,
): PneuLabSpecimen {
  const raw = String(benhPham || "").toLowerCase();
  if (!raw) return "NONE";
  if (/máu|mau\b|blood/.test(raw)) return "BLOOD";
  if (/màng phổi|mang phoi|pleural|pleura/.test(raw)) return "PLEURAL";
  if (/mô phổi|mo phoi|lung tissue|sinh thiết phổi/.test(raw)) return "LUNG_TISSUE";
  if (/\bpbal\b/.test(raw)) return "PBAL";
  if (/\bbal\b|rửa phế nang|rua phe nang/.test(raw)) return "BAL";
  if (/\bpsb\b|bàn chải|ban chai/.test(raw)) return "PSB";
  if (/\beta\b|nội khí|noi khi|endotrach/.test(raw)) return "ETA";
  if (/đờm|dorm|sputum/.test(raw)) return "SPUTUM";
  if (/hô hấp|ho hap|lrt|phế quản|phe quan/.test(raw)) return "OTHER_LRT";
  return "NONE";
}

/** Đổ fact lab từ ô XN lưới BA / LIS. */
export function labFactsFromXnCell(
  xn: {
    benh_pham?: string | null;
    vi_khuan?: string | null;
    so_luong?: string | null;
  } | null,
): Pick<
  PneuLabFacts,
  | "pneu_lab_specimen"
  | "pneu_lab_organism"
  | "pneu_lab_cfu_per_ml"
  | "pneu_lab_semi_quant"
  | "pneu_lab_table3_positive"
> {
  if (!xn) {
    return {
      pneu_lab_specimen: "NONE",
      pneu_lab_organism: "",
      pneu_lab_cfu_per_ml: null,
      pneu_lab_semi_quant: "NONE",
      pneu_lab_table3_positive: false,
    };
  }
  const organism = String(xn.vi_khuan || "").trim();
  const qty = parsePneuSoLuong(xn.so_luong);
  const specimen = inferPneuLabSpecimenFromBenhPham(xn.benh_pham);
  return {
    pneu_lab_specimen: specimen,
    pneu_lab_organism: organism === "—" ? "" : organism,
    pneu_lab_cfu_per_ml: qty.cfu_per_ml,
    pneu_lab_semi_quant: qty.semi_quant,
    pneu_lab_table3_positive: isTable3Organism(organism),
  };
}

/**
 * Suy tier vi sinh PNU từ fact lab (lab-first). Không đánh giá lâm sàng/hình ảnh.
 */
export function derivePneuLabTier(facts: PneuLabFacts): PneuLabTierResult {
  const reasons: string[] = [];
  const table3 = derivePneuTable3Positive(facts);
  const ic = derivePneuImmunocompromised(facts);
  const usedLab = hasAnyLabFact(facts);

  if (!usedLab) {
    const legacy = facts.microbiology_evidence || "NONE";
    if (legacy === "PNU3") {
      return {
        tier: "PNU3",
        has_qualifying_lab: true,
        lab_excluded: false,
        reasons: ["Legacy: chọn PNU3 (chưa nhập chi tiết lab)."],
        used_lab_facts: false,
        table3_positive: false,
        immunocompromised: true,
      };
    }
    if (legacy === "PNU2") {
      return {
        tier: "PNU2",
        has_qualifying_lab: true,
        lab_excluded: false,
        reasons: ["Legacy: chọn PNU2 (chưa nhập chi tiết lab)."],
        used_lab_facts: false,
        table3_positive: false,
        immunocompromised: false,
      };
    }
    return {
      tier: "NONE",
      has_qualifying_lab: false,
      lab_excluded: false,
      reasons: ["Chưa có lab đạt ngưỡng → giữ PNU1 nếu đủ lâm sàng + hình ảnh."],
      used_lab_facts: false,
      table3_positive: false,
      immunocompromised: false,
    };
  }

  const specimen = facts.pneu_lab_specimen || "NONE";
  const organism = (facts.pneu_lab_organism || "").trim();
  const ventDays = Number(facts.vent_days) || 0;
  const sterileSite =
    specimen === "BLOOD" || specimen === "PLEURAL" || specimen === "LUNG_TISSUE";

  if (table3) {
    const atoms: string[] = [];
    if (facts.pneu_t3_influenza) atoms.push("Influenza");
    if (facts.pneu_t3_rsv) atoms.push("RSV");
    if (facts.pneu_t3_other_virus) atoms.push("virus khác");
    if (facts.pneu_t3_legionella) atoms.push("Legionella");
    if (facts.pneu_t3_mycoplasma) atoms.push("Mycoplasma");
    if (facts.pneu_t3_chlamydia) atoms.push("Chlamydia");
    if (facts.pneu_t3_bordetella) atoms.push("Bordetella");
    if (atoms.length) {
      reasons.push(`Table 3 (+): ${atoms.join(", ")}.`);
    } else if (isTable3Organism(organism)) {
      reasons.push(`Table 3 từ tác nhân: ${organism}.`);
    } else {
      reasons.push("Table 3: virus / Legionella / kháng nguyên hô hấp (+).");
    }
  }
  if (facts.pneu_lab_histopath_positive) {
    reasons.push("Mô bệnh học: áp xe / xâm nhập nấm / PMN phù hợp viêm phổi.");
  }
  if (facts.pneu_lab_bal_intracellular_ge_5pct) {
    reasons.push("BAL: ≥5% bạch cầu có vi khuẩn nội bào.");
  }

  let table2Culture = false;
  let labExcluded = false;

  if (specimen === "BLOOD" && organism) {
    table2Culture = true;
    reasons.push(`Cấy máu (+): ${organism}.`);
  } else if (specimen === "PLEURAL" && organism) {
    table2Culture = true;
    reasons.push(`Dịch màng phổi (+): ${organism}.`);
  } else if (specimen === "LUNG_TISSUE") {
    if (organism || cfuMeetsSpecimen("LUNG_TISSUE", facts.pneu_lab_cfu_per_ml, ventDays)) {
      table2Culture = true;
      reasons.push("Mô phổi (+)/định lượng ≥10⁴ CFU/g.");
    }
  } else if (LRT_QUANT.has(specimen) || specimen === "SPUTUM") {
    const banned = isBannedLrtOrganism(organism, !!facts.pneu_lab_is_normal_flora);
    if (banned && !sterileSite) {
      labExcluded = true;
      reasons.push(
        `Loại khỏi PNU2/3: ${facts.pneu_lab_is_normal_flora ? "flora bình thường/hỗn hợp" : organism || "tác nhân cấm"} từ ${specimen} (Candida/CoNS/Enterococcus/flora).`,
      );
    } else if (specimen === "SPUTUM" && !table3) {
      reasons.push(
        "Cấy đờm (+): không đủ Table 2 (cần máu/màng phổi/BAL·PBAL·PSB·ETA đạt ngưỡng hoặc Table 3).",
      );
    } else if (specimen !== "SPUTUM") {
      const cfuOk = cfuMeetsSpecimen(specimen, facts.pneu_lab_cfu_per_ml, ventDays);
      const semiOk = SEMI_QUALIFYING.has(facts.pneu_lab_semi_quant || "NONE");
      if (cfuOk || semiOk) {
        table2Culture = true;
        if (cfuOk) {
          reasons.push(`${specimen} định lượng đạt ngưỡng (${facts.pneu_lab_cfu_per_ml} CFU/ml).`);
        } else {
          reasons.push(`${specimen} bán định lượng Moderate/Heavy/2–4+.`);
        }
      } else if (organism && !table3) {
        reasons.push(
          `${specimen} có ${organism} nhưng chưa đạt CFU/bán định lượng Table 2 → không nâng PNU2.`,
        );
      }
    }
  }

  const table2Or3 =
    table2Culture ||
    table3 ||
    !!facts.pneu_lab_histopath_positive ||
    !!facts.pneu_lab_bal_intracellular_ge_5pct;

  const candidaMatch = !!facts.pneu_candida_blood_and_lrt_match;
  if (candidaMatch) {
    reasons.push("PNU3 ngoại lệ: Candida máu khớp LRT trong IWP.");
  }

  const nonCandidaFungusLrt =
    !sterileSite &&
    (LRT_QUANT.has(specimen) || specimen === "SPUTUM") &&
    isNonCandidaFungus(organism) &&
    !facts.pneu_lab_is_normal_flora;

  if (nonCandidaFungusLrt) {
    reasons.push(`Nấm không-Candida từ LRT: ${organism}.`);
  }

  if (ic) {
    const icAtoms: string[] = [];
    if (facts.pneu_ic_neutropenia) icAtoms.push("giảm bạch cầu hạt");
    if (facts.pneu_ic_leukemia_lymphoma) icAtoms.push("ung thư máu/lympho");
    if (facts.pneu_ic_hiv_cd4_lt_200) icAtoms.push("HIV CD4<200");
    if (facts.pneu_ic_splenectomy) icAtoms.push("cắt lách");
    if (facts.pneu_ic_solid_organ_or_hsct) icAtoms.push("ghép tạng/HSCT");
    if (facts.pneu_ic_chemotherapy) icAtoms.push("hóa chất");
    if (facts.pneu_ic_steroid_ge_14d) icAtoms.push("corticoid ≥14 ngày");
    if (icAtoms.length) reasons.push(`Miễn dịch suy giảm: ${icAtoms.join(", ")}.`);
  }

  if (ic && (table2Or3 || candidaMatch || nonCandidaFungusLrt)) {
    return {
      tier: "PNU3",
      has_qualifying_lab: true,
      lab_excluded: labExcluded && !candidaMatch && !table2Or3,
      reasons: [...reasons, "→ PNU3."],
      used_lab_facts: true,
      table3_positive: table3,
      immunocompromised: true,
    };
  }

  if (table2Or3) {
    return {
      tier: "PNU2",
      has_qualifying_lab: true,
      lab_excluded: false,
      reasons,
      used_lab_facts: true,
      table3_positive: table3,
      immunocompromised: ic,
    };
  }

  if (candidaMatch) {
    return {
      tier: "NONE",
      has_qualifying_lab: false,
      lab_excluded: false,
      reasons: [
        ...reasons,
        "Có khớp Candida máu+LRT nhưng thiếu cửa suy giảm miễn dịch → chưa PNU3; không dùng làm PNU2.",
      ],
      used_lab_facts: true,
      table3_positive: table3,
      immunocompromised: ic,
    };
  }

  return {
    tier: "NONE",
    has_qualifying_lab: false,
    lab_excluded: labExcluded,
    reasons:
      reasons.length > 0
        ? reasons
        : ["Lab chưa đạt Table 2/3 → PNU1 nếu đủ lâm sàng + hình ảnh."],
    used_lab_facts: true,
    table3_positive: table3,
    immunocompromised: ic,
  };
}

/** Đồng bộ dropdown legacy + cờ gộp từ atom/lab. */
export function syncMicrobiologyEvidenceFromLab(
  facts: PneuLabFacts,
): "NONE" | "PNU2" | "PNU3" {
  return derivePneuLabTier(facts).tier;
}

export type ApplyPneuLabFlagsOpts = {
  /** Form vừa sửa atom Table 3 — ghi đè cờ gộp (tránh sticky khi bỏ tick). */
  resetTable3Aggregate?: boolean;
  /** Form vừa sửa atom miễn dịch — ghi đè cờ gộp. */
  resetIcAggregate?: boolean;
};

/**
 * Đồng bộ microbiology_evidence + cờ gộp Table3/IC.
 * Engine/prefill: không reset → giữ legacy gộp.
 * Form tick atom: truyền reset* → gộp = atom/organism hiện tại.
 */
export function applyPneuLabDerivedFlags<T extends PneuLabFacts>(
  data: T,
  opts?: ApplyPneuLabFlagsOpts,
): T {
  const table3Atoms = table3FromAtomsOrOrganism(data);
  const icAtoms = icFromAtoms(data);
  const syncedTable3 = opts?.resetTable3Aggregate
    ? table3Atoms
    : table3Atoms || !!data.pneu_lab_table3_positive;
  const syncedIc = opts?.resetIcAggregate
    ? icAtoms
    : icAtoms || !!data.pneu_is_immunocompromised;

  const r = derivePneuLabTier({
    ...data,
    pneu_lab_table3_positive: syncedTable3,
    pneu_is_immunocompromised: syncedIc,
  });

  return {
    ...data,
    microbiology_evidence: r.tier,
    pneu_lab_table3_positive: syncedTable3,
    pneu_is_immunocompromised: syncedIc,
  };
}
