/**
 * Pure engine for BA CDC grid timeline — ba-cdc-grid-timeline.md (17 rows, shift Index)
 */

import { calculateCdcMetrics, type CdcMetricsResult } from "./nkbv-timeline-math";
import {
  addDays,
  clinicalRitEnd,
  daysBetween,
  isDeviceAssociated,
} from "./nkbv-shared-timeline";
import { resolveNkbvMajorType, sameMajorType, type NkbvMajorType } from "./nkbv-major-type";
import type { NkbvChecklistTypeCode } from "./nkbv-loai-labels";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";
import {
  NKBV_CRITERIA_ADD_CATALOG,
  type NkbvCriteriaKey,
} from "./nkbv-criteria-matrix";
import {
  UTI_INFANT_CRITERIA_KEYS_FROM_CATALOG,
  UTI_VOIDING_CRITERIA_KEYS_FROM_CATALOG,
  criteriaKeyToFormField,
  type CriteriaMapContext,
} from "./nkbv-clinical-symptom-catalog";
import { displaySpecimenOnGrid } from "./nkbv-specimen-canonical";

export type BaGridNghiNgo = "PNEU" | "BSI" | "UTI" | "VAE" | "SSI";

export type BaGridXnCell = {
  id: string;
  ngay: string;
  benh_pham: string;
  vi_khuan: string;
  so_luong?: string | null;
  source: "LIS" | "MANUAL";
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
  /** Đánh dấu sẵn sàng chốt (không còn bắt buộc để tô RIT) */
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
  canThiepActiveOnNsk?: boolean,
): NkbvChecklistTypeCode {
  if (nghiNgo === "BSI") return "BSI";
  if (nghiNgo === "UTI") return "UTI";
  if (nghiNgo === "SSI") return "SSI";
  if (nghiNgo === "VAE") return "VAE";
  return canThiepActiveOnNsk ? "VAP" : "HAP";
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

/** Catalog triệu chứng lâm sàng trong tiêu chuẩn (không gồm CĐHA / SSI chẩn đoán). */
export function clinicalCatalogForNghiNgo(nghiNgo: BaGridNghiNgo) {
  const gates = gatesForNghiNgo(nghiNgo);
  return NKBV_CRITERIA_ADD_CATALOG.filter(
    (c) =>
      c.milestoneKind === "SYMPTOM" &&
      !SSI_DIAGNOSTIC_CRITERIA_KEYS.has(c.criteriaKey) &&
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

export function splitMilestonesToGridRows(milestones: BaTimelineMilestone[]): {
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  /** Ngày mổ / PROCEDURE_SURGERY — hàng riêng bảng chung. */
  surgeryByDate: BaGridSymptomByDate;
  /** TC chẩn đoán SSI (không gồm ngày mổ). */
  tieuChuanChuyenBietByDate: BaGridSymptomByDate;
  /** Catalog triệu chứng lâm sàng trong tiêu chuẩn CDC. */
  trieuChungLamSangByDate: BaGridSymptomByDate;
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
      xn.push({
        id: m.id,
        ngay: d,
        benh_pham: displaySpecimenOnGrid(m.loai_benh_pham) || m.kind || "—",
        vi_khuan: m.tac_nhan || m.title || "—",
        so_luong: m.so_luong || null,
        source: m.source === "LIS" ? "LIS" : "MANUAL",
      });
      continue;
    }

    if (m.source === "DEVICE" || m.source === "EVENT") continue;

    // SSI diagnostic criteria → hàng TC chẩn đoán
    if (m.criteriaKey && SSI_DIAGNOSTIC_CRITERIA_KEYS.has(m.criteriaKey)) {
      const label =
        NKBV_CRITERIA_ADD_CATALOG.find((c) => c.criteriaKey === m.criteriaKey)?.title || m.title;
      if (!tieuChuanChuyenBietByDate[d]) tieuChuanChuyenBietByDate[d] = [];
      tieuChuanChuyenBietByDate[d].push({ key: m.criteriaKey, label, id: m.id });
      continue;
    }

    // Có criteriaKey lâm sàng (không imaging / không SSI chẩn đoán)
    if (m.criteriaKey && m.criteriaKey !== "imaging_chest" && m.criteriaKey !== "abscess_imaging") {
      const label =
        NKBV_CRITERIA_ADD_CATALOG.find((c) => c.criteriaKey === m.criteriaKey)?.title || m.title;
      if (!trieuChungLamSangByDate[d]) trieuChungLamSangByDate[d] = [];
      trieuChungLamSangByDate[d].push({ key: m.criteriaKey, label, id: m.id });
      continue;
    }

    // SYMPTOM / MANUAL không criteria → vẫn hiện hàng TC chẩn đoán (nhãn tự do)
    if (kind === "SYMPTOM" || m.source === "MANUAL") {
      if (!tieuChuanChuyenBietByDate[d]) tieuChuanChuyenBietByDate[d] = [];
      tieuChuanChuyenBietByDate[d].push({ key: m.id, label: m.title, id: m.id });
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
    notesByDate,
    noteIdsByDate,
    tieuChuanByDate: trieuChungLamSangByDate,
    symptomsByDate: trieuChungLamSangByDate,
  };
}

function buildSymptomDatesForMetrics(
  tieuChuanByDate: BaGridSymptomByDate,
  cdha: BaGridCdhaCell[],
  base: Record<string, string>,
  activeIndex: BaGridActiveIndex | null,
  nghiNgo?: BaGridNghiNgo | null,
): Record<string, string> {
  const mapCtx: CriteriaMapContext = { syndrome: nghiNgo || undefined };
  const out = { ...base };
  for (const [date, items] of Object.entries(tieuChuanByDate)) {
    for (const it of items) {
      const formKey =
        criteriaKeyToSymptomDateKey(it.key as NkbvCriteriaKey, mapCtx) ||
        (it.key.startsWith("has_") || it.key.includes("_") ? it.key : null);
      if (!formKey) continue;
      const prev = out[formKey];
      if (!prev || date < prev) out[formKey] = date;
    }
  }
  for (const c of cdha) {
    if (
      c.tieu_chuan_key === "imaging_chest" ||
      /viêm phổi|thâm nhiễm|đông đặc/i.test(c.mo_ta_benh_ly)
    ) {
      const prev = out.has_chest_imaging_abnormal;
      if (!prev || c.ngay < prev) out.has_chest_imaging_abnormal = c.ngay.slice(0, 10);
    }
  }
  // Index = tiêu chí chẩn đoán: đảm bảo ngày Index vào tập DOE
  if (activeIndex?.kind === "TIEU_CHUAN") {
    const d = activeIndex.date.slice(0, 10);
    const cell = Object.values(tieuChuanByDate)
      .flat()
      .find((x) => x.id === activeIndex.id);
    const formKey = cell
      ? criteriaKeyToSymptomDateKey(cell.key as NkbvCriteriaKey, mapCtx)
      : null;
    if (formKey && (!out[formKey] || d < out[formKey])) out[formKey] = d;
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

  const deviceOnIndex = input.canThiepDates.some((d) => d.slice(0, 10) === indexDate);
  let checklistType = nghiNgoToChecklistType(input.nghiNgo, deviceOnIndex);

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
        ? { vent_days: input.canThiepDates.length }
        : {}),
    },
    symptomDates,
    treatmentHistory: [],
    indexDateOverride: indexDate,
  });

  if (input.nghiNgo === "PNEU" && metrics.doe) {
    const sorted = [...input.canThiepDates].map((d) => d.slice(0, 10)).sort();
    const placed = sorted[0];
    if (placed) {
      const assoc = isDeviceAssociated({
        placedDate: placed,
        removedDate: null,
        doe: metrics.doe,
      });
      const active =
        assoc.activeOnEvent ||
        input.canThiepDates.some((d) => {
          const x = d.slice(0, 10);
          return x === metrics.doe || x === addDays(metrics.doe, -1);
        });
      checklistType = active ? "VAP" : "HAP";
    }
  }

  const iwpDates = dateSetInclusive(metrics.iwp_start, metrics.iwp_end);
  // Có Index → luôn có NSK (ít nhất = Index) — chế độ phân tích
  const nsk = metrics.doe || indexDate;

  // RIT/SBAP luôn tô khi có NSK (không phụ thuộc tick Đủ TC)
  const ritEnd = (nsk && (metrics.rit_end || clinicalRitEnd(nsk))) || null;
  const ritDates = nsk && ritEnd ? dateSetInclusive(nsk, ritEnd) : new Set<string>();
  const sbapDates =
    nsk && metrics.sbap_start
      ? dateSetInclusive(metrics.sbap_start, metrics.sbap_end)
      : new Set<string>();

  // Khung cột neo Index: trước 7 ngày · sau 14 ngày (IWP/RIT vẫn tính đủ, chỉ cắt hiển thị)
  const columns = buildGridColumns({
    ngayVaoVien: input.ngayVaoVien,
    ngayRaVien: input.ngayRaVien,
    evidenceDates: [],
    indexAnchor: {
      date: indexDate,
      beforeDays: GRID_INDEX_BEFORE_DAYS,
      afterDays: GRID_INDEX_AFTER_DAYS,
    },
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

  const { attributedXnIds, attributedCdhaIds } = nsk
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

  const tacNhan =
    input.xn.find((x) => x.id === input.activeIndex?.id)?.vi_khuan ||
    input.xn.find((x) => attributedXnIds.includes(x.id))?.vi_khuan ||
    input.xn.find((x) => x.ngay.slice(0, 10) === indexDate)?.vi_khuan ||
    null;

  let lien_quan: BaGridKetLuan["lien_quan_xam_lan"] = "chua_ro";
  if (nsk && input.canThiepDates.length > 0) {
    const sorted = [...input.canThiepDates].map((d) => d.slice(0, 10)).sort();
    const assoc = isDeviceAssociated({
      placedDate: sorted[0],
      removedDate: null,
      doe: nsk,
    });
    const dayHit = input.canThiepDates.some((d) => {
      const x = d.slice(0, 10);
      return x === nsk || x === addDays(nsk, -1);
    });
    lien_quan = assoc.associated || (dayHit && assoc.placedDays >= 3) ? "co" : dayHit ? "co" : "khong";
  } else if (nsk) {
    lien_quan = "khong";
  }

  const hasTcInIwp = Object.keys(tieuChuanByDate).some((d) => iwpDates.has(d));
  const enough =
    Boolean(input.criteriaMetPreview) ||
    Boolean(input.lockedEvent?.chot) ||
    (Boolean(nsk) &&
      (hasTcInIwp ||
        input.activeIndex?.kind === "CDHA" ||
        input.activeIndex?.kind === "XN" ||
        input.activeIndex?.kind === "TIEU_CHUAN"));

  const loaiNk =
    checklistType === "VAP"
      ? "PNEU1 (VAP)"
      : checklistType === "HAP"
        ? "PNEU1 (HAP)"
        : checklistType === "BSI"
          ? "LCBI"
          : checklistType;

  const suggestedSummary = [
    loaiNk,
    enough ? metrics.haiStatus : "Không đủ TC",
    `NSK ${formatGridDayLabel(nsk)}`,
    tacNhan && tacNhan !== "—" ? tacNhan : null,
    noi,
    lien_quan === "co" ? canThiepLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const override = input.ketLuanOverride?.trim() || "";
  const ketLuan: BaGridKetLuan | null = nsk
    ? {
        loai_nk: loaiNk,
        nkbv: enough ? metrics.haiStatus : "THIEU_TC",
        nsk,
        tac_nhan: tacNhan && tacNhan !== "—" ? tacNhan : null,
        noi_xay_ra: noi,
        lien_quan_xam_lan: lien_quan,
        trang_thai: input.lockedEvent?.chot
          ? "chot"
          : enough
            ? "nhap"
            : "khong_du_tc",
        suggestedSummary,
        summary: override || suggestedSummary,
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
