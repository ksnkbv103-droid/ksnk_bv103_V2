"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { closeIncidentRelease } from "../actions/su-co-report.actions";

type Props = {
  incidentId: string;
  onClosed?: () => void;
  className?: string;
};

export default function IncidentCloseReleaseButton({ incidentId, onClosed, className }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    const soBienBan = window.prompt("Số biên bản giải phóng (bắt buộc):");
    if (soBienBan == null) return;
    const lyDo = window.prompt("Lý do đóng / giải phóng (bắt buộc):");
    if (lyDo == null) return;
    setLoading(true);
    try {
      const res = await closeIncidentRelease(incidentId, { lyDo, soBienBan });
      if (!res.success) {
        toast.error(res.error || "Không đóng (giải phóng) được phiếu.");
        return;
      }
      toast.success("Đã đóng (giải phóng) phiếu sự cố.");
      onClosed?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không đóng được phiếu.");
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
        "inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-[11px] font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-50"
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Đóng (giải phóng)
    </button>
  );
}
