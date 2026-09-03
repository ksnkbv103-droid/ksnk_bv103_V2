"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { confirmIncidentReport } from "../actions/su-co-report.actions";

type Props = {
  incidentId: string;
  onConfirmed?: () => void;
  className?: string;
};

export default function IncidentConfirmButton({ incidentId, onConfirmed, className }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await confirmIncidentReport(incidentId);
      if (!res.success) {
        toast.error(res.error || "Không xác nhận được phiếu.");
        return;
      }
      toast.success("Đã xác nhận phiếu sự cố.");
      onConfirmed?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không xác nhận được phiếu.");
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
        "inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Xác nhận phiếu
    </button>
  );
}
