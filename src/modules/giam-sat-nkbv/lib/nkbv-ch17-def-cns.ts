/**
 * Chương 17 — CNS: IC, MEN, SA
 */
import {
  all,
  any,
  atLeast,
  ev,
  type Ch17Node,
  type Ch17TypeDef,
} from "./nkbv-ch17-criteria";

function imagingOrEquivocalAbx(definitiveKey: string): Ch17Node {
  return any(ev(definitiveKey), all(ev("img_equivocal"), ev("abx_note_site_specific")));
}

const icLabAny = any(
  ev("micro_brain_direct_smear"),
  imagingOrEquivocalAbx("img_ic_definitive"),
  ev("sero_igm_or_igg4x"),
);

export const CH17_DEF_IC: Ch17TypeDef = {
  code: "IC",
  group: "CNS",
  name_vi: "Nhiễm trùng nội sọ (IC)",
  criteria: [
    { code: "IC1", label_vi: "Vi sinh mô não / dura", node: ev("micro_brain_or_dura") },
    { code: "IC2", label_vi: "GPB / đại thể áp xe nội sọ", node: ev("path_ic_abscess") },
    {
      code: "IC3",
      label_vi: "Người lớn / trẻ lớn: ≥2 triệu chứng + cận lâm sàng",
      node: {
        kind: "ageGate",
        age: "OVER_1Y",
        of: all(
          atLeast(
            2,
            ev("sx_headache"),
            ev("sx_dizziness"),
            ev("sx_fever_gt38"),
            ev("sx_focal_neuro"),
            ev("sx_altered_consciousness"),
            ev("sx_confusion"),
          ),
          icLabAny,
        ),
      },
    },
    {
      code: "IC4",
      label_vi: "≤1 tuổi: ≥2 dấu hiệu + cận lâm sàng",
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
            ev("sx_focal_neuro"),
            ev("sx_altered_consciousness"),
            ev("sx_infant_irritability"),
          ),
          icLabAny,
        ),
      },
    },
  ],
};

const menLabAny = any(
  ev("lab_csf_abnormal_triad"),
  ev("micro_csf_gram_positive"),
  ev("micro_blood_positive"),
  ev("sero_igm_or_igg4x"),
);

/** Sốt+đau đầu đơn độc không đủ cặp — bắt buộc có meningeal hoặc cranial trong ≥2. */
const menAdultSigns: Ch17Node = any(
  all(ev("sx_meningeal_signs"), ev("sx_cranial_nerve")),
  all(ev("sx_meningeal_signs"), any(ev("sx_fever_gt38"), ev("sx_headache"))),
  all(ev("sx_cranial_nerve"), any(ev("sx_fever_gt38"), ev("sx_headache"))),
);

const menInfantSigns: Ch17Node = any(
  all(ev("sx_meningeal_signs"), ev("sx_cranial_nerve")),
  all(
    ev("sx_meningeal_signs"),
    any(
      ev("sx_fever_gt38"),
      ev("sx_hypothermia_lt36"),
      ev("sx_apnea"),
      ev("sx_bradycardia"),
      ev("sx_infant_irritability"),
    ),
  ),
  all(
    ev("sx_cranial_nerve"),
    any(
      ev("sx_fever_gt38"),
      ev("sx_hypothermia_lt36"),
      ev("sx_apnea"),
      ev("sx_bradycardia"),
      ev("sx_infant_irritability"),
    ),
  ),
);

export const CH17_DEF_MEN: Ch17TypeDef = {
  code: "MEN",
  group: "CNS",
  name_vi: "Viêm màng não / não thất (MEN)",
  criteria: [
    { code: "MEN1", label_vi: "Vi sinh CSF", node: ev("micro_csf_positive") },
    {
      code: "MEN2",
      label_vi: "Người lớn: nghi ngờ + ≥2 biểu hiện + cận lâm sàng",
      node: {
        kind: "ageGate",
        age: "OVER_1Y",
        of: all(ev("sx_meningitis_suspect"), menAdultSigns, menLabAny),
      },
    },
    {
      code: "MEN3",
      label_vi: "≤1 tuổi: nghi ngờ + ≥2 biểu hiện + cận lâm sàng",
      node: {
        kind: "ageGate",
        age: "INFANT_LE1",
        of: all(ev("sx_meningitis_suspect"), menInfantSigns, menLabAny),
      },
    },
  ],
};

export const CH17_DEF_SA: Ch17TypeDef = {
  code: "SA",
  group: "CNS",
  name_vi: "Áp xe tủy sống (SA)",
  criteria: [
    { code: "SA1", label_vi: "Vi sinh ổ áp xe / dịch ngoài màng cứng tủy", node: ev("micro_spinal_abscess") },
    { code: "SA2", label_vi: "GPB / đại thể", node: ev("path_spinal_abscess") },
    {
      code: "SA3",
      label_vi: "≥1 triệu chứng + CĐHA",
      node: all(
        any(
          ev("sx_fever_gt38"),
          ev("sx_back_pain"),
          ev("sx_radiculitis"),
          ev("sx_paraparesis"),
          ev("sx_paraplegia"),
        ),
        any(
          all(ev("micro_blood_positive"), imagingOrEquivocalAbx("img_sa_definitive")),
          imagingOrEquivocalAbx("img_sa_definitive"),
        ),
      ),
    },
  ],
};

export const CH17_CNS_DEFS: readonly Ch17TypeDef[] = [
  CH17_DEF_IC,
  CH17_DEF_MEN,
  CH17_DEF_SA,
];
