"use client";

import React from "react";
import { CheckCircle, Ban } from "lucide-react";
import type { DepartmentStay } from "@/modules/giam-sat-nkbv/types/nkbv-verification";
import type { RuleEvaluationResult } from "@/modules/giam-sat-nkbv/lib/nkbv-rules-engine";
import type { CdcMetricsResult } from "@/modules/giam-sat-nkbv/lib/nkbv-timeline-math";
import NkbvCdcMetricsPanel from "@/modules/giam-sat-nkbv/components/NkbvCdcMetricsPanel";
import NkbvAdjudicationPanel from "@/modules/giam-sat-nkbv/components/NkbvAdjudicationPanel";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import type { NkbvSuspectedType } from "./useNkbvChecklistModalState";

type NkbvChecklistKsnkTabProps = {
  row: Record<string, any>;
  suspectedType: NkbvSuspectedType | null;
  checklistType: "BSI" | "VAE" | "VAP" | "HAP" | "UTI" | "SSI";
  liveEvaluation: RuleEvaluationResult;
  liveCdcMetrics: CdcMetricsResult | null;
  treatmentHistory: DepartmentStay[];
  allowedEdit: boolean;
  simulatedRole: 'KSNK' | 'LAM_SANG' | 'VI_SINH';
  adjudicating: boolean;
  onAdjudicate: (decision: "APPROVE" | "EXCLUDE", reason?: string) => Promise<void>;
};

export default function NkbvChecklistKsnkTab({
  row,
  suspectedType,
  checklistType,
  liveEvaluation,
  liveCdcMetrics,
  treatmentHistory,
  allowedEdit,
  simulatedRole,
  adjudicating,
  onAdjudicate,
}: NkbvChecklistKsnkTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--bv103-space-3)] animate-in fade-in duration-200">
      {/* Left Column: Expert analysis checks & Adjudication action (7 cols) */}
      <div className="lg:col-span-7 space-y-[var(--bv103-space-3)]">
        
        {/* Proposed CDC Diagnosis Card */}
        <div className="space-y-3">
          <span className={` text-slate-500`}>🚨 ĐỀ XUẤT CHẨN ĐOÁN TỰ ĐỘNG (CDC / NHSN)</span>
          
          {suspectedType === "LOAI_TRU" ? (
            <div className="p-4 rounded-[var(--radius-shell)] border border-red-200 bg-red-50/20 text-red-950">
              <div className="flex items-center gap-2">
                <Ban className="h-6 w-6 text-red-700 flex-shrink-0 animate-pulse" />
                <div>
                  <span className="block text-[11px] font-medium text-slate-400">Kết quả đề xuất</span>
                  <h4 className={`${C.sectionTitle} text-base text-red-800`}>
                    Đã phán quyết loại trừ
                  </h4>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-[var(--radius-shell)] border transition-all duration-300 ${
              liveEvaluation.is_positive 
                ? "bg-emerald-50 border-emerald-200/60 text-emerald-900 shadow-md shadow-emerald-500/5"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}>
              <div className="flex items-center gap-2">
                {liveEvaluation.is_positive ? (
                  <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Ban className="h-6 w-6 text-slate-500 flex-shrink-0" />
                )}
                <div>
                  <span className="block text-[11px] font-medium text-slate-400">Kết quả đề xuất</span>
                  <h4 className={`${C.sectionTitle} text-base`}>
                    {liveEvaluation.is_positive ? "Dương tính" : "Âm tính / loại trừ"}
                  </h4>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-200/40 pt-3">
                <span className="bv103-type-label font-semibold text-slate-400 uppercase tracking-wider block">Mã phân loại</span>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide ${
                  liveEvaluation.is_positive 
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}>
                  {liveEvaluation.classification}
                </span>
                {liveEvaluation.is_secondary_bsi && (
                  <span className="ml-1.5 inline-block mt-1 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-800">
                    SECONDARY BSI
                  </span>
                )}
              </div>

              <div className="mt-3 text-xs font-semibold leading-relaxed">
                <span className="bv103-type-label font-semibold text-slate-400 uppercase tracking-wider block mb-1">Căn cứ y tế</span>
                {liveEvaluation.reason}
              </div>
            </div>
          )}
        </div>

        {/* Validation Checks Checklist Questions */}
        <div className={`${C.panelInset} p-4 space-y-3`}>
          <span className={` text-slate-500`}>📊 ĐIỀU TRA VÀ THẨM ĐỊNH LÂM SÀNG (DATA VALIDATION)</span>
          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-350 text-[var(--primary)]" />
              <span>
                <strong>1. Xác minh kết quả Vi sinh:</strong> Tác nhân cấy dương tính ({String(row.tac_nhan_vi_khuan || "Chưa rõ")}) là vi sinh vật đạt chuẩn, không phải nấm hay tạp nhiễm phòng Lab.
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-350 text-[var(--primary)]" />
              <span>
                <strong>2. Xác minh Triệu chứng Lâm sàng:</strong> Các triệu chứng sốt/triệu chứng tại chỗ được ghi chép trung thực trong hồ sơ bệnh án khoa trong vòng IWP.
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-xs font-semibold text-[var(--primary)] cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-350 text-[var(--primary)]" />
              <span>
                <strong>3. Xác minh Lịch sử Thiết bị:</strong> Ngày đặt/rút Foley, CVC, thở máy khớp hoàn toàn với tờ theo dõi chăm sóc bệnh án.
              </span>
            </label>
          </div>
        </div>

        {/* KSNK Final Adjudication Form */}
        <NkbvAdjudicationPanel
          onAdjudicate={onAdjudicate}
          allowedEdit={allowedEdit}
          simulatedRole={simulatedRole}
          adjudicating={adjudicating}
        />
      </div>

      {/* Right Column: CDC Live Timeline (5 cols) */}
      <div className={`lg:col-span-5 flex flex-col h-full space-y-[var(--bv103-space-3)] ${C.panelInset} p-4 overflow-y-auto`}>
        <span className={`${C.blockSection} block border-b border-slate-200 pb-2 text-slate-500`}>
          🗓️ CDC LIVE TIMELINE & ATTRIBUTION
        </span>
        
        {suspectedType !== "LOAI_TRU" && (
          <NkbvCdcMetricsPanel
            metrics={liveCdcMetrics}
            checklistType={checklistType}
            isSecondaryBsi={liveEvaluation.is_secondary_bsi}
            treatmentHistory={treatmentHistory}
          />
        )}
      </div>
    </div>
  );
}
