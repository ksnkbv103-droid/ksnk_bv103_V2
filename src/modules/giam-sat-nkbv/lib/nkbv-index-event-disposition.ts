/**
 * Quy kết Index khi chọn mẫu/CĐHA — SSOT §3.4 RIT + §4 Secondary BSI (đa site).
 * Pure: không I/O.
 *
 * - Mẫu đờm/NT/XQ ∈ RIT ca cùng major → thuộc sự kiện trước (không tạo phiếu trùng).
 * - Máu ∈ SBAP + khớp loài (hoặc S2) với ≥1 site → Secondary; có thể gắn nhiều site cùng lúc.
 */

import { isBloodSpecimen } from "./nkbv-sbap-rit-chips";
import {
  evaluateSecondaryBsiForBlood,
  type PrimarySiteForSbap,
} from "./nkbv-secondary-bsi-gate";
import {
  resolveNkbvMajorType,
  sameMajorType,
  type NkbvMajorType,
} from "./nkbv-major-type";
import {
  addDays,
  clinicalSbapWindow,
  daysBetween,
  ssiSbapWindow,
} from "./nkbv-shared-timeline";
import {
  bareViSinhIdFromMilestoneId,
  khongDuTcKetLuanLabel,
  resolveViSinhAnalysisStatus,
  type ViSinhAnalysisDispositionRow,
} from "./nkbv-vi-sinh-analysis-status";

export type PriorEventForDisposition = {
  id: string;
  ngay_phat_hien: string | null;
  loai_ma?: string | null;
  loai_ten?: string | null;
  vi_tri_nhiem_khuan?: string | null;
  index_vi_sinh_id?: string | null;
  tac_nhan_vi_khuan?: string | null;
  attributed_vi_sinh_ids?: string[] | null;
  /** Index date nếu biết (để SBAP lâm sàng chính xác). */
  index_date?: string | null;
};

export type SecondarySiteHit = {
  eventId: string;
  majorType: NkbvMajorType;
  scenario: "S1" | "S2";
  doe: string;
  reason: string;
};

export type IndexEventDisposition =
  | {
      kind: "BELONGS_PRIOR_EVENT";
      priorEventId: string;
      priorDoe: string;
      priorLoai: string;
      majorType: NkbvMajorType;
      ketLuanLabel: string;
      reason: string;
    }
  | {
      kind: "SECONDARY_BSI";
      sites: SecondarySiteHit[];
      ketLuanLabel: string;
      reason: string;
    }
  | {
      kind: "CLOSED_INSUFFICIENT";
      indexDate: string;
      ketLuanLabel: string;
      reason: string;
    }
  | { kind: "NEW_ANALYSIS" };

function dayLabel(iso: string): string {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const [, m, day] = d.split("-");
  return `${Number(day)}/${Number(m)}`;
}

function eventMajor(e: PriorEventForDisposition): NkbvMajorType {
  return resolveNkbvMajorType({
    loai_ma: e.loai_ma,
    vi_tri_nhiem_khuan: e.vi_tri_nhiem_khuan,
  });
}

function eventDoe(e: PriorEventForDisposition): string {
  return String(e.ngay_phat_hien || "").slice(0, 10);
}

function eventLoaiLabel(e: PriorEventForDisposition): string {
  return String(e.loai_ten || e.loai_ma || eventMajor(e) || "NK").trim();
}

function isSitePrimaryMajor(m: NkbvMajorType): boolean {
  return m === "UTI" || m === "PNEU" || m === "SSI" || m === "VAE";
}

function ownsViSinh(e: PriorEventForDisposition, bareId: string): boolean {
  if (!bareId) return false;
  if (String(e.index_vi_sinh_id || "").trim() === bareId) return true;
  return (e.attributed_vi_sinh_ids || []).some((id) => String(id).trim() === bareId);
}

/**
 * Ngày (mẫu Index hoặc DOE) nằm trong RIT 14 ngày của sự kiện prior cùng major
 * (UTI / PNEU·HAP / VAE·VAP / BSI…).
 */
