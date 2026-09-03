/**
 * CDC/NHSN Rules Engine — wires Shared timeline / Secondary BSI (SSOT v2 W1–W2).
 */

import {
  BsiVerificationData,
  Ch17VerificationData,
  VaeVerificationData,
  UtiVerificationData,
  SsiVerificationData,
} from "../types/nkbv-verification";
import { ch17TypeDef, evaluateCh17Type } from "./nkbv-ch17-definitions";
import { resolveCh17Hierarchy } from "./nkbv-ch17-hierarchy";
import { normalizeCh17EvidenceFlags } from "./nkbv-ch17-legacy-flags";
import { derivePneuLabTier } from "./nkbv-pneu-lab-tier";
import { derivePneuSystemic } from "./nkbv-pneu-systemic";
import { ADULT_VAE_IN_PLAN_REASON, isAdultVaeInPlan } from "./nkbv-pneu-vae-route";
import { computeVacFromDailyVent } from "./nkbv-vae-vent-compute";
import { evaluateSecondaryBsi } from "./nkbv-shared-secondary-bsi";
import {
  endoExtendedIwp,
  endoRitSbapToDischarge,
  isDeviceAssociated,
  resolveClinicalSbap,
  ssiSbapWindow,
  vaeEventPeriod,
} from "./nkbv-shared-timeline";
import {
  getNhsnOrganSpaceSite,
  getNhsnProcedure,
  getNhsnSsiEventType,
  isOrganSpaceSiteAllowedForProcedure,
  isSecondaryIncisionalEvent,
  nhsClassificationFromEvent,
  resolveSsiSurveillanceDays,
  secondaryIncisionMismatchWarning,
} from "./nkbv-ssi-nhsn-catalog";

export interface RuleEvaluationResult {
  is_positive: boolean;
  classification: string;
  is_secondary_bsi?: boolean;
  lcbi_type?: string;
  reason: string;
}

/** Triệu chứng lâm sàng LCBI — tách field SSOT hoặc legacy OR. */
export function bsiHasClinicalSymptoms(data: BsiVerificationData): boolean {
  if (data.has_fever || data.has_chills || data.has_hypotension) return true;
  if (
    data.is_infant_le1 &&
    (data.has_fever || data.has_hypothermia || data.has_apnea || data.has_bradycardia)
  ) {
    return true;
  }
  return Boolean(data.symptoms_window_7days);
}

