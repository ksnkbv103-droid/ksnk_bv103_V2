/**
 * BA-centric timeline + criteria gate (pure) — ba-centric-timeline.md / CDC order.
 */

import {
  clinicalIwp,
  clinicalRitEnd,
  clinicalSbapWindow,
  poaOrHai,
  ssiSbapWindow,
  vaeEventPeriod,
  type NkbvTimelineSyndrome,
} from "./nkbv-shared-timeline";
import {
  evaluateSecondaryBsi,
  organismsMatchForSecondary,
  type SecondaryBsiPrimarySite,
} from "./nkbv-shared-secondary-bsi";
import { resolveNkbvMajorType, type NkbvMajorType } from "./nkbv-major-type";
import {
  effectiveSpecimenDisplay,
  effectiveSpecimenForAlgorithm,
} from "./nkbv-specimen-canonical";
import type { NkbvChecklistTypeCode } from "./nkbv-loai-labels";
import {
  buildCriteriaMatrixState,
  summarizeCriteriaGaps,
  type CriteriaRowState,
  type NkbvCriteriaKey,
} from "./nkbv-criteria-matrix";

export type BaTimelineSource = "LIS" | "MANUAL" | "DEVICE" | "EVENT";

export type BaTimelineMilestone = {
  id: string;
  source: BaTimelineSource;
  date: string;
  kind: string;
  title: string;
  detail: string | null;
  loai_benh_pham?: string | null;
  tac_nhan?: string | null;
  so_luong?: string | null;
  is_mdro?: boolean;
  /** Khóa tiêu chuẩn CDC khi mốc là yếu tố chẩn đoán (XQ, sốt…). */
  criteriaKey?: NkbvCriteriaKey | null;
  majorType: NkbvMajorType;
  gate: NkbvChecklistTypeCode | null;
};

export type CriteriaGatePreview = {
  gate: NkbvChecklistTypeCode;
  majorType: NkbvMajorType;
  indexDate: string;
  windowLabel: string;
  windowStart: string;
  windowEnd: string;
  gaps: string[];
  enoughToOpenForm: boolean;
  bloodRoutingHint: "CHECK_SBAP_FIRST" | "PRIMARY_BSI" | null;
  /** @deprecated dùng criteriaRows */
  checklistHints: string[];
  /** Toàn bộ tiêu chuẩn CDC tại thời điểm Index — đánh dấu PRESENT từ timeline ∈ cửa sổ. */
  criteriaRows: CriteriaRowState[];
};

export type PostEventAdminPreview = {
  doe: string;
  poaHai: "POA" | "HAI";
  hospitalDay: number;
  ritEnd: string;
  sbapStart: string;
  sbapEnd: string;
  majorType: NkbvMajorType;
  secondarySuggestions: Array<{
    bloodMilestoneId: string;
    bloodDate: string;
    organism: string;
    isSecondary: boolean;
    reason: string;
  }>;
  deviceHints: string[];
};

export function mapSpecimenToGate(input: {
  loai_benh_pham?: string | null;
  milestone_kind?: string | null;
  hasActiveVent?: boolean;
}): NkbvChecklistTypeCode | null {
  const major = resolveNkbvMajorType({
    loai_benh_pham: input.loai_benh_pham,
    milestone_kind: input.milestone_kind,
  });
  if (major === "UTI") return "UTI";
  if (major === "SSI") return "SSI";
  if (major === "BSI") return "BSI";
  if (major === "VAE") return "VAE";
  if (major === "PNEU") {
    if (input.hasActiveVent) return "VAE";
    return "HAP";
  }
  return null;
}

