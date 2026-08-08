// src/modules/cssd-su-co/views/SuCoBaoCaoPage.tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileBarChart, ExternalLink, Zap } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_UI_DATA_SURFACE } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { CSSD_ROUTES, cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
import type { IncidentGroup } from "../domain/cssd-incident-taxonomy";
import SuCoReportForm from "../components/SuCoReportForm";

const INSTRUMENT_TYPES = new Set([
  "INSTRUMENT_BROKEN",
  "INSTRUMENT_MISSING",
  "INSTRUMENT_REPLENISH",
  "INSTRUMENT_TRANSFER",
]);

export default function SuCoBaoCaoPage() {
  const { loading, allowed } = useModulePermission("BAO_SU_CO");
  const searchParams = useSearchParams();
  const prefill = useMemo(() => {
    const groupRaw = String(searchParams.get("group") || "").trim().toUpperCase();
    const typeRaw = String(searchParams.get("type") || "").trim().toUpperCase();
    const group: IncidentGroup | undefined =
      groupRaw === "INSTRUMENT" || INSTRUMENT_TYPES.has(typeRaw)
        ? "INSTRUMENT"
        : groupRaw === "PROCESS" ||
            groupRaw === "CHEMICAL" ||
            groupRaw === "EQUIPMENT" ||
            groupRaw === "OTHER"
          ? (groupRaw as IncidentGroup)
          : undefined;
    const typeId = INSTRUMENT_TYPES.has(typeRaw) ? typeRaw : undefined;
    return {
      group,
      typeId,
      ma: String(searchParams.get("ma") || "").trim().toUpperCase() || undefined,
      loai: String(searchParams.get("loai") || "").trim() || undefined,
      chiTiet: String(searchParams.get("chiTiet") || "").trim() || undefined,
    };
  }, [searchParams]);

  if (loading) {
    return (
      <CSSDPageShell title="Ghi nhận sự cố CSSD">
        <div className="flex h-[40vh] items-center justify-center text-sm text-slate-500">Đang tải…</div>
      </CSSDPageShell>
    );
  }

  if (!allowed.view && !allowed.create) {
    return (
      <CSSDPageShell title="Ghi nhận sự cố CSSD">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm text-amber-900">
          Bạn không có quyền module <strong>BAO_SU_CO</strong>. Liên hệ quản trị KSNK.
        </div>
      </CSSDPageShell>
    );
  }

  const reportHref = cssdSuCoIncidentJournalHref();

  return (
    <CSSDPageShell
      title="Ghi nhận sự cố CSSD"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Link
            href={CSSD_ROUTES.quyTrinh}
            className="bv103-control-h inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="Báo nhanh tại trạm quy trình"
          >
            <Zap size={14} aria-hidden />
            Báo nhanh
          </Link>
          <Link
            href={reportHref}
            className="bv103-control-h inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileBarChart size={14} aria-hidden />
            Nhật ký
            <ExternalLink size={12} className="opacity-50" aria-hidden />
          </Link>
        </div>
      }
    >
      <div className={`${CSSD_UI_DATA_SURFACE} p-3 sm:p-4`}>
        {!allowed.create ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
            Tài khoản chỉ có quyền <strong>xem</strong> — liên hệ quản trị để được cấp quyền ghi nhận.
          </div>
        ) : (
          <SuCoReportForm
            initialStation="TIEP_NHAN"
            allowStationOverride
            enabled
            initialGroup={prefill.group}
            initialTypeId={prefill.typeId}
            initialMaQR={prefill.ma}
            initialLoaiDungCuId={prefill.loai}
            initialChiTietId={prefill.chiTiet}
          />
        )}
      </div>
    </CSSDPageShell>
  );
}
