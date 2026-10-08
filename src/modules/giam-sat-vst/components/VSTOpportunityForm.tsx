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
  isVstMissedAction,
  maxMomentsForAction,
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

/** Ô chọn: nền trắng / chọn nền slate đậm — chữ luôn tương phản, không dùng fill vàng/đỏ loè. */
const cellBase =
  "flex w-full min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-md border px-1.5 py-2 text-center transition-colors touch-manipulation";
const cellIdle = "border-slate-200 bg-white text-slate-800 hover:border-slate-400";
const cellOn = "border-slate-900 bg-slate-900 text-white";
const cellMissOn = "border-rose-800 bg-rose-800 text-white";

function MomentCellLabel({ moment }: { moment: MomentType }) {
  const timing = moment.startsWith("Trước") ? "TRƯỚC" : "SAU";
  return (
    <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
      <span className="bv103-type-label font-medium uppercase tracking-wider !text-inherit">{timing}</span>
      <span className="bv103-type-label font-semibold uppercase tracking-wide !text-inherit">
        {MOMENT_SHORT_CODE[moment]}
      </span>
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
  const momentCap = maxMomentsForAction(opp.hanh_dong);

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
    const momentsLine = opp.thoi_diems.map((m) => MOMENT_UI_LABEL[m]).join(" · ");
    return (
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-slate-400"
        onClick={() => openOpportunity(pIdx, oIdx)}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-xs font-semibold tracking-wide text-slate-800" title={momentsLine}>
            {momentsLine || "—"}
          </p>
          {!hideOppRecordTime ? (
            <p className={bv103PanelChrome.innerTableHead}>{formatTimeVi(opp.thoi_gian_ghi_nhan)}</p>
          ) : null}
        </div>
        <span
          className="bv103-type-label shrink-0 font-semibold uppercase tracking-wide text-slate-700 !text-slate-700"
          title={opp.hanh_dong ? ACTION_DISPLAY_LABEL[opp.hanh_dong] : undefined}
        >
          {opp.hanh_dong ? ACTION_UI_LABEL[opp.hanh_dong] : ""}
        </span>
        <span className="bv103-type-label shrink-0 font-medium text-slate-400 !text-slate-400">Sửa</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-3 sm:p-4">
      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className={C.sectionTitle}>Thời điểm</h3>
          <p className="bv103-type-label text-slate-500 !text-slate-500">
            {isVstMissedAction(opp.hanh_dong)
              ? "Bỏ sót: tối đa 1"
              : `Tuân thủ: tối đa ${momentCap}`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
                className={`${cellBase} ${active ? cellOn : cellIdle}`}
              >
                <MomentCellLabel moment={m} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className={C.sectionTitle}>Hành động</h3>
        <div className="grid grid-cols-3 gap-2">
          {ACTIONS.map((a) => {
            const active = opp.hanh_dong === a;
            const onClass = a === "Bỏ sót" ? cellMissOn : cellOn;
            return (
              <button
                key={a}
                type="button"
                title={ACTION_DISPLAY_LABEL[a]}
                aria-pressed={active}
                onClick={() => updateAction(pIdx, oIdx, a)}
                className={`${cellBase} min-h-[2.75rem] ${active ? onClass : cellIdle}`}
              >
                <span className="bv103-type-label font-semibold uppercase tracking-wide !text-inherit">
                  {ACTION_UI_LABEL[a]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section ref={postActionFieldsRef} className="scroll-mt-2 space-y-2">
        <h3 className={C.sectionTitle}>Đánh giá</h3>
        <VSTAssessmentSection opp={opp} pIdx={pIdx} oIdx={oIdx} updateAssessment={updateAssessment} />
      </section>

      <div className="max-sm:sticky max-sm:bottom-0 max-sm:z-[1] max-sm:-mx-3 max-sm:border-t max-sm:border-slate-100 max-sm:bg-white max-sm:px-3 max-sm:pt-2">
        <button type="button" onClick={() => submitOpportunity(pIdx, oIdx)} className={C.btnPrimaryBlock}>
          Ghi nhận cơ hội
        </button>
      </div>
    </div>
  );
}
