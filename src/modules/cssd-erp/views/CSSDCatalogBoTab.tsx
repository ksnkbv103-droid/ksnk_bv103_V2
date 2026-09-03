"use client";

import React, { useState } from "react";
import type { CSSDBo } from "../types/catalog.types";
import { Loader2 } from "lucide-react";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";
import { usePrint } from "@/hooks/usePrint";
import { registerPhysicalBoLabelFromDmAction } from "../contexts/instrument-catalog/entrypoint";
import { toast } from "sonner";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";

export function CSSDCatalogBoTab({
  boRows,
  selectedBoId,
  setSelectedBoId,
  toolbar,
}: {
  boRows: CSSDBo[];
  selectedBoId: string | null;
  setSelectedBoId: (id: string) => void;
  toolbar?: React.ReactNode;
}) {

  const { printBoLabel } = usePrint();
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
      toast.success(`Đã tạo mã bộ: ${res.ma_vach_qr}`);
      await printBoLabel({
        qrCode: res.ma_vach_qr,
        tenBo: res.ten_bo,
      });
      window.dispatchEvent(new CustomEvent("cssd:kho-refetch"));
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi in nhãn.");
    } finally {
      setPrintingId(null);
    }
  }

  return (
        <ResponsiveTableShell
          maxHeight="max-h-[350px]"
          toolbar={toolbar}
          mobileCards={
            boRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Không tìm thấy bộ dụng cụ nào khớp từ khóa.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {boRows.map((x) => {
                  const isSelected = selectedBoId === x.id;
                  return (
                    <li key={x.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedBoId(x.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedBoId(x.id);
                          }
                        }}
                        className={`w-full space-y-2 px-3 py-3.5 text-left touch-manipulation ${
                          isSelected ? "bg-emerald-50/70 ring-1 ring-inset ring-emerald-200" : "active:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            {x.ma_bo ? <InlineEntityQrThumb code={x.ma_bo} size={20} /> : null}
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--primary)]">{x.ma_bo || "—"}</p>
                              <p className="font-semibold text-slate-800">{x.ten_bo || "—"}</p>
                            </div>
                          </div>
                          <span className="bv103-type-label font-semibold text-slate-600">{x.tong_so_luong_dung_cu ?? 0} DC</span>
                        </div>
                        <p className="text-xs text-slate-500">{x.ten_khoa || "Chưa phân bổ"}</p>
                        <button
                          type="button"
                          disabled={printingId === x.id}
                          onClick={(e) => void handlePrintQr(e, x.id)}
                          className="text-[11px] font-semibold text-[var(--primary)] hover:underline disabled:opacity-50"
                        >
                          {printingId === x.id ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}
                          In
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          }
        >
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead className={L.theadRow}>
              <tr>
                <th className={L.th}>Mã bộ</th>
                <th className={L.th}>Tên bộ</th>
                <th className={`${L.th} text-center`}>Phân loại</th>
                <th className={`${L.th} text-center`}>Số khoản</th>
                <th className={`${L.th} text-center`}>Tổng số</th>
                <th className={L.th}>Khoa</th>
                <th className={`${L.th} text-center`}>Trạng thái</th>
                <th className={`${L.th} ${L.colActions}`}> </th>
              </tr>
            </thead>
            <tbody className={L.tbody}>
              {boRows.map((x) => {
                const isSelected = selectedBoId === x.id;
                return (
                  <tr
                    key={x.id}
                    onClick={() => setSelectedBoId(x.id)}
                    className={`cursor-pointer ${isSelected ? L.rowSelected : L.row}`}
                  >
                    <td className={L.td}>
                      <span className="inline-flex items-center gap-2">
                        {x.ma_bo ? <InlineEntityQrThumb code={x.ma_bo} size={20} /> : null}
                        <span className="font-semibold text-[var(--primary)]">{x.ma_bo || "—"}</span>
                      </span>
                    </td>
                    <td className={L.td}>{x.ten_bo || "—"}</td>
                    <td className={`${L.td} text-center`}>
                      <span className={x.phan_loai_bo === "THU_THUAT" ? L.statusWarn : L.statusInfo}>
                        {x.phan_loai_bo === "THU_THUAT" ? "Thủ thuật" : "Phẫu thuật"}
                      </span>
                    </td>
                    <td className={`${L.td} text-center tabular-nums`}>{x.so_khoan ?? 0}</td>
                    <td className={`${L.td} text-center tabular-nums`}>{x.tong_so_luong_dung_cu ?? 0}</td>
                    <td className={L.td}>{x.ten_khoa || "Chưa phân bổ"}</td>
                    <td className={`${L.td} text-center`}>
                      <span className={x.is_active ? L.statusOk : L.statusMuted}>{x.is_active ? "Hoạt động" : "Khóa"}</span>
                    </td>
                    <td className={`${L.td} ${L.colActions}`} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={printingId === x.id}
                        onClick={(e) => void handlePrintQr(e, x.id)}
                        className="text-[11px] font-semibold text-[var(--primary)] hover:underline disabled:opacity-50"
                        title="Tạo mã QR và in nhãn dán"
                      >
                        {printingId === x.id ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}
                        In
                      </button>
                    </td>
                  </tr>
                );
              })}
              {boRows.length === 0 && (
                <tr>
                  <td colSpan={8} className={`${L.td} text-center text-slate-500`}>
                    Không tìm thấy bộ dụng cụ nào khớp từ khóa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ResponsiveTableShell>
  );
}
