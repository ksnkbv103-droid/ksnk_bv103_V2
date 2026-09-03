"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cssdSuCoInstrumentHref } from "@/lib/cssd-routes";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import {
  loadBoCompositionReconcile,
  type CompositionReconcilePayload,
} from "../../actions/cssd-composition-reconcile.actions";
import { formatSetQtyLine, summarizeSetComposition } from "../../shared/domain/cssd-set-composition";

type Props = {
  boDungCuId: string | null | undefined;
  enabled?: boolean;
  compact?: boolean;
};

/** Thành phần bộ: mã loại / tên loại / số — rà soát trên thanh bảng khi lệch. */
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
  const hasGap = Boolean(data?.hasGap || sum?.hasGap);

  return (
      <ResponsiveTableShell
        maxHeight={compact ? "max-h-[280px]" : "max-h-[350px]"}
        toolbar={
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <p className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
              <span className="font-semibold text-slate-800">{data?.tenBo || "Thành phần bộ"}</span>
              {data?.maBo ? <span className="font-mono text-slate-500"> · {data.maBo}</span> : null}
              {sum ? (
                <span className={`ml-2 tabular-nums ${hasGap ? "font-semibold text-red-700" : "text-emerald-800"}`}>
                  {formatSetQtyLine(sum.can, sum.thuc, sum.thieu)}
                </span>
              ) : null}
            </p>
            {loading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" /> : null}
            {hasGap && data?.maBo ? (
              <Link
                href={cssdSuCoInstrumentHref({ type: "INSTRUMENT_SET_RECONCILE", ma: data.maBo })}
                className="shrink-0 text-[11px] font-semibold text-[var(--primary)] hover:underline"
              >
                Rà soát
              </Link>
            ) : null}
          </div>
        }
      >
        <table className="w-full min-w-[420px] border-collapse text-left text-sm text-slate-700">
          <thead className={L.theadRow}>
            <tr>
              <th className={L.th}>Mã loại</th>
              <th className={L.th}>Tên loại</th>
              <th className={`${L.th} text-center`}>Chuẩn</th>
              <th className={`${L.th} text-center`}>Thực tế</th>
            </tr>
          </thead>
          <tbody className={L.tbody}>
            {(data?.items || []).map((row) => (
              <tr key={row.chiTietId} className={row.isMissing ? "bg-red-50/50" : L.row}>
                <td className={`${L.td} font-mono text-[11px] font-semibold text-violet-700`}>{row.maLoai || "—"}</td>
                <td className={L.td}>{row.tenDungCuLe}</td>
                <td className={`${L.td} text-center tabular-nums`}>{row.soLuongKeHoach}</td>
                <td className={`${L.td} text-center tabular-nums ${row.isMissing ? "font-semibold text-red-700" : ""}`}>
                  {row.soLuongThucTe}
                </td>
              </tr>
            ))}
            {!loading && data && data.items.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${L.td} text-center text-slate-500`}>
                  Bộ này chưa có cấu phần trong danh mục.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </ResponsiveTableShell>
  );
}
