"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, Thermometer } from "lucide-react";
import { fetchCssdBatchHeatRisk } from "../../actions/cssd-batch.actions";
import type { BatchHeatRisk } from "../../lib/me-tiet-khuan-batch-heat";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";

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

  if (loading || !risk) return null;

  if (risk.level === "OK") {
    // Mẻ chưa có bộ: thông điệp khác lý do BOM → chưa đủ căn cứ để khuyến nghị phương pháp.
    const chuaDanhGia = risk.messages[0] !== risk.heat.reason;
    return (
      <KsnkContextBanner
        tone="emerald"
        dismissible={false}
        icon={<Thermometer className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />}
        summary={<span className="font-semibold">Gợi ý Spaulding / phương pháp TK</span>}
        detail={
          <>
            <span className="block">{risk.messages[0] || risk.heat.reason}</span>
            {chuaDanhGia ? null : (
              <span className="mt-0.5 block font-semibold">Khuyến nghị: {risk.heat.methodLabelVi}</span>
            )}
          </>
        }
      />
    );
  }

  const isBlock = risk.level === "BLOCK";
  const Icon = isBlock ? ShieldAlert : AlertTriangle;

  return (
    <KsnkContextBanner
      tone={isBlock ? "rose" : "amber"}
      dismissible={false}
      icon={
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${isBlock ? "text-red-600" : "text-amber-600"}`}
          aria-hidden
        />
      }
      summary={
        <span className="font-semibold">
          Cảnh báo dự phòng — Spaulding / nhiệt
        </span>
      }
      detail={
        <>
          <ul className="list-disc space-y-0.5 pl-4">
            {risk.messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <span className="mt-1 block font-semibold">Khuyến nghị: {risk.heat.methodLabelVi}</span>
        </>
      }
    />
  );
}
