// src/modules/giam-sat-chung/components/GiamSatChungForm.tsx
// Khoa: dm_khoa_phong; khu vực / nghề: dm_* bundle; nhân sự: ho_so_nhan_vien.
"use client";

import React, { useEffect, useMemo } from "react";
import GiamSatHeader from "@/components/shared/GiamSatHeader";
import ChecklistItem from "./ChecklistItem";
import type { ChecklistTemplate } from "@/types/giam-sat-chung";
import GiamSatChungPrintView from "./GiamSatChungPrintView";
import GiamSatChungFormActions from "./GiamSatChungFormActions";
import { useGiamSatChungForm } from "../hooks/use-giam-sat-chung-form";
import type { ChecklistResult } from "@/types/giam-sat-chung";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";

export default function GiamSatChungForm({
  template: initialTemplate,
  onSuccess,
  editPayload,
  editingSessionId,
  onProgressChange,
}: {
  template: ChecklistTemplate;
  onSuccess: () => void;
  onCancel: () => void;
  onProgressChange?: (progress: { evaluated: number; total: number; rate: number }) => void;
  editPayload?: { session: Partial<GiamSatSession>; results: ChecklistResult[] };
  /** Khi sửa phiên có sẵn — lưu UPDATE cùng UUID, không tạo phiên mới. */
  editingSessionId?: string | null;
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
    handleSave,
    score,
    sessionForPrint,
    setSessionFromHeader,
    currentHoSoId,
  } = useGiamSatChungForm(initialTemplate, onSuccess, {
    editPayload: editPayload || null,
    editingSessionId: editingSessionId ?? null,
  });

  const evaluatedCount = results.filter((r) => r.value !== "NA").length;
  const totalCount = template.criteria.length;
  const resultByCriterionId = useMemo(
    () => new Map(results.map((r) => [r.criterionId, r])),
    [results],
  );

  useEffect(() => {
    onProgressChange?.({ evaluated: evaluatedCount, total: totalCount, rate: score });
  }, [evaluatedCount, totalCount, score, onProgressChange]);

  const headerSession = { ...session, khoa_id: selectedKhoa, khu_vuc_id: selectedKhuVuc, ngay_giam_sat: ngayGiamSat };

  return (
    <div className="space-y-7 pb-28">
      <GiamSatChungPrintView
        session={sessionForPrint}
        results={results}
        template={template}
        khoas={khoas}
        khuVucs={khuVucs}
        ngheNghieps={ngheNghieps}
        nhanSus={(nhanSus as { id?: string; ho_ten?: string }[]) || []}
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
        />

        <GiamSatChungFormActions
          loading={loading}
          headerLoading={headerLoading}
          onPrint={() => window.print()}
          onSave={handleSave}
        />

        <div className="grid grid-cols-1 gap-4">
          {template.criteria.map((c) => {
            const result = resultByCriterionId.get(c.id) || { criterionId: c.id, value: "NA" as const, note: null };
            return (
              <ChecklistItem
                key={c.id}
                criterion={c}
                result={result}
                onChange={(upd) => setResults((prev) => prev.map((r) => (r.criterionId === upd.criterionId ? upd : r)))}
              />
            );
          })}
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--primary)]">
            Nhận xét / Kiến nghị
          </label>
          <textarea
            className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-700 outline-none transition-colors focus:border-[var(--primary)]"
            value={session.ghi_chu_chung}
            onChange={(e) => setSession({ ...session, ghi_chu_chung: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
