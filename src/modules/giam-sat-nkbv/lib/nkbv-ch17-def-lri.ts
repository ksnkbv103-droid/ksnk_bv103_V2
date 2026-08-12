/**
 * Chương 17 — LRI: LUNG
 */
import { all, any, ev, type Ch17TypeDef } from "./nkbv-ch17-criteria";

export const CH17_DEF_LUNG: Ch17TypeDef = {
  code: "LUNG",
  group: "LRI",
  name_vi: "Áp xe phổi / tràn mủ màng phổi (LUNG)",
  criteria: [
    {
      code: "LUNG1",
      label_vi: "Gram hoặc phân lập mô phổi / dịch màng phổi hợp lệ",
      node: ev("micro_lung_or_pleural"),
    },
    {
      code: "LUNG2",
      label_vi: "GPB / đại thể áp xe hoặc empyema",
      node: ev("path_lung_abscess_or_empyema"),
    },
    {
      code: "LUNG3",
      label_vi: "CĐHA khẳng định (hoặc equivocal + KS)",
      node: any(
        ev("img_lung_abscess_or_pleural"),
        all(ev("img_equivocal"), ev("abx_note_site_specific")),
      ),
    },
  ],
};

export const CH17_LRI_DEFS: readonly Ch17TypeDef[] = [CH17_DEF_LUNG];
