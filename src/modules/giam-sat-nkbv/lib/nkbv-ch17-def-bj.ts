/**
 * Chương 17 — BJ: BONE, DISC, JNT, PJI
 */
import {
  all,
  any,
  atLeast,
  ev,
  type Ch17Node,
  type Ch17TypeDef,
} from "./nkbv-ch17-criteria";

/** CĐHA rõ ràng OR (mập mờ AND ghi chép KS). */
function imagingOrEquivocalAbx(definitiveKey: string): Ch17Node {
  return any(ev(definitiveKey), all(ev("img_equivocal"), ev("abx_note_site_specific")));
}

export const CH17_DEF_BONE: Ch17TypeDef = {
  code: "BONE",
  group: "BJ",
  name_vi: "Viêm xương tủy (BONE)",
  criteria: [
    {
      code: "BONE1",
      label_vi: "Vi sinh từ mô xương",
      node: ev("micro_bone_tissue"),
    },
    {
      code: "BONE2",
      label_vi: "GPB / đại thể viêm xương tủy",
      node: ev("path_osteomyelitis"),
    },
    {
      code: "BONE3",
      label_vi: "≥2 triệu chứng tại chỗ + cận lâm sàng",
      node: all(
        atLeast(
          2,
          ev("sx_fever_gt38"),
          ev("sx_bone_swelling"),
          ev("sx_bone_pain"),
          ev("sx_bone_warmth"),
          ev("sx_bone_drainage"),
        ),
        any(
          all(ev("micro_blood_positive"), imagingOrEquivocalAbx("img_bone_definitive")),
          imagingOrEquivocalAbx("img_bone_definitive"),
        ),
      ),
    },
  ],
};

export const CH17_DEF_DISC: Ch17TypeDef = {
  code: "DISC",
  group: "BJ",
  name_vi: "Nhiễm trùng khoang đĩa đệm (DISC)",
  criteria: [
    { code: "DISC1", label_vi: "Vi sinh khoang đĩa đệm", node: ev("micro_disc_space") },
    { code: "DISC2", label_vi: "GPB / đại thể", node: ev("path_disc_infection") },
    {
      code: "DISC3",
      label_vi: "≥1 triệu chứng + CĐHA",
      node: all(
        any(ev("sx_fever_gt38"), ev("sx_disc_pain")),
        any(
          all(ev("micro_blood_positive"), imagingOrEquivocalAbx("img_disc_definitive")),
          imagingOrEquivocalAbx("img_disc_definitive"),
        ),
      ),
    },
  ],
};

export const CH17_DEF_JNT: Ch17TypeDef = {
  code: "JNT",
  group: "BJ",
  name_vi: "Nhiễm trùng khớp tự nhiên (JNT)",
  criteria: [
    {
      code: "JNT1",
      label_vi: "Vi sinh dịch khớp / màng hoạt dịch",
      node: ev("micro_joint_fluid_or_synovium"),
    },
    { code: "JNT2", label_vi: "GPB / đại thể", node: ev("path_joint_infection") },
    {
      code: "JNT3",
      label_vi: "Nghi ngờ + ≥2 triệu chứng + cận lâm sàng",
      node: all(
        ev("sx_joint_suspect"),
        atLeast(
          2,
          ev("sx_joint_swelling"),
          ev("sx_joint_pain"),
          ev("sx_joint_warmth"),
          ev("sx_joint_effusion"),
          ev("sx_joint_limited_rom"),
        ),
        any(
          ev("lab_synovial_wbc_or_le_pos"),
          ev("micro_joint_gram_wbc"),
          ev("micro_blood_positive"),
          imagingOrEquivocalAbx("img_joint_definitive"),
        ),
      ),
    },
  ],
};

export const CH17_DEF_PJI: Ch17TypeDef = {
  code: "PJI",
  group: "BJ",
  name_vi: "Nhiễm trùng khớp nhân tạo (PJI)",
  allowed_procedures: ["HPRO", "KPRO"],
  criteria: [
    {
      code: "PJI1",
      label_vi: "≥2 mẫu quanh khớp cùng loài",
      node: ev("micro_pji_two_matching"),
    },
    {
      code: "PJI2",
      label_vi: "Đường rò thông khớp nhân tạo",
      node: ev("sx_pji_sinus_tract"),
    },
    {
      code: "PJI3",
      label_vi: "≥3/5 tiêu chuẩn phụ",
      node: atLeast(
        3,
        ev("lab_crp_gt100_and_esr_gt30"),
        ev("lab_synovial_wbc_gt10k_or_le_pp"),
        ev("lab_synovial_pmn_gt90"),
        ev("path_pji_pmn_gt5_hpf"),
        ev("micro_pji_single_positive"),
      ),
    },
  ],
};

export const CH17_BJ_DEFS: readonly Ch17TypeDef[] = [
  CH17_DEF_BONE,
  CH17_DEF_DISC,
  CH17_DEF_JNT,
  CH17_DEF_PJI,
];
