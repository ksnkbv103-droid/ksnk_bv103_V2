"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { BaTimelineMilestone } from "../lib/nkbv-ba-timeline-core";
import {
  attributeWithinRit,
  buildGridColumns,
  computeBaGridSession,
  imagingCatalogForNghiNgo,
  splitMilestonesToGridRows,
  ssiTcCatalogWithoutSurgery,
  type BaGridActiveIndex,
  type BaGridCdhaCell,
  type BaGridNghiNgo,
} from "../lib/nkbv-ba-grid-engine";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import { collectRitPathogens, detectSecondaryBsiFromSbap } from "../lib/nkbv-ket-luan-smart";
import type { NkbvBaAnalysisSeedInput } from "../actions/giam-sat-nkbv-ba-analysis.actions";
import {
  openSessionsToSecondarySites,
  priorEventsToSecondarySites,
  resolveBelongsOpenSessionByDate,
  resolveIndexEventDisposition,
  type OpenSiteSessionForSbap,
  type SecondarySiteHit,
} from "../lib/nkbv-index-event-disposition";
import {
  buildSessionIndexSuggestions,
  cdhaToSyndromePanel,
  isSsiIndexCriteriaKey,
  shouldDeferPrimaryBsi,
  siteSbapWindowsFromSites,
  specimenToSyndromePanel,
  type SessionIndexSuggestion,
  type SyndromePanelId,
} from "../lib/nkbv-specimen-syndrome";
import {
  formatSessionChipLabel,
  loadBaAnalysisSessions,
  pruneBaAnalysisSessions,
  removeBaAnalysisSession,
  sessionIdForIndex,
  updateSessionDraft,
  upsertBaAnalysisSession,
  type BaAnalysisSession,
  type BaAnalysisSessionDraft,
} from "../lib/nkbv-ba-analysis-session";
import NkbvSyndromeIwpPanel from "./NkbvSyndromeIwpPanel";
import NkbvSyndromeShellPanel, {
  isShellPanel,
  vaeBaReadyToCreatePhieu,
} from "./NkbvSyndromeShellPanel";
import NkbvSyndromeSsiPanel from "./NkbvSyndromeSsiPanel";
import NkbvBaCommonDayGrid from "./NkbvBaCommonDayGrid";
import NkbvBaAddViSinhModal from "./NkbvBaAddViSinhModal";
import NkbvBaConcludeCell from "./NkbvBaConcludeCell";
import { BA_DAY_COL_W_ANALYSIS, type BaDayGridColumnDef } from "./NkbvBaDayGrid";
import {
  DEVICE_CRITERIA_META,
  canThiepDatesForPanel,
  isDeviceDateInStay,
  type BaDeviceByDate,
} from "../lib/nkbv-ba-device-timeline";
import {
  filterPanelAnalysisColumns,
  splitBaAnalysisColumns,
} from "../lib/nkbv-ba-master-columns";
import type { DeviceCriteriaKey } from "../lib/nkbv-criteria-matrix";
import {
  softDeleteNkbvBaTimelineByKey,
  softDeleteNkbvBaTimelineMilestone,
  upsertNkbvBaTimelineMilestone,
} from "../actions/giam-sat-nkbv.actions";
import { clinicalRitEnd } from "../lib/nkbv-shared-timeline";
import {
  bareViSinhIdFromMilestoneId,
  resolveViSinhAnalysisStatus,
  type ViSinhAnalysisDispositionRow,
  type ViSinhAnalysisStatus,
} from "../lib/nkbv-vi-sinh-analysis-status";
import { buildBaSeedLabs } from "../lib/nkbv-analysis-session-to-verification";
import {
  hydrateLamSangDraftFromBa,
  mergeLamSangByDate,
  pickLamSangInDates,
  provisionalIwpDateSet,
} from "../lib/nkbv-ba-lam-sang-merge";
import { SSI_DIAGNOSTIC_CRITERIA_KEYS } from "../lib/nkbv-ba-grid-engine";
import { khongDuTcKetLuanLabel } from "../lib/nkbv-vi-sinh-analysis-status";
import {
  findBaSampleConclusion,
  loadBaSampleConclusions,
  normalizeSampleId,
  removeBaSampleConclusion,
  removeBaSampleConclusionsMany,
  sampleConclusionsToDispositionRows,
  sampleIdsOwnedByAnalysisSession,
  upsertBaSampleConclusion,
  type BaSampleConclusion,
} from "../lib/nkbv-ba-sample-conclusions";
import {
  type BaAnalysisMode,
  isManualAnalysisMode,
  loadBaAnalysisModePref,
  saveBaAnalysisModePref,
} from "../lib/nkbv-ba-analysis-mode";
import { toast } from "sonner";

type KhoaOpt = { id: string; ma: string; ten: string };

const COL_W = 132;
const LABEL_W = 128;

type XnCell = ReturnType<typeof splitMilestonesToGridRows>["xn"][number];

/** Handler ổn định tham chiếu — hàng memo không re-render vì closure mới. */
function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = React.useRef(fn);
  React.useInsertionEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

type Props = {
  maBenhAn: string;
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  ngaySinh?: string | null;
  defaultKhoa?: string | null;
  /** UUID khoa điều trị — prefill khi thêm XN từ lưới */
  khoaId?: string | null;
  maBenhNhan?: string | null;
  hoTen?: string | null;
  khoaTen?: string | null;
  khoas?: KhoaOpt[];
  timeline: BaTimelineMilestone[];
  devices: Array<{
    id: string;
    device_type: string;
    insertion_date: string;
    removal_date: string | null;
  }>;
  /** Hàng đợi XN (+) — từ hub cases + skip metadata */
  analysisDispositions?: ViSinhAnalysisDispositionRow[];
  allowedEdit: boolean;
  /** Chọn Index — chỉ đánh dấu mốc, không tạo phiếu */
  onIndexChange?: (input: { milestoneId: string }) => void;
  /** Sau kết luận — tạo phiếu phân tích (late create) */
  onCreatePhieu?: (input: {
    milestoneId: string;
    panel: SyndromePanelId;
    analysisSeed?: NkbvBaAnalysisSeedInput | null;
  }) => void;
  /** Bỏ qua XN (+) có lý do */
  onSkipViSinh?: (input: { viSinhId: string; reason: string }) => void;
  /** Chốt Index không đủ TC (KHONG_DU_TC) */
  onMarkKhongDuTc?: (input: { viSinhId: string; indexDate: string }) => void;
  /** Xóa phiên → mở lại XN đã gắn KHONG_DU_TC trên DB */
  onClearViSinhDisposition?: (input: { viSinhId: string }) => void | Promise<void>;
  /** Soft reload hub (silent) — dùng khi cần đồng bộ LIS/case, không mỗi tick TC */
  onReload: () => void;
  /** Patch timeline local sau upsert DB — tránh reload cả hub */
  onTimelineUpsertLocal?: (row: {
    id: string;
    milestone_kind: string;
    milestone_date: string;
    title: string;
    detail?: string | null;
    specimen_hint?: string | null;
    criteria_key?: string | null;
  }) => void;
  onTimelineRemoveLocal?: (milestoneId: string) => void;
  /** Phiếu đã có trên BA — cảnh báo RIT khi mở Index mới. */
  priorEvents?: Array<{
    id: string;
    ngay_phat_hien: string | null;
    loai_ma?: string | null;
    loai_ten?: string | null;
    vi_tri_nhiem_khuan?: string | null;
    index_vi_sinh_id?: string | null;
    tac_nhan_vi_khuan?: string | null;
    attributed_vi_sinh_ids?: string[] | null;
  }>;
};

/**
 * Multi-timeline: bảng chung bằng chứng đầy đủ + phiên hội chứng độc lập.
 */
