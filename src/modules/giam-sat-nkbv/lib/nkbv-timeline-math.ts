import type { DepartmentStay } from "../types/nkbv-verification";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import {
  doeFormFieldsForChecklist,
  doeFormFieldsForSsiDepth,
} from "./nkbv-clinical-symptom-catalog";
import {
  addDays,
  clinicalIwp,
  clinicalRitEnd,
  clinicalSbapWindow,
  daysBetween,
  endoExtendedIwp,
  endoRitSbapToDischarge,
  isDeviceAssociated,
  poaOrHai,
  ssiSbapWindow,
  subDays,
  usesClinicalIwp,
  vaeEventPeriod,
  type NkbvTimelineSyndrome,
} from "./nkbv-shared-timeline";

export { addDays, subDays };

export interface CdcMetricsInput {
  ngay_phat_hien: string;
  ngay_vao_vien: string;
  checklistType: "BSI" | "VAE" | "VAP" | "HAP" | "UTI" | "SSI" | "CH17";
  activeForm: any;
  /** Ngày (hoặc nhiều ngày) từng form_field — DOE lấy min ∈ IWP. */
  symptomDates: Record<string, string | string[]>;
  treatmentHistory: DepartmentStay[];
  /**
   * Index Date cố định từ lưới (ô XN hoặc CĐHA Active).
   * Khi set: không suy đoán lại Index từ imaging sớm hơn.
   */
  indexDateOverride?: string | null;
}

export interface CdcMetricsResult {
  doe: string;
  /** Index Date dùng dựng IWP (có thể ≠ ngay_phat_hien). */
  index_date: string;
  iwp_start: string;
  iwp_end: string;
  sbap_start: string;
  sbap_end: string;
  /** RIT end = DOE+13 (DOE = ngày 1). */
  rit_end: string;
  dayOfHospitalization: number;
  haiStatus: "HAI" | "POA";
  attributedStay: DepartmentStay | null;
  attributionReason: string;
  device_placed_days: number;
  device_active_on_event: boolean;
  /** True when clinical IWP±3 (hoặc ENDO ±10) applies (not VAE/SSI) */
  uses_clinical_iwp: boolean;
}

function checklistToSyndrome(
  checklistType: CdcMetricsInput["checklistType"],
): NkbvTimelineSyndrome {
  if (checklistType === "BSI") return "CLABSI";
  if (checklistType === "UTI") return "UTI";
  if (checklistType === "SSI") return "SSI";
  if (checklistType === "VAE") return "VAE";
  if (checklistType === "VAP" || checklistType === "HAP") return "PNEU";
  return "OTHER";
}

/**
 * Day-3 HAI gate (NHSN): nghi ngờ HAI khi ngày lấy mẫu ≥ ngày vào viện + 2 lịch
 */
export function isHaiSuspectByDay3Rule(
  ngayVaoVien: string | null | undefined,
  ngayLayMau: string | null | undefined,
): boolean {
  const vao = ngayVaoVien ? String(ngayVaoVien).slice(0, 10) : "";
  const mau = ngayLayMau ? String(ngayLayMau).slice(0, 10) : "";
  if (!vao || !mau) return false;
  return daysBetween(vao, mau) >= 2;
}

/**
 * DOE, IWP/EventPeriod, SBAP, location attribution — SSOT §3 + deltas.
 */
