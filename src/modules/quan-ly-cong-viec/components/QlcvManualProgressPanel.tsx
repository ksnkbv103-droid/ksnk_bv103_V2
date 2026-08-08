"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { reportQlcvManualProgress } from "../actions/cong-viec-checklist.actions";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";

type Props = {
  congViecId: string;
  initialPercent: number;
  readOnly?: boolean;
  onUpdated?: () => void;
};

export function QlcvManualProgressPanel({ congViecId, initialPercent, readOnly, onUpdated }: Props) {
  const [pct, setPct] = useState(() => Math.min(100, Math.max(0, Number(initialPercent ?? 0))));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPct(Math.min(100, Math.max(0, Number(initialPercent ?? 0))));
  }, [congViecId, initialPercent]);

  const dirty = pct !== Math.min(100, Math.max(0, Number(initialPercent ?? 0)));

  const persist = async () => {
    setSaving(true);
    try {
      await reportQlcvManualProgress(congViecId, pct);
      toast.success("Đã cập nhật tiến độ.");
      onUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không lưu được tiến độ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${UI.sectionGap} space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tiến độ thực hiện</span>
        <span className="text-sm font-semibold tabular-nums text-[var(--primary)]">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!readOnly ? (
        <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:p-4">
          <label className="block text-xs text-slate-600">
            Kéo thanh để báo cáo % (việc không dùng checklist)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            disabled={saving}
            onChange={(e) => setPct(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-[var(--primary)]"
            aria-label="Phần trăm hoàn thành"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {[0, 25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={saving}
                  onClick={() => setPct(v)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium tabular-nums ${
                    pct === v
                      ? "bg-[var(--primary)] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
            <button
              type="button"
              className={C.btnPrimary}
              disabled={saving || !dirty}
              onClick={() => void persist()}
            >
              {saving ? "Đang lưu…" : "Lưu tiến độ"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
