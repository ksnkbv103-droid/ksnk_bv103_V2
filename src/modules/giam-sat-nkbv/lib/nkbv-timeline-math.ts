import type { DepartmentStay } from "../types/nkbv-verification";

export interface CdcMetricsInput {
  ngay_phat_hien: string;
  ngay_vao_vien: string;
  checklistType: 'BSI' | 'VAE' | 'UTI' | 'SSI';
  activeForm: any;
  symptomDates: Record<string, string>;
  treatmentHistory: DepartmentStay[];
}

export interface CdcMetricsResult {
  doe: string;
  iwp_start: string;
  iwp_end: string;
  sbap_start: string;
  sbap_end: string;
  dayOfHospitalization: number;
  haiStatus: 'HAI' | 'POA';
  attributedStay: DepartmentStay | null;
  attributionReason: string;
  device_placed_days: number;
  device_active_on_event: boolean;
}

// Pure date-math utility helpers in string YYYY-MM-DD
export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return "";
  }
}

export function subDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return "";
  }
}

function getDaysBetween(d1Str: string, d2Str: string): number {
  if (!d1Str || !d2Str) return 0;
  try {
    const d1 = new Date(d1Str.slice(0, 10));
    const d2 = new Date(d2Str.slice(0, 10));
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  } catch (e) {
    return 0;
  }
}

/**
 * Calculates DOE, IWP, SBAP, and Attributes Location based on NHSN 2023 Rules
 */
