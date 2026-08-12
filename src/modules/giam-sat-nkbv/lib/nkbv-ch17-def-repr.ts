/**
 * Chương 17 — REPR vận hành SSI OB/GYN: EMET, OREP, VCUF
 * (đóng khoảng trống sau khi thay checklist phẳng cũ bằng cây tiêu chuẩn)
 */
import {
  all,
  any,
  atLeast,
  ev,
  type Ch17TypeDef,
} from "./nkbv-ch17-criteria";

export const CH17_DEF_EMET: Ch17TypeDef = {
  code: "EMET",
  group: "REPR",
  name_vi: "Viêm nội mạc tử cung (EMET)",
  allowed_procedures: ["CSEC", "HYST", "VHYS"],
  criteria: [
    {
      code: "EMET1",
      label_vi: "Vi sinh nội mạc tử cung",
      node: ev("micro_endometrium"),
    },
    {
      code: "EMET2",
      label_vi: "GPB / đại thể viêm nội mạc",
      node: ev("path_endometritis"),
    },
    {
      code: "EMET3",
      label_vi: "≥2 triệu chứng (sốt / đau tử cung / chảy mủ)",
      node: atLeast(
        2,
        ev("sx_fever_gt38"),
        ev("sx_emet_uterine_pain"),
        ev("sx_emet_purulent"),
      ),
    },
  ],
};

export const CH17_DEF_OREP: Ch17TypeDef = {
  code: "OREP",
  group: "REPR",
  name_vi: "Nhiễm trùng đường sinh sản sâu (OREP)",
  allowed_procedures: ["CSEC", "HYST", "VHYS", "OVRY"],
  criteria: [
    {
      code: "OREP1",
      label_vi: "Vi sinh mô / dịch sinh sản sâu",
      node: ev("micro_orep_tissue_or_fluid"),
    },
    {
      code: "OREP2",
      label_vi: "GPB / đại thể",
      node: ev("path_orep_infection"),
    },
    {
      code: "OREP3",
      label_vi: "≥2 triệu chứng + (CĐHA hoặc cấy máu)",
      node: all(
        atLeast(
          2,
          ev("sx_fever_gt38"),
          ev("sx_nausea"),
          ev("sx_vomiting"),
          ev("sx_orep_pelvic_pain"),
          ev("sx_dysuria"),
          ev("sx_abdominal_pain"),
        ),
        any(
          ev("img_orep_definitive"),
          ev("micro_blood_positive"),
          all(ev("img_equivocal"), ev("abx_note_site_specific")),
        ),
      ),
    },
  ],
};

export const CH17_DEF_VCUF: Ch17TypeDef = {
  code: "VCUF",
  group: "REPR",
  name_vi: "Nhiễm trùng mỏm cắt âm đạo (VCUF)",
  allowed_procedures: ["HYST", "VHYS"],
  criteria: [
    {
      code: "VCUF1",
      label_vi: "Vi sinh dịch mỏm cắt",
      node: ev("micro_vcuf_fluid"),
    },
    {
      code: "VCUF2",
      label_vi: "Chảy mủ từ mỏm cắt",
      node: ev("sx_vcuf_purulent"),
    },
    {
      code: "VCUF3",
      label_vi: "Áp xe mỏm cắt",
      node: ev("path_vcuf_abscess"),
    },
  ],
};

export const CH17_REPR_DEFS: readonly Ch17TypeDef[] = [
  CH17_DEF_EMET,
  CH17_DEF_OREP,
  CH17_DEF_VCUF,
];
