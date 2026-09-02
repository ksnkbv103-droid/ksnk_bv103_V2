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
import { listActiveBoForInstrumentTransferAction } from "../actions/su-co-bo-picker.actions";
import {
  formatLechVsChuan,
  lechVsChuan,
  suggestedLayKhoQty,
  suggestedTraKhoQty,
} from "@/lib/domain/cssd-instrument-incident";

export type InstrumentIncidentFormState = {
  chiTietId: string;
  loaiDungCuId: string;
  boDungCuId: string;
  tenDungCuLe: string;
  quantity: number;
  maQrDen: string;
  soLuongThucTe: number;
  soLuongChuan: number;
  soLuongKho: number;
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

type BoOption = { id: string; ten_bo: string; ma_bo: string };

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
  const [boOptions, setBoOptions] = useState<BoOption[]>([]);
  const [boLoading, setBoLoading] = useState(false);

  const isTransfer = typeId === "INSTRUMENT_TRANSFER";
  const isReplenish = typeId === "INSTRUMENT_REPLENISH";
  const isReturn = typeId === "INSTRUMENT_RETURN";
  const isKhoMove = isReplenish || isReturn;

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
  }, [maQR, enabled, onChange]);

  useEffect(() => {
    void fetchComposition();
  }, [fetchComposition]);

  useEffect(() => {
    if (!isTransfer || !enabled) {
      setBoOptions([]);
      return;
    }
    let alive = true;
    setBoLoading(true);
    void listActiveBoForInstrumentTransferAction().then((res) => {
      if (!alive) return;
      setBoLoading(false);
      if (!res.success) {
        toast.error(res.error || "Không tải danh sách bộ đích.");
        return;
      }
      const source = maQR.trim().toUpperCase();
      setBoOptions(res.data.filter((b) => b.ma_bo.toUpperCase() !== source));
    });
    return () => {
      alive = false;
    };
  }, [isTransfer, enabled, maQR]);

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
    if (!selectedChiTietId || !data) return;
    const row = data.items.find((r) => r.chiTietId === selectedChiTietId);
    if (!row) return;
    if (isReplenish) {
      setQuantity(
        Math.max(1, suggestedLayKhoQty(row.soLuongKeHoach, row.soLuongThucTe, row.soLuongKhoDuPhong)),
      );
    } else if (isReturn) {
      setQuantity(Math.max(1, suggestedTraKhoQty(row.soLuongKeHoach, row.soLuongThucTe)));
    } else {
      setQuantity(1);
    }
  }, [selectedChiTietId, typeId, data, isReplenish, isReturn]);

  useEffect(() => {
    if (!data || !selectedRow) {
      onChange(null);
      return;
    }
    const maxQty = isReplenish
      ? suggestedLayKhoQty(selectedRow.soLuongKeHoach, selectedRow.soLuongThucTe, selectedRow.soLuongKhoDuPhong)
      : isReturn
        ? suggestedTraKhoQty(selectedRow.soLuongKeHoach, selectedRow.soLuongThucTe)
        : selectedRow.soLuongThucTe;
    const qty = Math.min(Math.max(1, quantity), Math.max(1, maxQty || 1));
    onChange({
      chiTietId: selectedRow.chiTietId,
      loaiDungCuId: selectedRow.loaiDungCuId,
      boDungCuId: data.boDungCuId,
      tenDungCuLe: selectedRow.tenDungCuLe,
      quantity: qty,
      maQrDen: maQrDen.trim().toUpperCase(),
      soLuongThucTe: selectedRow.soLuongThucTe,
      soLuongChuan: selectedRow.soLuongKeHoach,
      soLuongKho: selectedRow.soLuongKhoDuPhong,
      reserveQty: selectedRow.soLuongKhoDuPhong,
    });
  }, [data, selectedRow, quantity, maQrDen, isReplenish, isReturn, onChange]);

  if (!maQR.trim()) {
    return (
      <p className="text-[11px] font-medium text-slate-500">
        Chọn hoặc quét mã bộ dụng cụ trước để chọn loại dụng cụ trong bộ.
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
          <p className="text-[11px] leading-snug text-slate-500">
            Chỉ chọn loại đã có trên bộ. Đổi định mức (thêm/xóa dòng chuẩn) và sửa mã loại toàn viện làm ở Quản trị — cửa này không thêm dòng, không đổi mã gốc.
          </p>
          <div className="space-y-1.5">
            <label className={bv103LayoutChrome.labelBlock}>Loại dụng cụ trong bộ</label>
            <select
              value={selectedChiTietId}
              onChange={(e) => {
                setSelectedChiTietId(e.target.value);
                setQuantity(1);
              }}
              className={bv103LayoutChrome.controlSelectNative}
            >
              <option value="">— Chọn dụng cụ —</option>
              {data.items.map((row) => {
                const lech = lechVsChuan(row.soLuongKeHoach, row.soLuongThucTe);
                return (
                  <option key={row.chiTietId} value={row.chiTietId}>
                    {row.tenDungCuLe} · chuẩn {row.soLuongKeHoach} · bộ {row.soLuongThucTe}
                    {lech !== 0 ? ` · ${formatLechVsChuan(lech)}` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedRow ? (
            <p className="text-[11px] text-slate-600">
              Chuẩn {selectedRow.soLuongKeHoach} · trên bộ {selectedRow.soLuongThucTe} · kho {selectedRow.soLuongKhoDuPhong}
              {" · "}
              {formatLechVsChuan(lechVsChuan(selectedRow.soLuongKeHoach, selectedRow.soLuongThucTe))}
            </p>
          ) : null}

          {selectedRow && !isTransfer ? (
            <div className="space-y-1.5">
              <label className={bv103LayoutChrome.labelBlock}>
                {isReplenish
                  ? "Số lấy từ kho cho đủ chuẩn"
                  : isReturn
                    ? "Số trả phần thừa về kho"
                    : "Số lượng báo cáo"}
                <span className="ml-1 font-normal text-slate-500">
                  {isReplenish
                    ? `(tối đa ${suggestedLayKhoQty(selectedRow.soLuongKeHoach, selectedRow.soLuongThucTe, selectedRow.soLuongKhoDuPhong)})`
                    : isReturn
                      ? `(tối đa ${suggestedTraKhoQty(selectedRow.soLuongKeHoach, selectedRow.soLuongThucTe)})`
                      : `(tối đa ${selectedRow.soLuongThucTe})`}
                </span>
              </label>
              <input
                type="number"
                min={1}
                max={
                  isReplenish
                    ? suggestedLayKhoQty(selectedRow.soLuongKeHoach, selectedRow.soLuongThucTe, selectedRow.soLuongKhoDuPhong)
                    : isReturn
                      ? suggestedTraKhoQty(selectedRow.soLuongKeHoach, selectedRow.soLuongThucTe)
                      : selectedRow.soLuongThucTe
                }
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                className={bv103LayoutChrome.controlInput}
                disabled={isKhoMove && (isReplenish
                  ? suggestedLayKhoQty(selectedRow.soLuongKeHoach, selectedRow.soLuongThucTe, selectedRow.soLuongKhoDuPhong) < 1
                  : suggestedTraKhoQty(selectedRow.soLuongKeHoach, selectedRow.soLuongThucTe) < 1)}
              />
            </div>
          ) : null}

          {selectedRow && isTransfer ? (
            <>
              <div className="space-y-1.5">
                <label className={bv103LayoutChrome.labelBlock}>
                  Bộ đích {boLoading ? <Loader2 className="ml-1 inline animate-spin" size={12} /> : null}
                </label>
                <select
                  value={maQrDen}
                  onChange={(e) => setMaQrDen(e.target.value.toUpperCase())}
                  className={bv103LayoutChrome.controlSelectNative}
                >
                  <option value="">— Chọn bộ đích —</option>
                  {boOptions.map((b) => (
                    <option key={b.id} value={b.ma_bo}>
                      {b.ma_bo} — {b.ten_bo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={bv103LayoutChrome.labelBlock}>Hoặc quét / nhập QR bộ đích</label>
                <input
                  value={maQrDen}
                  onChange={(e) => setMaQrDen(e.target.value.toUpperCase())}
                  placeholder="Quét QR bộ đích…"
                  className={`${bv103LayoutChrome.controlInput} font-mono uppercase tracking-wider`}
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
                  className={bv103LayoutChrome.controlInput}
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
