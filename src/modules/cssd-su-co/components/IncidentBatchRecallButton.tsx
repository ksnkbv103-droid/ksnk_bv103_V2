"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { commandBatchRecallFromIncident } from "../actions/su-co-report.actions";

type Props = {
  incidentId: string;
  onOrdered?: () => void;
  className?: string;
};

/** SC-02: Tổ trưởng / Admin ra lệnh thu hồi theo mẻ từ phiếu đã báo nghi. */
export default function IncidentBatchRecallButton({ incidentId, onOrdered, className }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (!window.confirm("Ra lệnh thu hồi theo mẻ cho phiếu này? Bộ trong CSSD về TN; bộ đã cấp chờ thu về.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await commandBatchRecallFromIncident(incidentId);
      if (!res.success) {
        toast.error(res.error || "Không ra lệnh thu hồi được.");
        return;
      }
      const bits = [
        res.recalledCount ? `${res.recalledCount} bộ trong phạm vi` : "",
        res.holdPendingCount ? `${res.holdPendingCount} chờ thu từ khoa` : "",
        res.machineHeld ? "máy tạm giữ QC" : "",
      ].filter(Boolean);
      toast.success(bits.length ? `Đã ra lệnh thu hồi — ${bits.join("; ")}.` : "Đã ra lệnh thu hồi theo mẻ.");
      onOrdered?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không ra lệnh thu hồi được.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={loading}
      className={
        className ??
        "inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 text-[11px] font-semibold text-orange-900 hover:bg-orange-100 disabled:opacity-50"
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Ra lệnh thu hồi theo mẻ
    </button>
  );
}
