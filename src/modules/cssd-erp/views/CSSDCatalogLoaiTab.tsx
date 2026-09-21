"use client";

import type { ReactNode } from "react";
import type { Catalog, CSSDBo, CSSDLoai } from "../types/catalog.types";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import ServerPaginationBar from "@/components/shared/ServerPaginationBar";
import { useState } from "react";
import {
  CatalogDeNghiDialog,
  type CatalogDeNghiDialogTarget,
} from "@/modules/cssd-erp/components/catalog/CatalogDeNghiDialog";
import { CatalogDeNghiCreateDialog } from "@/modules/cssd-erp/components/catalog/CatalogDeNghiCreateDialog";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import type { KhoLoaiStockFilter } from "../actions/cssd-catalog-search.actions";

export function CSSDCatalogLoaiTab(props: {
  catalog: Catalog;
  loaiRows: CSSDLoai[];
  selectedLoaiId: string | null;
  setSelectedLoaiId: (id: string) => void;
  selectedLoai: CSSDLoai | null;
  boBySelectedLoai: CSSDBo[];
  toolbar?: ReactNode;
  loaiPage: number;
  loaiTotalPages: number;
  loaiTotalCount: number;
  loaiPageSize: number;
  setLoaiPage: (page: number) => void;
  loaiStockFilter: KhoLoaiStockFilter;
  setLoaiStockFilter: (f: KhoLoaiStockFilter) => void;
  loaiLoading?: boolean;
}) {
  const {
    loaiRows,
    selectedLoaiId,
    setSelectedLoaiId,
    selectedLoai,
    boBySelectedLoai,
    toolbar,
    loaiPage,
    loaiTotalPages,
    loaiTotalCount,
    loaiPageSize,
    setLoaiPage,
    loaiStockFilter,
    setLoaiStockFilter,
    loaiLoading,
  } = props;
  const [deNghi, setDeNghi] = useState<CatalogDeNghiDialogTarget | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Server đã lọc tồn + phân trang + sắp xếp (tồn giảm dần, rồi mã).
  const filteredRows = loaiRows;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-200/80 bg-violet-50/60 px-3 py-2.5 text-[12px] text-slate-700">
        <p className="font-semibold text-violet-900">Danh mục kho dụng cụ dự phòng</p>
        <p className="mt-0.5 leading-snug text-slate-600">
          Đây là các <span className="font-medium">loại</span> có thể chọn khi đề nghị bổ sung thành phần vào bộ
          (typeahead theo mã/tên). Cột <span className="font-medium">Kho dự phòng</span> = số còn ngoài bộ;
          <span className="font-medium"> Trong bộ</span> = đã gắn BOM.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["ALL", "Tất cả"],
              ["CO_DU_PHONG", "Còn dự phòng"],
              ["HET_DU_PHONG", "Hết dự phòng"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setLoaiStockFilter(id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                loaiStockFilter === id
                  ? "bg-[var(--primary)] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
        >
          + Đề nghị bổ sung loại mới
        </button>
      </div>

      <ResponsiveTableShell maxHeight="max-h-[350px]" toolbar={toolbar}>
        <table className="w-full min-w-[720px] border-collapse text-left text-sm text-slate-700">
          <thead className={L.theadRow}>
            <tr>
              <th className={L.th}>Mã loại</th>
              <th className={L.th}>Tên loại</th>
              <th className={`${L.th} text-center`}>Phân loại</th>
              <th className={`${L.th} text-center`} title="Số còn ngoài bộ — dùng khi bổ sung vào BOM">
                Kho dự phòng
              </th>
              <th className={`${L.th} text-center`} title="Đã gắn trong các bộ (BOM)">
                Trong bộ
              </th>
              <th className={`${L.th} text-center`} title="Kho dự phòng + trong bộ">
                Tổng
              </th>
              <th className={L.th}>Hình dáng</th>
              <th className={L.th}>Kích thước</th>
              <th className={L.th}>Công dụng</th>
              <th className={`${L.th} text-center`}>Chịu nhiệt</th>
              <th className={L.th}>Tiệt khuẩn</th>
              <th className={`${L.th} ${L.colActions || ""}`}> </th>
            </tr>
          </thead>
          <tbody className={L.tbody}>
            {filteredRows.map((x) => {
              const isSelected = selectedLoaiId === x.id;
              const kho = Number(x.so_luong_kho_du_phong ?? 0);
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
                  <td
                    className={`${L.td} text-center tabular-nums font-semibold ${
                      kho > 0 ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {kho}
                  </td>
                  <td className={`${L.td} text-center tabular-nums`}>{x.so_luong_trong_bo ?? 0}</td>
                  <td className={`${L.td} text-center tabular-nums`}>{x.so_luong_tong ?? 0}</td>
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
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={12} className={`${L.td} text-center text-slate-500`}>
                  {loaiLoading
                    ? "Đang tải…"
                    : loaiTotalCount === 0
                      ? "Chưa có loại khớp — gõ mã hoặc tên ở ô tìm phía trên, hoặc sang trang khác nếu đang lọc tồn."
                      : "Không có loại trong trang này."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveTableShell>

      <ServerPaginationBar
        page={loaiPage}
        totalPages={loaiTotalPages}
        totalCount={loaiTotalCount}
        pageSize={loaiPageSize}
        onPageChange={setLoaiPage}
        loading={loaiLoading}
      />

      {!selectedLoai ? (
        <p className="px-2.5 text-[11px] text-slate-500">
          Chọn một loại để xem các bộ đang dùng loại đó — rồi mở bộ → đề nghị bổ sung thành phần (chọn cùng loại).
        </p>
      ) : (
        <ResponsiveTableShell
          maxHeight="max-h-[350px]"
          toolbar={
            <p className="text-[11px] text-slate-500">
              Bộ đang dùng {selectedLoai.ten_loai_dung_cu} ({selectedLoai.ma_loai_dung_cu}) —{" "}
              {boBySelectedLoai.length} bộ · kho dự phòng còn{" "}
              <span className="font-semibold text-emerald-700">
                {Number(selectedLoai.so_luong_kho_du_phong ?? 0)}
              </span>
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
                    Loại này chưa gán vào bộ nào — có thể đề nghị bổ sung thành phần từ tab Bộ.
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
      <CatalogDeNghiCreateDialog open={createOpen} onOpenChange={setCreateOpen} kind="LOAI" />
    </div>
  );
}
