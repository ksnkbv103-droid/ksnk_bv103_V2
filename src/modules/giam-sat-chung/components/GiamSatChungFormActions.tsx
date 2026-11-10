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
}

export default function GiamSatChungFormActions({
  loading,
  headerLoading,
  onPrint,
  onPrintBlank,
  onSave,
}: GiamSatChungFormActionsProps) {
  return (
    <div className="fixed bottom-8 right-8 z-20 flex flex-col items-end gap-2 no-print">
      <div className="flex gap-2">
        {onPrintBlank ? (
          <Bv103Button variant="secondary" onClick={onPrintBlank} title="In mẫu bảng kiểm trống">
            In mẫu trống
          </Bv103Button>
        ) : null}
        <Bv103Button variant="secondary" onClick={onPrint} title="In phiếu A4">
          In / PDF
        </Bv103Button>
      </div>
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
