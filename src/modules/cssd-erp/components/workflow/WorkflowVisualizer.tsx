// src/modules/cssd-erp/components/workflow/WorkflowVisualizer.tsx
"use client";

import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Station } from "../../types/cssd.types";

interface Props {
  steps: Station[];
  activeIndex: number;
}

export default function WorkflowVisualizer({ steps, activeIndex }: Props) {
  return (
    <div className="flex items-center justify-between w-full overflow-x-auto pb-4 gap-2 no-scrollbar">
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center min-w-[80px] gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${idx <= activeIndex ? 'bg-[#026f17] text-white' : 'bg-slate-100 text-slate-300'}`}>
              {idx < activeIndex ? <CheckCircle2 size={20} /> : idx === activeIndex ? <div className="w-3 h-3 bg-white rounded-full animate-pulse" /> : <Circle size={20} />}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tighter text-center ${idx === activeIndex ? 'text-[#026f17]' : 'text-slate-400'}`}>
              {step.replace('_', ' ')}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`h-[2px] min-w-[20px] flex-1 ${idx < activeIndex ? 'bg-[#026f17]' : 'bg-slate-100'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
