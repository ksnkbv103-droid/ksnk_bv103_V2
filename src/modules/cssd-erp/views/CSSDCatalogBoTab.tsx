"use client";

import React, { useState } from "react";
import type { CSSDBo, CSSDChiTiet } from "../types/catalog.types";
import type { CatalogTab } from "./cssd-catalog-page-helpers";
import { Layers, ListFilter, Printer, Loader2 } from "lucide-react";
import { usePrint } from "@/hooks/usePrint";
import { registerPhysicalBoLabelFromDmAction } from "../contexts/instrument-catalog/entrypoint";
import { toast } from "sonner";

export function CSSDCatalogBoTab(props: {
  boRows: CSSDBo[];
  chiTietBySelectedBo: CSSDChiTiet[];
  selectedBoId: string | null;
  setSelectedBoId: (id: string) => void;
  selectedBo: CSSDBo | null;
  setSelectedChiTietId: (id: string) => void;
  setSelectedLoaiId: (id: string) => void;
  setTab: (t: CatalogTab) => void;
}) {
  const {
    boRows,
    chiTietBySelectedBo,
    selectedBoId,
    setSelectedBoId,
    selectedBo,
    setSelectedChiTietId,
    setSelectedLoaiId,
    setTab,
  } = props;

  const { printLabel } = usePrint();
  const [printingId, setPrintingId] = useState<string | null>(null);

  async function handlePrintQr(e: React.MouseEvent, boId: string) {
    e.stopPropagation();
    setPrintingId(boId);
    try {
      const res = await registerPhysicalBoLabelFromDmAction(boId);
      if (!res.success) {
        toast.error(res.error || "Không tạo được nhãn QR.");
        return;
      }
      toast.success(`Đã tạo mã QR: ${res.ma_vach_qr}`);
      await printLabel({
        qrCode: res.ma_vach_qr,
        tenBoDungCu: res.ten_bo,
        tram: "TIEP_NHAN",
        nguoiThucHien: "CSSD",
        thoiGian: new Date().toLocaleString("vi-VN"),
      });
      window.dispatchEvent(new CustomEvent("cssd:kho-refetch"));
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi in nhãn.");
    } finally {
      setPrintingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Bảng Danh mục Bộ dụng cụ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-slate-800">
              Danh mục Bộ dụng cụ ({boRows.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Click chọn một dòng để xem dụng cụ thành phần</span>
        </div>

        <div className="max-h-[350px] overflow-auto rounded-xl border border-slate-100 relative">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 shadow-sm">
                <th className="px-4 py-3">Mã bộ</th>
                <th className="px-4 py-3">Tên bộ</th>
                <th className="px-4 py-3 text-center">Phân loại bộ</th>
                <th className="px-4 py-3 text-center">Số khoản</th>
                <th className="px-4 py-3 text-center">Tổng số dụng cụ</th>
                <th className="px-4 py-3">Khoa sử dụng</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center w-[120px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boRows.map((x) => {
                const isSelected = selectedBoId === x.id;
                return (
                  <tr
                    key={x.id}
                    onClick={() => setSelectedBoId(x.id)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50/70 ${
                      isSelected ? "bg-emerald-50/70 font-medium text-slate-900" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 font-bold text-[var(--primary)]">{x.ma_bo || "—"}</td>
                    <td className="px-4 py-3.5 font-semibold">{x.ten_bo || "—"}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          x.phan_loai_bo === "THU_THUAT"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {x.phan_loai_bo === "THU_THUAT" ? "Thủ thuật" : "Phẫu thuật"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600">{x.so_khoan ?? 0}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                      {x.tong_so_luong_dung_cu ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
                      {x.ten_khoa || "Chưa phân bổ"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                          x.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {x.is_active ? "Hoạt động" : "Khóa"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={printingId === x.id}
                        onClick={(e) => void handlePrintQr(e, x.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 font-mono text-[11px] font-medium text-[var(--primary)] border border-emerald-200/50 hover:bg-[var(--primary)] hover:text-white transition-all disabled:opacity-50 touch-manipulation"
                        title="Tạo mã QR và in nhãn dán"
                      >
                        {printingId === x.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Printer className="h-3 w-3" />
                        )}
                        In QR
                      </button>
                    </td>
                  </tr>
                );
              })}
              {boRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-slate-500">
                    Không tìm thấy bộ dụng cụ nào khớp từ khóa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Danh sách Dụng cụ thành phần (hiển thị khi chọn Bộ) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Thành phần dụng cụ trong bộ{" "}
              {selectedBo ? (
                <span className="text-[var(--primary)] font-black">
                  — {selectedBo.ten_bo} ({selectedBo.ma_bo})
                </span>
              ) : (
                ""
              )}
            </h3>
          </div>
          {selectedBo && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {chiTietBySelectedBo.length} khoản dụng cụ
            </span>
          )}
        </div>

        {!selectedBo ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <Layers className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              Hãy chọn một bộ dụng cụ ở danh mục phía trên để hiển thị chi tiết thành phần dụng cụ.
            </p>
          </div>
        ) : (
          <div className="max-h-[350px] overflow-auto rounded-xl border border-slate-100 relative">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 shadow-sm">
                  <th className="px-4 py-3">Mã dụng cụ</th>
                  <th className="px-4 py-3">Tên dụng cụ thành phần</th>
                  <th className="px-4 py-3">Loại dụng cụ</th>
                  <th className="px-4 py-3 text-center">Số lượng trong bộ</th>
                  <th className="px-4 py-3 text-center">Mã khắc / QR mẫu</th>
                  <th className="px-4 py-3 text-center">Chu kỳ tối đa</th>
                  <th className="px-4 py-3 text-center">Trọng lượng (g)</th>
                  <th className="px-4 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chiTietBySelectedBo.map((x) => (
                  <tr
                    key={x.id}
                    onClick={() => {
                      setSelectedChiTietId(x.id);
                      if (x.loai_dung_cu_id) setSelectedLoaiId(x.loai_dung_cu_id);
                      setTab("CHI_TIET");
                    }}
                    className="cursor-pointer transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3 font-bold text-indigo-600">{x.ma_chi_tiet || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{x.ten_chi_tiet || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{x.ten_loai || "Chưa phân loại"}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{x.so_luong ?? 1}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">{x.ma_qr_mau || "—"}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{x.max_suds_count ?? "Không giới hạn"}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{x.trong_luong ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{x.ghi_chu || "—"}</td>
                  </tr>
                ))}
                {chiTietBySelectedBo.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm text-slate-500">
                      Bộ này chưa được cấu hình danh sách dụng cụ thành phần.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
