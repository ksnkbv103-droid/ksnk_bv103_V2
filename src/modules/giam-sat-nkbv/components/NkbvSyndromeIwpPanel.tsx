"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  clinicalCatalogForNghiNgo,
  computeBaGridSession,
  INFANT_LE1_CRITERIA_KEYS,
  UTI_VOIDING_CRITERIA_KEYS,
  type BaGridActiveIndex,
  type BaGridCdhaCell,
  type BaGridColumn,
  type BaGridNghiNgo,
  type BaGridSymptomByDate,
  type BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import {
  evaluateSecondaryBsiForBlood,
  type PrimarySiteForSbap,
  type SecondaryBsiVerdict,
} from "../lib/nkbv-secondary-bsi-gate";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import type { SyndromePanelId } from "../lib/nkbv-specimen-syndrome";
import {
  ageYearsFromNgaySinh,
  buildUtiTimelineVerdict,
  isInfantLe1FromAge,
  stripUtiVoidingFromLamSang,
} from "../lib/nkbv-uti-timeline-verdict";
import {
  buildPneuTimelineVerdict,
  PNEU_AMS_CRITERIA_KEY,
  shouldShowPneuAmsInCatalog,
} from "../lib/nkbv-pneu-timeline-verdict";
import { buildBsiTimelineVerdict } from "../lib/nkbv-bsi-timeline-verdict";
import { PNEU_IC_ATOM_ROWS } from "../lib/nkbv-pneu-lab-tier";
import {
  hydrateLamSangDraftFromBa,
  mergeLamSangByDate,
} from "../lib/nkbv-ba-lam-sang-merge";
import { buildSbapRitChips, isBloodSpecimen, resolveIndexSpecimenForChips } from "../lib/nkbv-sbap-rit-chips";
import {
  collectRitPathogens,
  formatBaKetLuanSummary,
  scanIndexPriorRitAlert,
} from "../lib/nkbv-ket-luan-smart";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import {
  priorEventsToSecondarySites,
  resolveDoeBelongsPriorEvent,
  type ActiveSessionRitContext,
  type OpenSiteSessionForSbap,
} from "../lib/nkbv-index-event-disposition";
import { baCellToneClass } from "../lib/nkbv-ba-day-row-tone";
import { bareViSinhIdFromMilestoneId } from "../lib/nkbv-vi-sinh-analysis-status";
import type { ViSinhAnalysisDispositionRow } from "../lib/nkbv-vi-sinh-analysis-status";
import type { BaSampleConclusion } from "../lib/nkbv-ba-sample-conclusions";
import {
  BA_DAY_COL_W_ANALYSIS,
  BA_DAY_COL_W_NARROW,
  type BaDayGridColumnDef,
} from "./NkbvBaDayGrid";
import NkbvBaConcludeCell from "./NkbvBaConcludeCell";

type Device = {
  id: string;
  device_type: string;
  insertion_date: string;
  removal_date: string | null;
};

type PriorEvent = {
  id: string;
  ngay_phat_hien: string | null;
  loai_ma?: string | null;
  loai_ten?: string | null;
  vi_tri_nhiem_khuan?: string | null;
  index_vi_sinh_id?: string | null;
  tac_nhan_vi_khuan?: string | null;
  attributed_vi_sinh_ids?: string[] | null;
};

type Props = {
  panel: "PNEU" | "UTI" | "BSI";
  maBenhAn?: string;
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  ngaySinh?: string | null;
  /** Trục cột ngày SSOT từ parent — không tự build. */
  columns: BaGridColumn[];
  index: BaGridActiveIndex;
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  devices?: Device[];
  /** Ngày can thiệp từ timeline BA (SSOT) — không dùng sổ đăng ký. */
  baCanThiepDates?: string[];
  defaultKhoa?: string | null;
  allowedEdit: boolean;
  draft: BaAnalysisSessionDraft;
  /** LS đã lưu trên bảng chung BA — merge với draft phiên. */
  baLamSangByDate?: BaGridSymptomByDate;
  /** Phiếu đã có — cảnh báo RIT khi Index nằm trong khung sự kiện trước. */
  priorEvents?: PriorEvent[];
  /** Phiên site đủ TC đang PT — rà SBAP trước Primary trên cột Kết luận. */
  openSiteSessions?: OpenSiteSessionForSbap[];
  onDraftChange: (patch: Partial<BaAnalysisSessionDraft>) => void;
  /** Chốt Index không đủ TC — đóng phiên, không tô RIT. */
  onCloseInsufficient?: () => void;
  /** Đồng bộ tick LS panel → milestone bảng chung. */
  onPersistLamSang?: (
    date: string,
    criteriaKey: string,
    title: string,
    turnOn: boolean,
  ) => void;
  /** Disposition XN đã PT — cột Kết luận RIT/SBAP. */
  analysisDispositions?: ViSinhAnalysisDispositionRow[];
  /** Kết luận đã chốt theo mẫu (luôn hiện khi PT Index khác). */
  sampleConclusions?: BaSampleConclusion[];
  /** CDC | MANUAL — MANUAL: IP tự KL, không đổ smart/progressive. */
  analysisMode?: import("../lib/nkbv-ba-analysis-mode").BaAnalysisMode;
  onManualSampleConclude?: (payload: {
    indexId: string;
    kind: "XN" | "CDHA";
    date: string;
    disposition: BaSampleConclusion["disposition"];
    label: string;
  }) => void;
  onManualSampleClear?: (payload: { indexId: string }) => void;
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScrollSync?: () => void;
  onClose: () => void;
  onOpenPrimaryBsi?: (bloodId: string) => void;
  /** Phủ quyết: xác nhận máu Secondary trên cột Kết luận — không mở khung BSI. */
  onConfirmSecondaryBlood?: (payload: {
    sampleId: string;
    date: string;
    label: string;
  }) => void;
  colW?: number;
  labelW?: number;
  /**
   * Gộp cột phân tích vào bảng chung (cùng hàng ngày).
   * Khi có children → không vẽ DayGrid riêng bên dưới.
   */
  children?: (api: {
    analysisColumns: BaDayGridColumnDef[];
  }) => React.ReactNode;
};

export function deviceDatesForPanel(
  panel: "PNEU" | "UTI" | "BSI",
  devices: Device[],
  ngayRaVien?: string | null,
): string[] {
  const want =
    panel === "BSI"
      ? /CVC|CENTRAL|LINE/i
      : panel === "UTI"
        ? /FOLEY|URINARY|CATHETER/i
        : /VENT|THỞ MÁY|THO MAY/i;
  const dates: string[] = [];
  for (const d of devices) {
    if (!want.test(d.device_type)) continue;
    const start = d.insertion_date.slice(0, 10);
    const end = (d.removal_date || ngayRaVien || start).slice(0, 10);
    let c = start;
    let g = 0;
    while (c <= end && g < 90) {
      dates.push(c);
      const x = new Date(`${c}T12:00:00`);
      x.setDate(x.getDate() + 1);
      c = x.toISOString().slice(0, 10);
      g += 1;
    }
  }
  return dates;
}