export function findPriorRitOwner(
  dateIso: string,
  sampleMajor: NkbvMajorType,
  priorEvents: PriorEventForDisposition[],
  opts?: { excludeEventIds?: ReadonlySet<string> | string[] },
): PriorEventForDisposition | null {
  const sample = dateIso.slice(0, 10);
  const exclude = opts?.excludeEventIds
    ? new Set([...opts.excludeEventIds].map(String))
    : null;
  for (const e of priorEvents) {
    if (exclude?.has(String(e.id))) continue;
    const doe = eventDoe(e);
    if (!doe) continue;
    const diff = daysBetween(doe, sample);
    if (diff < 0 || diff > 13) continue;
    if (!sameMajorType(sampleMajor, eventMajor(e))) continue;
    return e;
  }
  return null;
}

function belongsLabel(loai: string, doe: string, nuance: string): string {
  return `Thuộc SK DOE ${dayLabel(doe)} (${loai}) — ${nuance}`;
}

/** DOE vừa xác định trong IWP nằm trong RIT sự kiện đã có → gom, không tạo SK mới. */
export function resolveDoeBelongsPriorEvent(input: {
  doe: string;
  sampleMajor: NkbvMajorType;
  priorEvents: PriorEventForDisposition[];
  excludeEventIds?: string[];
  excludeIndexViSinhId?: string | null;
}): Extract<IndexEventDisposition, { kind: "BELONGS_PRIOR_EVENT" }> | null {
  const doe = String(input.doe || "").slice(0, 10);
  if (!doe) return null;
  const exclude = new Set((input.excludeEventIds || []).map(String));
  const bare = String(input.excludeIndexViSinhId || "").trim();
  for (const e of input.priorEvents) {
    if (exclude.has(String(e.id))) continue;
    if (bare && ownsViSinh(e, bare)) continue;
    const priorDoe = eventDoe(e);
    if (!priorDoe) continue;
    if (!sameMajorType(input.sampleMajor, eventMajor(e))) continue;
    const diff = daysBetween(priorDoe, doe);
    if (diff < 0 || diff > 13) continue;
    const loai = eventLoaiLabel(e);
    return {
      kind: "BELONGS_PRIOR_EVENT",
      priorEventId: e.id,
      priorDoe,
      priorLoai: loai,
      majorType: eventMajor(e),
      ketLuanLabel: belongsLabel(
        loai,
        priorDoe,
        "DOE ∈ RIT sự kiện đủ TC — không tạo phiếu / sự kiện mới",
      ),
      reason: `DOE ${dayLabel(doe)} nằm trong RIT 14 ngày của ca ${loai} (DOE ${dayLabel(priorDoe)}).`,
    };
  }
  return null;
}

/** XN ∈ RIT phiên phân tích đang mở — chỉ khi phiên đã đủ TC sự kiện. */
export function resolveBelongsOpenSessionByDate(input: {
  sampleId: string;
  sampleDate: string;
  sampleMajor: NkbvMajorType;
  sessions: Array<{
    id: string;
    panel: string;
    index: { id: string; date: string };
    indexLabel?: string;
    /** DOE/NSK nếu đã biết; không có thì dùng ngày Index. */
    doe?: string | null;
    /** Chỉ khóa timeline khi sự kiện đã cấu thành. */
    eventEstablished?: boolean;
  }>;
}): Extract<IndexEventDisposition, { kind: "BELONGS_PRIOR_EVENT" }> | null {
  const sample = input.sampleDate.slice(0, 10);
  for (const s of input.sessions) {
    if (!s.eventEstablished) continue;
    if (String(s.index.id) === String(input.sampleId)) continue;
    const panelMajor = resolveNkbvMajorType({ loai_ma: s.panel });
    if (!sameMajorType(input.sampleMajor, panelMajor)) continue;
    const doe = String(s.doe || s.index.date || "").slice(0, 10);
    if (!doe) continue;
    const diff = daysBetween(doe, sample);
    if (diff < 0 || diff > 13) continue;
    const loai = (s.indexLabel || s.panel || panelMajor).trim();
    return {
      kind: "BELONGS_PRIOR_EVENT",
      priorEventId: `session:${s.index.id}`,
      priorDoe: doe,
      priorLoai: loai,
      majorType: panelMajor,
      ketLuanLabel: belongsLabel(
        loai,
        doe,
        "mẫu ∈ RIT sự kiện đủ TC — không mở khung phân tích mới",
      ),
      reason: "Cùng major với phiên đủ TC; ngày mẫu nằm trong RIT 14 ngày.",
    };
  }
  return null;
}

