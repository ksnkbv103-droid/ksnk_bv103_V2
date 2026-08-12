/**
 * Chương 17 — CVS: CARD, MED, VASC, ENDO
 */
import {
  all,
  any,
  atLeast,
  ev,
  type Ch17TypeDef,
} from "./nkbv-ch17-criteria";

const cardLabAny = any(
  ev("lab_ekg_typical"),
  ev("path_myocardium"),
  ev("sero_igm_or_igg4x"),
  ev("img_pericardial_effusion"),
);

export const CH17_DEF_CARD: Ch17TypeDef = {
  code: "CARD",
  group: "CVS",
  name_vi: "Viêm cơ tim / màng ngoài tim (CARD)",
  criteria: [
    { code: "CARD1", label_vi: "Vi sinh màng ngoài tim", node: ev("micro_pericardium") },
    {
      code: "CARD2",
      label_vi: "Người lớn: ≥2 triệu chứng + cận lâm sàng",
      node: {
        kind: "ageGate",
        age: "OVER_1Y",
        of: all(
          atLeast(
            2,
            ev("sx_fever_gt38"),
            ev("sx_chest_pain"),
            ev("sx_paradoxical_pulse"),
            ev("sx_enlarged_cardiac_silhouette"),
          ),
          cardLabAny,
        ),
      },
    },
    {
      code: "CARD3",
      label_vi: "≤1 tuổi: ≥2 triệu chứng + cận lâm sàng",
      node: {
        kind: "ageGate",
        age: "INFANT_LE1",
        of: all(
          atLeast(
            2,
            ev("sx_fever_gt38"),
            ev("sx_hypothermia_lt36"),
            ev("sx_apnea"),
            ev("sx_bradycardia"),
            ev("sx_paradoxical_pulse"),
            ev("sx_enlarged_cardiac_silhouette"),
          ),
          cardLabAny,
        ),
      },
    },
  ],
};

const medSupport = any(ev("sx_mediastinal_purulent"), ev("img_mediastinal_widening"));

export const CH17_DEF_MED: Ch17TypeDef = {
  code: "MED",
  group: "CVS",
  name_vi: "Viêm trung thất (MED)",
  criteria: [
    { code: "MED1", label_vi: "Vi sinh trung thất", node: ev("micro_mediastinum") },
    { code: "MED2", label_vi: "GPB / đại thể", node: ev("path_mediastinitis") },
    {
      code: "MED3",
      label_vi: "Người lớn: ≥1 triệu chứng + hỗ trợ",
      node: {
        kind: "ageGate",
        age: "OVER_1Y",
        of: all(
          any(ev("sx_fever_gt38"), ev("sx_chest_pain"), ev("sx_sternal_instability")),
          medSupport,
        ),
      },
    },
    {
      code: "MED4",
      label_vi: "≤1 tuổi: ≥1 triệu chứng + hỗ trợ",
      node: {
        kind: "ageGate",
        age: "INFANT_LE1",
        of: all(
          any(
            ev("sx_fever_gt38"),
            ev("sx_hypothermia_lt36"),
            ev("sx_apnea"),
            ev("sx_bradycardia"),
            ev("sx_sternal_instability"),
          ),
          medSupport,
        ),
      },
    },
  ],
};

export const CH17_DEF_VASC: Ch17TypeDef = {
  code: "VASC",
  group: "CVS",
  name_vi: "Nhiễm trùng động / tĩnh mạch (VASC)",
  criteria: [
    { code: "VASC1", label_vi: "Vi sinh thành mạch", node: ev("micro_vessel_wall") },
    { code: "VASC2", label_vi: "GPB / đại thể", node: ev("path_vascular_infection") },
    {
      code: "VASC3",
      label_vi: "Người lớn: triệu chứng tại chỗ + tip catheter >15",
      node: {
        kind: "ageGate",
        age: "OVER_1Y",
        of: all(
          any(
            ev("sx_fever_gt38"),
            ev("sx_vascular_pain"),
            ev("sx_vascular_erythema"),
            ev("sx_vascular_warmth"),
          ),
          ev("micro_catheter_tip_gt15"),
        ),
      },
    },
    { code: "VASC4", label_vi: "Chảy mủ tại chỗ mạch", node: ev("sx_vascular_purulent") },
    {
      code: "VASC5",
      label_vi: "≤1 tuổi: triệu chứng + tip catheter >15",
      node: {
        kind: "ageGate",
        age: "INFANT_LE1",
        of: all(
          any(
            ev("sx_fever_gt38"),
            ev("sx_hypothermia_lt36"),
            ev("sx_apnea"),
            ev("sx_bradycardia"),
            ev("sx_vascular_lethargy"),
            ev("sx_vascular_pain"),
            ev("sx_vascular_erythema"),
            ev("sx_vascular_warmth"),
          ),
          ev("micro_catheter_tip_gt15"),
        ),
      },
    },
  ],
};

const endoBloodSpecial = any(
  ev("micro_endo_blood_typical_ge2"),
  ev("micro_endo_blood_prosthetic_ge2"),
  ev("micro_endo_blood_other_ge3"),
  ev("sero_cox_bartonella_or_pcr"),
);

const endoMinor5 = [
  ev("sx_endo_predisposing"),
  ev("sx_fever_gt38"),
  ev("sx_endo_new_murmur"),
  ev("sx_endo_vascular_phenomenon"),
  ev("sx_endo_immunologic_phenomenon"),
] as const;

export const CH17_DEF_ENDO: Ch17TypeDef = {
  code: "ENDO",
  group: "CVS",
  name_vi: "Viêm nội tâm mạc nhiễm khuẩn (ENDO)",
  window_override: { iwp_half_days: 10, rit_to_discharge: true },
  criteria: [
    {
      code: "ENDO1",
      label_vi: "Vi sinh sùi / van / graft / dây / tắc mạch",
      node: ev("micro_endo_vegetation_or_device"),
    },
    { code: "ENDO2", label_vi: "GPB ENDO", node: ev("path_endocarditis") },
    { code: "ENDO3", label_vi: "Đại thể trong mổ", node: ev("sx_endo_gross_surgery") },
    {
      code: "ENDO4",
      label_vi: "CĐHA điển hình + cấy máu đặc biệt",
      node: all(ev("img_endo_typical"), endoBloodSpecial),
    },
    {
      code: "ENDO5",
      label_vi: "≥3 yếu tố lâm sàng phụ + cấy máu đặc biệt",
      node: all(atLeast(3, ...endoMinor5), endoBloodSpecial),
    },
    {
      code: "ENDO6",
      label_vi: "CĐHA + ≥3 phụ (trừ thổi mới) + cấy máu thông thường",
      node: all(
        ev("img_endo_typical"),
        atLeast(
          3,
          ev("sx_endo_predisposing"),
          ev("sx_fever_gt38"),
          ev("sx_endo_vascular_phenomenon"),
          ev("sx_endo_immunologic_phenomenon"),
        ),
        ev("micro_blood_ordinary_positive"),
      ),
    },
    {
      code: "ENDO7",
      label_vi: "Đủ 5 yếu tố lâm sàng phụ + cấy máu thông thường",
      node: all(atLeast(5, ...endoMinor5), ev("micro_blood_ordinary_positive")),
    },
  ],
};

export const CH17_CVS_DEFS: readonly Ch17TypeDef[] = [
  CH17_DEF_CARD,
  CH17_DEF_MED,
  CH17_DEF_VASC,
  CH17_DEF_ENDO,
];
