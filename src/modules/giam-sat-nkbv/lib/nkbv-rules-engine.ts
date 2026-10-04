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
  poaOrHai,
  resolveClinicalSbap,
  ssiSbapWindow,
  vaeEventPeriod,
} from "./nkbv-shared-timeline";
import { evaluateVaeEventPeriodSuppress } from "./nkbv-vae-event-period";
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
import { evaluateRuledOut } from "./nkbv-ruled-out";
import { applyCh2RitGate } from "./nkbv-rit-hard-stop";
import {
  evaluateMbiMucosalBarrier,
  isMbiEligibleOrganismFlag,
} from "./nkbv-mbi-ch4";


/** Ch.2 only: tự tính POA/HAI từ ngày VV + DOE — không tin hai_status client. SSI/VAE không gọi. */
export function applyCh2PoaGate(
  data: {
    hai_status?: "HAI" | "POA";
    calculated_doe?: string;
    ngay_vao_vien?: string;
    admission_date?: string;
  },
  result: RuleEvaluationResult,
): RuleEvaluationResult {
  if (!result.is_positive) return result;
  const adm = (data.ngay_vao_vien || data.admission_date || "").slice(0, 10);
  const doe = (data.calculated_doe || "").slice(0, 10);
  if (!adm || !doe || !/^\d{4}-\d{2}-\d{2}$/.test(adm) || !/^\d{4}-\d{2}-\d{2}$/.test(doe)) {
    return {
      is_positive: false,
      classification: "NO_EVENT",
      lcbi_type: result.lcbi_type,
      reason:
        "Thiếu ngày vào viện / DOE — chưa phân tích HAI (NHSN day-3).",
    };
  }
  const status = poaOrHai(adm, doe).haiStatus;
  if (status !== "POA") return result;
  return {
    is_positive: false,
    classification: "POA",
    lcbi_type: result.lcbi_type,
    reason:
      "DOE thuộc khung POA (ngày viện 1–2 / trước nhập theo Ch.2). Không tính HAI/NKBV — HAI theo NHSN day-3 (DOE từ ngày lịch thứ 3).",
  };
}

export interface RuleEvaluationResult {
  is_positive: boolean;
  classification: string;
  is_secondary_bsi?: boolean;
  lcbi_type?: string;
  reason: string;
  /** Soft 20d — SSI: user depth nông hơn engine (sâu nhất thắng). */
  warnings?: string[];
  /** Soft 20d — độ sâu engine chọn (deepest met). */
  ssi_engine_depth?: "SUPERFICIAL" | "DEEP" | "ORGAN_SPACE";
}

/** Triệu chứng lâm sàng LCBI (người lớn). */
export function bsiHasClinicalSymptoms(data: BsiVerificationData): boolean {
  if (data.has_fever || data.has_chills || data.has_hypotension) return true;
  return Boolean(data.symptoms_window_7days);
}

export function evaluateBsiClabsi(data: BsiVerificationData): RuleEvaluationResult {
  return applyCh2RitGate(data, "BSI", applyCh2PoaGate(data, evaluateBsiClabsiCore(data)));
}

