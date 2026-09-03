/**
 * Pure engine for BA CDC grid timeline — ba-cdc-grid-timeline.md (17 rows, shift Index)
 */

import { calculateCdcMetrics, type CdcMetricsResult } from "./nkbv-timeline-math";
import {
  addDays,
  clinicalIwp,
  clinicalRitEnd,
  daysBetween,
  deviceAssociationFromCanThiepDates,
} from "./nkbv-shared-timeline";
import { resolveNkbvMajorType, sameMajorType, type NkbvMajorType } from "./nkbv-major-type";
import type { NkbvChecklistTypeCode } from "./nkbv-loai-labels";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";
import {
  DEVICE_CRITERIA_META,
  emptyBaDeviceByDate,
  type BaDeviceByDate,
} from "./nkbv-ba-device-timeline";
import {
  NKBV_CRITERIA_ADD_CATALOG,
  isDeviceCriteriaKey,
  type NkbvCriteriaKey,
} from "./nkbv-criteria-matrix";
import {
  INFANT_LE1_CRITERIA_KEYS_FROM_CATALOG,
  UTI_INFANT_CRITERIA_KEYS_FROM_CATALOG,
  UTI_VOIDING_CRITERIA_KEYS_FROM_CATALOG,
  criteriaKeyToFormField,
  displaySymptomLabel,
  type CriteriaMapContext,
} from "./nkbv-clinical-symptom-catalog";
import { displaySpecimenOnGrid, isNkbvSpecimenCode } from "./nkbv-specimen-canonical";
import { locationDaysToTreatmentHistory } from "./nkbv-ba-ngay";
import {
  collectRitPathogens,
  detectSecondaryBsiFromSbap,
  formatBaKetLuanSummary,
  formatBaKetLuanProgressive,
  mergePathogenLists,
} from "./nkbv-ket-luan-smart";
import type { SecondaryBsiPrimarySite } from "./nkbv-shared-secondary-bsi";

export type BaGridNghiNgo = "PNEU" | "BSI" | "UTI" | "VAE" | "SSI";

export type BaGridXnCell = {
  id: string;
  ngay: string;
  benh_pham: string;
  vi_khuan: string;
  so_luong?: string | null;
  source: "LIS" | "MANUAL";
  /** Mã chuẩn CDC khi có. */
  loai_benh_pham_chuan?: string | null;
  /** Nhãn LIS gốc — phân biệt UR/USI với nước tiểu / vết mổ. */
  lis_goc?: string | null;
  /** false = âm tính — vẫn hiện trên lưới, không mở khung hội chứng. */
  ket_qua_duong_tinh?: boolean | null;
};

export type BaGridCdhaCell = {
  id: string;
  ngay: string;
  loai: string;
  mo_ta_benh_ly: string;
  tieu_chuan_key?: NkbvCriteriaKey | null;
};

export type BaGridTieuChuanCell = {
  id: string;
  ngay: string;
  key: string;
  label: string;
};

export type BaGridActiveIndex =
  | { kind: "XN"; id: string; date: string }
  | { kind: "CDHA"; id: string; date: string }
  | { kind: "TIEU_CHUAN"; id: string; date: string };

export type BaGridSymptomByDate = Record<string, Array<{ key: string; label: string; id?: string }>>;

export type BaGridKhoaByDate = Record<string, string>;

/** Ngày có can thiệp (thở máy / CVC / Foley…) — ISO date keys. */
export type BaGridCanThiepDates = string[];

export type BaGridKetLuan = {
  loai_nk: string;
  nkbv: "HAI" | "POA" | "THIEU_TC";
  nsk: string;
  tac_nhan: string | null;
  noi_xay_ra: string | null;
  lien_quan_xam_lan: "co" | "khong" | "chua_ro";
  /** Tự quy kết từ cấy máu ∈ SBAP khớp VK tại chỗ. */
  is_secondary_bsi?: boolean;
  trang_thai: "nhap" | "chot" | "khong_du_tc";
  /** Hiển thị (override nếu có). */
  summary: string;
  /** Bản gợi ý máy — luôn giữ để “Dùng lại gợi ý”. */
  suggestedSummary: string;
};

export type BaGridSessionInput = {
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  activeIndex: BaGridActiveIndex | null;
  nghiNgo: BaGridNghiNgo;
  symptomDates: Record<string, string>;
  /** Tiêu chí CDC (hàng Triệu chứng chẩn đoán) — đếm NSK. */
  tieuChuanByDate: BaGridSymptomByDate;
  /** Lâm sàng tự do (hàng Triệu chứng) — không đếm NSK trừ khi map được criteria. */
  trieuChungLamSangByDate?: BaGridSymptomByDate;
  /** @deprecated dùng tieuChuanByDate */
  symptomsByDate?: BaGridSymptomByDate;
  khoaByDate: BaGridKhoaByDate;
  canThiepDates: BaGridCanThiepDates;
  /** IP ghi đè chuỗi Kết luận */
  ketLuanOverride?: string | null;
  /** Đủ TC cấu thành sự kiện — bắt buộc để tô RIT/SBAP và gom mẫu */
  criteriaMetPreview?: boolean;
  lockedEvent?: { nsk: string; majorType: NkbvMajorType; chot: boolean } | null;
};

