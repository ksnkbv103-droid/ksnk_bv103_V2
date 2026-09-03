"use client";

import type { ReactNode } from "react";
import type { Catalog, CSSDBo, CSSDChiTiet } from "../types/catalog.types";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";

export function CSSDCatalogChiTietTab(props: {
  catalog: Catalog;
  chiTietRows: CSSDChiTiet[];
  selectedChiTietId: string | null;
  setSelectedChiTietId: (id: string) => void;
  setSelectedLoaiId: (id: string) => void;
  selectedChiTiet: CSSDChiTiet | null;
  boBySelectedChiTietLoai: CSSDBo[];
  toolbar?: ReactNode;
}) {
  const {
    chiTietRows,
    selectedChiTietId,
    setSelectedChiTietId,
    setSelectedLoaiId,
    toolbar,
  } = props;

  return (
    <div className="space-y-[var(--bv103-space-3)]">
      <section className="space-y-2">
        <ResponsiveTableShell maxHeight="max-h-[500px]" toolbar={toolbar}>
          <table className="w-full min-w-[720px] border-collapse text-left text-sm text-slate-700">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
                <th className="px-2.5 py-1.5">Mã dụng cụ</th>
                <th className="px-2.5 py-1.5">Tên dụng cụ thành phần</th>
                <th className="px-2.5 py-1.5">Thuộc bộ dụng cụ</th>
                <th className="px-2.5 py-1.5">Loại dụng cụ</th>
                <th className="px-2.5 py-1.5 text-center">Số lượng trong bộ</th>
                <th className="px-2.5 py-1.5 text-center">Mã khắc / QR mẫu</th>
                <th className="px-2.5 py-1.5 text-center">Chu kỳ tối đa</th>
                <th className="px-2.5 py-1.5 text-center">Trọng lượng (g)</th>
                <th className="px-2.5 py-1.5">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chiTietRows.map((x) => {
                const isSelected = selectedChiTietId === x.id;
                return (
                  <tr
                    key={x.id}
                    onClick={() => {
                      setSelectedChiTietId(x.id);
                      if (x.loai_dung_cu_id) setSelectedLoaiId(x.loai_dung_cu_id);
                    }}
                    className={`cursor-pointer transition-colors hover:bg-slate-50/70 ${
                      isSelected ? "bg-sky-50/70 font-medium text-slate-900" : ""
                    }`}
                  >
                    <td className="px-2.5 py-1.5 font-bold text-indigo-600">{x.ma_chi_tiet || "—"}</td>
                    <td className="px-2.5 py-1.5 font-semibold">{x.ten_chi_tiet || "—"}</td>
                    <td className="px-2.5 py-1.5 bv103-type-label font-semibold text-[var(--primary)]">
                      {x.ten_bo || "Dụng cụ lẻ (Chưa gán bộ)"}
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-600">{x.ten_loai || "Chưa gán loại"}</td>
                    <td className="px-2.5 py-1.5 text-center font-bold text-slate-800">
                      {x.so_luong ?? 1}
                    </td>
                    <td className="px-2.5 py-1.5 text-center font-mono text-xs text-slate-500">
                      {x.ma_qr_mau || "—"}
                    </td>
                    <td className="px-2.5 py-1.5 text-center text-slate-500">
                      {x.max_suds_count ?? "Không giới hạn"}
                    </td>
                    <td className="px-2.5 py-1.5 text-center text-slate-500">
                      {x.trong_luong ?? "—"}
                    </td>
                    <td className="px-2.5 py-1.5 text-xs text-slate-400">{x.ghi_chu || "—"}</td>
                  </tr>
                );
              })}
              {chiTietRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-sm text-slate-500">
                    Gõ mã hoặc tên ở ô tìm phía trên (mỗi lần hiện tối đa 20 kết quả).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ResponsiveTableShell>
      </section>
    </div>
  );
}
