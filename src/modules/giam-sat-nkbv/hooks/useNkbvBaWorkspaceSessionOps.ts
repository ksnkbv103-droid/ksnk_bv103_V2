"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import type { NkbvBaMultiTimelineWorkspaceProps } from "../components/nkbv-ba-workspace.types";
import { buildGridColumns, splitMilestonesToGridRows, type BaGridActiveIndex, type BaGridCdhaCell } from "../lib/nkbv-ba-grid-engine";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import { collectRitPathogens } from "../lib/nkbv-ket-luan-smart";
import { openSessionsToSecondarySites, priorEventsToSecondarySites, type OpenSiteSessionForSbap, type SecondarySiteHit } from "../lib/nkbv-index-event-disposition";
import { buildSessionIndexSuggestions, siteSbapWindowsFromSites, type SyndromePanelId } from "../lib/nkbv-specimen-syndrome";
import { loadBaAnalysisSessions, pruneBaAnalysisSessions, sessionIdForIndex, updateSessionDraft, upsertBaAnalysisSession, type BaAnalysisSession, type BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import { type BaDayGridColumnDef } from "../components/NkbvBaDayGrid";
import { canThiepDatesForPanel, type BaDeviceByDate } from "../lib/nkbv-ba-device-timeline";
import { filterPanelAnalysisColumns, splitBaAnalysisColumns } from "../lib/nkbv-ba-master-columns";
import { clinicalRitEnd } from "../lib/nkbv-shared-timeline";
import { bareViSinhIdFromMilestoneId, resolveViSinhAnalysisStatus, type ViSinhAnalysisDispositionRow, type ViSinhAnalysisStatus } from "../lib/nkbv-vi-sinh-analysis-status";
import { hydrateLamSangDraftFromBa, mergeLamSangByDate, pickLamSangInDates, provisionalIwpDateSet } from "../lib/nkbv-ba-lam-sang-merge";
import { SSI_DIAGNOSTIC_CRITERIA_KEYS } from "../lib/nkbv-ba-grid-engine";
import { loadBaSampleConclusions, removeBaSampleConclusion, sampleConclusionsToDispositionRows, upsertBaSampleConclusion, type BaSampleConclusion } from "../lib/nkbv-ba-sample-conclusions";
import { type BaAnalysisMode, isManualAnalysisMode } from "../lib/nkbv-ba-analysis-mode";
import { toast } from "sonner";
import type { BaWorkspaceSplit } from "./useNkbvBaWorkspaceGridData";

export type XnCell = ReturnType<typeof splitMilestonesToGridRows>["xn"][number];

export function useNkbvBaWorkspaceSessionOps({
  maBenhAn,
  ngayVaoVien,
  ngayRaVien,
  analysisMode,
  sessions,
  setSessions,
  openSessionId,
  setOpenSessionId,
  sampleConclusions,
  setSampleConclusions,
  hydratedKeyRef,
  split,
  cdhaList,
  ssiTcByDate,
  persistSessions,
  priorEvents,
  analysisDispositions,
  effectivePreferVae,
  onIndexChange,
}: {
  maBenhAn: string;
  ngayVaoVien: string;
  ngayRaVien: NkbvBaMultiTimelineWorkspaceProps["ngayRaVien"];
  analysisMode: BaAnalysisMode;
  sessions: BaAnalysisSession[];
  setSessions: React.Dispatch<React.SetStateAction<BaAnalysisSession[]>>;
  openSessionId: string | null;
  setOpenSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  sampleConclusions: BaSampleConclusion[];
  setSampleConclusions: React.Dispatch<React.SetStateAction<BaSampleConclusion[]>>;
  hydratedKeyRef: React.MutableRefObject<string>;
  split: BaWorkspaceSplit;
  cdhaList: BaGridCdhaCell[];
  ssiTcByDate: Record<string, Array<{ key: string; label: string; id?: string }>>;
  persistSessions: (list: BaAnalysisSession[], mode: BaAnalysisMode) => void;
  priorEvents: NonNullable<NkbvBaMultiTimelineWorkspaceProps["priorEvents"]>;
  analysisDispositions: ViSinhAnalysisDispositionRow[];
  effectivePreferVae: boolean;
  onIndexChange: NkbvBaMultiTimelineWorkspaceProps["onIndexChange"];
}) {
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
    if (hydratedKeyRef.current !== `${maBenhAn}:${analysisMode}`) return;
    const next = pruneBaAnalysisSessions(maBenhAn, validIds, analysisMode);
    setSessions((prev) => {
      const sameLen = prev.length === next.length;
      const sameIds =
        sameLen && prev.every((s, i) => s.id === next[i]?.id && s.panel === next[i]?.panel);
      if (sameIds) return prev;
      persistSessions(next, analysisMode);
      return next;
    });
    setOpenSessionId((cur) => (cur && next.some((s) => s.id === cur) ? cur : null));
    setSampleConclusions(loadBaSampleConclusions(maBenhAn));
  }, [maBenhAn, analysisMode, split.xn, cdhaList, split.surgeryByDate, ssiTcByDate, persistSessions]);

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
        preferVae: effectivePreferVae,
        xnStatusById,
        onlyPendingXn: true,
      }),
    [split.xn, cdhaList, split.surgeryByDate, ssiTcByDate, effectivePreferVae, xnStatusById],
  );

  const patchDraft = useCallback(
    (sessionId: string, patch: Partial<BaAnalysisSessionDraft>) => {
      const next = updateSessionDraft(maBenhAn, sessionId, patch, analysisMode);
      setSessions(next);
      persistSessions(next, analysisMode);
    },
    [maBenhAn, analysisMode, persistSessions],
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
      persistSessions(next, analysisMode);
      setOpenSessionId(sessionIdForIndex(panel, index.id));
      onIndexChange?.({ milestoneId: index.id });
    },
    [maBenhAn, analysisMode, onIndexChange, baClinicalLamSang, split.deviceByDate, persistSessions],
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

  return {
    openSiteSessionsForSbap,
    establishedSiteSbaps,
    openSession,
    mergedDispositions,
    commonColumns,
    panelColumns,
    xnByDate,
    cdhaByDate,
    xnStatusById,
    analysisSlotsForPanel,
    sessionSuggestions,
    patchDraft,
    persistManualSampleConclusion,
    clearManualSampleConclusion,
    baClinicalLamSang,
    openOrCreateSession,
    applySecondaryBsiVeto,
  };
}
