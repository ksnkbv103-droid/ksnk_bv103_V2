"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { voidIncidentReport } from "../actions/su-co-report.actions";
import {
  INCIDENT_VOID_REASON_CODES,
  INCIDENT_VOID_REASON_LABEL,
  type IncidentVoidReasonCode,
} from "../domain/cssd-incident-status";

type Props = {
  incidentId: string;
  onVoided?: () => void;
};

export default function IncidentVoidButton({ incidentId, onVoided }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<IncidentVoidReasonCode>("NHAP_NHAM");
  const [note, setNote] = useState("");

  const onConfirm = async () => {
    setLoading(true);
    try {
      const res = await voidIncidentReport(incidentId, {
        voidReasonCode: reason,
        voidReasonNote: note,
      });
      if (!res.success) {
        toast.error(res.error || "Không vô hiệu được phiếu.");
        return;
      }
      toast.success(res.already ? "Phiếu đã vô hiệu." : "Đã vô hiệu phiếu sự cố.");
      setOpen(false);
      onVoided?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không vô hiệu được phiếu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Vô hiệu phiếu
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <p className="text-sm font-semibold text-slate-900">Vô hiệu phiếu sự cố</p>
            <p className="mt-1 text-[11px] text-slate-600">
              Bắt buộc chọn lý do. Không kéo lùi chu trình nếu bộ đã đi tiếp sau rollback.
            </p>
            <label className="mt-3 block text-[11px] font-medium text-slate-700">
              Lý do
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value as IncidentVoidReasonCode)}
              >
                {INCIDENT_VOID_REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {INCIDENT_VOID_REASON_LABEL[code]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-[11px] font-medium text-slate-700">
              Ghi chú {reason === "KHAC" ? "(bắt buộc)" : "(tuỳ chọn)"}
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
                onClick={() => void onConfirm()}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Xác nhận vô hiệu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
