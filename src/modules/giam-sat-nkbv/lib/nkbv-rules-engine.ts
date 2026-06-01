/**
 * CDC/NHSN 2023 Rules Engine for HAI Surveillance (Giám sát NKBV)
 * 
 * Tài liệu tham chiếu: 
 * - docs/Thuạt̂ Toán Xác Định Nhiễm Khuẩn Huyết BSI Và CLABSI.md
 * - docs/Thuạt̂ toán Giám sát Viêm phổi Bệnh viện Bản 2.1.md
 * - docs/Thuạt̂ toán Giám sát và Chẩn đoán Nhiễm khuẩn Tiết niệu.md
 * - docs/Thuạt̂ toán Chẩn đoán và Giám sát Nhiễm khuẩn Vết mổ hiệu quả.md
 */

import { 
  BsiVerificationData, 
  VaeVerificationData, 
  UtiVerificationData, 
  SsiVerificationData 
} from "../types/nkbv-verification";

export interface RuleEvaluationResult {
  is_positive: boolean;
  classification: string;
  is_secondary_bsi?: boolean;
  lcbi_type?: string; // LCBI_1, LCBI_2, etc. (for BSI)
  reason: string;
}

/**
 * 1. Thuật toán chẩn đoán BSI / CLABSI / MBI-LCBI
 */
export function evaluateBsiClabsi(data: BsiVerificationData): RuleEvaluationResult {
  // Bước 1: Loại nấm cộng đồng
  if (data.is_fungi_respiratory) {
    return { 
      is_positive: false, 
      classification: "COMMUNITY_INFECTION", 
      reason: "Nhiễm nấm hô hấp cộng đồng (Blastomyces, Histoplasma...), không phải BSI bệnh viện." 
    };
  }

  let isLcbi = false;
  let lcbiType = "";

  // Bước 2: Xác định LCBI
  if (data.pathogen_type === 'RECOGNIZED') {
    isLcbi = true;
    lcbiType = "LCBI_1";
  } else if (data.pathogen_type === 'COMMON_COMMENSAL') {
    if (data.commensal_culture_count >= 2 && data.commensal_drawn_separate && data.symptoms_window_7days) {
      isLcbi = true;
      lcbiType = "LCBI_2";
    }
  }

  if (!isLcbi) {
    return { 
      is_positive: false, 
      classification: "CONTAMINATION", 
      reason: "Ngoại nhiễm hoặc thiếu triệu chứng lâm sàng đối với vi khuẩn cộng sinh ngoài da." 
    };
  }

  // Bước 3: Lọc Secondary BSI (Nhiễm khuẩn huyết thứ phát)
  let isSecondary = false;
  if (data.has_localized_infection) {
    if (data.localized_pathogen_matches && data.is_in_sbap_window) {
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
      reason: "Nhiễm khuẩn huyết thứ phát xuất phát từ ổ nhiễm trùng tại chỗ khác. Tuyệt đối KHÔNG tính lỗi CLABSI."
    };
  }

  // Bước 4: Lọc thiết bị CVC để xác định CLABSI
  const hasCvc = data.cvc_placed_days >= 3 && data.cvc_active_on_event;
  if (!hasCvc) {
    return { 
      is_positive: true, 
      classification: "PRIMARY_BSI_NON_CLABSI", 
      lcbi_type: lcbiType, 
      reason: "BSI tiên phát nhưng không đặt CVC liên tục > 2 ngày lịch." 
    };
  }

  // Bước 5: Kiểm tra ngoại lệ MBI-LCBI (Tổn thương hàng rào niêm mạc)
  if (data.is_intestinal_pathogen && data.is_neutropenia) {
    return { 
      is_positive: true, 
      classification: "MBI_LCBI", 
      lcbi_type: lcbiType,
      reason: "Ngoại lệ Tổn thương hàng rào niêm mạc ruột (MBI-LCBI) do hóa trị/giảm bạch cầu hạt nặng. Không tính lỗi CLABSI." 
    };
  }

  return { 
    is_positive: true, 
    classification: "CLABSI", 
    lcbi_type: lcbiType, 
    reason: "Nhiễm khuẩn huyết liên quan đường truyền trung tâm (CLABSI). Ghi nhận lỗi cho khoa." 
  };
}

/**
 * 2. Thuật toán chẩn đoán VAE / VAP (Adult) & PNEU (Pediatric/Non-vent)
 */
