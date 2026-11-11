// src/modules/giam-sat-chung/components/GiamSatChungFormActions.tsx
"use client";

import React from "react";
import { Bv103Button } from "@/components/ui/bv103";

interface GiamSatChungFormActionsProps {
  loading: boolean;
  headerLoading: boolean;
  onPrint: () => void;
  /** In mẫu trống (tiêu chí chưa chấm) — dùng giấy ngoại tuyến. */
  onPrintBlank?: () => void;
  onSave: () => void;
  /** Tóm tắt tiến độ bên trái thanh đáy (cùng mẫu VST). */
  summary?: string;
}

export default function GiamSatChungFormActions({
  loading,
  headerLoading,
  onPrint,
  onPrintBlank,
  onSave,
  summary,
}: GiamSatChungFormActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur no-print sm:px-6">
      {summary ? <p className="mr-2 hidden text-sm text-slate-600 sm:block">{summary}</p> : null}
      {onPrintBlank ? (
        <Bv103Button variant="secondary" size="lg" onClick={onPrintBlank} title="In mẫu bảng kiểm trống">
          In mẫu trống
        </Bv103Button>
      ) : null}
      <Bv103Button variant="secondary" size="lg" onClick={onPrint} title="In phiếu A4">
        In / PDF
      </Bv103Button>
      <Bv103Button variant="primary" size="lg" disabled={loading || headerLoading} onClick={onSave}>
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <span>Lưu kết quả</span>
        )}
      </Bv103Button>
    </div>
  );
}