export function calculateCdcMetrics(input: CdcMetricsInput): CdcMetricsResult {
  const { ngay_phat_hien, ngay_vao_vien, checklistType, activeForm, symptomDates, treatmentHistory } =
    input;
  const ngay_phat_hien_clean = ngay_phat_hien ? ngay_phat_hien.slice(0, 10) : "";
  const syndrome = checklistToSyndrome(checklistType);
  const useIwp = usesClinicalIwp(syndrome);

  if (!ngay_phat_hien_clean) {
    return {
      doe: "",
      index_date: "",
      iwp_start: "",
      iwp_end: "",
      sbap_start: "",
      sbap_end: "",
      rit_end: "",
      dayOfHospitalization: 0,
      haiStatus: "POA",
      attributedStay: null,
      attributionReason: "Không xác định được ngày phát hiện.",
      device_placed_days: 0,
      device_active_on_event: false,
      uses_clinical_iwp: useIwp,
    };
  }

  let iwp_start = "";
  let iwp_end = "";
  let doe = ngay_phat_hien_clean;
  let indexDate = ngay_phat_hien_clean;
  const override = input.indexDateOverride
    ? String(input.indexDateOverride).slice(0, 10)
    : "";

  if (syndrome === "VAE") {
    // VAE: DOE = first day of worsening when computed; else detection date. No clinical IWP±3.
    if (activeForm?.calculated_vac_doe) {
      doe = String(activeForm.calculated_vac_doe).slice(0, 10);
    }
    indexDate = doe;
    const ep = vaeEventPeriod(doe);
    iwp_start = ep.start;
    iwp_end = ep.end;
  } else if (checklistType === "CH17") {
    // Ch.17: IWP ±3; ENDO dùng IWP ±10 (21 ngày lịch)
    indexDate = override || ngay_phat_hien_clean;
    const typeCode = String(activeForm?.ch17_type_code || "").toUpperCase();
    const iwp =
      typeCode === "ENDO" ? endoExtendedIwp(indexDate) : clinicalIwp(indexDate);
    iwp_start = iwp.start;
    iwp_end = iwp.end;
  } else if (syndrome === "SSI") {
    // SSI: surveillance period elsewhere; for symptom window still use detection ±3 for DOE pick heuristic
    indexDate = override || ngay_phat_hien_clean;
    const iwp = clinicalIwp(indexDate);
    iwp_start = iwp.start;
    iwp_end = iwp.end;
  } else if (useIwp) {
    // Index = ngày XN/CĐHA Active (override) hoặc theo pneu_trigger — không tự nhảy khi đã chọn CULTURE.
    indexDate = override || ngay_phat_hien_clean;
    if (!override && (checklistType === "VAP" || checklistType === "HAP")) {
      const imagingDate = String(symptomDates.has_chest_imaging_abnormal || "").slice(0, 10);
      const trigger = String(activeForm?.pneu_trigger || "CULTURE");
      if (trigger === "IMAGING") {
        indexDate = imagingDate || ngay_phat_hien_clean;
      }
      // CULTURE: giữ ngay_phat_hien — không auto-shift sang XQ sớm hơn
    }
    const iwp = clinicalIwp(indexDate);
    iwp_start = iwp.start;
    iwp_end = iwp.end;
  } else {
    iwp_start = ngay_phat_hien_clean;
    iwp_end = ngay_phat_hien_clean;
  }

  const validDates: string[] = [];
  let symptomKeys: string[] = [];
  if (checklistType === "SSI") {
    symptomKeys = doeFormFieldsForSsiDepth(activeForm?.ssi_depth || "SUPERFICIAL");
  } else {
    symptomKeys = doeFormFieldsForChecklist(checklistType);
  }

  if (syndrome !== "VAE") {
    // DOE = ngày sớm nhất có yếu tố TC ∈ IWP (SSOT §3.2) — không mặc định = Index
    // khi đã có triệu chứng/XQ sớm hơn trong cửa sổ. Index là một ứng viên (cấy/CĐHA).
    symptomKeys.forEach((k) => {
      const raw = symptomDates[k];
      const candidates = Array.isArray(raw)
        ? raw.map((x) => String(x || "").slice(0, 10))
        : [String(raw || "").slice(0, 10)];
      for (const dVal of candidates) {
        if (!dVal) continue;
        const present = activeForm?.[k] === true || Boolean(dVal);
        if (!present) continue;
        if (dVal >= iwp_start && dVal <= iwp_end) {
          validDates.push(dVal);
        }
      }
    });
    if (indexDate && indexDate >= iwp_start && indexDate <= iwp_end) {
      validDates.push(indexDate);
    }
    if (validDates.length > 0) {
      validDates.sort();
      doe = validDates[0];
    } else {
      // Fallback: Index (không kẹt ngày phiếu khi Index đã đổi sang XQ)
      doe = indexDate || ngay_phat_hien_clean;
    }
  }

  let sbap_start = "";
  let sbap_end = "";
  let rit_end = doe ? clinicalRitEnd(doe) : "";
  if (syndrome === "SSI") {
    const w = ssiSbapWindow(doe);
    sbap_start = w.start;
    sbap_end = w.end;
  } else if (syndrome === "VAE") {
    const w = vaeEventPeriod(doe);
    sbap_start = w.start;
    sbap_end = w.end;
  } else if (
    checklistType === "CH17" &&
    String(activeForm?.ch17_type_code || "").toUpperCase() === "ENDO"
  ) {
    const endo = endoRitSbapToDischarge({
      indexDate,
      dischargeDate: activeForm?.ngay_ra_vien || null,
    });
    sbap_start = endo.sbapStart;
    sbap_end = endo.sbapEnd;
    rit_end = endo.ritEnd;
  } else {
    const w = clinicalSbapWindow(indexDate, doe);
    sbap_start = w.start;
    sbap_end = w.end;
  }

  const ngay_vao_vien_clean = ngay_vao_vien ? ngay_vao_vien.slice(0, 10) : "";
  const { dayOfHospitalization, haiStatus } = poaOrHai(ngay_vao_vien_clean, doe);

  const stays = [...treatmentHistory].sort((a, b) => a.ngay_vao.localeCompare(b.ngay_vao));
  let attributedStay: DepartmentStay | null = null;
  let attributionReason = "";

  if (doe && stays.length > 0) {
    let activeIndex = -1;
    for (let i = stays.length - 1; i >= 0; i--) {
      const s = stays[i];
      const v = s.ngay_vao;
      const r = s.ngay_ra || "9999-12-31";
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
        attributionReason = `Quy kết cho khoa chuyển đi [${formatKhoaCompactLabel(attributedStay)}] do ngày sự kiện (${doe}) trùng với ngày chuyển khoa hoặc ngày kế tiếp.`;
      } else {
        attributedStay = activeStay;
        attributionReason = `Quy kết cho khoa đang điều trị [${formatKhoaCompactLabel(attributedStay)}] do ngày sự kiện xảy ra từ ngày thứ 2 sau chuyển khoa trở đi.`;
      }
    } else {
      attributedStay = stays[stays.length - 1];
      attributionReason =
        "Không tìm thấy khoa khớp với ngày sự kiện trong lịch sử điều trị. Quy kết mặc định theo khoa hiện tại.";
    }
  }

  let device_placed_days = 0;
  let device_active_on_event = false;

  const dpDate = activeForm?.device_placed_date;
  const drDate = activeForm?.device_removed_date;

  if (dpDate && doe) {
    const assoc = isDeviceAssociated({
      placedDate: dpDate,
      removedDate: drDate,
      doe,
    });
    device_placed_days = assoc.placedDays;
    // «Hiện diện gắn được» = đủ eligibility NHSN (≥3d + DOE/DOE−1), không chỉ tick 1 ngày
    device_active_on_event = assoc.associated;
  } else if (checklistType === "BSI") {
    device_placed_days = activeForm?.cvc_placed_days || 0;
    device_active_on_event =
      Boolean(activeForm?.cvc_active_on_event) && device_placed_days >= 3;
  } else if (checklistType === "UTI") {
    device_placed_days = activeForm?.foley_placed_days || 0;
    device_active_on_event =
      Boolean(activeForm?.foley_active_on_event) && device_placed_days >= 3;
  } else if (checklistType === "VAE" || checklistType === "VAP" || checklistType === "HAP") {
    device_placed_days = activeForm?.vent_days || 0;
    // VAP/HAP: không mặc định «hiện diện» khi thiếu ngày đặt
    device_active_on_event = device_placed_days >= 3;
  }

  return {
    doe,
    index_date: indexDate,
    iwp_start,
    iwp_end,
    sbap_start,
    sbap_end,
    rit_end,
    dayOfHospitalization,
    haiStatus,
    attributedStay,
    attributionReason,
    device_placed_days,
    device_active_on_event,
    uses_clinical_iwp: useIwp || checklistType === "CH17",
  };
}
