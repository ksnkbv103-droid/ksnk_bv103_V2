"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  loadBoCompositionByMaBo,
  type CompositionReconcilePayload,
} from "@/modules/cssd-erp/contexts/inventory-instrument/entrypoint";
import {
  applySetReconcileLineInference,
  buildCanKhoPrefill,
  canKhoLineKeys,
  reconcileLineKey,
  type CanKhoDirection,
  type CanKhoPrefill,
  type SetReconcileLineInput,
  type SetReconcileLineKind,
} from "@/lib/domain/cssd-set-reconcile";
import { claimSetReconcileDraftAction, releaseSetReconcileDraftAction } from "../actions/set-reconcile-draft.actions";
import { listLoaiDungCuForReconcileAction } from "../actions/set-reconcile-campaign.actions";
import { bv103TableLayout } from "@/lib/bv103-table-layout";
import InstrumentSetReconcileRow, {
  type KhacReconcileOption,
  type LoaiReconcileOption,
} from "./InstrumentSetReconcileRow";

export type SetReconcileFormState = {
  boDungCuId: string;
  draftIncidentId: string;
  maBo: string;
  tenBo: string;
  lines: SetReconcileLineInput[];
};

type Props = {
  maQR: string;
  enabled: boolean;
  station?: string;
  initialKindHint?: SetReconcileLineKind | null;
  initialChiTietId?: string;
  toolbar?: React.ReactNode;
  onChange: (state: SetReconcileFormState | null) => void;
  onCanKho?: (prefill: CanKhoPrefill) => void;
};

function fromPayload(data: CompositionReconcilePayload): SetReconcileLineInput[] {
  return data.items.map((row) => ({
    chiTietId: row.chiTietId,
    loaiDungCuId: row.loaiDungCuId,
    maLoai: row.maLoai,
    tenDungCuLe: row.tenDungCuLe,
    soLuongChuan: row.soLuongKeHoach,
    soLuongThucTe: row.soLuongThucTe,
    soLuongDem: row.soLuongThucTe,
    maKhac: row.maKhac || "",
    maKhacGoc: row.maKhac || "",
    kind: "KHOP" as const,
  }));
}

