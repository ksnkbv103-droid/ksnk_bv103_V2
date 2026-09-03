"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { loadBoCompositionByMaBo } from "@/modules/cssd-erp/contexts/inventory-instrument/entrypoint";
import {
  applyCanKhoPrefillDelta,
  buildKhoBoMoveLines,
  fillLechVsChuanDelta,
  formatLoaiDungCuLabel,
  rowShowsLechMove,
  type MoveSideKind,
  type ReplenishAddQty,
  type TransferSourceRow,
} from "@/lib/domain/cssd-set-reconcile";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import { listLoaiDungCuForReconcileAction } from "../actions/set-reconcile-campaign.actions";
import { claimSetReconcileDraftAction, releaseSetReconcileDraftAction } from "../actions/set-reconcile-draft.actions";
import { BoSourceFields, type BoCatalogOption } from "./SuCoReportFormFields";
import type { LoaiReconcileOption } from "./InstrumentSetReconcileRow";
import type { SetReconcileFormState } from "./InstrumentSetReconcileTable";
import DualPaneScroll, { MovePaneToolbar } from "./DualPaneScroll";
import QtyJumpField from "./QtyJumpField";

type Props = {
  enabled: boolean;
  station?: string;
  destMa: string;
  khoOnLeft?: boolean;
  hideHint?: boolean;
  boOptions: BoCatalogOption[];
  boLoading?: boolean;
  loadingScan?: boolean;
  onDestMa: (ma: string) => void;
  onScanDest: (ma: string) => void;
  onChange: (state: SetReconcileFormState | null) => void;
  leftKind: MoveSideKind;
  rightKind: MoveSideKind;
  onLeftKind: (kind: MoveSideKind) => void;
  onRightKind: (kind: MoveSideKind) => void;
  prefillMoves?: ReplenishAddQty[] | null;
  onPrefillConsumed?: () => void;
};

