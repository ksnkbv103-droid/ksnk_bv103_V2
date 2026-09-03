"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  approveSetReconcileBomAction,
  listPendingBomApprovalsAction,
  rejectSetReconcileBomAction,
} from "@/modules/cssd-su-co/actions/set-reconcile-approve.actions";
import { cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
import { useModulePermission } from "@/hooks/useModulePermission";

type QueueRow = {
  id: string;
  maBo: string;
  tenBo: string;
  moTa: string;
  createdAt: string | null;
  catalogLineCount: number;
  catalogDiffs?: Array<{ kindLabel: string; before: string; after: string }>;
};

export function SetReconcileApproveQueue() {
  const { isAdmin, allowed: leAllowed } = useModulePermission("DC_LE");
  const { allowed: boAllowed } = useModulePermission("BO_DC");
  const canApprove = Boolean(isAdmin || leAllowed.edit || boAllowed.edit);
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await listPendingBomApprovalsAction();
    setLoading(false);
    if (!res.success) {
      toast.error(res.error);
      setRows([]);
      return;
    }
    setRows(res.data);
  };

  useEffect(() => {
    void reload();
  }, []);

  if (loading) return <p className="text-[11px] text-slate-500">Đang tải phiếu chờ duyệt chuẩn…</p>;
  if (!rows.length) {
    return <p className="px-1 py-6 text-center text-[11px] text-slate-500">Không có phiếu chờ duyệt.</p>;
  }

  return (
    <section className="rounded-[var(--radius-shell)] border border-amber-200 bg-amber-50/60 p-3">
      <h3 className="text-[12px] font-semibold text-amber-950">Phiếu chờ duyệt đổi thành phần chuẩn</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[12px]">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{r.maBo} {r.tenBo ? `— ${r.tenBo}` : ""}</p>
              <p className="text-slate-500">{r.catalogLineCount} dòng đề nghị · {r.moTa}</p>
              {r.catalogDiffs?.length ? (
                <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                  {r.catalogDiffs.slice(0, 6).map((d, i) => (
                    <li key={`${r.id}-${i}`}>
                      <span className="font-semibold text-amber-900">{d.kindLabel}:</span>{" "}
                      {d.before} → {d.after}
                    </li>
                  ))}
                  {r.catalogDiffs.length > 6 ? (
                    <li className="text-slate-400">… và {r.catalogDiffs.length - 6} dòng nữa</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={cssdSuCoIncidentJournalHref(r.id)} className="text-[11px] font-semibold text-[var(--primary)]">
                Xem
              </Link>
              {canApprove ? (
                <>
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white"
                    onClick={async () => {
                      const res = await approveSetReconcileBomAction(r.id);
                      if (!res.success) return toast.error(res.error);
                      toast.success("Đã ghi sổ chuẩn.");
                      void reload();
                    }}
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600"
                    onClick={async () => {
                      const res = await rejectSetReconcileBomAction(r.id);
                      if (!res.success) return toast.error(res.error);
                      toast.message("Đã từ chối đổi chuẩn. Phần hỏng/mất đã ghi sổ vẫn giữ.");
                      void reload();
                    }}
                  >
                    Từ chối
                  </button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
