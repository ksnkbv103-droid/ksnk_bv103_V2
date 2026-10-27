"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { listCatalogDeNghiAction } from "@/modules/cssd-erp/actions/cssd-catalog-de-nghi.actions";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  catalogDeNghiStatusLabel,
  summarizeDeNghiAfter,
  normalizeDeNghiItems,
  type CssdCatalogDeNghiRow,
} from "@/lib/domain/cssd-catalog-de-nghi";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import { CatalogDeNghiDiff } from "@/components/shared/CatalogDeNghiDiff";

/** Tab Phiếu — bấm một dòng để xem Cũ → Mới và in. Duyệt/Từ chối ở Quản trị (MDM ghi master). */
export function CSSDCatalogDeNghiTab() {
  const [rows, setRows] = useState<CssdCatalogDeNghiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const res = await listCatalogDeNghiAction({ status: "ALL", limit: 80 });
      if (!active) return;
      if (!res.success) toast.error(res.error);
      else setRows(res.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[12px] text-slate-600">
        Phiếu đề nghị tạo/sửa danh mục (Loại, Bộ). Bấm một dòng để xem <span className="font-semibold">Cũ → Mới</span> và{" "}
        <span className="font-semibold">In phiếu</span>. Admin được tự duyệt tại Quản trị → Rà soát.
        Đổi thành phần bộ làm ở Luân chuyển, không qua phiếu.
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
            </tr>
          </thead>
          <tbody className={L.tbody}>
            {loading ? (
              <tr>
                <td colSpan={5} className={`${L.td} text-slate-500`}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={`${L.td} text-slate-500`}>
                  Chưa có phiếu đề nghị.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <React.Fragment key={r.id}>
                <tr className={`cursor-pointer ${L.row}`} onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                  <td className={`${L.td} whitespace-nowrap text-[11px]`}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className={L.td}>{CSSD_CATALOG_DE_NGHI_KIND_LABEL[r.targetKind]}
                    {normalizeDeNghiItems({
                      targetKind: r.targetKind,
                      payloadAfter: r.payloadAfter,
                    }).length > 1
                      ? ` · ${normalizeDeNghiItems({ targetKind: r.targetKind, payloadAfter: r.payloadAfter }).length} mục`
                      : ""}</td>
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
                            : r.status === "APPLY_FAILED" || r.status === "APPLYING"
                              ? "font-semibold text-rose-700"
                              : "font-semibold text-slate-500"
                      }
                    >
                      {catalogDeNghiStatusLabel(r.status)}
                    </span>
                  </td>
                </tr>
                {openId === r.id ? (
                  <tr>
                    <td colSpan={5} className={`${L.td} bg-slate-50/60`}>
                      <CatalogDeNghiDiff row={r} />
                    </td>
                  </tr>
                ) : null}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