export function buildCriteriaGatePreview(input: {
  milestone: BaTimelineMilestone;
  /** Toàn bộ timeline BA — để đánh dấu tiêu chuẩn đã có trong IWP. */
  allMilestones: BaTimelineMilestone[];
  admissionDate: string | null;
  hasActiveVent: boolean;
  linkedCase?: { doe: string | null; poa_hai: string | null; trang_thai_ma: string | null } | null;
  siteEventsForSbap: Array<{
    id: string;
    doe: string;
    /** Index site (XN/CĐHA); thiếu → dùng doe (SBAP 17d). */
    indexDate?: string;
    majorType: NkbvMajorType;
    organism?: string | null;
  }>;
}): CriteriaGatePreview | null {
  // Triệu chứng/XQ đơn lẻ: cổng = hội chứng của mốc, hoặc suy từ criteriaKey
  let gate =
    input.milestone.gate ||
    mapSpecimenToGate({
      loai_benh_pham: input.milestone.loai_benh_pham,
      milestone_kind: input.milestone.kind,
      hasActiveVent: input.hasActiveVent,
    });

  if ((!gate || gate === "LOAI_TRU") && input.milestone.criteriaKey) {
    const ck = input.milestone.criteriaKey;
    if (ck === "imaging_chest" || ck.startsWith("purulent") || ck === "rales" || ck === "cough" || ck === "dyspnea" || ck === "tachypnea" || ck === "worsening_gas" || ck === "altered_mental_ge70" || ck === "new_purulent_sputum" || ck === "increased_secretions") {
      gate = input.hasActiveVent ? "VAE" : "HAP";
      // Imaging + triệu chứng hô hấp → PNEU/HAP (VAE chỉ khi vent và không dùng XQ làm Index PNEU)
      if (ck === "imaging_chest" || ck !== "worsening_gas") {
        gate = input.hasActiveVent ? "HAP" : "HAP"; // PNEU path; VAE không dùng XQ
      }
    } else if (ck === "urine_culture" || ck === "suprapubic_pain" || ck === "cva_pain") {
      gate = "UTI";
    } else if (ck === "fever" || ck === "fever_or_wbc") {
      // Sốt đơn: giữ ngữ cảnh — ưu tiên UTI nếu có cấy NT gần đó, else PNEU
      const nearUrine = input.allMilestones.some(
        (m) => m.majorType === "UTI" && Math.abs(daysBetweenLocal(m.date, input.milestone.date)) <= 3,
      );
      gate = nearUrine ? "UTI" : input.hasActiveVent ? "HAP" : "HAP";
    } else if (ck === "procedure_surgery" || ck === "purulent_drainage" || ck === "wound_opened" || ck === "abscess_imaging" || ck === "wound_culture") {
      gate = "SSI";
    } else if (ck === "blood_culture") {
      gate = "BSI";
    }
  }

  // Index LIS / XQ / mổ luôn mở được khung điều tra — fallback loại nếu chưa map bệnh phẩm
  if (!gate || gate === "LOAI_TRU") {
    if (input.milestone.source === "LIS") gate = "BSI";
    else if (
      input.milestone.kind === "IMAGING_CHEST" ||
      input.milestone.criteriaKey === "imaging_chest"
    ) {
      gate = "HAP";
    } else if (
      input.milestone.kind === "PROCEDURE_SURGERY" ||
      input.milestone.criteriaKey === "procedure_surgery"
    ) {
      gate = "SSI";
    } else {
      return null;
    }
  }

  const indexDate = input.milestone.date.slice(0, 10);
  const majorType =
    input.milestone.majorType !== "OTHER"
      ? input.milestone.majorType
      : gate === "UTI"
        ? "UTI"
        : gate === "BSI"
          ? "BSI"
          : gate === "SSI"
            ? "SSI"
            : gate === "VAE"
              ? "VAE"
              : "PNEU";

  let windowLabel = "IWP ±3 (7 ngày) quanh Index";
  let windowStart = "";
  let windowEnd = "";
  let syndrome: NkbvTimelineSyndrome = "OTHER";

  if (gate === "SSI") {
    windowLabel = "Surveillance Period 30/90 ngày từ ngày mổ (pilot: ±3 quanh mốc đang chọn)";
    const iwp = clinicalIwp(indexDate);
    windowStart = iwp.start;
    windowEnd = iwp.end;
    syndrome = "SSI";
  } else if (gate === "VAE") {
    const ep = vaeEventPeriod(indexDate);
    windowLabel = "VAE Event Period 14 ngày";
    windowStart = ep.start;
    windowEnd = ep.end;
    syndrome = "VAE";
  } else {
    const iwp = clinicalIwp(indexDate);
    windowStart = iwp.start;
    windowEnd = iwp.end;
    syndrome = gate === "UTI" ? "UTI" : gate === "BSI" ? "BSI" : "PNEU";
  }

  const criteriaRows = buildCriteriaMatrixState({
    gate,
    windowStart,
    windowEnd,
    indexMilestoneId: input.milestone.id,
    milestones: input.allMilestones,
  });

  const gaps = summarizeCriteriaGaps(criteriaRows);
  const checklistHints = criteriaRows.map((r) => r.label);

  if (gate === "UTI" && /candida|yeast|nấm men/i.test(String(input.milestone.tac_nhan || ""))) {
    gaps.unshift("Tác nhân nấm — không dùng làm pathogen UTI (SSOT §7)");
  }

  let bloodRoutingHint: CriteriaGatePreview["bloodRoutingHint"] = null;
  if (gate === "BSI") {
    const inSbap = input.siteEventsForSbap.some((e) => {
      if (e.majorType === "BSI") return false;
      const w =
        e.majorType === "SSI"
          ? ssiSbapWindow(e.doe)
          : clinicalSbapWindow(e.indexDate || e.doe, e.doe);
      return indexDate >= w.start && indexDate <= w.end;
    });
    bloodRoutingHint = inSbap ? "CHECK_SBAP_FIRST" : "PRIMARY_BSI";
    if (inSbap) {
      gaps.push("Mốc máu nằm trong SBAP sự kiện site — xét Secondary BSI trước, không mở CLABSI ngay");
    }
  }

  void syndrome;
  const blocked = gaps.some((g) => /nấm|không dùng làm pathogen UTI/i.test(g));

  return {
    gate,
    majorType,
    indexDate,
    windowLabel,
    windowStart,
    windowEnd,
    gaps,
    enoughToOpenForm: !blocked,
    bloodRoutingHint,
    checklistHints,
    criteriaRows,
  };
}

