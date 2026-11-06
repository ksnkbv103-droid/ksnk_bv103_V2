"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeftRight, CheckCircle2, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import InstrumentMoveDualTable from "@/modules/cssd-su-co/components/InstrumentMoveDualTable";
import type { SetReconcileFormState } from "@/modules/cssd-su-co/components/InstrumentSetReconcileTable";
import type { BoCatalogOption } from "@/modules/cssd-su-co/components/SuCoReportFormFields";
import { listActiveBoForInstrumentTransferAction } from "@/modules/cssd-su-co/actions/su-co-bo-picker.actions";
import { applyInstrumentTransferAction } from "@/modules/cssd-erp/actions/cssd-lifecycle.actions";
import {
  INSTRUMENT_MOVE_TYPE_ID,
  resolveInstrumentMoveSubmitTypeId,
  validateInstrumentDoorLines,
} from "@/lib/domain/cssd-set-reconcile";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type Props = {
  initialMa?: string;
  onSubmitted?: () => void;
};

export default function InstrumentTransferForm({ initialMa, onSubmitted }: Props) {
  const [sourceMa, setSourceMa] = useState(initialMa || "");
  const [destMa, setDestMa] = useState("");
  const [boOptions, setBoOptions] = useState<BoCatalogOption[]>([]);
  const [boLoading, setBoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moveUsesKho, setMoveUsesKho] = useState(true);
  const [setReconcileState, setSetReconcileState] = useState<SetReconcileFormState | null>(null);
  const [ghiChu, setGhiChu] = useState("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    setBoLoading(true);
    void listActiveBoForInstrumentTransferAction().then((res) => {
      if (!alive) return;
      setBoLoading(false);
      if (res.success && res.data) {
        setBoOptions(
          res.data.map((b) => ({
            id: b.id,
            ten_bo: b.ten_bo,
            ma_bo: b.ma_bo,
          })),
        );
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceMa.trim()) {
      toast.error("Vui lòng chọn hoặc quét mã bộ dụng cụ nguồn.");
      return;
    }
    if (!moveUsesKho && !destMa.trim()) {
      toast.error("Điều chuyển giữa 2 bộ cần chọn bộ đích.");
      return;
    }
    if (!setReconcileState || !setReconcileState.lines.length) {
      toast.error("Chưa có danh sách dụng cụ luân chuyển.");
      return;
    }

    const submitTypeId =
      resolveInstrumentMoveSubmitTypeId(setReconcileState.lines) || INSTRUMENT_MOVE_TYPE_ID;
    const lineErr = validateInstrumentDoorLines(submitTypeId, setReconcileState.lines);
    if (lineErr) {
      toast.error(lineErr);
      return;
    }

    const descText =
      ghiChu.trim() ||
      (moveUsesKho
        ? "Điều chuyển dụng cụ giữa kho lẻ và bộ."
        : "Điều chuyển dụng cụ giữa hai bộ.");

    setLoading(true);
    try {
      const res = await applyInstrumentTransferAction({
        boDungCuId: setReconcileState.boDungCuId,
        draftIncidentId: setReconcileState.draftIncidentId,
        maBo: setReconcileState.maBo,
        tenBo: setReconcileState.tenBo,
        lines: setReconcileState.lines,
        note: descText,
      });

      if (!res.success) {
        toast.error(res.error || "Không ghi nhận được luân chuyển.");
        return;
      }

      toast.success("Đã ghi nhận luân chuyển dụng cụ thành công!");
      setSubmitted(true);
      onSubmitted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi ghi luân chuyển.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSetReconcileState(null);
    setGhiChu("");
  };

  if (submitted) {
    return (
      <div className="mx-auto my-4 max-w-xl animate-in space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Đã ghi nhận luân chuyển!</h3>
          <p className="mt-1 text-xs text-slate-500">
            Số lượng đã cập nhật vào sổ kho và thành phần bộ dụng cụ.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className={`${T.btnPrimary} text-xs`}
          >
            <PlusCircle size={15} /> Ghi luân chuyển tiếp
          </button>
          <Link
            href="/cssd-dung-cu?tab=BO"
            className={`${T.btnSecondary} text-xs`}
          >
            Xem danh mục bộ
          </Link>
          <Link
            href="/cssd-dung-cu?tab=LOAI"
            className={`${T.btnSecondary} text-xs`}
          >
            Xem tồn kho loại
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <InstrumentMoveDualTable
          enabled
          sourceMa={sourceMa}
          destMa={destMa}
          boOptions={boOptions}
          boLoading={boLoading}
          onSourceMa={setSourceMa}
          onDestMa={setDestMa}
          onScanSource={setSourceMa}
          onScanDest={setDestMa}
          onChange={setSetReconcileState}
          onUsesKho={setMoveUsesKho}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        <label className={bv103LayoutChrome.labelBlock}>Ghi chú luân chuyển (tùy chọn)</label>
        <input
          type="text"
          value={ghiChu}
          onChange={(e) => setGhiChu(e.target.value)}
          placeholder="Lý do bổ sung từ kho hoặc điều chuyển..."
          className={`${bv103LayoutChrome.controlInput} bg-slate-50`}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={loading || !setReconcileState}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-xs font-semibold text-white shadow-md hover:brightness-105 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight size={16} />}
          Xác nhận luân chuyển
        </button>
      </div>
    </form>
  );
}
