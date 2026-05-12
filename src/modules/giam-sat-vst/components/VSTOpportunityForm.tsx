// src/modules/giam-sat-vst/components/VSTOpportunityForm.tsx
"use client";

import React from "react";
import { MOMENTS, ACTIONS, ActionType, MomentType } from "../data";
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
  "Sau khi tiếp xúc xung quanh người bệnh": "Rửa tay sau khi chạm vào bất kỳ vật dụng nào xung quanh bệnh nhân."
};

export default function VSTOpportunityForm({
  opp, pIdx, oIdx, cachThucGiamSat,
  toggleMoment, updateAction, updateAssessment, submitOpportunity, openOpportunity
}: VSTOpportunityFormProps) {
  const hideOppRecordTime = isReplayCameraSupervisionCachThuc(cachThucGiamSat);
  if (opp.isCollapsed) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors" 
        onClick={() => openOpportunity(pIdx, oIdx)}>
        <div className="flex flex-col">
          <div className="flex gap-1 mb-1">
            {opp.thoi_diems.map((m: any, i: number) => (
              <span key={i} className="w-5 h-5 rounded-full bg-[#026f17] text-white flex items-center justify-center text-[7px] font-black">{MOMENTS.indexOf(m) + 1}</span>
            ))}
          </div>
          {!hideOppRecordTime ? (
            <span className="text-[8px] text-slate-400 font-bold">
              {opp.thoi_gian_ghi_nhan ? new Date(opp.thoi_gian_ghi_nhan).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : '---'}
            </span>
          ) : null}
        </div>
        <span className="text-[9px] font-black uppercase text-[#026f17]">{opp.hanh_dong}</span>
        <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">Sửa</span>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#026f17]/10 rounded-[32px] p-5 space-y-5 shadow-inner animate-in fade-in zoom-in-95 duration-200">
      {/* Bước 1: Thời điểm */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest underline decoration-amber-500 underline-offset-4">1. Thời điểm</label>
        <div className="flex flex-col gap-1">
          {MOMENTS.map((m, i) => (
            <button key={m} title={MOMENT_TOOLTIPS[m]} onClick={() => toggleMoment(pIdx, oIdx, m)}
              className={`w-full py-2.5 px-4 rounded-xl text-left text-[10px] font-bold transition-all leading-tight border-2 ${
                opp.thoi_diems.includes(m) 
                  ? "bg-[#026f17] text-white border-[#026f17] shadow-md scale-[1.02]" 
                  : "bg-white text-slate-500 border-slate-100 hover:border-[#026f17]/30 hover:bg-slate-50"
              }`}>
              <span className="mr-3 text-[#026f17]/30 font-black italic">{i + 1}</span>{m}
            </button>
          ))}
        </div>
      </div>

      {/* Bước 2: Hành động */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest underline decoration-amber-500 underline-offset-4">2. Hành động</label>
        <div className="grid grid-cols-3 gap-1">
          {ACTIONS.map(a => (
            <button key={a} onClick={() => updateAction(pIdx, oIdx, a)}
              className={`h-11 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all shadow-sm ${
                opp.hanh_dong === a 
                  ? (a === "Bỏ sót" ? "bg-red-500 text-white" : "bg-amber-500 text-white") 
                  : "bg-slate-50 text-slate-300 hover:bg-slate-100"
              }`}>
              {a === "Rửa tay bằng nước" ? "Rửa nước" : a === "Chà tay bằng cồn" ? "Chà cồn" : "Bỏ sót"}
            </button>
          ))}
        </div>
      </div>

      {/* Bước 3: Đánh giá */}
      <div className="space-y-3">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest underline decoration-amber-500 underline-offset-4">3. Đánh giá</label>
        <VSTAssessmentSection opp={opp} pIdx={pIdx} oIdx={oIdx} updateAssessment={updateAssessment} />
      </div>

      <button onClick={() => submitOpportunity(pIdx, oIdx)}
        className="w-full h-11 rounded-2xl bg-[#026f17] text-white font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-[#015a12]">
        Ghi nhận cơ hội
      </button>
    </div>
  );
}
