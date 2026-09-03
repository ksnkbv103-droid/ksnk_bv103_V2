/**
 * Ma trận tiêu chuẩn CDC theo hội chứng — gắn mốc timeline ∈ cửa sổ làm bằng chứng.
 */

import type { NkbvChecklistTypeCode } from "./nkbv-loai-labels";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";

/** Khóa yếu tố tiêu chuẩn — dùng khi thêm mốc thủ công lên timeline. */
export type NkbvCriteriaKey =
  | "index_specimen"
  | "urine_culture"
  | "blood_culture"
  | "resp_culture"
  | "wound_culture"
  | "imaging_chest"
  | "fever_or_wbc"
  | "fever"
  | "chills"
  | "hypotension"
  | "bsi_hypothermia"
  | "bsi_apnea"
  | "bsi_bradycardia"
  | "suprapubic_pain"
  | "cva_pain"
  | "dysuria"
  | "urgency"
  | "frequency"
  | "infant_hypothermia"
  | "infant_apnea"
  | "infant_bradycardia"
  | "infant_lethargy"
  | "infant_vomiting"
  | "purulent_sputum"
  | "new_purulent_sputum"
  | "increased_secretions"
  | "cough"
  | "dyspnea"
  | "tachypnea"
  | "rales"
  | "worsening_gas"
  | "altered_mental_ge70"
  | "procedure_surgery"
  | "purulent_drainage"
  | "wound_opened"
  | "abscess_imaging"
  | "physician_diagnosis"
  | "obgyn_abdominal_pain"
  | "device_foley"
  | "device_central_line"
  | "device_ventilator";

export type CriteriaRowDef = {
  key: NkbvCriteriaKey;
  label: string;
  group: string;
  /** Bắt buộc cho “đủ mở form / gần chốt” (pilot). */
  requiredHint: boolean;
};

export type CriteriaRowState = CriteriaRowDef & {
  status: "PRESENT" | "MISSING" | "OUT_OF_WINDOW";
  evidenceDate: string | null;
  evidenceLabel: string | null;
  evidenceMilestoneId: string | null;
};

