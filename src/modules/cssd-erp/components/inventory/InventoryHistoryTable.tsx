// src/modules/cssd-erp/components/inventory/InventoryHistoryTable.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { fetchCssdKhoGiaoDichHistory } from "../../actions/cssd-kho-history.actions";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";

/**
 * Bảng lịch sử giao dịch kho dụng cụ (≤ 180 dòng)
 * Hiển thị các giao dịch Luân chuyển, Báo hỏng, Báo mất và Bổ sung.
 */
export default function InventoryHistoryTable() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const res = await fetchCssdKhoGiaoDichHistory();
    if (!res.success) toast.error("Không tải lịch sử kho: " + res.error);
    setData(res.success ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const columns: Column<any>[] = [
    { header: "Loại giao dịch", accessorKey: "loai_giao_dich", sortable: true, cell: (item: any) => {
      const type = String(item.loai_giao_dich || "");
      const TYPE_LABEL: Record<string, string> = {
        NHAP_KHO: "Nhập kho",
        XUAT_KHO: "Xuất kho",
        DIEU_CHINH: "Điều chỉnh",
        BAO_HONG: "Báo hỏng",
        BAO_MAT: "Báo mất",
        BO_SUNG: "Bổ sung",
      };
      return (
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${type === 'NHAP_KHO' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-600'}`}>
          {type === 'NHAP_KHO' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
        </div>
        <span className="text-[11px] font-semibold text-slate-700">{TYPE_LABEL[type] || type.replace(/_/g, " ")}</span>
      </div>
      );
    }},
    { header: "Bộ / Loại", accessorKey: "cssd_dm_bo_dung_cu.ma_bo", sortable: true, cell: (item: any) => (
      <span className="font-semibold text-slate-700 text-[11px] truncate max-w-[120px] block">
        {item.cssd_dm_bo_dung_cu?.ma_bo || item.cssd_dm_loai_dung_cu?.ma_loai_dung_cu || "---"}
      </span>
    )},
    { header: "Ghi chú", accessorKey: "ghi_chu", sortable: true, cell: (item: any) => (
      <span className="bv103-type-note truncate max-w-[150px] block">
        {item.ghi_chu || "---"}
      </span>
    )},
    { header: "Thời gian", accessorKey: "created_at", sortable: true, cell: (item: any) => (
      <span className="text-slate-400 font-bold text-[11px] whitespace-nowrap">
        {formatDateTimeVi(item.created_at)}
      </span>
    )}
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium text-slate-500">Lịch sử giao dịch kho</h3>
        <button type="button" onClick={() => void fetchHistory()} className="p-1.5 text-slate-400 hover:text-[var(--primary)]" title="Tải lại">
          <RefreshCw size={16} />
        </button>
      </div>
      <AdvancedDataTable columns={columns} data={data} loading={loading} enableMultiSelect={false} searchPlaceholder="Tìm loại giao dịch, mã bộ, ghi chú…" emptyMessage="Chưa có giao dịch kho — phát sinh khi nhập/xuất hoặc điều chỉnh." bodyMaxHeight="max-h-[min(48dvh,420px)]" />
    </div>
  );
}
