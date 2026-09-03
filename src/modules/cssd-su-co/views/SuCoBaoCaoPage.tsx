// src/modules/cssd-su-co/views/SuCoBaoCaoPage.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileBarChart, ExternalLink, Zap } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_ROUTES, cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";
import { INCIDENT_TYPE_PRESETS, type IncidentGroup } from "../domain/cssd-incident-taxonomy";
import { listRecentSuCoForReporter } from "../actions/su-co-report.actions";
import IncidentJournalPrintButton from "../components/IncidentJournalPrintButton";
import IncidentConfirmButton from "../components/IncidentConfirmButton";
import SuCoReportForm from "../components/SuCoReportForm";
import { INCIDENT_STATUS_CONFIRMED, type IncidentPhieuStatus } from "../domain/cssd-incident-status";

const INSTRUMENT_TYPES = new Set([
  "INSTRUMENT_SET_RECONCILE",
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
    const allTypeCodes = Object.values(INCIDENT_TYPE_PRESETS).flatMap((rows) => rows.map((x) => x.code));
    const typeId = allTypeCodes.includes(typeRaw) ? typeRaw : undefined;
    return {
      group,
      typeId,
      ma: String(searchParams.get("ma") || "").trim().toUpperCase() || undefined,
      loai: String(searchParams.get("loai") || "").trim() || undefined,
      chiTiet: String(searchParams.get("chiTiet") || "").trim() || undefined,
      maLo: String(searchParams.get("maLo") || searchParams.get("lo") || "").trim().toUpperCase() || undefined,
      loTietKhuanId: String(searchParams.get("loTietKhuanId") || "").trim() || undefined,
    };
  }, [searchParams]);

  const [recent, setRecent] = useState<
    Array<{
      id: string;
      mo_ta: string;
      created_at: string | null;
      incident_type_label: string | null;
      ma_qr: string | null;
      incident_status: IncidentPhieuStatus;
      incident_status_label: string;
    }>
  >([]);

  const reloadRecent = () => {
    void listRecentSuCoForReporter()
      .then((res) => {
        if (res.success) setRecent(res.data);
      })
      .catch(() => {
        /* quyền in/xem có thể hẹp hơn — form vẫn dùng được */
      });
  };

  useEffect(() => {
    if (loading || (!allowed.create && !allowed.view)) return;
    reloadRecent();
  }, [loading, allowed.create, allowed.view]);

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
      <div className="bv103-stack-page">
        {!allowed.create ? (
          <p className="text-sm text-slate-600">
            Tài khoản chỉ có quyền <strong>xem</strong> — liên hệ quản trị để được cấp quyền ghi nhận.
          </p>
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
            initialMaLo={prefill.maLo}
            initialLoTietKhuanId={prefill.loTietKhuanId}
          />
        )}
        {recent.length > 0 ? (
          <div className="border-t border-slate-200 pt-3">
            <p className="mb-1 text-[11px] font-semibold text-slate-500">Phiếu gần đây của tôi</p>
            <ul>
              {recent.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {row.incident_type_label || "Sự cố"} {row.ma_qr ? `· ${row.ma_qr}` : ""}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {row.incident_status_label} · {formatDateTimeVi(row.created_at)}{" "}
                      {row.mo_ta ? `— ${row.mo_ta}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {allowed.create && row.incident_status !== INCIDENT_STATUS_CONFIRMED ? (
                      <IncidentConfirmButton incidentId={row.id} onConfirmed={reloadRecent} />
                    ) : null}
                    <IncidentJournalPrintButton incidentId={row.id} />
                    <Link
                      href={cssdSuCoIncidentJournalHref(row.id)}
                      className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
                    >
                      Nhật ký
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </CSSDPageShell>
  );
}
