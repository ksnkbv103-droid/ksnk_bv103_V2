"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadBoCompositionByMaBo } from "@/modules/cssd-erp/contexts/inventory-instrument/entrypoint";
import {
  buildTransferReconcileLines,
  formatLoaiDungCuLabel,
  type MoveSideKind,
  type TransferSourceRow,
} from "@/lib/domain/cssd-set-reconcile";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import DualPaneScroll, { MovePaneToolbar } from "./DualPaneScroll";
import QtyJumpField from "./QtyJumpField";
import { claimSetReconcileDraftAction, releaseSetReconcileDraftAction } from "../actions/set-reconcile-draft.actions";
import { BoSourceFields, type BoCatalogOption } from "./SuCoReportFormFields";
import type { SetReconcileFormState } from "./InstrumentSetReconcileTable";

type Props = {
  enabled: boolean;
  station?: string;
  sourceMa: string;
  destMa: string;
  boOptions: BoCatalogOption[];
  boLoading?: boolean;
  loadingScan?: boolean;
  onSourceMa: (ma: string) => void;
  onDestMa: (ma: string) => void;
  onScanSource: (ma: string) => void;
  onScanDest: (ma: string) => void;
  onChange: (state: SetReconcileFormState | null) => void;
  leftKind: MoveSideKind;
  rightKind: MoveSideKind;
  onLeftKind: (kind: MoveSideKind) => void;
  onRightKind: (kind: MoveSideKind) => void;
};