export default function NkbvBaMultiTimelineWorkspace({
  maBenhAn,
  ngayVaoVien,
  ngayRaVien,
  ngaySinh,
  defaultKhoa,
  khoaId,
  maBenhNhan,
  hoTen,
  khoas = [],
  timeline,
  devices: _registryDevices,
  analysisDispositions = [],
  allowedEdit,
  onIndexChange,
  onCreatePhieu,
  onSkipViSinh,
  onMarkKhongDuTc,
  onClearViSinhDisposition,
  onReload,
  onTimelineUpsertLocal,
  onTimelineRemoveLocal,
  priorEvents = [],
}: Props) {
  void _registryDevices; // Hub vẫn truyền registry — association lưới chỉ dùng timeline
  const [addXnDate, setAddXnDate] = useState<string | null>(null);
  const split = useMemo(() => splitMilestonesToGridRows(timeline), [timeline]);
  const ssiTcCatalog = useMemo(() => ssiTcCatalogWithoutSurgery(), []);
  const cdhaCatalog = useMemo(() => {
    const pneu = imagingCatalogForNghiNgo("PNEU");
    const abscess = imagingCatalogForNghiNgo("SSI").filter((c) => c.criteriaKey === "abscess_imaging");
    const seen = new Set<string>();
    return [...pneu, ...abscess].filter((c) => {
      if (seen.has(c.criteriaKey)) return false;
      seen.add(c.criteriaKey);
      return true;
    });
  }, []);

  const [analysisMode, setAnalysisMode] = useState<BaAnalysisMode>("CDC");
  const [sessions, setSessions] = useState<BaAnalysisSession[]>([]);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  /** Kết luận đã chốt theo mẫu — luôn hiện khi PT Index khác. */
  const [sampleConclusions, setSampleConclusions] = useState<BaSampleConclusion[]>(
    [],
  );
  const [preferVae, setPreferVae] = useState(false);
  const isManual = isManualAnalysisMode(analysisMode);

  useEffect(() => {
    setAnalysisMode(loadBaAnalysisModePref(maBenhAn));
    setOpenSessionId(null);
  }, [maBenhAn]);

  const switchAnalysisMode = useCallback(
    (next: BaAnalysisMode) => {
      if (next === analysisMode) return;
      saveBaAnalysisModePref(maBenhAn, next);
      setAnalysisMode(next);
      setOpenSessionId(null);
      setSessions(loadBaAnalysisSessions(maBenhAn, next));
    },
    [analysisMode, maBenhAn],
  );
  const [localCdha, setLocalCdha] = useState<BaGridCdhaCell[]>([]);
  /** Optimistic tick SSI TC — giảm lag chờ Server Action. */
  const [localSsiTc, setLocalSsiTc] = useState<
    Array<{ id: string; ngay: string; key: string; label: string }>
  >([]);
  /** Khóa đang ghi DB — chặn double-click tạo bản trùng. */
  const inFlightRef = React.useRef<Set<string>>(new Set());

  const cdhaKey = (x: Pick<BaGridCdhaCell, "ngay" | "tieu_chuan_key">) =>
    `${String(x.ngay).slice(0, 10)}|${x.tieu_chuan_key || "imaging_chest"}`;

  // Khi server/timeline đã có CĐHA cùng ngày+loại → bỏ bản local tạm (nguyên nhân XQ lặp)
  useEffect(() => {
    setLocalCdha((prev) =>
      prev.filter((loc) => !split.cdha.some((b) => cdhaKey(b) === cdhaKey(loc))),
    );
  }, [split.cdha]);

  useEffect(() => {
    setLocalSsiTc((prev) =>
      prev.filter((loc) => {
        const day = (split.tieuChuanChuyenBietByDate[loc.ngay] || []).some(
          (x) => x.key === loc.key,
        );
        return !day;
      }),
    );
  }, [split.tieuChuanChuyenBietByDate]);

  const cdhaList = useMemo(() => {
    const byKey = new Map<string, BaGridCdhaCell>();
    for (const b of split.cdha) byKey.set(cdhaKey(b), b);
    for (const x of localCdha) {
      const k = cdhaKey(x);
      if (!byKey.has(k)) byKey.set(k, x);
    }
    return [...byKey.values()];
  }, [split.cdha, localCdha]);

  /** TC SSI = DB + optimistic local (dùng cho gợi ý phiên + hàng lưới). */
  const ssiTcByDate = useMemo(() => {
    const m: Record<string, Array<{ key: string; label: string; id?: string }>> = {};
    for (const [d, items] of Object.entries(split.tieuChuanChuyenBietByDate)) {
      m[d] = [...items];
    }
    for (const loc of localSsiTc) {
      const day = m[loc.ngay] || (m[loc.ngay] = []);
      if (!day.some((x) => x.key === loc.key)) {
        day.push({ key: loc.key, label: loc.label, id: loc.id });
      }
    }
    return m;
  }, [split.tieuChuanChuyenBietByDate, localSsiTc]);

  /** Cổng Secondary: SBAP từ phiếu + phiên site đủ TC; pack VK = Index ∪ RIT. */
  const openSiteSessionsForSbap: OpenSiteSessionForSbap[] = useMemo(() => {
    return sessions
      .filter((s) => s.panel !== "BSI")
      .map((s) => {
        const indexXn = split.xn.find((x) => x.id === s.index.id);
        const nsk = (s.draft.nsk || s.index.date).slice(0, 10);
        const major = resolveNkbvMajorType({ loai_ma: s.panel });
        const ritOrgs = collectRitPathogens({
          nsk,
          majorType: major,
          xn: split.xn,
          excludeBlood: true,
        });
        const indexOrg = indexXn?.vi_khuan?.trim();
        const siteOrganisms = [
          ...new Set(
            [...(indexOrg ? [indexOrg] : []), ...ritOrgs]
              .map((o) => o.trim())
              .filter(Boolean),
          ),
        ];
        return {
          id: s.id,
          panel: s.panel,
          eventEstablished: Boolean(s.draft.eventEstablished),
          indexDate: s.index.date,
          doe: s.draft.nsk || null,
          siteOrganism: siteOrganisms[0] || null,
          siteOrganisms,
          bloodCriterionIds: s.draft.bloodCriterionIds,
        };
      });
  }, [sessions, split.xn]);

  const establishedSiteSbaps = useMemo(() => {
    const sites = [
      ...priorEventsToSecondarySites(priorEvents),
      ...openSessionsToSecondarySites(openSiteSessionsForSbap),
    ];
    return siteSbapWindowsFromSites(sites);
  }, [priorEvents, openSiteSessionsForSbap]);

  // Nạp phiên + cắt phiên mồ côi (Index không còn trên bảng chung)
  useEffect(() => {
    const validIds = new Set<string>();
    for (const x of split.xn) validIds.add(x.id);
    for (const c of cdhaList) validIds.add(c.id);
    for (const items of Object.values(split.surgeryByDate)) {
      for (const s of items) if (s.id) validIds.add(s.id);
    }
    for (const items of Object.values(ssiTcByDate)) {
      for (const t of items) if (t.id && !t.id.startsWith("local-")) validIds.add(t.id);
    }
    const next = pruneBaAnalysisSessions(maBenhAn, validIds, analysisMode);
    setSessions(next);
    setOpenSessionId((cur) => (cur && next.some((s) => s.id === cur) ? cur : null));
    setSampleConclusions(loadBaSampleConclusions(maBenhAn));
  }, [maBenhAn, analysisMode, split.xn, cdhaList, split.surgeryByDate, ssiTcByDate]);

  const openSession = useMemo(
    () => sessions.find((s) => s.id === openSessionId) || null,
    [sessions, openSessionId],
  );

  /** Disposition DB ∪ sổ kết luận local — XN1 không đủ TC vẫn hiện khi PT XN2. */
  const mergedDispositions = useMemo((): ViSinhAnalysisDispositionRow[] => {
    const byId = new Map<string, ViSinhAnalysisDispositionRow>();
    for (const r of analysisDispositions) {
      const id = bareViSinhIdFromMilestoneId(String(r.index_vi_sinh_id || "")) ||
        String(r.index_vi_sinh_id || "").trim();
      if (id) byId.set(id, r);
    }
    for (const r of sampleConclusionsToDispositionRows(sampleConclusions)) {
      const id = String(r.index_vi_sinh_id || "").trim();
      if (id) byId.set(id, r);
    }
    return [...byId.values()];
  }, [analysisDispositions, sampleConclusions]);

  /** Khung bảng chung: VV−2 → hết (ra viện/hôm nay) + kéo đến hết RIT nếu đã có DOE phiên. */
  const commonColumns = useMemo(() => {
    const evidenceDates = [
      ...split.xn.map((x) => x.ngay),
      ...cdhaList.map((c) => c.ngay),
      ...Object.keys(split.surgeryByDate),
      ...Object.keys(split.tieuChuanChuyenBietByDate),
      ...Object.keys(split.trieuChungLamSangByDate),
    ];
    for (const s of sessions) {
      // DOE chưa chốt trên draft → tạm kéo khung theo Index (+13 = hết RIT tối thiểu)
      const anchor = s.index?.date;
      if (anchor) evidenceDates.push(clinicalRitEnd(String(anchor).slice(0, 10)));
    }
    return buildGridColumns({ ngayVaoVien, ngayRaVien, evidenceDates });
  }, [
    ngayVaoVien,
    ngayRaVien,
    split.xn,
    split.surgeryByDate,
    split.tieuChuanChuyenBietByDate,
    split.trieuChungLamSangByDate,
    cdhaList,
    sessions,
  ]);

  /** Khung phân tích tái dùng cùng cột bảng chung (neo VV−2) — không Index±7/14. */
  const panelColumns = commonColumns;

  /** Map theo ngày — hàng memo không filter lại mỗi render. */
  const xnByDate = useMemo(() => {
    const m: Record<string, XnCell[]> = {};
    for (const x of split.xn) {
      const d = x.ngay.slice(0, 10);
      (m[d] ||= []).push(x);
    }
    return m;
  }, [split.xn]);

  const cdhaByDate = useMemo(() => {
    const m: Record<string, BaGridCdhaCell[]> = {};
    for (const x of cdhaList) {
      const d = x.ngay.slice(0, 10);
      (m[d] ||= []).push(x);
    }
    return m;
  }, [cdhaList]);

  const xnStatusById = useMemo(() => {
    const m: Record<string, ViSinhAnalysisStatus> = {};
    for (const x of split.xn) {
      const bare = bareViSinhIdFromMilestoneId(x.id) || x.id;
      m[x.id] = resolveViSinhAnalysisStatus(bare, mergedDispositions);
    }
    return m;
  }, [split.xn, mergedDispositions]);

  /** Cột phiên → window (Index…SBAP) + tail (Kết luận/GC); không nhân đôi Kết luận. */
  const analysisSlotsForPanel = useCallback(
    (analysisColumns: BaDayGridColumnDef[], panel: SyndromePanelId) => {
      const filtered = filterPanelAnalysisColumns(analysisColumns, panel);
      return splitBaAnalysisColumns(filtered);
    },
    [],
  );

  /** Gợi ý phiên: XN chưa PT + CĐHA phổi/áp xe + ngày mổ/TC DOE SSI. */
  const sessionSuggestions = useMemo(
    () =>
      buildSessionIndexSuggestions({
        xn: split.xn,
        cdha: cdhaList,
        surgeryByDate: split.surgeryByDate,
        ssiTcByDate,
        preferVae,
        xnStatusById,
        onlyPendingXn: true,
      }),
    [split.xn, cdhaList, split.surgeryByDate, ssiTcByDate, preferVae, xnStatusById],
  );

  const patchDraft = useCallback(
    (sessionId: string, patch: Partial<BaAnalysisSessionDraft>) => {
      const next = updateSessionDraft(maBenhAn, sessionId, patch, analysisMode);
      setSessions(next);
    },
    [maBenhAn, analysisMode],
  );

  const persistManualSampleConclusion = useCallback(
    (payload: {
      indexId: string;
      kind: "XN" | "CDHA";
      date: string;
      disposition: BaSampleConclusion["disposition"];
      label: string;
    }) => {
      const next = upsertBaSampleConclusion(maBenhAn, {
        sampleId: payload.indexId,
        date: payload.date.slice(0, 10),
        kind: payload.kind,
        disposition: payload.disposition,
        label: payload.label,
      });
      setSampleConclusions(next);
    },
    [maBenhAn],
  );

  const clearManualSampleConclusion = useCallback(
    (indexId: string) => {
      setSampleConclusions(removeBaSampleConclusion(maBenhAn, indexId));
    },
    [maBenhAn],
  );

  /** LS lâm sàng trên BA (hội chứng + ghi chú không phải TC SSI chẩn đoán). */
  const baClinicalLamSang = useMemo(() => {
    const free: typeof split.trieuChungLamSangByDate = {};
    for (const [d, items] of Object.entries(split.tieuChuanChuyenBietByDate)) {
      const keep = (items || []).filter((it) => !SSI_DIAGNOSTIC_CRITERIA_KEYS.has(it.key));
      if (keep.length) free[d] = keep;
    }
    return mergeLamSangByDate(split.trieuChungLamSangByDate, free);
  }, [split.trieuChungLamSangByDate, split.tieuChuanChuyenBietByDate]);

  const openOrCreateSession = useCallback(
    (
      panel: SyndromePanelId,
      index: BaGridActiveIndex,
      indexLabel: string,
      draftExtra?: Partial<BaAnalysisSessionDraft>,
    ) => {
      const existing = loadBaAnalysisSessions(maBenhAn, analysisMode).find(
        (s) => s.id === sessionIdForIndex(panel, index.id),
      );
      // LS đã có trên timeline ∈ IWP Index mới → đưa vào draft phiên (không loại trừ)
      const iwpSeed = pickLamSangInDates(
        baClinicalLamSang,
        provisionalIwpDateSet(index.date),
      );
      const hydrated = hydrateLamSangDraftFromBa({
        ba: baClinicalLamSang,
        draft: mergeLamSangByDate(iwpSeed, existing?.draft.lamSang || {}),
        indexDate: index.date,
      });
      // Can thiệp lấy từ timeline BA (không sổ đăng ký)
      const baCt = canThiepDatesForPanel(
        split.deviceByDate as BaDeviceByDate,
        panel,
      );
      const draftSeed: Partial<BaAnalysisSessionDraft> = {
        ...(baCt.length ? { canThiepDates: baCt } : {}),
        lamSang: hydrated.next,
        analysisMode,
        ...(draftExtra || {}),
      };
      // draftExtra.lamSang (nếu có) vẫn merge với BA∩IWP
      if (draftExtra?.lamSang) {
        draftSeed.lamSang = hydrateLamSangDraftFromBa({
          ba: baClinicalLamSang,
          draft: draftExtra.lamSang,
          indexDate: index.date,
        }).next;
      }
      draftSeed.analysisMode = analysisMode;
      // MANUAL: luôn NEW_ANALYSIS + KL trống khi mở mới / đổi từ CDC
      if (isManualAnalysisMode(analysisMode)) {
        draftSeed.eventDisposition = { kind: "NEW_ANALYSIS", label: "" };
        if (!existing || existing.draft.analysisMode !== "MANUAL") {
          draftSeed.ketLuan = "";
        }
      }
      const next = upsertBaAnalysisSession({
        maBenhAn,
        panel,
        index,
        indexLabel,
        mode: analysisMode,
        draft: Object.keys(draftSeed).length ? draftSeed : undefined,
      });
      setSessions(next);
      setOpenSessionId(sessionIdForIndex(panel, index.id));
      onIndexChange?.({ milestoneId: index.id });
    },
    [maBenhAn, analysisMode, onIndexChange, baClinicalLamSang, split.deviceByDate],
  );

  /**
   * Phủ quyết Secondary: kết luận ngay trên mẫu máu (thuộc sự kiện ngày …),
   * không mở khung Primary BSI. Nếu site đang PT → focus phiên site + gắn attributed.
   */
  const applySecondaryBsiVeto = useCallback(
    (input: {
      sampleId: string;
      sampleDate: string;
      ketLuanLabel: string;
      sites: SecondarySiteHit[];
    }) => {
      const nextConclusions = upsertBaSampleConclusion(maBenhAn, {
        sampleId: input.sampleId,
        date: input.sampleDate.slice(0, 10),
        kind: "XN",
        disposition: "SECONDARY_BSI",
        label: input.ketLuanLabel,
      });
      setSampleConclusions(nextConclusions);

      // Ưu tiên focus phiên site đang PT nếu máu gắn session:*
      const sessionOwner = input.sites.find((s) =>
        String(s.eventId || "").startsWith("session:"),
      );
      if (sessionOwner) {
        const sessId = String(sessionOwner.eventId).replace(/^session:/, "");
        const owner = sessions.find((s) => s.id === sessId);
        if (owner) {
          const prev = owner.draft.ritAttributedIds || [];
          if (!prev.includes(input.sampleId)) {
            patchDraft(owner.id, {
              ritAttributedIds: [...prev, input.sampleId],
            });
          }
          setOpenSessionId(owner.id);
        }
      }
      toast.message(input.ketLuanLabel);
    },
    [maBenhAn, sessions, patchDraft],
  );

  /** Không mở phiên: một cột Kết luận ở đuôi bảng (không ghép thêm khi đã có phiên). */
  const closedGridConcludeColumns = useMemo((): BaDayGridColumnDef[] => {
    return [
      {
        id: "master_ket_luan",
        header: "Kết luận",
        minWidth: BA_DAY_COL_W_ANALYSIS,
        render: (day) => (
          <NkbvBaConcludeCell
            date={day.date}
            xnOnDay={xnByDate[day.date] || []}
            cdhaOnDay={cdhaByDate[day.date] || []}
            priorEvents={priorEvents}
            openSiteSessions={openSiteSessionsForSbap}
            analysisDispositions={mergedDispositions}
            sampleConclusions={sampleConclusions}
            allowedEdit={allowedEdit}
            analysisMode={analysisMode}
            onConclude={(payload) => {
              if (isManual || payload.scope !== "secondary") return;
              applySecondaryBsiVeto({
                sampleId: payload.indexId,
                sampleDate: day.date,
                ketLuanLabel: payload.label,
                sites: [],
              });
            }}
            onManualSampleConclude={persistManualSampleConclusion}
            onManualSampleClear={(p) => clearManualSampleConclusion(p.indexId)}
          />
        ),
      },
    ];
  }, [
    xnByDate,
    cdhaByDate,
    priorEvents,
    openSiteSessionsForSbap,
    mergedDispositions,
    sampleConclusions,
    allowedEdit,
    analysisMode,
    isManual,
    applySecondaryBsiVeto,
    persistManualSampleConclusion,
    clearManualSampleConclusion,
  ]);

  const foleyOnDate = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const d of Object.keys(split.deviceByDate.foley)) m[d] = true;
    return m;
  }, [split.deviceByDate.foley]);
  const ventOnDate = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const d of Object.keys(split.deviceByDate.vent)) m[d] = true;
    return m;
  }, [split.deviceByDate.vent]);
  const cvcOnDate = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const d of Object.keys(split.deviceByDate.cvc)) m[d] = true;
    return m;
  }, [split.deviceByDate.cvc]);

  const toggleDevice = async (date: string, key: DeviceCriteriaKey) => {
    if (!allowedEdit) return;
    const meta = DEVICE_CRITERIA_META[key];
    const bucket = split.deviceByDate[meta.bucket];
    const existing = (bucket[date] || [])[0];
    const flightKey = `ct|${date}|${key}`;
    if (inFlightRef.current.has(flightKey)) return;
    // Thêm mới: chỉ trong [VV…RV|hôm nay]; tick sai cũ vẫn cho tắt
    if (!existing) {
      const bound = isDeviceDateInStay(date, ngayVaoVien, ngayRaVien);
      if (!bound.ok) {
        toast.error(bound.reason || "Ngày can thiệp ngoài đợt nằm viện");
        return;
      }
    }
    if (existing) {
      inFlightRef.current.add(flightKey);
      if (existing.id) onTimelineRemoveLocal?.(existing.id);
      const res = await softDeleteNkbvBaTimelineByKey({
        ma_benh_an: maBenhAn,
        milestone_date: date,
        criteria_key: key,
      });
      inFlightRef.current.delete(flightKey);
      if (!res.success) {
        toast.error(res.error || "Không xóa được can thiệp");
        onReload();
      }
      return;
    }
    inFlightRef.current.add(flightKey);
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: "SYMPTOM",
      milestone_date: date,
      title: meta.label,
      criteria_key: key as never,
    });
    inFlightRef.current.delete(flightKey);
    if (!res.success) {
      toast.error(res.error || "Chưa lưu can thiệp");
      return;
    }
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const openFromXn = (x: (typeof split.xn)[0]) => {
    const panel = specimenToSyndromePanel({
      loai_benh_pham: x.benh_pham,
      preferVae,
    });
    const nextIndex: BaGridActiveIndex = { kind: "XN", id: x.id, date: x.ngay };
    const label = [x.benh_pham, x.vi_khuan].filter(Boolean).join(" · ");

    if (!panel) {
      toast.message(
        "Chưa map được hội chứng từ bệnh phẩm chuẩn — chuẩn hóa loại bệnh phẩm ở kho vi sinh trước.",
      );
      return;
    }

    // MANUAL: không disposition / Secondary / RIT auto — IP tự phân tích
    if (isManual) {
      openOrCreateSession(panel, nextIndex, label || x.benh_pham, {
        eventDisposition: { kind: "NEW_ANALYSIS", label: "" },
        ketLuan: "",
      });
      return;
    }

    const disp = resolveIndexEventDisposition({
      indexId: x.id,
      indexDate: x.ngay,
      specimenOrLabel: x.benh_pham,
      organism: x.vi_khuan,
      priorEvents,
      openSiteSessions: openSiteSessionsForSbap,
      analysisDispositions: mergedDispositions,
    });

    if (disp.kind === "CLOSED_INSUFFICIENT") {
      toast.message(disp.ketLuanLabel);
      return;
    }

    // Phủ quyết Secondary: kết luận trên mẫu — không mở khung BSI
    if (disp.kind === "SECONDARY_BSI") {
      applySecondaryBsiVeto({
        sampleId: x.id,
        sampleDate: x.ngay,
        ketLuanLabel: disp.ketLuanLabel,
        sites: disp.sites,
      });
      return;
    }

    // ∈ RIT phiên đang phân tích (UTI / PNEU·HAP / VAE·VAP / BSI) → focus phiên chủ
    const sampleMajor = resolveNkbvMajorType({
      loai_benh_pham: x.benh_pham,
      loai_ma: panel,
    });
    const sessionHit = resolveBelongsOpenSessionByDate({
      sampleId: x.id,
      sampleDate: x.ngay,
      sampleMajor,
      sessions: sessions.map((s) => ({
        id: s.id,
        panel: s.panel,
        index: s.index,
        indexLabel: s.indexLabel,
        doe: s.draft.nsk || null,
        eventEstablished: Boolean(s.draft.eventEstablished),
      })),
    });
    if (sessionHit) {
      const ownerId = String(sessionHit.priorEventId || "").replace(/^session:/, "");
      const owner = sessions.find((s) => s.index.id === ownerId);
      if (owner) {
        const prev = owner.draft.ritAttributedIds || [];
        if (!prev.includes(x.id)) {
          patchDraft(owner.id, { ritAttributedIds: [...prev, x.id] });
        }
        setOpenSessionId(owner.id);
      }
      toast.message(sessionHit.ketLuanLabel);
      return;
    }

    // ∈ RIT phiếu đã có (sự kiện đủ TC) → không mở IWP mới
    if (disp.kind === "BELONGS_PRIOR_EVENT") {
      toast.message(disp.ketLuanLabel);
      return;
    }

    // Secondary / RIT đã xử lý ở trên. NEW_ANALYSIS = đã rà SBAP (không S1/S2) → Primary OK
    // kể cả khi vẫn còn phiên site (máu ngoài SBAP hoặc bị loại trừ sinh học).
    openOrCreateSession(panel, nextIndex, label || x.benh_pham, {
      eventDisposition: { kind: "NEW_ANALYSIS", label: "" },
    });
  };

  const openFromCdha = (c: BaGridCdhaCell) => {
    const panel = cdhaToSyndromePanel({
      tieu_chuan_key: c.tieu_chuan_key,
      preferVae,
    });
    if (!panel) {
      toast.message("CĐHA này không phải Index (chỉ phổi → PNEU/VAE hoặc áp xe → SSI).");
      return;
    }
    if (isManual) {
      const label = c.mo_ta_benh_ly || (panel === "SSI" ? "Áp xe" : "CĐHA phổi");
      openOrCreateSession(panel, { kind: "CDHA", id: c.id, date: c.ngay }, label, {
        eventDisposition: { kind: "NEW_ANALYSIS", label: "" },
        ketLuan: "",
      });
      return;
    }
    const localCdhaKl = findBaSampleConclusion(sampleConclusions, c.id);
    if (localCdhaKl?.disposition === "KHONG_DU_TC") {
      toast.message(localCdhaKl.label);
      return;
    }
    const disp = resolveIndexEventDisposition({
      indexId: c.id,
      indexDate: c.ngay,
      specimenOrLabel: c.mo_ta_benh_ly || "XQ phổi",
      isImaging: true,
      priorEvents,
      analysisDispositions: mergedDispositions,
    });
    const label = c.mo_ta_benh_ly || (panel === "SSI" ? "Áp xe" : "CĐHA phổi");
    if (disp.kind === "BELONGS_PRIOR_EVENT") {
      toast.message(disp.ketLuanLabel);
      return;
    }

    const sampleMajor = resolveNkbvMajorType({
      loai_ma: panel,
      loai_benh_pham: "Đờm",
    });
    const sessionHit = resolveBelongsOpenSessionByDate({
      sampleId: c.id,
      sampleDate: c.ngay,
      sampleMajor,
      sessions: sessions.map((s) => ({
        id: s.id,
        panel: s.panel,
        index: s.index,
        indexLabel: s.indexLabel,
        doe: s.draft.nsk || null,
        eventEstablished: Boolean(s.draft.eventEstablished),
      })),
    });
    if (sessionHit) {
      const ownerId = String(sessionHit.priorEventId || "").replace(/^session:/, "");
      const owner = sessions.find((s) => s.index.id === ownerId);
      if (owner) {
        const prev = owner.draft.ritAttributedIds || [];
        if (!prev.includes(c.id)) {
          patchDraft(owner.id, { ritAttributedIds: [...prev, c.id] });
        }
        setOpenSessionId(owner.id);
      }
      toast.message(sessionHit.ketLuanLabel);
      return;
    }

    openOrCreateSession(panel, { kind: "CDHA", id: c.id, date: c.ngay }, label, {
      eventDisposition: { kind: "NEW_ANALYSIS", label: "" },
    });
  };

  const openFromSurgeryOrSsi = (
    id: string,
    date: string,
    label: string,
    criteriaKey?: string,
  ) => {
    if (!isSsiIndexCriteriaKey(criteriaKey)) {
      toast.message(
        "Chỉ ngày mổ hoặc TC DOE SSI trong tiêu chuẩn (chảy mủ / mở vết / cấy vết / chẩn đoán BS) mới mở phiên SSI.",
      );
      return;
    }
    openOrCreateSession("SSI", { kind: "TIEU_CHUAN", id, date }, label);
  };

  const applyUpsertRow = (data: Record<string, unknown> | null | undefined) => {
    if (!data?.id || !onTimelineUpsertLocal) {
      onReload();
      return;
    }
    onTimelineUpsertLocal({
      id: String(data.id),
      milestone_kind: String(data.milestone_kind || ""),
      milestone_date: String(data.milestone_date || "").slice(0, 10),
      title: String(data.title || ""),
      detail: data.detail != null ? String(data.detail) : null,
      specimen_hint: data.specimen_hint != null ? String(data.specimen_hint) : null,
      criteria_key: data.criteria_key != null ? String(data.criteria_key) : null,
    });
  };

  /** Tick CĐHA: chọn = thêm, bỏ chọn = xóa theo khóa (BA+ngày+criteria) — không mở form phân tích. */
  const toggleCdha = async (
    date: string,
    criteriaKey: string,
    title: string,
    milestoneKind: string,
  ) => {
    if (!allowedEdit) return;
    const flightKey = `cdha|${date}|${criteriaKey}`;
    if (inFlightRef.current.has(flightKey)) return;
    const existing = cdhaList.find(
      (x) => x.ngay.slice(0, 10) === date && (x.tieu_chuan_key || "imaging_chest") === criteriaKey,
    );
    if (existing) {
      // Untick: bỏ local ngay + soft-delete TẤT CẢ bản cùng khóa (chống XQ hiện lại)
      inFlightRef.current.add(flightKey);
      setLocalCdha((p) => p.filter((x) => cdhaKey(x) !== `${date}|${criteriaKey}`));
      onTimelineRemoveLocal?.(existing.id);
      // Xóa luôn các id khác cùng khóa còn trong timeline (dữ liệu trùng cũ)
      for (const c of split.cdha) {
        if (
          c.ngay.slice(0, 10) === date &&
          (c.tieu_chuan_key || "imaging_chest") === criteriaKey &&
          c.id !== existing.id
        ) {
          onTimelineRemoveLocal?.(c.id);
        }
      }
      const res = await softDeleteNkbvBaTimelineByKey({
        ma_benh_an: maBenhAn,
        milestone_date: date,
        criteria_key: criteriaKey,
      });
      inFlightRef.current.delete(flightKey);
      if (!res.success) {
        toast.error(res.error || "Không xóa được CĐHA");
        onReload();
      }
      return;
    }
    inFlightRef.current.add(flightKey);
    const localId = `local-cdha-${date}-${criteriaKey}`;
    setLocalCdha((p) => [
      ...p.filter((x) => cdhaKey(x) !== `${date}|${criteriaKey}`),
      {
        id: localId,
        ngay: date,
        loai: criteriaKey.includes("abscess") ? "CT" : "XQ",
        mo_ta_benh_ly: title,
        tieu_chuan_key: criteriaKey as BaGridCdhaCell["tieu_chuan_key"],
      },
    ]);
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: milestoneKind,
      milestone_date: date,
      title,
      criteria_key: criteriaKey as never,
    });
    inFlightRef.current.delete(flightKey);
    if (!res.success) {
      setLocalCdha((p) => p.filter((x) => x.id !== localId));
      toast.error(res.error || "Chưa lưu CĐHA");
      return;
    }
    setLocalCdha((p) => p.filter((x) => x.id !== localId));
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const editCdhaDate = async (id: string, nextDate: string) => {
    if (!allowedEdit || !id || id.startsWith("local-")) return;
    const cell = cdhaList.find((x) => x.id === id);
    if (!cell) return;
    const res = await upsertNkbvBaTimelineMilestone({
      id,
      ma_benh_an: maBenhAn,
      milestone_kind: "IMAGING_CHEST",
      milestone_date: nextDate,
      title: cell.mo_ta_benh_ly || "CĐHA",
      criteria_key: (cell.tieu_chuan_key || "imaging_chest") as never,
    });
    if (!res.success) toast.error(res.error || "Không sửa ngày CĐHA");
    else applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const addSurgery = async (date: string) => {
    if (!allowedEdit) return;
    if ((split.surgeryByDate[date] || []).length) {
      // Đã có ngày mổ — chỉ neo Index khi user bấm chip, không tự mở lại
      return;
    }
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: "PROCEDURE_SURGERY",
      milestone_date: date,
      title: "Ngày phẫu thuật (Day 1 SP)",
      criteria_key: "procedure_surgery",
    });
    if (!res.success) {
      toast.error(res.error || "Chưa lưu ngày mổ");
      return;
    }
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const removeMilestone = async (id: string | undefined) => {
    if (!allowedEdit || !id || id.startsWith("local-")) return;
    onTimelineRemoveLocal?.(id);
    const res = await softDeleteNkbvBaTimelineMilestone(id);
    if (!res.success) {
      toast.error(res.error || "Không xóa được");
      onReload();
    }
  };

  const toggleSsiTc = async (date: string, criteriaKey: string, title: string) => {
    if (!allowedEdit) return;
    const flightKey = `ssi|${date}|${criteriaKey}`;
    if (inFlightRef.current.has(flightKey)) return;
    const existing =
      (split.tieuChuanChuyenBietByDate[date] || []).find((x) => x.key === criteriaKey) ||
      localSsiTc.find((x) => x.ngay === date && x.key === criteriaKey);
    if (existing) {
      inFlightRef.current.add(flightKey);
      setLocalSsiTc((p) => p.filter((x) => !(x.ngay === date && x.key === criteriaKey)));
      if (existing.id) onTimelineRemoveLocal?.(existing.id);
      const res = await softDeleteNkbvBaTimelineByKey({
        ma_benh_an: maBenhAn,
        milestone_date: date,
        criteria_key: criteriaKey,
      });
      inFlightRef.current.delete(flightKey);
      if (!res.success) {
        toast.error(res.error || "Không xóa được TC SSI");
        onReload();
      }
      return;
    }
    inFlightRef.current.add(flightKey);
    const localId = `local-ssi-${date}-${criteriaKey}`;
    setLocalSsiTc((p) => [
      ...p.filter((x) => !(x.ngay === date && x.key === criteriaKey)),
      { id: localId, ngay: date, key: criteriaKey, label: title },
    ]);
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: "SYMPTOM",
      milestone_date: date,
      title,
      criteria_key: criteriaKey as never,
    });
    inFlightRef.current.delete(flightKey);
    if (!res.success) {
      setLocalSsiTc((p) => p.filter((x) => x.id !== localId));
      toast.error(res.error || "Chưa lưu TC SSI");
      return;
    }
    setLocalSsiTc((p) => p.filter((x) => x.id !== localId));
    // Chỉ gắn bằng chứng — không mở bảng phân tích SSI (gây lag)
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const persistPanelLamSang = useCallback(
    async (date: string, criteriaKey: string, title: string, turnOn: boolean) => {
      if (!allowedEdit) return;
      const flightKey = `ls|${date}|${criteriaKey}`;
      if (inFlightRef.current.has(flightKey)) return;
      // TC SSI chẩn đoán nằm ở giỏ tieuChuanChuyenBiet, LS hội chứng ở trieuChungLamSang
      const existing =
        (split.trieuChungLamSangByDate[date] || []).find((x) => x.key === criteriaKey) ||
        (split.tieuChuanChuyenBietByDate[date] || []).find((x) => x.key === criteriaKey);
      if (!turnOn) {
        inFlightRef.current.add(flightKey);
        if (existing?.id) onTimelineRemoveLocal?.(existing.id);
        const res = await softDeleteNkbvBaTimelineByKey({
          ma_benh_an: maBenhAn,
          milestone_date: date,
          criteria_key: criteriaKey,
        });
        inFlightRef.current.delete(flightKey);
        if (!res.success) {
          toast.error(res.error || "Không xóa được");
          onReload();
        }
        return;
      }
      if (turnOn && !existing) {
        inFlightRef.current.add(flightKey);
        const res = await upsertNkbvBaTimelineMilestone({
          ma_benh_an: maBenhAn,
          milestone_kind: "SYMPTOM",
          milestone_date: date,
          title,
          criteria_key: criteriaKey as never,
        });
        inFlightRef.current.delete(flightKey);
        if (!res.success) toast.error(res.error || "Chưa lưu LS lên BA");
        else if (res.data?.id && onTimelineUpsertLocal) {
          onTimelineUpsertLocal({
            id: String(res.data.id),
            milestone_kind: String(
              (res.data as { milestone_kind?: string }).milestone_kind || "SYMPTOM",
            ),
            milestone_date: date,
            title,
            criteria_key: criteriaKey,
          });
        } else onReload();
      }
    },
    [
      allowedEdit,
      split.trieuChungLamSangByDate,
      split.tieuChuanChuyenBietByDate,
      maBenhAn,
      onReload,
      onTimelineUpsertLocal,
      onTimelineRemoveLocal,
    ],
  );

  // Handler ổn định cho các hàng memo — không phá memo vì closure mới mỗi render
  const stableOpenFromXn = useStableCallback(openFromXn);
  const stableOpenFromCdha = useStableCallback(openFromCdha);
  const stableToggleCdha = useStableCallback(toggleCdha);
  const stableEditCdhaDate = useStableCallback(editCdhaDate);
  const stableRemoveMilestone = useStableCallback(removeMilestone);
  const stableAddSurgery = useStableCallback(addSurgery);
  const stableToggleSsiTc = useStableCallback(toggleSsiTc);
  const stableOpenFromSurgeryOrSsi = useStableCallback(openFromSurgeryOrSsi);

  /** Mở phiên từ gợi ý Index đúng domain (không neo XN đầu bất kỳ). */
  const openFromSuggestion = (s: SessionIndexSuggestion) => {
    if (isManual) {
      openOrCreateSession(s.panel, s.index, s.label, {
        eventDisposition: { kind: "NEW_ANALYSIS", label: "" },
        ketLuan: "",
      });
      return;
    }
    const xnCell = split.xn.find((x) => x.id === s.index.id);
    const specimen =
      xnCell?.benh_pham ||
      (s.panel === "UTI" ? "Nước tiểu" : s.panel === "BSI" ? "Máu" : "Đờm");
    const disp = resolveIndexEventDisposition({
      indexId: s.index.id,
      indexDate: s.index.date,
      specimenOrLabel: specimen,
      organism: xnCell?.vi_khuan,
      isImaging: s.index.kind === "CDHA",
      priorEvents,
      openSiteSessions: openSiteSessionsForSbap,
      analysisDispositions: mergedDispositions,
    });
    if (disp.kind === "CLOSED_INSUFFICIENT") {
      toast.message(disp.ketLuanLabel);
      return;
    }
    if (disp.kind === "BELONGS_PRIOR_EVENT") {
      toast.message(disp.ketLuanLabel);
      return;
    }
    if (disp.kind === "SECONDARY_BSI") {
      applySecondaryBsiVeto({
        sampleId: s.index.id,
        sampleDate: s.index.date,
        ketLuanLabel: disp.ketLuanLabel,
        sites: disp.sites,
      });
      return;
    }
    const sampleMajor = resolveNkbvMajorType({
      loai_benh_pham: specimen,
      loai_ma: s.panel,
    });
    const sessionHit = resolveBelongsOpenSessionByDate({
      sampleId: s.index.id,
      sampleDate: s.index.date,
      sampleMajor,
      sessions: sessions.map((sess) => ({
        id: sess.id,
        panel: sess.panel,
        index: sess.index,
        indexLabel: sess.indexLabel,
        doe: sess.draft.nsk || null,
        eventEstablished: Boolean(sess.draft.eventEstablished),
      })),
    });
    if (sessionHit) {
      const ownerId = String(sessionHit.priorEventId || "").replace(/^session:/, "");
      const owner = sessions.find((sess) => sess.index.id === ownerId);
      if (owner) {
        const prev = owner.draft.ritAttributedIds || [];
        if (!prev.includes(s.index.id)) {
          patchDraft(owner.id, { ritAttributedIds: [...prev, s.index.id] });
        }
        setOpenSessionId(owner.id);
      }
      toast.message(sessionHit.ketLuanLabel);
      return;
    }
    openOrCreateSession(s.panel, s.index, s.label, {
      eventDisposition: { kind: "NEW_ANALYSIS", label: "" },
    });
  };

  const removeSession = (
    sessionId: string,
    opts?: { clearConclusions?: boolean },
  ) => {
    const clearKl = opts?.clearConclusions !== false;
    const victim = sessions.find((s) => s.id === sessionId) || null;
    if (clearKl && victim) {
      const owned = sampleIdsOwnedByAnalysisSession(victim);
      const before = sampleConclusions;
      const nextConclusions = removeBaSampleConclusionsMany(maBenhAn, owned);
      setSampleConclusions(nextConclusions);
      // DB: chỉ gỡ KHONG_DU_TC trên XN thuộc phiên (không đụng BO_QUA / phiếu đã tạo)
      const ownedKeys = new Set(owned.map((id) => normalizeSampleId(id)));
      for (const row of before) {
        if (row.disposition !== "KHONG_DU_TC") continue;
        if (row.kind !== "XN") continue;
        if (!ownedKeys.has(normalizeSampleId(row.sampleId))) continue;
        const bare =
          bareViSinhIdFromMilestoneId(row.sampleId) ||
          row.sampleId.replace(/^lis:/, "");
        if (!bare) continue;
        void onClearViSinhDisposition?.({ viSinhId: bare });
      }
      if (owned.length) {
        toast.message("Đã xóa phiên và gỡ kết luận mẫu gắn với phiên này.");
      }
    }
    const next = removeBaAnalysisSession(maBenhAn, sessionId, analysisMode);
    setSessions(next);
    if (openSessionId === sessionId) setOpenSessionId(null);
  };

  const closeInsufficient = () => {
    if (!openSession) return;
    const sid = openSession.id;
    const indexDate = openSession.index.date.slice(0, 10);
    const label = khongDuTcKetLuanLabel(indexDate);
    // Neo sổ local ngay — cột Kết luận vẫn hiện khi mở PT Index tiếp theo
    const nextConclusions = upsertBaSampleConclusion(maBenhAn, {
      sampleId: openSession.index.id,
      date: indexDate,
      kind: openSession.index.kind === "CDHA" ? "CDHA" : "XN",
      disposition: "KHONG_DU_TC",
      label,
    });
    setSampleConclusions(nextConclusions);
    if (openSession.index.kind === "XN") {
      const bare =
        bareViSinhIdFromMilestoneId(openSession.index.id) ||
        openSession.index.id.replace(/^lis:/, "");
      onMarkKhongDuTc?.({
        viSinhId: bare,
        indexDate,
      });
    } else {
      toast.message(label);
    }
    // Giữ KL «không đủ TC» — chỉ đóng nháp bảng
    removeSession(sid, { clearConclusions: false });
  };

  return (
    <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-2 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 text-[11px]">
        <span className="font-semibold text-slate-800">Bảng BA dọc (hàng = ngày)</span>
        <span className="text-slate-500">
          Cột chung gọn + cột phân tích cùng hàng (trượt ngang). Highlight theo cột: IPW / RIT / SBAP
        </span>
        <span className="inline-flex flex-wrap items-center gap-1.5 text-slate-600" title="Chú thích màu mốc thời gian">
          <span className="rounded bg-amber-200 px-1.5 py-0.5 font-semibold text-amber-950">Ngày X</span>
          <span className="rounded bg-rose-100 px-1.5 py-0.5 font-semibold text-rose-800">IPW</span>
          <span className="rounded bg-red-300 px-1.5 py-0.5 font-bold text-red-950">DOE</span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-900">RIT</span>
          <span className="rounded bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-900">SBAP</span>
        </span>
        <div
          className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5"
          title="Theo CDC: máy gợi ý kết luận. Tự phân tích: bạn tự viết kết luận."
        >
          <button
            type="button"
            className={`rounded-full px-2.5 py-1 font-semibold ${
              !isManual
                ? "bg-[var(--primary)] text-white"
                : "text-slate-600 hover:bg-white"
            }`}
            onClick={() => switchAnalysisMode("CDC")}
          >
            Theo CDC
          </button>
          <button
            type="button"
            className={`rounded-full px-2.5 py-1 font-semibold ${
              isManual
                ? "bg-violet-700 text-white"
                : "text-slate-600 hover:bg-white"
            }`}
            onClick={() => switchAnalysisMode("MANUAL")}
          >
            Tự phân tích
          </button>
        </div>
        {isManual ? (
          <span className="rounded bg-violet-50 px-2 py-0.5 font-semibold text-violet-900">
            Tự phân tích — kết luận do bạn nhập
          </span>
        ) : null}
        <label className="ml-auto flex items-center gap-1 text-slate-600">
          <input
            type="checkbox"
            checked={preferVae}
            onChange={(e) => setPreferVae(e.target.checked)}
          />
          Hô hấp → ưu tiên VAE
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {!sessionSuggestions.length ? (
          <p className="mt-3 text-xs text-slate-500">
            Chưa có Index để mở phiên — nạp XN vi sinh, thêm CĐHA, ngày mổ hoặc TC DOE SSI trên bảng
            chung (hoặc bấm chip trên lưới).
          </p>
        ) : null}

        <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="shrink-0 font-semibold text-slate-600">Gợi ý phiên (theo Index):</span>
            {!sessionSuggestions.length ? (
              <span className="text-slate-400">—</span>
            ) : (
              sessionSuggestions.map((s) => {
                const opened = sessions.some((x) => x.id === s.id);
                const active = s.id === openSessionId;
                const bloodInSiteSbap =
                  s.panel === "BSI" &&
                  shouldDeferPrimaryBsi({
                    selectedSpecimenPanel: "BSI",
                    bloodDate: s.index.date,
                    establishedSiteSbaps,
                  });
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openFromSuggestion(s)}
                    className={`rounded-full border px-2.5 py-1 font-semibold ${
                      bloodInSiteSbap
                        ? "border-amber-200 bg-amber-50/70 text-amber-900/80"
                        : active
                          ? "border-rose-400 bg-rose-50 text-rose-900"
                          : opened
                            ? "border-emerald-300 bg-emerald-50/80 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    title={
                      bloodInSiteSbap
                        ? "Máu ∈ SBAP ổ tại chỗ — bấm để rà Secondary trước; chỉ Primary khi không khớp/loại trừ"
                        : `${s.source} → ${s.panel}`
                    }
                  >
                    {s.panel} · {s.label}
                    {bloodInSiteSbap ? " · rà SBAP" : ""}
                    {opened && !active && !bloodInSiteSbap ? " · đã mở" : ""}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="shrink-0 font-semibold text-slate-600">Đang phân tích:</span>
            {!sessions.length ? (
              <span className="text-slate-400">Chưa mở phiên</span>
            ) : (
              sessions.map((s) => {
                const active = s.id === openSessionId;
                return (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${
                      active
                        ? "border-rose-400 bg-rose-50 text-rose-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <button type="button" onClick={() => setOpenSessionId(s.id)} title="Mở lại phiên">
                      {formatSessionChipLabel(s)}
                    </button>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-rose-600"
                      title="Xóa phiên nháp"
                      onClick={() => removeSession(s.id)}
                    >
                      ×
                    </button>
                  </span>
                );
              })
            )}
            <span className="ml-auto text-[11px] text-slate-400">
              Chỉ từ XN / CĐHA / TC DOE SSI — phiếu khi bấm «Tạo phiếu»
            </span>
          </div>
        </div>


        {openSession &&
        (openSession.panel === "UTI" ||
          openSession.panel === "PNEU" ||
          openSession.panel === "BSI") ? (
          <NkbvSyndromeIwpPanel
            panel={openSession.panel}
            maBenhAn={maBenhAn}
            ngayVaoVien={ngayVaoVien}
            ngayRaVien={ngayRaVien}
            ngaySinh={ngaySinh}
            columns={panelColumns}
            index={openSession.index}
            xn={split.xn}
            cdha={cdhaList}
            baCanThiepDates={canThiepDatesForPanel(
              split.deviceByDate,
              openSession.panel,
            )}
            defaultKhoa={defaultKhoa}
            allowedEdit={allowedEdit}
            draft={openSession.draft}
            baLamSangByDate={baClinicalLamSang}
            priorEvents={priorEvents}
            openSiteSessions={openSiteSessionsForSbap}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            onPersistLamSang={(date, key, label, on) =>
              void persistPanelLamSang(date, key, label, on)
            }
            analysisDispositions={mergedDispositions}
            sampleConclusions={sampleConclusions}
            analysisMode={analysisMode}
            onManualSampleConclude={persistManualSampleConclusion}
            onManualSampleClear={(p) => clearManualSampleConclusion(p.indexId)}
            onClose={() => setOpenSessionId(null)}
            onCloseInsufficient={closeInsufficient}
            onConfirmSecondaryBlood={(payload) => {
              if (isManual) return;
              applySecondaryBsiVeto({
                sampleId: payload.sampleId,
                sampleDate: payload.date,
                ketLuanLabel: payload.label,
                sites: [],
              });
            }}
            onOpenPrimaryBsi={(bloodId) => {
              const b = split.xn.find((x) => x.id === bloodId);
              if (!b) return;
              if (isManual) {
                openOrCreateSession(
                  "BSI",
                  { kind: "XN", id: b.id, date: b.ngay },
                  [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                  { eventDisposition: { kind: "NEW_ANALYSIS", label: "" }, ketLuan: "" },
                );
                return;
              }
              const site = openSession;
              const disp = resolveIndexEventDisposition({
                indexId: b.id,
                indexDate: b.ngay,
                specimenOrLabel: b.benh_pham,
                organism: b.vi_khuan,
                priorEvents,
                openSiteSessions: openSiteSessionsForSbap,
                analysisDispositions: mergedDispositions,
              });
              if (disp.kind === "SECONDARY_BSI") {
                applySecondaryBsiVeto({
                  sampleId: b.id,
                  sampleDate: b.ngay,
                  ketLuanLabel: disp.ketLuanLabel,
                  sites: disp.sites,
                });
                return;
              }
              if (disp.kind === "BELONGS_PRIOR_EVENT" || disp.kind === "CLOSED_INSUFFICIENT") {
                toast.message(disp.ketLuanLabel);
                return;
              }
              openOrCreateSession(
                "BSI",
                { kind: "XN", id: b.id, date: b.ngay },
                [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                site.panel !== "BSI"
                  ? {
                      bsiLocalizedSite: {
                        majorType: site.panel as "UTI" | "PNEU" | "SSI" | "VAE",
                        criteriaMet: Boolean(site.draft.eventEstablished),
                        siteOrganism:
                          split.xn.find((x) => x.id === site.index.id)?.vi_khuan ||
                          null,
                        siteIndexDate: site.index.date.slice(0, 10),
                        siteDoe: (site.draft.nsk || site.index.date).slice(0, 10),
                      },
                    }
                  : undefined,
              );
            }}
          >
            {({ analysisColumns }) => {
              const slots = analysisSlotsForPanel(analysisColumns, openSession.panel);
              return (
              <NkbvBaCommonDayGrid
                days={commonColumns}
                xnByDate={xnByDate}
                cdhaByDate={cdhaByDate}
                ssiTcByDate={ssiTcByDate}
                surgeryByDate={split.surgeryByDate}
                foleyOnDate={foleyOnDate}
                ventOnDate={ventOnDate}
                cvcOnDate={cvcOnDate}
                ngayVaoVien={ngayVaoVien}
                ngayRaVien={ngayRaVien}
                statusById={xnStatusById}
                activeXnId={
                  openSession.index.kind === "XN" ? openSession.index.id : null
                }
                cdhaCatalog={cdhaCatalog}
                ssiTcCatalog={ssiTcCatalog}
                allowedEdit={allowedEdit}
                defaultKhoa={defaultKhoa || ""}
                windowColumns={slots.windowColumns}
                tailColumns={slots.tailColumns}
                onPickXn={stableOpenFromXn}
                onToggleDevice={allowedEdit ? (d, k) => void toggleDevice(d, k) : undefined}
                onAddXn={allowedEdit ? setAddXnDate : undefined}
                onOpenCdha={stableOpenFromCdha}
                onRemoveMilestone={stableRemoveMilestone}
                onEditCdhaDate={stableEditCdhaDate}
                onToggleCdha={stableToggleCdha}
                onOpenSurgeryOrSsi={stableOpenFromSurgeryOrSsi}
                onAddSurgery={stableAddSurgery}
                onToggleSsiTc={stableToggleSsiTc}
              />
              );
            }}
          </NkbvSyndromeIwpPanel>
        ) : openSession && openSession.panel === "SSI" ? (
          <NkbvSyndromeSsiPanel
            columns={panelColumns}
            index={openSession.index}
            indexLabel={openSession.indexLabel}
            ngayVaoVien={ngayVaoVien}
            xn={split.xn}
            cdha={cdhaList}
            surgeryByDate={split.surgeryByDate}
            tieuChuanByDate={split.tieuChuanChuyenBietByDate}
            baLamSangByDate={baClinicalLamSang}
            draft={openSession.draft}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            onPersistSsiTc={(date, key, label, on) =>
              void persistPanelLamSang(date, key, label, on)
            }
            allowedEdit={allowedEdit}
            analysisDispositions={mergedDispositions}
            sampleConclusions={sampleConclusions}
            analysisMode={analysisMode}
            onManualSampleConclude={persistManualSampleConclusion}
            onManualSampleClear={(p) => clearManualSampleConclusion(p.indexId)}
            priorEvents={priorEvents}
            openSiteSessions={openSiteSessionsForSbap}
            onClose={() => setOpenSessionId(null)}
            onCloseInsufficient={closeInsufficient}
            onConfirmSecondaryBlood={(payload) => {
              if (isManual) return;
              applySecondaryBsiVeto({
                sampleId: payload.sampleId,
                sampleDate: payload.date,
                ketLuanLabel: payload.label,
                sites: [],
              });
            }}
            onOpenPrimaryBsi={(bloodId) => {
              const b = split.xn.find((x) => x.id === bloodId);
              if (!b) return;
              if (isManual) {
                openOrCreateSession(
                  "BSI",
                  { kind: "XN", id: b.id, date: b.ngay },
                  [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                  { eventDisposition: { kind: "NEW_ANALYSIS", label: "" }, ketLuan: "" },
                );
                return;
              }
              const disp = resolveIndexEventDisposition({
                indexId: b.id,
                indexDate: b.ngay,
                specimenOrLabel: b.benh_pham,
                organism: b.vi_khuan,
                priorEvents,
                openSiteSessions: openSiteSessionsForSbap,
                analysisDispositions: mergedDispositions,
              });
              if (disp.kind === "SECONDARY_BSI") {
                applySecondaryBsiVeto({
                  sampleId: b.id,
                  sampleDate: b.ngay,
                  ketLuanLabel: disp.ketLuanLabel,
                  sites: disp.sites,
                });
                return;
              }
              if (disp.kind === "BELONGS_PRIOR_EVENT" || disp.kind === "CLOSED_INSUFFICIENT") {
                toast.message(disp.ketLuanLabel);
                return;
              }
              openOrCreateSession(
                "BSI",
                { kind: "XN", id: b.id, date: b.ngay },
                [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                {
                  bsiLocalizedSite: {
                    majorType: "SSI",
                    criteriaMet: Boolean(openSession.draft.eventEstablished),
                    siteOrganism: null,
                    siteIndexDate: openSession.index.date.slice(0, 10),
                    siteDoe: openSession.index.date.slice(0, 10),
                  },
                },
              );
            }}
          >
            {({ analysisColumns }) => {
              const slots = analysisSlotsForPanel(analysisColumns, openSession.panel);
              return (
              <NkbvBaCommonDayGrid
                days={commonColumns}
                xnByDate={xnByDate}
                cdhaByDate={cdhaByDate}
                ssiTcByDate={ssiTcByDate}
                surgeryByDate={split.surgeryByDate}
                foleyOnDate={foleyOnDate}
                ventOnDate={ventOnDate}
                cvcOnDate={cvcOnDate}
                ngayVaoVien={ngayVaoVien}
                ngayRaVien={ngayRaVien}
                statusById={xnStatusById}
                activeXnId={null}
                cdhaCatalog={cdhaCatalog}
                ssiTcCatalog={ssiTcCatalog}
                allowedEdit={allowedEdit}
                defaultKhoa={defaultKhoa || ""}
                windowColumns={slots.windowColumns}
                tailColumns={slots.tailColumns}
                onPickXn={stableOpenFromXn}
                onToggleDevice={allowedEdit ? (d, k) => void toggleDevice(d, k) : undefined}
                onAddXn={allowedEdit ? setAddXnDate : undefined}
                onOpenCdha={stableOpenFromCdha}
                onRemoveMilestone={stableRemoveMilestone}
                onEditCdhaDate={stableEditCdhaDate}
                onToggleCdha={stableToggleCdha}
                onOpenSurgeryOrSsi={stableOpenFromSurgeryOrSsi}
                onAddSurgery={stableAddSurgery}
                onToggleSsiTc={stableToggleSsiTc}
              />
              );
            }}
          </NkbvSyndromeSsiPanel>
        ) : openSession && isShellPanel(openSession.panel) ? (
          <NkbvSyndromeShellPanel
            panel={openSession.panel}
            columns={panelColumns}
            index={openSession.index}
            indexLabel={openSession.indexLabel}
            draft={openSession.draft}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            allowedEdit={allowedEdit}
            xn={split.xn}
            cdha={cdhaList}
            analysisDispositions={mergedDispositions}
            sampleConclusions={sampleConclusions}
            analysisMode={analysisMode}
            onManualSampleConclude={persistManualSampleConclusion}
            onManualSampleClear={(p) => clearManualSampleConclusion(p.indexId)}
            priorEvents={priorEvents}
            openSiteSessions={openSiteSessionsForSbap}
            onClose={() => setOpenSessionId(null)}
          >
            {({ analysisColumns }) => {
              const slots = analysisSlotsForPanel(analysisColumns, openSession.panel);
              return (
              <NkbvBaCommonDayGrid
                days={commonColumns}
                xnByDate={xnByDate}
                cdhaByDate={cdhaByDate}
                ssiTcByDate={ssiTcByDate}
                surgeryByDate={split.surgeryByDate}
                foleyOnDate={foleyOnDate}
                ventOnDate={ventOnDate}
                cvcOnDate={cvcOnDate}
                ngayVaoVien={ngayVaoVien}
                ngayRaVien={ngayRaVien}
                statusById={xnStatusById}
                activeXnId={
                  openSession.index.kind === "XN" ? openSession.index.id : null
                }
                cdhaCatalog={cdhaCatalog}
                ssiTcCatalog={ssiTcCatalog}
                allowedEdit={allowedEdit}
                defaultKhoa={defaultKhoa || ""}
                windowColumns={slots.windowColumns}
                tailColumns={slots.tailColumns}
                onPickXn={stableOpenFromXn}
                onToggleDevice={allowedEdit ? (d, k) => void toggleDevice(d, k) : undefined}
                onAddXn={allowedEdit ? setAddXnDate : undefined}
                onOpenCdha={stableOpenFromCdha}
                onRemoveMilestone={stableRemoveMilestone}
                onEditCdhaDate={stableEditCdhaDate}
                onToggleCdha={stableToggleCdha}
                onOpenSurgeryOrSsi={stableOpenFromSurgeryOrSsi}
                onAddSurgery={stableAddSurgery}
                onToggleSsiTc={stableToggleSsiTc}
              />
              );
            }}
          </NkbvSyndromeShellPanel>
        ) : (
          <NkbvBaCommonDayGrid
            days={commonColumns}
            xnByDate={xnByDate}
            cdhaByDate={cdhaByDate}
            ssiTcByDate={ssiTcByDate}
            surgeryByDate={split.surgeryByDate}
            foleyOnDate={foleyOnDate}
            ventOnDate={ventOnDate}
            cvcOnDate={cvcOnDate}
            ngayVaoVien={ngayVaoVien}
            ngayRaVien={ngayRaVien}
            statusById={xnStatusById}
            activeXnId={null}
            cdhaCatalog={cdhaCatalog}
            ssiTcCatalog={ssiTcCatalog}
            allowedEdit={allowedEdit}
            defaultKhoa={defaultKhoa || ""}
            windowColumns={[]}
            tailColumns={closedGridConcludeColumns}
            onToggleDevice={allowedEdit ? (d, k) => void toggleDevice(d, k) : undefined}
            onPickXn={stableOpenFromXn}
            onAddXn={allowedEdit ? setAddXnDate : undefined}
            onOpenCdha={stableOpenFromCdha}
            onRemoveMilestone={stableRemoveMilestone}
            onEditCdhaDate={stableEditCdhaDate}
            onToggleCdha={stableToggleCdha}
            onOpenSurgeryOrSsi={stableOpenFromSurgeryOrSsi}
            onAddSurgery={stableAddSurgery}
            onToggleSsiTc={stableToggleSsiTc}
          />
        )}

        {addXnDate ? (
          <NkbvBaAddViSinhModal
            key={addXnDate}
            open
            onClose={() => setAddXnDate(null)}
            maBenhAn={maBenhAn}
            ngayLayMau={addXnDate}
            maBenhNhan={maBenhNhan}
            hoTen={hoTen}
            ngayVaoVien={ngayVaoVien}
            defaultKhoaId={khoaId}
            khoas={khoas}
            onCreated={() => onReload()}
          />
        ) : null}

        {openSession && allowedEdit ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 px-1 pt-2">
            {(() => {
              const dispKind = openSession.draft.eventDisposition?.kind;
              const manualKl = String(openSession.draft.ketLuan || "").trim();
              // BELONGS = không tạo phiếu mới; Secondary BSI vẫn cho tạo phiếu quy kết
              const blockCreate = !isManual && dispKind === "BELONGS_PRIOR_EVENT";
              const vaeReady =
                openSession.panel !== "VAE" ||
                (isManual
                  ? Boolean(manualKl)
                  : vaeBaReadyToCreatePhieu(openSession.draft));
              const canCreate = isManual
                ? Boolean(manualKl) && !blockCreate
                : !blockCreate &&
                  vaeReady &&
                  (Boolean(openSession.draft.eventEstablished) ||
                    dispKind === "SECONDARY_BSI" ||
                    (openSession.panel === "VAE" && vaeReady));
              return (
                <>
            {canCreate || blockCreate || openSession.panel === "VAE" || isManual ? (
            <button
              type="button"
              disabled={blockCreate || !canCreate}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold text-white ${
                blockCreate || !canCreate
                  ? "cursor-not-allowed bg-slate-400"
                  : "bg-[var(--primary)]"
              }`}
              title={
                blockCreate
                  ? "Đã thuộc sự kiện trước — không tạo phiếu phân tích mới"
                  : isManual && !manualKl
                    ? "Nhập kết luận sự kiện trước khi tạo phiếu"
                    : openSession.panel === "VAE" && !vaeReady
                      ? "Nhập VAC / IVAC / PVAP ở cột kết luận trước khi tạo phiếu"
                      : isManual
                        ? "Tạo phiếu với kết luận bạn đã nhập"
                        : "Tạo phiếu khi đã đủ TC sự kiện — gom XN ∈ RIT/SBAP"
              }
              onClick={() => {
                if (blockCreate) {
                  toast.message("Đã thuộc sự kiện trước — không tạo phiếu mới.");
                  return;
                }
                if (isManual && !manualKl) {
                  toast.message("Tự phân tích: nhập kết luận sự kiện trước khi tạo phiếu.");
                  return;
                }
                if (!isManual && openSession.panel === "VAE" && !vaeReady) {
                  toast.message(
                    "VAE: ghi VAC / IVAC / PVAP ở kết luận Index trước khi tạo phiếu (bảng vent trên form).",
                  );
                  return;
                }
                if (
                  !isManual &&
                  !(
                    openSession.draft.eventEstablished ||
                    dispKind === "SECONDARY_BSI" ||
                    (openSession.panel === "VAE" && vaeReady)
                  )
                ) {
                  toast.message("Chưa đủ tiêu chuẩn cấu thành sự kiện — không tạo phiếu.");
                  return;
                }
                const nghi =
                  openSession.panel === "PNEU" ||
                  openSession.panel === "BSI" ||
                  openSession.panel === "UTI" ||
                  openSession.panel === "SSI" ||
                  openSession.panel === "VAE"
                    ? (openSession.panel as BaGridNghiNgo)
                    : ("BSI" as BaGridNghiNgo);
                const canThiep = canThiepDatesForPanel(
                  split.deviceByDate,
                  openSession.panel,
                );
                // LS BA ∩ draft — triệu chứng timeline trong IWP vẫn cấu thành sự kiện
                const mergedLamSang = mergeLamSangByDate(
                  baClinicalLamSang,
                  openSession.draft.lamSang,
                );
                const session = computeBaGridSession({
                  ngayVaoVien,
                  ngayRaVien,
                  xn: split.xn,
                  cdha: cdhaList,
                  activeIndex: openSession.index,
                  nghiNgo: nghi,
                  symptomDates: {},
                  tieuChuanByDate: mergedLamSang,
                  trieuChungLamSangByDate: mergedLamSang,
                  khoaByDate: defaultKhoa
                    ? { [openSession.index.date.slice(0, 10)]: defaultKhoa }
                    : {},
                  canThiepDates: canThiep,
                  criteriaMetPreview: true,
                });
                const majorType = resolveNkbvMajorType({
                  loai_ma: openSession.panel,
                });
                const attributed = session.nsk
                  ? attributeWithinRit({
                      nsk: session.nsk,
                      majorType:
                        majorType === "OTHER"
                          ? (openSession.panel as typeof majorType)
                          : majorType,
                      xn: split.xn,
                      cdha: cdhaList,
                      activeIndexId: openSession.index.id,
                    })
                  : { attributedXnIds: [] as string[] };
                const secondary =
                  !isManual &&
                  session.nsk &&
                  session.metrics?.sbap_start &&
                  session.metrics?.sbap_end &&
                  (openSession.panel === "UTI" ||
                    openSession.panel === "PNEU" ||
                    openSession.panel === "SSI")
                    ? detectSecondaryBsiFromSbap({
                        primarySite:
                          openSession.panel === "SSI" ? "SSI" : openSession.panel,
                        sbapStart: session.metrics.sbap_start,
                        sbapEnd: session.metrics.sbap_end,
                        xn: split.xn,
                        primaryOrganisms: (session.ketLuan?.tac_nhan || "")
                          .split(";")
                          .map((s) => s.trim())
                          .filter(Boolean),
                        bloodMandatoryIds: openSession.draft.bloodCriterionIds,
                      })
                    : null;

                const ritAttributedIds = Array.from(
                  new Set([
                    ...attributed.attributedXnIds,
                    ...(openSession.draft.ritAttributedIds || []),
                    ...(secondary?.matchedBloodIds || []),
                    ...(openSession.draft.bloodCriterionIds || []),
                  ]),
                );
                const draftForSeed: BaAnalysisSessionDraft = {
                  ...openSession.draft,
                  lamSang: mergedLamSang,
                  ritAttributedIds,
                  canThiepDates: canThiep,
                  eventEstablished: true,
                  analysisMode,
                  ketLuan: isManual ? manualKl : openSession.draft.ketLuan,
                };
                patchDraft(openSession.id, { ritAttributedIds, canThiepDates: canThiep });

                const { rit_labs, sbap_labs } = buildBaSeedLabs({
                  xn: split.xn,
                  indexId: openSession.index.id,
                  attributedXnIds: ritAttributedIds,
                  secondaryBloodIds: secondary?.matchedBloodIds || [],
                  sbapDates: session.sbapDates,
                });

                const analysisSeed: NkbvBaAnalysisSeedInput = {
                  panel: openSession.panel,
                  draft: draftForSeed,
                  indexKind: openSession.index.kind,
                  nsk: session.nsk,
                  isSecondaryBsi: Boolean(
                    !isManual &&
                      (session.ketLuan?.is_secondary_bsi ||
                        secondary?.isSecondary ||
                        dispKind === "SECONDARY_BSI"),
                  ),
                  ketLuan: isManual
                    ? manualKl
                    : openSession.draft.ketLuan || session.ketLuan?.summary || null,
                  attributedXnIds: ritAttributedIds,
                  secondaryBloodIds: secondary?.matchedBloodIds || [],
                  windows: session.metrics
                    ? {
                        iwp_start: session.metrics.iwp_start,
                        iwp_end: session.metrics.iwp_end,
                        sbap_start: session.metrics.sbap_start,
                        sbap_end: session.metrics.sbap_end,
                        rit_end: session.metrics.rit_end,
                        doe: session.nsk || session.metrics.doe,
                      }
                    : session.nsk
                      ? {
                          doe: session.nsk,
                          rit_end: clinicalRitEnd(session.nsk),
                        }
                      : null,
                  ritLabs: rit_labs,
                  sbapLabs: sbap_labs,
                  checklistGate:
                    session.checklistType === "VAP" ||
                    session.checklistType === "HAP" ||
                    session.checklistType === "BSI" ||
                    session.checklistType === "UTI" ||
                    session.checklistType === "SSI" ||
                    session.checklistType === "VAE"
                      ? session.checklistType
                      : null,
                };
                onCreatePhieu?.({
                  milestoneId: openSession.index.id,
                  panel: openSession.panel,
                  analysisSeed,
                });
              }}
            >
              {blockCreate ? "Đã phân tích — không tạo phiếu mới" : "Tạo phiếu"}
            </button>
            ) : null}
            {openSession.index.kind === "XN" && !blockCreate ? (
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                onClick={() => {
                  const bare =
                    bareViSinhIdFromMilestoneId(openSession.index.id) ||
                    openSession.index.id;
                  const reason = window.prompt("Lý do bỏ qua XN này (không tạo HAI)?");
                  if (!reason?.trim()) return;
                  onSkipViSinh?.({
                    viSinhId: bare.replace(/^lis:/, ""),
                    reason: reason.trim(),
                  });
                }}
              >
                Bỏ qua XN (có lý do)
              </button>
            ) : null}
            <span className="text-[11px] text-slate-500">
              {blockCreate
                ? "Mẫu đã thuộc sự kiện trước / Secondary — chỉ xem kết luận, không tạo phiếu trùng."
                : isManual
                  ? manualKl
                    ? "Tự phân tích: tạo phiếu với kết luận bạn đã nhập."
                    : "Tự phân tích: gõ kết luận sự kiện ở cột Kết luận (ngày Index) trước."
                  : canCreate
                    ? "Đủ TC: tô RIT/SBAP → Tạo phiếu (gom mẫu cùng loại / máu khớp)."
                    : "Chưa đủ TC: dùng «Đã phân tích xong» trên bảng — không tô RIT; phân tích XN tiếp."}
            </span>
                </>
              );
            })()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