export default function InstrumentReplenishDualTable({
  enabled,
  station,
  destMa,
  khoOnLeft = true,
  hideHint,
  boOptions,
  boLoading,
  loadingScan,
  onDestMa,
  onScanDest,
  onChange,
  leftKind,
  rightKind,
  onLeftKind,
  onRightKind,
  prefillMoves,
  onPrefillConsumed,
}: Props) {
  const [loaiOptions, setLoaiOptions] = useState<LoaiReconcileOption[]>([]);
  const [destRows, setDestRows] = useState<TransferSourceRow[]>([]);
  const [header, setHeader] = useState<{ boDungCuId: string; draftIncidentId: string; maBo: string; tenBo: string } | null>(
    null,
  );
  const [delta, setDelta] = useState<Record<string, number>>({});
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [onlyLech, setOnlyLech] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;
    void listLoaiDungCuForReconcileAction().then((res) => {
      if (res.success) setLoaiOptions(res.data);
    });
  }, [enabled]);

  useEffect(() => {
    const draftId = header?.draftIncidentId;
    return () => {
      if (draftId) void releaseSetReconcileDraftAction(draftId);
    };
  }, [header?.draftIncidentId]);

  const loadDest = useCallback(async () => {
    const code = destMa.trim().toUpperCase();
    if (!code || !enabled) {
      setDestRows([]);
      setHeader(null);
      setDelta({});
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
        setDestRows([]);
        setHeader(null);
        return;
      }
      setDestRows(
        res.data.items.map((row) => ({
          chiTietId: row.chiTietId,
          loaiDungCuId: row.loaiDungCuId,
          maLoai: row.maLoai,
          tenDungCuLe: row.tenDungCuLe,
          soLuongChuan: row.soLuongKeHoach,
          soLuongThucTe: row.soLuongThucTe,
        })),
      );
      setHeader({
        boDungCuId: res.data.boDungCuId,
        draftIncidentId: claimed.draftId,
        maBo: res.data.maBo,
        tenBo: res.data.tenBo,
      });
      setDelta({});
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải bộ.");
      setDestRows([]);
      setHeader(null);
    } finally {
      setLoading(false);
    }
  }, [destMa, enabled, station]);

  useEffect(() => {
    void loadDest();
  }, [loadDest]);

  useEffect(() => {
    if (!header) {
      onChangeRef.current(null);
      return;
    }
    const moves = loaiOptions
      .filter((l) => (delta[l.id] || 0) !== 0)
      .map((l) => ({
        loaiDungCuId: l.id,
        maLoai: l.ma,
        tenDungCuLe: l.ten,
        qty: delta[l.id] || 0,
      }));
    onChangeRef.current({
      ...header,
      lines: buildKhoBoMoveLines(destRows, moves),
    });
  }, [header, destRows, delta, loaiOptions]);

  const appliedPrefillRef = useRef(false);

  useEffect(() => {
    appliedPrefillRef.current = false;
  }, [prefillMoves]);

  useEffect(() => {
    if (!header || appliedPrefillRef.current || !prefillMoves?.length) return;
    if (prefillMoves.some((m) => m.qty > 0) && !loaiOptions.length) return;
    setDelta(applyCanKhoPrefillDelta(prefillMoves, destRows, loaiOptions));
    appliedPrefillRef.current = true;
    onPrefillConsumed?.();
  }, [header, destRows, loaiOptions, prefillMoves, onPrefillConsumed]);

  const destByLoai = useMemo(() => {
    const map = new Map<string, TransferSourceRow>();
    for (const row of destRows) {
      const id = String(row.loaiDungCuId || "");
      if (id) map.set(id, row);
    }
    return map;
  }, [destRows]);

  const khoRows = useMemo(() => {
    const rows: LoaiReconcileOption[] = [];
    for (const loai of loaiOptions) {
      const inSet = destByLoai.has(loai.id);
      if ((loai.soLuongKho || 0) < 1 && !inSet && !(delta[loai.id] || 0)) continue;
      if (onlyLech) {
        const dest = destByLoai.get(loai.id);
        const lechRow = dest
          ? rowShowsLechMove(dest, delta)
          : (delta[loai.id] || 0) !== 0;
        if (!lechRow) continue;
      }
      rows.push(loai);
    }
    return rows.sort((a, b) => (b.soLuongKho || 0) - (a.soLuongKho || 0));
  }, [loaiOptions, destByLoai, delta, onlyLech]);

  const destPreview = useMemo(() => {
    const seen = new Set<string>();
    const rows = destRows.map((row) => {
      const loai = String(row.loaiDungCuId || "");
      seen.add(loai);
      const d = delta[loai] || 0;
      return { ...row, nhan: Math.max(0, d), tra: Math.max(0, -d) };
    });
    for (const loai of loaiOptions) {
      const d = delta[loai.id] || 0;
      if (d <= 0 || seen.has(loai.id)) continue;
      rows.push({
        loaiDungCuId: loai.id,
        maLoai: loai.ma,
        tenDungCuLe: loai.ten,
        soLuongChuan: 0,
        soLuongThucTe: 0,
        nhan: d,
        tra: 0,
      });
    }
    return rows;
  }, [destRows, delta, loaiOptions]);

  const destVisible = onlyLech ? destPreview.filter((row) => rowShowsLechMove(row, delta)) : destPreview;

  const applyStep = (loaiId: string, step: number, stock: number, thuc: number) => {
    setDelta((prev) => ({
      ...prev,
      [loaiId]: Math.max(-thuc, Math.min(stock, (prev[loaiId] || 0) + step)),
    }));
  };

  return (
    <>
      {hideHint ? null : (
        <p className="mb-2 text-[11px] text-slate-500">
          Mỗi bên cuộn riêng. Số chuyển không vượt tồn hiện có. → kho vào bộ, ← bộ về kho.
        </p>
      )}
      {gateError ? <p className="mb-2 text-[12px] text-amber-800">{gateError}</p> : null}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
          <input type="checkbox" checked={onlyLech} onChange={(e) => setOnlyLech(e.target.checked)} />
          Chỉ lệch
        </label>
        <button
          type="button"
          disabled={!destRows.length}
          className="text-[11px] font-semibold text-[var(--primary)] disabled:text-slate-300"
          onClick={() => setDelta(fillLechVsChuanDelta(destRows, loaiOptions))}
        >
          Điền thiếu/thừa
        </button>
      </div>
      <div className="grid items-stretch gap-3 lg:grid-cols-2">
          <DualPaneScroll
            className={khoOnLeft ? undefined : "lg:order-2"}
            toolbar={
              <MovePaneToolbar
                kind={khoOnLeft ? leftKind : rightKind}
                onKind={khoOnLeft ? onLeftKind : onRightKind}
                extra={<p className="text-[11px] text-slate-500">Kho lẻ dự phòng</p>}
              />
            }
          >
            <table className="w-full text-left text-[11px]">
              <thead className={L.theadRow}>
                <tr>
                  <th className={L.th}>Loại</th>
                  <th className={`${L.th} text-center`}>Tồn kho</th>
                  <th className={`${L.th} text-center`}>Còn</th>
                  <th className={L.th}>Xuất →</th>
                </tr>
              </thead>
              <tbody className={L.tbody}>
                {khoRows.map((loai) => {
                  const d = delta[loai.id] || 0;
                  const stock = loai.soLuongKho || 0;
                  const remain = Math.max(0, stock - Math.max(d, 0));
                  const thuc = destByLoai.get(loai.id)?.soLuongThucTe || 0;
                  return (
                    <tr key={loai.id} className={L.row}>
                      <td className={L.td}>{formatLoaiDungCuLabel(loai.ma, loai.ten)}</td>
                      <td className={`${L.td} text-center tabular-nums`}>{stock}</td>
                      <td className={`${L.td} text-center tabular-nums`}>{remain}</td>
                      <td className={L.td}>
                        <QtyJumpField
                          value={qtyDraft[loai.id] ?? "1"}
                          onValue={(raw) => setQtyDraft((p) => ({ ...p, [loai.id]: raw }))}
                          max={Math.max(remain, d < 0 ? -d : 0) || remain}
                          disabled={!destMa.trim()}
                          arrow="→"
                          onJump={(qty) => applyStep(loai.id, qty, stock, thuc)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {khoRows.length === 0 ? (
              <p className="px-2.5 py-3 text-[11px] text-slate-500">Chưa có loại kho / bộ để chuyển.</p>
            ) : null}
          </DualPaneScroll>

          <DualPaneScroll
            className={khoOnLeft ? undefined : "lg:order-1"}
            toolbar={
              <MovePaneToolbar
                kind={khoOnLeft ? rightKind : leftKind}
                onKind={khoOnLeft ? onRightKind : onLeftKind}
                extra={
                  <BoSourceFields
                    maQR={destMa}
                    setMaQR={onDestMa}
                    boOptions={boOptions}
                    boLoading={boLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onScanDest(destMa);
                      }
                    }}
                    onScanComplete={onScanDest}
                    onSelectBo={onScanDest}
                    loading={loadingScan || loading}
                    layout="stack"
                    compact
                  />
                }
              />
            }
          >
            <table className="w-full text-left text-[11px]">
              <thead className={L.theadRow}>
                <tr>
                  <th className={L.th}>Loại</th>
                  <th className={`${L.th} text-center`}>Chuẩn</th>
                  <th className={`${L.th} text-center`}>Tồn bộ</th>
                  <th className={`${L.th} text-center`}>Nhận / trả</th>
                  <th className={L.th}>← Trả kho</th>
                </tr>
              </thead>
              <tbody className={L.tbody}>
                {destVisible.map((row) => {
                  const loaiId = String(row.loaiDungCuId || "");
                  const stock = loaiOptions.find((l) => l.id === loaiId)?.soLuongKho || 0;
                  const remainSet = Math.max(0, row.soLuongThucTe - (row.tra || 0));
                  const roomBack = Math.max(remainSet, row.nhan || 0);
                  return (
                    <tr key={`${loaiId}-${row.chiTietId || "new"}`} className={L.row}>
                      <td className={L.td}>{formatLoaiDungCuLabel(row.maLoai, row.tenDungCuLe)}</td>
                      <td className={`${L.td} text-center tabular-nums`}>{row.soLuongChuan}</td>
                      <td className={`${L.td} text-center tabular-nums`}>{row.soLuongThucTe}</td>
                      <td className={`${L.td} text-center tabular-nums`}>
                        {row.nhan ? `+${row.nhan}` : row.tra ? `−${row.tra}` : ""}
                      </td>
                      <td className={L.td}>
                        <QtyJumpField
                          value={qtyDraft[`set-${loaiId}`] ?? "1"}
                          onValue={(raw) => setQtyDraft((p) => ({ ...p, [`set-${loaiId}`]: raw }))}
                          max={roomBack}
                          disabled={!destMa.trim()}
                          arrow="←"
                          onJump={(qty) => applyStep(loaiId, -qty, stock, row.soLuongThucTe)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!destMa.trim() ? (
              <p className="px-2.5 py-3 text-[11px] text-slate-500">Chọn bộ để chuyển với kho lẻ.</p>
            ) : null}
          </DualPaneScroll>
      </div>
    </>
  );
}
