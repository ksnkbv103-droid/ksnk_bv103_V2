"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  loadBoCompositionReconcile,
  type CompositionReconcilePayload,
} from "../../actions/cssd-composition-reconcile.actions";
import { formatSetQtyLine, summarizeSetComposition } from "../../shared/domain/cssd-set-composition";
import { CSSD_UI_TABLE_HEADER } from "../../shared/ui/cssd-ui-chrome";

type Props = {
  boDungCuId: string | null | undefined;
  enabled?: boolean;
  compact?: boolean;
};

/** Thẻ bộ vận hành: Cần / Thực tế / thiếu — SSOT view realtime. */
export default function SetCompositionCard({ boDungCuId, enabled = true, compact }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompositionReconcilePayload | null>(null);

  useEffect(() => {
    const id = String(boDungCuId || "").trim();
    if (!id || !enabled) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadBoCompositionReconcile(id)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Không tải được thẻ bộ.");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boDungCuId, enabled]);

  if (!enabled || !boDungCuId) return null;

  const sum = data ? summarizeSetComposition(data.items) : null;

  return (
    <div className={`space-y-3 ${compact ? "" : "rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{data?.tenBo || "Bộ dụng cụ"}</p>
          {data?.maBo ? <p className="font-mono text-[11px] text-slate-500">{data.maBo}</p> : null}
        </div>
        {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" /> : null}
      </div>

      {sum ? (
        <p
          className={`text-sm font-semibold tabular-nums ${
            sum.hasGap ? "text-red-700" : "text-emerald-800"
          }`}
        >
          {formatSetQtyLine(sum.can, sum.thuc, sum.thieu)}
        </p>
      ) : null}

      {!loading && data && data.items.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">Bộ này chưa có cấu phần trong danh mục.</p>
      ) : null}

      {data && data.items.length > 0 ? (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className={`py-1.5 ${CSSD_UI_TABLE_HEADER}`}>Cấu phần</th>
              <th className={`w-14 py-1.5 text-center ${CSSD_UI_TABLE_HEADER}`}>Cần</th>
              <th className={`w-16 py-1.5 text-center ${CSSD_UI_TABLE_HEADER}`}>Thực tế</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((row) => (
              <tr key={row.chiTietId} className={row.isMissing ? "bg-red-50/50" : undefined}>
                <td className="py-1.5 font-medium text-slate-800">{row.tenDungCuLe}</td>
                <td className="py-1.5 text-center tabular-nums text-slate-500">{row.soLuongKeHoach}</td>
                <td className="py-1.5 text-center">
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold tabular-nums ${
                      row.isMissing ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {row.soLuongThucTe}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
