/**
 * Kết luận phân tích BA — gộp tác nhân RIT, Secondary BSI từ SBAP, format 5 ý.
 * Thuần logic — không I/O.
 */

import type { BaGridXnCell } from "./nkbv-ba-grid-engine";
import {
  scanImportWindowAlerts,
  type ExistingNkbvEventForScan,
  type ImportWindowAlert,
} from "./nkbv-import-window-scan";
import { resolveNkbvMajorType, sameMajorType, type NkbvMajorType } from "./nkbv-major-type";
import { isBloodSpecimen } from "./nkbv-sbap-rit-chips";
import {
  evaluateSecondaryBsi,
  type SecondaryBsiPrimarySite,
} from "./nkbv-shared-secondary-bsi";
import { clinicalRitEnd } from "./nkbv-shared-timeline";

function dayLabel(iso: string): string {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const [, m, day] = d.split("-");
  return `${Number(day)}/${Number(m)}`;
}

export function isPositiveCultureOrganism(viKhuan: string | null | undefined): boolean {
  const t = String(viKhuan || "").trim();
  if (!t || t === "—") return false;
  if (/âm\s*tính|am\s*tinh|negative|no\s*growth|không\s*mọc/i.test(t)) return false;
  return true;
}

/** Gộp VK dương tính cùng major type trong RIT (DOE → DOE+13), gồm Index. */
export function collectRitPathogens(input: {
  nsk: string;
  majorType: NkbvMajorType;
  xn: BaGridXnCell[];
  /** Site UTI/PNEU/SSI: bỏ máu khỏi pack RIT (máu đi SBAP). BSI: giữ máu. */
  excludeBlood?: boolean;
}): string[] {
  const nsk = input.nsk.slice(0, 10);
  if (!nsk) return [];
  const ritEnd = clinicalRitEnd(nsk);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of input.xn) {
    const d = x.ngay.slice(0, 10);
    if (d < nsk || d > ritEnd) continue;
    if (input.excludeBlood !== false && input.majorType !== "BSI" && isBloodSpecimen(x.benh_pham)) {
      continue;
    }
    if (!isPositiveCultureOrganism(x.vi_khuan)) continue;
    const maj = resolveNkbvMajorType({ loai_benh_pham: x.benh_pham });
    if (!sameMajorType(maj, input.majorType) && !(input.majorType === "PNEU" && maj === "PNEU")) {
      continue;
    }
    const key = x.vi_khuan.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x.vi_khuan.trim());
  }
  return out;
}

export type SecondarySbapScanResult = {
  isSecondary: boolean;
  matchedBloodIds: string[];
  bloodOrganisms: string[];
  reason: string | null;
};

/** Quét cấy máu trong SBAP khớp VK bệnh phẩm tại chỗ → Secondary BSI. */
export function detectSecondaryBsiFromSbap(input: {
  primarySite: SecondaryBsiPrimarySite;
  sbapStart: string;
  sbapEnd: string;
  xn: BaGridXnCell[];
  primaryOrganisms: string[];
  bloodMandatoryIds?: string[];
}): SecondarySbapScanResult {
  const siteOrgs = input.primaryOrganisms.filter(isPositiveCultureOrganism);
  const matchedBloodIds: string[] = [];
  const bloodOrganisms: string[] = [];
  const reasons: string[] = [];

  for (const x of input.xn) {
    if (!isBloodSpecimen(x.benh_pham)) continue;
    if (!isPositiveCultureOrganism(x.vi_khuan)) continue;
    const bloodMandatory = Boolean(input.bloodMandatoryIds?.includes(x.id));
    let matched = false;
    let lastReason = "";
    for (const primary of siteOrgs.length ? siteOrgs : [null]) {
      const r = evaluateSecondaryBsi({
        primarySite: input.primarySite,
        bloodCollectionDate: x.ngay.slice(0, 10),
        sbapStart: input.sbapStart,
        sbapEnd: input.sbapEnd,
        bloodOrganism: x.vi_khuan,
        primaryOrganism: primary,
        bloodMandatoryForPrimary: bloodMandatory,
      });
      lastReason = r.reason;
      if (r.isSecondary) {
        matched = true;
        reasons.push(r.reason);
        break;
      }
    }
    if (!siteOrgs.length && bloodMandatory) {
      const r = evaluateSecondaryBsi({
        primarySite: input.primarySite,
        bloodCollectionDate: x.ngay.slice(0, 10),
        sbapStart: input.sbapStart,
        sbapEnd: input.sbapEnd,
        bloodOrganism: x.vi_khuan,
        primaryOrganism: null,
        bloodMandatoryForPrimary: true,
      });
      if (r.isSecondary) {
        matched = true;
        reasons.push(r.reason);
      } else {
        lastReason = r.reason;
      }
    }
    if (matched) {
      matchedBloodIds.push(x.id);
      const key = x.vi_khuan.trim().toLowerCase();
      if (!bloodOrganisms.some((o) => o.toLowerCase() === key)) {
        bloodOrganisms.push(x.vi_khuan.trim());
      }
    } else if (lastReason) {
      // giữ im lặng — không secondary
    }
  }

  return {
    isSecondary: matchedBloodIds.length > 0,
    matchedBloodIds,
    bloodOrganisms,
    reason: reasons[0] || null,
  };
}

