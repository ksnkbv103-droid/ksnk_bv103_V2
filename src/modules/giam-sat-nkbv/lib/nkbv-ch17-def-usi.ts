/**
 * Chương 17 — USI (hệ tiết niệu sâu, không phải UTI nước tiểu).
 * NHSN PSC 2025 người lớn: 3 tiêu chí. Nhánh <1 tuổi không dùng tại BV103.
 */
import { all, any, ev, type Ch17TypeDef } from "./nkbv-ch17-criteria";

export const CH17_DEF_USI: Ch17TypeDef = {
  code: "USI",
  group: "USI",
  name_vi: "Nhiễm trùng hệ tiết niệu sâu (USI)",
  criteria: [
    {
      code: "USI1",
      label_vi: "NCT dịch (không phải nước tiểu) hoặc mô vị trí",
      node: ev("micro_usi_fluid_or_tissue"),
    },
    {
      code: "USI2",
      label_vi: "Áp xe / đại thể / thủ thuật / GPB tại vị trí",
      node: ev("path_usi_abscess_or_infection"),
    },
    {
      code: "USI3",
      label_vi: "Sốt hoặc đau tại chỗ + (mủ hoặc máu + CĐHA chắc chắn)",
      node: all(
        any(ev("sx_fever_gt38"), ev("sx_usi_local_pain")),
        any(
          ev("sx_usi_purulent"),
          all(ev("micro_blood_positive"), ev("img_usi_definitive")),
        ),
      ),
    },
  ],
};

export const CH17_USI_DEFS: readonly Ch17TypeDef[] = [CH17_DEF_USI];