function daysBetweenLocal(a: string, b: string): number {
  const t1 = new Date(a.slice(0, 10)).getTime();
  const t2 = new Date(b.slice(0, 10)).getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

export function buildPostEventAdminPreview(input: {
  caseRow: {
    id: string;
    loai_ma: string | null;
    doe: string | null;
    ngay_phat_hien: string | null;
    tac_nhan?: string | null;
  };
  admissionDate: string | null;
  bloodMilestones: BaTimelineMilestone[];
  devices: Array<{ device_type: string; insertion_date: string; removal_date: string | null }>;
}): PostEventAdminPreview | null {
  const doe = (input.caseRow.doe || input.caseRow.ngay_phat_hien || "").slice(0, 10);
  if (!doe) return null;
  const majorType = resolveNkbvMajorType({ loai_ma: input.caseRow.loai_ma });
  const adm = input.admissionDate ? String(input.admissionDate).slice(0, 10) : "";
  const poa = adm ? poaOrHai(adm, doe) : { dayOfHospitalization: 0, haiStatus: "HAI" as const };
  const ritEnd = clinicalRitEnd(doe);
  const indexForSbap = (input.caseRow.ngay_phat_hien || doe).slice(0, 10);
  const sbap =
    majorType === "SSI" ? ssiSbapWindow(doe) : clinicalSbapWindow(indexForSbap, doe);

  const primarySite: SecondaryBsiPrimarySite =
    majorType === "UTI"
      ? "UTI"
      : majorType === "PNEU"
        ? "PNEU"
        : majorType === "SSI"
          ? "SSI"
          : majorType === "VAE"
            ? "PVAP"
            : "OTHER";

  const secondarySuggestions = input.bloodMilestones
    .filter((b) => b.date >= sbap.start && b.date <= sbap.end)
    .map((b) => {
      const match = organismsMatchForSecondary(String(b.tac_nhan || ""), input.caseRow.tac_nhan);
      const r = evaluateSecondaryBsi({
        primarySite,
        bloodCollectionDate: b.date,
        sbapStart: sbap.start,
        sbapEnd: sbap.end,
        bloodOrganism: String(b.tac_nhan || ""),
        primaryOrganism: input.caseRow.tac_nhan,
        organismsMatch: match,
      });
      return {
        bloodMilestoneId: b.id,
        bloodDate: b.date,
        organism: String(b.tac_nhan || "—"),
        isSecondary: r.isSecondary,
        reason: r.reason,
      };
    });

  const deviceHints: string[] = [];
  for (const d of input.devices) {
    const placed = String(d.insertion_date).slice(0, 10);
    const removed = d.removal_date ? String(d.removal_date).slice(0, 10) : null;
    const presentAtDoe = placed <= doe && (!removed || removed >= doe || removed === addDay(doe, -1));
    if (presentAtDoe) {
      deviceHints.push(
        `${d.device_type}: đặt ${placed}${removed ? ` → rút ${removed}` : " (đang lưu)"} — kiểm tra >2 ngày lịch + hiện diện DOE/DOE−1`,
      );
    }
  }

  return {
    doe,
    poaHai: poa.haiStatus,
    hospitalDay: poa.dayOfHospitalization,
    ritEnd,
    sbapStart: sbap.start,
    sbapEnd: sbap.end,
    majorType,
    secondarySuggestions,
    deviceHints,
  };
}

function addDay(date: string, n: number): string {
  const d = new Date(`${date.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mergeBaTimelineMilestones(input: {
  lis: Array<{
    id: string;
    ngay_lay_mau: string | null;
    loai_benh_pham: string | null;
    /** Mã chuẩn CDC — ưu tiên cho major / RIT / hội chứng. */
    loai_benh_pham_chuan?: string | null;
    tac_nhan: string | null;
    so_luong?: string | null;
    is_mdro?: boolean;
    ma_xet_nghiem?: string | null;
    /** Chỉ đưa lên timeline khi dương tính (hub đã lọc; vẫn chặn phòng thủ). */
    ket_qua_phan_loai?: string | null;
    ket_qua_duong_tinh?: boolean | null;
  }>;
  manual: Array<{
    id: string;
    milestone_kind: string;
    milestone_date: string;
    title: string;
    detail: string | null;
    specimen_hint: string | null;
    criteria_key?: string | null;
  }>;
  devices: Array<{
    id: string;
    device_type: string;
    insertion_date: string;
    removal_date: string | null;
  }>;
  hasActiveVent: boolean;
}): BaTimelineMilestone[] {
  const out: BaTimelineMilestone[] = [];

  for (const r of input.lis) {
    const date = r.ngay_lay_mau ? String(r.ngay_lay_mau).slice(0, 10) : "";
    if (!date) continue;
    const phanLoai = String(r.ket_qua_phan_loai || "").toUpperCase();
    const isPos =
      r.ket_qua_duong_tinh === true ||
      phanLoai === "DUONG_TINH" ||
      (r.ket_qua_duong_tinh == null && !phanLoai && Boolean(r.tac_nhan));
    if (!isPos) continue;
    const specimenAlgo = effectiveSpecimenForAlgorithm({
      loai_benh_pham_chuan: r.loai_benh_pham_chuan,
      loai_benh_pham: r.loai_benh_pham,
    });
    const specimenDisplay = effectiveSpecimenDisplay({
      loai_benh_pham_chuan: r.loai_benh_pham_chuan,
      loai_benh_pham: r.loai_benh_pham,
    });
    const majorType = resolveNkbvMajorType({
      loai_benh_pham: specimenAlgo,
      loai_benh_pham_chuan: r.loai_benh_pham_chuan,
    });
    const soLuong = r.so_luong ? String(r.so_luong).trim() : "";
    out.push({
      id: `lis:${r.id}`,
      source: "LIS",
      date,
      kind: "LIS",
      title: specimenDisplay || "Vi sinh",
      detail: [
        r.tac_nhan,
        soLuong ? `SL ${soLuong}` : null,
        r.ma_xet_nghiem ? `XN ${r.ma_xet_nghiem}` : null,
        r.is_mdro ? "MDRO" : null,
        r.loai_benh_pham_chuan && r.loai_benh_pham && r.loai_benh_pham !== specimenDisplay
          ? `LIS: ${r.loai_benh_pham}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      loai_benh_pham: specimenAlgo || r.loai_benh_pham,
      tac_nhan: r.tac_nhan,
      so_luong: soLuong || null,
      is_mdro: Boolean(r.is_mdro),
      majorType,
      gate: mapSpecimenToGate({
        loai_benh_pham: specimenAlgo || r.loai_benh_pham,
        hasActiveVent: input.hasActiveVent,
      }),
    });
  }

  for (const m of input.manual) {
    const date = String(m.milestone_date).slice(0, 10);
    const criteriaKey = (m.criteria_key || null) as NkbvCriteriaKey | null;
    const majorType = resolveNkbvMajorType({
      milestone_kind: m.milestone_kind,
      loai_benh_pham: m.specimen_hint || criteriaKey,
    });
    let gate = mapSpecimenToGate({
      loai_benh_pham: m.specimen_hint,
      milestone_kind: m.milestone_kind,
      hasActiveVent: input.hasActiveVent,
    });
    if (!gate && criteriaKey === "imaging_chest") gate = "HAP";
    if (!gate && (criteriaKey === "suprapubic_pain" || criteriaKey === "cva_pain" || criteriaKey === "urine_culture")) {
      gate = "UTI";
    }
    if (!gate && (criteriaKey === "procedure_surgery" || criteriaKey === "purulent_drainage")) gate = "SSI";
    out.push({
      id: `manual:${m.id}`,
      source: "MANUAL",
      date,
      kind: m.milestone_kind,
      title: m.title,
      detail: m.detail,
      loai_benh_pham: m.specimen_hint,
      criteriaKey,
      majorType: majorType === "OTHER" && criteriaKey === "imaging_chest" ? "PNEU" : majorType,
      gate,
    });
  }

  for (const d of input.devices) {
    const placed = String(d.insertion_date).slice(0, 10);
    out.push({
      id: `dev-in:${d.id}`,
      source: "DEVICE",
      date: placed,
      kind: `DEVICE_${d.device_type}`,
      title: `Đặt ${d.device_type}`,
      detail: null,
      majorType: "OTHER",
      gate: null,
    });
    if (d.removal_date) {
      out.push({
        id: `dev-out:${d.id}`,
        source: "DEVICE",
        date: String(d.removal_date).slice(0, 10),
        kind: `DEVICE_${d.device_type}_REMOVE`,
        title: `Rút ${d.device_type}`,
        detail: null,
        majorType: "OTHER",
        gate: null,
      });
    }
  }

  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id)));
  return out;
}