export default function InstrumentSetReconcileTable({
  maQR,
  enabled,
  station,
  initialKindHint,
  initialChiTietId,
  toolbar,
  onChange,
  onCanKho,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [state, setState] = useState<SetReconcileFormState | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loaiOptions, setLoaiOptions] = useState<LoaiReconcileOption[]>([]);
  const [khacIndex, setKhacIndex] = useState<KhacReconcileOption[]>([]);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current(state);
  }, [state]);

  useEffect(() => {
    if (!enabled) return;
    void listLoaiDungCuForReconcileAction().then((res) => {
      if (res.success) {
        setLoaiOptions(res.data);
        setKhacIndex(res.khacIndex || []);
      }
    });
  }, [enabled]);

  const load = useCallback(async () => {
    const code = maQR.trim().toUpperCase();
    if (!code || !enabled) {
      setState(null);
      return;
    }
    setLoading(true);
    setGateError(null);
    try {
      const res = await loadBoCompositionByMaBo(code);
      const claimed = await claimSetReconcileDraftAction({
        boDungCuId: res.data.boDungCuId,
        maBo: res.data.maBo,
        station,
      });
      if (!claimed.success) {
        setGateError(claimed.error);
        setState(null);
        return;
      }
      const lines = fromPayload(res.data);
      if (initialKindHint && initialChiTietId) {
        const hit = lines.find((l) => l.chiTietId === initialChiTietId);
        if (hit) hit.kind = initialKindHint;
      }
      setSelectedKeys([]);
      setState({
        boDungCuId: res.data.boDungCuId,
        draftIncidentId: claimed.draftId,
        maBo: res.data.maBo,
        tenBo: res.data.tenBo,
        lines,
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải thành phần bộ.");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [maQR, enabled, station, initialKindHint, initialChiTietId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const draftId = state?.draftIncidentId;
    return () => {
      if (draftId) void releaseSetReconcileDraftAction(draftId);
    };
  }, [state?.draftIncidentId]);

  const patchLine = (idx: number, patch: Partial<SetReconcileLineInput>) => {
    setState((prev) => {
      if (!prev) return prev;
      const lines = prev.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
      return { ...prev, lines };
    });
  };

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const runCanKho = (direction: CanKhoDirection) => {
    if (!state || !onCanKho) return;
    const { prefill, error } = buildCanKhoPrefill({
      maBo: state.maBo,
      direction,
      lines: state.lines,
      selectedKeys,
      khoStock: loaiOptions,
    });
    if (error || !prefill) return toast.error(error || "Không cân kho được.");
    onCanKho(prefill);
  };

  const addLine = () => {
    const loai = loaiOptions[0];
    if (!loai) return toast.error("Chưa có loại dụng cụ trong danh mục.");
    setState((prev) => {
      if (!prev) return prev;
      const added: SetReconcileLineInput = applySetReconcileLineInference({
        loaiDungCuId: loai.id,
        maLoai: loai.ma,
        tenDungCuLe: loai.ten,
        soLuongChuan: 1,
        soLuongThucTe: 0,
        soLuongDem: 1,
        kind: "THEM_DONG",
      });
      return { ...prev, lines: [...prev.lines, added] };
    });
  };

  return (
    <div className="flex max-h-[min(72dvh,52rem)] min-h-[14rem] flex-col overflow-hidden rounded-[var(--radius-table)] bg-white ring-1 ring-slate-200/90">
      {toolbar ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-2.5 py-2">
          <div className="min-w-0 flex-1">{toolbar}</div>
          {loading ? <Loader2 className="shrink-0 animate-spin text-slate-400" size={14} /> : null}
        </div>
      ) : null}
      {!maQR.trim() ? (
        <p className="px-2.5 py-3 text-[11px] text-slate-500">Chọn bộ để xem thành phần.</p>
      ) : gateError ? (
        <p className="px-2.5 py-3 text-[12px] text-amber-800">{gateError}</p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[48rem] text-left text-[11px]">
              <thead className={bv103TableLayout.theadRow}>
                <tr>
                  {onCanKho ? <th className={`${bv103TableLayout.th} w-8`} /> : null}
                  <th className={bv103TableLayout.th}>Mã loại</th>
                  <th className={bv103TableLayout.th}>Mã khắc</th>
                  <th className={bv103TableLayout.th}>Tên / đặc điểm</th>
                  <th className={`${bv103TableLayout.th} text-center`}>Chuẩn</th>
                  <th className={`${bv103TableLayout.th} text-center`}>Hệ thống</th>
                  <th className={`${bv103TableLayout.th} text-center`}>Đếm</th>
                  <th className={bv103TableLayout.th}>Lệch</th>
                  <th className={bv103TableLayout.th}>Ghi chú lý do</th>
                </tr>
              </thead>
              <tbody className={bv103TableLayout.tbody}>
                {(state?.lines || []).map((line, idx) => {
                  const key = reconcileLineKey(line, idx);
                  return (
                    <InstrumentSetReconcileRow
                      key={key}
                      line={line}
                      loaiOptions={loaiOptions}
                      khacIndex={khacIndex}
                      selected={selectedKeys.includes(key)}
                      onToggleSelect={onCanKho ? () => toggleSelect(key) : undefined}
                      onPatch={(patch) => patchLine(idx, patch)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 px-2.5 py-1.5">
            {onCanKho ? (
              <>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[var(--primary)]"
                  onClick={() => setSelectedKeys(canKhoLineKeys(state?.lines || []))}
                >
                  Chọn dòng lệch
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[var(--primary)]"
                  onClick={() => runCanKho("LAY_KHO")}
                >
                  Lấy từ kho
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[var(--primary)]"
                  onClick={() => runCanKho("TRA_KHO")}
                >
                  Trả kho
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)]"
              onClick={addLine}
            >
              <Plus size={14} /> Thêm dòng vào bộ (chờ duyệt)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