/** Catalog thêm mốc = yếu tố tiêu chuẩn (không phải ghi chú tự do). */
export const NKBV_CRITERIA_ADD_CATALOG: Array<{
  criteriaKey: NkbvCriteriaKey;
  milestoneKind: "IMAGING_CHEST" | "SYMPTOM" | "LAB_OTHER" | "PROCEDURE_SURGERY";
  title: string;
  gates: NkbvChecklistTypeCode[];
}> = [
  {
    criteriaKey: "imaging_chest",
    milestoneKind: "IMAGING_CHEST",
    title: "XQ/CT phổi thâm nhiễm / đông đặc / hang",
    gates: ["HAP", "VAP"],
  },
  {
    criteriaKey: "fever_or_wbc",
    milestoneKind: "SYMPTOM",
    title: "Sốt > 38,0°C / hạ thân nhiệt < 36,0°C / WBC bất thường",
    gates: ["HAP", "VAP", "VAE"],
  },
  {
    criteriaKey: "fever",
    milestoneKind: "SYMPTOM",
    title: "Sốt > 38,0°C",
    gates: ["UTI", "BSI", "SSI"],
  },
  {
    criteriaKey: "chills",
    milestoneKind: "SYMPTOM",
    title: "Rét run (chills)",
    gates: ["BSI"],
  },
  {
    criteriaKey: "hypotension",
    milestoneKind: "SYMPTOM",
    title: "Tụt huyết áp",
    gates: ["BSI"],
  },
  {
    criteriaKey: "bsi_hypothermia",
    milestoneKind: "SYMPTOM",
    title: "Hạ thân nhiệt — ≤1 tuổi (LCBI 3)",
    gates: ["BSI"],
  },
  {
    criteriaKey: "bsi_apnea",
    milestoneKind: "SYMPTOM",
    title: "Ngưng thở — ≤1 tuổi (LCBI 3)",
    gates: ["BSI"],
  },
  {
    criteriaKey: "bsi_bradycardia",
    milestoneKind: "SYMPTOM",
    title: "Nhịp chậm — ≤1 tuổi (LCBI 3)",
    gates: ["BSI"],
  },
  {
    criteriaKey: "suprapubic_pain",
    milestoneKind: "SYMPTOM",
    title: "Đau hạ vị / trên xương mu",
    gates: ["UTI"],
  },
  {
    criteriaKey: "cva_pain",
    milestoneKind: "SYMPTOM",
    title: "Đau góc sườn — thắt lưng (CVA)",
    gates: ["UTI"],
  },
  {
    criteriaKey: "dysuria",
    milestoneKind: "SYMPTOM",
    title: "Tiểu buốt (không dùng khi Foley tại chỗ)",
    gates: ["UTI"],
  },
  {
    criteriaKey: "urgency",
    milestoneKind: "SYMPTOM",
    title: "Tiểu gấp (không dùng khi Foley tại chỗ)",
    gates: ["UTI"],
  },
  {
    criteriaKey: "frequency",
    milestoneKind: "SYMPTOM",
    title: "Tiểu rắt (không dùng khi Foley tại chỗ)",
    gates: ["UTI"],
  },
  {
    criteriaKey: "infant_hypothermia",
    milestoneKind: "SYMPTOM",
    title: "Hạ thân nhiệt (<36°C) — ≤1 tuổi",
    gates: ["UTI"],
  },
  {
    criteriaKey: "infant_apnea",
    milestoneKind: "SYMPTOM",
    title: "Ngưng thở (apnea) — ≤1 tuổi",
    gates: ["UTI"],
  },
  {
    criteriaKey: "infant_bradycardia",
    milestoneKind: "SYMPTOM",
    title: "Nhịp chậm (bradycardia) — ≤1 tuổi",
    gates: ["UTI"],
  },
  {
    criteriaKey: "infant_lethargy",
    milestoneKind: "SYMPTOM",
    title: "Lethargy — ≤1 tuổi",
    gates: ["UTI"],
  },
  {
    criteriaKey: "infant_vomiting",
    milestoneKind: "SYMPTOM",
    title: "Nôn — ≤1 tuổi",
    gates: ["UTI"],
  },
  {
    criteriaKey: "purulent_sputum",
    milestoneKind: "SYMPTOM",
    title: "Đờm mủ / đờm đục mới",
    gates: ["HAP", "VAP"],
  },
  {
    criteriaKey: "new_purulent_sputum",
    milestoneKind: "SYMPTOM",
    title: "Thay đổi tính chất đờm (mủ)",
    gates: ["HAP", "VAP"],
  },
  {
    criteriaKey: "increased_secretions",
    milestoneKind: "SYMPTOM",
    title: "Tăng tiết đờm / cần hút nhiều hơn",
    gates: ["HAP", "VAP"],
  },
  {
    criteriaKey: "cough",
    milestoneKind: "SYMPTOM",
    title: "Ho mới / tăng",
    gates: ["HAP", "VAP"],
  },
  {
    criteriaKey: "dyspnea",
    milestoneKind: "SYMPTOM",
    title: "Khó thở",
    gates: ["HAP", "VAP"],
  },
  {
    criteriaKey: "tachypnea",
    milestoneKind: "SYMPTOM",
    title: "Thở nhanh",
    gates: ["HAP", "VAP"],
  },
  {
    criteriaKey: "rales",
    milestoneKind: "SYMPTOM",
    title: "Ran phổi / tiếng thở bất thường",
    gates: ["HAP", "VAP"],
  },
  {
    criteriaKey: "worsening_gas",
    milestoneKind: "SYMPTOM",
    title: "Giảm oxy hóa / tăng nhu cầu O₂",
    gates: ["HAP", "VAP", "VAE"],
  },
  {
    criteriaKey: "altered_mental_ge70",
    milestoneKind: "SYMPTOM",
    title: "Lú lẫn (≥70 tuổi)",
    gates: ["HAP", "VAP"],
  },
  {
    criteriaKey: "procedure_surgery",
    milestoneKind: "PROCEDURE_SURGERY",
    title: "Ngày phẫu thuật (Day 1 SSI)",
    gates: ["SSI"],
  },
  {
    criteriaKey: "purulent_drainage",
    milestoneKind: "SYMPTOM",
    title: "Vết mổ chảy mủ",
    gates: ["SSI"],
  },
  {
    criteriaKey: "wound_opened",
    milestoneKind: "SYMPTOM",
    title: "Mở vết mổ chủ động + cấy (+)",
    gates: ["SSI"],
  },
  {
    criteriaKey: "abscess_imaging",
    milestoneKind: "IMAGING_CHEST",
    title: "Áp xe / CĐHA ổ nhiễm (SSI organ)",
    gates: ["SSI"],
  },
  {
    criteriaKey: "physician_diagnosis",
    milestoneKind: "SYMPTOM",
    title: "BS chẩn đoán SSI nông",
    gates: ["SSI"],
  },
  {
    criteriaKey: "obgyn_abdominal_pain",
    milestoneKind: "SYMPTOM",
    title: "Đau bụng sau mổ (CSEC/HYST/VHYS)",
    gates: ["SSI"],
  },
  {
    criteriaKey: "device_foley",
    milestoneKind: "SYMPTOM",
    title: "Ống thông tiểu lưu (Foley)",
    gates: ["UTI"],
  },
  {
    criteriaKey: "device_ventilator",
    milestoneKind: "SYMPTOM",
    title: "Thở máy xâm lấn",
    gates: ["HAP", "VAP", "VAE"],
  },
  {
    criteriaKey: "device_central_line",
    milestoneKind: "SYMPTOM",
    title: "Đường truyền trung tâm (CVC)",
    gates: ["BSI"],
  },
];

