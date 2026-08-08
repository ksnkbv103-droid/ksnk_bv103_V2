import { isBloodSpecimen } from "./nkbv-vi-sinh-template";
import { addDays } from "./nkbv-timeline-math";
import { resolveNkbvMajorType, sameMajorType } from "./nkbv-major-type";
import { clinicalSbapWindow, ssiSbapWindow } from "./nkbv-shared-timeline";

export type ImportWindowAlertCode = "RIT" | "SBAP";

export type ExistingNkbvEventForScan = {
  id: string;
  ma_benh_an: string;
  ngay_phat_hien: string | null;
  vi_tri_nhiem_khuan?: string | null;
  loai_ma?: string | null;
};

export type ImportWindowAlert = {
  code: ImportWindowAlertCode;
  message: string;
  related_event_id?: string;
  doe?: string;
  window_start?: string;
  window_end?: string;
};

function daysBetween(a: string, b: string): number {
  const t1 = new Date(a.slice(0, 10)).getTime();
  const t2 = new Date(b.slice(0, 10)).getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

function isSiteInfectionEvent(e: ExistingNkbvEventForScan): boolean {
  const v = `${e.vi_tri_nhiem_khuan || ""} ${e.loai_ma || ""}`.toUpperCase();
  if (v.includes("BSI") || v.includes("MÁU") || v.includes("MAU") || v.includes("BLOOD")) {
    return false;
  }
  return Boolean(e.ngay_phat_hien);
}

/**
 * Rà soát RIT (14 ngày từ DOE) và SBAP với ca đang mở cùng ma_benh_an.
 * Import chỉ có `ngay_phat_hien` → dùng làm cả Index và DOE cho clinical
 * (`clinicalSbapWindow(d,d)` = 17d); SSI dùng `ssiSbapWindow` cố định 17d.
 * Chỉ cảnh báo — không tự chốt Secondary BSI.
 */
export function scanImportWindowAlerts(input: {
  ma_benh_an: string;
  ngay_lay_mau: string;
  loai_benh_pham: string;
  existingEvents: ExistingNkbvEventForScan[];
}): ImportWindowAlert[] {
  const sample = (input.ngay_lay_mau || "").slice(0, 10);
  if (!sample || !input.ma_benh_an) return [];

  const sameStay = (input.existingEvents || []).filter(
    (e) => e.ma_benh_an === input.ma_benh_an && e.ngay_phat_hien,
  );

  const alerts: ImportWindowAlert[] = [];

  const sampleMajor = resolveNkbvMajorType({ loai_benh_pham: input.loai_benh_pham });
  const ritMatch = sameStay.find((e) => {
    const doe = String(e.ngay_phat_hien).slice(0, 10);
    const diff = daysBetween(doe, sample);
    if (diff < 0 || diff > 13) return false;
    const eventMajor = resolveNkbvMajorType({
      loai_ma: e.loai_ma,
      vi_tri_nhiem_khuan: e.vi_tri_nhiem_khuan,
    });
    return sameMajorType(sampleMajor, eventMajor);
  });

  if (ritMatch) {
    const doe = String(ritMatch.ngay_phat_hien).slice(0, 10);
    alerts.push({
      code: "RIT",
      message: `Nằm trong khung RIT 14 ngày (cùng major type ${sampleMajor}) của ca DOE ${doe} — gợi ý gộp tác nhân, không tạo ca trùng.`,
      related_event_id: ritMatch.id,
      doe,
      window_start: doe,
      window_end: addDays(doe, 13),
    });
  }

  if (isBloodSpecimen(input.loai_benh_pham)) {
    const sbapMatch = sameStay.find((e) => {
      if (!isSiteInfectionEvent(e)) return false;
      const d = String(e.ngay_phat_hien).slice(0, 10);
      const major = resolveNkbvMajorType({
        loai_ma: e.loai_ma,
        vi_tri_nhiem_khuan: e.vi_tri_nhiem_khuan,
      });
      const w = major === "SSI" ? ssiSbapWindow(d) : clinicalSbapWindow(d, d);
      return sample >= w.start && sample <= w.end;
    });

    if (sbapMatch) {
      const d = String(sbapMatch.ngay_phat_hien).slice(0, 10);
      const major = resolveNkbvMajorType({
        loai_ma: sbapMatch.loai_ma,
        vi_tri_nhiem_khuan: sbapMatch.vi_tri_nhiem_khuan,
      });
      const w = major === "SSI" ? ssiSbapWindow(d) : clinicalSbapWindow(d, d);
      alerts.push({
        code: "SBAP",
        message: `Cấy máu trong khung SBAP của ổ tại chỗ (DOE ${d}) — cần phân tích Secondary BSI, chưa phạt CLABSI tiên phát.`,
        related_event_id: sbapMatch.id,
        doe: d,
        window_start: w.start,
        window_end: w.end,
      });
    }
  }

  return alerts;
}

function isBloodLikeEvent(e: ExistingNkbvEventForScan): boolean {
  const v = `${e.vi_tri_nhiem_khuan || ""} ${e.loai_ma || ""}`.toUpperCase();
  return (
    v.includes("BSI") ||
    v.includes("CLABSI") ||
    v.includes("LCBI") ||
    v.includes("MÁU") ||
    v.includes("MAU") ||
    v.includes("BLOOD")
  );
}

/**
 * Rà RIT/SBAP giữa các phiếu đã có trên cùng một đợt nằm viện (hub BA).
 */
export function scanStayCrossCaseAlerts(
  events: ExistingNkbvEventForScan[],
): ImportWindowAlert[] {
  const alerts: ImportWindowAlert[] = [];
  const seen = new Set<string>();
  const list = (events || []).filter((e) => e.ma_benh_an && e.ngay_phat_hien);

  for (const e of list) {
    const others = list.filter((x) => x.id !== e.id);
    if (!others.length) continue;
    const found = scanImportWindowAlerts({
      ma_benh_an: e.ma_benh_an,
      ngay_lay_mau: String(e.ngay_phat_hien).slice(0, 10),
      loai_benh_pham: isBloodLikeEvent(e) ? "Máu" : "Khác",
      existingEvents: others,
    });
    for (const a of found) {
      const key = `${a.code}:${e.id}:${a.related_event_id || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      alerts.push({
        ...a,
        message: `Phiếu liên quan (${String(e.loai_ma || e.vi_tri_nhiem_khuan || e.id).slice(0, 24)}): ${a.message}`,
      });
    }
  }
  return alerts;
}