export function evaluateBsiClabsi(data: BsiVerificationData): RuleEvaluationResult {
  if (data.is_fungi_respiratory) {
    return {
      is_positive: false,
      classification: "COMMUNITY_INFECTION",
      reason: "Nhiễm nấm hô hấp cộng đồng (Blastomyces, Histoplasma...), không phải BSI bệnh viện.",
    };
  }

  let isLcbi = false;
  let lcbiType = "";
  const hasSx = bsiHasClinicalSymptoms(data);

  if (data.pathogen_type === "RECOGNIZED") {
    isLcbi = true;
    lcbiType = data.is_infant_le1 && hasSx ? "LCBI_1" : "LCBI_1";
  } else if (data.pathogen_type === "COMMON_COMMENSAL") {
    if (data.commensal_culture_count >= 2 && data.commensal_drawn_separate && hasSx) {
      isLcbi = true;
      lcbiType = data.is_infant_le1 ? "LCBI_3" : "LCBI_2";
    }
  }

  if (!isLcbi) {
    return {
      is_positive: false,
      classification: "CONTAMINATION",
      reason: "Ngoại nhiễm hoặc thiếu triệu chứng lâm sàng đối với vi khuẩn cộng sinh ngoài da.",
    };
  }

  // Secondary BSI gate BEFORE CLABSI label (SSOT §6 + §4)
  let isSecondary = false;
  if (data.has_localized_infection) {
    const doe = data.calculated_doe || "";
    const site =
      data.localized_site_type === "UTI"
        ? "UTI"
        : data.localized_site_type === "PNEU"
          ? "PNEU"
          : data.localized_site_type === "SSI"
            ? "SSI"
            : "OTHER";

    const sbap =
      site === "SSI"
        ? data.calculated_sbap_start && data.calculated_sbap_end
          ? { start: data.calculated_sbap_start, end: data.calculated_sbap_end }
          : doe
            ? ssiSbapWindow(doe)
            : { start: "", end: "" }
        : resolveClinicalSbap({
            sbapStart: data.calculated_sbap_start,
            sbapEnd: data.calculated_sbap_end,
            iwpStart: data.calculated_iwp_start,
            doe,
          });

    const bloodDate = data.blood_collection_date || doe;
    if (bloodDate && sbap.start) {
      const sec = evaluateSecondaryBsi({
        primarySite: site,
        bloodCollectionDate: bloodDate,
        sbapStart: sbap.start,
        sbapEnd: sbap.end,
        bloodOrganism: data.pathogen_name || "",
        primaryOrganism: data.localized_pathogen_name,
        organismsMatch: data.localized_pathogen_matches,
        bloodMandatoryForPrimary: data.blood_mandatory_for_localized,
        lungOrPleuralMatch: data.lung_or_pleural_match,
      });
      isSecondary = sec.isSecondary;
    } else if (data.localized_pathogen_matches && data.is_in_sbap_window) {
      isSecondary = true;
    } else if (data.blood_mandatory_for_localized) {
      isSecondary = true;
    }
  }

  if (isSecondary) {
    return {
      is_positive: true,
      classification: "SECONDARY_BSI",
      is_secondary_bsi: true,
      lcbi_type: lcbiType,
      reason:
        "Nhiễm khuẩn huyết thứ phát xuất phát từ ổ nhiễm trùng tại chỗ khác. Tuyệt đối KHÔNG tính lỗi CLABSI.",
    };
  }

  // CLABSI: ≥3 ngày lịch liên tục (Day 3) + hiện diện DOE hoặc rút DOE−1
  let hasCvc = false;
  if (data.device_placed_date && data.calculated_doe) {
    hasCvc = isDeviceAssociated({
      placedDate: data.device_placed_date,
      removedDate: data.device_removed_date,
      doe: data.calculated_doe,
    }).associated;
  } else {
    hasCvc = data.cvc_placed_days >= 3 && Boolean(data.cvc_active_on_event);
  }
  // Lưới đã đếm <3 ngày → không CLABSI dù ngày đặt form lệch
  if (data.cvc_placed_days > 0 && data.cvc_placed_days < 3) {
    hasCvc = false;
  }

  if (!hasCvc) {
    return {
      is_positive: true,
      classification: "PRIMARY_BSI_NON_CLABSI",
      lcbi_type: lcbiType,
      reason:
        "BSI tiên phát — chưa đủ CVC liên tục ≥3 ngày lịch (Day 1→Day 3) và hiện diện DOE/DOE−1 → không CLABSI.",
    };
  }

  // MBI-LCBI NHSN: tác nhân đường ruột + (ANC/WBC <500 ≥2d | HSCT/GVHD | neutropenia | tiêu chảy nặng MBI).
  const mbiMucosalBarrier =
    Boolean(data.anc_wbc_lt_500_ge_2d) ||
    Boolean(data.has_hsct_or_gvhd) ||
    Boolean(data.is_neutropenia) ||
    Boolean(data.has_severe_diarrhea_mbi);
  if (data.is_intestinal_pathogen && mbiMucosalBarrier) {
    return {
      is_positive: true,
      classification: "MBI_LCBI",
      lcbi_type: lcbiType,
      reason: data.has_severe_diarrhea_mbi && !data.anc_wbc_lt_500_ge_2d && !data.has_hsct_or_gvhd && !data.is_neutropenia
        ? "MBI-LCBI: tác nhân đường ruột + tiêu chảy nặng (≥1 L/24h hoặc ≥20 mL/kg/24h) trong 7 ngày trước cấy máu (+). Không tính lỗi CLABSI."
        : "Ngoại lệ Tổn thương hàng rào niêm mạc (MBI-LCBI): tác nhân đường ruột + ANC/WBC <500 ≥2 ngày lịch hoặc HSCT/GVHD/neutropenia/tiêu chảy nặng. Không tính lỗi CLABSI.",
    };
  }

  return {
    is_positive: true,
    classification: "CLABSI",
    lcbi_type: lcbiType,
    reason: "Nhiễm khuẩn huyết liên quan đường truyền trung tâm (CLABSI). Ghi nhận lỗi cho khoa.",
  };
}

