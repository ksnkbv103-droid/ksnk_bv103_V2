"use client";

import type { DashboardV4Payload } from "../../strategic-dashboard-v4.types";
import { GscDashboardSummaryCards } from "./GscDashboardSummaryCards";
import { GscDashboardTopViPhamPanel } from "./GscDashboardTopViPhamPanel";
import { GscDashboardVungNguyCoPanel } from "./GscDashboardVungNguyCoPanel";

type Props = {
  payload: DashboardV4Payload;
  loading?: boolean;
};

/** Dashboard Giám sát tuân thủ — vùng IPAC + top tiêu chí vi phạm. */
export function GscComplianceDashboardLayout({ payload, loading }: Props) {
  return (
    <div className="space-y-8">
      <GscDashboardSummaryCards summary={payload.summary} loading={loading} />

      <div className={`grid grid-cols-1 gap-6 xl:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vùng nguy cơ (IPAC)</p>
          <GscDashboardVungNguyCoPanel rows={payload.vung_nguy_co} />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top tiêu chí vi phạm</p>
          <GscDashboardTopViPhamPanel rows={payload.top_vi_pham} />
        </div>
      </div>
    </div>
  );
}
