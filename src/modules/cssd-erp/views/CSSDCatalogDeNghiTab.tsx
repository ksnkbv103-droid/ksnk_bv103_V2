"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { listCatalogDeNghiAction } from "@/modules/cssd-erp/actions/cssd-catalog-de-nghi.actions";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  summarizeDeNghiAfter,
  normalizeDeNghiItems,
  type CssdCatalogDeNghiRow,
} from "@/lib/domain/cssd-catalog-de-nghi";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";

/** Tab lịch sử phiếu đề nghị — sửa nhanh qua dialog trên Loại / Bộ / Thành phần. */
export function CSSDCatalogDeNghiTab() {
  const [rows, setRows] = useState<CssdCatalogDeNghiRow[]>([]);
  const [loading, setLoading] = useState(true);

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
        Sửa nhanh bằng <span className="font-semibold">Đề nghị sửa</span> trên từng dòng Loại / Bộ /
        Thành phần. Tab này chỉ xem lịch sử phiếu (ngày giờ · trạng thái). Admin duyệt tại Quản trị →
        Rà soát. Đếm tồn thực tế ở tab Kiểm kê, không ghi trên phiếu đề nghị.
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
                <tr key={r.id} className={L.row}>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
