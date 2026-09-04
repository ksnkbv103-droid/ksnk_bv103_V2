"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { listSetReconcileHistoryAction } from "@/modules/cssd-su-co/actions/set-reconcile-approve.actions";
import { cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
import IncidentJournalPrintButton from "@/modules/cssd-su-co/components/IncidentJournalPrintButton";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";

const STATUS_LABEL: Record<string, string> = {
  BOM_APPROVED: "Đã duyệt đổi mã · tên · số lượng",
  BOM_REJECTED: "Từ chối đổi mã · tên · số lượng",
  NONE: "Đã ghi sổ sự cố / khớp",
};

type HistoryRow = {
  id: string;
  maBo: string;
  tenBo: string;
  moTa: string;
  createdAt: string | null;
  status: string;
};

export function SetReconcileHistoryList() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void listSetReconcileHistoryAction().then((res) => {
      if (!alive) return;
      setLoading(false);
      if (!res.success) {
        toast.error(res.error);
        setRows([]);
        return;
      }
      setRows(res.data);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <p className="text-[11px] text-slate-500">Đang tải lịch sử phiếu…</p>;
  if (!rows.length) {
    return <p className="px-1 py-6 text-center text-[11px] text-slate-500">Chưa có phiếu rà soát đã xử lý.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-[var(--radius-shell)] border border-slate-200 bg-white">
      {rows.map((r) => (
        <li key={r.id} className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-800">
              {r.maBo || "—"}
              {r.tenBo ? ` · ${r.tenBo}` : ""}
            </p>
            <p className="text-[11px] text-slate-500">
              {STATUS_LABEL[r.status] || r.status} · {formatDateTimeVi(r.createdAt)}
              {r.moTa ? ` · ${r.moTa}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={cssdSuCoIncidentJournalHref(r.id)} className="text-[11px] font-semibold text-[var(--primary)]">
              Xem
            </Link>
            <IncidentJournalPrintButton
              incidentId={r.id}
              className="inline-flex h-8 min-w-[44px] items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
