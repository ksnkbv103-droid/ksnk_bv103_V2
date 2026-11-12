"use client";

import React from "react";
import type { NkbvBaMultiTimelineWorkspaceProps } from "../components/nkbv-ba-workspace.types";
import { type BaGridActiveIndex, type BaGridCdhaCell } from "../lib/nkbv-ba-grid-engine";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import { resolveBelongsOpenSessionByDate, resolveIndexEventDisposition, type OpenSiteSessionForSbap, type SecondarySiteHit } from "../lib/nkbv-index-event-disposition";
import { cdhaToSyndromePanel, isSsiIndexCriteriaKey, specimenToSyndromePanel, type SessionIndexSuggestion, type SyndromePanelId } from "../lib/nkbv-specimen-syndrome";
import { cdhaForBloodLast, validateBloodLast, validateChronoPrecedence } from "../lib/nkbv-chrono-precedence";
import { removeBaAnalysisSession, type BaAnalysisSession, type BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import { bareViSinhIdFromMilestoneId, type ViSinhAnalysisDispositionRow, type ViSinhAnalysisStatus } from "../lib/nkbv-vi-sinh-analysis-status";
import { khongDuTcKetLuanLabel } from "../lib/nkbv-vi-sinh-analysis-status";
import { findBaSampleConclusion, normalizeSampleId, removeBaSampleConclusionsMany, sampleIdsOwnedByAnalysisSession, upsertBaSampleConclusion, type BaSampleConclusion } from "../lib/nkbv-ba-sample-conclusions";
import { type BaAnalysisMode } from "../lib/nkbv-ba-analysis-mode";
import { toast } from "sonner";
import type { BaWorkspaceSplit } from "./useNkbvBaWorkspaceGridData";

export function useNkbvBaWorkspaceSessionActions({
  maBenhAn,
  isManual,
  effectivePreferVae,
  split,
  xnStatusById,
  sessions,
  sessionSuggestions,
  openSession,
  openSessionId,
  sampleConclusions,
  mergedDispositions,
  openSiteSessionsForSbap,
  priorEvents,
  analysisMode,
  setSessions,
  setOpenSessionId,
  setSampleConclusions,
  persistSessions,
  patchDraft,
  openOrCreateSession,
  applySecondaryBsiVeto,
  onClearViSinhDisposition,
  onMarkKhongDuTc,
}: {
  maBenhAn: string;
  isManual: boolean;
  effectivePreferVae: boolean;
  split: BaWorkspaceSplit;
  xnStatusById: Record<string, ViSinhAnalysisStatus>;
  sessions: BaAnalysisSession[];
  sessionSuggestions: SessionIndexSuggestion[];
  openSession: BaAnalysisSession | null;
  openSessionId: string | null;
  sampleConclusions: BaSampleConclusion[];
  mergedDispositions: ViSinhAnalysisDispositionRow[];
  openSiteSessionsForSbap: OpenSiteSessionForSbap[];
  priorEvents: NonNullable<NkbvBaMultiTimelineWorkspaceProps["priorEvents"]>;
  analysisMode: BaAnalysisMode;
  setSessions: React.Dispatch<React.SetStateAction<BaAnalysisSession[]>>;
  setOpenSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setSampleConclusions: React.Dispatch<React.SetStateAction<BaSampleConclusion[]>>;
  persistSessions: (list: BaAnalysisSession[], mode: BaAnalysisMode) => void;
  patchDraft: (sessionId: string, patch: Partial<BaAnalysisSessionDraft>) => void;
  openOrCreateSession: (
    panel: SyndromePanelId,
    index: BaGridActiveIndex,
    indexLabel: string,
    draftExtra?: Partial<BaAnalysisSessionDraft>,
  ) => void;
  applySecondaryBsiVeto: (input: {
    sampleId: string;
    sampleDate: string;
    ketLuanLabel: string;
    sites: SecondarySiteHit[];
  }) => void;
  onClearViSinhDisposition: NkbvBaMultiTimelineWorkspaceProps["onClearViSinhDisposition"];
  onMarkKhongDuTc: NkbvBaMultiTimelineWorkspaceProps["onMarkKhongDuTc"];
}) {
  const openFromXn = (x: (typeof split.xn)[0]) => {
    const panel = specimenToSyndromePanel({
      loai_benh_pham: x.benh_pham,
      loai_benh_pham_chuan: x.loai_benh_pham_chuan,
      lis_goc: x.lis_goc,
      preferVae: effectivePreferVae,
    });
    const nextIndex: BaGridActiveIndex = { kind: "XN", id: x.id, date: x.ngay };
    const label = [x.benh_pham, x.vi_khuan].filter(Boolean).join(" · ");

    if (!panel) {
      toast.message(
        "Chưa map được hội chứng từ bệnh phẩm chuẩn — chuẩn hóa loại bệnh phẩm ở kho vi sinh trước.",
      );
      return;
    }

    // Cấy máu phân tích sau cùng (CDC/NHSN) — áp dụng cả chế độ thủ công
    const bloodLast = validateBloodLast({
      targetId: x.id,
      targetDate: x.ngay,
      targetBenhPham: x.benh_pham,
      xnList: split.xn,
      cdhaList: cdhaForBloodLast(split.cdha).cdhaList,
      statusById: { ...xnStatusById, ...cdhaForBloodLast(split.cdha).statusById },
    });
    if (!bloodLast.allowed) {
      toast.warning(bloodLast.message, { duration: 8000 });
      const pendingXn = split.xn.find((it) => it.id === bloodLast.earliestUnresolved.id);
      if (pendingXn) void openFromXn(pendingXn);
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

    // Quy tắc CDC & Bộ Y tế: Phân tích tuần tự theo thời gian, không nhảy cóc xét nghiệm
    const chronoCheck = validateChronoPrecedence({
      targetDate: x.ngay,
      targetId: x.id,
      xnList: split.xn,
      statusById: xnStatusById,
    });
    if (!chronoCheck.allowed) {
      toast.warning(chronoCheck.message, { duration: 6000 });
      const earlierXn = split.xn.find((it) => it.id === chronoCheck.earliestUnresolved.id);
      if (earlierXn) {
        void openFromXn(earlierXn);
      }
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
      preferVae: effectivePreferVae,
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

    // Quy tắc CDC & Bộ Y tế: Phân tích tuần tự theo thời gian, không nhảy cóc cận lâm sàng
    const chronoCheck = validateChronoPrecedence({
      targetDate: c.ngay,
      targetId: c.id,
      xnList: split.xn,
      statusById: xnStatusById,
    });
    if (!chronoCheck.allowed) {
      toast.warning(chronoCheck.message, { duration: 6000 });
      const earlierXn = split.xn.find((it) => it.id === chronoCheck.earliestUnresolved.id);
      if (earlierXn) {
        void openFromXn(earlierXn);
      }
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

  const openFromSuggestion = (s: SessionIndexSuggestion) => {
    const sugXn = s.index.kind === "XN" ? split.xn.find((it) => it.id === s.index.id) : undefined;
    if (sugXn) {
      const bloodLast = validateBloodLast({
        targetId: sugXn.id,
        targetDate: sugXn.ngay,
        targetBenhPham: sugXn.benh_pham,
        xnList: split.xn,
        cdhaList: cdhaForBloodLast(split.cdha).cdhaList,
        statusById: { ...xnStatusById, ...cdhaForBloodLast(split.cdha).statusById },
      });
      if (!bloodLast.allowed) {
        toast.warning(bloodLast.message, { duration: 8000 });
        const pendingXn = split.xn.find((it) => it.id === bloodLast.earliestUnresolved.id);
        if (pendingXn) void openFromXn(pendingXn);
        return;
      }
    }
    if (isManual) {
      openOrCreateSession(s.panel, s.index, s.label, {
        eventDisposition: { kind: "NEW_ANALYSIS", label: "" },
        ketLuan: "",
      });
      return;
    }

    // Quy tắc CDC & Bộ Y tế: Phân tích tuần tự theo thời gian, không nhảy cóc xét nghiệm/cận lâm sàng
    const chronoCheck = validateChronoPrecedence({
      targetDate: s.index.date,
      targetId: s.index.id,
      xnList: split.xn,
      statusById: xnStatusById,
    });
    if (!chronoCheck.allowed) {
      toast.warning(chronoCheck.message, { duration: 6000 });
      const earlierSugg = sessionSuggestions.find(
        (it) => it.index.id === chronoCheck.earliestUnresolved.id,
      );
      if (earlierSugg) {
        openFromSuggestion(earlierSugg);
      } else {
        const earlierXn = split.xn.find((it) => it.id === chronoCheck.earliestUnresolved.id);
        if (earlierXn) {
          void openFromXn(earlierXn);
        }
      }
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
    persistSessions(next, analysisMode);
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

  return {
    openFromXn,
    openFromCdha,
    openFromSurgeryOrSsi,
    openFromSuggestion,
    removeSession,
    closeInsufficient,
  };
}