function expandSbapDates(start: string, end: string): string[] {
  const sbapDates: string[] = [];
  let cur = start.slice(0, 10);
  const last = end.slice(0, 10);
  let guard = 0;
  while (cur <= last && guard < 40) {
    sbapDates.push(cur);
    cur = addDays(cur, 1);
    guard += 1;
  }
  return sbapDates;
}

/** Xây site SBAP từ phiếu đã có — dùng cho Secondary đa site. */
export function priorEventsToSecondarySites(
  priorEvents: PriorEventForDisposition[],
): PrimarySiteForSbap[] {
  const sites: PrimarySiteForSbap[] = [];
  for (const e of priorEvents) {
    const major = eventMajor(e);
    if (!isSitePrimaryMajor(major)) continue;
    const doe = eventDoe(e);
    if (!doe) continue;
    const indexDate = (e.index_date || doe).slice(0, 10);
    const w =
      major === "SSI" ? ssiSbapWindow(doe) : clinicalSbapWindow(indexDate, doe);
    const sbapDates = expandSbapDates(w.start, w.end);
    const orgs = String(e.tac_nhan_vi_khuan || "")
      .split(/[;|,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    sites.push({
      id: e.id,
      majorType: major,
      criteriaMet: true, // phiếu đã chốt = site đủ TC
      sbapDates,
      siteOrganism: orgs[0] || e.tac_nhan_vi_khuan || null,
      siteOrganisms: orgs.length ? orgs : undefined,
      criteriaWindowDates: sbapDates,
      isPvap: major === "VAE",
      doe,
    });
  }
  return sites;
}

/**
 * Phiên site đang phân tích đã đủ TC — cũng là nguồn SBAP (Secondary-before-Primary).
 * Chưa đủ TC → không có SBAP hợp lệ → không chặn Primary.
 */
export type OpenSiteSessionForSbap = {
  id: string;
  panel: string;
  eventEstablished: boolean;
  indexDate: string;
  doe?: string | null;
  siteOrganism?: string | null;
  /** VK Index ∪ cùng major ∈ RIT */
  siteOrganisms?: string[] | null;
  bloodCriterionIds?: string[];
  /** Prefill nếu đã tô SBAP trên lưới; không có thì dựng từ Index+DOE. */
  sbapDates?: string[];
};

export function openSessionsToSecondarySites(
  sessions: OpenSiteSessionForSbap[],
): PrimarySiteForSbap[] {
  const sites: PrimarySiteForSbap[] = [];
  for (const s of sessions) {
    if (!s.eventEstablished) continue;
    const major = resolveNkbvMajorType({ loai_ma: s.panel });
    if (!isSitePrimaryMajor(major)) continue;
    const doe = (s.doe || s.indexDate || "").slice(0, 10);
    if (!doe) continue;
    const indexDate = (s.indexDate || doe).slice(0, 10);
    let sbapDates = (s.sbapDates || []).map((d) => d.slice(0, 10)).filter(Boolean);
    if (!sbapDates.length) {
      const w =
        major === "SSI" ? ssiSbapWindow(doe) : clinicalSbapWindow(indexDate, doe);
      sbapDates = expandSbapDates(w.start, w.end);
    }
    const orgs = [
      ...(s.siteOrganisms || []).map((o) => String(o || "").trim()).filter(Boolean),
      ...(s.siteOrganism ? [String(s.siteOrganism).trim()] : []),
    ];
    const uniqOrgs = [...new Set(orgs)];
    sites.push({
      id: `session:${s.id}`,
      majorType: major,
      criteriaMet: true,
      sbapDates,
      siteOrganism: uniqOrgs[0] || null,
      siteOrganisms: uniqOrgs,
      bloodCriterionIds: s.bloodCriterionIds,
      criteriaWindowDates: sbapDates,
      isPvap: major === "VAE",
      doe,
    });
  }
  return sites;
}

/** Ngày máu ∈ SBAP của ≥1 site đã đủ TC (phiếu hoặc phiên đang PT). */
export function bloodDateInAnySiteSbap(
  bloodDate: string,
  sites: PrimarySiteForSbap[],
): boolean {
  const d = bloodDate.slice(0, 10);
  if (!d) return false;
  return sites.some(
    (s) => s.criteriaMet && s.sbapDates.map((x) => x.slice(0, 10)).includes(d),
  );
}

/**
 * Quy kết khi IP chọn Index (XN / XQ).
 * Blood: quét TẤT CẢ site đủ TC — phiếu đã chốt + phiên site đang PT (SSOT §4.1).
 * Primary BSI chỉ khi không Secondary S1/S2 (và không thuộc RIT BSI trước).
 */
export function resolveIndexEventDisposition(input: {
  indexId: string;
  indexDate: string;
  /** Loại bệnh phẩm hoặc nhãn CĐHA (đờm / nước tiểu / máu / XQ phổi…). */
  specimenOrLabel: string;
  organism?: string | null;
  isImaging?: boolean;
  priorEvents: PriorEventForDisposition[];
  /** Phiên site đủ TC đang mở — bắt buộc rà SBAP trước Primary. */
  openSiteSessions?: OpenSiteSessionForSbap[];
  analysisDispositions?: ViSinhAnalysisDispositionRow[];
}): IndexEventDisposition {
  const indexDate = input.indexDate.slice(0, 10);
  const bareId =
    bareViSinhIdFromMilestoneId(input.indexId) || String(input.indexId || "").trim();
  const specimen = input.specimenOrLabel || "";
  const isBlood = !input.isImaging && isBloodSpecimen(specimen);
  const sampleMajor = resolveNkbvMajorType({
    loai_benh_pham: input.isImaging ? "Đờm" : specimen,
    loai_ma: input.isImaging ? "PNEU" : undefined,
  });

  // —— Đã đóng phân tích: không đủ TC → không khóa RIT các XN khác ——
  const status = resolveViSinhAnalysisStatus(bareId, input.analysisDispositions || []);
  if (status === "KHONG_DU_TC" && bareId) {
    return {
      kind: "CLOSED_INSUFFICIENT",
      indexDate,
      ketLuanLabel: khongDuTcKetLuanLabel(indexDate),
      reason: "Index đã chốt không đủ yếu tố tạo sự kiện — vẫn cho phân tích XN/CĐHA khác.",
    };
  }

  // —— Đã PT / attributed trên phiếu đủ TC ——
  if (status === "DA_PHAN_TICH" && bareId) {
    const owner =
      input.priorEvents.find((e) => ownsViSinh(e, bareId)) ||
      findPriorRitOwner(indexDate, sampleMajor, input.priorEvents);
    if (owner) {
      const doe = eventDoe(owner);
      const loai = eventLoaiLabel(owner);
      return {
        kind: "BELONGS_PRIOR_EVENT",
        priorEventId: owner.id,
        priorDoe: doe,
        priorLoai: loai,
        majorType: eventMajor(owner),
        ketLuanLabel: belongsLabel(
          loai,
          doe,
          "đã phân tích — thuộc sự kiện đủ TC, không tạo phiếu mới",
        ),
        reason: "XN đã gắn / attributed trên phiếu hiện có.",
      };
    }
    return {
      kind: "BELONGS_PRIOR_EVENT",
      priorEventId: "",
      priorDoe: indexDate,
      priorLoai: sampleMajor,
      majorType: sampleMajor,
      ketLuanLabel: "Đã phân tích — thuộc sự kiện đủ TC (không tạo phiếu mới)",
      reason: "Disposition DA_PHAN_TICH.",
    };
  }

  // —— Máu: Secondary đa site (ưu tiên trước RIT / Primary BSI) ——
  if (isBlood) {
    const sites = [
      ...priorEventsToSecondarySites(input.priorEvents),
      ...openSessionsToSecondarySites(input.openSiteSessions || []),
    ];
    if (sites.length) {
      const multi = evaluateSecondaryBsiForBloodAll({
        blood: {
          id: bareId || input.indexId,
          date: indexDate,
          organism: input.organism || null,
        },
        sites,
      });
      if (multi.outcome === "SECONDARY" && multi.hits.length > 0) {
        return {
          kind: "SECONDARY_BSI",
          sites: multi.hits,
          ketLuanLabel: formatSecondaryBsiKetLuan(multi.hits),
          reason: multi.hits.map((h) => h.reason).join(" · "),
        };
      }
      // EXCLUDED_PRIMARY / PRIMARY_CANDIDATE → cho phép Primary (đã rà SBAP)
    }
    // Máu ∈ RIT Primary BSI trước → thuộc ca BSI trước
    const bsiRit = findPriorRitOwner(indexDate, "BSI", input.priorEvents);
    if (bsiRit) {
      const doe = eventDoe(bsiRit);
      const loai = eventLoaiLabel(bsiRit);
      return {
        kind: "BELONGS_PRIOR_EVENT",
        priorEventId: bsiRit.id,
        priorDoe: doe,
        priorLoai: loai,
        majorType: "BSI",
        ketLuanLabel: belongsLabel(
          loai,
          doe,
          "máu ∈ RIT Primary BSI đủ TC — không tạo phiếu mới",
        ),
        reason: "Máu ∈ RIT Primary BSI trước.",
      };
    }
    return { kind: "NEW_ANALYSIS" };
  }

  // —— Đờm / NT / XQ ∈ RIT cùng major ——
  const ritOwner = findPriorRitOwner(indexDate, sampleMajor, input.priorEvents);
  if (ritOwner) {
    const doe = eventDoe(ritOwner);
    const loai = eventLoaiLabel(ritOwner);
    const major = eventMajor(ritOwner);
    return {
      kind: "BELONGS_PRIOR_EVENT",
      priorEventId: ritOwner.id,
      priorDoe: doe,
      priorLoai: loai,
      majorType: major,
      ketLuanLabel: belongsLabel(
        loai,
        doe,
        "mẫu ∈ RIT sự kiện đủ TC — không mở phân tích / không tạo phiếu mới",
      ),
      reason: `Index ${dayLabel(indexDate)} nằm trong RIT 14 ngày của ca ${major}.`,
    };
  }

  return { kind: "NEW_ANALYSIS" };
}

/**
 * XN/CĐHA ∈ RIT của **phiên đang phân tích** (cùng loại mẫu cấy với Index) →
 * thuộc sự kiện đủ TC của phiên đó — xác nhận trên cột Kết luận, không mở IWP mới.
 * Không áp dụng cho chính mẫu Index.
 */
export type ActiveSessionRitContext = {
  indexId: string;
  /** DOE / NSK (hoặc Index date nếu chưa có NSK). */
  doe: string;
  /** Nhãn loại: PNEU / CAUTI / UTI / Primary BSI… */
  loaiLabel: string;
  majorType: NkbvMajorType;
  /** Id XN nằm trong ritByDate (đã lọc cùng bệnh phẩm). */
  ritXnIds: ReadonlySet<string> | string[];
  /** Id CĐHA ∈ RIT (thường PNEU). */
  ritCdhaIds?: ReadonlySet<string> | string[];
  /** Chỉ gom/kết luận RIT khi sự kiện đã đủ TC. */
  eventEstablished?: boolean;
};

function idSet(ids?: ReadonlySet<string> | string[] | null): Set<string> {
  if (!ids) return new Set();
  if (ids instanceof Set) return new Set([...ids].map(String));
  return new Set(Array.from(ids as string[]).map(String));
}

export function resolveBelongsActiveSessionRit(input: {
  sampleId: string;
  kind: "XN" | "CDHA";
  active: ActiveSessionRitContext | null | undefined;
}): Extract<IndexEventDisposition, { kind: "BELONGS_PRIOR_EVENT" }> | null {
  const active = input.active;
  if (!active?.eventEstablished) return null;
  if (String(input.sampleId) === String(active.indexId)) return null;
  const set =
    input.kind === "CDHA" ? idSet(active.ritCdhaIds) : idSet(active.ritXnIds);
  if (!set.has(String(input.sampleId))) return null;
  const doe = active.doe.slice(0, 10);
  const loai = active.loaiLabel || active.majorType;
  return {
    kind: "BELONGS_PRIOR_EVENT",
    priorEventId: `session:${active.indexId}`,
    priorDoe: doe,
    priorLoai: loai,
    majorType: active.majorType,
    ketLuanLabel: belongsLabel(
      loai,
      doe,
      "mẫu ∈ RIT sự kiện đủ TC — không mở khung phân tích mới",
    ),
    reason: "Cùng loại bệnh phẩm với Index, nằm trong khung RIT 14 ngày của phiên hiện tại.",
  };
}

/**
 * XN đã «không đủ TC» nhưng ngày nằm trong RIT sự kiện đủ TC sau
 * → giữ KL cũ + thêm dòng thuộc SK ngày X.
 */
export function resolveInsufficientInLaterEventNote(input: {
  sampleId: string;
  sampleDate: string;
  sampleMajor: NkbvMajorType;
  analysisDispositions?: ViSinhAnalysisDispositionRow[];
  activeSessionRit?: ActiveSessionRitContext | null;
  priorEvents?: PriorEventForDisposition[];
}): string | null {
  const bare =
    bareViSinhIdFromMilestoneId(input.sampleId) || String(input.sampleId || "").trim();
  if (!bare) return null;
  const status = resolveViSinhAnalysisStatus(bare, input.analysisDispositions || []);
  if (status !== "KHONG_DU_TC") return null;

  const sample = input.sampleDate.slice(0, 10);
  const active = input.activeSessionRit;
  if (active?.eventEstablished) {
    const doe = active.doe.slice(0, 10);
    const diff = daysBetween(doe, sample);
    if (
      diff >= 0 &&
      diff <= 13 &&
      sameMajorType(input.sampleMajor, active.majorType)
    ) {
      return `Nằm trong sự kiện của xét nghiệm ngày ${dayLabel(doe)} (${active.loaiLabel || active.majorType})`;
    }
  }

  const owner = findPriorRitOwner(sample, input.sampleMajor, input.priorEvents || []);
  if (!owner) return null;
  const doe = eventDoe(owner);
  return `Nằm trong sự kiện của xét nghiệm ngày ${dayLabel(doe)} (${eventLoaiLabel(owner)})`;
}

/** Thu thập mọi site Secondary (không dừng ở site đầu). */
export function evaluateSecondaryBsiForBloodAll(input: {
  blood: { id: string; date: string; organism: string | null };
  sites: PrimarySiteForSbap[];
  lungTissueOrPleuralExempt?: boolean;
}): {
  outcome: "SECONDARY" | "PRIMARY_CANDIDATE" | "EXCLUDED_PRIMARY";
  hits: SecondarySiteHit[];
  excludedReason?: string;
} {
  const hits: SecondarySiteHit[] = [];
  let excludedReason: string | undefined;

  // Đánh giá từng site độc lập — clone 1 site/lần để không early-return đa site
  for (const site of input.sites) {
    const one = evaluateSecondaryBsiForBlood({
      blood: input.blood,
      sites: [site],
      lungTissueOrPleuralExempt: input.lungTissueOrPleuralExempt,
    });
    if (one.outcome === "SECONDARY" && one.scenario && one.siteMajorType) {
      const doe =
        (site.doe && site.doe.slice(0, 10)) ||
        (site.sbapDates.length > 0
          ? addDays(site.sbapDates[site.sbapDates.length - 1]!, -13)
          : input.blood.date.slice(0, 10));
      hits.push({
        eventId: site.id,
        majorType: one.siteMajorType,
        scenario: one.scenario,
        doe,
        reason: one.reason,
      });
    } else if (one.outcome === "EXCLUDED_PRIMARY" && !excludedReason) {
      excludedReason = one.reason;
    }
  }

  if (hits.length > 0) {
    return { outcome: "SECONDARY", hits };
  }
  if (excludedReason) {
    return { outcome: "EXCLUDED_PRIMARY", hits: [], excludedReason };
  }
  return { outcome: "PRIMARY_CANDIDATE", hits: [] };
}

/** Format kết luận Secondary từ nhiều site (UI) — phủ quyết, không mở khung BSI. */
export function formatSecondaryBsiKetLuan(sites: SecondarySiteHit[]): string {
  if (!sites.length) return "NKH thứ phát";
  const labels = sites
    .map((s) => `sự kiện ngày ${dayLabel(s.doe)} (${s.majorType})`)
    .join("; ");
  return sites.length > 1
    ? `NKH thứ phát thuộc ${labels}`
    : `NKH thứ phát thuộc ${labels}`;
}