export type BaGridColumn = {
  date: string;
  /** HD1 = ngày vào viện; null nếu cột trước ngày vào viện (không hiện số âm). */
  hd: number | null;
  label: string;
};

/** Hospital Day: VV = HD1; trước VV → null. */
export function hospitalDayNumber(ngayVaoVien: string, date: string): number | null {
  const adm = ngayVaoVien.slice(0, 10);
  const d = date.slice(0, 10);
  if (!adm || !d) return null;
  if (d < adm) return null;
  return daysBetween(adm, d) + 1;
}

export type BaGridEngineResult = {
  columns: BaGridColumn[];
  indexDate: string | null;
  metrics: CdcMetricsResult | null;
  iwpDates: Set<string>;
  nsk: string | null;
  ritDates: Set<string>;
  sbapDates: Set<string>;
  sbapLabel: string;
  canThiepLabel: string;
  attributedXnIds: string[];
  attributedCdhaIds: string[];
  ketLuan: BaGridKetLuan | null;
  checklistType: NkbvChecklistTypeCode;
};

export function formatGridDayLabel(iso: string): string {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const [, m, day] = d.split("-");
  return `${Number(day)}/${Number(m)}`;
}

/** Cột ngày khi đã có Index: trước Index / sau Index (ngày lịch). */
export const GRID_INDEX_BEFORE_DAYS = 7;
export const GRID_INDEX_AFTER_DAYS = 14;

