"use client";

import type { ReactNode } from "react";
import { KHO_CATALOG_PAGE_SIZE, type Catalog, type CSSDBo, type CSSDLoai } from "../types/catalog.types";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { useState } from "react";
import {
  CatalogDeNghiDialog,
  type CatalogDeNghiDialogTarget,
} from "@/modules/cssd-erp/components/catalog/CatalogDeNghiDialog";
import { CatalogDeNghiCreateDialog } from "@/modules/cssd-erp/components/catalog/CatalogDeNghiCreateDialog";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import ServerPaginationBar from "@/components/shared/ServerPaginationBar";


export function CSSDCatalogLoaiTab(props: {
  catalog: Catalog;
  loaiRows: CSSDLoai[];
  selectedLoaiId: string | null;
  setSelectedLoaiId: (id: string) => void;
  selectedLoai: CSSDLoai | null;
  boBySelectedLoai: CSSDBo[];
  toolbar?: ReactNode;
  page: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const { selectedLoaiId, setSelectedLoaiId, selectedLoai, boBySelectedLoai, toolbar } = props;
  const [deNghi, setDeNghi] = useState<CatalogDeNghiDialogTarget | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [onlyStock, setOnlyStock] = useState(false);
  const loaiRows = onlyStock
    ? props.loaiRows.filter((x) => (x.so_luong_kho_du_phong ?? 0) > 0)
    : props.loaiRows;

  return (
    <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} />
            Chỉ loại còn tồn kho chưa dùng ({props.loaiRows.filter((x) => (x.so_luong_kho_du_phong ?? 0) > 0).length})
          </label>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
          >
            + Đề nghị bổ sung loại
          </button>
        </div>
        <ResponsiveTableShell maxHeight="max-h-[350px]" toolbar={toolbar}>
          <table className="w-full min-w-[720px] border-collapse text-left text-sm text-slate-700">
            <thead className={L.theadRow}>
              <tr>
                <th className={L.th}>Mã loại</th>
                <th className={L.th}>Tên loại</th>
                <th className={`${L.th} text-center`}>Phân loại</th>
                <th className={`${L.th} text-center`}>Tổng</th>
                <th className={`${L.th} text-center`}>Trong bộ</th>
                <th className={`${L.th} text-center`}>Tồn kho chưa dùng</th>
                <th className={L.th}>Hình dáng</th>
                <th className={L.th}>Kích thước</th>
                <th className={L.th}>Công dụng</th>
                <th className={`${L.th} text-center`}>Chịu nhiệt</th>
                <th className={L.th}>Tiệt khuẩn</th>
                <th className={`${L.th} ${L.colActions || ""}`}> </th>
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
                    <td className={`${L.td} text-center font-semibold tabular-nums`}>{x.so_luong_kho_du_phong ?? 0}</td>
                    <td className={L.td}>{x.hinh_dang || "—"}</td>
                    <td className={L.td}>{x.kich_thuoc || "—"}</td>
                    <td className={`${L.td} max-w-[200px] truncate`} title={x.cong_dung || ""}>
                      {x.cong_dung || "—"}
                    </td>
                    <td className={`${L.td} text-center`}>{x.kha_nang_chiu_nhiet || "—"}</td>
                    <td className={L.td}>{x.phuong_phap_tiet_khuan || "—"}</td>
                    <td className={`${L.td} ${L.colActions || ""}`} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
                        onClick={() =>
                          setDeNghi({
                            kind: "LOAI",
                            targetId: x.id,
                            targetMa: x.ma_loai_dung_cu,
                            targetTen: x.ten_loai_dung_cu,
                            ma: x.ma_loai_dung_cu,
                            ten: x.ten_loai_dung_cu,
                            isChiuNhiet:
                              x.kha_nang_chiu_nhiet === "Cao" ||
                              String(x.kha_nang_chiu_nhiet || "").toLowerCase().includes("chịu")
                                ? true
                                : x.kha_nang_chiu_nhiet === "Thấp" ||
                                    String(x.kha_nang_chiu_nhiet || "").toLowerCase().includes("nhạy")
                                  ? false
                                  : null,
                          })
                        }
                      >
                        Đề nghị sửa
                      </button>
                    </td>
                  </tr>
                );
              })}
              {loaiRows.length === 0 && (
                <tr>
                  <td colSpan={12} className={`${L.td} text-center text-slate-500`}>
                    Chưa có loại khớp — gõ mã hoặc tên ở ô tìm phía trên.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ResponsiveTableShell>
        <ServerPaginationBar
          page={props.page}
          totalPages={Math.max(1, Math.ceil(props.totalCount / KHO_CATALOG_PAGE_SIZE))}
          totalCount={props.totalCount}
          pageSize={KHO_CATALOG_PAGE_SIZE}
          onPageChange={props.onPageChange}
        />

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
      <CatalogDeNghiDialog
        open={Boolean(deNghi)}
        onOpenChange={(open) => {
          if (!open) setDeNghi(null);
        }}
        target={deNghi}
      />
      <CatalogDeNghiCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        kind="LOAI"
      />
    </div>
  );
}
