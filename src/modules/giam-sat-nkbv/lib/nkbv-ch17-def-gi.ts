/**
 * Chương 17 — GI: CDI, GE, GIT, IAB
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

export const CH17_DEF_CDI: Ch17TypeDef = {
  code: "CDI",
  group: "GI",
  name_vi: "Viêm đại tràng do C. difficile (CDI)",
  criteria: [
    {
      code: "CDI1",
      label_vi: "Độc tố / PCR toxin trên phân không khuôn",
      node: ev("lab_cdi_toxin_unformed"),
    },
    {
      code: "CDI2",
      label_vi: "Viêm đại tràng giả mạc",
      node: ev("path_pseudomembranous_colitis"),
    },
  ],
};

export const CH17_DEF_GE: Ch17TypeDef = {
  code: "GE",
  group: "GI",
  name_vi: "Viêm dạ dày ruột (GE)",
  criteria: [
    {
      code: "GE1",
      label_vi: "Tiêu chảy cấp >12 giờ",
      node: ev("sx_acute_diarrhea_gt12h"),
    },
    {
      code: "GE2",
      label_vi: "≥2 triệu chứng + bằng chứng vi sinh",
      node: all(
        atLeast(
          2,
          ev("sx_nausea"),
          ev("sx_vomiting"),
          ev("sx_abdominal_pain"),
          ev("sx_fever_gt38"),
          ev("sx_headache"),
        ),
        any(
          ev("micro_enteric_pathogen"),
          ev("micro_stool_direct_microscopy"),
          ev("sero_igm_or_igg4x"),
        ),
      ),
    },
  ],
};

export const CH17_DEF_GIT: Ch17TypeDef = {
  code: "GIT",
  group: "GI",
  name_vi: "Nhiễm trùng đường tiêu hóa (GIT)",
  criteria: [
    {
      code: "GIT1",
      label_vi: "Áp xe/GPB ± cấy máu MBI",
      node: any(
        ev("path_gi_abscess_or_infection"),
        all(ev("path_gi_abscess_or_infection"), ev("micro_blood_mbi_organism")),
      ),
    },
    {
      code: "GIT2",
      label_vi: "≥2 triệu chứng + cận lâm sàng",
      node: all(
        atLeast(
          2,
          ev("sx_fever_gt38"),
          ev("sx_nausea"),
          ev("sx_vomiting"),
          ev("sx_abdominal_pain"),
          ev("sx_odynophagia"),
          ev("sx_dysphagia"),
        ),
        any(
          ev("micro_drain_or_tissue_gi"),
          ev("micro_gi_gram_or_koh"),
          all(ev("micro_blood_mbi_organism"), imagingOrEquivocalAbx("img_git_definitive")),
          imagingOrEquivocalAbx("img_git_definitive"),
        ),
      ),
    },
  ],
};

export const CH17_DEF_IAB: Ch17TypeDef = {
  code: "IAB",
  group: "GI",
  name_vi: "Nhiễm trùng khoang ổ bụng (IAB)",
  criteria: [
    {
      code: "IAB1",
      label_vi: "Vi sinh dịch ổ bụng / mủ áp xe",
      node: ev("micro_iab_fluid_or_abscess"),
    },
    {
      code: "IAB2",
      label_vi: "Áp xe/GPB ± cấy máu MBI",
      node: any(
        ev("path_iab_abscess"),
        all(ev("path_iab_abscess"), ev("micro_blood_mbi_organism")),
      ),
    },
    {
      code: "IAB3",
      label_vi: "≥2 triệu chứng + cận lâm sàng",
      node: all(
        atLeast(
          2,
          ev("sx_fever_gt38"),
          ev("sx_hypotension"),
          ev("sx_nausea"),
          ev("sx_vomiting"),
          ev("sx_abdominal_pain"),
          ev("lab_elevated_liver_enzymes"),
          ev("sx_jaundice"),
        ),
        any(
          ev("micro_iab_gram_or_culture"),
          all(ev("micro_blood_mbi_organism"), imagingOrEquivocalAbx("img_iab_definitive")),
        ),
      ),
    },
  ],
};

export const CH17_GI_DEFS: readonly Ch17TypeDef[] = [
  CH17_DEF_CDI,
  CH17_DEF_GE,
  CH17_DEF_GIT,
  CH17_DEF_IAB,
];
