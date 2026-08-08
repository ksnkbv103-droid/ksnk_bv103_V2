import {
  doeFormFieldsForChecklist,
  doeFormFieldsForSsiDepth,
} from "./nkbv-clinical-symptom-catalog";
import { addDays, subDays } from "./nkbv-timeline-math";

export type ClinicalSubmitGateResult =
  | { ok: true }
  | { ok: false; error: string };

function iwpBounds(detectionDate: string): { start: string; end: string } {
  const d = detectionDate.slice(0, 10);
  return { start: subDays(d, 3), end: addDays(d, 3) };
}

function dateInWindow(dateStr: string | undefined | null, start: string, end: string): boolean {
  if (!dateStr) return false;
  const d = String(dateStr).slice(0, 10);
  return d >= start && d <= end;
}

function hasAnsweredBoolean(v: unknown): boolean {
  return v === true || v === false;
}

/**
 * Cổng cứng trước CHO_DUYET: phải có dữ liệu lâm sàng đã khai báo;
 * triệu chứng dương tính phải có ngày trong IWP (DOE±3 quanh ngày phát hiện).
 * Đường LOAI_TRU không gọi hàm này.
 */
export function assertClinicalEvidenceForSubmit(
  checklistType: string,
  verificationInput: Record<string, any>,
): ClinicalSubmitGateResult {
  const detection =
    String(verificationInput?.ngay_phat_hien || verificationInput?.ngay_lay_mau || "").slice(0, 10) ||
    "";
  if (!detection) {
    return { ok: false, error: "Thiếu ngày phát hiện / ngày lấy mẫu để tính khung IWP." };
  }

  const { start: iwpStart, end: iwpEnd } = iwpBounds(detection);
  const symptomDates: Record<string, string> = verificationInput?.symptom_dates || {};
  const type = checklistType.toUpperCase();

  const requireSymptomInIwp = (keys: string[], label: string): ClinicalSubmitGateResult | null => {
    const anyTrue = keys.some((k) => verificationInput?.[k] === true);
    const anyAnswered = keys.some((k) => hasAnsweredBoolean(verificationInput?.[k]));
    if (!anyAnswered) {
      return {
        ok: false,
        error: `Chưa khai báo dấu hiệu lâm sàng bắt buộc (${label}) trong khung IWP ${iwpStart} → ${iwpEnd}.`,
      };
    }
    if (anyTrue) {
      const inWindow = keys.some(
        (k) => verificationInput?.[k] === true && dateInWindow(symptomDates[k], iwpStart, iwpEnd),
      );
      // Một số form dùng một ngày chung
      const sharedDate =
        symptomDates.symptoms_window_7days ||
        verificationInput?.symptoms_date ||
        verificationInput?.ngay_trieu_chung;
      const sharedOk = Boolean(sharedDate && dateInWindow(sharedDate, iwpStart, iwpEnd));
      if (!inWindow && !sharedOk) {
        return {
          ok: false,
          error: `Có triệu chứng ${label} nhưng ngày không nằm trong IWP (${iwpStart} → ${iwpEnd}).`,
        };
      }
    }
    return null;
  };

  if (type === "UTI") {
    const keys = doeFormFieldsForChecklist("UTI");
    const abuti =
      verificationInput?.has_matching_blood_culture === true ||
      verificationInput?.abuti_blood_match === true ||
      (verificationInput?.has_blood_culture_positive_in_window === true &&
        verificationInput?.blood_urine_pathogen_matches === true);
    if (abuti) return { ok: true };
    const fail = requireSymptomInIwp(keys, "UTI");
    if (fail) return fail;
    const foleyAnswered =
      hasAnsweredBoolean(verificationInput?.had_urinary_catheter) ||
      hasAnsweredBoolean(verificationInput?.has_foley) ||
      hasAnsweredBoolean(verificationInput?.foley_active_on_event) ||
      typeof verificationInput?.foley_placed_days === "number";
    if (!foleyAnswered) {
      return { ok: false, error: "Chưa khai báo tình trạng ống thông tiểu (Foley)." };
    }
    return { ok: true };
  }

  if (type === "BSI") {
    const pathogen = verificationInput?.pathogen_type || verificationInput?.pathogen_class;
    const bsiSxKeys = doeFormFieldsForChecklist("BSI");
    if (!pathogen && !hasAnsweredBoolean(verificationInput?.symptoms_window_7days) &&
        verificationInput?.has_fever == null &&
        verificationInput?.had_central_line == null &&
        verificationInput?.has_central_line == null) {
      return {
        ok: false,
        error: `Chưa khai báo đủ dấu hiệu BSI / phân loại tác nhân trong IWP ${iwpStart} → ${iwpEnd}.`,
      };
    }
    // Commensal / bất kỳ tick LCBI: ngày triệu chứng phải ∈ IWP
    const anySxTrue = bsiSxKeys.some((k) => verificationInput?.[k] === true);
    if (anySxTrue || verificationInput?.symptoms_window_7days === true) {
      const fail = requireSymptomInIwp(
        [...bsiSxKeys, "symptoms_window_7days"],
        "BSI / LCBI",
      );
      if (fail) return fail;
    }
    return { ok: true };
  }

  if (type === "VAE" || type === "VAP" || type === "HAP" || type === "PNEU") {
    const catalogKeys =
      type === "VAE"
        ? ["temp_fever_or_hypothermia", "wbc_abnormal"]
        : doeFormFieldsForChecklist(type === "PNEU" ? "HAP" : type);
    const keys = [
      ...catalogKeys,
      // legacy aliases vẫn chấp nhận
      "purulent_sputum",
      "imaging_infiltrate",
      "fever_hypothermia",
      "leukocytosis_leukopenia",
    ];
    const anyAnswered =
      keys.some((k) => hasAnsweredBoolean(verificationInput?.[k])) ||
      hasAnsweredBoolean(verificationInput?.had_ventilator) ||
      hasAnsweredBoolean(verificationInput?.has_ventilator);
    if (!anyAnswered) {
      return {
        ok: false,
        error: `Chưa khai báo dấu hiệu hô hấp / cận lâm sàng trong cửa sổ giám sát (${iwpStart} → ${iwpEnd}).`,
      };
    }
    const anyTrue = keys.some((k) => verificationInput?.[k] === true);
    if (anyTrue) {
      const inWindow = keys.some(
        (k) => verificationInput?.[k] === true && dateInWindow(symptomDates[k], iwpStart, iwpEnd),
      );
      const shared = verificationInput?.symptoms_date || symptomDates.fever_or_wbc_abnormal;
      if (!inWindow && !dateInWindow(shared, iwpStart, iwpEnd)) {
        // VAE cửa sổ 5 ngày (±2) — nới nếu có ngày trong DOE±2
        const vStart = subDays(detection, 2);
        const vEnd = addDays(detection, 2);
        const inVae = keys.some(
          (k) => verificationInput?.[k] === true && dateInWindow(symptomDates[k], vStart, vEnd),
        );
        if (!inVae && !dateInWindow(shared, vStart, vEnd)) {
          return {
            ok: false,
            error: `Dấu hiệu hô hấp có chọn nhưng ngày ngoài khung IWP/VAE (${iwpStart} → ${iwpEnd}).`,
          };
        }
      }
    }
    return { ok: true };
  }

  if (type === "SSI") {
    const depth = verificationInput?.ssi_depth || "SUPERFICIAL";
    const keys = [
      ...doeFormFieldsForSsiDepth(depth),
      ...doeFormFieldsForSsiDepth("SUPERFICIAL"),
      ...doeFormFieldsForSsiDepth("DEEP"),
      ...doeFormFieldsForSsiDepth("ORGAN_SPACE"),
    ];
    const surgeryDate = verificationInput?.ngay_phau_thuat || verificationInput?.surgery_date;
    if (!surgeryDate && !keys.some((k) => hasAnsweredBoolean(verificationInput?.[k]))) {
      return {
        ok: false,
        error: "Chưa khai báo ngày phẫu thuật hoặc dấu hiệu lâm sàng vết mổ.",
      };
    }
    return { ok: true };
  }

  return {
    ok: false,
    error: `Loại checklist không hỗ trợ cổng lâm sàng: ${checklistType}`,
  };
}
