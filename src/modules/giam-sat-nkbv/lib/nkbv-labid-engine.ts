/**
 * LabID Event NHSN (W3) — MDRO/CDI surveillance theo mẫu lab, KHÔNG dùng IWP/DOE lâm sàng.
 * Phân biệt với cờ MDRO vận hành trên nkbv_fact_vi_sinh (nkbv-mdro.ts).
 */

import type { NkbvMdroPhenotype } from "./nkbv-mdro";

export type LabidOrganismCategory =
  | "MRSA"
  | "MSSA"
  | "VRE"
  | "CRE"
  | "CEPH_R_KLEB"
  | "CDI"
  | "OTHER";

export type LabidSpecimenClass = "BLOOD" | "STOOL" | "OTHER";

export type LabidEventInput = {
  phenotype: NkbvMdroPhenotype | null;
  organismName: string;
  specimenClass: LabidSpecimenClass;
  /** Ngày lấy mẫu (ISO date). */
  collectionDate: string;
  /** Đã có LabID cùng phenotype trên cùng BA trong 14 ngày trước (duplicate window). */
  priorSamePhenotypeWithin14d?: boolean;
  /** CDI: test toxin/NAAT dương tính (không chỉ nuôi cấy). */
  cdiAssayPositive?: boolean;
};

export type LabidEventResult = {
  isEvent: boolean;
  eventType: string;
  reason: string;
  organismCategory: LabidOrganismCategory;
};

function classifyOrganism(
  phenotype: NkbvMdroPhenotype | null,
  organismName: string,
): LabidOrganismCategory {
  if (phenotype === "MRSA") return "MRSA";
  if (phenotype === "VRE") return "VRE";
  if (phenotype === "CRE") return "CRE";
  if (phenotype === "CEPH_R_KLEB") return "CEPH_R_KLEB";
  if (phenotype === "CDI") return "CDI";
  const t = organismName.toLowerCase();
  if (t.includes("aureus") && (t.includes("methicillin") || t.includes("mrsa"))) return "MRSA";
  if (t.includes("aureus")) return "MSSA";
  if (t.includes("difficile") || t.includes("clostridioides")) return "CDI";
  return "OTHER";
}

/**
 * Đánh giá LabID Event tối thiểu (pilot W3):
 * - MRSA/VRE/CRE/CephR: máu dương tính + phenotype → LabID Event (trừ trùng 14 ngày).
 * - CDI: phân + assay (+) → LabID CDI (trừ trùng 14 ngày).
 */
export function evaluateLabidEvent(input: LabidEventInput): LabidEventResult {
  const cat = classifyOrganism(input.phenotype, input.organismName);
  const date = String(input.collectionDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      isEvent: false,
      eventType: "INVALID",
      reason: "Thiếu ngày lấy mẫu hợp lệ.",
      organismCategory: cat,
    };
  }

  if (input.priorSamePhenotypeWithin14d) {
    return {
      isEvent: false,
      eventType: "DUPLICATE_14D",
      reason: "Trùng LabID cùng phenotype trong cửa sổ 14 ngày — không tạo event mới.",
      organismCategory: cat,
    };
  }

  if (cat === "CDI") {
    if (input.specimenClass !== "STOOL") {
      return {
        isEvent: false,
        eventType: "NO_EVENT",
        reason: "LabID CDI chỉ tính trên mẫu phân.",
        organismCategory: cat,
      };
    }
    if (!input.cdiAssayPositive && input.phenotype !== "CDI") {
      return {
        isEvent: false,
        eventType: "NO_EVENT",
        reason: "CDI cần assay toxin/NAAT dương tính (hoặc phenotype CDI đã gắn).",
        organismCategory: cat,
      };
    }
    return {
      isEvent: true,
      eventType: "LABID_CDI",
      reason: "LabID CDI — mẫu phân + assay/phenotype dương tính.",
      organismCategory: cat,
    };
  }

  if (cat === "MRSA" || cat === "VRE" || cat === "CRE" || cat === "CEPH_R_KLEB") {
    if (input.specimenClass !== "BLOOD") {
      return {
        isEvent: false,
        eventType: "NO_EVENT",
        reason: `LabID ${cat} (pilot) chỉ tạo event từ mẫu máu.`,
        organismCategory: cat,
      };
    }
    return {
      isEvent: true,
      eventType: `LABID_${cat}`,
      reason: `LabID ${cat} — cấy máu dương tính đạt định nghĩa LabID NHSN (pilot).`,
      organismCategory: cat,
    };
  }

  return {
    isEvent: false,
    eventType: "NO_EVENT",
    reason: "Không đủ điều kiện LabID Event (thiếu phenotype MDRO/CDI hoặc bệnh phẩm không hợp lệ).",
    organismCategory: cat,
  };
}

export function inferSpecimenClassFromBenhPham(raw: string | null | undefined): LabidSpecimenClass {
  const t = String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!t) return "OTHER";
  if (t.includes("mau") || t.includes("blood") || t.includes("huyet")) return "BLOOD";
  if (t.includes("phan") || t.includes("stool") || t.includes("feces")) return "STOOL";
  return "OTHER";
}