export function evaluateVaeVap(
  data: VaeVerificationData,
  pathway: "VAE" | "PNEU" = "VAE",
): RuleEvaluationResult {
  const useVaePathway = pathway === "VAE" && data.patient_age >= 18 && data.vent_days >= 4;

  if (pathway === "VAE" && !useVaePathway) {
    return {
      is_positive: false,
      classification: "NO_EVENT",
      reason:
        "VAE chỉ áp dụng người lớn ≥18 tuổi thở máy ≥4 ngày lịch. Chọn VAP (PedVAP) hoặc HAP nếu dùng tiêu chuẩn viêm phổi lâm sàng (PNEU).",
    };
  }

  if (useVaePathway) {
    // APRV/HFV/ECMO: ngày đó loại khỏi eligibility VAC (NHSN — không dùng PEEP/FiO2 chuẩn).
    if (data.on_aprv_or_hfv || data.on_ecmo) {
      return {
        is_positive: false,
        classification: "NO_EVENT",
        reason: data.on_ecmo
          ? "Ngày trên ECMO — loại khỏi giám sát VAE (không áp dụng PEEP/FiO₂ chuẩn)."
          : "Ngày trên APRV/HFV — loại khỏi giám sát VAE (chỉ theo dõi FiO₂; chưa đủ pipeline VAC chuẩn).",
      };
    }
    let stable = data.has_stable_baseline_peep_fio2;
    let peepUp = data.peep_increase_ge_3;
    let fioUp = data.fio2_increase_ge_20;
    if (data.vent_daily_params && data.vent_daily_params.length >= 4) {
      const vac = computeVacFromDailyVent(data.vent_daily_params);
      if (vac.has_stable_baseline && (vac.peep_increase_ge_3 || vac.fio2_increase_ge_20)) {
        stable = true;
        peepUp = vac.peep_increase_ge_3;
        fioUp = vac.fio2_increase_ge_20;
      }
    }
    const hasVac = stable && (peepUp || fioUp);
    if (!hasVac) {
      return {
        is_positive: false,
        classification: "NO_EVENT",
        reason:
          "Không có biến cố suy giảm thông số máy thở (không đạt VAC). Nhập bảng PEEP/FiO2 tối thiểu theo ngày hoặc tick VAC.",
      };
    }

    const hasIvac =
      (data.temp_fever_or_hypothermia || data.wbc_abnormal) && data.new_antimicrobial_ge_4days;
    if (!hasIvac) {
      return {
        is_positive: true,
        classification: "VAC",
        reason: "Đạt tiêu chuẩn VAC (suy giảm máy thở) nhưng chưa đủ điều kiện nhiễm khuẩn (IVAC).",
      };
    }

    const hasPvap =
      data.has_purulent_sputum_and_positive_culture ||
      data.has_quantitative_culture_positive ||
      data.has_respiratory_viral_or_pathogen_test_positive;

    if (hasPvap) {
      let isSecondary = false;
      if (data.has_blood_culture_in_event_period && data.blood_collection_date) {
        const doe = data.calculated_doe || data.blood_collection_date;
        const ep = vaeEventPeriod(doe);
        const sec = evaluateSecondaryBsi({
          primarySite: "PVAP",
          bloodCollectionDate: data.blood_collection_date,
          sbapStart: ep.start,
          sbapEnd: ep.end,
          bloodOrganism: data.blood_organism || "",
          primaryOrganism: data.respiratory_organism,
          organismsMatch: data.blood_respiratory_pathogen_matches,
          lungOrPleuralMatch: data.lung_or_pleural_match,
        });
        isSecondary = sec.isSecondary;
      }

      return {
        is_positive: true,
        classification: "PVAP",
        is_secondary_bsi: isSecondary || undefined,
        reason: isSecondary
          ? "PVAP đạt chuẩn; kèm Secondary BSI (máu trong 14-day Event Period, match)."
          : "Khả năng Viêm phổi liên quan đến thở máy (PVAP) đạt chuẩn CDC/NHSN.",
      };
    }

    return {
      is_positive: true,
      classification: "IVAC",
      reason: "Biến chứng thở máy có nhiễm khuẩn (IVAC) đạt chuẩn CDC/NHSN.",
    };
  }

  // PNEU pathway
  const age = Number(data.patient_age) || 0;
  if (isAdultVaeInPlan(age, data.vent_days)) {
    return {
      is_positive: false,
      classification: "NO_EVENT",
      reason: ADULT_VAE_IN_PLAN_REASON,
    };
  }

  const needsTwoFilms = data.has_cardiopulmonary_disease_underlying;
  const hasValidImaging =
    data.has_chest_imaging_abnormal &&
    (needsTwoFilms ? data.imaging_films_count >= 2 : data.imaging_films_count >= 1);

  if (!hasValidImaging) {
    return {
      is_positive: false,
      classification: "NO_EVENT",
      reason: "Không đủ tiêu chuẩn hình ảnh học ngực thâm nhiễm mới/tiến triển/dai dẳng.",
    };
  }

  const pediatricBranch = age > 0 && age <= 12;
  const infantBranch = age > 0 && age <= 1;
  const gas = !!data.has_worsening_gas_exchange;
  // ≤1 tuổi: suy trao đổi khí bắt buộc + ≥3 triệu chứng khác (gas không tính vào 3)
  const localCount = infantBranch
    ? data.respiratory_symptoms_count - (gas ? 1 : 0)
    : data.respiratory_symptoms_count;
  const needLocalPnu1 = pediatricBranch ? 3 : 2;
  const hasSystemic =
    infantBranch ||
    derivePneuSystemic(data) ||
    data.altered_mental_status_ge_70yo;
  const infantGasOk = !infantBranch || gas;
  const wideListMet =
    localCount >= 1 || !!data.has_hemoptysis || !!data.has_pleuritic_chest_pain;

  const ventAssoc = data.device_placed_date
    ? isDeviceAssociated({
        placedDate: data.device_placed_date,
        removedDate: data.device_removed_date,
        doe: data.calculated_doe || data.device_placed_date,
      })
    : null;
  // VAP (PNEU): ≥3 ngày lịch thở máy liên tục + hiện diện DOE/DOE−1
  const ventEligible = ventAssoc
    ? ventAssoc.associated
    : data.vent_days >= 3;
  const ventLabel = ventEligible ? "VAP" : "NON_VAP";

  // Lab-first: Table 2/3 (và legacy dropdown khi chưa nhập fact lab)
  const lab = derivePneuLabTier(data);
  const microTier = lab.tier;

  if (microTier === "PNU3") {
    if (!hasSystemic || !wideListMet || !infantGasOk) {
      return {
        is_positive: false,
        classification: "NO_EVENT",
        reason:
          "PNU3: cần hình ảnh + toàn thân + ≥1 triệu chứng list rộng (hô hấp hoặc ho ra máu / đau màng phổi). Không bắt buộc ho ra máu.",
      };
    }
    return {
      is_positive: true,
      classification: `PNU3_${ventLabel}`,
      reason: `Viêm phổi trên bệnh nhân suy giảm miễn dịch nặng (PNU3) — ${ventLabel}. ${lab.reasons.join(" ")}`,
    };
  }

  if (microTier === "PNU2") {
    if (!hasSystemic || localCount < 1 || !infantGasOk) {
      return {
        is_positive: false,
        classification: "NO_EVENT",
        reason:
          "PNU2: đạt lab nhưng thiếu toàn thân hoặc ≥1 nhóm hô hấp CDC (không siết ≥2 như PNU1).",
      };
    }
    return {
      is_positive: true,
      classification: `PNU2_${ventLabel}`,
      reason: `Viêm phổi có bằng chứng vi khuẩn/virus đặc hiệu (PNU2) — ${ventLabel}. ${lab.reasons.join(" ")}`,
    };
  }

  if (!hasSystemic || localCount < needLocalPnu1 || !infantGasOk) {
    return {
      is_positive: false,
      classification: "NO_EVENT",
      reason: infantBranch
        ? "Nhánh ≤1 tuổi: cần suy trao đổi khí + ≥3 triệu chứng lâm sàng (dòng riêng)."
        : pediatricBranch
          ? `Đạt hình ảnh nhưng thiếu triệu chứng (trẻ 1–12 tuổi cần ≥${needLocalPnu1} dấu hiệu).`
          : "Đạt tiêu chuẩn hình ảnh học nhưng thiếu triệu chứng toàn thân hoặc ≥2 nhóm hô hấp CDC.",
    };
  }

  const exclusionNote = lab.lab_excluded
    ? ` Lab LRT bị loại (không nâng bậc): ${lab.reasons.join(" ")}`
    : lab.used_lab_facts
      ? ` ${lab.reasons.join(" ")}`
      : "";

  return {
    is_positive: true,
    classification: `PNU1_${ventLabel}`,
    reason: `Viêm phổi lâm sàng (PNU1) đạt chuẩn CDC/NHSN — ${ventLabel}.${exclusionNote}`,
  };
}