/** Can thiệp xâm lấn — lưu từng ngày trên timeline BA (không dùng sổ đăng ký cho lưới). */
export const DEVICE_CRITERIA_KEYS = [
  "device_foley",
  "device_ventilator",
  "device_central_line",
] as const;

export type DeviceCriteriaKey = (typeof DEVICE_CRITERIA_KEYS)[number];

export function isDeviceCriteriaKey(key: string | null | undefined): key is DeviceCriteriaKey {
  return (
    key === "device_foley" ||
    key === "device_ventilator" ||
    key === "device_central_line"
  );
}

function matrixForGate(gate: NkbvChecklistTypeCode): CriteriaRowDef[] {
  if (gate === "UTI") {
    return [
      { key: "urine_culture", label: "Cấy nước tiểu ≥10⁵ CFU/ml, ≤2 loài (không nấm)", group: "Index / Lab", requiredHint: true },
      { key: "fever", label: "Sốt > 38,0°C", group: "Triệu chứng ∈ IWP", requiredHint: false },
      { key: "suprapubic_pain", label: "Đau hạ vị / trên xương mu", group: "Triệu chứng ∈ IWP", requiredHint: false },
      { key: "cva_pain", label: "Đau góc sườn — thắt lưng (CVA)", group: "Triệu chứng ∈ IWP", requiredHint: false },
      { key: "dysuria", label: "Tiểu buốt (không Foley)", group: "Voiding", requiredHint: false },
      { key: "urgency", label: "Tiểu gấp (không Foley)", group: "Voiding", requiredHint: false },
      { key: "frequency", label: "Tiểu rắt (không Foley)", group: "Voiding", requiredHint: false },
      { key: "infant_hypothermia", label: "Hạ thân nhiệt — ≤1 tuổi", group: "SUTI 2", requiredHint: false },
      { key: "infant_apnea", label: "Ngưng thở — ≤1 tuổi", group: "SUTI 2", requiredHint: false },
      { key: "infant_bradycardia", label: "Nhịp chậm — ≤1 tuổi", group: "SUTI 2", requiredHint: false },
      { key: "infant_lethargy", label: "Lethargy — ≤1 tuổi", group: "SUTI 2", requiredHint: false },
      { key: "infant_vomiting", label: "Nôn — ≤1 tuổi", group: "SUTI 2", requiredHint: false },
      { key: "device_foley", label: "Foley >2 ngày lịch + hiện diện DOE/DOE−1 → CAUTI", group: "Device", requiredHint: false },
      { key: "blood_culture", label: "Cấy máu khớp (ABUTI / Secondary) nếu có", group: "Liên quan máu", requiredHint: false },
    ];
  }
  if (gate === "HAP" || gate === "VAP") {
    return [
      { key: "index_specimen", label: "Index: cấy hô hấp hoặc ngày phim", group: "Index", requiredHint: true },
      { key: "imaging_chest", label: "XQ/CT thâm nhiễm mới / đông đặc / hang ∈ IWP", group: "Hình ảnh (bắt buộc)", requiredHint: true },
      { key: "fever_or_wbc", label: "Sốt > 38,0°C / hạ thân nhiệt < 36,0°C / WBC bất thường", group: "Toàn thân ∈ IWP", requiredHint: true },
      { key: "altered_mental_ge70", label: "Lú lẫn (≥70 tuổi) — nếu áp dụng", group: "Toàn thân ∈ IWP", requiredHint: false },
      { key: "cough", label: "Ho mới / tăng", group: "Hô hấp tại chỗ (≥2)", requiredHint: false },
      { key: "dyspnea", label: "Khó thở", group: "Hô hấp tại chỗ (≥2)", requiredHint: false },
      { key: "tachypnea", label: "Thở nhanh", group: "Hô hấp tại chỗ (≥2)", requiredHint: false },
      { key: "rales", label: "Ran phổi", group: "Hô hấp tại chỗ (≥2)", requiredHint: false },
      { key: "purulent_sputum", label: "Đờm mủ / đờm đục", group: "Hô hấp tại chỗ (≥2)", requiredHint: false },
      { key: "new_purulent_sputum", label: "Thay đổi tính chất đờm", group: "Hô hấp tại chỗ (≥2)", requiredHint: false },
      { key: "increased_secretions", label: "Tăng tiết đờm / hút nhiều hơn", group: "Hô hấp tại chỗ (≥2)", requiredHint: false },
      { key: "worsening_gas", label: "Giảm oxy hóa / tăng O₂", group: "Hô hấp tại chỗ (≥2)", requiredHint: false },
      { key: "resp_culture", label: "Cấy đờm/ETA/BAL (PNU2)", group: "Vi sinh PNU2", requiredHint: false },
      { key: "blood_culture", label: "Cấy máu trong IWP (PNU2)", group: "Vi sinh PNU2", requiredHint: false },
      { key: "device_ventilator", label: "Vent → VAP vs Non-VAP (HAP)", group: "Device", requiredHint: false },
    ];
  }
  if (gate === "BSI") {
    return [
      { key: "blood_culture", label: "Cấy máu dương tính (Index / DOE)", group: "Index / Lab", requiredHint: true },
      { key: "fever", label: "Sốt > 38,0°C", group: "LCBI 2", requiredHint: false },
      { key: "chills", label: "Rét run (chills)", group: "LCBI 2", requiredHint: false },
      { key: "hypotension", label: "Tụt huyết áp", group: "LCBI 2", requiredHint: false },
      { key: "bsi_hypothermia", label: "Hạ thân nhiệt — ≤1 tuổi", group: "LCBI 3", requiredHint: false },
      { key: "bsi_apnea", label: "Ngưng thở — ≤1 tuổi", group: "LCBI 3", requiredHint: false },
      { key: "bsi_bradycardia", label: "Nhịp chậm — ≤1 tuổi", group: "LCBI 3", requiredHint: false },
      { key: "device_central_line", label: "Central line >2 ngày + DOE/DOE−1 → CLABSI", group: "Device", requiredHint: false },
    ];
  }
  if (gate === "SSI") {
    return [
      { key: "procedure_surgery", label: "Ngày phẫu thuật (Day 1 khung SP 30/90)", group: "Index / SP", requiredHint: true },
      { key: "wound_culture", label: "Cấy dịch / mô vết mổ", group: "Lab", requiredHint: false },
      { key: "purulent_drainage", label: "Chảy mủ từ vết mổ", group: "Tiêu chuẩn độ sâu", requiredHint: false },
      { key: "wound_opened", label: "Mở vết mổ chủ động + triệu chứng / cấy", group: "Tiêu chuẩn độ sâu", requiredHint: false },
      { key: "abscess_imaging", label: "Áp xe / CĐHA / GPB", group: "Tiêu chuẩn độ sâu", requiredHint: false },
      { key: "physician_diagnosis", label: "BS chẩn đoán SSI nông", group: "Tiêu chuẩn độ sâu", requiredHint: false },
      { key: "obgyn_abdominal_pain", label: "Đau bụng sau mổ (CSEC/HYST/VHYS)", group: "Organ/Space OB/GYN", requiredHint: false },
      { key: "fever", label: "Sốt > 38,0°C", group: "Triệu chứng", requiredHint: false },
    ];
  }
  if (gate === "VAE") {
    return [
      { key: "device_ventilator", label: "Thở máy xâm lấn (≥4 ngày / Event Period)", group: "Device", requiredHint: true },
      { key: "worsening_gas", label: "Worsening PEEP/FiO₂ (chuỗi VAC)", group: "VAE Window", requiredHint: true },
      { key: "fever_or_wbc", label: "Sốt > 38,0°C hoặc hạ thân nhiệt < 36,0°C (IVAC)", group: "IVAC / PVAP", requiredHint: false },
      { key: "purulent_sputum", label: "Đờm mủ / cấy hô hấp (PVAP)", group: "IVAC / PVAP", requiredHint: false },
      { key: "resp_culture", label: "Cấy ETA/BAL (PVAP)", group: "IVAC / PVAP", requiredHint: false },
      { key: "blood_culture", label: "Cấy máu trong Event Period (Secondary PVAP)", group: "Secondary", requiredHint: false },
    ];
  }
  return [];
}

