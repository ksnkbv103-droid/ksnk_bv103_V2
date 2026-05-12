// src/modules/giam-sat-vst/components/VSTAssessmentSection.tsx
"use client";

import React from "react";
import type { ExtendedOpportunity, VSTOppAssessmentField } from "../hooks/useVSTFormHandlers";

interface VSTAssessmentSectionProps {
  opp: ExtendedOpportunity;
  pIdx: number;
  oIdx: number;
  updateAssessment: (
    pIdx: number,
    oIdx: number,
    field: VSTOppAssessmentField,
    value: boolean | string | null | undefined,
  ) => void;
}

export default function VSTAssessmentSection({ opp, pIdx, oIdx, updateAssessment }: VSTAssessmentSectionProps) {
  if (opp.hanh_dong && opp.hanh_dong !== "Bỏ sót") {
    return (
      <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-600">Đúng kỹ thuật?</span>
          <div className="flex gap-1">
            <button 
              onClick={() => updateAssessment(pIdx, oIdx, "dung_ky_thuat", true)} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${opp.dung_ky_thuat === true ? "bg-[#026f17] text-white" : "bg-white text-slate-300 border border-slate-100"}`}
            >Có</button>
            <button 
              onClick={() => updateAssessment(pIdx, oIdx, "dung_ky_thuat", false)} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${opp.dung_ky_thuat === false ? "bg-red-500 text-white" : "bg-white text-slate-300 border border-slate-100"}`}
            >Không</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-600">Đủ thời gian?</span>
          <div className="flex gap-1">
            <button 
              onClick={() => updateAssessment(pIdx, oIdx, "du_thoi_gian", true)} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${opp.du_thoi_gian === true ? "bg-[#026f17] text-white" : "bg-white text-slate-300 border border-slate-100"}`}
            >Có</button>
            <button 
              onClick={() => updateAssessment(pIdx, oIdx, "du_thoi_gian", false)} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${opp.du_thoi_gian === false ? "bg-red-500 text-white" : "bg-white text-slate-300 border border-slate-100"}`}
            >Không</button>
          </div>
        </div>
      </div>
    );
  }

  if (opp.hanh_dong === "Bỏ sót") {
    return (
      <div className="flex items-center justify-between p-3 bg-red-50 rounded-2xl border border-red-100 animate-in zoom-in-95">
        <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter">Lạm dụng găng?</span>
        <div className="flex gap-1">
          <button 
            onClick={() => updateAssessment(pIdx, oIdx, "co_deo_gang", true)}
            className={`px-4 py-2 rounded-lg text-[8px] font-black transition-all ${opp.co_deo_gang === true ? "bg-red-500 text-white shadow-md" : "bg-white text-red-500 border border-red-200"}`}
          >CÓ</button>
          <button 
            onClick={() => updateAssessment(pIdx, oIdx, "co_deo_gang", false)}
            className={`px-4 py-2 rounded-lg text-[8px] font-black transition-all ${opp.co_deo_gang === false ? "bg-[#026f17] text-white shadow-md" : "bg-white text-[#026f17] border border-[#026f17]/20"}`}
          >KHÔNG</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-16 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl italic text-[9px] text-slate-300">Hoàn thành bước 2</div>
  );
}
