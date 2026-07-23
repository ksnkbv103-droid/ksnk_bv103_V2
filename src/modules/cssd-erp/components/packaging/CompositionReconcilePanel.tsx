"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  loadBoCompositionReconcile,
  type CompositionReconcilePayload,
  type CompositionReconcileRow,
} from "../../actions/cssd-composition-reconcile.actions";
import { CSSD_UI_SECTION_TITLE, CSSD_UI_TABLE_HEADER } from "../../shared/ui/cssd-ui-chrome";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";
import { requestReplenishFromReserveAction } from "@/lib/master-data/cssd-instrument-ops.actions";

type SuCoPrefill = {
  maBo: string;
  chiTietId: string;
  loaiDungCuId: string;
  typeId: string;
};

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

const KIND_TO_TYPE: Record<string, string> = {
  HONG: "INSTRUMENT_BROKEN",
  MAT: "INSTRUMENT_MISSING",
  BO_SUNG: "INSTRUMENT_REPLENISH",
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
  const [suCoPrefill, setSuCoPrefill] = useState<SuCoPrefill | null>(null);
  const [replenishingId, setReplenishingId] = useState<string | null>(null);

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

  const openSuCo = (row: CompositionReconcileRow, kind: "HONG" | "MAT" | "BO_SUNG") => {
    if (!data) return;
    setSuCoPrefill({
      maBo: data.maBo,
      chiTietId: row.chiTietId,
      loaiDungCuId: row.loaiDungCuId,
      typeId: KIND_TO_TYPE[kind],
    });
    setSuCoOpen(true);
  };

  const quickReplenish = async (row: CompositionReconcileRow) => {
    if (!data || row.reserveShortage || row.soLuongKhoDuPhong <= 0 || !row.isMissing) return;
    const qty = Math.min(row.missingCount, row.soLuongKhoDuPhong);
    setReplenishingId(row.chiTietId);
    try {
      const res = await requestReplenishFromReserveAction({
        loaiDungCuId: row.loaiDungCuId,
        boDungCuId: data.boDungCuId,
        quyTrinhId: quyTrinhId || undefined,
        quantity: qty,
        note: `Bù nhanh từ đối chiếu đóng gói (${data.maBo})`,
      });
      if (!res.success) throw new Error(("error" in res && res.error) || "Không bù được kho");
      toast.success(`Đã bù ${qty} × ${row.tenDungCuLe} từ kho dự phòng`);
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi bù kho");
    } finally {
      setReplenishingId(null);
    }
  };

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className={CSSD_UI_SECTION_TITLE}>
              {gateMode ? "Danh mục chi tiết bộ dụng cụ" : "Đối chiếu cấu phần bộ"}
            </h4>
            <p className="text-[11px] font-medium text-slate-500">
              {data?.maBo ? `${data.maBo} — ` : ""}
              {data?.tenBo || "Đang tải…"}
            </p>
            {gateMode ? (
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-800">
                Kiểm đếm từng dụng cụ; báo Hỏng / Mất / Bổ sung nếu cần. Sau đó bạn quyết định có chuyển chờ tiệt khuẩn hay không.
              </p>
            ) : null}
          </div>
          {loading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
        </div>

        {data?.heat.requireSplit ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
            <ShieldAlert className="mt-0.5 shrink-0" size={18} />
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide">Cần tách / đổi phương pháp TK</p>
              <p className="text-[11px] font-medium leading-relaxed">{data.heat.reason}</p>
              {data.heat.methodLabelVi ? (
                <p className="text-[11px] font-bold text-rose-800">
                  Gợi ý: {data.heat.methodLabelVi}
                </p>
              ) : null}
            </div>
          </div>
        ) : data?.heat.methodLabelVi ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
            <ShieldAlert className="mt-0.5 shrink-0 opacity-70" size={18} />
            <p className="text-[11px] font-medium leading-relaxed">
              Spaulding / phương pháp: {data.heat.reason}
            </p>
          </div>
        ) : null}

        {data?.hasGap ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p className="text-[11px] font-medium">
              Bộ đang thiếu cấu phần so với thiết kế. Bấm «Báo sự cố» trên dòng tương ứng để ghi Hỏng / Mất / Bổ sung.
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
          <ResponsiveTableShell
            unboxed
            className="rounded-xl border border-slate-100"
            maxHeight="max-h-[min(360px,50dvh)]"
            mobileCards={
              <ul className="divide-y divide-slate-100">
                {data.items.map((row) => (
                  <li key={row.chiTietId} className={`space-y-2 px-3 py-3 ${row.isMissing ? "bg-red-50/40" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 font-semibold text-slate-800">
                        {row.tenDungCuLe}
                        {!row.isChiuNhiet ? (
                          <span className="ml-1 text-[11px] font-bold text-rose-600">· nhạy nhiệt</span>
                        ) : null}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                          row.isMissing ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {row.soLuongThucTe}/{row.soLuongKeHoach}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => openSuCo(row, "HONG")}
                        className="min-h-11 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-semibold uppercase text-amber-800 touch-manipulation"
                      >
                        Hỏng
                      </button>
                      <button
                        type="button"
                        onClick={() => openSuCo(row, "MAT")}
                        className="min-h-11 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold uppercase text-rose-800 touch-manipulation"
                      >
                        Mất
                      </button>
                      <button
                        type="button"
                        onClick={() => openSuCo(row, "BO_SUNG")}
                        className="min-h-11 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold uppercase text-emerald-800 touch-manipulation"
                      >
                        Bổ sung
                      </button>
                      {row.isMissing && row.soLuongKhoDuPhong > 0 && !row.reserveShortage ? (
                        <button
                          type="button"
                          disabled={replenishingId === row.chiTietId}
                          onClick={() => void quickReplenish(row)}
                          className="min-h-11 rounded-lg border border-sky-200 bg-sky-50 px-2.5 text-[11px] font-semibold uppercase text-sky-800 touch-manipulation disabled:opacity-50"
                        >
                          {replenishingId === row.chiTietId ? "…" : "Bù kho"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            }
          >
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className={`px-2 py-2 ${CSSD_UI_TABLE_HEADER}`}>Cấu phần</th>
                  <th className={`px-2 py-2 text-center ${CSSD_UI_TABLE_HEADER} w-12`}>KH</th>
                  <th className={`px-2 py-2 text-center ${CSSD_UI_TABLE_HEADER} w-12`}>TT</th>
                  <th className={`px-2 py-2 text-center ${CSSD_UI_TABLE_HEADER} w-40`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((row) => (
                  <tr key={row.chiTietId} className={row.isMissing ? "bg-red-50/40" : ""}>
                    <td className="px-2 py-2 font-semibold text-slate-800">
                      {row.tenDungCuLe}
                      {!row.isChiuNhiet ? (
                        <span className="ml-1 text-[11px] font-bold text-rose-600">· nhạy nhiệt</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-slate-500">{row.soLuongKeHoach}</td>
                    <td className="px-2 py-2 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold tabular-nums ${
                          row.isMissing ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {row.soLuongThucTe}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openSuCo(row, "HONG")}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-1.5 py-1 text-[11px] font-semibold uppercase text-amber-800"
                        >
                          Hỏng
                        </button>
                        <button
                          type="button"
                          onClick={() => openSuCo(row, "MAT")}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-1.5 py-1 text-[11px] font-semibold uppercase text-rose-800"
                        >
                          Mất
                        </button>
                        <button
                          type="button"
                          onClick={() => openSuCo(row, "BO_SUNG")}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-[11px] font-semibold uppercase text-emerald-800"
                        >
                          Bổ sung
                        </button>
                        {row.isMissing && row.soLuongKhoDuPhong > 0 && !row.reserveShortage ? (
                          <button
                            type="button"
                            disabled={replenishingId === row.chiTietId}
                            onClick={() => void quickReplenish(row)}
                            className="rounded-lg border border-sky-200 bg-sky-50 px-1.5 py-1 text-[11px] font-semibold uppercase text-sky-800 disabled:opacity-50"
                          >
                            {replenishingId === row.chiTietId ? "…" : "Bù kho"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTableShell>
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
        onClose={() => {
          setSuCoOpen(false);
          setSuCoPrefill(null);
        }}
        station="DONG_GOI"
        defaultGroup="INSTRUMENT"
        initialMaQR={suCoPrefill?.maBo}
        initialChiTietId={suCoPrefill?.chiTietId}
        initialLoaiDungCuId={suCoPrefill?.loaiDungCuId}
        initialTypeId={suCoPrefill?.typeId}
        quyTrinhId={quyTrinhId}
        onSuccess={() => void fetchData()}
      />
    </>
  );
}
