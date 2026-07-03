"use client";

import React from "react";
import CssdBatchPrintView from "./CssdBatchPrintView";
import CssdCapPhatPrintView from "./CssdCapPhatPrintView";
import type { CssdPrintState } from "../../hooks/use-cssd-print";

/** Vùng in ẩn — mount cạnh trang CSSD khi `printState` có dữ liệu. */
export default function CssdPrintPortal({ printState }: { printState: CssdPrintState }) {
  if (!printState) return null;
  if (printState.kind === "batch") {
    return <CssdBatchPrintView data={printState.data} qrDataUrl={printState.qrDataUrl} />;
  }
  return <CssdCapPhatPrintView data={printState.data} qrs={printState.qrs} />;
}