function criteriaKeysFromMilestone(m: BaTimelineMilestone): NkbvCriteriaKey[] {
  const keys: NkbvCriteriaKey[] = [];
  const ck = m.criteriaKey;
  if (ck) keys.push(ck);

  const kind = String(m.kind || "").toUpperCase();
  const specimen = String(m.loai_benh_pham || m.title || "").toUpperCase();

  if (kind === "IMAGING_CHEST" || ck === "imaging_chest") keys.push("imaging_chest");
  if (kind === "PROCEDURE_SURGERY" || ck === "procedure_surgery") keys.push("procedure_surgery");

  if (m.source === "LIS" || kind === "LIS") {
    if (/NƯỚC TIỂU|NUOC TIEU|URINE|TIỂU/.test(specimen)) keys.push("urine_culture", "index_specimen");
    if (/MÁU|MAU|BLOOD|HUYẾT/.test(specimen)) keys.push("blood_culture", "index_specimen");
    if (/ĐỜM|DORM|SPUTUM|ETA|BAL|PSB|HÔ HẤP|HO HAP/.test(specimen)) {
      keys.push("resp_culture", "index_specimen");
    }
    if (/VẾT MỔ|VET MO|WOUND|MỔ|MO /.test(specimen)) keys.push("wound_culture", "index_specimen");
  }

  if (m.source === "DEVICE") {
    if (kind.includes("FOLEY")) keys.push("device_foley");
    if (kind.includes("CENTRAL")) keys.push("device_central_line");
    if (kind.includes("VENTILATOR")) keys.push("device_ventilator");
  }

  // title/detail heuristics for symptom kinds
  const blob = `${m.title} ${m.detail || ""} ${ck || ""}`.toUpperCase();
  if (/SỐT|FEVER|WBC|BẠCH CẦU|HA THẤN|HẠ THÂN/.test(blob)) {
    keys.push("fever_or_wbc", "fever");
  }
  if (/RÉT RUN|RET RUN|CHILLS|RIGOR/.test(blob)) keys.push("chills");
  if (/TỤT HA|TUT HA|HYPOTENS|SHOCK/.test(blob)) keys.push("hypotension");
  if (/HẠ VỊ|XƯƠNG MU|SUPRAPUBIC/.test(blob)) keys.push("suprapubic_pain");
  if (/CVA|SƯỜN|THẮT LƯNG/.test(blob)) keys.push("cva_pain");
  if (/TIỂU BUỐT|DYSURIA/.test(blob)) keys.push("dysuria");
  if (/TIỂU GẤP|URGENCY/.test(blob)) keys.push("urgency");
  if (/TIỂU RẮT|FREQUENCY/.test(blob)) keys.push("frequency");
  if (/NGƯNG THỞ|NGUNG THO|APNEA/.test(blob)) keys.push("bsi_apnea", "infant_apnea");
  if (/NHỊP CHẬM|BRADYCARDIA/.test(blob)) keys.push("bsi_bradycardia", "infant_bradycardia");
  if (/LETHARGY|LỜ ĐỜ|NGỦ LỊM/.test(blob)) keys.push("infant_lethargy");
  if (/NÔN|VOMIT/.test(blob) && !/BUỒN NÔN/.test(blob)) keys.push("infant_vomiting");
  if (/ĐỜM MỦ|DORM MU|PURULENT/.test(blob)) keys.push("purulent_sputum", "new_purulent_sputum");
  if (/HO\b|COUGH/.test(blob)) keys.push("cough");
  if (/KHÓ THỞ|DYSPNEA/.test(blob)) keys.push("dyspnea");
  if (/THỞ NHANH|TACHYPNEA/.test(blob)) keys.push("tachypnea");
  if (/RAN |RALES|PHỔI/.test(blob) && !/XQ|CT|IMAGING/.test(blob)) keys.push("rales");
  if (/OXY|PEEP|FIO|GIẢM OXY/.test(blob)) keys.push("worsening_gas");
  if (/LÚ LẪN|AMS|ALTERED/.test(blob)) keys.push("altered_mental_ge70");
  if (/CHẢY MỦ|PURULENT DRAIN/.test(blob)) keys.push("purulent_drainage");
  if (/MỞ VẾT|OPENED/.test(blob)) keys.push("wound_opened");
  if (/ÁP XE|ABSCESS/.test(blob)) keys.push("abscess_imaging");
  if (/ĐAU BỤNG|OB.?GYN|CSEC|HYST|VHYS/.test(blob)) keys.push("obgyn_abdominal_pain");

  return Array.from(new Set(keys));
}

