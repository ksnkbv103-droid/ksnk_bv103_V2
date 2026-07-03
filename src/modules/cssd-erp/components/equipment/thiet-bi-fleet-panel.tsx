"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { listThietBiFleetAction, type ThietBiFleetRow } from "../../actions/cssd-thiet-bi-fleet.actions";
import { pmDueLabel, trangThaiMayLabel } from "@/lib/domain/cssd-equipment-pm";
import { CSSD_UI_DATA_SURFACE } from "../../shared/ui/cssd-ui-chrome";
import ThietBiPrintQrButton from "./thiet-bi-print-qr-button";

function pmBadgeClass(status: ThietBiFleetRow["pm_status"]) {
  if (status === "QUA_HAN") return "bg-red-50 text-red-700 border-red-200";
  if (status === "SAP_DEN") return "bg-amber-50 text-amber-800 border-amber-200";
  if (status === "CHUA_CO_LICH") return "bg-slate-50 text-slate-600 border-slate-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function statusBadgeClass(st: string | null) {
  if (st === "REPAIRING") return "bg-blue-50 text-blue-700 border-blue-200";
  if (st === "BROKEN") return "bg-red-50 text-red-700 border-red-200";
  if (st === "RETIRED") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function ThietBiFleetPanel() {
  const [rows, setRows] = useState<ThietBiFleetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await listThietBiFleetAction();
    if (!r.success) toast.error(r.error);
    else setRows(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const ready = rows.filter((x) => ["READY", "HOAT_DONG"].includes(String(x.trang_thai || ""))).length;
  const repairing = rows.filter((x) => x.trang_thai === "REPAIRING").length;
  const overduePm = rows.filter((x) => x.pm_status === "QUA_HAN").length;

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p>
          <span className="font-semibold text-slate-900">Danh sách máy tại CSSD.</span> Mã QR gắn với thiết bị — in tem tại{" "}
          <Link href="/quan-tri-he-thong/danh-muc/thiet-bi" className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline">
            Danh mục thiết bị
          </Link>
          .
        </p>
        <Link
          href="/quan-tri-he-thong/danh-muc/thiet-bi"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)] hover:bg-emerald-50"
        >
          Quản trị thiết bị
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Sẵn sàng" value={ready} icon={<CheckCircle2 size={18} />} tone="emerald" />
        <StatCard label="Đang bảo dưỡng" value={repairing} icon={<Wrench size={18} />} tone="blue" />
        <StatCard label="Quá hạn PM" value={overduePm} icon={<AlertTriangle size={18} />} tone="red" />
      </div>

      {rows.length === 0 ? (
        <div className={`${CSSD_UI_DATA_SURFACE} rounded-2xl p-8 text-center text-sm text-slate-600`}>
          Chưa có máy trong danh mục. Thêm máy tại Quản trị.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((m) => (
            <article key={m.id} className={`${CSSD_UI_DATA_SURFACE} rounded-2xl border border-slate-100 p-4 shadow-sm`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold text-[var(--primary)]">{m.ma_thiet_bi}</p>
                  <h3 className="truncate text-sm font-semibold text-slate-900">{m.ten_thiet_bi}</h3>
                  <p className="text-[11px] text-slate-500">{m.ten_loai_may_hien_thi || m.loai_thiet_bi || "—"}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${statusBadgeClass(m.trang_thai)}`}>
                  {trangThaiMayLabel(m.trang_thai)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${pmBadgeClass(m.pm_status)}`}>
                  {pmDueLabel(m.pm_status)}
                </span>
                {m.ngay_bao_tri_tiep_theo ? (
                  <span className="text-[11px] text-slate-500">PM kế: {m.ngay_bao_tri_tiep_theo}</span>
                ) : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                {m.vi_tri ? (
                  <>
                    <dt className="text-slate-400">Vị trí</dt>
                    <dd>{m.vi_tri}</dd>
                  </>
                ) : null}
                {m.serial_number ? (
                  <>
                    <dt className="text-slate-400">Serial</dt>
                    <dd className="font-mono">{m.serial_number}</dd>
                  </>
                ) : null}
                <dt className="text-slate-400">Mẻ TK</dt>
                <dd>{m.so_me_tk}</dd>
              </dl>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <ThietBiPrintQrButton
                  thietBiId={m.id}
                  maThietBi={m.ma_thiet_bi}
                  tenThietBi={m.ten_thiet_bi}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "emerald" | "blue" | "red";
}) {
  const toneClass =
    tone === "red" ? "text-red-600 bg-red-50" : tone === "blue" ? "text-blue-600 bg-blue-50" : "text-emerald-600 bg-emerald-50";
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{value}</p>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>{icon}</div>
    </div>
  );
}
