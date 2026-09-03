"use client";

import { soLuongTrongBo } from "@/lib/domain/cssd-loai-set-links";
import type { Catalog, CSSDBo, CSSDLoai } from "../types/catalog.types";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { AppWindow, Layers } from "lucide-react";

export function CSSDCatalogLoaiTab(props: {
  catalog: Catalog;
  loaiRows: CSSDLoai[];
  selectedLoaiId: string | null;
  setSelectedLoaiId: (id: string) => void;
  selectedLoai: CSSDLoai | null;
  boBySelectedLoai: CSSDBo[];
}) {
  const { catalog, loaiRows, selectedLoaiId, setSelectedLoaiId, selectedLoai, boBySelectedLoai } = props;

  return (
    <div className="space-y-6">
      {/* Bảng Danh mục Loại dụng cụ */}
      <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppWindow className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-slate-800">
              Danh mục Loại dụng cụ ({loaiRows.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Click chọn một dòng để xem các bộ chứa loại dụng cụ này</span>
        </div>

        <ResponsiveTableShell unboxed className="relative rounded-xl border border-slate-100" maxHeight="max-h-[350px]">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm text-slate-700">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 shadow-sm">
                <th className="px-4 py-3">Mã loại</th>
                <th className="px-4 py-3">Tên loại dụng cụ</th>
                <th className="px-4 py-3 text-center">Phân loại</th>
                <th className="px-4 py-3 text-center">Tổng</th>
                <th className="px-4 py-3 text-center">Trong bộ</th>
                <th className="px-4 py-3 text-center">Trong kho</th>
                <th className="px-4 py-3">Hình dáng</th>
                <th className="px-4 py-3">Kích thước</th>
                <th className="px-4 py-3">Tính năng / Công dụng</th>
                <th className="px-4 py-3 text-center">Khả năng chịu nhiệt</th>
                <th className="px-4 py-3">Phương pháp tiệt khuẩn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loaiRows.map((x) => {
                const isSelected = selectedLoaiId === x.id;
                return (
                  <tr
                    key={x.id}
                    onClick={() => setSelectedLoaiId(x.id)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50/70 ${
                      isSelected ? "bg-violet-50/70 font-medium text-slate-900" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 font-bold text-violet-700">{x.ma_loai_dung_cu || "—"}</td>
                    <td className="px-4 py-3.5 font-semibold">{x.ten_loai_dung_cu || "—"}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          x.phan_loai === "THU_THUAT"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {x.phan_loai === "THU_THUAT" ? "Thủ thuật" : "Phẫu thuật"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                      {x.so_luong_tong ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-violet-700">
                      {soLuongTrongBo(x.so_luong_tong ?? 0, x.so_luong_kho_du_phong ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600 font-semibold">
                      {x.so_luong_kho_du_phong ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{x.hinh_dang || "—"}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{x.kich_thuoc || "—"}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 truncate max-w-[200px]" title={x.cong_dung || ""}>
                      {x.cong_dung || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs text-slate-500">
                      {x.kha_nang_chiu_nhiet || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {x.phuong_phap_tiet_khuan || "—"}
                    </td>
                  </tr>
                );
              })}
              {loaiRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-sm text-slate-500">
                    Không tìm thấy loại dụng cụ nào khớp từ khóa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ResponsiveTableShell>
      </section>

      {/* Danh sách các bộ đang chứa loại dụng cụ này */}
      <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Bộ chứa{" "}
              {selectedLoai ? (
                <span className="text-violet-700 font-semibold">
                  {selectedLoai.ten_loai_dung_cu} ({selectedLoai.ma_loai_dung_cu}) — {boBySelectedLoai.length} bộ
                </span>
              ) : (
                "loại dụng cụ đã chọn"
              )}
            </h3>
          </div>
          {selectedLoai && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {boBySelectedLoai.length} bộ chứa
            </span>
          )}
        </div>

        {!selectedLoai ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <AppWindow className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              Hãy chọn một loại dụng cụ ở danh mục phía trên để hiển thị danh sách các bộ đang chứa loại này.
            </p>
          </div>
        ) : (
          <ResponsiveTableShell unboxed className="relative rounded-xl border border-slate-100" maxHeight="max-h-[350px]">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm text-slate-700">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 shadow-sm">
                  <th className="px-4 py-3">Mã bộ</th>
                  <th className="px-4 py-3">Tên bộ dụng cụ</th>
                  <th className="px-4 py-3 text-center">Phân loại bộ</th>
                  <th className="px-4 py-3 text-center">Cơ số trong bộ</th>
                  <th className="px-4 py-3">Khoa sử dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boBySelectedLoai.map((b) => {
                  const chiTietQty = catalog.chi_tiet
                    .filter((c) => c.bo_dung_cu_id === b.id && c.loai_dung_cu_id === selectedLoai.id)
                    .reduce((sum, c) => sum + (c.so_luong ?? 0), 0);
                  const fromChua = selectedLoai.bo_dung_cu_chua?.find((r) => r.id === b.id);
                  const qtyInSet = chiTietQty || fromChua?.so_luong || 0;

                  return (
                    <tr key={b.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-[var(--primary)]">{b.ma_bo || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{b.ten_bo || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            b.phan_loai_bo === "THU_THUAT"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {b.phan_loai_bo === "THU_THUAT" ? "Thủ thuật" : "Phẫu thuật"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {qtyInSet} dụng cụ
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                        {b.ten_khoa || "Chưa phân bổ"}
                      </td>
                    </tr>
                  );
                })}
                {boBySelectedLoai.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                      Loại này chưa gắn vào bộ nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResponsiveTableShell>
        )}
      </section>
    </div>
  );
}
