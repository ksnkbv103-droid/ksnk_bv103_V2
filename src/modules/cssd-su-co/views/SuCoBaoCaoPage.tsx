// src/modules/cssd-su-co/views/SuCoBaoCaoPage.tsx
"use client";

import React from "react";
import Link from "next/link";
import { FileBarChart, ExternalLink } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import CssdModuleChrome from "@/modules/cssd-erp/components/layout/CssdModuleChrome";
import { CSSD_UI_DATA_SURFACE } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
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

  if (!allowed.view && !allowed.create) {
    return (
      <CSSDPageShell title="Ghi nhận sự cố CSSD" subtitle="Module báo cáo sự cố — BV103">
        <CssdModuleChrome />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-sm text-amber-900">
          Bạn không có quyền module <strong>BAO_SU_CO</strong>. Liên hệ quản trị KSNK.
        </div>
      </CSSDPageShell>
    );
  }

  const reportHref = `${CSSD_ROUTES.erpReport}?tab=incident`;

  return (
    <CSSDPageShell
      title={
        <>
          Ghi nhận <span className="text-[#026f17]">sự cố CSSD</span>
        </>
      }
      subtitle="Nhóm: quy trình · dụng cụ · máy móc · hóa chất · tiệt khuẩn · khác — rollback theo chính sách an toàn BV103."
      actions={
        <Link
          href={reportHref}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <FileBarChart size={16} aria-hidden />
          Nhật ký &amp; thống kê
          <ExternalLink size={14} className="opacity-50" aria-hidden />
        </Link>
      }
    >
      <CssdModuleChrome />

      <div className={`${CSSD_UI_DATA_SURFACE} space-y-6 p-4 sm:p-6`}>
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-slate-600">
            Có thể báo nhanh tại{" "}
            <Link className="font-semibold text-[#026f17] underline" href={CSSD_ROUTES.quyTrinh}>
              Quy trình CSSD
            </Link>
            . Trang này dùng khi cần chọn <strong>trạm phát hiện</strong> và nhóm sự cố đầy đủ.
          </p>
          <Link
            href={reportHref}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50"
          >
            <FileBarChart size={14} /> Xem nhật ký
          </Link>
        </div>

        {!allowed.create ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
            Tài khoản chỉ có quyền <strong>xem</strong> sự cố — dùng báo cáo CSSD để tra cứu; liên hệ quản trị nếu cần quyền{" "}
            <strong>create</strong>.
          </div>
        ) : (
          <SuCoReportForm initialStation="TIEP_NHAN" allowStationOverride enabled />
        )}
      </div>
    </CSSDPageShell>
  );
}