function evaluateBsiClabsiCore(data: BsiVerificationData): RuleEvaluationResult {
  const ruledOut = evaluateRuledOut(data, "BSI");
  if (ruledOut) return ruledOut;

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
    lcbiType = "LCBI_1";
  } else if (data.pathogen_type === "COMMON_COMMENSAL") {
    if (data.commensal_culture_count >= 2 && data.commensal_drawn_separate && hasSx) {
      isLcbi = true;
      lcbiType = "LCBI_2";
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
    } else if (
      data.blood_mandatory_for_localized &&
      (data.is_in_sbap_window ||
        (Boolean(bloodDate) &&
          Boolean(sbap.start) &&
          bloodDate >= sbap.start &&
          (!sbap.end || bloodDate <= sbap.end)))
    ) {
      // Scenario 2: máu là criterion bắt buộc — vẫn phải ∈ SBAP/IWP (SSOT v4 §2.7)
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

  // MBI-LCBI Soft 20e Domain A — Ch.4 Table 2 (cite nkbv-sources/extracted/cdc-ch4.txt).
  // MBI = LCBI (already) + MBI-eligible organism + mucosal barrier. Never «ung thư = MBI».
  // Tick «giảm bạch cầu» đơn (is_neutropenia) không đủ — BSI-P0-1.
  // Tiêu chảy đơn không đủ — chỉ criterion 1b dưới allo HSCT (cite 415-421). Flag PO G.1#1 · G.1#5.
  const mbiBarrier = evaluateMbiMucosalBarrier({
    anc_wbc_lt_500_ge_2d: data.anc_wbc_lt_500_ge_2d,
    has_hsct_or_gvhd: data.has_hsct_or_gvhd,
    has_severe_diarrhea_mbi: data.has_severe_diarrhea_mbi,
    anc_wbc_samples: data.anc_wbc_samples,
    blood_collection_date: data.blood_collection_date || data.calculated_doe,
  });
  if (isMbiEligibleOrganismFlag(data.is_intestinal_pathogen) && mbiBarrier.met) {
    return {
      is_positive: true,
      classification: "MBI_LCBI",
      lcbi_type: lcbiType,
      reason: `${mbiBarrier.reason} Không tính lỗi CLABSI (MBI-LCBI).`,
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
  const raw = evaluateVaeVapCore(data, pathway);
  // POA/HAI day-3 + RIT chỉ áp PNEU lâm sàng; VAE bypass Ch.2 POA/RIT
  if (pathway !== "PNEU") return raw;
  return applyCh2RitGate(data, "PNEU", applyCh2PoaGate(data, raw));
}

function evaluateVaeVapCore(
  data: VaeVerificationData,
  pathway: "VAE" | "PNEU" = "VAE",
): RuleEvaluationResult {
  const ruledOut = evaluateRuledOut(data, pathway === "PNEU" ? "PNEU" : "VAE");
  if (ruledOut) return ruledOut;

  const useVaePathway = pathway === "VAE" && data.patient_age >= 18 && data.vent_days >= 4;

  if (pathway === "VAE" && !useVaePathway) {
    return {
      is_positive: false,
      classification: "NO_EVENT",
      reason:
        "VAE chỉ áp dụng người lớn ≥18 tuổi thở máy ≥4 ngày lịch. Chọn VAP hoặc HAP nếu dùng tiêu chuẩn viêm phổi lâm sàng (PNEU).",
    };
  }

  if (useVaePathway) {
    // NKBV-L11 · SSOT §C.4.10.4 — Event Period 14d suppress (NOT RIT Ch.2).
    const epGate = evaluateVaeEventPeriodSuppress({
      candidateDoe: data.calculated_doe,
      priorOpenVaeDoe: (data as { prior_open_vae_doe?: string | null }).prior_open_vae_doe,
    });
    if (epGate.suppressed) {
      return {
        is_positive: false,
        classification: epGate.classification || "EVENT_PERIOD_SUPPRESS",
        reason: epGate.reason || "Event Period 14 ngày — không tạo VAE mới chồng.",
      };
    }
    // Soft Soft 20f / NKBV-L06 — Domain A (cdc-ch10.txt:126-131 · 1460-1472):
    // - ECMO/HFV full calendar day → out of VAC stretch (day-level via vent grid)
    // - APRV → FiO₂-only (no PEEP-equivalent); NOT whole-day NO_EVENT
    // - Stub NO_EVENT whole-day removed once day-level carve-out runs on vent_daily_params
    const episodeMode = {
      on_ecmo: data.on_ecmo,
      on_hfv: data.on_hfv,
      on_aprv: data.on_aprv,
      on_aprv_or_hfv: data.on_aprv_or_hfv,
    };
    const hasDailyGrid =
      Array.isArray(data.vent_daily_params) && data.vent_daily_params.length >= 4;
    const aprvEpisode =
      !!data.on_aprv || !!(data.on_aprv_or_hfv && !data.on_hfv);

    // No daily grid: episode ECMO/HFV attestation still excludes (no day to carve).
    // APRV episode alone must NOT NO_EVENT — FiO₂ tick path below.
    if (!hasDailyGrid && (data.on_ecmo || data.on_hfv)) {
      return {
        is_positive: false,
        classification: "NO_EVENT",
        reason: data.on_ecmo
          ? "ECMO/ECLS trọn ngày — loại khỏi giám sát VAE (Ch.10). Nhập bảng theo ngày để loại từng ngày."
          : "HFV trọn ngày — loại khỏi giám sát VAE (Ch.10). Nhập bảng theo ngày để loại từng ngày.",
      };
    }

    let stable = data.has_stable_baseline_peep_fio2;
    let peepUp = data.peep_increase_ge_3;
    let fioUp = data.fio2_increase_ge_20;
    // APRV: ignore PEEP-equivalent ticks (Ch.10 FiO₂-only)
    if (aprvEpisode) peepUp = false;

    if (hasDailyGrid) {
      const vac = computeVacFromDailyVent(data.vent_daily_params!, episodeMode);
      if (vac.has_stable_baseline && (vac.peep_increase_ge_3 || vac.fio2_increase_ge_20)) {
        stable = true;
        peepUp = vac.peep_increase_ge_3;
        fioUp = vac.fio2_increase_ge_20;
      } else if (vac.excluded_dates && vac.excluded_dates.length > 0 && !vac.has_stable_baseline) {
        // Fall through: may still use manual ticks on remaining days; do not stub NO_EVENT.
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

  // BV103: thuật toán người lớn.
  const localCount = data.respiratory_symptoms_count;
  const needLocalPnu1 = 2;
  const hasSystemic = derivePneuSystemic(data) || data.altered_mental_status_ge_70yo;
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
    if (!hasSystemic || !wideListMet) {
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
    if (!hasSystemic || localCount < 1) {
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

  if (!hasSystemic || localCount < needLocalPnu1) {
    return {
      is_positive: false,
      classification: "NO_EVENT",
      reason:
        "Đạt tiêu chuẩn hình ảnh học nhưng thiếu triệu chứng toàn thân hoặc ≥2 nhóm hô hấp CDC.",
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

function attachUtiSecondaryBsi(
  data: UtiVerificationData,
  result: RuleEvaluationResult,
): RuleEvaluationResult {
  if (!result.is_positive || result.is_secondary_bsi) return result;
  if (!/SUTI/.test(result.classification)) return result;
  if (!data.blood_urine_pathogen_matches) return result;
  const bloodDate = (data.blood_collection_date || "").slice(0, 10);
  if (!bloodDate && !data.has_blood_culture_positive_in_window) return result;
  if (/candida|yeast|nấm men|nam men/i.test(data.blood_organism || "")) return result;
  if (bloodDate) {
    const doe = (data.calculated_doe || bloodDate).slice(0, 10);
    const sbap = resolveClinicalSbap({
      sbapStart: data.calculated_sbap_start,
      sbapEnd: data.calculated_sbap_end,
      iwpStart: data.calculated_iwp_start,
      doe,
    });
    if (sbap.start && sbap.end) {
      const sec = evaluateSecondaryBsi({
        primarySite: "UTI",
        bloodCollectionDate: bloodDate,
        sbapStart: sbap.start,
        sbapEnd: sbap.end,
        bloodOrganism: data.blood_organism || "",
        primaryOrganism: data.urine_organism,
        organismsMatch: data.blood_urine_pathogen_matches,
      });
      return sec.isSecondary ? { ...result, is_secondary_bsi: true } : result;
    }
  }
  return { ...result, is_secondary_bsi: true };
}

export function evaluateUtiCauti(data: UtiVerificationData): RuleEvaluationResult {
  return applyCh2RitGate(data, "UTI", applyCh2PoaGate(data, evaluateUtiCautiCore(data)));
}

function evaluateUtiCautiCore(data: UtiVerificationData): RuleEvaluationResult {
  const ruledOut = evaluateRuledOut(data, "UTI");
  if (ruledOut) return ruledOut;

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
  const hasAnySymptom =
    data.has_fever ||
    data.has_suprapubic_tenderness ||
    data.has_costovertebral_pain ||
    hasVoidingSymptom;

  if (hasAnySymptom) {
    return attachUtiSecondaryBsi(data, {
      is_positive: true,
      classification: isCauti ? "CAUTI_SUTI" : "SUTI",
      reason: isCauti
        ? "Nhiễm khuẩn tiết niệu có triệu chứng liên quan sonde tiểu (CAUTI SUTI 1)."
        : "SUTI 1 — nhiễm khuẩn tiết niệu có triệu chứng không liên quan sonde tiểu.",
    });
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

export type SsiDepthTier = "SUPERFICIAL" | "DEEP" | "ORGAN_SPACE";

const SSI_DEPTH_RANK: Record<SsiDepthTier, number> = {
  SUPERFICIAL: 1,
  DEEP: 2,
  ORGAN_SPACE: 3,
};

export function ssiDepthRank(depth: string | null | undefined): number {
  if (depth === "ORGAN_SPACE") return 3;
  if (depth === "DEEP") return 2;
  if (depth === "SUPERFICIAL") return 1;
  return 0;
}

export function ssiSuperficialCriteriaMet(data: SsiVerificationData): boolean {
  return Boolean(
    data.superficial_purulent_drainage ||
      data.superficial_culture_positive ||
      data.superficial_opened_with_inflammation ||
      data.superficial_physician_diagnosis,
  );
}

export function ssiDeepCriteriaMet(data: SsiVerificationData): boolean {
  return Boolean(
    data.deep_purulent_drainage ||
      data.deep_dehisced_or_opened_with_symptoms ||
      data.deep_abscess_imaging_pathology,
  );
}

/** Tiêu chí Organ/Space chung đã có trên form — không invent thêm. */
export function ssiOrganGenericCriteriaMet(data: SsiVerificationData): boolean {
  const proc = String(data.loai_phau_thuat_nhsn || "").trim().toUpperCase();
  const obgynPainOk =
    !!data.organ_space_obgyn_abdominal_pain &&
    (proc === "CSEC" || proc === "HYST" || proc === "VHYS");
  return Boolean(
    data.organ_space_purulent_drainage ||
      data.organ_space_culture_positive ||
      data.organ_space_abscess_imaging_pathology ||
      obgynPainOk,
  );
}

/**
 * Organ/Space met (SSOT C.5.3 / DoD 20d):
 * - có mã site; và
 * - nếu site có định nghĩa Ch.17 → **bắt buộc** ≥1 tiêu chí Ch.17 met (generic alone không nâng Organ);
 * - nếu site chưa có def Ch.17 → dùng tiêu chí Organ chung (không invent Ch.17).
 */
export function ssiOrganSpaceCriteriaMet(data: SsiVerificationData): {
  met: boolean;
  reason: string;
  ch17Applicable: boolean;
  ch17Met: boolean;
} {
  const siteCode = (data.organ_space_site || "").trim();
  if (!siteCode) {
    return { met: false, reason: "", ch17Applicable: false, ch17Met: false };
  }
  const ch17 = evaluateCh17Type({
    typeCode: siteCode,
    evidence: normalizeCh17EvidenceFlags({
      ...(data.chapter17_flags || {}),
      ...(data.organ_space_obgyn_abdominal_pain
        ? { organ_space_obgyn_abdominal_pain: true }
        : {}),
    }),
    procedureCode: data.loai_phau_thuat_nhsn,
  });
  const generic = ssiOrganGenericCriteriaMet(data);
  if (ch17.applicable) {
    if (ch17.met) {
      return {
        met: true,
        reason: `Organ/Space SSI — ${ch17.reason}`,
        ch17Applicable: true,
        ch17Met: true,
      };
    }
    // DoD: Organ thiếu Ch.17 → không Organ (kể cả khi generic flags bật)
    return {
      met: false,
      reason: "",
      ch17Applicable: true,
      ch17Met: false,
    };
  }
  if (generic) {
    const proc = String(data.loai_phau_thuat_nhsn || "").trim().toUpperCase();
    const obgynOnly =
      !!data.organ_space_obgyn_abdominal_pain &&
      (proc === "CSEC" || proc === "HYST" || proc === "VHYS") &&
      !data.organ_space_purulent_drainage &&
      !data.organ_space_culture_positive &&
      !data.organ_space_abscess_imaging_pathology;
    return {
      met: true,
      reason: obgynOnly
        ? "Organ/Space SSI — đau bụng sau mổ (CSEC/HYST/VHYS) đạt chuẩn NHSN."
        : "Nhiễm khuẩn cơ quan/khoang (Organ/Space SSI) đạt chuẩn CDC/NHSN.",
      ch17Applicable: false,
      ch17Met: false,
    };
  }
  return { met: false, reason: "", ch17Applicable: false, ch17Met: false };
}

function ssiDepthWithinSp(
  data: SsiVerificationData,
  depth: SsiDepthTier,
  days: number,
  eventTypeCode?: string,
): boolean {
  const limitDays = resolveSsiSurveillanceDays({
    depth,
    procedureCode: data.loai_phau_thuat_nhsn,
    eventTypeCode,
  });
  if (limitDays == null) return false;
  return days < limitDays;
}

/** Event type khớp độ sâu engine; giữ primary/secondary incision nếu có. */
export function ssiEventTypeForEngineDepth(
  userEventType: string | null | undefined,
  engineDepth: SsiDepthTier,
): string {
  const ev = getNhsnSsiEventType(userEventType);
  if (engineDepth === "ORGAN_SPACE") return "ORGAN_SPACE";
  if (engineDepth === "DEEP") {
    return ev?.incision === "SECONDARY" ? "DIS" : "DIP";
  }
  return ev?.incision === "SECONDARY" ? "SIS" : "SIP";
}

export function evaluateSsi(data: SsiVerificationData): RuleEvaluationResult {
  const ruledOut = evaluateRuledOut(data, "SSI");
  if (ruledOut) return ruledOut;

  let days = data.days_since_surgery;
  if (data.surgery_date && data.doe_date) {
    const a = Date.parse(data.surgery_date.slice(0, 10));
    const b = Date.parse(data.doe_date.slice(0, 10));
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      days = Math.round((b - a) / 86400000);
    }
  }

  const userEvent = getNhsnSsiEventType(data.ssi_event_type);
  const userDepth: SsiDepthTier | "NONE" =
    (userEvent?.depth as SsiDepthTier | undefined) ||
    (data.ssi_depth === "NONE" ? "NONE" : data.ssi_depth) ||
    "SUPERFICIAL";

  const userEventCode = data.ssi_event_type;
  const proc = getNhsnProcedure(data.loai_phau_thuat_nhsn);
  const userLimitDays = resolveSsiSurveillanceDays({
    depth: userDepth === "NONE" ? "SUPERFICIAL" : userDepth,
    procedureCode: data.loai_phau_thuat_nhsn,
    eventTypeCode: userEventCode,
  });
  if (userLimitDays == null) {
    return {
      is_positive: false,
      classification: "NO_EVENT",
      reason:
        "Thiếu nhóm thủ thuật NHSN — không xác định SP. Chọn mã PT trước khi đánh giá SSI.",
    };
  }
  const limitHint = isSecondaryIncisionalEvent(data.ssi_event_type)
    ? "đường mổ phụ SIS/DIS luôn 30 ngày"
    : proc
      ? `mã PT ${proc.code} · Deep/Organ ${proc.deep_organ_surveillance_days} ngày (nông/SIS/DIS luôn 30)`
      : "SP nông 30 ngày";

  if (data.is_patos) {
    return {
      is_positive: false,
      classification: "PATOS",
      reason: "PATOS (Present at time of surgery) — không báo cáo SSI mới trên ca này theo NHSN.",
    };
  }

  // Site allowlist / catalog — fail-closed sớm khi BA chọn site (kể cả khi Ch.17 chưa met)
  const siteEarly = (data.organ_space_site || "").trim();
  if (siteEarly) {
    if (!getNhsnOrganSpaceSite(siteEarly)) {
      return {
        is_positive: false,
        classification: "INVALID_SITE",
        reason: `Mã vị trí Organ/Space «${siteEarly}» không thuộc danh mục NHSN.`,
      };
    }
    if (!isOrganSpaceSiteAllowedForProcedure(siteEarly, data.loai_phau_thuat_nhsn)) {
      return {
        is_positive: false,
        classification: "INVALID_SITE",
        reason: `Mã vị trí «${siteEarly}» không hợp lệ với mã phẫu thuật «${data.loai_phau_thuat_nhsn || "—"}» (PJI chỉ HPRO/KPRO; VCUF chỉ HYST/VHYS).`,
      };
    }
  }

  // Candidates met by existing depth flags (DoD: không invent Organ criteria)
  const organEval = ssiOrganSpaceCriteriaMet(data);
  const candidates: Array<{ depth: SsiDepthTier; reason: string }> = [];
  if (ssiSuperficialCriteriaMet(data)) {
    candidates.push({
      depth: "SUPERFICIAL",
      reason:
        "Nhiễm khuẩn vết mổ nông mức da/dưới da (Superficial Incisional SSI) đạt chuẩn CDC/NHSN.",
    });
  }
  if (ssiDeepCriteriaMet(data)) {
    candidates.push({
      depth: "DEEP",
      reason: "Nhiễm khuẩn vết mổ sâu mức cân/cơ (Deep Incisional SSI) đạt chuẩn CDC/NHSN.",
    });
  }
  if (organEval.met) {
    candidates.push({ depth: "ORGAN_SPACE", reason: organEval.reason });
  }

  const inWindow = candidates.filter((c) =>
    ssiDepthWithinSp(data, c.depth, days, ssiEventTypeForEngineDepth(userEventCode, c.depth)),
  );

  if (!inWindow.length) {
    if (candidates.length || days >= userLimitDays) {
      return {
        is_positive: false,
        classification: "EXPIRED",
        reason: `Vượt quá khung thời gian giám sát quy định (${userLimitDays} ngày — ${limitHint}).`,
      };
    }
    return {
      is_positive: false,
      classification: "NO_INFECTION",
      reason: "Không đáp ứng bất kỳ tiêu chuẩn chẩn đoán lâm sàng hay cận lâm sàng nào của SSI.",
    };
  }

  inWindow.sort((a, b) => SSI_DEPTH_RANK[b.depth] - SSI_DEPTH_RANK[a.depth]);
  const picked = inWindow[0]!;
  const engineDepth = picked.depth;
  let reason = picked.reason;

  const warnings: string[] = [];
  if (
    userDepth !== "NONE" &&
    ssiDepthRank(userDepth) > 0 &&
    ssiDepthRank(userDepth) < ssiDepthRank(engineDepth)
  ) {
    warnings.push(
      `Độ sâu form (${userDepth}) nông hơn kết luận engine (${engineDepth}) — báo cáo theo ${engineDepth} (sâu nhất thắng).`,
    );
  }

  const engineEventCode = data.ssi_event_type
    ? ssiEventTypeForEngineDepth(data.ssi_event_type, engineDepth)
    : "";
  const event = engineEventCode ? getNhsnSsiEventType(engineEventCode) : null;

  if (!data.ssi_event_type) {
    return {
      is_positive: false,
      classification: "INCOMPLETE",
      reason:
        "Thiếu mã loại sự kiện NHSN (SIP/SIS/DIP/DIS hoặc ORGAN_SPACE) — bắt buộc trước khi chốt ca.",
      warnings: warnings.length ? warnings : undefined,
      ssi_engine_depth: engineDepth,
    };
  }

  if (engineDepth === "ORGAN_SPACE") {
    const siteCode = (data.organ_space_site || "").trim();
    if (!siteCode) {
      return {
        is_positive: false,
        classification: "INCOMPLETE",
        reason: "Organ/Space SSI bắt buộc chọn mã vị trí cơ quan (Chương 17 NHSN).",
        warnings: warnings.length ? warnings : undefined,
        ssi_engine_depth: engineDepth,
      };
    }
    if (!getNhsnOrganSpaceSite(siteCode)) {
      return {
        is_positive: false,
        classification: "INVALID_SITE",
        reason: `Mã vị trí Organ/Space «${siteCode}» không thuộc danh mục NHSN.`,
        warnings: warnings.length ? warnings : undefined,
        ssi_engine_depth: engineDepth,
      };
    }
    if (!isOrganSpaceSiteAllowedForProcedure(siteCode, data.loai_phau_thuat_nhsn)) {
      return {
        is_positive: false,
        classification: "INVALID_SITE",
        reason: `Mã vị trí «${siteCode}» không hợp lệ với mã phẫu thuật «${data.loai_phau_thuat_nhsn || "—"}» (PJI chỉ HPRO/KPRO; VCUF chỉ HYST/VHYS).`,
        warnings: warnings.length ? warnings : undefined,
        ssi_engine_depth: engineDepth,
      };
    }
    reason = `${reason} Vị trí: ${siteCode}.`;
  }

  const classification =
    nhsClassificationFromEvent(engineEventCode, data.organ_space_site) ||
    event?.code ||
    engineEventCode;
  reason = `${event?.name_vi || engineEventCode}. ${reason}`;

  const secondaryWarn = secondaryIncisionMismatchWarning(
    engineEventCode,
    data.loai_phau_thuat_nhsn,
  );
  if (secondaryWarn) {
    reason = `${reason} Cảnh báo: ${secondaryWarn}`;
  }
  if (warnings.length) {
    reason = `${reason} Cảnh báo: ${warnings.join(" ")}`;
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
    warnings: warnings.length ? warnings : undefined,
    ssi_engine_depth: engineDepth,
  };
}

/** Ca Chương 17 độc lập (không SSI) — cùng cây tiêu chuẩn với Organ/Space. */
export function evaluateCh17(data: Ch17VerificationData): RuleEvaluationResult {
  const specific = String(data.ch17_type_code || "").trim().toUpperCase() || null;
  return applyCh2RitGate(
    data,
    "CH17",
    applyCh2PoaGate(data, evaluateCh17Core(data)),
    specific,
  );
}

function evaluateCh17Core(data: Ch17VerificationData): RuleEvaluationResult {
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
