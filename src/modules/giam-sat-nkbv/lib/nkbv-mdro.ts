/** Phenotype MDRO vận hành (không phải LabID NHSN đầy đủ). */

export const NKBV_MDRO_PHENOTYPES = [
  "MRSA",
  "VRE",
  "CRE",
  "CEPH_R_KLEB",
  "CDI",
  "OTHER_MDRO",
] as const;

export type NkbvMdroPhenotype = (typeof NKBV_MDRO_PHENOTYPES)[number];

export type NkbvMdroSource = "MANUAL" | "LIS" | "RULE";

export const NKBV_MDRO_PHENOTYPE_LABELS: Record<NkbvMdroPhenotype, string> = {
  MRSA: "MRSA",
  VRE: "VRE",
  CRE: "CRE",
  CEPH_R_KLEB: "CephR-Klebsiella",
  CDI: "CDI",
  OTHER_MDRO: "Đa kháng khác",
};

/** Mã bảng kiểm GSC liên quan MDRO / cách ly. */
export const GSC_BK_MDRO = "BM.31.03";
export const GSC_BK_ISOLATION = "BM.14.01";

export function normalizeMdroPhenotype(raw: string | null | undefined): NkbvMdroPhenotype | null {
  const t = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (!t) return null;
  if ((NKBV_MDRO_PHENOTYPES as readonly string[]).includes(t)) return t as NkbvMdroPhenotype;
  if (t.includes("MRSA") || t.includes("STAAUR_MR")) return "MRSA";
  if (t.includes("VRE") || t.includes("ENTEROCOCCUS_VRE")) return "VRE";
  if (t.includes("CRE") || t.includes("CARBAPENEM")) return "CRE";
  if (t.includes("CEPH") || t.includes("ESBL_KLEB")) return "CEPH_R_KLEB";
  if (t.includes("CDI") || t.includes("CLOSTRIDIOIDES") || t.includes("DIFFICILE")) return "CDI";
  if (t.includes("MDRO") || t.includes("DA_KHANG") || t.includes("ĐA KHÁNG")) return "OTHER_MDRO";
  return null;
}

export function parseMdroFlag(raw: string | boolean | null | undefined): boolean {
  if (typeof raw === "boolean") return raw;
  const t = String(raw || "")
    .trim()
    .toLowerCase();
  if (!t) return false;
  return ["1", "true", "yes", "y", "có", "co", "x", "mdro", "đa kháng", "da khang"].includes(t);
}

/** Gợi ý phenotype từ tên tác nhân — chỉ khi keyword rõ (RULE); không đoán AST. */
export function inferMdroPhenotypeFromOrganism(tacNhan: string): NkbvMdroPhenotype | null {
  const t = String(tacNhan || "").toLowerCase();
  if (!t) return null;
  if (t.includes("mrsa") || (t.includes("aureus") && t.includes("methicillin"))) return "MRSA";
  if (t.includes("vre") || (t.includes("enterococcus") && t.includes("vancomycin"))) return "VRE";
  if (t.includes("cre") || t.includes("carbapenemase") || t.includes("ndm") || t.includes("oxa-48")) {
    return "CRE";
  }
  if (t.includes("c. difficile") || t.includes("clostridioides") || t.includes("difficile")) {
    return "CDI";
  }
  return null;
}

export function buildGscMdroDeepLink(input: {
  bangKiemMa: typeof GSC_BK_MDRO | typeof GSC_BK_ISOLATION;
  khoaId?: string | null;
  maBenhAn?: string | null;
  maBenhNhan?: string | null;
  tenBenhNhan?: string | null;
}): string {
  const q = new URLSearchParams();
  q.set("bk", input.bangKiemMa);
  if (input.khoaId) q.set("khoa_id", input.khoaId);
  if (input.maBenhAn) q.set("ma_benh_an", input.maBenhAn);
  if (input.maBenhNhan) q.set("ma_nguoi_benh", input.maBenhNhan);
  if (input.tenBenhNhan) q.set("ten_nguoi_benh", input.tenBenhNhan);
  q.set("bo_sung_nb", "1");
  return `/giam-sat-chung/tuan-thu?${q.toString()}`;
}
