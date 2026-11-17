"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useStableCallback } from "../hooks/use-stable-callback";
import type { NkbvBaMultiTimelineWorkspaceProps } from "./nkbv-ba-workspace.types";
import NkbvBaWorkspaceToolbar from "./NkbvBaWorkspaceToolbar";
import NkbvBaWorkspaceSessionChips from "./NkbvBaWorkspaceSessionChips";
import { imagingCatalogForNghiNgo, splitMilestonesToGridRows, ssiTcCatalogWithoutSurgery } from "../lib/nkbv-ba-grid-engine";
import NkbvPatientSynthesisBar from "./NkbvPatientSynthesisBar";
import { saveBaAnalysisSessions, type BaAnalysisSession } from "../lib/nkbv-ba-analysis-session";
import { replaceNkbvBaPhanTichSessions } from "../actions/giam-sat-nkbv.actions";
import NkbvBaAddViSinhModal from "./NkbvBaAddViSinhModal";
import NkbvBaConcludeCell from "./NkbvBaConcludeCell";
import { BA_DAY_COL_W_ANALYSIS, type BaDayGridColumnDef } from "./NkbvBaDayGrid";
import { type BaDeviceByDate } from "../lib/nkbv-ba-device-timeline";
import { deviceDaysToByDate, khoaIdByDateMap } from "../lib/nkbv-ba-ngay";
import { bareViSinhIdFromMilestoneId } from "../lib/nkbv-vi-sinh-analysis-status";
import { type BaAnalysisMode } from "../lib/nkbv-ba-analysis-mode";
import { toast } from "sonner";
import NkbvBaWorkspaceSessionPanels from "./NkbvBaWorkspaceSessionPanels";
import NkbvBaWorkspaceCreateBar from "./NkbvBaWorkspaceCreateBar";
import { useNkbvBaWorkspaceSessions } from "../hooks/useNkbvBaWorkspaceSessions";
import { useNkbvBaWorkspaceGridData } from "../hooks/useNkbvBaWorkspaceGridData";
import { useNkbvBaWorkspaceSessionOps } from "../hooks/useNkbvBaWorkspaceSessionOps";
import { useNkbvBaWorkspaceMutations } from "../hooks/useNkbvBaWorkspaceMutations";
import { useNkbvBaWorkspaceSessionActions } from "../hooks/useNkbvBaWorkspaceSessionActions";


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
  locationDays = [],
  deviceDays = [],
  timeline,
  devices: _registryDevices,
  analysisDispositions = [],
  focusXnId = null,
  allowedEdit,
  onIndexChange,
  onCreatePhieu,
  onSkipViSinh,
  onMarkKhongDuTc,
  onClearViSinhDisposition,
  onReload,
  onTimelineUpsertLocal,
  onTimelineRemoveLocal,
  onOpenCase,
  priorEvents = [],
}: NkbvBaMultiTimelineWorkspaceProps) {
  const [addXnDate, setAddXnDate] = useState<string | null>(null);
  const split = useMemo(() => {
    const base = splitMilestonesToGridRows(timeline);
    const fromBa = deviceDaysToByDate(deviceDays);
    const mergeBucket = (a: BaDeviceByDate["foley"], b: BaDeviceByDate["foley"]) => {
      const out = { ...a };
      for (const [d, cells] of Object.entries(b)) {
        out[d] = [...(out[d] || []), ...cells];
      }
      return out;
    };
    return {
      ...base,
      deviceByDate: {
        foley: mergeBucket(base.deviceByDate.foley, fromBa.foley),
        vent: mergeBucket(base.deviceByDate.vent, fromBa.vent),
        cvc: mergeBucket(base.deviceByDate.cvc, fromBa.cvc),
      },
    };
  }, [timeline, deviceDays]);
  const [khoaByDate, setKhoaByDate] = useState<Record<string, string>>({});
  useEffect(() => {
    setKhoaByDate(khoaIdByDateMap(locationDays));
  }, [locationDays]);
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

  const persistSessions = useCallback(
    (list: BaAnalysisSession[], mode: BaAnalysisMode) => {
      saveBaAnalysisSessions(maBenhAn, list, mode);
      void replaceNkbvBaPhanTichSessions({
        ma_benh_an: maBenhAn,
        mode,
        sessions: list,
      }).then((res) => {
        if (!res.success) {
          toast.error(
            res.error || "Không lưu được nháp lên máy chủ. Nháp vẫn còn trên máy này.",
            { id: "nkbv-ba-phan-tich-persist" },
          );
        }
      });
    },
    [maBenhAn],
  );

  const {
    analysisMode,
    sessions,
    setSessions,
    hydratedKeyRef,
    openSessionId,
    setOpenSessionId,
    sampleConclusions,
    setSampleConclusions,
    preferVae,
    setPreferVae,
    isManual,
    autoPreferVae,
    effectivePreferVae,
    switchAnalysisMode,
  } = useNkbvBaWorkspaceSessions({ maBenhAn, ngaySinh, ngayVaoVien, ngayRaVien, deviceDays });
  const { setLocalCdha, localSsiTc, setLocalSsiTc, inFlightRef, cdhaKey, cdhaList, ssiTcByDate } =
    useNkbvBaWorkspaceGridData({ split });
  const {
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
  } = useNkbvBaWorkspaceSessionOps({
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
  });

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

  const {
    toggleDevice,
    changeKhoa,
    toggleCdha,
    editCdhaDate,
    editCdhaNote,
    addSurgery,
    removeMilestone,
    toggleSsiTc,
    persistPanelLamSang,
  } = useNkbvBaWorkspaceMutations({
    maBenhAn,
    ngayVaoVien,
    ngayRaVien,
    allowedEdit,
    split,
    cdhaList,
    cdhaKey,
    inFlightRef,
    localSsiTc,
    setLocalCdha,
    setLocalSsiTc,
    setKhoaByDate,
    onReload,
    onTimelineUpsertLocal,
    onTimelineRemoveLocal,
  });
  const {
    openFromXn,
    openFromCdha,
    openFromSurgeryOrSsi,
    openFromSuggestion,
    removeSession,
    closeInsufficient,
  } = useNkbvBaWorkspaceSessionActions({
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
  });

  // Handler ổn định cho các hàng memo — không phá memo vì closure mới mỗi render
  const stableOpenFromXn = useStableCallback(openFromXn);
  const stableOpenFromCdha = useStableCallback(openFromCdha);
  const stableToggleCdha = useStableCallback(toggleCdha);
  const stableEditCdhaDate = useStableCallback(editCdhaDate);
  const stableEditCdhaNote = useStableCallback(editCdhaNote);
  const stableRemoveMilestone = useStableCallback(removeMilestone);
  const stableAddSurgery = useStableCallback(addSurgery);
  const stableToggleSsiTc = useStableCallback(toggleSsiTc);
  const stableOpenFromSurgeryOrSsi = useStableCallback(openFromSurgeryOrSsi);

  const dayGridBind = {
    days: commonColumns,
    xnByDate,
    cdhaByDate,
    ssiTcByDate,
    surgeryByDate: split.surgeryByDate,
    lamSangByDate: baClinicalLamSang,
    foleyOnDate,
    ventOnDate,
    cvcOnDate,
    ngayVaoVien,
    ngayRaVien,
    statusById: xnStatusById,
    cdhaCatalog,
    ssiTcCatalog,
    allowedEdit,
    defaultKhoa: defaultKhoa || "",
    khoaByDate,
    khoas: khoas.map((k) => ({
      id: k.id,
      ma_danh_muc: k.ma_danh_muc || k.ma,
      ten_danh_muc: k.ten_danh_muc || k.ten,
    })),
    onChangeKhoa: allowedEdit ? (d: string, id: string) => void changeKhoa(d, id) : undefined,
    onAddXn: allowedEdit ? setAddXnDate : undefined,
    onPickXn: stableOpenFromXn,
    onToggleDevice: allowedEdit
      ? (d: string, k: "device_foley" | "device_ventilator" | "device_central_line") =>
          void toggleDevice(d, k)
      : undefined,
    onOpenCdha: stableOpenFromCdha,
    onRemoveMilestone: stableRemoveMilestone,
    onEditCdhaDate: stableEditCdhaDate,
    onEditCdhaNote: stableEditCdhaNote,
    onToggleCdha: stableToggleCdha,
    onOpenSurgeryOrSsi: stableOpenFromSurgeryOrSsi,
    onAddSurgery: stableAddSurgery,
    onToggleSsiTc: stableToggleSsiTc,
    onToggleLamSang: allowedEdit ? persistPanelLamSang : undefined,
  };


  const focusXnConsumed = React.useRef(false);
  useEffect(() => {
    if (focusXnConsumed.current || !focusXnId) return;
    const raw = String(focusXnId).trim();
    const hit = split.xn.find((x) => {
      const bare = bareViSinhIdFromMilestoneId(x.id);
      return x.id === raw || x.id === `lis:${raw}` || bare === raw;
    });
    if (!hit) return;
    focusXnConsumed.current = true;
    stableOpenFromXn(hit);
  }, [focusXnId, split.xn, stableOpenFromXn]);

  /** Mở phiên từ gợi ý Index đúng domain (không neo XN đầu bất kỳ). */
  return (
    <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-2 bg-white">
      <NkbvBaWorkspaceToolbar
        analysisMode={analysisMode}
        isManual={isManual}
        preferVae={preferVae}
        autoPreferVae={autoPreferVae}
        onSwitchMode={switchAnalysisMode}
        onPreferVaeChange={setPreferVae}
      />

      <NkbvPatientSynthesisBar
        maBenhAn={maBenhAn}
        ngayVaoVien={ngayVaoVien}
        ngayRaVien={ngayRaVien}
        priorEvents={priorEvents}
        xnList={split.xn}
        statusById={xnStatusById}
        onSelectEvent={onOpenCase}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {!sessionSuggestions.length ? (
          <p className="mt-3 text-xs text-slate-500">
            Chưa có Index để mở phiên — nạp XN vi sinh, thêm CĐHA, ngày mổ hoặc TC DOE SSI trên bảng
            chung (hoặc bấm chip trên lưới).
          </p>
        ) : null}

        <NkbvBaWorkspaceSessionChips
          sessionSuggestions={sessionSuggestions}
          sessions={sessions}
          openSessionId={openSessionId}
          establishedSiteSbaps={establishedSiteSbaps}
          xnList={split.xn}
          xnStatusById={xnStatusById}
          onOpenSuggestion={openFromSuggestion}
          onSelectSession={setOpenSessionId}
          onRemoveSession={removeSession}
        />

        <NkbvBaWorkspaceSessionPanels
          openSession={openSession}
          maBenhAn={maBenhAn}
          ngayVaoVien={ngayVaoVien}
          ngayRaVien={ngayRaVien}
          ngaySinh={ngaySinh}
          defaultKhoa={defaultKhoa}
          allowedEdit={allowedEdit}
          priorEvents={priorEvents}
          analysisMode={analysisMode}
          isManual={isManual}
          split={split}
          cdhaList={cdhaList}
          khoaByDate={khoaByDate}
          panelColumns={panelColumns}
          baClinicalLamSang={baClinicalLamSang}
          openSiteSessionsForSbap={openSiteSessionsForSbap}
          mergedDispositions={mergedDispositions}
          sampleConclusions={sampleConclusions}
          dayGridBind={dayGridBind}
          closedGridConcludeColumns={closedGridConcludeColumns}
          patchDraft={patchDraft}
          persistPanelLamSang={persistPanelLamSang}
          persistManualSampleConclusion={persistManualSampleConclusion}
          clearManualSampleConclusion={clearManualSampleConclusion}
          setOpenSessionId={setOpenSessionId}
          closeInsufficient={closeInsufficient}
          applySecondaryBsiVeto={applySecondaryBsiVeto}
          openOrCreateSession={openOrCreateSession}
          analysisSlotsForPanel={analysisSlotsForPanel}
        />

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
            khoas={khoas.map((k) => ({
              id: k.id,
              ma: k.ma ?? k.ma_danh_muc,
              ten: k.ten ?? k.ten_danh_muc ?? "",
            }))}
            onCreated={() => onReload()}
          />
        ) : null}

        <NkbvBaWorkspaceCreateBar
          openSession={openSession}
          allowedEdit={allowedEdit}
          isManual={isManual}
          split={split}
          xnStatusById={xnStatusById}
          cdhaList={cdhaList}
          baClinicalLamSang={baClinicalLamSang}
          khoaByDate={khoaByDate}
          defaultKhoa={defaultKhoa}
          khoas={khoas}
          ngayVaoVien={ngayVaoVien}
          ngayRaVien={ngayRaVien}
          analysisMode={analysisMode}
          patchDraft={patchDraft}
          onCreatePhieu={onCreatePhieu}
          onSkipViSinh={onSkipViSinh}
        />
      </div>
    </div>
  );
}