export function evaluateVaeVap(data: VaeVerificationData): RuleEvaluationResult {
  const isAdultVentilated = data.patient_age >= 18 && data.vent_days >= 4;

  if (isAdultVentilated) {
    // Luồng VAE cho người lớn thở máy >= 4 ngày
    // Giai đoạn 1: VAC
    const hasVac = data.has_stable_baseline_peep_fio2 && (data.peep_increase_ge_3 || data.fio2_increase_ge_20);
    if (!hasVac) {
      return {
        is_positive: false,
        classification: "NO_EVENT",
        reason: "Không có biến cố suy giảm thông số máy thở (không đạt VAC)."
      };
    }

    // Giai đoạn 2: IVAC
    const hasIvac = (data.temp_fever_or_hypothermia || data.wbc_abnormal) && data.new_antimicrobial_ge_4days;
    if (!hasIvac) {
      return {
        is_positive: true,
        classification: "VAC",
        reason: "Đạt tiêu chuẩn VAC (suy giảm máy thở) nhưng chưa đủ điều kiện nhiễm khuẩn (IVAC)."
      };
    }

    // Giai đoạn 3: PVAP
    const hasPvap = 
      data.has_purulent_sputum_and_positive_culture || 
      data.has_quantitative_culture_positive || 
      data.has_respiratory_viral_or_pathogen_test_positive;

    if (hasPvap) {
      return {
        is_positive: true,
        classification: "PVAP",
        reason: "Khả năng Viêm phổi liên quan đến thở máy (PVAP) đạt chuẩn CDC/NHSN."
      };
    }

    return {
      is_positive: true,
      classification: "IVAC",
      reason: "Biến chứng thở máy có nhiễm khuẩn (IVAC) đạt chuẩn CDC/NHSN."
    };

  } else {
    // Luồng PNEU (Viêm phổi lâm sàng/vi sinh cho người lớn không thở máy, trẻ em)
    // Bước 1: Hình ảnh học
    const needsTwoFilms = data.has_cardiopulmonary_disease_underlying;
    const hasValidImaging = data.has_chest_imaging_abnormal && 
      (needsTwoFilms ? data.imaging_films_count >= 2 : data.imaging_films_count >= 1);
    
    if (!hasValidImaging) {
      return {
        is_positive: false,
        classification: "NO_EVENT",
        reason: "Không đủ tiêu chuẩn hình ảnh học ngực thâm nhiễm mới/tiến triển/dai dẳng."
      };
    }

    // Bước 2: Triệu chứng lâm sàng
    const hasSystemic = data.fever_or_wbc_abnormal || data.altered_mental_status_ge_70yo;
    const hasLocal = data.respiratory_symptoms_count >= 2;

    if (!hasSystemic || !hasLocal) {
      return {
        is_positive: false,
        classification: "NO_EVENT",
        reason: "Đạt tiêu chuẩn hình ảnh học nhưng thiếu triệu chứng toàn thân hoặc tại chỗ của Viêm phổi."
      };
    }

    // Bước 3: Nâng cấp vi sinh
    if (data.microbiology_evidence === 'PNU3') {
      return {
        is_positive: true,
        classification: "PNU3",
        reason: "Viêm phổi trên bệnh nhân suy giảm miễn dịch nặng (PNU3)."
      };
    }

    if (data.microbiology_evidence === 'PNU2') {
      return {
        is_positive: true,
        classification: "PNU2",
        reason: "Viêm phổi có bằng chứng vi khuẩn/virus đặc hiệu (PNU2)."
      };
    }

    return {
      is_positive: true,
      classification: "PNU1",
      reason: "Viêm phổi lâm sàng (PNU1) đạt chuẩn CDC/NHSN."
    };
  }
}

/**
 * 3. Thuật toán chẩn đoán Nhiễm khuẩn tiết niệu (UTI / CAUTI)
 */
