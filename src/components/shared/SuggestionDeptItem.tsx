// src/components/shared/SuggestionDeptItem.tsx
"use client";

import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface SuggestionDeptItemProps {
  dept: { name: string; percentage: number; khoa_id?: string };
  isSelected: boolean;
  onToggle: () => void;
  type: "VST" | "CHUNG";
}

export default function SuggestionDeptItem({ dept, isSelected, onToggle, type }: SuggestionDeptItemProps) {
  return (
    <div 
      onClick={onToggle}
      className={`premium-card p-4 border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
        isSelected 
          ? "border-[#026f17] bg-green-50/30" 
          : "border-slate-50 bg-white hover:border-slate-200"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
          isSelected ? "bg-[#026f17] border-[#026f17]" : "border-slate-200"
        }`}>
          {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
        </div>
        <div>
          <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{dept.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${dept.percentage < 70 ? 'bg-red-500' : 'bg-amber-500'}`} 
                style={{ width: `${dept.percentage}%` }}
              ></div>
            </div>
            <span className={`text-[10px] font-black ${dept.percentage < 70 ? 'text-red-600' : 'text-amber-600'}`}>
              {dept.percentage}%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            <span className="font-bold text-slate-700">Lý do:</span> Tỷ lệ {type === 'VST' ? 'Vệ sinh tay' : 'Giám sát chung'} chỉ đạt {dept.percentage}%
          </p>
        </div>
      </div>
      <AlertTriangle className={`w-5 h-5 ${dept.percentage < 70 ? 'text-red-500' : 'text-amber-500'}`} />
    </div>
  );
}
