"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  approveCatalogDeNghiAction,
  deleteCatalogDeNghiAction,
  listApprovedCatalogDeNghiAction,
  listPendingCatalogDeNghiAction,
  rejectCatalogDeNghiAction,
} from "./catalog-de-nghi-approve.actions";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  normalizeDeNghiItems,
  type CssdCatalogDeNghiKind,
  type CssdCatalogDeNghiRow,
} from "@/lib/domain/cssd-catalog-de-nghi";
import { useModulePermission } from "@/hooks/useModulePermission";
import { CatalogDeNghiPhieuDialog } from "@/modules/cssd-erp/components/catalog/CatalogDeNghiPhieuPreview";

type Row = CssdCatalogDeNghiRow & { afterSummary: string };

export function CatalogDeNghiApproveQueue() {
  const { isAdmin, allowed: leAllowed } = useModulePermission("DC_LE");
  const { allowed: boAllowed } = useModulePermission("BO_DC");
  const canApprove = Boolean(isAdmin || leAllowed.edit || boAllowed.edit);
  const [pending, setPending] = useState<Row[]>([]);
  const [approved, setApproved] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<"PENDING" | "APPROVED">("PENDING");

  const reload = async () => {
    setLoading(true);
    const [pRes, aRes] = await Promise.all([
      listPendingCatalogDeNghiAction(),
      listApprovedCatalogDeNghiAction(40),
    ]);
    if (!pRes.success) toast.error(pRes.error);
    else setPending(pRes.data as Row[]);
    if (!aRes.success) toast.error(aRes.error);
    else setApproved(aRes.data as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const previewRow = useMemo(() => {
    if (!previewId) return null;
    const pool = previewSource === "APPROVED" ? approved : pending;
    return pool.find((r) => r.id === previewId) || null;
  }, [previewId, previewSource, pending, approved]);

  const previewItems = useMemo(() => {
    if (!previewRow) return [];
    return normalizeDeNghiItems({
      targetKind: previewRow.targetKind,
      targetId: previewRow.targetId,
      targetMa: previewRow.targetMa,
      targetTen: previewRow.targetTen,
      payloadBefore: previewRow.payloadBefore,
      payloadAfter: previewRow.payloadAfter,
    });
  }, [previewRow]);

  const onApprove = async (id: string) => {
    setBusyId(id);
    const res = await approveCatalogDeNghiAction(id);
    setBusyId(null);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Đã duyệt và ghi đè danh mục.");
      setPreviewId(null);
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
      setPreviewId(null);
      await reload();
    }
  };

  const onDeleteApproved = async (id: string) => {
    if (!canApprove) return;
    const ok = window.confirm(
      "Xóa phiếu đã duyệt sẽ hoàn tác danh mục về giá trị trước duyệt. Tiếp tục?",
    );
    if (!ok) return;
    setBusyId(id);
    const res = await deleteCatalogDeNghiAction(id);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message || "Đã xóa phiếu và hoàn tác danh mục.");
    setPreviewId(null);
    await reload();
  };

  return (
    <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <div className="space-y-2">
        <h3 className="text-[12px] font-semibold text-violet-950">
          Đề nghị danh mục — chờ duyệt (ghi đè master)
        </h3>
        <p className="text-[11px] text-violet-900/80">
          Tách khỏi cửa sự cố SET_RECONCILE. Mở «Xem phiếu» để xem đủ Trước → Sau rồi duyệt / từ chối.
        </p>
        {loading ? (
          <p className="text-[12px] text-slate-500">Đang tải…</p>
        ) : pending.length === 0 ? (
          <p className="text-[12px] text-slate-500">Không có phiếu PENDING.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-white bg-white px-3 py-2"
              >
                <div className="min-w-0 text-[12px]">
                  <div className="font-semibold text-slate-800">
                    {CSSD_CATALOG_DE_NGHI_KIND_LABEL[r.targetKind as CssdCatalogDeNghiKind]} ·{" "}
                    <span className="font-mono text-violet-700">{r.targetMa || "—"}</span>{" "}
                    {r.targetTen}
                  </div>
                  <div className="mt-0.5 text-slate-600">{r.afterSummary}</div>
                  {r.note ? <div className="mt-0.5 text-[11px] text-slate-500">{r.note}</div> : null}
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewSource("PENDING");
                      setPreviewId(r.id);
                    }}
                    className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[11px] font-semibold text-white"
                  >
                    Xem phiếu
                  </button>
                  {!canApprove ? (
                    <span className="self-center text-[10px] text-slate-400">Chỉ xem</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 border-t border-violet-200/80 pt-3">
        <h3 className="text-[12px] font-semibold text-violet-950">
          Đã duyệt gần đây — xóa để hoàn tác
        </h3>
        <p className="text-[11px] text-violet-900/80">
          Admin / quyền duyệt có thể «Xóa & hoàn tác» để trả master về snapshot trước duyệt. Nếu có
          phiếu duyệt sau chạm cùng đích, phải hoàn tác phiếu mới hơn trước.
        </p>
        {loading ? null : approved.length === 0 ? (
          <p className="text-[12px] text-slate-500">Chưa có phiếu APPROVED gần đây.</p>
        ) : (
          <ul className="space-y-2">
            {approved.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2"
              >
                <div className="min-w-0 text-[12px]">
                  <div className="font-semibold text-slate-800">
                    {CSSD_CATALOG_DE_NGHI_KIND_LABEL[r.targetKind as CssdCatalogDeNghiKind]} ·{" "}
                    <span className="font-mono text-emerald-700">{r.targetMa || "—"}</span>{" "}
                    {r.targetTen}
                  </div>
                  <div className="mt-0.5 text-slate-600">{r.afterSummary}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Duyệt:{" "}
                    {r.approvedAt
                      ? new Date(r.approvedAt).toLocaleString("vi-VN")
                      : r.createdAt
                        ? new Date(r.createdAt).toLocaleString("vi-VN")
                        : "—"}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewSource("APPROVED");
                      setPreviewId(r.id);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                  >
                    Xem
                  </button>
                  {canApprove ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void onDeleteApproved(r.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 disabled:opacity-50"
                    >
                      {busyId === r.id ? "Đang hoàn tác…" : "Xóa & hoàn tác"}
                    </button>
                  ) : (
                    <span className="self-center text-[10px] text-slate-400">Chỉ xem</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CatalogDeNghiPhieuDialog
        open={Boolean(previewRow)}
        onOpenChange={(v) => {
          if (!v) setPreviewId(null);
        }}
        title={
          previewRow
            ? previewSource === "APPROVED"
              ? `Phiếu đã duyệt — ${CSSD_CATALOG_DE_NGHI_KIND_LABEL[previewRow.targetKind]} · ${previewRow.targetMa || "—"}`
              : `Duyệt phiếu — ${CSSD_CATALOG_DE_NGHI_KIND_LABEL[previewRow.targetKind]} · ${previewRow.targetMa || "—"}`
            : "Phiếu đề nghị"
        }
        items={previewItems}
        note={previewRow?.note}
        mode={
          previewSource === "APPROVED"
            ? "view"
            : canApprove
              ? "approve"
              : "view"
        }
        approveBusy={Boolean(previewRow && busyId === previewRow.id && previewSource === "PENDING")}
        rejectBusy={Boolean(previewRow && busyId === previewRow.id && previewSource === "PENDING")}
        onApprove={
          previewRow && canApprove && previewSource === "PENDING"
            ? () => void onApprove(previewRow.id)
            : undefined
        }
        onReject={
          previewRow && canApprove && previewSource === "PENDING"
            ? () => void onReject(previewRow.id)
            : undefined
        }
        onDelete={
          previewRow && canApprove && previewSource === "APPROVED"
            ? () => void onDeleteApproved(previewRow.id)
            : undefined
        }
        deleteBusy={Boolean(previewRow && busyId === previewRow.id && previewSource === "APPROVED")}
        deleteLabel="Xóa & hoàn tác"
      />
    </div>
  );
}