export function evaluateUtiCauti(data: UtiVerificationData): RuleEvaluationResult {
  // Bước 1: Bộ lọc vi sinh & loại bỏ rác
  if (data.pathogen_count > 2) {
    return {
      is_positive: false,
      classification: "CONTAMINATION",
      reason: "Mẫu cấy nước tiểu bị tạp nhiễm (nhiều hơn 2 loại tác nhân vi sinh)."
    };
  }

  if (data.has_fungi_yeast_parasite) {
    return {
      is_positive: false,
      classification: "CANDIDA_EXCLUSION",
      reason: "CDC/NHSN cấm tuyệt đối việc sử dụng Nấm (Candida) hoặc ký sinh trùng để chẩn đoán CAUTI/UTI."
    };
  }

  if (data.urine_cfu_count < 100000) {
    return {
      is_positive: false,
      classification: "LOW_CFU",
      reason: "Số lượng vi khuẩn trong nước tiểu không đạt ngưỡng chuẩn >= 10^5 CFU/ml."
    };
  }

  // Bước 2: Thiết bị (Foley)
  const isCauti = data.foley_placed_days >= 3 && data.foley_active_on_event;

  // Bước 3: Đánh giá lâm sàng (SUTI)
  const hasDysuria = !data.foley_active_on_event && data.has_dysuria;
  const hasAnySymptom = 
    data.has_fever || 
    data.has_suprapubic_tenderness || 
    data.has_costovertebral_pain || 
    hasDysuria;

  if (hasAnySymptom) {
    return {
      is_positive: true,
      classification: isCauti ? "CAUTI_SUTI" : "SUTI",
      reason: isCauti
        ? "Nhiễm khuẩn tiết niệu có triệu chứng liên quan sonde tiểu (CAUTI SUTI)."
        : "Nhiễm khuẩn tiết niệu có triệu chứng không liên quan sonde tiểu (SUTI)."
    };
  }

  // Bước 4: Kiểm tra ngoại lệ ABUTI (Cấy máu dương tính trùng khớp)
  if (data.has_blood_culture_positive_in_window && data.blood_urine_pathogen_matches) {
    return {
      is_positive: true,
      classification: isCauti ? "CAUTI_ABUTI" : "ABUTI",
      is_secondary_bsi: true,
      reason: isCauti
        ? "Nhiễm khuẩn tiết niệu không triệu chứng kèm cấy máu trùng khớp liên quan sonde tiểu (CAUTI ABUTI)."
        : "Nhiễm khuẩn tiết niệu không triệu chứng kèm cấy máu trùng khớp (ABUTI)."
    };
  }

  return {
    is_positive: false,
    classification: "ASB",
    reason: "Vi khuẩn niệu không triệu chứng (ASB), CDC khuyến cáo không điều trị kháng sinh thường quy và không tính là NKBV."
  };
}

/**
 * 4. Thuật toán chẩn đoán Nhiễm khuẩn vết mổ (SSI)
 */
export function evaluateSsi(data: SsiVerificationData): RuleEvaluationResult {
  // Bước 1: Khung thời gian giám sát
  const limitDays = data.has_implant ? 90 : 30;
  if (data.days_since_surgery > limitDays) {
    return {
      is_positive: false,
      classification: "EXPIRED",
      reason: `Vượt quá khung thời gian giám sát quy định (${limitDays} ngày đối với phẫu thuật ${data.has_implant ? 'có implant' : 'không implant'}).`
    };
  }

  let matched = false;
  let classification = "NONE";
  let reason = "";

  // Bước 2: Phân loại độ sâu
  if (data.ssi_depth === 'ORGAN_SPACE') {
    if (data.organ_space_purulent_drainage || data.organ_space_culture_positive || data.organ_space_abscess_imaging_pathology) {
      matched = true;
      classification = "SSI_ORGAN_SPACE";
      reason = "Nhiễm khuẩn vết mổ sâu mức cơ quan/khoang (Organ/Space SSI) đạt chuẩn CDC/NHSN.";
    }
  } else if (data.ssi_depth === 'DEEP') {
    if (data.deep_purulent_drainage || data.deep_dehisced_or_opened_with_symptoms || data.deep_abscess_imaging_pathology) {
      matched = true;
      classification = "SSI_DEEP";
      reason = "Nhiễm khuẩn vết mổ sâu mức cân/cơ (Deep Incisional SSI) đạt chuẩn CDC/NHSN.";
    }
  } else if (data.ssi_depth === 'SUPERFICIAL') {
    if (data.superficial_purulent_drainage || data.superficial_culture_positive || 
        data.superficial_opened_with_inflammation || data.superficial_physician_diagnosis) {
      matched = true;
      classification = "SSI_SUPERFICIAL";
      reason = "Nhiễm khuẩn vết mổ nông mức da/dưới da (Superficial Incisional SSI) đạt chuẩn CDC/NHSN.";
    }
  }

  if (!matched) {
    return {
      is_positive: false,
      classification: "NO_INFECTION",
      reason: "Không đáp ứng bất kỳ tiêu chuẩn chẩn đoán lâm sàng hay cận lâm sàng nào của SSI."
    };
  }

  // Bước 3: Kiểm tra Secondary BSI trùng khớp
  const isSecondaryBsi = data.has_blood_culture_positive && data.blood_ssi_pathogen_matches;

  return {
    is_positive: true,
    classification,
    is_secondary_bsi: isSecondaryBsi,
    reason: isSecondaryBsi
      ? `${reason} Kèm theo Nhiễm khuẩn huyết thứ phát (Secondary BSI) trùng khớp tác nhân.`
      : reason
  };
}
