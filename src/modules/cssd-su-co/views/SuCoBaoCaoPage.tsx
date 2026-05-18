// src/modules/cssd-su-co/views/SuCoBaoCaoPage.tsx
"use client";

import React from "react";
import Link from "next/link";
import { FileBarChart, ExternalLink } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_UI_DATA_SURFACE } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import SuCoReportForm from "../components/SuCoReportForm";

export default function SuCoBaoCaoPage() {
  const { loading, allowed } = useModulePermission("BAO_SU_CO");

  if (loading) {
    return (
      <CSSDPageShell title="Ghi nhận sự cố CSSD" subtitle="Đang kiểm tra quyền…">
        <div className="flex h-[40vh] items-center justify-center text-sm text-slate-500">Đang tải…</div>
      </CSSDPageShell>
    );
  }

  if (!allowed.create) {
    return (
      <CSSDPageShell title="Ghi nhận sự cố CSSD" subtitle="Module báo cáo sự cố — BV103">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-sm text-amber-900">
          Bạn chưa có quyền <strong>BAO_SU_CO · create</strong>. Liên hệ quản trị KSNK để được cấp quyền ghi nhận sự cố.
        </div>
      </CSSDPageShell>
    );
  }

  return (
    <CSSDPageShell
      title={
        <>
          Ghi nhận <span className="text-[#026f17]">sự cố CSSD</span>
        </>
      }
      subtitle="Chọn đúng nhóm (quy trình / dụng cụ / máy / hóa chất / khác), nhập QR quy trình — hệ thống sẽ rollback theo chính sách an toàn."
      actions={
        <Link
          href="/cssd-erp/report"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <FileBarChart size={16} aria-hidden />
          Xem thống kê và nhật ký
          <ExternalLink size={14} className="opacity-50" aria-hidden />
        </Link>
      }
    >
      <div className={`${CSSD_UI_DATA_SURFACE} space-y-6 p-4 sm:p-6`}>
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-slate-600">
            Dùng trang này khi không thao tác tại màn <Link className="font-semibold text-[#026f17] underline" href="/cssd-tiep-nhan">Tiếp nhận / Quy trình</Link> — hoặc khi cần chọn
            <strong> trạm phát hiện</strong> tường minh.
          </p>
          <Link
            href="/cssd-erp/report"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-95"
          >
            <FileBarChart size={14} /> Nhật ký & Thống kê
          </Link>
        </div>
        <SuCoReportForm initialStation="TIEP_NHAN" allowStationOverride enabled />
      </div>
    </CSSDPageShell>
  );
}