export default function NkbvSyndromeIwpPanel({
  panel,
  maBenhAn = "",
  ngayVaoVien,
  ngayRaVien,
  ngaySinh,
  columns,
  index,
  xn,
  cdha,
  devices = [],
  baCanThiepDates = [],
  defaultKhoa,
  allowedEdit,
  draft,
  baLamSangByDate = {},
  priorEvents = [],
  openSiteSessions = [],
  onDraftChange,
  onCloseInsufficient,
  onPersistLamSang,
  analysisDispositions = [],
  sampleConclusions = [],
  analysisMode = "CDC",
  onManualSampleConclude,
  onManualSampleClear,
  scrollRef,
  onScrollSync,
  onClose,
  onOpenPrimaryBsi,
  onConfirmSecondaryBlood,
  colW = 100,
  labelW = 128,
  children,
}: Props) {
  void colW;
  void labelW;
  void scrollRef;
  void onScrollSync;
  void devices;
  void ngayRaVien;
  const nghiNgo = panel as BaGridNghiNgo;
  const ageYears = useMemo(
    () => ageYearsFromNgaySinh(ngaySinh, index.date),
    [ngaySinh, index.date],
  );
  const isInfant = isInfantLe1FromAge(ageYears);

  const showCdha = panel !== "UTI";

  const bloodXn = useMemo(() => xn.filter((x) => isBloodSpecimen(x.benh_pham)), [xn]);

  // Timeline BA = SSOT ngày can thiệp — không fallback draft (tránh phình ngày từ sổ/phiên cũ)
  const canThiepDates = baCanThiepDates;
  const devicePlacedFromBa = canThiepDates[0] || null;

  // Đồng bộ draft để seed phiếu; không dùng draft làm nguồn association
  useEffect(() => {
    const a = [...canThiepDates].sort().join("|");
    const b = [...(draft.canThiepDates || [])].sort().join("|");
    if (a !== b) onDraftChange({ canThiepDates: [...canThiepDates] });
  }, [canThiepDates, draft.canThiepDates, onDraftChange]);

  const indexXn = useMemo(() => {
    if (index.kind !== "XN") return null;
    return xn.find((x) => x.id === index.id) || null;
  }, [index, xn]);

  const indexCdha = useMemo(() => {
    if (index.kind !== "CDHA") return null;
    return cdha.find((c) => c.id === index.id) || null;
  }, [index, cdha]);

  /** Session grid trước — UTI verdict cần iwp/nsk. */
  const sessionBase = useMemo(() => {
    const merged = mergeLamSangByDate(baLamSangByDate, draft.lamSang);
    const lamSang = stripUtiVoidingFromLamSang(merged, canThiepDates);
    const tieuChuan: BaGridSymptomByDate = { ...lamSang };
    if (panel === "PNEU") {
      for (const id of draft.bloodCriterionIds) {
        const b = bloodXn.find((x) => x.id === id);
        if (!b) continue;
        const d = b.ngay.slice(0, 10);
        const cur = tieuChuan[d] || [];
        if (!cur.some((c) => c.key === `blood:${id}`)) {
          tieuChuan[d] = [
            ...cur,
            { key: `blood:${id}`, label: `Cấy máu (+) ${b.vi_khuan}`, id },
          ];
        }
      }
    }
    const khoaByDate: Record<string, string> = {};
    if (defaultKhoa) khoaByDate[index.date.slice(0, 10)] = defaultKhoa;
    return { lamSang, tieuChuan, khoaByDate };
  }, [
    baLamSangByDate,
    draft.lamSang,
    draft.bloodCriterionIds,
    bloodXn,
    panel,
    canThiepDates,
    defaultKhoa,
    index.date,
  ]);

  const provisionalIwp = useMemo(() => {
    const ix = index.date.slice(0, 10);
    const iwp = new Set<string>();
    for (let i = -3; i <= 3; i += 1) {
      const d = new Date(`${ix}T12:00:00`);
      d.setDate(d.getDate() + i);
      iwp.add(d.toISOString().slice(0, 10));
    }
    return iwp;
  }, [index.date]);

  /** DOE tạm từ LS ∈ IWP (+ Index) — trước verdict gắn dụng cụ. */
  const doeProbeNsk = useMemo(() => {
    const probe = computeBaGridSession({
      ngayVaoVien,
      ngayRaVien,
      xn,
      cdha,
      activeIndex: index,
      nghiNgo,
      symptomDates: {},
      tieuChuanByDate: sessionBase.tieuChuan,
      trieuChungLamSangByDate: sessionBase.lamSang,
      khoaByDate: sessionBase.khoaByDate,
      canThiepDates,
      criteriaMetPreview: false,
    });
    return probe.nsk || index.date.slice(0, 10);
  }, [
    ngayVaoVien,
    ngayRaVien,
    xn,
    cdha,
    index,
    nghiNgo,
    sessionBase,
    canThiepDates,
  ]);

  const utiVerdictPreview = useMemo(() => {
    if (panel !== "UTI") return null;
    return buildUtiTimelineVerdict({
      indexXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: provisionalIwp,
      nsk: doeProbeNsk,
      bloodXn,
      abutiBloodIds: draft.bloodCriterionIds,
      isInfantLe1: isInfant,
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
    });
  }, [
    panel,
    indexXn,
    sessionBase.lamSang,
    canThiepDates,
    provisionalIwp,
    doeProbeNsk,
    bloodXn,
    draft.bloodCriterionIds,
    isInfant,
    ngayVaoVien,
    ngayRaVien,
  ]);

  const pneuVerdictPreview = useMemo(() => {
    if (panel !== "PNEU") return null;
    return buildPneuTimelineVerdict({
      indexKind: index.kind,
      indexXn,
      indexCdha,
      cdha,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: provisionalIwp,
      nsk: doeProbeNsk,
      bloodCriterionIds: draft.bloodCriterionIds,
      bloodXn,
      patientAge: ageYears,
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      hasCardiopulmonaryDisease: Boolean(draft.hasCardiopulmonaryDisease),
      pneuIcAtoms: draft.pneuIcAtoms,
    });
  }, [
    panel,
    index.kind,
    indexXn,
    indexCdha,
    cdha,
    sessionBase.lamSang,
    canThiepDates,
    provisionalIwp,
    doeProbeNsk,
    draft.bloodCriterionIds,
    draft.hasCardiopulmonaryDisease,
    draft.pneuIcAtoms,
    bloodXn,
    ageYears,
    ngayVaoVien,
    ngayRaVien,
  ]);

  const bsiVerdictPreview = useMemo(() => {
    if (panel !== "BSI") return null;
    return buildBsiTimelineVerdict({
      indexXn,
      bloodXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: provisionalIwp,
      nsk: doeProbeNsk,
      isInfantLe1: isInfant,
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      localizedSite: draft.bsiLocalizedSite,
    });
  }, [
    panel,
    indexXn,
    bloodXn,
    sessionBase.lamSang,
    canThiepDates,
    provisionalIwp,
    doeProbeNsk,
    isInfant,
    draft.bsiLocalizedSite,
    ngayVaoVien,
    ngayRaVien,
  ]);

  const session = useMemo(() => {
    const criteriaMet =
      panel === "UTI"
        ? Boolean(utiVerdictPreview?.criteriaMet)
        : panel === "PNEU"
          ? Boolean(pneuVerdictPreview?.criteriaMet)
          : panel === "BSI"
            ? Boolean(bsiVerdictPreview?.criteriaMet)
            : false;
    // Verdict label chỉ đổ vào kết luận khi chưa đủ TC (tiến trình); đủ TC → summary đầy đủ HAI/NSK
    const verdictLabel =
      panel === "UTI"
        ? utiVerdictPreview?.ketLuanLabel
        : panel === "PNEU"
          ? pneuVerdictPreview?.ketLuanLabel
          : panel === "BSI"
            ? bsiVerdictPreview?.ketLuanLabel
            : null;
    const ketOverride =
      draft.ketLuan?.trim() ||
      (!criteriaMet ? verdictLabel || null : null);
    return computeBaGridSession({
      ngayVaoVien,
      ngayRaVien,
      xn,
      cdha,
      activeIndex: index,
      nghiNgo,
      symptomDates: {},
      tieuChuanByDate: sessionBase.tieuChuan,
      trieuChungLamSangByDate: sessionBase.lamSang,
      khoaByDate: sessionBase.khoaByDate,
      canThiepDates,
      criteriaMetPreview: criteriaMet,
      ketLuanOverride: ketOverride,
    });
  }, [
    panel,
    utiVerdictPreview,
    pneuVerdictPreview,
    bsiVerdictPreview,
    draft.ketLuan,
    ngayVaoVien,
    ngayRaVien,
    xn,
    cdha,
    index,
    nghiNgo,
    sessionBase,
    canThiepDates,
  ]);

  const utiVerdict = useMemo(() => {
    if (panel !== "UTI") return null;
    return buildUtiTimelineVerdict({
      indexXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: session.iwpDates,
      nsk: session.nsk,
      bloodXn,
      abutiBloodIds: draft.bloodCriterionIds,
      isInfantLe1: isInfant,
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
    });
  }, [
    panel,
    indexXn,
    sessionBase.lamSang,
    canThiepDates,
    session.iwpDates,
    session.nsk,
    bloodXn,
    draft.bloodCriterionIds,
    isInfant,
    ngayVaoVien,
    ngayRaVien,
  ]);

  const pneuVerdict = useMemo(() => {
    if (panel !== "PNEU") return null;
    return buildPneuTimelineVerdict({
      indexKind: index.kind,
      indexXn,
      indexCdha,
      cdha,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: session.iwpDates,
      nsk: session.nsk,
      bloodCriterionIds: draft.bloodCriterionIds,
      bloodXn,
      patientAge: ageYears,
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      hasCardiopulmonaryDisease: Boolean(draft.hasCardiopulmonaryDisease),
      pneuIcAtoms: draft.pneuIcAtoms,
    });
  }, [
    panel,
    index.kind,
    indexXn,
    indexCdha,
    cdha,
    sessionBase.lamSang,
    canThiepDates,
    session.iwpDates,
    session.nsk,
    draft.bloodCriterionIds,
    draft.hasCardiopulmonaryDisease,
    draft.pneuIcAtoms,
    bloodXn,
    ageYears,
    ngayVaoVien,
    ngayRaVien,
  ]);

  const bsiVerdict = useMemo(() => {
    if (panel !== "BSI") return null;
    return buildBsiTimelineVerdict({
      indexXn,
      bloodXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: session.iwpDates,
      nsk: session.nsk,
      isInfantLe1: isInfant,
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      localizedSite: draft.bsiLocalizedSite,
    });
  }, [
    panel,
    indexXn,
    bloodXn,
    sessionBase.lamSang,
    canThiepDates,
    session.iwpDates,
    session.nsk,
    isInfant,
    draft.bsiLocalizedSite,
    ngayVaoVien,
    ngayRaVien,
  ]);

  const bloodInIwp = useMemo(() => {
    return bloodXn.filter((b) => session.iwpDates.has(b.ngay.slice(0, 10)));
  }, [bloodXn, session.iwpDates]);

  const bloodInSbap = useMemo(() => {
    return bloodXn.filter((b) => session.sbapDates.has(b.ngay.slice(0, 10)));
  }, [bloodXn, session.sbapDates]);

  /** Chip dữ liệu thật trên hàng SBAP (cấy máu) / RIT (cùng bệnh phẩm + CĐHA) */
  const ritPrimaryOrganisms = useMemo(() => {
    const nsk = (session.nsk || index.date).slice(0, 10);
    const major = resolveNkbvMajorType({ loai_ma: panel });
    return collectRitPathogens({
      nsk,
      majorType: major,
      xn,
      excludeBlood: panel !== "BSI",
    });
  }, [session.nsk, index.date, panel, xn]);

  const indexSpecimenResolved = useMemo(
    () =>
      resolveIndexSpecimenForChips({
        indexXnBenhPham: indexXn?.benh_pham,
        panel,
      }),
    [indexXn?.benh_pham, panel],
  );

  const sbapRitChips = useMemo(
    () =>
      buildSbapRitChips({
        xn,
        cdha: panel === "PNEU" ? cdha : [],
        indexId: index.id,
        indexSpecimen: indexSpecimenResolved,
        ritDates: session.ritDates,
        sbapDates: session.sbapDates,
        primaryOrganisms: ritPrimaryOrganisms,
      }),
    [
      xn,
      cdha,
      panel,
      index.id,
      indexSpecimenResolved,
      session.ritDates,
      session.sbapDates,
      ritPrimaryOrganisms,
    ],
  );

  /** XN/CĐHA ∈ RIT phiên này → cột Kết luận «Thuộc SK đủ TC». */
  const activeSessionRit = useMemo((): ActiveSessionRitContext => {
    const ritXnIds = new Set<string>();
    for (const list of Object.values(sbapRitChips.ritByDate)) {
      for (const x of list) ritXnIds.add(x.id);
    }
    const ritCdhaIds = new Set<string>();
    for (const list of Object.values(sbapRitChips.ritCdhaByDate)) {
      for (const c of list) ritCdhaIds.add(c.id);
    }
    const loaiLabel =
      panel === "UTI"
        ? utiVerdict?.result.classification || "UTI"
        : panel === "PNEU"
          ? pneuVerdict?.result.classification || "PNEU"
          : panel === "BSI"
            ? bsiVerdict?.result.classification || "BSI"
            : panel;
    const eventEstablished =
      panel === "UTI"
        ? Boolean(utiVerdict?.criteriaMet)
        : panel === "PNEU"
          ? Boolean(pneuVerdict?.criteriaMet)
          : panel === "BSI"
            ? Boolean(bsiVerdict?.criteriaMet)
            : false;
    return {
      indexId: index.id,
      doe: (session.nsk || index.date).slice(0, 10),
      loaiLabel,
      majorType: panel,
      ritXnIds,
      ritCdhaIds,
      eventEstablished,
    };
  }, [
    sbapRitChips.ritByDate,
    sbapRitChips.ritCdhaByDate,
    panel,
    session.nsk,
    index.id,
    index.date,
    utiVerdict?.criteriaMet,
    utiVerdict?.result.classification,
    pneuVerdict?.criteriaMet,
    pneuVerdict?.result.classification,
    bsiVerdict?.criteriaMet,
    bsiVerdict?.result.classification,
  ]);

  /** Đồng bộ draft.eventEstablished + nsk cho footer / RIT phiên khác. */
  useEffect(() => {
    const established = Boolean(activeSessionRit.eventEstablished);
    const nsk = session.nsk || null;
    const patch: Partial<BaAnalysisSessionDraft> = {};
    if (Boolean(draft.eventEstablished) !== established) {
      patch.eventEstablished = established;
    }
    if ((draft.nsk || null) !== nsk) patch.nsk = nsk;
    if (Object.keys(patch).length) onDraftChange(patch);
  }, [
    activeSessionRit.eventEstablished,
    session.nsk,
    draft.eventEstablished,
    draft.nsk,
    onDraftChange,
  ]);

  const iwpDatesKey = useMemo(
    () => [...session.iwpDates].sort().join("|"),
    [session.iwpDates],
  );

  /**
   * LS đã ghi trên timeline ∈ IWP (provisional hoặc đã có DOE) → hydrate vào draft phiên.
   * Không loại trừ triệu chứng cũ khỏi phân tích sự kiện Index mới.
   */
  useEffect(() => {
    const baForHydrate =
      panel === "UTI"
        ? stripUtiVoidingFromLamSang(baLamSangByDate, canThiepDates)
        : baLamSangByDate;
    const { next, changed } = hydrateLamSangDraftFromBa({
      ba: baForHydrate,
      draft: draft.lamSang,
      indexDate: index.date,
      iwpDates: session.iwpDates.size > 0 ? session.iwpDates : null,
    });
    if (!changed) return;
    onDraftChange({
      lamSang:
        panel === "UTI" ? stripUtiVoidingFromLamSang(next, canThiepDates) : next,
    });
    // iwpDatesKey neo cửa sổ; draft.lamSang để phát hiện thiếu key từ BA
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tránh loop Set mới mỗi render
  }, [baLamSangByDate, index.date, index.id, iwpDatesKey, panel, canThiepDates, draft.lamSang, onDraftChange]);

  const sbsiVerdicts: SecondaryBsiVerdict[] = useMemo(() => {
    const priorSites = priorEventsToSecondarySites(priorEvents);
    const sbap = [...session.sbapDates];
    const iwp = [...session.iwpDates];
    const criteriaMet =
      panel === "UTI"
        ? Boolean(utiVerdict?.criteriaMet)
        : panel === "PNEU"
          ? Boolean(pneuVerdict?.criteriaMet)
          : panel === "BSI"
            ? Boolean(bsiVerdict?.criteriaMet)
            : false;

    const currentSite: PrimarySiteForSbap | null =
      panel === "BSI"
        ? null
        : {
            id: `site-${panel}`,
            majorType: panel,
            criteriaMet,
            sbapDates: sbap,
            criteriaWindowDates: iwp,
            siteOrganism: ritPrimaryOrganisms[0] || null,
            siteOrganisms: ritPrimaryOrganisms,
            bloodCriterionIds: draft.bloodCriterionIds,
            doe: session.nsk,
          };

    // BSI panel: chỉ prior sites; site panel: prior + site hiện tại (đa site)
    const sites: PrimarySiteForSbap[] = [
      ...priorSites.filter((s) => (currentSite ? s.id !== currentSite.id : true)),
      ...(currentSite ? [currentSite] : []),
    ];
    if (!sites.length) return [];

    return bloodXn.map((b) =>
      evaluateSecondaryBsiForBlood({
        blood: { id: b.id, date: b.ngay, organism: b.vi_khuan },
        sites,
      }),
    );
  }, [
    panel,
    priorEvents,
    session.sbapDates,
    session.iwpDates,
    session.nsk,
    bloodXn,
    ritPrimaryOrganisms,
    draft.bloodCriterionIds,
    utiVerdict,
    pneuVerdict,
    bsiVerdict,
  ]);

  const catalogForDate = (date: string) => {
    const base = clinicalCatalogForNghiNgo(nghiNgo);
    const foleyOn = canThiepDates.some((d) => d.slice(0, 10) === date);
    return base.filter((cat) => {
      if (panel === "UTI" && foleyOn && UTI_VOIDING_CRITERIA_KEYS.has(cat.criteriaKey)) {
        return false;
      }
      if (INFANT_LE1_CRITERIA_KEYS.has(cat.criteriaKey) && !isInfant) {
        return false;
      }
      if (
        panel === "PNEU" &&
        cat.criteriaKey === PNEU_AMS_CRITERIA_KEY &&
        !shouldShowPneuAmsInCatalog(ageYears)
      ) {
        return false;
      }
      return true;
    });
  };

  const toggleLamSang = (date: string, key: string, label: string) => {
    if (!allowedEdit) return;
    if (
      panel === "UTI" &&
      UTI_VOIDING_CRITERIA_KEYS.has(key) &&
      canThiepDates.some((d) => d.slice(0, 10) === date)
    ) {
      return;
    }
    const merged = mergeLamSangByDate(baLamSangByDate, draft.lamSang);
    const cur = merged[date] || [];
    const wasOn = cur.some((x) => x.key === key);
    const next: BaGridSymptomByDate = { ...draft.lamSang };
    if (wasOn) {
      next[date] = (draft.lamSang[date] || []).filter((x) => x.key !== key);
    } else {
      next[date] = [...(draft.lamSang[date] || []), { key, label }];
    }
    onDraftChange({
      lamSang:
        panel === "UTI" ? stripUtiVoidingFromLamSang(next, canThiepDates) : next,
    });
    onPersistLamSang?.(date, key, label, !wasOn);
  };

  const toggleBloodPnu2 = (id: string) => {
    if (!allowedEdit || panel !== "PNEU") return;
    const ids = draft.bloodCriterionIds.includes(id)
      ? draft.bloodCriterionIds.filter((x) => x !== id)
      : [...draft.bloodCriterionIds, id];
    onDraftChange({ bloodCriterionIds: ids });
  };

  const toggleAbutiBlood = (id: string) => {
    if (!allowedEdit || panel !== "UTI") return;
    const ids = draft.bloodCriterionIds.includes(id)
      ? draft.bloodCriterionIds.filter((x) => x !== id)
      : [...draft.bloodCriterionIds, id];
    onDraftChange({ bloodCriterionIds: ids });
  };

  const verdictClassification =
    panel === "UTI"
      ? utiVerdict?.result.classification
      : panel === "PNEU"
        ? pneuVerdict?.result.classification
        : panel === "BSI"
          ? bsiVerdict?.result.classification
          : undefined;
  const verdictSecondary =
    panel === "UTI"
      ? Boolean(utiVerdict?.result.is_secondary_bsi)
      : panel === "PNEU"
        ? Boolean(pneuVerdict?.result.is_secondary_bsi)
        : panel === "BSI"
          ? Boolean(bsiVerdict?.result.is_secondary_bsi) ||
            bsiVerdict?.result.classification === "SECONDARY_BSI"
          : false;
  const verdictKetLuanLabel =
    panel === "UTI"
      ? utiVerdict?.ketLuanLabel
      : panel === "PNEU"
        ? pneuVerdict?.ketLuanLabel
        : panel === "BSI"
          ? bsiVerdict?.ketLuanLabel
          : undefined;

  const criteriaMetForKetLuan =
    panel === "UTI"
      ? Boolean(utiVerdict?.criteriaMet)
      : panel === "PNEU"
        ? Boolean(pneuVerdict?.criteriaMet)
        : panel === "BSI"
          ? Boolean(bsiVerdict?.criteriaMet)
          : false;

  const ketLuanDisplay = useMemo(() => {
    // MANUAL: chỉ chữ IP gõ — không disposition / progressive / smart summary
    if (draft.analysisMode === "MANUAL" || analysisMode === "MANUAL") {
      return draft.ketLuan || "";
    }
    // Ưu tiên quy kết RIT / Secondary đã seed khi chọn mẫu
    const ed = draft.eventDisposition;
    if (
      ed &&
      (ed.kind === "BELONGS_PRIOR_EVENT" || ed.kind === "SECONDARY_BSI") &&
      (draft.ketLuan?.trim() || ed.label)
    ) {
      return draft.ketLuan?.trim() || ed.label;
    }
    if (draft.ketLuan?.trim()) return draft.ketLuan;
    // Chưa đủ TC: hiện nhãn verdict / summary tạm — không dựng HAI·PNU1·NSK giả
    if (!criteriaMetForKetLuan) {
      return (
        verdictKetLuanLabel ||
        session.ketLuan?.summary ||
        session.ketLuan?.suggestedSummary ||
        ""
      );
    }
    const kl = session.ketLuan;
    if (kl) {
      const loai = verdictClassification || kl.loai_nk;
      const secondaryMulti =
        Boolean(kl.is_secondary_bsi || verdictSecondary) ||
        sbsiVerdicts.some((v) => v.outcome === "SECONDARY");
      const secondaryLoai =
        secondaryMulti && panel === "BSI"
          ? (() => {
              const sites = sbsiVerdicts
                .filter((v) => v.outcome === "SECONDARY")
                .flatMap((v) =>
                  (v.allSites || []).map((s) => s.siteMajorType).filter(Boolean),
                );
              const uniq = [...new Set(sites)];
              return uniq.length
                ? `Secondary BSI · ${uniq.join("; ")}`
                : "Secondary BSI";
            })()
          : loai;
      return formatBaKetLuanSummary({
        haiPoa: kl.nkbv === "THIEU_TC" ? "Không đủ TC" : kl.nkbv,
        loaiNk: secondaryMulti && panel === "BSI" ? secondaryLoai : loai,
        secondaryBsi: secondaryMulti && panel !== "BSI",
        nsk: kl.nsk,
        tacNhan: kl.tac_nhan,
        noi: kl.noi_xay_ra,
      });
    }
    return verdictKetLuanLabel || "";
  }, [
    analysisMode,
    draft.ketLuan,
    draft.eventDisposition,
    draft.analysisMode,
    session.ketLuan,
    verdictClassification,
    verdictSecondary,
    verdictKetLuanLabel,
    criteriaMetForKetLuan,
    sbsiVerdicts,
    panel,
  ]);

  const ketLuanLocked =
    analysisMode !== "MANUAL" &&
    draft.analysisMode !== "MANUAL" &&
    (draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" ||
      draft.eventDisposition?.kind === "SECONDARY_BSI");

  const priorRitAlert = useMemo(() => {
    if (!maBenhAn || !priorEvents.length) return null;
    const specimen =
      indexXn?.benh_pham ||
      (panel === "UTI" ? "Nước tiểu" : panel === "PNEU" ? "Đờm" : panel === "BSI" ? "Máu" : "Khác");
    const exclude = priorEvents
      .filter((e) => e.index_vi_sinh_id && e.index_vi_sinh_id === index.id)
      .map((e) => e.id);
    return scanIndexPriorRitAlert({
      maBenhAn,
      indexDate: index.date,
      loaiBenhPham: specimen,
      existingEvents: priorEvents.map((e) => ({
        id: e.id,
        ma_benh_an: maBenhAn,
        ngay_phat_hien: e.ngay_phat_hien,
        loai_ma: e.loai_ma,
        vi_tri_nhiem_khuan: e.vi_tri_nhiem_khuan,
      })),
      excludeEventIds: exclude,
    });
  }, [maBenhAn, priorEvents, indexXn?.benh_pham, index.date, index.id, panel]);

  /** Trong IWP: khi đã có DOE mà DOE ∈ RIT sự kiện cũ → kết luận BELONGS (không tạo SK mới). */
  const doeBelongAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    const doe = session.nsk?.slice(0, 10);
    if (!doe || !priorEvents.length) return;
    if (draft.eventDisposition?.kind === "SECONDARY_BSI") return;
    if (
      draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" &&
      doeBelongAppliedRef.current === doe
    ) {
      return;
    }
    const bare =
      index.kind === "XN"
        ? bareViSinhIdFromMilestoneId(index.id) || index.id
        : null;
    const exclude = priorEvents
      .filter((e) => e.index_vi_sinh_id && bare && e.index_vi_sinh_id === bare)
      .map((e) => e.id);
    const hit = resolveDoeBelongsPriorEvent({
      doe,
      sampleMajor: panel,
      priorEvents,
      excludeEventIds: exclude,
      excludeIndexViSinhId: bare,
    });
    if (!hit) return;
    if (
      draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" &&
      draft.eventDisposition.priorEventId === hit.priorEventId
    ) {
      doeBelongAppliedRef.current = doe;
      return;
    }
    doeBelongAppliedRef.current = doe;
    onDraftChange({
      ketLuan: hit.ketLuanLabel,
      readyToChot: false,
      eventDisposition: {
        kind: "BELONGS_PRIOR_EVENT",
        label: hit.ketLuanLabel,
        priorEventId: hit.priorEventId || null,
      },
    });
  }, [
    session.nsk,
    priorEvents,
    panel,
    index.kind,
    index.id,
    draft.eventDisposition?.kind,
    draft.eventDisposition?.priorEventId,
    onDraftChange,
  ]);

  return (
    <section className="mt-3 rounded-xl border border-rose-200 bg-rose-50/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-rose-950">
            {panel === "UTI"
              ? "Bảng UTI/CAUTI — Ngày X · IPW · DOE · RIT · SBAP · Foley"
              : panel === "PNEU"
                ? "Bảng PNEU/VAP/HAP — Ngày X · IPW · DOE · RIT · SBAP · Vent"
                : panel === "BSI"
                  ? "Bảng Primary BSI/CLABSI — Ngày X · IPW · DOE · RIT · SBAP · CVC"
                  : `Bảng ${panel} — Ngày X · IPW · DOE · RIT · SBAP`}
          </h3>
          <p className="mt-0.5 text-[11px] text-rose-800">
            Ngày X {session.indexDate || "—"}
            {session.nsk ? ` · DOE/NSK ${session.nsk}` : ""}
            {panel === "UTI" && utiVerdict
              ? ` · ${utiVerdict.result.classification}`
              : panel === "PNEU" && pneuVerdict
                ? ` · ${pneuVerdict.result.classification}`
                : panel === "BSI" && bsiVerdict
                  ? ` · ${bsiVerdict.result.classification}`
                  : session.ketLuan
                    ? ` · ${session.ketLuan.summary}`
                    : ""}
            {session.ketLuan?.is_secondary_bsi ? " · Secondary BSI" : null}
            {panel === "UTI" && ageYears == null
              ? " · Nhánh người lớn (chưa có ngày sinh)"
              : null}
            {panel === "UTI" && isInfant ? " · SUTI 2 (≤1 tuổi)" : null}
            {panel === "PNEU" && ageYears != null && ageYears >= 70
              ? " · AMS ≥70 khả dụng"
              : null}
            {panel === "BSI" && draft.bsiLocalizedSite?.criteriaMet
              ? ` · Site ${draft.bsiLocalizedSite.majorType} (Secondary gate)`
              : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {panel === "PNEU" ? (
            <div className="flex max-w-[28rem] flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-700">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={Boolean(draft.hasCardiopulmonaryDisease)}
                  disabled={!allowedEdit}
                  onChange={(e) =>
                    onDraftChange({ hasCardiopulmonaryDisease: e.target.checked })
                  }
                />
                Tim phổi nền (≥2 phim)
              </label>
              {PNEU_IC_ATOM_ROWS.map((row) => (
                <label key={row.field} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.pneuIcAtoms?.[row.field])}
                    disabled={!allowedEdit}
                    onChange={(e) =>
                      onDraftChange({
                        pneuIcAtoms: {
                          ...(draft.pneuIcAtoms || {}),
                          [row.field]: e.target.checked,
                        },
                      })
                    }
                  />
                  {row.label}
                </label>
              ))}
            </div>
          ) : null}
          {!criteriaMetForKetLuan &&
          draft.eventDisposition?.kind !== "BELONGS_PRIOR_EVENT" &&
          draft.eventDisposition?.kind !== "SECONDARY_BSI" ? (
            <button
              type="button"
              disabled={!allowedEdit}
              onClick={() => onCloseInsufficient?.()}
              className="rounded-full border border-amber-400 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
              title="Chốt Index không đủ tạo sự kiện — không tô RIT/SBAP; cho phân tích XN tiếp"
            >
              Đã phân tích xong
            </button>
          ) : null}
          {criteriaMetForKetLuan ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
              Đủ TC sự kiện
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
          >
            Đóng bảng
          </button>
        </div>
      </div>

      {draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" ? (
        <div className="mt-2 rounded-lg border border-emerald-400 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-950">
          <strong>Thuộc sự kiện trước:</strong>{" "}
          {draft.eventDisposition.label || draft.ketLuan}
          <span className="ml-1 text-emerald-800">
            — không tạo phiếu mới; gộp tác nhân vào ca DOE đã có.
          </span>
        </div>
      ) : null}

      {draft.eventDisposition?.kind === "SECONDARY_BSI" ? (
        <div className="mt-2 rounded-lg border border-sky-400 bg-sky-50 px-2 py-1.5 text-[11px] text-sky-950">
          <strong>Nhiễm khuẩn huyết thứ phát:</strong>{" "}
          {draft.eventDisposition.label || draft.ketLuan}
          {draft.eventDisposition.secondarySites?.length ? (
            <span className="ml-1">
              · site: {draft.eventDisposition.secondarySites.join("; ")}
            </span>
          ) : null}
        </div>
      ) : null}

      {priorRitAlert && draft.eventDisposition?.kind !== "BELONGS_PRIOR_EVENT" ? (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          <strong>Cảnh báo RIT:</strong> {priorRitAlert.message}
        </div>
      ) : null}

      {panel === "UTI" && utiVerdict?.lab.warnings.length ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          <strong>Gate Index nước tiểu:</strong>{" "}
          {utiVerdict.lab.warnings.join(" · ")}
          {!utiVerdict.criteriaMet ? (
            <span className="ml-1 font-semibold text-rose-800">
              — chưa đủ chốt ({utiVerdict.result.classification})
            </span>
          ) : null}
        </div>
      ) : null}

      {panel === "PNEU" && pneuVerdict?.gate.warnings.length ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          <strong>Gate PNEU (IWP):</strong> {pneuVerdict.gate.warnings.join(" · ")}
          {!pneuVerdict.criteriaMet ? (
            <span className="ml-1 font-semibold text-rose-800">
              — chưa đủ chốt ({pneuVerdict.result.classification})
            </span>
          ) : null}
        </div>
      ) : null}

      {panel === "BSI" && bsiVerdict?.gate.warnings.length ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          <strong>Gate Primary BSI:</strong> {bsiVerdict.gate.warnings.join(" · ")}
          {!bsiVerdict.criteriaMet ? (
            <span className="ml-1 font-semibold text-rose-800">
              — {bsiVerdict.result.classification}
            </span>
          ) : null}
        </div>
      ) : null}

      {panel === "BSI" && bsiVerdict?.result.classification === "SECONDARY_BSI" ? (
        <p className="mt-2 text-[11px] font-semibold text-emerald-800">
          Secondary BSI từ ổ khu trú — không ghi CLABSI trên bảng này.
        </p>
      ) : null}

      {panel === "PNEU" && bloodInIwp.length > 0 ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          <strong>Cấy máu ∈ IWP — có thể gắn PNU2:</strong>
          <ul className="mt-1 space-y-1">
            {bloodInIwp.map((b) => {
              const on = draft.bloodCriterionIds.includes(b.id);
              const v = sbsiVerdicts.find((x) => x.bloodId === b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!allowedEdit}
                      onChange={() => toggleBloodPnu2(b.id)}
                    />
                    <span>
                      {b.ngay} · {b.vi_khuan}
                      {b.so_luong ? ` · SL ${b.so_luong}` : ""}
                    </span>
                  </label>
                  {v ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-semibold">
                      {v.outcome === "SECONDARY"
                        ? `Secondary ${v.scenario}`
                        : v.outcome === "EXCLUDED_PRIMARY"
                          ? "Exclusion → Primary"
                          : "Ứng viên Primary"}
                    </span>
                  ) : null}
                  {v &&
                  (v.outcome === "PRIMARY_CANDIDATE" || v.outcome === "EXCLUDED_PRIMARY") &&
                  onOpenPrimaryBsi ? (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-sky-800 underline"
                      onClick={() => onOpenPrimaryBsi(b.id)}
                    >
                      Mở bảng BSI
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {panel === "UTI" && bloodInSbap.length > 0 ? (
        <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] text-sky-950">
          <strong>Cấy máu ∈ SBAP — ABUTI / Secondary (không nấm):</strong>
          <ul className="mt-1 space-y-1">
            {bloodInSbap.map((b) => {
              const on = draft.bloodCriterionIds.includes(b.id);
              const v = sbsiVerdicts.find((x) => x.bloodId === b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!allowedEdit}
                      onChange={() => toggleAbutiBlood(b.id)}
                    />
                    <span>
                      {b.ngay} · {b.vi_khuan}
                      {b.so_luong ? ` · SL ${b.so_luong}` : ""}
                    </span>
                  </label>
                  {v ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-semibold">
                      {v.outcome === "SECONDARY"
                        ? `Secondary ${v.scenario}`
                        : v.outcome === "EXCLUDED_PRIMARY"
                          ? "Yeast → Primary BSI"
                          : "Ứng viên Primary"}
                    </span>
                  ) : null}
                  {v &&
                  (v.outcome === "PRIMARY_CANDIDATE" || v.outcome === "EXCLUDED_PRIMARY") &&
                  onOpenPrimaryBsi ? (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-sky-800 underline"
                      onClick={() => onOpenPrimaryBsi(b.id)}
                    >
                      Mở bảng BSI
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {panel !== "BSI" && sbsiVerdicts.some((v) => v.outcome === "SECONDARY") ? (
        <p className="mt-2 text-[11px] font-semibold text-emerald-800">
          Secondary BSI:{" "}
          {sbsiVerdicts
            .filter((v) => v.outcome === "SECONDARY")
            .map((v) => v.reason)
            .join(" · ")}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] text-rose-800/90">
        Cột phân tích cùng hàng bảng chung. XN cùng mẫu ∈ RIT (ứng viên) → Kết luận «Thuộc SK»
        khi đủ TC + nút xác nhận. Cấy máu ∈ SBAP: badge «≈» khi trùng VK. Highlight IPW / RIT / SBAP.
      </p>

      {(() => {
        const aw = BA_DAY_COL_W_ANALYSIS;
        const xnByDate: Record<string, BaGridXnCell[]> = {};
        for (const x of xn) {
          const d = x.ngay.slice(0, 10);
          (xnByDate[d] ||= []).push(x);
        }
        const cdhaByDate: Record<string, BaGridCdhaCell[]> = {};
        for (const c of cdha) {
          const d = c.ngay.slice(0, 10);
          (cdhaByDate[d] ||= []).push(c);
        }

        const analysisColumns: BaDayGridColumnDef[] = [
          {
            id: "ax_index",
            header: "Index X",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(
                index.date.slice(0, 10) === day.date ? "index" : "none",
              ),
            render: (day) => {
              const isIx = index.date.slice(0, 10) === day.date;
              if (!isIx) return <span className="text-slate-300">—</span>;
              if (indexXn) {
                return (
                  <div className="leading-snug">
                    <span className="font-bold">X · {indexXn.benh_pham}</span>
                    <span className="block">{indexXn.vi_khuan}</span>
                    {panel === "UTI" && utiVerdict && !utiVerdict.lab.cfuOk ? (
                      <span className="font-semibold">Gate!</span>
                    ) : null}
                  </div>
                );
              }
              if (indexCdha) {
                return (
                  <span className="line-clamp-3 font-semibold">
                    X · {indexCdha.mo_ta_benh_ly}
                  </span>
                );
              }
              return <span className="font-bold">X</span>;
            },
          },
          {
            id: "ax_ls",
            header: "IWP · LS",
            minWidth: aw,
            cellClassName: (day) => {
              const isDoe = Boolean(session.nsk && session.nsk === day.date);
              if (isDoe) return baCellToneClass("doe");
              if (session.iwpDates.has(day.date)) return baCellToneClass("iwp");
              return baCellToneClass("none");
            },
            render: (day) => {
              const items = (sessionBase.lamSang[day.date] || []).filter((it) => {
                if (panel !== "UTI") return true;
                if (
                  UTI_VOIDING_CRITERIA_KEYS.has(it.key) &&
                  canThiepDates.some((d) => d.slice(0, 10) === day.date)
                ) {
                  return false;
                }
                return true;
              });
              const inIwp = session.iwpDates.has(day.date);
              const isDoe = Boolean(session.nsk && session.nsk === day.date);
              const cat = catalogForDate(day.date);
              return (
                <div className="relative flex flex-col gap-0.5">
                  {isDoe ? (
                    <span className="text-center text-[9px] font-bold tracking-wide">DOE</span>
                  ) : null}
                  {items.map((it) => (
                    <span key={it.key} className="line-clamp-2 text-[10px] font-semibold">
                      {it.label}
                    </span>
                  ))}
                  {allowedEdit && inIwp ? (
                    <details className="mt-auto">
                      <summary className="cursor-pointer text-[10px] font-semibold text-sky-700">
                        + LS
                      </summary>
                      <ul className="absolute z-30 mt-0.5 max-h-40 w-56 overflow-auto rounded border bg-white p-1 shadow-lg">
                        {cat.map((entry) => (
                          <li key={entry.criteriaKey}>
                            <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-[11px] hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={items.some((x) => x.key === entry.criteriaKey)}
                                onChange={() =>
                                  toggleLamSang(day.date, entry.criteriaKey, entry.title)
                                }
                              />
                              {entry.title}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {!items.length && !inIwp ? (
                    <span className="text-slate-300">—</span>
                  ) : null}
                </div>
              );
            },
          },
          {
            id: "ax_rit",
            header: session.ritDates.size
              ? "RIT · ứng viên"
              : "RIT",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(session.ritDates.has(day.date) ? "rit" : "none"),
            render: (day) => {
              const chips = sbapRitChips.ritByDate[day.date] || [];
              const cdhaChips = sbapRitChips.ritCdhaByDate[day.date] || [];
              if (!chips.length && !cdhaChips.length) {
                return session.ritDates.has(day.date) ? (
                  <span className="text-center text-[9px]">·</span>
                ) : (
                  <span className="text-slate-300">—</span>
                );
              }
              return (
                <div className="flex flex-col gap-0.5">
                  {chips.map((x) => (
                    <span
                      key={x.id}
                      className="truncate rounded bg-emerald-200/80 px-0.5 text-[9px] font-semibold text-emerald-950"
                      title={`${x.benh_pham} · ${x.vi_khuan} — RIT (cùng bệnh phẩm)`}
                    >
                      +{x.vi_khuan || x.benh_pham}
                    </span>
                  ))}
                  {cdhaChips.map((c) => (
                    <span
                      key={c.id}
                      className="truncate rounded bg-emerald-100 px-0.5 text-[9px] font-semibold text-emerald-900"
                      title={`${c.mo_ta_benh_ly || "CĐHA"} — RIT`}
                    >
                      XQ · {c.mo_ta_benh_ly || c.loai || "CĐHA"}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            id: "ax_sbap",
            header: session.sbapLabel
              ? `${session.sbapLabel} · ứng viên`
              : "SBAP · ứng viên",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(session.sbapDates.has(day.date) ? "sbap" : "none"),
            render: (day) => {
              const chips = sbapRitChips.sbapByDate[day.date] || [];
              if (!chips.length) {
                return session.sbapDates.has(day.date) ? (
                  <span className="text-center text-[9px]">·</span>
                ) : (
                  <span className="text-slate-300">—</span>
                );
              }
              return (
                <div className="flex flex-col gap-0.5">
                  {chips.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      disabled={!onOpenPrimaryBsi}
                      onClick={() => onOpenPrimaryBsi?.(b.id)}
                      className={`truncate rounded px-0.5 text-left text-[9px] font-semibold hover:opacity-90 ${
                        b.organismMatched
                          ? "bg-sky-400/90 text-sky-950 ring-1 ring-sky-600"
                          : "bg-sky-200/80 text-sky-950"
                      }`}
                      title={
                        b.organismMatched
                          ? `Cấy máu trùng VK ổ tại chỗ — ứng viên Secondary · ${b.vi_khuan}`
                          : `Cấy máu (+) ∈ SBAP · ${b.vi_khuan}`
                      }
                    >
                      {b.organismMatched ? "≈ " : ""}
                      Máu · {b.vi_khuan || "+"}
                    </button>
                  ))}
                </div>
              );
            },
          },
          {
            id: "ax_ket_luan",
            header: "Kết luận",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(
                index.date.slice(0, 10) === day.date ? "index" : "none",
              ),
            render: (day) => {
              const isIx = index.date.slice(0, 10) === day.date;
              return (
                <div className="flex flex-col gap-0.5">
                  <NkbvBaConcludeCell
                    date={day.date}
                    xnOnDay={xnByDate[day.date] || []}
                    cdhaOnDay={showCdha ? cdhaByDate[day.date] || [] : []}
                    priorEvents={priorEvents}
                    openSiteSessions={openSiteSessions}
                    analysisDispositions={analysisDispositions}
                    sampleConclusions={sampleConclusions}
                    activeSessionRit={activeSessionRit}
                    confirmedIds={draft.ritAttributedIds || []}
                    excludeSampleId={index.id}
                    progressiveLabel={null}
                    allowedEdit={allowedEdit}
                    analysisMode={analysisMode}
                    onManualSampleConclude={onManualSampleConclude}
                    onManualSampleClear={onManualSampleClear}
                    onConclude={(payload) => {
                      if (payload.scope === "session_rit" || payload.scope === "prior") {
                        const prev = draft.ritAttributedIds || [];
                        if (!prev.includes(payload.indexId)) {
                          onDraftChange({
                            ritAttributedIds: [...prev, payload.indexId],
                          });
                        }
                        return;
                      }
                      if (payload.scope === "secondary") {
                        const prev = draft.ritAttributedIds || [];
                        if (!prev.includes(payload.indexId)) {
                          onDraftChange({
                            ritAttributedIds: [...prev, payload.indexId],
                          });
                        }
                        onConfirmSecondaryBlood?.({
                          sampleId: payload.indexId,
                          date: day.date,
                          label: payload.label,
                        });
                      }
                    }}
                  />
                  {isIx ? (
                    <input
                      className="w-full border-t border-amber-200/60 bg-transparent pt-0.5 text-[9px] font-semibold outline-none"
                      value={ketLuanDisplay}
                      disabled={!allowedEdit || ketLuanLocked}
                      placeholder={
                        analysisMode === "MANUAL"
                          ? "Gõ kết luận sự kiện…"
                          : panel === "UTI"
                            ? utiVerdict?.result.classification || "SUTI / CAUTI"
                            : panel === "PNEU"
                              ? pneuVerdict?.result.classification || "PNU / HAP"
                              : panel === "BSI"
                                ? bsiVerdict?.result.classification || "LCBI / BSI"
                                : "Kết luận"
                      }
                      onChange={(e) => onDraftChange({ ketLuan: e.target.value })}
                    />
                  ) : null}
                </div>
              );
            },
          },
          {
            id: "ax_ghi_chu",
            header: "Ghi chú",
            minWidth: BA_DAY_COL_W_NARROW,
            render: (day) => (
              <input
                className="w-full bg-transparent text-[9px] outline-none"
                value={draft.notesByDate[day.date] || ""}
                disabled={!allowedEdit}
                title={draft.notesByDate[day.date] || "Ghi chú"}
                onChange={(e) =>
                  onDraftChange({
                    notesByDate: { ...draft.notesByDate, [day.date]: e.target.value },
                  })
                }
              />
            ),
          },
        ];

        if (typeof children === "function") {
          return children({ analysisColumns });
        }
        return (
          <p className="mt-2 text-[11px] text-amber-800">
            Thiếu slot bảng chung — truyền children để gắn cột phân tích.
          </p>
        );
      })()}

    </section>
  );
}

export type IwpPanelId = Extract<SyndromePanelId, "PNEU" | "UTI" | "BSI">;
