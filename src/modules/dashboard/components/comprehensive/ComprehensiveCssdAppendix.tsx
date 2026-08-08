"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ExternalLink, Package } from "lucide-react";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { cssdReportAnalyticsHref } from "@/lib/cssd-routes";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

export function ComprehensiveCssdAppendix({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const cssd = payload?.cssd;
  const href = useMemo(() => {
    if (!payload) return cssdReportAnalyticsHref({ tab: "volume" });
    return cssdReportAnalyticsHref({
      tab: "volume",
      from: payload.filters.tu_ngay,
      to: payload.filters.den_ngay,
    });
  }, [payload]);

  if (!payload || payload.sources.cssd !== "ok" || !cssd) {
    if (payload?.sources.cssd === "denied" || payload?.sources.cssd === "error") {
      return (
        <section className="rounded-[var(--radius-shell)] border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
          Phụ lục CSSD chưa tải được
          {payload.errors.cssd ? ` (${payload.errors.cssd})` : ""}. Không ảnh hưởng chỉ số VST/GSC.
        </section>
      );
    }
    return null;
  }

  return (
    <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <h2 className={`flex items-center gap-2 ${D.sectionHeading}`}>
          <Package size={18} className="text-[var(--primary)]" aria-hidden />
          Phụ lục CSSD (vận hành)
        </h2>
        <Link
          href={href}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-white"
        >
          Xem báo cáo CSSD
          <ExternalLink size={13} aria-hidden />
        </Link>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Sản lượng / chất lượng quy trình / máy — tách khỏi tuân thủ process VST–GSC.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="Sản lượng cấp phát" value={cssd.san_luong_cap_phat.toLocaleString()} />
        <Kpi
          label="Tỷ lệ quy trình không sự cố"
          value={
            cssd.ty_le_quy_trinh_khong_su_co != null ? `${cssd.ty_le_quy_trinh_khong_su_co}%` : "—"
          }
        />
        <Kpi label="Số bộ danh mục" value={cssd.so_bo_danh_muc.toLocaleString()} />
        <Kpi
          label="Mẻ / QC đạt"
          value={
            cssd.ty_le_qc_dat_me != null
              ? `${cssd.so_me_ky} · ${cssd.ty_le_qc_dat_me}%`
              : String(cssd.so_me_ky)
          }
        />
        <Kpi label="Máy sẵn sàng" value={String(cssd.may_ready)} />
        <Kpi label="Máy sửa/BT" value={String(cssd.may_repairing)} />
      </div>
      {cssd.station_volume.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-[11px] uppercase text-slate-500">
              <tr>
                <th className="py-2 text-left">Trạm</th>
                <th className="py-2 text-right">Hoàn thành kỳ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cssd.station_volume.map((s) => (
                <tr key={s.station}>
                  <td className="py-2 font-medium text-slate-700">{s.label}</td>
                  <td className="py-2 text-right tabular-nums">{s.completed.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {cssd.khoa_ownership_proxy && cssd.khoa_ownership_proxy.top.length > 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3">
          <p className="text-[11px] font-semibold text-slate-700">Bộ theo khoa sở hữu danh mục</p>
          <p className="mt-1 text-[11px] text-slate-500">{cssd.khoa_ownership_proxy.disclaimer}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-slate-700">
            {cssd.khoa_ownership_proxy.top.map((t) => (
              <li key={t.ten_khoa}>
                {formatKhoaCompactLabel({ ten_khoa: t.ten_khoa })}:{" "}
                <span className="tabular-nums font-semibold">{t.so_bo}</span> bộ
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
