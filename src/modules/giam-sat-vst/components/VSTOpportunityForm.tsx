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
  MOMENT_DISPLAY_LABEL,
  MOMENT_UI_LABEL,
  isVstMissedAction,
  maxMomentsForAction,
  momentDisplayLabel,
  momentWhoNumber,
} from "../lib/vst-constants";
import VSTAssessmentSection from "./VSTAssessmentSection";
import type { ExtendedOpportunity, VSTOppAssessmentField } from "../hooks/useVSTFormHandlers";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { formatTimeVi } from "@/lib/format-datetime-vi";
import { Bv103Button } from "@/components/ui/bv103";

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

/** Thang đều: ô hành động = --bv103-control-h (48px); ô thời điểm 56px (chữ WHO đầy đủ, tối đa 2 dòng). */
const CELL_BASE =
  "box-border flex w-full min-w-0 items-center overflow-hidden rounded-[var(--radius-control)] border transition-colors touch-manipulation";
const MOMENT_CELL = `${CELL_BASE} h-14 gap-3 px-3 text-left`;
const CELL = `${CELL_BASE} h-[var(--bv103-control-h)] justify-center px-2 text-center`;
const CELL_IDLE = "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50";
const CELL_ON = "border-[var(--primary)] bg-[var(--primary)] text-white";
const CELL_MISS = "border-rose-800 bg-rose-800 text-white";
const SECTION_HEAD = "flex h-6 items-center justify-between gap-2";
const GRID_GAP = "gap-2";

function MomentCellContent({ moment, active }: { moment: MomentType; active: boolean }) {
  return (
    <>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
        }`}
      >
        {momentWhoNumber(moment)}
      </span>
      <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-medium">{momentDisplayLabel(moment)}</span>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className={`h-5 w-5 shrink-0 ${active ? "opacity-100" : "opacity-0"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
      >
        <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
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
        className="box-border flex h-14 w-full cursor-pointer items-center gap-3 border-b border-slate-100 px-1 text-left transition-colors hover:bg-slate-50"
        onClick={() => openOpportunity(pIdx, oIdx)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate bv103-type-label font-semibold tracking-wide text-slate-800 !text-slate-800" title={momentsLine}>
            {momentsLine || "—"}
          </p>
          {!hideOppRecordTime ? (
            <p className="bv103-type-label mt-0.5 text-slate-400 !text-slate-400">
              {formatTimeVi(opp.thoi_gian_ghi_nhan)}
            </p>
          ) : null}
        </div>
        <span
          className="bv103-type-label w-20 shrink-0 text-right font-semibold uppercase tracking-wide text-slate-700 !text-slate-700"
          title={opp.hanh_dong ? ACTION_DISPLAY_LABEL[opp.hanh_dong] : undefined}
        >
          {opp.hanh_dong ? ACTION_UI_LABEL[opp.hanh_dong] : ""}
        </span>
        <span className="bv103-type-label w-8 shrink-0 text-right font-medium text-slate-400 !text-slate-400">
          Sửa
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="space-y-2">
        <div className={SECTION_HEAD}>
          <h3 className={`${C.sectionTitle} !m-0`}>Thời điểm</h3>
          <p className="bv103-type-label shrink-0 tabular-nums text-slate-500 !text-slate-500">
            Đã chọn {opp.thoi_diems.length}/{isVstMissedAction(opp.hanh_dong) ? 1 : momentCap}
          </p>
        </div>
        <div className={`flex flex-col ${GRID_GAP}`}>
          {MOMENTS.map((m) => {
            const active = opp.thoi_diems.includes(m);
            return (
              <button
                key={m}
                type="button"
                title={`${momentDisplayLabel(m)} — ${MOMENT_TOOLTIPS[m]}`}
                aria-label={MOMENT_DISPLAY_LABEL[m]}
                aria-pressed={active}
                onClick={() => toggleMoment(pIdx, oIdx, m)}
                className={`${MOMENT_CELL} ${active ? CELL_ON : CELL_IDLE}`}
              >
                <MomentCellContent moment={m} active={active} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className={SECTION_HEAD}>
          <h3 className={`${C.sectionTitle} !m-0`}>Hành động</h3>
          <span className="bv103-type-label invisible select-none" aria-hidden>
            —
          </span>
        </div>
        <div className={`grid grid-cols-3 ${GRID_GAP}`}>
          {ACTIONS.map((a) => {
            const active = opp.hanh_dong === a;
            return (
              <button
                key={a}
                type="button"
                title={ACTION_DISPLAY_LABEL[a]}
                aria-pressed={active}
                onClick={() => updateAction(pIdx, oIdx, a)}
                className={`${CELL} ${active ? (a === "Bỏ sót" ? CELL_MISS : CELL_ON) : CELL_IDLE}`}
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
        <div className={SECTION_HEAD}>
          <h3 className={`${C.sectionTitle} !m-0`}>Đánh giá</h3>
          <span className="bv103-type-label invisible select-none" aria-hidden>
            —
          </span>
        </div>
        <VSTAssessmentSection opp={opp} pIdx={pIdx} oIdx={oIdx} updateAssessment={updateAssessment} />
      </section>

      <Bv103Button variant="secondary" className="w-full" onClick={() => submitOpportunity(pIdx, oIdx)}>
        Ghi nhận cơ hội
      </Bv103Button>
    </div>
  );
}
