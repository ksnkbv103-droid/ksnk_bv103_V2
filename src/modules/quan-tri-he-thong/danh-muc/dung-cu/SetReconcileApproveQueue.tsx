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

export function SetReconcileApproveQueue() {
  const { allowed: leAllowed } = useModulePermission("DC_LE");
  const { allowed: boAllowed } = useModulePermission("BO_DC");
  const canApprove = Boolean(leAllowed.edit || boAllowed.edit);
  const [rows, setRows] = useState<
    Array<{ id: string; maBo: string; tenBo: string; moTa: string; createdAt: string | null; catalogLineCount: number }>
  >([]);
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
  if (!rows.length) return null;

  return (
    <section className="rounded-[var(--radius-shell)] border border-amber-200 bg-amber-50/60 p-4">
      <h3 className="text-sm font-semibold text-amber-950">Phiếu chờ duyệt đổi thành phần chuẩn</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[12px]">
            <div>
              <p className="font-semibold text-slate-800">{r.maBo} {r.tenBo ? `— ${r.tenBo}` : ""}</p>
              <p className="text-slate-500">{r.catalogLineCount} dòng đề nghị · {r.moTa}</p>
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
