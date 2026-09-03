"use client";

import React, { useEffect, useState } from "react";
import { applyMoveSideChoice, type CanKhoPrefill, type MoveSideKind } from "@/lib/domain/cssd-set-reconcile";
import InstrumentReplenishDualTable from "./InstrumentReplenishDualTable";
import InstrumentTransferDualTable from "./InstrumentTransferDualTable";
import type { BoCatalogOption } from "./SuCoReportFormFields";
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
  onUsesKho: (usesKho: boolean) => void;
  prefill?: CanKhoPrefill | null;
  onPrefillConsumed?: () => void;
};

export default function InstrumentMoveDualTable({
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
  onUsesKho,
  prefill,
  onPrefillConsumed,
}: Props) {
  const [left, setLeft] = useState<MoveSideKind>("kho");
  const [right, setRight] = useState<MoveSideKind>("bo");
  const usesKho = left === "kho" || right === "kho";

  useEffect(() => {
    if (!prefill) return;
    setLeft("kho");
    setRight("bo");
  }, [prefill]);

  useEffect(() => {
    onUsesKho(usesKho);
  }, [usesKho, onUsesKho]);

  const setSide = (side: "left" | "right", kind: MoveSideKind) => {
    const next = applyMoveSideChoice(left, right, side, kind);
    setLeft(next.left);
    setRight(next.right);
    onChange(null);
  };

  const kindProps = {
    leftKind: left,
    rightKind: right,
    onLeftKind: (k: MoveSideKind) => setSide("left", k),
    onRightKind: (k: MoveSideKind) => setSide("right", k),
  };

  return usesKho ? (
        <InstrumentReplenishDualTable
          key={`kho-${left}`}
          enabled={enabled}
          station={station}
          destMa={sourceMa}
          khoOnLeft={left === "kho"}
          hideHint
          boOptions={boOptions}
          boLoading={boLoading}
          loadingScan={loadingScan}
          onDestMa={onSourceMa}
          onScanDest={onScanSource}
          onChange={onChange}
          prefillMoves={prefill?.moves || null}
          onPrefillConsumed={onPrefillConsumed}
          {...kindProps}
        />
      ) : (
        <InstrumentTransferDualTable
          key="bo-bo"
          enabled={enabled}
          station={station}
          sourceMa={sourceMa}
          destMa={destMa}
          boOptions={boOptions}
          boLoading={boLoading}
          loadingScan={loadingScan}
          onSourceMa={onSourceMa}
          onDestMa={onDestMa}
          onScanSource={onScanSource}
          onScanDest={onScanDest}
          onChange={onChange}
          {...kindProps}
        />
      );
}