export default function InstrumentTransferDualTable({
  enabled,
  station,
  sourceMa,
  destMa,
  boOptions,
  boLoading,
  loadingScan,
  onSourceMa,
  onDestMa,
  onScanSource,
  onScanDest,
  onChange,
  leftKind,
  rightKind,
  onLeftKind,
  onRightKind,
}: Props) {
  const [sourceRows, setSourceRows] = useState<TransferSourceRow[]>([]);
  const [destRows, setDestRows] = useState<TransferSourceRow[]>([]);
  const [header, setHeader] = useState<{ boDungCuId: string; draftIncidentId: string; maBo: string; tenBo: string } | null>(
    null,
  );
  const [moves, setMoves] = useState<Record<string, number>>({});
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const destOptions = useMemo(
    () => boOptions.filter((b) => b.ma_bo.toUpperCase() !== sourceMa.trim().toUpperCase()),
    [boOptions, sourceMa],
  );

  useEffect(() => {
    const draftId = header?.draftIncidentId;
    return () => {
      if (draftId) void releaseSetReconcileDraftAction(draftId);
    };
  }, [header?.draftIncidentId]);

  const loadSource = useCallback(async () => {
    const code = sourceMa.trim().toUpperCase();
    if (!code || !enabled) {
      setSourceRows([]);
      setHeader(null);
      setMoves({});
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
        setSourceRows([]);
        setHeader(null);
        return;
      }
      setSourceRows(
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
      setMoves({});
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải bộ nguồn.");
      setSourceRows([]);
      setHeader(null);
    } finally {
      setLoading(false);
    }
  }, [sourceMa, enabled, station]);

  const loadDest = useCallback(async () => {
    const code = destMa.trim().toUpperCase();
    if (!code || !enabled || code === sourceMa.trim().toUpperCase()) {
      setDestRows([]);
      return;
    }
    try {
      const res = await loadBoCompositionByMaBo(code);
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải bộ đích.");
      setDestRows([]);
    }
  }, [destMa, enabled, sourceMa]);

  useEffect(() => {
    void loadSource();
  }, [loadSource]);
  useEffect(() => {
    void loadDest();
  }, [loadDest]);

  useEffect(() => {
    if (!header || !destMa.trim()) {
      onChangeRef.current(null);
      return;
    }
    const moveList = Object.entries(moves)
      .filter(([, qty]) => qty > 0)
      .map(([chiTietId, qty]) => ({ chiTietId, qty }));
    onChangeRef.current({
      ...header,
      lines: buildTransferReconcileLines(sourceRows, moveList, destMa),
    });
  }, [header, sourceRows, moves, destMa]);

  const incomingByLoai = useMemo(() => {
    const map = new Map<string, { ten: string; maLoai?: string; qty: number }>();
    for (const row of sourceRows) {
      const id = String(row.chiTietId || "");
      const qty = moves[id] || 0;
      if (qty < 1) continue;
      const loai = String(row.loaiDungCuId || "");
      const prev = map.get(loai);
      map.set(loai, {
        ten: row.tenDungCuLe,
        maLoai: row.maLoai,
        qty: (prev?.qty || 0) + qty,
      });
    }
    return map;
  }, [sourceRows, moves]);

  const destPreview = useMemo(() => {
    const seen = new Set<string>();
    const rows = destRows.map((row) => {
      const loai = String(row.loaiDungCuId || "");
      seen.add(loai);
      return { ...row, soLuongNhan: incomingByLoai.get(loai)?.qty || 0 };
    });
    for (const [loai, inc] of incomingByLoai) {
      if (seen.has(loai)) continue;
      rows.push({
        loaiDungCuId: loai,
        maLoai: inc.maLoai,
        tenDungCuLe: inc.ten,
        soLuongChuan: 0,
        soLuongThucTe: 0,
        soLuongNhan: inc.qty,
      });
    }
    return rows;
  }, [destRows, incomingByLoai]);

  const moveQty = (chiTietId: string, max: number, delta: number) => {
    setMoves((prev) => {
      const next = Math.max(0, Math.min(max, (prev[chiTietId] || 0) + delta));
      return { ...prev, [chiTietId]: next };
    });
  };

  const picker = (
    ma: string,
    setMa: (v: string) => void,
    scan: (v: string) => void,
    options: BoCatalogOption[],
    busy?: boolean,
  ) => (
    <BoSourceFields
      maQR={ma}
      setMaQR={setMa}
      boOptions={options}
      boLoading={boLoading}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          scan(ma);
        }
      }}
      onScanComplete={scan}
      onSelectBo={scan}
      loading={busy}
      layout="stack"
      compact
    />
  );

  return (
    <>
      {gateError ? <p className="mb-2 text-[12px] text-amber-800">{gateError}</p> : null}
      <div className="grid items-stretch gap-3 lg:grid-cols-2">
        <DualPaneScroll
          toolbar={
            <MovePaneToolbar
              kind={leftKind}
              onKind={onLeftKind}
              extra={picker(sourceMa, onSourceMa, onScanSource, boOptions, loadingScan || loading)}
            />
          }
        >
            <table className="w-full text-left text-[11px]">
              <thead className={L.theadRow}>
                <tr>
                  <th className={L.th}>Loại</th>
                  <th className={`${L.th} text-center`}>Tồn</th>
                  <th className={`${L.th} text-center`}>Còn</th>
                  <th className={L.th}>Chuyển</th>
                </tr>
              </thead>
              <tbody className={L.tbody}>
                {sourceRows.map((row) => {
                  const id = String(row.chiTietId || "");
                  const moved = moves[id] || 0;
                  const remain = Math.max(0, row.soLuongThucTe - moved);
                  const draft = qtyDraft[id] ?? "1";
                  return (
                    <tr key={id} className={L.row}>
                      <td className={L.td}>
                        {formatLoaiDungCuLabel(row.maLoai, row.tenDungCuLe)}
                      </td>
                      <td className={`${L.td} text-center tabular-nums`}>{row.soLuongThucTe}</td>
                      <td className={`${L.td} text-center tabular-nums`}>{remain}</td>
                      <td className={L.td}>
                        <QtyJumpField
                          value={draft}
                          onValue={(raw) => setQtyDraft((p) => ({ ...p, [id]: raw }))}
                          max={remain}
                          disabled={!destMa.trim()}
                          arrow="→"
                          onJump={(qty) => moveQty(id, row.soLuongThucTe, qty)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!sourceMa.trim() ? (
              <p className="px-2.5 py-3 text-[11px] text-slate-500">Chọn bộ nguồn để xem thành phần.</p>
            ) : null}
        </DualPaneScroll>

        <DualPaneScroll
          toolbar={
            <MovePaneToolbar
              kind={rightKind}
              onKind={onRightKind}
              extra={picker(destMa, onDestMa, onScanDest, destOptions, loadingScan)}
            />
          }
        >
            <table className="w-full text-left text-[11px]">
              <thead className={L.theadRow}>
                <tr>
                  <th className={L.th}>Loại</th>
                  <th className={`${L.th} text-center`}>Tồn</th>
                  <th className={`${L.th} text-center`}>Nhận</th>
                  <th className={L.th} />
                </tr>
              </thead>
              <tbody className={L.tbody}>
                {destPreview.map((row) => {
                  const sourceHit = sourceRows.find((s) => s.loaiDungCuId === row.loaiDungCuId && (moves[String(s.chiTietId || "")] || 0) > 0);
                  const chiTietId = String(sourceHit?.chiTietId || "");
                  return (
                    <tr key={`${row.loaiDungCuId}-${row.chiTietId || "new"}`} className={L.row}>
                      <td className={L.td}>{formatLoaiDungCuLabel(row.maLoai, row.tenDungCuLe)}</td>
                      <td className={`${L.td} text-center tabular-nums`}>{row.soLuongThucTe}</td>
                      <td className={`${L.td} text-center tabular-nums`}>{row.soLuongNhan || ""}</td>
                      <td className={L.td}>
                        {row.soLuongNhan && chiTietId ? (
                          <button
                            type="button"
                            onClick={() => moveQty(chiTietId, sourceHit?.soLuongThucTe || 0, -1)}
                            className="h-8 px-2 text-[11px] font-semibold text-slate-500"
                          >
                            ←
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!destMa.trim() ? (
              <p className="px-2.5 py-3 text-[11px] text-slate-500">Chọn bộ đích — số chuyển sẽ hiện bên này.</p>
            ) : null}
        </DualPaneScroll>
      </div>
    </>
  );
}