export function evaluateUtiCauti(data: UtiVerificationData): RuleEvaluationResult {
  if (data.pathogen_count > 2) {
    return {
      is_positive: false,
      classification: "CONTAMINATION",
      reason: "Mẫu cấy nước tiểu bị tạp nhiễm (nhiều hơn 2 loại tác nhân vi sinh).",
    };
  }

  if (data.has_fungi_yeast_parasite) {
    return {
      is_positive: false,
      classification: "CANDIDA_EXCLUSION",
      reason: "CDC/NHSN cấm tuyệt đối việc sử dụng Nấm (Candida) hoặc ký sinh trùng để chẩn đoán CAUTI/UTI.",
    };
  }

  if (data.urine_cfu_count < 100000) {
    return {
      is_positive: false,
      classification: "LOW_CFU",
      reason: "Số lượng vi khuẩn trong nước tiểu không đạt ngưỡng chuẩn >= 10^5 CFU/ml.",
    };
  }

  // CAUTI: ≥3 ngày lịch liên tục + hiện diện DOE/DOE−1
  // Ưu tiên số ngày đã tính từ lưới (foley_placed_days); ngày đặt/rút seed phải khớp đợt đó.
  let isCauti = false;
  if (data.device_placed_date && data.calculated_doe) {
    isCauti = isDeviceAssociated({
      placedDate: data.device_placed_date,
      removedDate: data.device_removed_date,
      doe: data.calculated_doe,
    }).associated;
  } else {
    const present =
      data.foley_present_doe_or_prior !== undefined
        ? data.foley_present_doe_or_prior
        : data.foley_active_on_event;
    isCauti = data.foley_placed_days >= 3 && Boolean(present);
  }
  // Lưới đã đếm <3 ngày → không CAUTI dù ngày sổ cũ dài hơn
  if (data.foley_placed_days > 0 && data.foley_placed_days < 3) {
    isCauti = false;
  }

  // Voiding chỉ khi không còn Foley hiện diện quanh DOE (kể cả đợt <3 ngày)
  const foleyBlockingVoiding = Boolean(data.foley_active_on_event);
  const hasVoidingSymptom =
    !foleyBlockingVoiding &&
    (data.has_dysuria || Boolean(data.has_urgency) || Boolean(data.has_frequency));
  const hasInfantSymptom =
    Boolean(data.is_infant_le1) &&
    (data.has_fever ||
      Boolean(data.has_infant_hypothermia) ||
      Boolean(data.has_infant_apnea) ||
      Boolean(data.has_infant_bradycardia) ||
      Boolean(data.has_infant_lethargy) ||
      Boolean(data.has_infant_vomiting));
  const hasAnySymptom =
    data.has_fever ||
    data.has_suprapubic_tenderness ||
    data.has_costovertebral_pain ||
    hasVoidingSymptom ||
    hasInfantSymptom;

  if (hasAnySymptom) {
    // SUTI 1 (người lớn) giữ nhãn SUTI/CAUTI_SUTI; SUTI 2 (≤1 tuổi) tách nhánh riêng.
    if (data.is_infant_le1) {
      return {
        is_positive: true,
        classification: isCauti ? "CAUTI_SUTI_2" : "SUTI_2",
        reason: isCauti
          ? "CAUTI — SUTI 2 (≤1 tuổi) liên quan sonde tiểu."
          : "SUTI 2 (≤1 tuổi) — nhiễm khuẩn tiết niệu có triệu chứng không liên quan sonde tiểu.",
      };
    }
    return {
      is_positive: true,
      classification: isCauti ? "CAUTI_SUTI" : "SUTI",
      reason: isCauti
        ? "Nhiễm khuẩn tiết niệu có triệu chứng liên quan sonde tiểu (CAUTI SUTI 1)."
        : "SUTI 1 — nhiễm khuẩn tiết niệu có triệu chứng không liên quan sonde tiểu.",
    };
  }

  if (data.has_blood_culture_positive_in_window && data.blood_urine_pathogen_matches) {
    // Yeast blood cannot attribute secondary to UTI — guard via shared helper
    if (data.blood_organism) {
      const doe = data.calculated_doe || data.blood_collection_date || "";
      const sbap = resolveClinicalSbap({
        sbapStart: data.calculated_sbap_start,
        sbapEnd: data.calculated_sbap_end,
        iwpStart: data.calculated_iwp_start,
        doe,
      });
      if (sbap.start && data.blood_collection_date) {
        const sec = evaluateSecondaryBsi({
          primarySite: "UTI",
          bloodCollectionDate: data.blood_collection_date,
          sbapStart: sbap.start,
          sbapEnd: sbap.end,
          bloodOrganism: data.blood_organism,
          primaryOrganism: data.urine_organism,
          organismsMatch: data.blood_urine_pathogen_matches,
        });
        if (!sec.isSecondary) {
          return {
            is_positive: false,
            classification: "ASB",
            reason: `${sec.reason} Phân loại ASB; đánh giá Primary BSI/CLABSI riêng.`,
          };
        }
      }
    }

    return {
      is_positive: true,
      classification: isCauti ? "CAUTI_ABUTI" : "ABUTI",
      is_secondary_bsi: true,
      reason: isCauti
        ? "Nhiễm khuẩn tiết niệu không triệu chứng kèm cấy máu trùng khớp liên quan sonde tiểu (CAUTI ABUTI)."
        : "Nhiễm khuẩn tiết niệu không triệu chứng kèm cấy máu trùng khớp (ABUTI).",
    };
  }

  return {
    is_positive: false,
    classification: "ASB",
    reason:
      "Vi khuẩn niệu không triệu chứng (ASB), CDC khuyến cáo không điều trị kháng sinh thường quy và không tính là NKBV.",
  };
}

