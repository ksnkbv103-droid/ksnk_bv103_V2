"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  loadBoCompositionReconcile,
  type CompositionReconcilePayload,
} from "../../actions/cssd-composition-reconcile.actions";
import { CSSD_UI_PANEL, CSSD_UI_SECTION_TITLE, CSSD_UI_TABLE_HEADER } from "../../shared/ui/cssd-ui-chrome";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";
import { registerSplitSubQrFromMainMaAction } from "../../actions/cssd-register-label.actions";
import { formatSetQtyLine, summarizeSetComposition } from "../../shared/domain/cssd-set-composition";

type Props = {
  boDungCuId: string | null | undefined;
  quyTrinhId?: string | null;
  /** Chỉ hiện khi đang ở trạm Đóng gói hoặc vừa quét bộ. */
  enabled?: boolean;
  /** Trạm đóng gói: kiểm cấu phần trước khi chuyển trạm. */
  gateMode?: boolean;
  onConfirmAdvance?: () => void;
  onCancelGate?: () => void;
  advancing?: boolean;
};

export default function CompositionReconcilePanel({
  boDungCuId,
  quyTrinhId,
  enabled = true,
  gateMode = false,
  onConfirmAdvance,
  onCancelGate,
  advancing = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompositionReconcilePayload | null>(null);
  const [suCoOpen, setSuCoOpen] = useState(false);
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
      setData(res.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải danh sách đối chiếu.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [boDungCuId, enabled]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (!enabled || !boDungCuId) return null;

  const openSuCo = () => {
    if (!data) return;
    setSuCoOpen(true);
  };

  return (
    <>
      <section className={`bv103-stack-in bv103-pad-panel ${CSSD_UI_PANEL}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className={CSSD_UI_SECTION_TITLE}>
              {gateMode ? "Thẻ bộ — cần / thực tế" : "Đối chiếu cấu phần bộ"}
            </h4>
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
              {gateMode ? (
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-800">
                Kiểm đếm trên phiếu bộ; báo Hỏng / Mất / Bổ sung nhiều món một lần. Sau đó quyết định có chuyển chờ tiệt khuẩn.
              </p>
            ) : null}
          </div>
          {loading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
        </div>

        {data?.heat.requireSplit ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
            <ShieldAlert className="mt-0.5 shrink-0" size={18} />
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide">Cần tách gói nhạy nhiệt</p>
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
                className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase text-rose-800 disabled:opacity-50"
              >
                {splitting ? "Đang tách…" : "Tách gói nhạy nhiệt"}
              </button>
            </div>
          </div>
        ) : null}

        {data?.hasGap ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p className="text-[11px] font-medium">
              Bộ đang thiếu cấu phần so với thiết kế. Mở phiếu biến động bộ — một lần gửi cho mọi món lệch.
            </p>
          </div>
        ) : null}

        {data?.replenishWarnings && data.replenishWarnings.length > 0 ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-950 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide">
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
                        <span className="ml-1 bv103-type-label font-semibold text-rose-600">· nhạy nhiệt</span>
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
          <button
            type="button"
            onClick={openSuCo}
            className="h-11 w-full touch-manipulation rounded-xl border border-amber-200 bg-amber-50 text-xs font-semibold uppercase tracking-wide text-amber-900 hover:bg-amber-100"
          >
            Báo biến động bộ này
          </button>
        ) : null}

        {gateMode ? (
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancelGate}
              disabled={advancing}
              className="h-11 touch-manipulation rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Đóng (chưa chuyển)
            </button>
            <button
              type="button"
              onClick={onConfirmAdvance}
              disabled={advancing || loading}
              className="h-11 touch-manipulation rounded-xl bg-emerald-600 px-5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {advancing ? "Đang chuyển…" : "Xác nhận chuyển chờ tiệt khuẩn"}
            </button>
          </div>
        ) : null}
      </section>

      <IncidentReportModal
        isOpen={suCoOpen}
        onClose={() => setSuCoOpen(false)}
        station="DONG_GOI"
        defaultGroup="INSTRUMENT"
        initialMaQR={data?.maBo}
        initialTypeId="INSTRUMENT_SET_RECONCILE"
        quyTrinhId={quyTrinhId}
        onSuccess={() => void fetchData()}
      />
    </>
  );
}
