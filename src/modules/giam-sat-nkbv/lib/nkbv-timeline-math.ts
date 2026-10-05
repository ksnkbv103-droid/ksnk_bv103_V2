import type { DepartmentStay } from "../types/nkbv-verification";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import {
  doeFormFieldsForChecklist,
  doeFormFieldsForSsiDepth,
} from "./nkbv-clinical-symptom-catalog";
import { resolveSsiSurveillanceDays } from "./nkbv-ssi-nhsn-catalog";
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

/**
 * LOA / Transfer Rule — SSOT §B.2.5 · DoD 20c Domain A (ngày lịch NHSN, không quy đổi giờ đồng hồ).
 * - LOA = khoa BN đang nằm vào DOE, trừ Transfer Rule.
 * - Transfer: DOE = ngày chuyển hoặc ngày sau → khoa chuyển đi.
 * - ≥2 khoa trong cửa sổ 24h lịch trước DOE → khoa **đầu** của ngày lịch trước DOE (không longest-stay).
 * - Grid trống / không khớp DOE → không gán LOA im lặng; warn (khớp L07).
 */
export function attributeLocationOfAttribution(
  treatmentHistory: DepartmentStay[],
  doeRaw: string,
): { attributedStay: DepartmentStay | null; attributionReason: string } {
  const doe = doeRaw ? doeRaw.slice(0, 10) : "";
  if (!doe) {
    return {
      attributedStay: null,
      attributionReason: "Không xác định được ngày sự kiện — không quy kết LOA.",
    };
  }

  const stays = [...treatmentHistory]
    .filter((s) => s && String(s.ngay_vao || "").slice(0, 10))
    .sort((a, b) => a.ngay_vao.localeCompare(b.ngay_vao));

  if (stays.length === 0) {
    return {
      attributedStay: null,
      attributionReason:
        "Thiếu lịch sử khoa (ba_ngay_khoa trống) — không quy kết LOA. Nhập đủ ngày–khoa trước khi chốt ca.",
    };
  }

  const dayBefore = subDays(doe, 1);

  let activeIndex = -1;
  for (let i = stays.length - 1; i >= 0; i--) {
    const s = stays[i];
    const v = String(s.ngay_vao).slice(0, 10);
    const r = s.ngay_ra ? String(s.ngay_ra).slice(0, 10) : "9999-12-31";
    if (doe >= v && doe <= r) {
      activeIndex = i;
      break;
    }
  }

  /** Khoa chạm cửa sổ calendar [ngày trước DOE … DOE]: overlap day-before hoặc bắt đầu trong cửa sổ. */
  const windowKhoaIds = new Set<string>();
  const staysOnDayBefore: DepartmentStay[] = [];
  for (const s of stays) {
    const v = String(s.ngay_vao).slice(0, 10);
    const r = s.ngay_ra ? String(s.ngay_ra).slice(0, 10) : "9999-12-31";
    const overlapsDayBefore = v <= dayBefore && dayBefore <= r;
    const startsInWindow = v >= dayBefore && v <= doe;
    if (overlapsDayBefore || startsInWindow) {
      windowKhoaIds.add(s.khoa_id);
    }
    if (overlapsDayBefore) {
      staysOnDayBefore.push(s);
    }
  }

  if (windowKhoaIds.size >= 2) {
    const firstOfDayBefore =
      staysOnDayBefore.length > 0
        ? [...staysOnDayBefore].sort((a, b) => a.ngay_vao.localeCompare(b.ngay_vao))[0]
        : stays.find((s) => String(s.ngay_vao).slice(0, 10) === dayBefore) || null;
    if (firstOfDayBefore) {
      return {
        attributedStay: firstOfDayBefore,
        attributionReason: `Quy kết multi-khoa 24h → khoa đầu ngày trước DOE [${formatKhoaCompactLabel(firstOfDayBefore)}] (DOE=${doe}, ngày trước=${dayBefore}).`,
      };
    }
  }

  if (activeIndex !== -1) {
    const activeStay = stays[activeIndex];
    const activeVao = String(activeStay.ngay_vao).slice(0, 10);
    const isTransferDay = activeVao === doe;
    const isDayAfterTransfer = activeVao === dayBefore;

    if ((isTransferDay || isDayAfterTransfer) && activeIndex > 0) {
      const prev = stays[activeIndex - 1];
      return {
        attributedStay: prev,
        attributionReason: `Quy kết cho khoa chuyển đi [${formatKhoaCompactLabel(prev)}] do ngày sự kiện (${doe}) trùng với ngày chuyển khoa hoặc ngày kế tiếp.`,
      };
    }
    return {
      attributedStay: activeStay,
      attributionReason: `Quy kết cho khoa đang điều trị [${formatKhoaCompactLabel(activeStay)}] do ngày sự kiện xảy ra từ ngày thứ 2 sau chuyển khoa trở đi.`,
    };
  }

  return {
    attributedStay: null,
    attributionReason:
      "Không tìm thấy khoa khớp với ngày sự kiện trong lịch sử điều trị — không quy kết LOA im lặng. Kiểm tra ba_ngay_khoa / lưới ngày–khoa.",
  };
}

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
    // SSI: DOE ∈ [ngày mổ, ngày mổ + SP − 1] — không dùng IWP ±3 quanh Index
    indexDate = override || ngay_phat_hien_clean;
    const surgery = String(
      activeForm?.ngay_phau_thuat || activeForm?.surgery_date || "",
    ).slice(0, 10);
    const depthRaw = String(activeForm?.ssi_depth || "SUPERFICIAL").toUpperCase();
    const depth =
      depthRaw === "DEEP" || depthRaw === "ORGAN_SPACE" ? depthRaw : "SUPERFICIAL";
    const spDays = resolveSsiSurveillanceDays({
      depth: depth as "SUPERFICIAL" | "DEEP" | "ORGAN_SPACE",
      procedureCode: activeForm?.loai_phau_thuat_nhsn,
      eventTypeCode: activeForm?.ssi_event_type,
    });
    if (surgery && /^\d{4}-\d{2}-\d{2}$/.test(surgery) && spDays != null) {
      iwp_start = surgery;
      iwp_end = addDays(surgery, spDays - 1);
    } else if (surgery && /^\d{4}-\d{2}-\d{2}$/.test(surgery)) {
      // Thiếu mã PT cho Deep/Organ — vẫn mở cửa sổ nông 30 để không mất yếu tố sớm
      iwp_start = surgery;
      iwp_end = addDays(surgery, 29);
    } else {
      iwp_start = "";
      iwp_end = "";
    }
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
    const pushIfInWindow = (
      k: string,
      winStart: string,
      winEnd: string,
    ) => {
      if (!winStart || !winEnd) return;
      const raw = symptomDates[k];
      const candidates = Array.isArray(raw)
        ? raw.map((x) => String(x || "").slice(0, 10))
        : [String(raw || "").slice(0, 10)];
      for (const dVal of candidates) {
        if (!dVal) continue;
        const present = activeForm?.[k] === true || Boolean(dVal);
        if (!present) continue;
        if (dVal >= winStart && dVal <= winEnd) validDates.push(dVal);
      }
    };

    if (syndrome === "SSI") {
      // Mỗi tầng độ sâu một SP; DOE = ngày sớm nhất có yếu tố trong SP tương ứng
      const surgery = String(
        activeForm?.ngay_phau_thuat || activeForm?.surgery_date || "",
      ).slice(0, 10);
      const procCode = activeForm?.loai_phau_thuat_nhsn;
      const tiers = ["ORGAN_SPACE", "DEEP", "SUPERFICIAL"] as const;
      for (const tier of tiers) {
        const sp = resolveSsiSurveillanceDays({
          depth: tier,
          procedureCode: procCode,
          eventTypeCode: activeForm?.ssi_event_type,
        });
        if (sp == null || !surgery) continue;
        const winStart = surgery;
        const winEnd = addDays(surgery, sp - 1);
        for (const k of doeFormFieldsForSsiDepth(tier)) {
          pushIfInWindow(k, winStart, winEnd);
        }
        if (indexDate && indexDate >= winStart && indexDate <= winEnd) {
          validDates.push(indexDate);
        }
      }
      // Cửa sổ hiển thị = bao phủ rộng nhất đã dùng
      if (surgery && validDates.length === 0 && iwp_start && iwp_end) {
        // giữ iwp_* đã set; không có yếu tố → fallback Index nếu ∈ SP
        if (indexDate && indexDate >= iwp_start && indexDate <= iwp_end) {
          validDates.push(indexDate);
        }
      }
    } else {
      // DOE = ngày sớm nhất có yếu tố TC ∈ IWP — Index là một ứng viên
      symptomKeys.forEach((k) => pushIfInWindow(k, iwp_start, iwp_end));
      if (indexDate && indexDate >= iwp_start && indexDate <= iwp_end) {
        validDates.push(indexDate);
      }
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
  const { attributedStay, attributionReason } = attributeLocationOfAttribution(stays, doe);

  let device_placed_days = 0;
  let device_active_on_event = false;

  const dpDate = activeForm?.device_placed_date;
  const drDate = activeForm?.device_removed_date;

  if (dpDate && doe) {
    const vv = ngay_vao_vien_clean;
    const assoc = isDeviceAssociated({
      placedDate: dpDate,
      removedDate: drDate,
      doe,
      admissionDate: vv || null,
      deviceKind:
        checklistType === "BSI"
          ? "cvc"
          : checklistType === "UTI"
            ? "foley"
            : checklistType === "VAP" || checklistType === "HAP" || checklistType === "VAE"
              ? "vent"
              : null,
      firstInpatientAccessDate:
        checklistType === "BSI"
          ? activeForm?.cvc_first_inpatient_access_date
          : undefined,
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
