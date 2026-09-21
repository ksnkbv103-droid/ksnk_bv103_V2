"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listCatalogDeNghiAction } from "@/modules/cssd-erp/actions/cssd-catalog-de-nghi.actions";
import { deleteCatalogDeNghiAction } from "@/modules/quan-tri-he-thong/danh-muc/dung-cu/catalog-de-nghi-approve.actions";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  summarizeDeNghiAfter,
  normalizeDeNghiItems,
  type CssdCatalogDeNghiRow,
} from "@/lib/domain/cssd-catalog-de-nghi";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import { CatalogDeNghiPhieuDialog } from "@/modules/cssd-erp/components/catalog/CatalogDeNghiPhieuPreview";
import { useModulePermission } from "@/hooks/useModulePermission";

/** Tab lịch sử phiếu đề nghị — sửa nhanh qua dialog trên Loại / Bộ / Thành phần. */
export function CSSDCatalogDeNghiTab() {
  const { isAdmin, allowed: leAllowed } = useModulePermission("DC_LE");
  const { allowed: boAllowed } = useModulePermission("BO_DC");
  // Cùng quyền duyệt (requireCatalogApprove): admin / DC_LE.edit / BO_DC.edit
  const canDelete = Boolean(isAdmin || leAllowed.edit || boAllowed.edit);

  const [rows, setRows] = useState<CssdCatalogDeNghiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await listCatalogDeNghiAction({ status: "ALL", limit: 80 });
    if (!res.success) toast.error(res.error);
    else setRows(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const viewRow = useMemo(
    () => (viewId ? rows.find((r) => r.id === viewId) || null : null),
    [viewId, rows],
  );

  const viewItems = useMemo(() => {
    if (!viewRow) return [];
    return normalizeDeNghiItems({
      targetKind: viewRow.targetKind,
      targetId: viewRow.targetId,
      targetMa: viewRow.targetMa,
      targetTen: viewRow.targetTen,
      payloadBefore: viewRow.payloadBefore,
      payloadAfter: viewRow.payloadAfter,
    });
  }, [viewRow]);

  const onDeleteRow = async (row: CssdCatalogDeNghiRow) => {
    if (!canDelete) return;
    const approved = row.status === "APPROVED";
    const ok = window.confirm(
      approved
        ? "Xóa phiếu đã duyệt sẽ hoàn tác danh mục về giá trị trước duyệt. Tiếp tục?"
        : "Xóa phiếu khỏi lịch sử?",
    );
    if (!ok) return;
    setDeleteBusy(true);
    const res = await deleteCatalogDeNghiAction(row.id);
    setDeleteBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message || "Đã xóa phiếu.");
    setViewId(null);
    await reload();
  };

  const onDelete = async () => {
    if (!viewRow) return;
    await onDeleteRow(viewRow);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[12px] text-slate-600">
        Sửa nhanh bằng <span className="font-semibold">Đề nghị sửa</span> trên từng dòng Loại / Bộ /
        Thành phần. Tab này xem lịch sử phiếu — bấm «Xem» để mở đầy đủ Trước → Sau. Admin duyệt tại
        Quản trị → Rà soát. Xóa phiếu đã duyệt sẽ hoàn tác master về trước duyệt.
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className={L.theadRow}>
            <tr>
              <th className={L.th}>Thời điểm</th>
              <th className={L.th}>Loại</th>
              <th className={L.th}>Đối tượng</th>
              <th className={L.th}>Đề nghị</th>
              <th className={L.th}>Trạng thái</th>
              <th className={L.th}> </th>
            </tr>
          </thead>
          <tbody className={L.tbody}>
            {loading ? (
              <tr>
                <td colSpan={6} className={`${L.td} text-slate-500`}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${L.td} text-slate-500`}>
                  Chưa có phiếu đề nghị.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const itemCount = normalizeDeNghiItems({
                  targetKind: r.targetKind,
                  payloadAfter: r.payloadAfter,
                }).length;
                return (
                  <tr
                    key={r.id}
                    className={`${L.row} cursor-pointer hover:bg-violet-50/40`}
                    onClick={() => setViewId(r.id)}
                  >
                    <td className={`${L.td} whitespace-nowrap text-[11px]`}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"}
                    </td>
                    <td className={L.td}>
                      {CSSD_CATALOG_DE_NGHI_KIND_LABEL[r.targetKind]}
                      {itemCount > 1 ? ` · ${itemCount} mục` : ""}
                    </td>
                    <td className={L.td}>
                      <div className="font-mono text-[11px] text-violet-700">{r.targetMa || "—"}</div>
                      <div className="text-[12px]">{r.targetTen || ""}</div>
                    </td>
                    <td className={`${L.td} text-[12px]`}>
                      {summarizeDeNghiAfter(r.targetKind, r.payloadAfter)}
                      {r.note ? (
                        <div className="mt-0.5 text-[11px] text-slate-500">{r.note}</div>
                      ) : null}
                    </td>
                    <td className={L.td}>
                      <span
                        className={
                          r.status === "PENDING"
                            ? "font-semibold text-amber-700"
                            : r.status === "APPROVED"
                              ? "font-semibold text-emerald-700"
                              : "font-semibold text-slate-500"
                        }
                      >
                        {r.status === "PENDING"
                          ? "Chờ duyệt"
                          : r.status === "APPROVED"
                            ? "Đã duyệt"
                            : "Từ chối"}
                      </span>
                    </td>
                    <td className={L.td}>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewId(r.id);
                          }}
                        >
                          Xem
                        </button>
                        {canDelete && r.status === "APPROVED" ? (
                          <button
                            type="button"
                            disabled={deleteBusy}
                            className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onDeleteRow(r);
                            }}
                          >
                            Xóa & hoàn tác
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CatalogDeNghiPhieuDialog
        open={Boolean(viewRow)}
        onOpenChange={(v) => {
          if (!v) setViewId(null);
        }}
        title={
          viewRow
            ? `Phiếu đề nghị — ${CSSD_CATALOG_DE_NGHI_KIND_LABEL[viewRow.targetKind]} · ${viewRow.targetMa || "—"}`
            : "Phiếu đề nghị"
        }
        items={viewItems}
        note={viewRow?.note}
        mode="view"
        onDelete={canDelete && viewRow ? onDelete : undefined}
        deleteBusy={deleteBusy}
        deleteLabel={
          viewRow?.status === "APPROVED" ? "Xóa & hoàn tác" : "Xóa phiếu"
        }
      />
    </div>
  );
}