/**
 * Dựng trạng thái từng tiêu chí tại Index: quét mọi mốc timeline trong cửa sổ.
 */
export function buildCriteriaMatrixState(input: {
  gate: NkbvChecklistTypeCode;
  windowStart: string;
  windowEnd: string;
  indexMilestoneId: string;
  milestones: BaTimelineMilestone[];
}): CriteriaRowState[] {
  const defs = matrixForGate(input.gate);
  const start = input.windowStart.slice(0, 10);
  const end = input.windowEnd.slice(0, 10);

  const inWindow = input.milestones.filter((m) => {
    const d = m.date.slice(0, 10);
    if (!d) return false;
    // Device presence: insertion before/on end and not removed before start
    if (m.source === "DEVICE") {
      return d <= end;
    }
    if (!start || !end) return d === input.milestones.find((x) => x.id === input.indexMilestoneId)?.date;
    return d >= start && d <= end;
  });

  return defs.map((def) => {
    const hit = inWindow.find((m) => criteriaKeysFromMilestone(m).includes(def.key));
    if (hit) {
      return {
        ...def,
        status: "PRESENT" as const,
        evidenceDate: hit.date,
        evidenceLabel: hit.title,
        evidenceMilestoneId: hit.id,
      };
    }
    // Index specimen row: selected milestone itself often counts
    if (def.key === "index_specimen") {
      const idx = input.milestones.find((m) => m.id === input.indexMilestoneId);
      if (idx) {
        return {
          ...def,
          status: "PRESENT" as const,
          evidenceDate: idx.date,
          evidenceLabel: idx.title,
          evidenceMilestoneId: idx.id,
        };
      }
    }
    return {
      ...def,
      status: "MISSING" as const,
      evidenceDate: null,
      evidenceLabel: null,
      evidenceMilestoneId: null,
    };
  });
}