export function evaluateSsi(data: SsiVerificationData): RuleEvaluationResult {
  let days = data.days_since_surgery;
  if (data.surgery_date && data.doe_date) {
    const a = Date.parse(data.surgery_date.slice(0, 10));
    const b = Date.parse(data.doe_date.slice(0, 10));
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      days = Math.round((b - a) / 86400000);
    }
  }

  const event = getNhsnSsiEventType(data.ssi_event_type);
  const depth = event?.depth || data.ssi_depth;
  const limitDays = resolveSsiSurveillanceDays({
    depth,
    procedureCode: data.loai_phau_thuat_nhsn,
    hasImplantFallback: data.has_implant,
    eventTypeCode: data.ssi_event_type,
  });
  const proc = getNhsnProcedure(data.loai_phau_thuat_nhsn);
  const limitHint = isSecondaryIncisionalEvent(data.ssi_event_type)
    ? "đường mổ phụ SIS/DIS luôn 30 ngày"
    : proc
      ? `mã PT ${proc.code} · Deep/Organ ${proc.deep_organ_surveillance_days} ngày (nông/SIS/DIS luôn 30)`
      : data.has_implant
        ? "fallback implant 90 ngày (chưa chọn mã PT NHSN)"
        : "30 ngày (chưa chọn mã PT NHSN hoặc nông)";

  if (days > limitDays) {
    return {
      is_positive: false,
      classification: "EXPIRED",
      reason: `Vượt quá khung thời gian giám sát quy định (${limitDays} ngày — ${limitHint}).`,
    };
  }

  if (data.is_patos) {
    return {
      is_positive: false,
      classification: "PATOS",
      reason: "PATOS (Present at time of surgery) — không báo cáo SSI mới trên ca này theo NHSN.",
    };
  }

  let matched = false;
  let reason = "";

  if (depth === "ORGAN_SPACE") {
    const proc = String(data.loai_phau_thuat_nhsn || "").trim().toUpperCase();
    const obgynPainOk =
      !!data.organ_space_obgyn_abdominal_pain &&
      (proc === "CSEC" || proc === "HYST" || proc === "VHYS");
    const ch17 = evaluateCh17Type({
      typeCode: data.organ_space_site,
      evidence: normalizeCh17EvidenceFlags({
        ...(data.chapter17_flags || {}),
        ...(data.organ_space_obgyn_abdominal_pain
          ? { organ_space_obgyn_abdominal_pain: true }
          : {}),
      }),
      procedureCode: data.loai_phau_thuat_nhsn,
      isInfantLe1: data.is_infant_le1,
    });
    const genericOrgan =
      data.organ_space_purulent_drainage ||
      data.organ_space_culture_positive ||
      data.organ_space_abscess_imaging_pathology ||
      obgynPainOk;
    // Site có định nghĩa Ch.17 → đạt cây tiêu chuẩn hoặc tiêu chí Organ chung (purulent/culture/abscess)
    if (ch17.applicable) {
      if (ch17.met || genericOrgan) {
        matched = true;
        reason = ch17.met
          ? `Organ/Space SSI — ${ch17.reason}`
          : "Nhiễm khuẩn cơ quan/khoang (Organ/Space SSI) đạt chuẩn CDC/NHSN.";
      }
    } else if (genericOrgan) {
      matched = true;
      reason = obgynPainOk && !data.organ_space_purulent_drainage && !data.organ_space_culture_positive && !data.organ_space_abscess_imaging_pathology
        ? "Organ/Space SSI — đau bụng sau mổ (CSEC/HYST/VHYS) đạt chuẩn NHSN."
        : "Nhiễm khuẩn cơ quan/khoang (Organ/Space SSI) đạt chuẩn CDC/NHSN.";
    }
  } else if (depth === "DEEP") {
    if (
      data.deep_purulent_drainage ||
      data.deep_dehisced_or_opened_with_symptoms ||
      data.deep_abscess_imaging_pathology
    ) {
      matched = true;
      reason = "Nhiễm khuẩn vết mổ sâu mức cân/cơ (Deep Incisional SSI) đạt chuẩn CDC/NHSN.";
    }
  } else if (depth === "SUPERFICIAL") {
    if (
      data.superficial_purulent_drainage ||
      data.superficial_culture_positive ||
      data.superficial_opened_with_inflammation ||
      data.superficial_physician_diagnosis
    ) {
      matched = true;
      reason = "Nhiễm khuẩn vết mổ nông mức da/dưới da (Superficial Incisional SSI) đạt chuẩn CDC/NHSN.";
    }
  }

  if (!matched) {
    return {
      is_positive: false,
      classification: "NO_INFECTION",
      reason: "Không đáp ứng bất kỳ tiêu chuẩn chẩn đoán lâm sàng hay cận lâm sàng nào của SSI.",
    };
  }

  if (!event) {
    return {
      is_positive: false,
      classification: "INCOMPLETE",
      reason:
        "Thiếu mã loại sự kiện NHSN (SIP/SIS/DIP/DIS hoặc ORGAN_SPACE) — bắt buộc trước khi chốt ca.",
    };
  }

  if (depth === "ORGAN_SPACE") {
    const siteCode = (data.organ_space_site || "").trim();
    if (!siteCode) {
      return {
        is_positive: false,
        classification: "INCOMPLETE",
        reason: "Organ/Space SSI bắt buộc chọn mã vị trí cơ quan (Chương 17 NHSN).",
      };
    }
    if (!getNhsnOrganSpaceSite(siteCode)) {
      return {
        is_positive: false,
        classification: "INVALID_SITE",
        reason: `Mã vị trí Organ/Space «${siteCode}» không thuộc danh mục NHSN.`,
      };
    }
    if (!isOrganSpaceSiteAllowedForProcedure(siteCode, data.loai_phau_thuat_nhsn)) {
      return {
        is_positive: false,
        classification: "INVALID_SITE",
        reason: `Mã vị trí «${siteCode}» không hợp lệ với mã phẫu thuật «${data.loai_phau_thuat_nhsn || "—"}» (PJI chỉ HPRO/KPRO; VCUF chỉ HYST/VHYS).`,
      };
    }
    reason = `${reason} Vị trí: ${siteCode}.`;
  }

  const classification =
    nhsClassificationFromEvent(data.ssi_event_type, data.organ_space_site) || event.code;
  reason = `${event.name_vi}. ${reason}`;

  const secondaryWarn = secondaryIncisionMismatchWarning(
    data.ssi_event_type,
    data.loai_phau_thuat_nhsn,
  );
  if (secondaryWarn) {
    reason = `${reason} Cảnh báo: ${secondaryWarn}`;
  }

  let isSecondaryBsi = false;
  if (data.has_blood_culture_positive) {
    const doe = data.calculated_doe || "";
    const sbap =
      data.calculated_sbap_start && data.calculated_sbap_end
        ? { start: data.calculated_sbap_start, end: data.calculated_sbap_end }
        : doe
          ? ssiSbapWindow(doe)
          : { start: "", end: "" };
    if (sbap.start && data.blood_collection_date) {
      const sec = evaluateSecondaryBsi({
        primarySite: "SSI",
        bloodCollectionDate: data.blood_collection_date,
        sbapStart: sbap.start,
        sbapEnd: sbap.end,
        bloodOrganism: data.blood_organism || "",
        primaryOrganism: data.wound_organism,
        organismsMatch: data.blood_ssi_pathogen_matches,
        bloodMandatoryForPrimary: data.blood_mandatory_for_organ_space,
      });
      isSecondaryBsi = sec.isSecondary;
    } else {
      isSecondaryBsi = Boolean(data.blood_ssi_pathogen_matches);
    }
  }

  return {
    is_positive: true,
    classification,
    is_secondary_bsi: isSecondaryBsi,
    reason: isSecondaryBsi
      ? `${reason} Kèm theo Nhiễm khuẩn huyết thứ phát (Secondary BSI) trùng khớp tác nhân.`
      : reason,
  };
}

