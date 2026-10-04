"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { voidIncidentReport } from "../actions/su-co-report.actions";

type Props = {
  incidentId: string;
  onVoided?: () => void;
};

export default function IncidentVoidButton({ incidentId, onVoided }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    const ok = window.confirm(
      "Vô hiệu phiếu này? Bộ quay lại khâu trước khi báo nếu phiếu vừa đẩy lui. Cờ đỏ, tồn Hỏng/Mất và số trên báo cáo cập nhật lại. Phiếu không hiện trên nhật ký.",
    );
    if (!ok) return;
    setLoading(true);
    try {
      const res = await voidIncidentReport(incidentId);
      if (!res.success) {
        toast.error(res.error || "Không vô hiệu được phiếu.");
        return;
      }
      toast.success(res.already ? "Phiếu đã vô hiệu." : "Đã vô hiệu phiếu sự cố.");
      onVoided?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không vô hiệu được phiếu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={loading}
      className="inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Vô hiệu phiếu
    </button>
  );
}
