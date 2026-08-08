"use client";

import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";

import React from "react";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import { DinhKyRulesPanel } from "./DinhKyRulesPanel";
import type { QlcvPeriodKind } from "../lib/qlcv-period-range";

type Props = {
  highlightMauId?: string | null;
  onRequestPrintPlan?: (period: QlcvPeriodKind) => void;
};

/** Tab mẫu định kỳ — chỉ danh sách/form; không banner giải thích. */
export function QlcvDinhKyPanel({ highlightMauId, onRequestPrintPlan }: Props) {
  return (
    <KsnkSupervisionPanel className={UI.sectionGap}>
      <DinhKyRulesPanel highlightMauId={highlightMauId} onRequestPrintPlan={onRequestPrintPlan} />
    </KsnkSupervisionPanel>
  );
}
