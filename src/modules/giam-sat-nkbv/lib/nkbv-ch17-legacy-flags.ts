/**
 * Ánh xạ cờ checklist Ch.17 cũ (ch17_*) → evidence keys chuẩn Phase A–B.
 */
const LEGACY_TO_EVIDENCE: Record<string, string | readonly string[]> = {
  ch17_iab_fever: "sx_fever_gt38",
  ch17_iab_hypotension: "sx_hypotension",
  ch17_iab_nausea_vomit: ["sx_nausea", "sx_vomiting"],
  ch17_iab_abdominal_pain: "sx_abdominal_pain",
  ch17_iab_jaundice: "sx_jaundice",
  ch17_bone_fever: "sx_fever_gt38",
  ch17_bone_swelling: "sx_bone_swelling",
  ch17_bone_pain: "sx_bone_pain",
  ch17_bone_warmth: "sx_bone_warmth",
  ch17_bone_drainage: "sx_bone_drainage",
  ch17_pji_sinus: "sx_pji_sinus_tract",
  ch17_pji_lab: ["lab_crp_gt100_and_esr_gt30", "lab_synovial_wbc_gt10k_or_le_pp"],
  ch17_men_fever: "sx_fever_gt38",
  ch17_men_headache: "sx_headache",
  ch17_men_meningeal: "sx_meningeal_signs",
  ch17_men_cranial: "sx_cranial_nerve",
  ch17_git_fever: "sx_fever_gt38",
  ch17_git_nausea: ["sx_nausea", "sx_vomiting"],
  ch17_git_pain: "sx_abdominal_pain",
  ch17_git_dysphagia: ["sx_dysphagia", "sx_odynophagia"],
  ch17_emet_fever: "sx_fever_gt38",
  ch17_emet_uterine_pain: "sx_emet_uterine_pain",
  ch17_emet_purulent: "sx_emet_purulent",
  ch17_orep_fever: "sx_fever_gt38",
  ch17_orep_nausea: ["sx_nausea", "sx_vomiting"],
  ch17_orep_pelvic_pain: "sx_orep_pelvic_pain",
  ch17_orep_dysuria: "sx_dysuria",
  ch17_vcuf_purulent: "sx_vcuf_purulent",
  ch17_vcuf_abscess: "path_vcuf_abscess",
  /** Tick Organ/Space OB/GYN trên form SSI → triệu chứng đau cho EMET/OREP */
  organ_space_obgyn_abdominal_pain: [
    "sx_emet_uterine_pain",
    "sx_orep_pelvic_pain",
    "sx_abdominal_pain",
  ],
};

/** Gộp flags: giữ key mới + mở rộng alias cũ. */
export function normalizeCh17EvidenceFlags(
  flags: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const src = flags || {};
  for (const [k, v] of Object.entries(src)) {
    if (v !== true) continue;
    out[k] = true;
    const mapped = LEGACY_TO_EVIDENCE[k];
    if (!mapped) continue;
    if (typeof mapped === "string") out[mapped] = true;
    else for (const m of mapped) out[m] = true;
  }
  return out;
}
