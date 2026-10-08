// src/modules/giam-sat-vst/components/VSTOpportunityForm.tsx
"use client";

import React, { useLayoutEffect, useRef } from "react";
import {
  MOMENTS,
  ACTIONS,
  ActionType,
  MomentType,
  ACTION_DISPLAY_LABEL,
  ACTION_UI_LABEL,
  MOMENT_SHORT_CODE,
  MOMENT_UI_LABEL,
  momentDisplayLabel,
} from "../lib/vst-constants";
import VSTAssessmentSection from "./VSTAssessmentSection";
import type { ExtendedOpportunity, VSTOppAssessmentField } from "../hooks/useVSTFormHandlers";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103PanelChrome } from "@/lib/bv103-panel-chrome";
import { formatTimeVi } from "@/lib/format-datetime-vi";

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

const MOMENT_TOOLTIPS: Record<MomentType, string> = {
  "Trước khi tiếp xúc người bệnh":
    "Vệ sinh tay trước khi chạm vào người bệnh để bảo vệ họ khỏi mầm bệnh trên tay bạn.",
  "Trước khi làm thủ thuật vô khuẩn":
    "Vệ sinh tay trước khi thực hiện thủ thuật để ngăn mầm bệnh xâm nhập vào cơ thể người bệnh.",
  "Sau khi có nguy cơ tiếp xúc với dịch":
    "Vệ sinh tay ngay sau khi có nguy cơ phơi nhiễm với máu và dịch cơ thể.",
  "Sau khi tiếp xúc người bệnh":
    "Vệ sinh tay sau khi chạm vào người bệnh để bảo vệ bạn và môi trường y tế.",
  "Sau khi tiếp xúc xung quanh người bệnh":
    "Vệ sinh tay sau khi chạm vào môi trường xung quanh người bệnh.",
};

const C = bv103LayoutChrome;

/** Hai dòng gọn ô: TRƯỚC|SAU rồi mã (TXNB / TTVK / …). */
function MomentChoiceLabel({ moment }: { moment: MomentType }) {
  const timing = moment.startsWith("Trước") ? "TRƯỚC" : "SAU";
  return (
    <span
      className="flex flex-col items-center justify-center gap-0.5 leading-tight"
      title={momentDisplayLabel(moment)}
    >
      <span className="bv103-type-label font-medium uppercase tracking-wide">{timing}</span>
      <span className="bv103-type-label font-semibold uppercase tracking-wide">{MOMENT_SHORT_CODE[moment]}</span>
    </span>
  );
}

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
              <span key={`${m}-${i}`} className={C.chipBadge} title={momentDisplayLabel(m)}>
                {MOMENT_UI_LABEL[m]}
              </span>
            ))}
          </div>
          {!hideOppRecordTime ? (
            <span className={bv103PanelChrome.innerTableHead}>
              {formatTimeVi(opp.thoi_gian_ghi_nhan)}
            </span>
          ) : null}
        </div>
        <span
          className="bv103-type-label shrink-0 font-semibold uppercase tracking-wide text-[var(--primary)]"
          title={opp.hanh_dong ? ACTION_DISPLAY_LABEL[opp.hanh_dong] : undefined}
        >
          {opp.hanh_dong ? ACTION_UI_LABEL[opp.hanh_dong] : ""}
        </span>
        <span className="bv103-type-label shrink-0 font-medium uppercase tracking-wide text-slate-400">Sửa</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col rounded-[var(--radius-shell)] border border-slate-200 bg-white p-3 sm:p-4">
      <div className="min-h-0 space-y-3">
        <div className="space-y-2">
          <p className={C.sectionTitle}>1. Thời điểm</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {MOMENTS.map((m) => {
              const active = opp.thoi_diems.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  title={`${momentDisplayLabel(m)} — ${MOMENT_TOOLTIPS[m]}`}
                  aria-label={MOMENT_UI_LABEL[m]}
                  aria-pressed={active}
                  onClick={() => toggleMoment(pIdx, oIdx, m)}
                  className={`${C.choiceBtn} flex flex-col items-center justify-center px-1.5 py-2 normal-case ${
                    active ? C.choiceBtnActive : C.choiceBtnIdle
                  }`}
                >
                  <MomentChoiceLabel moment={m} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className={C.sectionTitle}>2. Hành động</p>
          <div className="grid grid-cols-3 gap-1.5">
            {ACTIONS.map((a) => {
              const active = opp.hanh_dong === a;
              return (
                <button
                  key={a}
                  type="button"
                  title={ACTION_DISPLAY_LABEL[a]}
                  aria-pressed={active}
                  onClick={() => updateAction(pIdx, oIdx, a)}
                  className={`${C.choiceBtn} inline-flex items-center justify-center ${
                    active
                      ? a === "Bỏ sót"
                        ? C.choiceBtnActiveDanger
                        : C.choiceBtnActiveWarning
                      : C.choiceBtnIdle
                  }`}
                >
                  <span className="bv103-type-label font-semibold uppercase tracking-wide">
                    {ACTION_UI_LABEL[a]}
                  </span>
                </button>
              );
            })}
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
