"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, Thermometer } from "lucide-react";
import { fetchCssdBatchHeatRisk } from "../../actions/cssd-batch.actions";
import type { BatchHeatRisk } from "../../lib/me-tiet-khuan-batch-heat";

export default function MeTietKhuanHeatBanner({ batchId }: { batchId: string }) {
  const [risk, setRisk] = useState<BatchHeatRisk | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = String(batchId || "").trim();
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    void fetchCssdBatchHeatRisk(id).then((res) => {
      if (cancelled) return;
      if (res.success) setRisk(res.risk);
      else setRisk(null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  if (loading || !risk || risk.level === "OK") return null;

  const isBlock = risk.level === "BLOCK";
  const Icon = isBlock ? ShieldAlert : AlertTriangle;

  return (
    <div
      className={`rounded-2xl border p-4 text-sm ${
        isBlock
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 shrink-0" size={20} aria-hidden />
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5">
            <Thermometer size={12} aria-hidden />
            {isBlock ? "Chặn an toàn Spaulding / nhiệt" : "Cảnh báo Spaulding / nhiệt"}
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-xs font-medium">
            {risk.messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