export function summarizeCriteriaGaps(rows: CriteriaRowState[]): string[] {
  const gaps: string[] = [];
  const missingRequired = rows.filter((r) => r.requiredHint && r.status === "MISSING");
  for (const r of missingRequired) {
    gaps.push(`Thiếu tiêu chuẩn: ${r.label}`);
  }

  const respKeys = new Set([
    "cough",
    "dyspnea",
    "tachypnea",
    "rales",
    "purulent_sputum",
    "new_purulent_sputum",
    "increased_secretions",
    "worsening_gas",
  ]);
  const respPresent = rows.filter((r) => respKeys.has(r.key) && r.status === "PRESENT").length;
  const hasRespGroup = rows.some((r) => respKeys.has(r.key));
  if (hasRespGroup && respPresent < 2) {
    gaps.push(`Hô hấp tại chỗ: cần ≥2 nhóm khác nhau (hiện có ${respPresent})`);
  }

  const utiSx = rows.filter(
    (r) =>
      (r.key === "fever" ||
        r.key === "suprapubic_pain" ||
        r.key === "cva_pain" ||
        r.key === "dysuria" ||
        r.key === "urgency" ||
        r.key === "frequency") &&
      r.status === "PRESENT",
  );
  const isUti = rows.some((r) => r.key === "urine_culture");
  if (isUti && utiSx.length === 0 && rows.some((r) => r.key === "fever")) {
    gaps.push("UTI: chưa có triệu chứng ∈ IWP trên timeline (sốt / hạ vị / CVA / tiểu)");
  }

  return gaps;
}
