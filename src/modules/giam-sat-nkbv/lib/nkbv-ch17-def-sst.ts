/**
 * Chương 17 — SST: BURN, DECU, SKIN, ST (người lớn; không UMB/CIRC tại BV103).
 */
import { all, any, ev, type Ch17TypeDef } from "./nkbv-ch17-criteria";

export const CH17_DEF_BURN: Ch17TypeDef = {
  code: "BURN",
  group: "SST",
  name_vi: "Nhiễm khuẩn vết bỏng (BURN)",
  criteria: [
    {
      code: "BURN1",
      label_vi: "Thay đổi hoại tử vết bỏng + NCT máu",
      node: all(ev("sx_burn_necrotic_change"), ev("micro_blood_positive")),
    },
  ],
};

export const CH17_DEF_DECU: Ch17TypeDef = {
  code: "DECU",
  group: "SST",
  name_vi: "Nhiễm khuẩn loét tỳ đè (DECU)",
  criteria: [
    {
      code: "DECU1",
      label_vi: "≥2 dấu bờ loét + NCT bờ loét",
      node: all(ev("sx_decu_margin_cluster"), ev("micro_decu_margin_biopsy")),
    },
  ],
};

export const CH17_DEF_SKIN: Ch17TypeDef = {
  code: "SKIN",
  group: "SST",
  name_vi: "Nhiễm khuẩn da / dưới da (SKIN)",
  criteria: [
    { code: "SKIN1", label_vi: "Mủ / mụn mủ / bóng nước / nhọt", node: ev("sx_skin_pustule_vesicle_boil") },
    {
      code: "SKIN2",
      label_vi: "≥2 dấu tại chỗ + cận lâm sàng",
      node: all(
        ev("sx_skin_local_cluster"),
        any(ev("micro_skin_aspirate_drain"), ev("lab_skin_multinucleated_giant"), ev("sero_igm_or_igg4x")),
      ),
    },
  ],
};

export const CH17_DEF_ST: Ch17TypeDef = {
  code: "ST",
  group: "SST",
  name_vi: "Nhiễm khuẩn mô mềm (ST)",
  criteria: [
    { code: "ST1", label_vi: "NCT mô/dẫn lưu", node: ev("micro_st_tissue_or_drain") },
    { code: "ST2", label_vi: "Mủ tại chỗ", node: ev("sx_st_purulent") },
    { code: "ST3", label_vi: "Áp xe / nhiễm đại thể/GPB", node: ev("path_st_abscess_or_infection") },
  ],
};

export const CH17_SST_DEFS: readonly Ch17TypeDef[] = [
  CH17_DEF_BURN,
  CH17_DEF_DECU,
  CH17_DEF_SKIN,
  CH17_DEF_ST,
];
