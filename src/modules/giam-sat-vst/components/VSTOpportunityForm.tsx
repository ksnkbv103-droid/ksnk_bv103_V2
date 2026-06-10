// src/modules/giam-sat-vst/components/VSTOpportunityForm.tsx
"use client";

import React, { useLayoutEffect, useRef } from "react";
import { MOMENTS, ACTIONS, ActionType, MomentType } from "../lib/vst-constants";
import VSTAssessmentSection from "./VSTAssessmentSection";
import type { ExtendedOpportunity, VSTOppAssessmentField } from "../hooks/useVSTFormHandlers";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

interface VSTOpportunityFormProps {
  opp: ExtendedOpportunity;
  pIdx: number;
  oIdx: number;
  cachThucGiamSat: string;
  toggleMoment: (pIdx: number, oIdx: number, moment: MomentType) => void;
  updateAction: (pIdx: number, oIdx: number, action: ActionType) => void;
  updateAssessment: (
    pIdx: number,
    oIdx: number,
    field: VSTOppAssessmentField,
    value: boolean | string | null | undefined,
  ) => void;
  submitOpportunity: (pIdx: number, oIdx: number) => void;
  openOpportunity: (pIdx: number, oIdx: number) => void;
}

const MOMENT_TOOLTIPS: Record<string, string> = {
  "Trước khi tiếp xúc người bệnh": "Rửa tay trước khi chạm vào bệnh nhân để bảo vệ họ khỏi mầm bệnh trên tay bạn.",
  "Trước khi làm thủ thuật vô khuẩn": "Rửa tay trước khi thực hiện thủ thuật để ngăn mầm bệnh xâm nhập vào cơ thể bệnh nhân.",
  "Sau khi có nguy cơ tiếp xúc với dịch": "Rửa tay ngay sau khi có nguy cơ tiếp xúc với dịch tiết để bảo vệ chính bạn và môi trường xung quanh.",
  "Sau khi tiếp xúc người bệnh": "Rửa tay sau khi chạm vào bệnh nhân để bảo vệ bạn và môi trường y tế.",
  "Sau khi tiếp xúc xung quanh người bệnh": "Rửa tay sau khi chạm vào bất kỳ vật dụng nào xung quanh bệnh nhân.",
};

const MOMENT_ABBREVIATIONS: Record<string, string> = {
  "Trước khi tiếp xúc người bệnh": "T-TXNB",
  "Trước khi làm thủ thuật vô khuẩn": "T-TTVK",
  "Sau khi có nguy cơ tiếp xúc với dịch": "S-TXDCT",
  "Sau khi tiếp xúc người bệnh": "S-TXNB",
  "Sau khi tiếp xúc xung quanh người bệnh": "S-TXXQNB",
};

const C = bv103LayoutChrome;

export default function VSTOpportunityForm({
  opp,
  pIdx,
  oIdx,
  cachThucGiamSat,
  toggleMoment,
  updateAction,
  updateAssessment,
  submitOpportunity,
  openOpportunity,
}: VSTOpportunityFormProps) {
  const hideOppRecordTime = isReplayCameraSupervisionCachThuc(cachThucGiamSat);
  const postActionFieldsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (opp.isCollapsed || !opp.hanh_dong) return;
    const el = postActionFieldsRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (isVisible) return;
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: prefersReduced ? "auto" : "smooth" });
  }, [opp.hanh_dong, opp.isCollapsed]);

  if (opp.isCollapsed) {
    return (
      <button
        type="button"
        className={`flex w-full cursor-pointer items-center justify-between gap-2 ${C.panelInset} px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50/80`}
        onClick={() => openOpportunity(pIdx, oIdx)}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap gap-1.5">
            {opp.thoi_diems.map((m: MomentType, i: number) => (
              <span key={`${m}-${i}`} className={C.chipBadge}>
                {MOMENT_ABBREVIATIONS[m] || MOMENTS.indexOf(m) + 1}
              </span>
            ))}
          </div>
          {!hideOppRecordTime ? (
            <span className="text-[11px] font-medium text-slate-500">
              {opp.thoi_gian_ghi_nhan
                ? new Date(opp.thoi_gian_ghi_nhan).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—"}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] font-semibold uppercase text-[var(--primary)]">{opp.hanh_dong}</span>
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-400">Sửa</span>
      </button>
    );
  }

  return (
    <div className={`flex flex-col rounded-[var(--radius-shell)] border border-slate-200 bg-white p-3 sm:p-4`}>
      <div className="min-h-0 space-y-3">
        <div className="space-y-2">
          <p className={C.sectionTitle}>1. Thời điểm</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MOMENTS.map((m) => (
              <button
                key={m}
                type="button"
                title={MOMENT_TOOLTIPS[m]}
                onClick={() => toggleMoment(pIdx, oIdx, m)}
                className={`${C.choiceBtn} ${
                  opp.thoi_diems.includes(m) ? C.choiceBtnActive : C.choiceBtnIdle
                }`}
              >
                {MOMENT_ABBREVIATIONS[m] || m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className={C.sectionTitle}>2. Hành động</p>
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => updateAction(pIdx, oIdx, a)}
                className={`${C.choiceBtn} ${
                  opp.hanh_dong === a
                    ? a === "Bỏ sót"
                      ? C.choiceBtnActiveDanger
                      : C.choiceBtnActiveWarning
                    : C.choiceBtnIdle
                }`}
              >
                {a === "Rửa tay bằng nước" ? "Rửa nước" : a === "Chà tay bằng cồn" ? "Chà cồn" : "Bỏ sót"}
              </button>
            ))}
          </div>
        </div>

        <div ref={postActionFieldsRef} className="scroll-mt-2 space-y-2">
          <p className={C.sectionTitle}>3. Đánh giá</p>
          <VSTAssessmentSection opp={opp} pIdx={pIdx} oIdx={oIdx} updateAssessment={updateAssessment} />
        </div>
      </div>

      <div className="max-sm:sticky max-sm:bottom-0 max-sm:z-[1] max-sm:-mx-3 max-sm:mt-2 max-sm:border-t max-sm:border-slate-100 max-sm:bg-white max-sm:px-3 max-sm:pt-2 sm:mt-4">
        <button type="button" onClick={() => submitOpportunity(pIdx, oIdx)} className={C.btnPrimaryBlock}>
          Ghi nhận cơ hội
        </button>
      </div>
    </div>
  );
}
