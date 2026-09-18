/**
 * Chương 17 — EENT: CONJ, EAR, EYE, ORAL, SINU, UR (người lớn; Phụ lục C).
 */
import { all, any, atLeast, ev, type Ch17TypeDef } from "./nkbv-ch17-criteria";

export const CH17_DEF_CONJ: Ch17TypeDef = {
  code: "CONJ",
  group: "EENT",
  name_vi: "Viêm kết mạc (CONJ)",
  criteria: [
    {
      code: "CONJ1",
      label_vi: "Đau/đỏ/sưng kết mạc + bằng chứng cận lâm sàng",
      node: all(
        ev("sx_conj_pain_red_swelling"),
        any(
          ev("micro_conj_scraping_or_pus"),
          ev("micro_conj_gram_wbc"),
          ev("sx_conj_purulent"),
          ev("lab_conj_multinucleated_giant"),
          ev("sero_igm_or_igg4x"),
        ),
      ),
    },
  ],
};

export const CH17_DEF_EAR: Ch17TypeDef = {
  code: "EAR",
  group: "EENT",
  name_vi: "Nhiễm khuẩn tai / xương chũm (EAR)",
  criteria: [
    { code: "EAR1", label_vi: "Otitis externa — NCT mủ ống tai", node: ev("micro_ear_canal_pus") },
    {
      code: "EAR2",
      label_vi: "Otitis externa — sốt/đau/đỏ + Gram mủ",
      node: all(
        any(ev("sx_fever_gt38"), ev("sx_ear_pain"), ev("sx_ear_redness")),
        ev("micro_ear_canal_gram"),
      ),
    },
    { code: "EAR3", label_vi: "Otitis media — NCT dịch tai giữa (thủ thuật)", node: ev("micro_middle_ear_proc") },
    { code: "EAR4", label_vi: "Otitis media — ≥2 dấu lâm sàng", node: ev("sx_ear_media_signs") },
    { code: "EAR5", label_vi: "Otitis interna — NCT dịch tai trong", node: ev("micro_inner_ear_proc") },
    { code: "EAR6", label_vi: "Otitis interna — chẩn đoán physician", node: ev("dx_physician_inner_ear") },
    { code: "EAR7", label_vi: "Mastoiditis — NCT dịch/mô chũm", node: ev("micro_mastoid_fluid_tissue") },
    {
      code: "EAR8",
      label_vi: "Mastoiditis — ≥2 dấu + Gram hoặc CĐHA",
      node: all(
        ev("sx_mastoid_signs"),
        any(ev("micro_mastoid_gram"), ev("img_mastoid_definitive"), all(ev("img_equivocal"), ev("abx_note_site_specific"))),
      ),
    },
  ],
};

export const CH17_DEF_EYE: Ch17TypeDef = {
  code: "EYE",
  group: "EENT",
  name_vi: "Nhiễm khuẩn mắt không kết mạc (EYE)",
  criteria: [
    { code: "EYE1", label_vi: "NCT dịch tiền phòng / kính / buồng sau", node: ev("micro_eye_aqueous_or_vitreous") },
    {
      code: "EYE2",
      label_vi: "≥2 (đau mắt / rối loạn thị giác / hypopyon) + KS ≤2 ngày",
      node: all(
        atLeast(2, ev("sx_eye_pain"), ev("sx_eye_visual_disturbance"), ev("sx_eye_hypopyon")),
        ev("abx_started_within_2d"),
      ),
    },
  ],
};

export const CH17_DEF_ORAL: Ch17TypeDef = {
  code: "ORAL",
  group: "EENT",
  name_vi: "Nhiễm khuẩn khoang miệng (ORAL)",
  criteria: [
    { code: "ORAL1", label_vi: "NCT mủ/áp xe miệng", node: ev("micro_oral_pus_abscess") },
    { code: "ORAL2", label_vi: "Áp xe / nhiễm thủ thuật / đại thể / GPB", node: ev("path_oral_abscess_or_infection") },
    {
      code: "ORAL3",
      label_vi: "Loét/mảng miệng + cận lâm sàng hoặc KS ≤2 ngày",
      node: all(
        ev("sx_oral_ulcer_plaque"),
        any(
          ev("micro_oral_virus_scraping"),
          ev("lab_oral_multinucleated_giant"),
          ev("sero_igm_or_igg4x"),
          ev("micro_oral_fungal_smear"),
          ev("abx_started_within_2d"),
        ),
      ),
    },
  ],
};

export const CH17_DEF_SINU: Ch17TypeDef = {
  code: "SINU",
  group: "EENT",
  name_vi: "Viêm xoang (SINU)",
  criteria: [
    { code: "SINU1", label_vi: "NCT dịch/mô xoang khi thủ thuật", node: ev("micro_sinus_proc") },
    {
      code: "SINU2",
      label_vi: "Sốt hoặc triệu chứng xoang + imaging",
      node: all(
        any(ev("sx_fever_gt38"), ev("sx_sinu_local")),
        ev("img_sinu_inflammation"),
      ),
    },
  ],
};

export const CH17_DEF_UR: Ch17TypeDef = {
  code: "UR",
  group: "EENT",
  name_vi: "Nhiễm khuẩn đường hô hấp trên (UR)",
  criteria: [
    {
      code: "UR1",
      label_vi: "≥2 dấu UR + (NCT hô hấp trên / huyết thanh / chẩn đoán BS)",
      node: all(
        ev("sx_ur_cluster"),
        any(ev("micro_ur_upper_respiratory"), ev("sero_igm_or_igg4x"), ev("dx_physician_ur")),
      ),
    },
    { code: "UR2", label_vi: "Áp xe UR đại thể/GPB hoặc imaging", node: ev("path_ur_abscess_or_imaging") },
  ],
};

export const CH17_EENT_DEFS: readonly Ch17TypeDef[] = [
  CH17_DEF_CONJ,
  CH17_DEF_EAR,
  CH17_DEF_EYE,
  CH17_DEF_ORAL,
  CH17_DEF_SINU,
  CH17_DEF_UR,
];