/** Bảng chung: khung bắt đầu VV−2 (POA nhìn được 2 ngày trước vào viện). */
export const GRID_PRE_ADMISSION_DAYS = 2;
/** Chặn cứng số cột — BA nằm lâu render theo windowing phía FE. */
export const GRID_MAX_COLUMNS = 120;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildGridColumns(input: {
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  evidenceDates: string[];
  /**
   * @deprecated khi có indexAnchor — khung neo Index −7/+14.
   */
  spanThroughDates?: string[];
  /**
   * Neo theo ngày xét nghiệm / Index: cột = Index − beforeDays … Index + afterDays.
   */
  indexAnchor?: {
    date: string;
    beforeDays?: number;
    afterDays?: number;
  } | null;
}): BaGridColumn[] {
  const adm = input.ngayVaoVien.slice(0, 10);
  if (!adm) return [];

  let start: string;
  let end: string;

  if (input.indexAnchor?.date) {
    const ix = input.indexAnchor.date.slice(0, 10);
    const before = input.indexAnchor.beforeDays ?? GRID_INDEX_BEFORE_DAYS;
    const after = input.indexAnchor.afterDays ?? GRID_INDEX_AFTER_DAYS;
    start = addDays(ix, -before);
    end = addDays(ix, after);
  } else {
    // Khung bảng chung: VV−2 → hết (ra viện, hoặc hôm nay khi đang nằm viện)
    end = input.ngayRaVien ? input.ngayRaVien.slice(0, 10) : todayIso();
    if (end < adm) end = adm;
    for (const e of input.evidenceDates) {
      const d = e.slice(0, 10);
      if (d && d > end) end = d;
    }

    start = addDays(adm, -GRID_PRE_ADMISSION_DAYS);
    for (const e of input.evidenceDates) {
      const d = e.slice(0, 10);
      if (d && d < start) start = d;
    }
  }

  const cols: BaGridColumn[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < GRID_MAX_COLUMNS) {
    cols.push({
      date: cursor,
      hd: hospitalDayNumber(adm, cursor),
      label: formatGridDayLabel(cursor),
    });
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return cols;
}

export function nghiNgoToChecklistType(
  nghiNgo: BaGridNghiNgo,
  /** Chỉ true khi đủ NHSN device-associated (≥3 ngày lịch + hiện diện DOE/DOE−1). */
  deviceAssociatedOnDoe?: boolean,
): NkbvChecklistTypeCode {
  if (nghiNgo === "BSI") return "BSI";
  if (nghiNgo === "UTI") return "UTI";
  if (nghiNgo === "SSI") return "SSI";
  if (nghiNgo === "VAE") return "VAE";
  return deviceAssociatedOnDoe ? "VAP" : "HAP";
}

export function suggestNghiNgoFromIndex(input: {
  kind: "XN" | "CDHA" | "TIEU_CHUAN";
  benh_pham?: string | null;
  criteriaKey?: string | null;
}): BaGridNghiNgo {
  if (input.kind === "CDHA") return "PNEU";
  if (input.kind === "TIEU_CHUAN") {
    const cat = NKBV_CRITERIA_ADD_CATALOG.find((c) => c.criteriaKey === input.criteriaKey);
    if (cat?.gates.includes("BSI") && !cat.gates.includes("HAP")) return "BSI";
    if (cat?.gates.includes("UTI") && !cat.gates.includes("HAP")) return "UTI";
    if (cat?.gates.includes("SSI") && !cat.gates.includes("HAP")) return "SSI";
    return "PNEU";
  }
  const major = resolveNkbvMajorType({ loai_benh_pham: input.benh_pham });
  if (major === "BSI") return "BSI";
  if (major === "UTI") return "UTI";
  if (major === "SSI") return "SSI";
  if (major === "VAE") return "VAE";
  if (major === "PNEU") return "PNEU";
  return "PNEU";
}

export function canThiepLabelForNghiNgo(nghiNgo: BaGridNghiNgo): string {
  if (nghiNgo === "BSI") return "CVC";
  if (nghiNgo === "UTI") return "Foley";
  if (nghiNgo === "SSI") return "Phẫu thuật";
  if (nghiNgo === "VAE") return "Thở máy";
  return "Thở máy";
}

export function sbapLabelForNghiNgo(nghiNgo: BaGridNghiNgo): string {
  if (nghiNgo === "BSI") return "BSI SBAP";
  if (nghiNgo === "UTI") return "UTI SBAP";
  if (nghiNgo === "SSI") return "SSI SBAP";
  if (nghiNgo === "VAE") return "VAE Event Period";
  return "PNEU SBAP";
}

function gatesForNghiNgo(nghiNgo: BaGridNghiNgo): NkbvChecklistTypeCode[] {
  if (nghiNgo === "PNEU") return ["HAP", "VAP"];
  if (nghiNgo === "BSI") return ["BSI"];
  if (nghiNgo === "UTI") return ["UTI"];
  if (nghiNgo === "SSI") return ["SSI"];
  return ["VAE"];
}

/** Khóa tiêu chuẩn thuộc hàng TC chẩn đoán (chủ yếu SSI). */
export const SSI_DIAGNOSTIC_CRITERIA_KEYS = new Set<string>([
  "procedure_surgery",
  "purulent_drainage",
  "wound_opened",
  "wound_culture",
  "physician_diagnosis",
]);

/** Catalog triệu chứng lâm sàng trong tiêu chuẩn (không gồm CĐHA / SSI chẩn đoán / device). */
export function clinicalCatalogForNghiNgo(nghiNgo: BaGridNghiNgo) {
  const gates = gatesForNghiNgo(nghiNgo);
  return NKBV_CRITERIA_ADD_CATALOG.filter(
    (c) =>
      c.milestoneKind === "SYMPTOM" &&
      !SSI_DIAGNOSTIC_CRITERIA_KEYS.has(c.criteriaKey) &&
      !isDeviceCriteriaKey(c.criteriaKey) &&
      c.gates.some((g) => gates.includes(g)),
  );
}

/** Catalog triệu chứng chẩn đoán SSI (neo Ngày X / tiêu chuẩn SSI). */
export function ssiDiagnosticCatalog() {
  return NKBV_CRITERIA_ADD_CATALOG.filter((c) =>
    SSI_DIAGNOSTIC_CRITERIA_KEYS.has(c.criteriaKey),
  );
}

/** TC SSI trên bảng chung — không gồm ngày mổ (hàng riêng). */
export function ssiTcCatalogWithoutSurgery() {
  return ssiDiagnosticCatalog().filter((c) => c.criteriaKey !== "procedure_surgery");
}

/**
 * Catalog LS dùng chung trên bảng bằng chứng BA (không dump UTI/PNEU đầy).
 * Panel hội chứng vẫn dùng clinicalCatalogForNghiNgo chuyên biệt.
 */
export function commonClinicalCatalog() {
  const keys = new Set(["fever", "fever_or_wbc"]);
  return NKBV_CRITERIA_ADD_CATALOG.filter(
    (c) =>
      c.milestoneKind === "SYMPTOM" &&
      keys.has(c.criteriaKey) &&
      !SSI_DIAGNOSTIC_CRITERIA_KEYS.has(c.criteriaKey),
  );
}

/** Catalog hình ảnh bệnh lý trong tiêu chuẩn (CĐHA). */
export function imagingCatalogForNghiNgo(nghiNgo: BaGridNghiNgo) {
  const gates = gatesForNghiNgo(nghiNgo);
  return NKBV_CRITERIA_ADD_CATALOG.filter(
    (c) =>
      (c.milestoneKind === "IMAGING_CHEST" ||
        c.criteriaKey === "imaging_chest" ||
        c.criteriaKey === "abscess_imaging") &&
      c.gates.some((g) => gates.includes(g)),
  );
}

/** @deprecated dùng clinicalCatalogForNghiNgo + imagingCatalogForNghiNgo */
export function criteriaCatalogForNghiNgo(nghiNgo: BaGridNghiNgo) {
  const gates = gatesForNghiNgo(nghiNgo);
  return NKBV_CRITERIA_ADD_CATALOG.filter((c) => c.gates.some((g) => gates.includes(g)));
}

/** SSOT: `nkbv-clinical-symptom-catalog` — giữ tên hàm cho consumers BA. */
export function criteriaKeyToSymptomDateKey(
  key: NkbvCriteriaKey,
  ctx?: CriteriaMapContext,
): string | null {
  return criteriaKeyToFormField(key, ctx);
}

/** Triệu chứng tiểu — cấm khi Foley tại chỗ (SSOT §7). */
export const UTI_VOIDING_CRITERIA_KEYS = UTI_VOIDING_CRITERIA_KEYS_FROM_CATALOG;

/** Triệu chứng SUTI 2 — chỉ hiện khi ≤1 tuổi. */
export const UTI_INFANT_CRITERIA_KEYS = UTI_INFANT_CRITERIA_KEYS_FROM_CATALOG;

/** Mọi chip lâm sàng ≤1 tuổi — ẩn khi không phải infant. */
export const INFANT_LE1_CRITERIA_KEYS = INFANT_LE1_CRITERIA_KEYS_FROM_CATALOG;

export function dateSetInclusive(start: string, end: string): Set<string> {
  const out = new Set<string>();
  if (!start || !end) return out;
  let c = start.slice(0, 10);
  const e = end.slice(0, 10);
  let guard = 0;
  while (c <= e && guard < 60) {
    out.add(c);
    c = addDays(c, 1);
    guard += 1;
  }
  return out;
}

export function attributeWithinRit(input: {
  nsk: string;
  majorType: NkbvMajorType;
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  activeIndexId?: string | null;
}): { attributedXnIds: string[]; attributedCdhaIds: string[] } {
  const ritEnd = clinicalRitEnd(input.nsk);
  const attributedXnIds: string[] = [];
  const attributedCdhaIds: string[] = [];
  for (const x of input.xn) {
    if (input.activeIndexId && x.id === input.activeIndexId) continue;
    const d = x.ngay.slice(0, 10);
    if (d < input.nsk || d > ritEnd) continue;
    const maj = resolveNkbvMajorType({ loai_benh_pham: x.benh_pham });
    if (sameMajorType(maj, input.majorType) || (input.majorType === "PNEU" && maj === "PNEU")) {
      attributedXnIds.push(x.id);
    }
  }
  for (const c of input.cdha) {
    if (input.activeIndexId && c.id === input.activeIndexId) continue;
    const d = c.ngay.slice(0, 10);
    if (d < input.nsk || d > ritEnd) continue;
    if (input.majorType === "PNEU") {
      attributedCdhaIds.push(c.id);
    }
  }
  return { attributedXnIds, attributedCdhaIds };
}

function milestoneSymptomLabel(m: BaTimelineMilestone): string {
  return (
    displaySymptomLabel({
      criteriaKey: m.criteriaKey,
      storedTitle: m.title,
      syndrome: m.gate || m.majorType,
    }) ||
    NKBV_CRITERIA_ADD_CATALOG.find((c) => c.criteriaKey === m.criteriaKey)?.title ||
    m.title
  );
}

export function splitMilestonesToGridRows(milestones: BaTimelineMilestone[]): {
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  /** Ngày mổ / PROCEDURE_SURGERY — hàng riêng bảng chung. */
  surgeryByDate: BaGridSymptomByDate;
  /** TC chẩn đoán SSI (không gồm ngày mổ). */
  tieuChuanChuyenBietByDate: BaGridSymptomByDate;
  /** Catalog triệu chứng lâm sàng trong tiêu chuẩn CDC. */
  trieuChungLamSangByDate: BaGridSymptomByDate;
  /** Foley / Vent / CVC — từng ngày trên timeline. */
  deviceByDate: BaDeviceByDate;
  notesByDate: Record<string, string>;
  noteIdsByDate: Record<string, string>;
  /** @deprecated alias lâm sàng — tương thích cũ */
  tieuChuanByDate: BaGridSymptomByDate;
  symptomsByDate: BaGridSymptomByDate;
} {
  const xn: BaGridXnCell[] = [];
  const cdha: BaGridCdhaCell[] = [];
  const surgeryByDate: BaGridSymptomByDate = {};
  const tieuChuanChuyenBietByDate: BaGridSymptomByDate = {};
  const trieuChungLamSangByDate: BaGridSymptomByDate = {};
  const deviceByDate: BaDeviceByDate = emptyBaDeviceByDate();
  const notesByDate: Record<string, string> = {};
  const noteIdsByDate: Record<string, string> = {};

  for (const m of milestones) {
    const d = m.date.slice(0, 10);
    const kind = String(m.kind || "").toUpperCase();

    if (kind === "NOTE") {
      notesByDate[d] = m.title || m.detail || "";
      noteIdsByDate[d] = m.id;
      continue;
    }

    // Can thiệp xâm lấn — cột Foley/Vent/CVC (không vào LS)
    if (isDeviceCriteriaKey(m.criteriaKey)) {
      const meta = DEVICE_CRITERIA_META[m.criteriaKey];
      const bucket = deviceByDate[meta.bucket];
      if (!bucket[d]) bucket[d] = [];
      if (!bucket[d].some((x) => x.key === m.criteriaKey)) {
        bucket[d].push({
          id: m.id,
          ngay: d,
          key: m.criteriaKey,
          label: meta.label,
        });
      }
      continue;
    }

    // Ngày mổ — hàng riêng (trước SSI TC bucket)
    if (
      m.criteriaKey === "procedure_surgery" ||
      kind === "PROCEDURE_SURGERY"
    ) {
      const label =
        NKBV_CRITERIA_ADD_CATALOG.find((c) => c.criteriaKey === "procedure_surgery")?.title ||
        m.title ||
        "Ngày phẫu thuật";
      if (!surgeryByDate[d]) surgeryByDate[d] = [];
      surgeryByDate[d].push({ key: "procedure_surgery", label, id: m.id });
      continue;
    }

    const isImaging =
      kind.includes("IMAGING") ||
      m.criteriaKey === "imaging_chest" ||
      m.criteriaKey === "abscess_imaging" ||
      /X-?QUANG|XQ|CT |SIÊU ÂM|SIEU AM/.test(`${m.title} ${m.detail || ""}`);
    const isLisOrCulture =
      m.source === "LIS" ||
      kind.includes("CULTURE") ||
      kind.includes("VI_SINH") ||
      Boolean(m.loai_benh_pham && m.tac_nhan);

    if (isImaging && !isLisOrCulture) {
      const tieuChuan = (m.criteriaKey as NkbvCriteriaKey) || "imaging_chest";
      // Dedupe theo ngày|criteria_key (không theo id) — nhiều bản DB cũ cùng khóa chỉ hiện 1 chip
      const dupIdx = cdha.findIndex(
        (c) => c.ngay.slice(0, 10) === d && (c.tieu_chuan_key || "imaging_chest") === tieuChuan,
      );
      const cell: BaGridCdhaCell = {
        id: m.id,
        ngay: d,
        loai: kind.includes("CT") ? "CT" : kind.includes("SA") || kind.includes("ULTRA") ? "SA" : "XQ",
        mo_ta_benh_ly: m.title || m.detail || "CĐHA",
        tieu_chuan_key: tieuChuan,
      };
      if (dupIdx >= 0) cdha[dupIdx] = cell;
      else cdha.push(cell);
      continue;
    }

    if (m.source === "LIS" || (isLisOrCulture && !isImaging)) {
      const chuan = isNkbvSpecimenCode(m.loai_benh_pham) ? m.loai_benh_pham : null;
      xn.push({
        id: m.id,
        ngay: d,
        benh_pham: displaySpecimenOnGrid(m.loai_benh_pham) || m.kind || "—",
        vi_khuan:
          m.tac_nhan ||
          (m.ket_qua_duong_tinh === false ? "Âm tính" : m.title) ||
          "—",
        so_luong: m.so_luong || null,
        source: m.source === "LIS" ? "LIS" : "MANUAL",
        loai_benh_pham_chuan: chuan,
        lis_goc: m.lis_goc || null,
        ket_qua_duong_tinh: m.ket_qua_duong_tinh ?? null,
      });
      continue;
    }

    if (m.source === "DEVICE" || m.source === "EVENT") continue;

    // SSI diagnostic criteria → hàng TC chẩn đoán
    if (m.criteriaKey && SSI_DIAGNOSTIC_CRITERIA_KEYS.has(m.criteriaKey)) {
      const label = milestoneSymptomLabel(m);
      if (!tieuChuanChuyenBietByDate[d]) tieuChuanChuyenBietByDate[d] = [];
      tieuChuanChuyenBietByDate[d].push({ key: m.criteriaKey, label, id: m.id });
      continue;
    }

    // Có criteriaKey lâm sàng (không imaging / không SSI chẩn đoán)
    if (m.criteriaKey && m.criteriaKey !== "imaging_chest" && m.criteriaKey !== "abscess_imaging") {
      const label = milestoneSymptomLabel(m);
      if (!trieuChungLamSangByDate[d]) trieuChungLamSangByDate[d] = [];
      trieuChungLamSangByDate[d].push({ key: m.criteriaKey, label, id: m.id });
      continue;
    }

    // SYMPTOM / MANUAL không criteria → vẫn hiện hàng TC chẩn đoán (nhãn tự do)
    if (kind === "SYMPTOM" || m.source === "MANUAL") {
      if (!tieuChuanChuyenBietByDate[d]) tieuChuanChuyenBietByDate[d] = [];
      tieuChuanChuyenBietByDate[d].push({
        key: m.id,
        label: milestoneSymptomLabel(m),
        id: m.id,
      });
    }
  }

  for (const m of milestones) {
    if (m.criteriaKey !== "imaging_chest" && m.criteriaKey !== "abscess_imaging") continue;
    const d = m.date.slice(0, 10);
    const tieuChuan = m.criteriaKey as NkbvCriteriaKey;
    const dupIdx = cdha.findIndex(
      (c) => c.ngay.slice(0, 10) === d && (c.tieu_chuan_key || "imaging_chest") === tieuChuan,
    );
    if (dupIdx >= 0) continue;
    cdha.push({
      id: m.id,
      ngay: d,
      loai: "XQ",
      mo_ta_benh_ly: m.title || "XQ phổi bất thường",
      tieu_chuan_key: tieuChuan,
    });
  }

  return {
    xn,
    cdha,
    surgeryByDate,
    tieuChuanChuyenBietByDate,
    trieuChungLamSangByDate,
    deviceByDate,
    notesByDate,
    noteIdsByDate,
    tieuChuanByDate: trieuChungLamSangByDate,
    symptomsByDate: trieuChungLamSangByDate,
  };
}

/**
 * Gom ngày yếu tố TC cho DOE — chỉ ngày ∈ IWP của Index đang xét.
 * Progressive: sốt lần trước ngoài IWP mới không được “che” sốt trong IWP mới.
 * CDC §3.2: DOE = min(yếu tố ∈ IWP); Index là một ứng viên (tính ở calculateCdcMetrics).
 */
function buildSymptomDatesForMetrics(
  tieuChuanByDate: BaGridSymptomByDate,
  cdha: BaGridCdhaCell[],
  base: Record<string, string>,
  activeIndex: BaGridActiveIndex | null,
  nghiNgo?: BaGridNghiNgo | null,
): Record<string, string> {
  const mapCtx: CriteriaMapContext = { syndrome: nghiNgo || undefined };
  const indexDate = activeIndex?.date.slice(0, 10) || "";
  const iwp = indexDate ? clinicalIwp(indexDate) : null;
  const inIwp = (raw: string) => {
    const d = raw.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    if (!iwp) return true;
    return d >= iwp.start && d <= iwp.end;
  };

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(base || {})) {
    const d = String(v || "").slice(0, 10);
    if (d && inIwp(d)) out[k] = d;
  }
  for (const [date, items] of Object.entries(tieuChuanByDate)) {
    const day = date.slice(0, 10);
    if (!inIwp(day)) continue;
    for (const it of items) {
      const formKey =
        criteriaKeyToSymptomDateKey(it.key as NkbvCriteriaKey, mapCtx) ||
        (it.key.startsWith("has_") || it.key.includes("_") ? it.key : null);
      if (!formKey) continue;
      const prev = out[formKey];
      if (!prev || day < prev) out[formKey] = day;
    }
  }
  for (const c of cdha) {
    const day = c.ngay.slice(0, 10);
    if (!inIwp(day)) continue;
    if (
      c.tieu_chuan_key === "imaging_chest" ||
      /viêm phổi|thâm nhiễm|đông đặc/i.test(c.mo_ta_benh_ly)
    ) {
      const prev = out.has_chest_imaging_abnormal;
      if (!prev || day < prev) out.has_chest_imaging_abnormal = day;
    }
  }
  // Index = tiêu chí chẩn đoán: đảm bảo ngày Index vào tập DOE
  if (activeIndex?.kind === "TIEU_CHUAN") {
    const d = activeIndex.date.slice(0, 10);
    if (inIwp(d)) {
      const cell = Object.values(tieuChuanByDate)
        .flat()
        .find((x) => x.id === activeIndex.id);
      const formKey = cell
        ? criteriaKeyToSymptomDateKey(cell.key as NkbvCriteriaKey, mapCtx)
        : null;
      if (formKey && (!out[formKey] || d < out[formKey])) out[formKey] = d;
    }
  }
  return out;
}

