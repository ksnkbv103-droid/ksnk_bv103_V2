/**
 * Tiêu chuẩn lâm sàng Chương 17 (NHSN) — dùng khi SSI Organ/Space chọn site,
 * hoặc quy kết ổ tại chỗ / Secondary. Catalog prose: 02-clinical-symptom-catalog.md.
 */

export type Ch17SignDef = {
  key: string;
  label_vi: string;
};

export type Ch17SiteRule = {
  site: string;
  name_vi: string;
  min_signs: number;
  signs: readonly Ch17SignDef[];
  /** Thủ thuật NHSN giới hạn (nếu có) */
  allowed_procedures?: readonly string[];
};

/** Site Organ/Space hay gặp — checklist vận hành (không thay Domain SSOT đầy đủ). */
export const CH17_SITE_RULES: readonly Ch17SiteRule[] = [
  {
    site: "IAB",
    name_vi: "Nhiễm trùng ổ bụng (IAB)",
    min_signs: 2,
    signs: [
      { key: "ch17_iab_fever", label_vi: "Sốt > 38,0°C" },
      { key: "ch17_iab_hypotension", label_vi: "Tụt huyết áp" },
      { key: "ch17_iab_nausea_vomit", label_vi: "Buồn nôn / nôn" },
      { key: "ch17_iab_abdominal_pain", label_vi: "Đau / tăng cảm giác đau bụng" },
      { key: "ch17_iab_jaundice", label_vi: "Vàng da / vàng mắt" },
    ],
  },
  {
    site: "EMET",
    name_vi: "Nội mạc tử cung (EMET)",
    min_signs: 2,
    allowed_procedures: ["CSEC", "HYST", "VHYS"],
    signs: [
      { key: "ch17_emet_fever", label_vi: "Sốt > 38,0°C" },
      { key: "ch17_emet_uterine_pain", label_vi: "Đau tử cung / bụng dưới" },
      { key: "ch17_emet_purulent", label_vi: "Chảy dịch mủ từ tử cung" },
    ],
  },
  {
    site: "OREP",
    name_vi: "Đường sinh sản sâu (OREP)",
    min_signs: 2,
    allowed_procedures: ["CSEC", "HYST", "VHYS", "OVRY"],
    signs: [
      { key: "ch17_orep_fever", label_vi: "Sốt > 38,0°C" },
      { key: "ch17_orep_nausea", label_vi: "Buồn nôn / nôn" },
      { key: "ch17_orep_pelvic_pain", label_vi: "Đau hố chậu / sinh sản" },
      { key: "ch17_orep_dysuria", label_vi: "Tiểu buốt" },
    ],
  },
  {
    site: "VCUF",
    name_vi: "Mỏm cắt âm đạo (VCUF)",
    min_signs: 1,
    allowed_procedures: ["HYST", "VHYS"],
    signs: [
      { key: "ch17_vcuf_purulent", label_vi: "Chảy mủ từ mỏm cắt" },
      { key: "ch17_vcuf_abscess", label_vi: "Áp xe mỏm cắt (CĐHA / lâm sàng)" },
    ],
  },
  {
    site: "BONE",
    name_vi: "Viêm xương tủy (BONE)",
    min_signs: 2,
    signs: [
      { key: "ch17_bone_fever", label_vi: "Sốt > 38,0°C" },
      { key: "ch17_bone_swelling", label_vi: "Sưng nề tại chỗ" },
      { key: "ch17_bone_pain", label_vi: "Đau / tăng cảm giác đau khu trú" },
      { key: "ch17_bone_warmth", label_vi: "Nóng khu trú" },
      { key: "ch17_bone_drainage", label_vi: "Chảy dịch từ vị trí xương" },
    ],
  },
  {
    site: "PJI",
    name_vi: "Khớp nhân tạo (PJI)",
    min_signs: 1,
    allowed_procedures: ["HPRO", "KPRO"],
    signs: [
      { key: "ch17_pji_sinus", label_vi: "Đường rò thông với khớp" },
      { key: "ch17_pji_lab", label_vi: "CRP>100 và ESR>30 + WBC dịch khớp tăng" },
    ],
  },
  {
    site: "MEN",
    name_vi: "Viêm màng não / não thất (MEN)",
    min_signs: 2,
    signs: [
      { key: "ch17_men_fever", label_vi: "Sốt > 38,0°C" },
      { key: "ch17_men_headache", label_vi: "Đau đầu" },
      { key: "ch17_men_meningeal", label_vi: "Dấu màng não" },
      { key: "ch17_men_cranial", label_vi: "Dấu dây thần kinh sọ" },
    ],
  },
  {
    site: "GIT",
    name_vi: "Đường tiêu hóa (GIT)",
    min_signs: 2,
    signs: [
      { key: "ch17_git_fever", label_vi: "Sốt > 38,0°C" },
      { key: "ch17_git_nausea", label_vi: "Buồn nôn / nôn" },
      { key: "ch17_git_pain", label_vi: "Đau bụng khu trú" },
      { key: "ch17_git_dysphagia", label_vi: "Nuốt khó / đau khi nuốt" },
    ],
  },
] as const;

const BY_SITE = new Map(CH17_SITE_RULES.map((r) => [r.site, r]));

export function ch17RuleForSite(siteCode: string | null | undefined): Ch17SiteRule | null {
  const code = String(siteCode || "").trim().toUpperCase();
  return BY_SITE.get(code) ?? null;
}

export function countCh17Signs(
  rule: Ch17SiteRule,
  flags: Record<string, boolean> | null | undefined,
): number {
  const f = flags || {};
  return rule.signs.reduce((n, s) => n + (f[s.key] === true ? 1 : 0), 0);
}

export function isCh17SiteCriteriaMet(input: {
  siteCode: string | null | undefined;
  flags?: Record<string, boolean> | null;
  procedureCode?: string | null;
}): { applicable: boolean; met: boolean; reason: string; rule: Ch17SiteRule | null } {
  const rule = ch17RuleForSite(input.siteCode);
  if (!rule) {
    return {
      applicable: false,
      met: false,
      reason: "Site Ch.17 chưa có checklist vận hành — dùng tiêu chí Organ/Space chung.",
      rule: null,
    };
  }
  const proc = String(input.procedureCode || "").trim().toUpperCase();
  if (rule.allowed_procedures?.length && proc && !rule.allowed_procedures.includes(proc)) {
    return {
      applicable: true,
      met: false,
      reason: `${rule.site} không hợp lệ sau thủ thuật ${proc || "—"}.`,
      rule,
    };
  }
  const n = countCh17Signs(rule, input.flags);
  const met = n >= rule.min_signs;
  return {
    applicable: true,
    met,
    reason: met
      ? `${rule.site}: đủ ${n}/${rule.min_signs} triệu chứng Ch.17.`
      : `${rule.site}: cần ≥${rule.min_signs} triệu chứng (đang có ${n}).`,
    rule,
  };
}

/** Sites đã có checklist runtime */
export function ch17OperationalSites(): string[] {
  return CH17_SITE_RULES.map((r) => r.site);
}
