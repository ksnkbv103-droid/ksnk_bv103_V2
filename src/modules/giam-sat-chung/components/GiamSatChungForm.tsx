// src/modules/giam-sat-chung/components/GiamSatChungForm.tsx
// Khoa: mdm_dm_khoa_phong; khu vực / nghề: gstt_dm_* / mdm_dm_*; nhân sự: mdm_nhan_su.
"use client";

import React, { useEffect, useMemo, useState } from "react";
import GiamSatHeader from "@/components/shared/GiamSatHeader";
import ContinueSupervisionBar from "@/components/shared/ContinueSupervisionBar";
import ChecklistItem from "./ChecklistItem";

import type { ChecklistTemplate } from "@/types/giam-sat-chung";
import GiamSatChungPrintView from "./GiamSatChungPrintView";
import GiamSatChungFormActions from "./GiamSatChungFormActions";
import GscModuleLockBanner from "./GscModuleLockBanner";
import { gscFormChrome } from "../lib/gsc-form-chrome";
import { useGiamSatChungForm } from "../hooks/use-giam-sat-chung-form";
import type { GscFormProgress } from "../lib/gsc-score-display";
import type { ChecklistResult } from "@/types/giam-sat-chung";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import { buildEntityQrCode } from "@/lib/entity-qr/entity-qr-core";
import { useEntityQrImage } from "@/hooks/useEntityQr";

export default function GiamSatChungForm({
  template: initialTemplate,
  onSuccess,
  editPayload,
  editingSessionId,
  locPrefill,
  onProgressChange,
}: {
  template: ChecklistTemplate;
  onSuccess: () => void;
  onCancel: () => void;
  onProgressChange?: (progress: GscFormProgress) => void;
  editPayload?: {
    session: Partial<GiamSatSession>;
    results: ChecklistResult[];
  };
  /** Khi sửa phiên có sẵn — lưu UPDATE cùng UUID, không tạo phiên mới. */
  editingSessionId?: string | null;
  /** Tem QR vị trí LOC-* → điền sẵn khoa / khu vực. */
  locPrefill?: { kind: "khoa" | "khu"; ma: string } | null;
}) {
  const {
    template,
    session,
    setSession,
    results,
    setResults,
    loading,
    headerLoading,
    selectedKhoa,
    selectedKhuVuc,
    ngayGiamSat,
    khoas,
    khuVucs,
    ngheNghieps,
    nhanSus,
    historyLocations,
    historyLocationRows,
    hinhThucGiamSats,
    cachThucGiamSats,
    handleSave,
    formProgress,
    isLockedForSelectedDate,
    lockMessage,
    lockedUntilDate,
    sessionForPrint,
    setSessionFromHeader,
    currentHoSoId,
    lockKhoa,
    stickyHintActive,
    clearStickyHint,
    showContinuePrompt,
    continueSummary,
    continueHere,
    changeLocation,
    finishToHistory,
  } = useGiamSatChungForm(initialTemplate, onSuccess, {
    editPayload: editPayload || null,
    editingSessionId: editingSessionId ?? null,
    locPrefill: locPrefill ?? null,
  });

  const resultByCriterionId = useMemo(
    () => new Map(results.map((r) => [r.criterionId, r])),
    [results],
  );

  useEffect(() => {
    onProgressChange?.(formProgress);
  }, [formProgress, onProgressChange]);

  const headerSession = { ...session, khoa_id: selectedKhoa, khu_vuc_id: selectedKhuVuc, ngay_giam_sat: ngayGiamSat };
  const [printBlank, setPrintBlank] = useState(false);
  const printSessionId = String(editingSessionId || sessionForPrint.id || "").trim();
  const printQrCode = !printBlank && printSessionId ? buildEntityQrCode("GSC_SESSION", printSessionId) : "";
  const printQrDataUrl = useEntityQrImage(printQrCode || null);
  const printResults = useMemo(() => {
    if (!printBlank) return results;
    return template.criteria.map((c) => ({
      criterionId: c.id,
      value: "NA" as const,
      note: null,
    }));
  }, [printBlank, results, template.criteria]);

  const runPrint = (blank: boolean) => {
    setPrintBlank(blank);
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => setPrintBlank(false), 300);
    });
  };

  return (
    <div className="space-y-7 pb-28">
      <GscModuleLockBanner lockedUntilDate={lockedUntilDate} lockMessage={isLockedForSelectedDate ? lockMessage : null} />
      <GiamSatChungPrintView
        session={sessionForPrint}
        results={printResults}
        template={template}
        khoas={khoas}
        khuVucs={khuVucs}
        ngheNghieps={ngheNghieps}
        nhanSus={(nhanSus as { id?: string; ho_ten?: string }[]) || []}
        qrCode={printQrCode || undefined}
        qrDataUrl={printQrDataUrl || undefined}
      />

      <div className="print:hidden space-y-7">
        <GiamSatHeader
          session={headerSession}
          setSession={setSessionFromHeader}
          khoas={khoas}
          khuVucs={khuVucs}
          ngheNghieps={ngheNghieps}
          nhanSus={nhanSus}
          historyLocations={historyLocations}
          historyLocationRows={historyLocationRows}
          headerDataLoading={headerLoading}
          showGiamSatCaNhan={true}
          lockedSupervisorHoSoId={currentHoSoId}
          deferLocationHistoryUntilTyped
          showBoSungNguoiBenhToggle
          bangKiemMa={template.id}
          hinhThucGiamSats={hinhThucGiamSats}
          cachThucGiamSats={cachThucGiamSats}
          moduleContext="gsc"
          lockKhoa={lockKhoa}
          showClearStickyHint={stickyHintActive && !editingSessionId && !showContinuePrompt}
          onClearStickyHint={clearStickyHint}
        />

      {!showContinuePrompt ? (
        <GiamSatChungFormActions
          loading={loading || isLockedForSelectedDate}
          headerLoading={headerLoading}
          onPrint={() => runPrint(false)}
          onPrintBlank={() => runPrint(true)}
          onSave={handleSave}
        />
      ) : null}

        <div className="grid grid-cols-1 gap-4">
          {template.criteria.map((c, idx) => {
            const result = resultByCriterionId.get(c.id) || { criterionId: c.id, value: "NA" as const, note: null };
            return (
              <ChecklistItem
                key={c.id}
                index={idx + 1}
                criterion={c}
                result={result}
                onChange={(upd) => setResults((prev) => prev.map((r) => (r.criterionId === upd.criterionId ? upd : r)))}
              />
            );
          })}
        </div>

        <div className={`space-y-3 ${gscFormChrome.panelShell}`}>
          <label className={gscFormChrome.labelBlockAccent}>Nhận xét / Kiến nghị</label>
          <textarea
            className={gscFormChrome.textareaLarge}
            value={session.ghi_chu_chung}
            onChange={(e) => setSession({ ...session, ghi_chu_chung: e.target.value })}
          />
        </div>

        {showContinuePrompt ? (
          <div className="print:hidden fixed inset-x-0 bottom-0 z-20 px-3 pb-3 sm:px-6 sm:pb-6">
            <ContinueSupervisionBar
              summaryLine={continueSummary}
              onContinueHere={continueHere}
              onChangeLocation={changeLocation}
              onDone={finishToHistory}
              showKeepSubjectsOption
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