/** Thứ tự: HAI/POA · loại NK (+ Secondary?) · NSK · tác nhân · nơi. */
export function formatBaKetLuanSummary(input: {
  haiPoa: string;
  loaiNk: string;
  secondaryBsi?: boolean;
  nsk: string | null;
  tacNhan?: string | null;
  noi?: string | null;
}): string {
  const loai =
    input.secondaryBsi && !/secondary\s*bsi/i.test(input.loaiNk)
      ? `${input.loaiNk}; Secondary BSI`
      : input.loaiNk;
  return [
    input.haiPoa,
    loai,
    input.nsk ? `NSK ${dayLabel(input.nsk)}` : null,
    input.tacNhan && input.tacNhan !== "—" ? input.tacNhan : null,
    input.noi || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Kết luận tạm khi chưa đủ tiêu chuẩn — không gắn HAI/POA/NSK như đã chốt.
 * Chỉ phản ánh Index + gợi ý thiếu gì (từ verdict).
 */
export function formatBaKetLuanProgressive(input: {
  indexDate: string | null;
  verdictLabel?: string | null;
  tacNhanHint?: string | null;
}): string {
  if (input.verdictLabel?.trim()) return input.verdictLabel.trim();
  return [
    "Chưa đủ TC",
    input.indexDate ? `Index ${dayLabel(input.indexDate)}` : null,
    input.tacNhanHint && input.tacNhanHint !== "—" ? input.tacNhanHint : null,
    "bổ sung triệu chứng / tiêu chuẩn trong IWP",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function mergePathogenLists(...lists: Array<string[] | null | undefined>): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const p of list || []) {
      const t = String(p || "").trim();
      if (!isPositiveCultureOrganism(t)) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out.join("; ") || "";
}

/** Cảnh báo Index mới nằm trong RIT ca trước (cùng major) — không chặn phân tích. */
export function scanIndexPriorRitAlert(input: {
  maBenhAn: string;
  indexDate: string;
  loaiBenhPham: string;
  existingEvents: ExistingNkbvEventForScan[];
  /** Bỏ qua phiếu gắn cùng Index (đang sửa). */
  excludeEventIds?: string[];
}): ImportWindowAlert | null {
  const events = (input.existingEvents || []).filter(
    (e) => !input.excludeEventIds?.includes(e.id),
  );
  const alerts = scanImportWindowAlerts({
    ma_benh_an: input.maBenhAn,
    ngay_lay_mau: input.indexDate.slice(0, 10),
    loai_benh_pham: input.loaiBenhPham,
    existingEvents: events,
  });
  const rit = alerts.find((a) => a.code === "RIT");
  if (!rit) return null;
  return {
    ...rit,
    message: `Mẫu nằm trong khung sự kiện trước (DOE ${rit.doe || "?"} – RIT ${rit.window_end || "?"}). Có thể phân tích tiếp nhưng kết luận nên gộp / không tạo trùng.`,
  };
}

export type { ExistingNkbvEventForScan, ImportWindowAlert };
