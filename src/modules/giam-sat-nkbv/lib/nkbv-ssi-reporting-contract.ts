/**
 * Contract JSON ổn định cho báo cáo SSI — đọc từ verification_data.
 * Không migrate cột DB; analytics lấy các khóa này.
 */

import {
  getNhsnOrganSpaceSite,
  getNhsnProcedure,
  getNhsnSsiEventType,
  nhsClassificationFromEvent,
} from "./nkbv-ssi-nhsn-catalog";

/** Khóa bắt buộc / khuyến nghị trong verification_data khi chốt SSI. */
export const SSI_REPORTING_JSON_KEYS = [
  "loai_phau_thuat_nhsn",
  "ssi_event_type",
  "organ_space_site",
  "ssi_depth",
  "is_patos",
  "has_implant",
  "surgery_date",
  "doe_date",
  "days_since_surgery",
] as const;

export type SsiReportingSlice = {
  loai_phau_thuat_nhsn: string;
  loai_phau_thuat_nhsn_vi: string | null;
  ssi_event_type: string;
  ssi_event_type_vi: string | null;
  organ_space_site: string | null;
  organ_space_site_vi: string | null;
  ssi_depth: string;
  is_patos: boolean;
  has_implant: boolean;
  classification_nhsn: string | null;
  surgery_date: string | null;
  doe_date: string | null;
  days_since_surgery: number | null;
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, unknown>;
}

/** Trích slice báo cáo từ verification_data (hoặc form SSI). */
export function extractSsiReportingSlice(verificationData: unknown): SsiReportingSlice {
  const d = asRecord(verificationData);
  const procCode = String(d.loai_phau_thuat_nhsn || "").trim().toUpperCase();
  const eventCode = String(d.ssi_event_type || "").trim().toUpperCase();
  const siteCode = String(d.organ_space_site || "").trim().toUpperCase() || null;
  const proc = getNhsnProcedure(procCode);
  const event = getNhsnSsiEventType(eventCode);
  const site = siteCode ? getNhsnOrganSpaceSite(siteCode) : null;
  const daysRaw = d.days_since_surgery;
  const days =
    typeof daysRaw === "number" && Number.isFinite(daysRaw)
      ? daysRaw
      : daysRaw != null && Number.isFinite(Number(daysRaw))
        ? Number(daysRaw)
        : null;

  return {
    loai_phau_thuat_nhsn: procCode,
    loai_phau_thuat_nhsn_vi: proc?.name_vi || null,
    ssi_event_type: eventCode,
    ssi_event_type_vi: event?.name_vi || null,
    organ_space_site: siteCode,
    organ_space_site_vi: site?.name_vi || null,
    ssi_depth: String(d.ssi_depth || event?.depth || ""),
    is_patos: Boolean(d.is_patos),
    has_implant: Boolean(d.has_implant),
    classification_nhsn: nhsClassificationFromEvent(eventCode, siteCode),
    surgery_date: d.surgery_date ? String(d.surgery_date).slice(0, 10) : null,
    doe_date: d.doe_date ? String(d.doe_date).slice(0, 10) : null,
    days_since_surgery: days,
  };
}

/** Kiểm tra verification_data đủ khóa báo cáo khi chốt dương tính. */
export function ssiReportingContractGaps(verificationData: unknown): string[] {
  const slice = extractSsiReportingSlice(verificationData);
  const gaps: string[] = [];
  if (!slice.loai_phau_thuat_nhsn) gaps.push("loai_phau_thuat_nhsn");
  if (!slice.ssi_event_type) gaps.push("ssi_event_type");
  if (slice.ssi_event_type === "ORGAN_SPACE" && !slice.organ_space_site) {
    gaps.push("organ_space_site");
  }
  return gaps;
}