export function calculateCdcMetrics(input: CdcMetricsInput): CdcMetricsResult {
  const { ngay_phat_hien, ngay_vao_vien, checklistType, activeForm, symptomDates, treatmentHistory } = input;
  const ngay_phat_hien_clean = ngay_phat_hien ? ngay_phat_hien.slice(0, 10) : "";

  if (!ngay_phat_hien_clean) {
    return {
      doe: "",
      iwp_start: "",
      iwp_end: "",
      sbap_start: "",
      sbap_end: "",
      dayOfHospitalization: 0,
      haiStatus: 'POA',
      attributedStay: null,
      attributionReason: "Không xác định được ngày phát hiện.",
      device_placed_days: 0,
      device_active_on_event: false
    };
  }

  const iwp_start = subDays(ngay_phat_hien_clean, 3);
  const iwp_end = addDays(ngay_phat_hien_clean, 3);

  const validDates: string[] = [];

  // Determine symptom keys based on checklist type
  let symptomKeys: string[] = [];
  if (checklistType === "BSI") {
    symptomKeys = ['symptoms_window_7days'];
  } else if (checklistType === "VAE") {
    symptomKeys = [
      'temp_fever_or_hypothermia', 'wbc_abnormal', 'peep_increase_ge_3', 
      'fio2_increase_ge_20', 'has_chest_imaging_abnormal', 'fever_or_wbc_abnormal', 
      'altered_mental_status_ge_70yo'
    ];
  } else if (checklistType === "UTI") {
    symptomKeys = [
      'has_fever', 'has_suprapubic_tenderness', 'has_costovertebral_pain', 
      'has_urgency', 'has_frequency', 'has_dysuria'
    ];
  } else if (checklistType === "SSI") {
    const depth = activeForm?.ssi_depth || "SUPERFICIAL";
    if (depth === 'SUPERFICIAL') {
      symptomKeys = [
        'superficial_purulent_drainage', 'superficial_culture_positive', 
        'superficial_opened_with_inflammation', 'superficial_physician_diagnosis'
      ];
    } else if (depth === 'DEEP') {
      symptomKeys = [
        'deep_purulent_drainage', 'deep_dehisced_or_opened_with_symptoms', 
        'deep_abscess_imaging_pathology'
      ];
    } else if (depth === 'ORGAN_SPACE') {
      symptomKeys = [
        'organ_space_purulent_drainage', 'organ_space_culture_positive', 
        'organ_space_abscess_imaging_pathology'
      ];
    }
  }

  symptomKeys.forEach(k => {
    if (activeForm?.[k] === true) {
      const dVal = symptomDates[k];
      if (dVal && dVal >= iwp_start && dVal <= iwp_end) {
        validDates.push(dVal);
      }
    }
  });

  // DOE defaults to ngay_phat_hien if no symptom dates fall in the window
  let doe = ngay_phat_hien_clean;
  if (validDates.length > 0) {
    validDates.sort();
    doe = validDates[0];
  }

  const sbap_start = subDays(doe, 3);
  const sbap_end = addDays(doe, 13);

  // Admission Day 3 rule (Date of Event >= Admission Date + 2 calendar days -> HAI)
  const ngay_vao_vien_clean = ngay_vao_vien ? ngay_vao_vien.slice(0, 10) : "";
  let dayOfHospitalization = 0;
  let haiStatus: 'HAI' | 'POA' = 'POA';
  if (ngay_vao_vien_clean && doe) {
    dayOfHospitalization = getDaysBetween(ngay_vao_vien_clean, doe) + 1;
    haiStatus = dayOfHospitalization >= 3 ? 'HAI' : 'POA';
  }

  // Location attribution (transfer rule)
  const stays = [...treatmentHistory].sort((a, b) => a.ngay_vao.localeCompare(b.ngay_vao));
  let attributedStay: DepartmentStay | null = null;
  let attributionReason = "";

  if (doe && stays.length > 0) {
    let activeIndex = -1;
    for (let i = stays.length - 1; i >= 0; i--) {
      const s = stays[i];
      const v = s.ngay_vao;
      const r = s.ngay_ra || '9999-12-31';
      if (doe >= v && doe <= r) {
        activeIndex = i;
        break;
      }
    }

    if (activeIndex !== -1) {
      const activeStay = stays[activeIndex];
      const isTransferDay = activeStay.ngay_vao === doe;
      const isDayAfterTransfer = activeStay.ngay_vao === subDays(doe, 1);
      
      if ((isTransferDay || isDayAfterTransfer) && activeIndex > 0) {
        attributedStay = stays[activeIndex - 1];
        attributionReason = `Quy kết cho khoa chuyển đi [${attributedStay.ten_khoa}] do ngày sự kiện (${doe}) trùng với ngày chuyển khoa hoặc ngày kế tiếp.`;
      } else {
        attributedStay = activeStay;
        attributionReason = `Quy kết cho khoa đang điều trị [${attributedStay.ten_khoa}] do ngày sự kiện xảy ra từ ngày thứ 2 sau chuyển khoa trở đi.`;
      }
    } else {
      // Fallback
      attributedStay = stays[stays.length - 1];
      attributionReason = "Không tìm thấy khoa khớp với ngày sự kiện trong lịch sử điều trị. Quy kết mặc định theo khoa hiện tại.";
    }
  }

  // Device Math
  let device_placed_days = 0;
  let device_active_on_event = false;

  const dpDate = activeForm?.device_placed_date;
  const drDate = activeForm?.device_removed_date;

  if (dpDate && doe) {
    device_placed_days = getDaysBetween(dpDate, doe) + 1;
    if (!drDate) {
      device_active_on_event = true;
    } else {
      const daysSinceRemoval = getDaysBetween(drDate, doe);
      device_active_on_event = daysSinceRemoval <= 1 && daysSinceRemoval >= 0;
    }
  } else {
    // Fallback
    if (checklistType === 'BSI') {
      device_placed_days = activeForm?.cvc_placed_days || 0;
      device_active_on_event = activeForm?.cvc_active_on_event || false;
    } else if (checklistType === 'UTI') {
      device_placed_days = activeForm?.foley_placed_days || 0;
      device_active_on_event = activeForm?.foley_active_on_event || false;
    } else if (checklistType === 'VAE') {
      device_placed_days = activeForm?.vent_days || 0;
      device_active_on_event = true;
    }
  }

  return {
    doe,
    iwp_start,
    iwp_end,
    sbap_start,
    sbap_end,
    dayOfHospitalization,
    haiStatus,
    attributedStay,
    attributionReason,
    device_placed_days,
    device_active_on_event
  };
}
