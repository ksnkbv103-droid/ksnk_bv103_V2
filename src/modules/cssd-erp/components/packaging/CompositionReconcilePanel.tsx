"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cssdCatalogEditProposalHref } from "@/lib/cssd-routes";
import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  loadBoCompositionReconcile,
  type CompositionReconcilePayload,
} from "../../actions/cssd-composition-reconcile.actions";
import { CSSD_UI_PANEL, CSSD_UI_SECTION_TITLE, CSSD_UI_TABLE_HEADER } from "../../shared/ui/cssd-ui-chrome";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { registerSplitSubQrFromMainMaAction } from "../../actions/cssd-register-label.actions";
import { formatSetQtyLine, summarizeSetComposition } from "../../shared/domain/cssd-set-composition";

type Props = {
  boDungCuId: string | null | undefined;
  quyTrinhId?: string | null;
  /** Chỉ hiện khi đang xem cấu phần (danh mục / đối chiếu). Không dùng trên trạm Đóng gói. */
  enabled?: boolean;
};

/** Đối chiếu cấu phần bộ — chỉ danh mục / đọc; không gate Đóng gói (CSSD-03). */
export default function CompositionReconcilePanel({
  boDungCuId,
  enabled = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompositionReconcilePayload | null>(null);
  const [splitting, setSplitting] = useState(false);

  const fetchData = useCallback(async () => {
    const id = String(boDungCuId || "").trim();
    if (!id || !enabled) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await loadBoCompositionReconcile(id);
      if (!res || !("success" in res) || !res.success) {
        throw new Error(
          res && "error" in res && typeof res.error === "string" ? res.error : "Không tải được cấu phần bộ.",
        );
      }
      setData(res.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải được cấu phần bộ.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [boDungCuId, enabled]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (!enabled || !boDungCuId) return null;

  return (
    <>
      <section className={`bv103-stack-in bv103-pad-panel ${CSSD_UI_PANEL}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className={CSSD_UI_SECTION_TITLE}>Đối chiếu cấu phần bộ</h4>
            <p className="text-[11px] font-medium text-slate-500">
              {data?.maBo ? `${data.maBo} — ` : ""}
              {data?.tenBo || "Đang tải…"}
            </p>
            {data ? (
              <p className={`mt-1 text-sm font-semibold tabular-nums ${data.hasGap ? "text-red-700" : "text-emerald-800"}`}>
                {formatSetQtyLine(
                  summarizeSetComposition(data.items).can,
                  summarizeSetComposition(data.items).thuc,
                  summarizeSetComposition(data.items).thieu,
                )}
              </p>
            ) : null}
          </div>
          {loading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
        </div>

        {data?.heat.requireSplit ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
            <ShieldAlert className="mt-0.5 shrink-0" size={18} />
            <div className="space-y-2">
              <p className="text-[11px] font-semibold">Cần tách gói không chịu nhiệt</p>
              <p className="text-[11px] font-medium leading-relaxed">{data.heat.reason}</p>
              {data.heat.methodLabelVi ? (
                <p className="bv103-type-label font-semibold text-rose-800">Gợi ý: {data.heat.methodLabelVi}</p>
              ) : null}
              <button
                type="button"
                disabled={splitting || !data.maBo}
                onClick={() => {
                  setSplitting(true);
                  void registerSplitSubQrFromMainMaAction(data.maBo)
                    .then((res) => {
                      if (!res.success) throw new Error(res.error);
                      toast.success(`Đã tách gói phụ: ${res.ma_vach_qr_phu}`);
                    })
                    .catch((e: unknown) => {
                      toast.error(e instanceof Error ? e.message : "Không tách được gói phụ.");
                    })
                    .finally(() => setSplitting(false));
                }}
                className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-800 disabled:opacity-50"
              >
                {splitting ? "Đang tách…" : "Tách gói không chịu nhiệt"}
              </button>
            </div>
          </div>
        ) : null}

        {data?.hasGap ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p className="text-[11px] font-medium">
              Bộ đang thiếu cấu phần so với thiết kế. Ghi tại Luân chuyển / Sự cố (không trên trạm đóng gói).
            </p>
          </div>
        ) : null}

        {data?.replenishWarnings && data.replenishWarnings.length > 0 ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-950 space-y-1">
            <p className="text-[11px] font-semibold">
              Cảnh báo kho dự phòng (danh mục dụng cụ)
            </p>
            <ul className="list-disc pl-4 text-[11px] font-medium space-y-0.5">
              {data.replenishWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {!loading && data && data.items.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">Chưa có cấu phần trong danh mục bộ.</p>
        ) : null}

        {data && data.items.length > 0 ? (
          <ResponsiveTableShell unboxed maxHeight="max-h-[min(360px,50dvh)]">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className={`px-2 py-2 ${CSSD_UI_TABLE_HEADER}`}>Cấu phần</th>
                  <th className={`px-2 py-2 text-center ${CSSD_UI_TABLE_HEADER} w-14`}>Cần</th>
                  <th className={`px-2 py-2 text-center ${CSSD_UI_TABLE_HEADER} w-16`}>Thực tế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((row) => (
                  <tr key={row.chiTietId} className={row.isMissing ? "bg-red-50/40" : ""}>
                    <td className="px-2 py-2 font-semibold text-slate-800">
                      {row.tenDungCuLe}
                      {row.maLoai ? (
                        <span className="ml-1 font-mono font-normal text-slate-500">({row.maLoai})</span>
                      ) : null}
                      {!row.isChiuNhiet ? (
                        <span className="ml-1 bv103-type-label font-semibold text-rose-600">· không chịu nhiệt</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-center bv103-type-label">{row.soLuongKeHoach}</td>
                    <td className="px-2 py-2 text-center">
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
          </ResponsiveTableShell>
        ) : null}

        {data && data.items.length > 0 ? (
          <Link
            href={cssdCatalogEditProposalHref({
              kind: "BOM",
              ma: data.maBo,
              ten: data.tenBo,
              targetId: boDungCuId,
            })}
            className="inline-flex h-11 w-full touch-manipulation items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            Đề nghị sửa thành phần danh mục
          </Link>
        ) : null}
      </section>
    </>
  );
}
