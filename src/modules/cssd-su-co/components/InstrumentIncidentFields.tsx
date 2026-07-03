"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  loadBoCompositionByMaBo,
  type CompositionReconcilePayload,
  type CompositionReconcileRow,
} from "@/modules/cssd-erp/contexts/inventory-instrument/entrypoint";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

export type InstrumentIncidentFormState = {
  chiTietId: string;
  loaiDungCuId: string;
  boDungCuId: string;
  tenDungCuLe: string;
  quantity: number;
  maQrDen: string;
  soLuongThucTe: number;
  reserveQty: number;
};

type Props = {
  maQR: string;
  typeId: string;
  enabled: boolean;
  quyTrinhId?: string | null;
  initialChiTietId?: string;
  initialLoaiDungCuId?: string;
  onChange: (state: InstrumentIncidentFormState | null) => void;
};

export default function InstrumentIncidentFields({
  maQR,
  typeId,
  enabled,
  quyTrinhId,
  initialChiTietId,
  initialLoaiDungCuId,
  onChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompositionReconcilePayload | null>(null);
  const [selectedChiTietId, setSelectedChiTietId] = useState(initialChiTietId || "");
  const [quantity, setQuantity] = useState(1);
  const [maQrDen, setMaQrDen] = useState("");

  const isTransfer = typeId === "INSTRUMENT_TRANSFER";
  const isReplenish = typeId === "INSTRUMENT_REPLENISH";

  const fetchComposition = useCallback(async () => {
    const code = maQR.trim().toUpperCase();
    if (!code || !enabled) {
      setData(null);
      onChange(null);
      return;
    }
    setLoading(true);
    try {
      const res = await loadBoCompositionByMaBo(code);
      setData(res.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải thành phần bộ.");
      setData(null);
      onChange(null);
    } finally {
      setLoading(false);
    }
  }, [maQR, enabled]);

  useEffect(() => {
    void fetchComposition();
  }, [fetchComposition]);

  const selectedRow: CompositionReconcileRow | undefined = data?.items.find(
    (r) => r.chiTietId === selectedChiTietId,
  );

  useEffect(() => {
    if (initialChiTietId && data?.items.some((r) => r.chiTietId === initialChiTietId)) {
      setSelectedChiTietId(initialChiTietId);
    } else if (initialLoaiDungCuId && data) {
      const match = data.items.find((r) => r.loaiDungCuId === initialLoaiDungCuId);
      if (match) setSelectedChiTietId(match.chiTietId);
    }
  }, [initialChiTietId, initialLoaiDungCuId, data]);

  useEffect(() => {
    if (!data || !selectedRow) {
      onChange(null);
      return;
    }
    const maxQty = isReplenish ? 99 : selectedRow.soLuongThucTe;
    const qty = Math.min(Math.max(1, quantity), Math.max(1, maxQty));
    onChange({
      chiTietId: selectedRow.chiTietId,
      loaiDungCuId: selectedRow.loaiDungCuId,
      boDungCuId: data.boDungCuId,
      tenDungCuLe: selectedRow.tenDungCuLe,
      quantity: qty,
      maQrDen: maQrDen.trim().toUpperCase(),
      soLuongThucTe: selectedRow.soLuongThucTe,
      reserveQty: 0,
    });
  }, [data, selectedRow, quantity, maQrDen, isReplenish, onChange]);

  if (!maQR.trim()) {
    return (
      <p className="text-[11px] font-medium text-slate-500">
        Quét mã QR bộ dụng cụ trước để chọn loại dụng cụ trong bộ.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase text-slate-600">Chi tiết dụng cụ trong bộ</p>
        {loading ? <Loader2 className="animate-spin text-slate-400" size={16} /> : null}
      </div>

      {!loading && data && data.items.length > 0 ? (
        <>
          <div className="space-y-1.5">
            <label className={bv103LayoutChrome.labelBlock}>Loại dụng cụ trong bộ</label>
            <select
              value={selectedChiTietId}
              onChange={(e) => {
                setSelectedChiTietId(e.target.value);
                setQuantity(1);
              }}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary)]"
            >
              <option value="">— Chọn dụng cụ —</option>
              {data.items.map((row) => (
                <option key={row.chiTietId} value={row.chiTietId}>
                  {row.tenDungCuLe} · TT {row.soLuongThucTe}/{row.soLuongKeHoach}
                </option>
              ))}
            </select>
          </div>

          {selectedRow && !isTransfer ? (
            <div className="space-y-1.5">
              <label className={bv103LayoutChrome.labelBlock}>
                Số lượng {isReplenish ? "bổ sung" : "báo cáo"}
                {!isReplenish ? (
                  <span className="ml-1 font-normal text-slate-500">
                    (tối đa {selectedRow.soLuongThucTe})
                  </span>
                ) : null}
              </label>
              <input
                type="number"
                min={1}
                max={isReplenish ? 99 : selectedRow.soLuongThucTe}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 outline-none focus:border-[var(--primary)]"
              />
            </div>
          ) : null}

          {selectedRow && isTransfer ? (
            <>
              <div className="space-y-1.5">
                <label className={bv103LayoutChrome.labelBlock}>QR bộ đích</label>
                <input
                  value={maQrDen}
                  onChange={(e) => setMaQrDen(e.target.value.toUpperCase())}
                  placeholder="QUÉT QR BỘ ĐÍCH..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-mono font-bold uppercase tracking-widest text-slate-800 outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className={bv103LayoutChrome.labelBlock}>
                  Số lượng điều chuyển
                  <span className="ml-1 font-normal text-slate-500">
                    (tối đa {selectedRow.soLuongThucTe})
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedRow.soLuongThucTe}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 outline-none focus:border-[var(--primary)]"
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {!loading && data && data.items.length === 0 ? (
        <p className="text-xs text-slate-400">Bộ chưa có thành phần trong danh mục.</p>
      ) : null}

      {quyTrinhId ? (
        <input type="hidden" name="quyTrinhId" value={quyTrinhId} readOnly />
      ) : null}
    </div>
  );
}
