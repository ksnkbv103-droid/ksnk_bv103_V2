"use client";

import type { ReactNode } from "react";
import type { Catalog, CSSDBo, CSSDLoai } from "../types/catalog.types";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";

export function CSSDCatalogLoaiTab(props: {
  catalog: Catalog;
  loaiRows: CSSDLoai[];
  selectedLoaiId: string | null;
  setSelectedLoaiId: (id: string) => void;
  selectedLoai: CSSDLoai | null;
  boBySelectedLoai: CSSDBo[];
  toolbar?: ReactNode;
}) {
  const { loaiRows, selectedLoaiId, setSelectedLoaiId, selectedLoai, boBySelectedLoai, toolbar } = props;

  return (
    <div className="space-y-3">
        <ResponsiveTableShell maxHeight="max-h-[350px]" toolbar={toolbar}>
          <table className="w-full min-w-[720px] border-collapse text-left text-sm text-slate-700">
            <thead className={L.theadRow}>
              <tr>
                <th className={L.th}>Mã loại</th>
                <th className={L.th}>Tên loại</th>
                <th className={`${L.th} text-center`}>Phân loại</th>
                <th className={`${L.th} text-center`}>Tổng</th>
                <th className={`${L.th} text-center`}>Trong bộ</th>
                <th className={`${L.th} text-center`}>Trong kho</th>
                <th className={L.th}>Hình dáng</th>
                <th className={L.th}>Kích thước</th>
                <th className={L.th}>Công dụng</th>
                <th className={`${L.th} text-center`}>Chịu nhiệt</th>
                <th className={L.th}>Tiệt khuẩn</th>
              </tr>
            </thead>
            <tbody className={L.tbody}>
              {loaiRows.map((x) => {
                const isSelected = selectedLoaiId === x.id;
                return (
                  <tr
                    key={x.id}
                    onClick={() => setSelectedLoaiId(x.id)}
                    className={`cursor-pointer ${isSelected ? L.rowSelected : L.row}`}
                  >
                    <td className={`${L.td} font-medium text-violet-700`}>{x.ma_loai_dung_cu || "—"}</td>
                    <td className={L.td}>{x.ten_loai_dung_cu || "—"}</td>
                    <td className={`${L.td} text-center`}>
                      <span className={x.phan_loai === "THU_THUAT" ? L.statusWarn : L.statusInfo}>
                        {x.phan_loai === "THU_THUAT" ? "Thủ thuật" : "Phẫu thuật"}
                      </span>
                    </td>
                    <td className={`${L.td} text-center tabular-nums`}>{x.so_luong_tong ?? 0}</td>
                    <td className={`${L.td} text-center tabular-nums`}>{x.so_luong_trong_bo ?? 0}</td>
                    <td className={`${L.td} text-center tabular-nums`}>{x.so_luong_kho_du_phong ?? 0}</td>
                    <td className={L.td}>{x.hinh_dang || "—"}</td>
                    <td className={L.td}>{x.kich_thuoc || "—"}</td>
                    <td className={`${L.td} max-w-[200px] truncate`} title={x.cong_dung || ""}>
                      {x.cong_dung || "—"}
                    </td>
                    <td className={`${L.td} text-center`}>{x.kha_nang_chiu_nhiet || "—"}</td>
                    <td className={L.td}>{x.phuong_phap_tiet_khuan || "—"}</td>
                  </tr>
                );
              })}
              {loaiRows.length === 0 && (
                <tr>
                  <td colSpan={11} className={`${L.td} text-center text-slate-500`}>
                    Chưa có loại khớp — gõ mã hoặc tên ở ô tìm phía trên.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ResponsiveTableShell>

        {!selectedLoai ? (
          <p className="px-2.5 text-[11px] text-slate-500">Chọn một loại để xem các bộ đang chứa.</p>
        ) : (
          <ResponsiveTableShell
            maxHeight="max-h-[350px]"
            toolbar={
              <p className="text-[11px] text-slate-500">
                Bộ chứa {selectedLoai.ten_loai_dung_cu} ({selectedLoai.ma_loai_dung_cu}) — {boBySelectedLoai.length} bộ
              </p>
            }
          >
            <table className="w-full min-w-[480px] border-collapse text-left text-sm text-slate-700">
              <thead className={L.theadRow}>
                <tr>
                  <th className={L.th}>Mã bộ</th>
                  <th className={L.th}>Tên bộ</th>
                  <th className={`${L.th} text-center`}>Phân loại</th>
                  <th className={`${L.th} text-center`}>Cơ số</th>
                  <th className={L.th}>Khoa</th>
                </tr>
              </thead>
              <tbody className={L.tbody}>
                {boBySelectedLoai.map((b) => (
                    <tr key={b.id} className={L.row}>
                      <td className={`${L.td} font-semibold text-[var(--primary)]`}>{b.ma_bo || "—"}</td>
                      <td className={L.td}>{b.ten_bo || "—"}</td>
                      <td className={`${L.td} text-center`}>
                        <span className={b.phan_loai_bo === "THU_THUAT" ? L.statusWarn : L.statusInfo}>
                          {b.phan_loai_bo === "THU_THUAT" ? "Thủ thuật" : "Phẫu thuật"}
                        </span>
                      </td>
                      <td className={`${L.td} text-center tabular-nums`}>{b.co_so_loai_dang_xem ?? 0}</td>
                      <td className={L.td}>{b.ten_khoa || "Chưa phân bổ"}</td>
                    </tr>
                ))}
                {boBySelectedLoai.length === 0 && (
                  <tr>
                    <td colSpan={5} className={`${L.td} text-center text-slate-500`}>
                      Loại này chưa gán vào bộ nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResponsiveTableShell>
        )}
    </div>
  );
}