export function computeBaGridSession(input: BaGridSessionInput): BaGridEngineResult {
  const tieuChuanByDate = input.tieuChuanByDate || input.symptomsByDate || {};
  const evidenceDates = [
    ...input.xn.map((x) => x.ngay),
    ...input.cdha.map((c) => c.ngay),
    ...Object.keys(tieuChuanByDate),
    ...Object.keys(input.trieuChungLamSangByDate || {}),
    ...input.canThiepDates,
    ...Object.keys(input.khoaByDate),
  ];

  const indexDate = input.activeIndex?.date.slice(0, 10) || null;
  const canThiepLabel = canThiepLabelForNghiNgo(input.nghiNgo);
  const sbapLabel = sbapLabelForNghiNgo(input.nghiNgo);

  if (!indexDate) {
    return {
      columns: buildGridColumns({
        ngayVaoVien: input.ngayVaoVien,
        ngayRaVien: input.ngayRaVien,
        evidenceDates,
      }),
      indexDate: null,
      metrics: null,
      iwpDates: new Set(),
      nsk: null,
      ritDates: new Set(),
      sbapDates: new Set(),
      sbapLabel,
      canThiepLabel,
      attributedXnIds: [],
      attributedCdhaIds: [],
      ketLuan: null,
      checklistType: nghiNgoToChecklistType(input.nghiNgo, false),
    };
  }

  const symptomDates = buildSymptomDatesForMetrics(
    tieuChuanByDate,
    input.cdha,
    input.symptomDates,
    input.activeIndex,
    input.nghiNgo,
  );

  const pneuTrigger =
    input.activeIndex?.kind === "CDHA"
      ? "IMAGING"
      : input.activeIndex?.kind === "XN"
        ? "CULTURE"
        : "CULTURE";

  // Chưa có DOE → tạm HAP; sau metrics mới gắn VAP khi đủ ≥3d + hiện diện
  let checklistType = nghiNgoToChecklistType(input.nghiNgo, false);

  const metricsChecklist =
    checklistType === "VAP" ||
    checklistType === "HAP" ||
    checklistType === "BSI" ||
    checklistType === "UTI" ||
    checklistType === "SSI" ||
    checklistType === "VAE"
      ? checklistType
      : ("HAP" as const);

  const metrics = calculateCdcMetrics({
    ngay_phat_hien: indexDate,
    ngay_vao_vien: input.ngayVaoVien.slice(0, 10),
    checklistType: metricsChecklist,
    activeForm: {
      pneu_trigger: pneuTrigger,
      ...(input.nghiNgo === "PNEU" || input.nghiNgo === "VAE"
        ? {
            vent_days: deviceAssociationFromCanThiepDates(
              input.canThiepDates,
              indexDate,
              {
                admissionDate: input.ngayVaoVien,
                dischargeDate: input.ngayRaVien,
              },
            ).placedDays,
          }
        : {}),
    },
    symptomDates,
    treatmentHistory: locationDaysToTreatmentHistory(
      Object.entries(input.khoaByDate || {}).map(([ngay_lich, khoa_id]) => ({
        ngay_lich,
        khoa_id,
      })),
      (id) => ({ ten_khoa: id }),
    ),
    indexDateOverride: indexDate,
  });

  if (input.nghiNgo === "PNEU" && metrics.doe) {
    const assoc = deviceAssociationFromCanThiepDates(
      input.canThiepDates,
      metrics.doe,
      {
        admissionDate: input.ngayVaoVien,
        dischargeDate: input.ngayRaVien,
      },
    );
    // VAP chỉ khi đủ Day 3+ và hiện diện DOE/DOE−1 (không gắn vì chỉ tick 1 ngày)
    checklistType = assoc.associated ? "VAP" : "HAP";
  }

  const iwpDates =
    input.nghiNgo === "SSI"
      ? new Set<string>()
      : dateSetInclusive(metrics.iwp_start, metrics.iwp_end);
  // DOE/NSK = min(yếu tố TC ∈ IWP); không có yếu tố lâm sàng sớm hơn → = Index
  const nsk = metrics.doe || indexDate;

  // Đủ TC → khóa attributed / smart Secondary / kết luận đầy đủ
  const enough =
    Boolean(input.criteriaMetPreview) || Boolean(input.lockedEvent?.chot);

  // Paint RIT/SBAP ngay khi có NSK (ứng viên để IP rà) — không chờ đủ TC CDC
  const ritEnd = nsk ? metrics.rit_end || clinicalRitEnd(nsk) : null;
  const ritDates =
    nsk && ritEnd ? dateSetInclusive(nsk, ritEnd) : new Set<string>();
  const sbapDates =
    nsk && metrics.sbap_start
      ? dateSetInclusive(metrics.sbap_start, metrics.sbap_end)
      : new Set<string>();

  // Khung hiển thị VV−2 → hết (đồng bộ bảng chung; IWP vẫn tính khi phân tích)
  const columns = buildGridColumns({
    ngayVaoVien: input.ngayVaoVien,
    ngayRaVien: input.ngayRaVien,
    evidenceDates: [indexDate],
  });

  const majorType: NkbvMajorType =
    input.nghiNgo === "PNEU"
      ? "PNEU"
      : input.nghiNgo === "BSI"
        ? "BSI"
        : input.nghiNgo === "UTI"
          ? "UTI"
          : input.nghiNgo === "SSI"
            ? "SSI"
            : "VAE";

  const { attributedXnIds, attributedCdhaIds } =
    enough && nsk
      ? attributeWithinRit({
          nsk,
          majorType,
          xn: input.xn,
          cdha: input.cdha,
          activeIndexId: input.activeIndex?.id,
        })
      : { attributedXnIds: [], attributedCdhaIds: [] };

  const noi =
    (nsk && input.khoaByDate[nsk]) ||
    Object.entries(input.khoaByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .find(([d]) => nsk && d <= nsk)?.[1] ||
    null;

  const ritPathogens = nsk
    ? collectRitPathogens({
        nsk,
        majorType,
        xn: input.xn,
        excludeBlood: majorType !== "BSI",
      })
    : [];

  const secondaryScan =
    enough &&
    nsk &&
    metrics.sbap_start &&
    metrics.sbap_end &&
    (majorType === "UTI" || majorType === "PNEU" || majorType === "SSI")
      ? detectSecondaryBsiFromSbap({
          primarySite: majorType as SecondaryBsiPrimarySite,
          sbapStart: metrics.sbap_start,
          sbapEnd: metrics.sbap_end,
          xn: input.xn,
          primaryOrganisms: ritPathogens,
        })
      : null;

  const tacNhanMerged = mergePathogenLists(
    ritPathogens,
    secondaryScan?.isSecondary ? secondaryScan.bloodOrganisms : null,
  );
  const tacNhan =
    tacNhanMerged ||
    input.xn.find((x) => x.id === input.activeIndex?.id)?.vi_khuan ||
    input.xn.find((x) => attributedXnIds.includes(x.id))?.vi_khuan ||
    input.xn.find((x) => x.ngay.slice(0, 10) === indexDate)?.vi_khuan ||
    null;

  let lien_quan: BaGridKetLuan["lien_quan_xam_lan"] = "chua_ro";
  if (nsk && input.canThiepDates.length > 0) {
    const assoc = deviceAssociationFromCanThiepDates(input.canThiepDates, nsk, {
      admissionDate: input.ngayVaoVien,
      dischargeDate: input.ngayRaVien,
    });
    // CDC: chỉ «có» khi ≥3 ngày đặt + hiện diện DOE/DOE−1
    lien_quan = assoc.associated ? "co" : "khong";
  } else if (nsk) {
    lien_quan = "khong";
  }

  const loaiNk =
    checklistType === "VAP"
      ? "PNEU1 (VAP)"
      : checklistType === "HAP"
        ? "PNEU1 (HAP)"
        : checklistType === "BSI"
          ? "LCBI"
          : checklistType;

  const isSecondaryBsi = Boolean(secondaryScan?.isSecondary);
  const override = input.ketLuanOverride?.trim() || "";
  const suggestedSummary = enough
    ? formatBaKetLuanSummary({
        haiPoa: metrics.haiStatus,
        loaiNk,
        secondaryBsi: isSecondaryBsi,
        nsk,
        tacNhan: tacNhan && tacNhan !== "—" ? tacNhan : null,
        noi,
      })
    : formatBaKetLuanProgressive({
        indexDate,
        verdictLabel: override || null,
        tacNhanHint: tacNhan && tacNhan !== "—" ? tacNhan : null,
      });

  const ketLuan: BaGridKetLuan | null = nsk
    ? {
        loai_nk: enough ? loaiNk : "đang phân tích",
        nkbv: enough ? metrics.haiStatus : "THIEU_TC",
        nsk,
        tac_nhan: tacNhan && tacNhan !== "—" ? tacNhan : null,
        noi_xay_ra: noi,
        lien_quan_xam_lan: lien_quan,
        is_secondary_bsi: enough && isSecondaryBsi ? true : undefined,
        trang_thai: input.lockedEvent?.chot
          ? "chot"
          : enough
            ? "nhap"
            : "khong_du_tc",
        suggestedSummary,
        // Khi chưa đủ TC: ưu tiên nhãn verdict (override) làm summary hiển thị
        summary: enough ? override || suggestedSummary : suggestedSummary,
      }
    : null;

  return {
    columns,
    indexDate,
    metrics,
    iwpDates,
    nsk,
    ritDates,
    sbapDates,
    sbapLabel,
    canThiepLabel,
    attributedXnIds,
    attributedCdhaIds,
    ketLuan,
    checklistType,
  };
}

export function expandKhoaSpan(
  start: string,
  end: string,
  maKhoa: string,
): BaGridKhoaByDate {
  const out: BaGridKhoaByDate = {};
  for (const d of dateSetInclusive(start, end)) {
    out[d] = maKhoa;
  }
  return out;
}
