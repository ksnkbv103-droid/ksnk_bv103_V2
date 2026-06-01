// src/modules/giam-sat-vst/components/VSTOpportunityForm.tsx
"use client";

import React, { useLayoutEffect, useRef } from "react";
import { MOMENTS, ACTIONS, ActionType, MomentType } from "../lib/vst-constants";
import VSTAssessmentSection from "./VSTAssessmentSection";
import type { ExtendedOpportunity, VSTOppAssessmentField } from "../hooks/useVSTFormHandlers";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";


interface VSTOpportunityFormProps {
  opp: ExtendedOpportunity;
  pIdx: number;
  oIdx: number;
  /** `cach_thuc_giam_sat` — ẩn nhập giờ từng cơ hội chỉ khi giám sát lại qua camera (một khung giờ đầu phiên). */
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
  /** Sau khi chọn hành động: cuộn tới khối đánh giá / ghi nhận trong vùng cuộn cột (không cần kéo tay). */
  const postActionFieldsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (opp.isCollapsed || !opp.hanh_dong) return;
    const el = postActionFieldsRef.current;
    if (!el) return;

    // Chỉ scroll khi khối "Đánh giá" đang không nằm trong viewport.
    const rect = el.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (isVisible) return;

    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    // Cuộn tới khối "Đánh giá", căn giữa để người dùng thấy rõ cả phần đánh giá và nút ghi nhận.
    el.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }, [opp.hanh_dong, opp.isCollapsed]);

  if (opp.isCollapsed) {
    return (
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
        onClick={() => openOpportunity(pIdx, oIdx)}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap gap-1.5">
            {opp.thoi_diems.map((m: MomentType, i: number) => (
              <span
                key={`${m}-${i}`}
                className="flex h-5 w-auto shrink-0 items-center justify-center rounded-full bg-[#026f17] px-1.5 text-[8px] font-bold text-white"
              >
                {MOMENT_ABBREVIATIONS[m] || (MOMENTS.indexOf(m) + 1)}
              </span>
            ))}
          </div>
          {!hideOppRecordTime ? (
            <span className="text-[9px] font-medium text-slate-500">
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
        <span className="shrink-0 text-[10px] font-semibold uppercase text-[#026f17]">{opp.hanh_dong}</span>
        <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-slate-400">Sửa</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
      <div className="min-h-0 space-y-3 sm:space-y-4">
        <div className="space-y-2 sm:space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 sm:text-[10px] sm:font-semibold sm:text-slate-600">1. Thời điểm</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-1.5">
            {MOMENTS.map((m, i) => (
              <button
                key={m}
                type="button"
                title={MOMENT_TOOLTIPS[m]}
                onClick={() => toggleMoment(pIdx, oIdx, m)}
                className={`w-full rounded-xl border px-2 py-3.5 text-center text-xs font-bold uppercase tracking-wider transition-colors sm:rounded-lg sm:px-2 sm:py-2.5 sm:text-[10px] ${
                  opp.thoi_diems.includes(m)
                    ? "border-[#026f17] bg-[#026f17] text-white shadow-sm"
                    : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                {MOMENT_ABBREVIATIONS[m] || m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 sm:text-[10px] sm:font-semibold sm:text-slate-600">2. Hành động</p>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-1.5">
            {ACTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => updateAction(pIdx, oIdx, a)}
                className={`min-h-12 rounded-xl border text-[10px] font-bold uppercase tracking-wide transition-colors sm:min-h-10 sm:rounded-lg sm:text-[9px] ${
                  opp.hanh_dong === a
                    ? a === "Bỏ sót"
                      ? "border-red-500 bg-red-500 text-white shadow-sm"
                      : "border-amber-500 bg-amber-500 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                }`}
              >
                {a === "Rửa tay bằng nước" ? "Rửa nước" : a === "Chà tay bằng cồn" ? "Chà cồn" : "Bỏ sót"}
              </button>
            ))}
          </div>
        </div>

        <div ref={postActionFieldsRef} className="scroll-mt-2 space-y-1.5 sm:space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">3. Đánh giá</p>
          <VSTAssessmentSection opp={opp} pIdx={pIdx} oIdx={oIdx} updateAssessment={updateAssessment} />
        </div>

      </div>

      <div className="max-sm:sticky max-sm:bottom-0 max-sm:z-[1] max-sm:-mx-3 max-sm:mt-2 max-sm:border-t max-sm:border-slate-100 max-sm:bg-white max-sm:px-3 max-sm:pb-0.5 max-sm:pt-2 sm:mt-4">
        <button
          type="button"
          onClick={() => submitOpportunity(pIdx, oIdx)}
          className="bv103-control-h w-full rounded-lg bg-[#026f17] text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#015a12]"
        >
          Ghi nhận cơ hội
        </button>
      </div>
    </div>
  );
}
