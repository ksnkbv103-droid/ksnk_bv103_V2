"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { listSetReconcileWorksheetRowsAction } from "@/modules/cssd-su-co/actions/set-reconcile-campaign.actions";
import { CSSD_UI_LINK_QUIET } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";
import { useModulePermission } from "@/hooks/useModulePermission";

/** Xuất phiếu kiểm kê + lối vào duyệt rà soát (quản trị) — quiet chrome (P1-4). */
export default function SetReconcileCampaignPanel() {
  const { isAdmin } = useModulePermission("BO_DC");
  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await listSetReconcileWorksheetRowsAction();
      if (!res.success) throw new Error(res.error);
      const { default: ExcelJS } = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Phieu_kiem_ke");
      ws.addRow([
        "Mã bộ",
        "Tên bộ",
        "Khoa",
        "Mã loại",
        "Dụng cụ",
        "Số chuẩn",
        "Số hệ thống",
        "Số đếm",
        "Loại lệch",
        "Ghi chú",
      ]);
      for (const r of res.rows) {
        ws.addRow([
          r.ma_bo,
          r.ten_bo,
          r.ten_khoa,
          r.ma_loai,
          r.ten_dung_cu,
          r.so_luong_chuan,
          r.so_luong_thuc_te,
          r.so_luong_dem,
          r.loai_lech,
          r.ghi_chu,
        ]);
      }
      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([buf as ArrayBuffer]));
      a.download = "BV103_phieu_kiem_ke_bo.xlsx";
      a.click();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không xuất Excel.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <button type="button" disabled={exporting} onClick={() => void exportExcel()} className={CSSD_UI_LINK_QUIET}>
        {exporting ? "Đang xuất…" : "Xuất phiếu kiểm kê"}
      </button>
      {isAdmin ? (
        <Link href={quanTriDungCuHref("phieu")} className={CSSD_UI_LINK_QUIET}>
          Phiếu đổi danh mục (chờ duyệt)
        </Link>
      ) : null}
    </span>
  );
}
