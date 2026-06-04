"use client";

import React from "react";
import { Activity } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";

export function ComprehensiveNkbvOutcome({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const monthly = payload?.nkbv?.monthly ?? [];
  if (!payload || payload.sources.nkbv !== "ok" || monthly.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-slate-800">
        <Activity size={18} className="text-[#026f17]" aria-hidden />
        Xu hướng NKBV (outcome)
      </h2>
      <p className="mb-4 text-xs text-slate-500">Số phiếu theo tháng — tách khỏi biểu đồ tuân thủ VST/GSC.</p>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="so_phieu" name="Số phiếu" fill="#026f17" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
