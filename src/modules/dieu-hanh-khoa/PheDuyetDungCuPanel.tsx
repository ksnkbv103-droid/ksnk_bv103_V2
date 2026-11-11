"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  approveCatalogDeNghiAction,
  listPendingCatalogDeNghiAction,
  rejectCatalogDeNghiAction,
} from "@/modules/cssd-erp/contexts/instrument-catalog/admin/catalog-de-nghi-approve.actions";
import {
  approveSetReconcileBomAction,
  listPendingBomApprovalsAction,
  rejectSetReconcileBomAction,
} from "@/modules/cssd-su-co/actions/set-reconcile-approve.actions";
import { cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  type CssdCatalogDeNghiRow,
} from "@/lib/domain/cssd-catalog-de-nghi";
import { CatalogDeNghiDiff } from "@/components/shared/CatalogDeNghiDiff";
import { useModulePermission } from "@/hooks/useModulePermission";
import { CheckCircle2, RotateCw, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

type CatalogRow = CssdCatalogDeNghiRow & { afterSummary: string };

type BomRow = {
  id: string;
  maBo: string;
  tenBo: string;
  moTa: string;
  createdAt: string | null;
  catalogLineCount: number;
  catalogDiffs?: Array<{ kindLabel: string; before: string; after: string }>;
};

/**
 * Trung tâm Phê duyệt Dụng cụ Tập trung (DEBT-01):
 * Hợp nhất hàng đợi duyệt Đề nghị Danh mục (cssd_catalog_de_nghi) và
 * Rà soát cấu phần Bộ (cssd_fact_su_co) vào một giao diện đồng nhất.
 */
export function PheDuyetDungCuPanel() {
  const { loading: boLoading, allowed: boAllowed } = useModulePermission("BO_DC");
  const { loading: leLoading, allowed: leAllowed } = useModulePermission("DC_LE");
  const { allowed: loaiAllowed } = useModulePermission("LOAI_DC");
  const loading = boLoading || leLoading;
  // AR-1: khớp server (requireCssdCatalogApprove) — quyền approve, không phải edit.
  const canApprove = boAllowed.approve || leAllowed.approve || loaiAllowed.approve;

  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([]);
  const [bomRows, setBomRows] = useState<BomRow[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "CATALOG" | "BOM">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openCatalogId, setOpenCatalogId] = useState<string | null>(null);

  const reload = async () => {
    setLoadingQueue(true);
    const [cRes, bRes] = await Promise.all([
      listPendingCatalogDeNghiAction(),
      listPendingBomApprovalsAction(),
    ]);
    if (cRes.success) setCatalogRows(cRes.data);
    else toast.error(cRes.error);
    if (bRes.success) setBomRows(bRes.data);
    else toast.error(bRes.error);
    setLoadingQueue(false);
  };

  useEffect(() => {
    if (canApprove) {
      void reload();
    }
  }, [canApprove]);

  if (loading || !canApprove) return null;

  const totalPending = catalogRows.length + bomRows.length;

  const onApproveCatalog = async (id: string) => {
    setBusyId(id);
    const res = await approveCatalogDeNghiAction(id);
    setBusyId(null);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Đã duyệt và ghi đè danh mục.");
      await reload();
    }
  };

  const onRejectCatalog = async (id: string) => {
    setBusyId(id);
    const res = await rejectCatalogDeNghiAction(id);
    setBusyId(null);
    if (!res.success) toast.error(res.error);
    else {
      toast.message("Đã từ chối phiếu.");
      await reload();
    }
  };

  const onApproveBom = async (id: string) => {
    setBusyId(id);
    const res = await approveSetReconcileBomAction(id);
    setBusyId(null);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Đã ghi sổ cấu phần bộ phẫu thuật chuẩn.");
      await reload();
    }
  };

  const onRejectBom = async (id: string) => {
    setBusyId(id);
    const res = await rejectSetReconcileBomAction(id);
    setBusyId(null);
    if (!res.success) toast.error(res.error);
    else {
      toast.message("Đã từ chối đổi cấu phần bộ.");
      await reload();
    }
  };

  if (!loadingQueue && totalPending === 0) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-[12px] text-emerald-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Hàng đợi sạch — Không có đề nghị danh mục hoặc rà soát cấu phần nào đang chờ duyệt.</span>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
        >
          <RotateCw size={12} />
          Làm mới
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-slate-800">
              Hàng chờ phê duyệt tập trung
            </h3>
            <p className="text-xs text-slate-500">
              Chủ nhiệm khoa duyệt đề nghị thay đổi danh mục và cấu phần bộ phẫu thuật
            </p>
          </div>
          <span className="ml-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            {totalPending} chờ duyệt
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              filter === "ALL"
                ? "bg-slate-800 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Tất cả ({totalPending})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CATALOG")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              filter === "CATALOG"
                ? "bg-indigo-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Đề nghị danh mục ({catalogRows.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("BOM")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              filter === "BOM"
                ? "bg-amber-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Rà soát cấu phần ({bomRows.length})
          </button>
          <button
            type="button"
            disabled={loadingQueue}
            onClick={() => void reload()}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Làm mới hàng đợi"
          >
            <RotateCw size={12} className={loadingQueue ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Catalog pending rows */}
        {(filter === "ALL" || filter === "CATALOG") &&
          catalogRows.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-3 transition-colors hover:border-indigo-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      ĐỀ NGHỊ {CSSD_CATALOG_DE_NGHI_KIND_LABEL[r.targetKind]}
                    </span>
                    <span className="font-mono text-[12px] font-bold text-violet-700">
                      {r.targetMa || "—"}
                    </span>
                    <span className="text-[12px] font-semibold text-slate-800">
                      {r.targetTen}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-600">{r.afterSummary}</p>
                  {r.note ? (
                    <p className="text-xs text-slate-500">Ghi chú: {r.note}</p>
                  ) : null}
                  <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-400">
                    <span>
                      {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenCatalogId(openCatalogId === r.id ? null : r.id)
                      }
                      className="flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline"
                    >
                      {openCatalogId === r.id ? (
                        <>Ẩn chi tiết Cũ → Mới <ChevronUp size={12} /></>
                      ) : (
                        <>Xem chi tiết Cũ → Mới <ChevronDown size={12} /></>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void onApproveCatalog(r.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Duyệt ghi đè
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void onRejectCatalog(r.id)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </div>
              </div>

              {openCatalogId === r.id ? (
                <div className="mt-2.5 border-t border-indigo-100 pt-2.5">
                  <CatalogDeNghiDiff row={r} />
                </div>
              ) : null}
            </div>
          ))}

        {/* BOM reconcile pending rows */}
        {(filter === "ALL" || filter === "BOM") &&
          bomRows.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-amber-200 bg-amber-50/30 p-3 transition-colors hover:border-amber-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                      RÀ SOÁT CẤU PHẦN BỘ (BOM)
                    </span>
                    <span className="font-mono text-[12px] font-bold text-slate-800">
                      {r.maBo}
                    </span>
                    {r.tenBo ? (
                      <span className="text-[12px] font-semibold text-slate-800">
                        — {r.tenBo}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[12px] text-slate-600">
                    <span className="font-semibold text-amber-950">{r.catalogLineCount} dòng đề nghị thay đổi:</span>{" "}
                    {r.moTa}
                  </p>
                  {r.catalogDiffs?.length ? (
                    <ul className="mt-1 space-y-0.5 rounded-lg border border-amber-200/60 bg-white/80 p-2 text-xs text-slate-600">
                      {r.catalogDiffs.slice(0, 5).map((d, i) => (
                        <li key={`${r.id}-${i}`}>
                          <span className="font-semibold text-amber-900">{d.kindLabel}:</span>{" "}
                          {d.before} → <span className="font-semibold text-emerald-700">{d.after}</span>
                        </li>
                      ))}
                      {r.catalogDiffs.length > 5 ? (
                        <li className="text-slate-400">
                          … và {r.catalogDiffs.length - 5} dòng thay đổi nữa
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                  <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-400">
                    <span>
                      {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : ""}
                    </span>
                    <Link
                      href={cssdSuCoIncidentJournalHref(r.id)}
                      className="font-semibold text-[var(--primary)] hover:underline"
                    >
                      Xem chi tiết phiếu rà soát ↗
                    </Link>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void onApproveBom(r.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Duyệt chuẩn BOM
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void onRejectBom(r.id)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
