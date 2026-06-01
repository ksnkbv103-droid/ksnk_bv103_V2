// src/modules/cssd-erp/components/packaging/BomGapBadge.tsx
"use client";

import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import type { HeatEvaluation, GapRow } from '@/lib/domain/cssd-packaging-rules';

interface Props {
  heat?: HeatEvaluation;
  gap?: GapRow[];
}

export default function BomGapBadge({ heat, gap }: Props) {
  const lowTemp = heat?.requireSplit;
  const hasGap = gap && gap.length > 0;

  if (lowTemp) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 shadow-sm animate-pulse">
        <ShieldAlert size={12} className="text-red-500 shrink-0" strokeWidth={2.5} />
        Lẫn nhiệt ⚡ ({heat?.recommendedMethod})
      </span>
    );
  }

  if (hasGap) {
    const totalMissing = gap.reduce((acc, curr) => acc + curr.thieu, 0);
    const totalDamaged = gap.reduce((acc, curr) => acc + curr.hong, 0);
    
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
        <AlertTriangle size={12} className="text-amber-500 shrink-0" strokeWidth={2.5} />
        Thiếu {totalMissing > 0 ? `${totalMissing} món` : ""}{totalDamaged > 0 ? ` (Hỏng ${totalDamaged})` : ""} ⚠
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
      <CheckCircle size={12} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
      Đầy đủ ✓
    </span>
  );
}
