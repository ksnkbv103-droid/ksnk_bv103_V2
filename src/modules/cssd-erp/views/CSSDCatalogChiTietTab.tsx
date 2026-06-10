"use client";

import type { Catalog, CSSDBo, CSSDChiTiet } from "../types/catalog.types";
import { ListFilter } from "lucide-react";

export function CSSDCatalogChiTietTab(props: {
  catalog: Catalog;
  chiTietRows: CSSDChiTiet[];
  selectedChiTietId: string | null;
  setSelectedChiTietId: (id: string) => void;
  setSelectedLoaiId: (id: string) => void;
  selectedChiTiet: CSSDChiTiet | null;
  boBySelectedChiTietLoai: CSSDBo[];
}) {
  const {
    catalog,
    chiTietRows,
    selectedChiTietId,
    setSelectedChiTietId,
    setSelectedLoaiId,
  } = props;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-slate-800">
              Chi tiết Bộ dụng cụ / Dụng cụ thành phần ({chiTietRows.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Danh sách toàn bộ các dòng dụng cụ lẻ trong hệ thống</span>
        </div>

        <div className="max-h-[500px] overflow-auto rounded-xl border border-slate-100 relative">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 shadow-sm">
                <th className="px-4 py-3">Mã dụng cụ</th>
                <th className="px-4 py-3">Tên dụng cụ thành phần</th>
                <th className="px-4 py-3">Thuộc bộ dụng cụ</th>
                <th className="px-4 py-3">Loại dụng cụ</th>
                <th className="px-4 py-3 text-center">Số lượng trong bộ</th>
                <th className="px-4 py-3 text-center">Mã khắc / QR mẫu</th>
                <th className="px-4 py-3 text-center">Chu kỳ tối đa</th>
                <th className="px-4 py-3 text-center">Trọng lượng (g)</th>
                <th className="px-4 py-3">Ghi chú</th>
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
                    <td className="px-4 py-3.5 font-bold text-indigo-600">{x.ma_chi_tiet || "—"}</td>
                    <td className="px-4 py-3.5 font-semibold">{x.ten_chi_tiet || "—"}</td>
                    <td className="px-4 py-3.5 text-xs font-bold text-[var(--primary)]">
                      {x.ten_bo || "Dụng cụ lẻ (Chưa gán bộ)"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{x.ten_loai || "Chưa gán loại"}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                      {x.so_luong ?? 1}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-500">
                      {x.ma_qr_mau || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-500">
                      {x.max_suds_count ?? "Không giới hạn"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-500">
                      {x.trong_luong ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{x.ghi_chu || "—"}</td>
                  </tr>
                );
              })}
              {chiTietRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-sm text-slate-500">
                    Không tìm thấy dụng cụ thành phần nào khớp từ khóa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
