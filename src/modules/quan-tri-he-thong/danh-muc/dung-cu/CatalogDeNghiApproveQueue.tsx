"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  approveCatalogDeNghiAction,
  listPendingCatalogDeNghiAction,
  rejectCatalogDeNghiAction,
} from "./catalog-de-nghi-approve.actions";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  type CssdCatalogDeNghiKind,
} from "@/lib/domain/cssd-catalog-de-nghi";
import { useModulePermission } from "@/hooks/useModulePermission";

type Row = {
  id: string;
  targetKind: CssdCatalogDeNghiKind;
  targetMa: string;
  targetTen: string;
  note: string;
  createdAt: string;
  afterSummary: string;
};

export function CatalogDeNghiApproveQueue() {
  const { isAdmin, allowed: leAllowed } = useModulePermission("DC_LE");
  const { allowed: boAllowed } = useModulePermission("BO_DC");
  const canApprove = Boolean(isAdmin || leAllowed.edit || boAllowed.edit);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    const res = await listPendingCatalogDeNghiAction();
    if (!res.success) toast.error(res.error);
    else setRows(res.data);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const onApprove = async (id: string) => {
    setBusyId(id);
    const res = await approveCatalogDeNghiAction(id);
    setBusyId(null);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Đã duyệt và ghi đè danh mục.");
      await reload();
    }
  };

  const onReject = async (id: string) => {
    setBusyId(id);
    const res = await rejectCatalogDeNghiAction(id);
    setBusyId(null);
    if (!res.success) toast.error(res.error);
    else {
      toast.message("Đã từ chối phiếu.");
      await reload();
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <h3 className="text-[12px] font-semibold text-violet-950">
        Đề nghị danh mục — chờ duyệt (ghi đè master)
      </h3>
      <p className="text-[11px] text-violet-900/80">
        Tách khỏi cửa sự cố SET_RECONCILE. Duyệt = ghi đè loại / bộ / thành phần.
      </p>
      {loading ? (
        <p className="text-[12px] text-slate-500">Đang tải…</p>
      ) : rows.length === 0 ? (
        <p className="text-[12px] text-slate-500">Không có phiếu PENDING.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-white bg-white px-3 py-2"
            >
              <div className="min-w-0 text-[12px]">
                <div className="font-semibold text-slate-800">
                  {CSSD_CATALOG_DE_NGHI_KIND_LABEL[r.targetKind]} ·{" "}
                  <span className="font-mono text-violet-700">{r.targetMa || "—"}</span>{" "}
                  {r.targetTen}
                </div>
                <div className="mt-0.5 text-slate-600">{r.afterSummary}</div>
                {r.note ? <div className="mt-0.5 text-[11px] text-slate-500">{r.note}</div> : null}
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : ""}
                </div>
              </div>
              {canApprove ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void onApprove(r.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void onReject(r.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