/** Ca Chương 17 độc lập (không SSI) — cùng cây tiêu chuẩn với Organ/Space. */
export function evaluateCh17(data: Ch17VerificationData): RuleEvaluationResult {
  const code = String(data.ch17_type_code || "")
    .trim()
    .toUpperCase();
  if (!code) {
    return {
      is_positive: false,
      classification: "INCOMPLETE",
      reason: "Thiếu mã loại nhiễm khuẩn Chương 17.",
    };
  }
  if (!ch17TypeDef(code)) {
    return {
      is_positive: false,
      classification: "INVALID_SITE",
      reason: `Mã «${code}» chưa có định nghĩa Ch.17 vận hành.`,
    };
  }

  const evalResult = evaluateCh17Type({
    typeCode: code,
    evidence: normalizeCh17EvidenceFlags(data.chapter17_flags),
    procedureCode: data.procedure_code,
    isInfantLe1: data.is_infant_le1,
  });

  if (!evalResult.met) {
    const miss =
      evalResult.missing.length > 0
        ? ` Thiếu: ${evalResult.missing.slice(0, 6).join(", ")}.`
        : "";
    return {
      is_positive: false,
      classification: "NO_INFECTION",
      reason: `${evalResult.reason}${miss}`,
    };
  }

  const hier = resolveCh17Hierarchy({
    metCodes: [code],
    daysSinceShunt: data.days_since_shunt,
    postCardiacMediastinitisWithSternum: data.post_cardiac_mediastinitis_with_sternum,
    menWithIcPostOpAbscess: data.men_with_ic_post_op_abscess,
    pneuMet: data.pneu_met,
    ssiLungAfterThor: data.ssi_lung_after_thor,
    procedureCode: data.procedure_code,
  });

  const report = hier.reportCode || code;
  let reason = `${evalResult.reason} ${hier.reason}`;

  if (report === "ENDO") {
    const idx = data.calculated_doe || "";
    if (idx) {
      const iwp = endoExtendedIwp(idx);
      const sbap = endoRitSbapToDischarge({
        indexDate: idx,
        dischargeDate: data.discharge_date,
      });
      reason = `${reason} ENDO IWP ${iwp.start}→${iwp.end}; SBAP/RIT tới ${sbap.sbapEnd}.`;
    }
  }

  const classification = hier.asSsi ? `SSI:${report}` : `CH17:${report}`;
  return {
    is_positive: true,
    classification,
    reason,
  };
}
