"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { closeIncidentRelease } from "../actions/su-co-report.actions";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type Props = {
  incidentId: string;
  onClosed?: () => void;
  className?: string;
};

export default function IncidentCloseReleaseButton({ incidentId, onClosed, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [soBienBan, setSoBienBan] = useState("");
  const [lyDo, setLyDo] = useState("");

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSo = soBienBan.trim();
    const cleanLyDo = lyDo.trim();
    if (!cleanSo) {
      toast.error("Vui lòng nhập số biên bản giải phóng.");
      return;
    }
    if (!cleanLyDo || cleanLyDo.length < 3) {
      toast.error("Vui lòng nhập lý do giải phóng (tối thiểu 3 ký tự).");
      return;
    }

    setLoading(true);
    try {
      const res = await closeIncidentRelease(incidentId, { lyDo: cleanLyDo, soBienBan: cleanSo });
      if (!res.success) {
        toast.error(res.error || "Không đóng (giải phóng) được phiếu.");
        return;
      }
      toast.success("Đã đóng (giải phóng) phiếu sự cố.");
      setOpen(false);
      onClosed?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không đóng được phiếu.");
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
        className={
          className ??
          "inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-[11px] font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-50"
        }
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={14} />}
        Đóng (giải phóng)
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Đóng (giải phóng) phiếu sự cố</h3>
                <p className="text-[11px] text-slate-500">
                  Gỡ khóa an toàn sau khi họp thẩm định / xử lý hoàn tất
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={onConfirm} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className={bv103LayoutChrome.labelBlock}>
                  Số biên bản giải phóng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={soBienBan}
                  onChange={(e) => setSoBienBan(e.target.value)}
                  placeholder="VD: BB-KSNK-2026/04..."
                  className={`${bv103LayoutChrome.controlInput} bg-slate-50`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={bv103LayoutChrome.labelBlock}>
                  Lý do đóng / kết luận giải phóng <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={lyDo}
                  onChange={(e) => setLyDo(e.target.value)}
                  placeholder="Ghi rõ kết luận kiểm tra, kết quả cấy vi sinh hoặc biện pháp khắc phục..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-[var(--primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/15"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="h-9 rounded-lg border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Xác nhận đóng phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
