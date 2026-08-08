"use client";

import React, { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadRowsAsExcel } from "@/lib/analytics/download-supervision-excel";

type Props = {
  label?: string;
  fileBase: string;
  sheetName: string;
  /** Mặc định 90 ngày gần nhất nếu không truyền. */
  tuNgay?: string;
  denNgay?: string;
  loadRows: (range: { tu_ngay: string; den_ngay: string }) => Promise<
    { success: true; rows: Record<string, unknown>[] } | { success: false; error: string }
  >;
};

function defaultRange(): { tu_ngay: string; den_ngay: string } {
  const den = new Date();
  const tu = new Date();
  tu.setDate(tu.getDate() - 90);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { tu_ngay: iso(tu), den_ngay: iso(den) };
}

export function SupervisionExcelExportButton({
  label = "Xuất Excel",
  fileBase,
  sheetName,
  tuNgay,
  denNgay,
  loadRows,
}: Props) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const range =
        tuNgay && denNgay ? { tu_ngay: tuNgay, den_ngay: denNgay } : defaultRange();
      const res = await loadRows(range);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      await downloadRowsAsExcel(sheetName, res.rows, `${fileBase}_${range.tu_ngay}_${range.den_ngay}`);
      toast.success(`Đã xuất ${res.rows.length} dòng`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xuất Excel thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      <Download size={14} aria-hidden />
      {busy ? "Đang xuất…" : label}
    </button>
  );
}
