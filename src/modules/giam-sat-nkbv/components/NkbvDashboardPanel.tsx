"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { Activity, AlertTriangle } from "lucide-react";
import type { NkbvDashboardPayload } from "../lib/nkbv-dashboard-aggregate";
import { formatKhoaCompactLabel, formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";

type KhoaOption = { id: string; ten_danh_muc: string; ma_danh_muc?: string };

type NkbvDashboardPanelProps = {
  payload: NkbvDashboardPayload | null;
  loading?: boolean;
  /** Khi true — kỳ/khoa nằm ở chrome (filterBar), không render trong body. */
  filtersInChrome?: boolean;
  tuNgay: string;
  denNgay: string;
  onTuNgayChange: (v: string) => void;
  onDenNgayChange: (v: string) => void;
  onApplyRange: () => void;
  khoaOptions?: KhoaOption[];
  selectedKhoaId?: string;
  onKhoaChange?: (khoaId: string) => void;
  khoaOptionsLoading?: boolean;
};

const COL_LOAI = ["var(--primary)", "#0d9488", "#2563eb", "#d97706", "#7c3aed", "#db2777", "#64748b"];

/** SIR/SUR/DUR `null` nghĩa là chưa tính được — không được hiển thị thành 0. */
function formatRatio(value: number | null | undefined, digits = 2): string {
  return value == null ? "—" : Number(value).toFixed(digits);
}

function formatPercentRatio(value: number | null | undefined): string {
  return value == null ? "—" : `${(Number(value) * 100).toFixed(2)}%`;
}

/** SIR `null` = chưa đủ dữ liệu để chuẩn hoá; SIR = 0 là kết quả hợp lệ (không có ca). */
function SirCell({ value, className }: { value: number | null | undefined; className: string }) {
  if (value == null) {
    return (
      <td className={`px-4 py-3 text-center ${className}`}>
        <span className="text-slate-300" title="Chưa đủ dữ liệu chuẩn hoá (thiếu baseline CDC hoặc số ca kỳ vọng < 1)">
          —
        </span>
      </td>
    );
  }
  return (
    <td className={`px-4 py-3 text-center ${className}`}>
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
          value > 1.0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
        }`}
      >
        {formatRatio(value)}
      </span>
    </td>
  );
}

export default function NkbvDashboardPanel({
  payload,
  loading,
  filtersInChrome = false,
  tuNgay,
  denNgay,
  onTuNgayChange,
  onDenNgayChange,
  onApplyRange,
  khoaOptions = [],
  selectedKhoaId = "",
  onKhoaChange,
  khoaOptionsLoading = false,
}: NkbvDashboardPanelProps) {
  const k = payload?.kpis;
  const khoaLabel = selectedKhoaId
    ? (() => {
        const row = khoaOptions.find((x) => x.id === selectedKhoaId);
        return row
          ? formatKhoaPickerLabel({ ma_danh_muc: row.ma_danh_muc, ten_danh_muc: row.ten_danh_muc })
          : "Một khoa";
      })()
    : "Tất cả khoa";

  return (
    <div className="space-y-[var(--bv103-space-3)] px-4 pb-10 animate-in fade-in duration-400">
      {!filtersInChrome ? (
      <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-shell)] border border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <label className={C.formLabelFlex}>
          Từ ngày
          <input
            type="date"
            value={tuNgay}
            onChange={(e) => onTuNgayChange(e.target.value)}
            className={C.controlInput}
          />
        </label>
        <label className={C.formLabelFlex}>
          Đến ngày
          <input
            type="date"
            value={denNgay}
            onChange={(e) => onDenNgayChange(e.target.value)}
            className={C.controlInput}
          />
        </label>
        {onKhoaChange ? (
          <label className={C.formLabelFlex}>
            Khoa ghi nhận
            <select
              value={selectedKhoaId}
              disabled={khoaOptionsLoading}
              onChange={(e) => onKhoaChange(e.target.value)}
              className="min-w-[200px] rounded-[var(--radius-shell)] border-0 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"
            >
              <option value="">Tất cả khoa</option>
              {khoaOptions.map((khoa) => (
                <option key={khoa.id} value={khoa.id}>
                  {formatKhoaPickerLabel({
                    ma_danh_muc: khoa.ma_danh_muc,
                    ten_danh_muc: khoa.ten_danh_muc,
                  })}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={onApplyRange}
          className={C.btnPrimary}
        >
          Cập nhật số liệu
        </button>
        <p className="w-full pb-1 text-[11px] text-slate-500">
          Đang lọc: <span className="font-semibold text-slate-700">{khoaLabel}</span>
          {" · "}
          Mặc định 12 tháng lịch gần nhất. Chỉ tính phiếu có ngày phát hiện trong khoảng.
        </p>
      </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          Đang lọc: <span className="font-semibold text-slate-700">{khoaLabel}</span>
          {" · "}
          {tuNgay} → {denNgay}. Chỉ tính phiếu có ngày phát hiện trong khoảng.
        </p>
      )}

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-slate-100 pb-2">
        {[
          {
            label: "Phiếu trong khoảng",
            value: loading ? "…" : String(k?.tong_phieu ?? 0),
            sub: `${payload?.tu_ngay} → ${payload?.den_ngay}`,
          },
          {
            label: "Đã xác nhận NKBV",
            value: loading ? "…" : String(k?.da_xac_nhan ?? 0),
            sub:
              loading || !k
                ? ""
                : `Tỷ lệ/XN vs (PA−Loại trừ): ${k.ti_le_xac_nhan_so_voi_pa ?? 0}%`,
          },
          {
            label: "Đang ghi / Chờ XN",
            value: loading ? "…" : String(k?.dang_va_cho_xn ?? 0),
            sub: "",
          },
          {
            label: "Loại trừ",
            value: loading ? "…" : String(k?.loai_tru ?? 0),
            sub: "",
          },
          {
            label: "Đã đóng",
            value: loading ? "…" : String(k?.da_dong ?? 0),
            sub: "",
          },
        ].map((c) => (
          <p key={c.label} className="text-sm text-slate-600">
            <span className="text-[11px] font-medium text-slate-400">{c.label}</span>{" "}
            <span className="font-semibold tabular-nums text-slate-800">{c.value}</span>
            {c.sub ? <span className="ml-1 text-[11px] text-slate-400">{c.sub}</span> : null}
          </p>
        ))}
      </div>

      {!payload && loading ? (
        <div className="flex h-56 items-center justify-center rounded-[var(--radius-shell)] border border-dashed border-slate-200 bg-slate-50">
          <p className="text-sm font-medium text-slate-400">Đang tổng hợp…</p>
        </div>
      ) : payload ? (
        <>
          <div className="grid grid-cols-1 gap-[var(--bv103-space-3)] lg:grid-cols-2">
            <div className={`${C.inset} bg-white p-5`}>
              <h3 className={`mb-4 ${C.blockSection}`}>Xu hướng phiếu theo tháng</h3>
              <Bv103ResponsiveChart className="h-[280px] w-full min-h-[260px] min-w-0">
                  <LineChart data={payload.monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 18px 24px rgba(0,0,0,.08)" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="so_phieu"
                      name="Số phiếu"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "var(--primary)" }}
                    />
                  </LineChart>
              </Bv103ResponsiveChart>
            </div>

            <div className={`${C.inset} bg-white p-5`}>
              <h3 className={`mb-4 ${C.blockSection}`}>
                Phân bố theo loại HAI/NKBV
              </h3>
              <Bv103ResponsiveChart className="h-[280px] w-full min-h-[260px] min-w-0">
                  <BarChart layout="vertical" data={payload.by_loai.slice(0, 8)} margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis type="category" dataKey="ten" width={120} tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="so_phieu" name="Phiếu" radius={[0, 10, 10, 0]} barSize={22}>
                      {payload.by_loai.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COL_LOAI[i % COL_LOAI.length]} />
                      ))}
                    </Bar>
                  </BarChart>
              </Bv103ResponsiveChart>
            </div>

            <div className={`${C.inset} bg-white p-5`}>
              <h3 className={`mb-4 ${C.blockSection}`}>
                Theo trạng thái xử lý
              </h3>
              <Bv103ResponsiveChart className="h-[260px] w-full min-h-[240px] min-w-0">
                  <BarChart data={payload.by_trang_thai}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="ten" interval={0} angle={-12} height={72} tick={{ fill: "#64748b", fontSize: 9 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="so_phieu" fill="#475569" name="Phiếu" radius={[12, 12, 0, 0]} barSize={28} />
                  </BarChart>
              </Bv103ResponsiveChart>
            </div>

            <div className={`${C.inset} bg-white p-5`}>
              <h3 className={`mb-4 ${C.blockSection}`}>
                Khoa có nhiều phiếu (top trong khoảng)
              </h3>
              <Bv103ResponsiveChart className="h-[260px] w-full min-h-[240px] min-w-0">
                  <BarChart layout="vertical" data={payload.top_khoa} margin={{ left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="ten_khoa" width={110} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="so_phieu" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={20} />
                  </BarChart>
              </Bv103ResponsiveChart>
            </div>
          </div>

          {payload.epidemiologyError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-[var(--radius-shell)] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="space-y-1">
                <p className="font-semibold">Không tính được chỉ số dịch tễ (tỷ suất / SIR / SUR)</p>
                <p className="text-[13px] leading-relaxed">
                  Bảng chỉ số bên dưới không hiển thị được — đây là <strong>lỗi hệ thống</strong>,
                  không phải &laquo;kỳ này không có ca&raquo;. Vui lòng báo quản trị hệ thống.
                </p>
                <p className="font-mono text-[11px] text-red-600">{payload.epidemiologyError}</p>
              </div>
            </div>
          )}

          {!payload.epidemiologyError && payload.epidemiologyRates && payload.epidemiologyRates.length > 0 && (
            <details className={`${C.inset} bg-white p-5 space-y-[var(--bv103-space-3)]`}>
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
              Xem thêm chỉ số dịch tễ (SIR / ngày thiết bị)
            </summary>
            <div className="space-y-[var(--bv103-space-3)] pt-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className={`${C.sectionTitle} flex items-center gap-2`}>
                    <Activity className="h-5 w-5 text-[var(--primary)]" />
                    Chỉ số dịch tễ lâm sàng (chuẩn JCI / NHSN–CDC)
                  </h3>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Theo dõi mật độ nhiễm khuẩn liên quan thiết bị và mức dùng thiết bị xâm lấn trong kỳ lọc.
                    Đây là kết quả nhiễm khuẩn — không gộp vào tỷ lệ vệ sinh tay / giám sát chung.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-500 bg-slate-50 p-1.5 rounded-full border border-slate-100">
                  <span
                    className="bg-white text-slate-700 px-3 py-1 rounded-full shadow-sm"
                    title="Device Utilization Ratio — số ngày dùng thiết bị ÷ số ngày nằm viện"
                  >
                    DUR: tỷ lệ ngày dùng thiết bị / ngày nằm viện
                  </span>
                  <span
                    className="bg-white text-slate-700 px-3 py-1 rounded-full shadow-sm"
                    title="Standardized Infection Ratio — ca quan sát ÷ ca kỳ vọng (chuẩn hóa)"
                  >
                    SIR: ca nhiễm quan sát so với kỳ vọng
                  </span>
                  <span
                    className="bg-white text-slate-700 px-3 py-1 rounded-full shadow-sm"
                    title="Standardized Utilization Ratio — mức dùng thiết bị so với kỳ vọng"
                  >
                    SUR: mức dùng thiết bị so với kỳ vọng
                  </span>
                </div>
              </div>

              {/* JCI Hospital Aggregates Summary Cards */}
              {(() => {
                const rates = payload.epidemiologyRates || [];
                const totPatientDays = rates.reduce((acc, r) => acc + Number(r.obs_patient_days || 0), 0);
                const totCvcDays = rates.reduce((acc, r) => acc + Number(r.obs_cvc_days || 0), 0);
                const totFoleyDays = rates.reduce((acc, r) => acc + Number(r.obs_foley_days || 0), 0);
                const totVentDays = rates.reduce((acc, r) => acc + Number(r.obs_vent_days || 0), 0);
                const totSurgeries = rates.reduce((acc, r) => acc + Number(r.obs_total_surgeries || 0), 0);
                
                const totClabsi = rates.reduce((acc, r) => acc + Number(r.obs_clabsi_cases || 0), 0);
                const totCauti = rates.reduce((acc, r) => acc + Number(r.obs_cauti_cases || 0), 0);
                const totVap = rates.reduce((acc, r) => acc + Number(r.obs_vap_cases || 0), 0);
                const totSsi = rates.reduce((acc, r) => acc + Number(r.obs_ssi_cases || 0), 0);

                const clabsiRate = totCvcDays > 0 ? ((totClabsi / totCvcDays) * 1000).toFixed(2) : "0.00";
                const cautiRate = totFoleyDays > 0 ? ((totCauti / totFoleyDays) * 1000).toFixed(2) : "0.00";
                const vapRate = totVentDays > 0 ? ((totVap / totVentDays) * 1000).toFixed(2) : "0.00";
                const ssiRate = totSurgeries > 0 ? ((totSsi / totSurgeries) * 100).toFixed(2) : "0.00";

                const cvcDur = totPatientDays > 0 ? (totCvcDays / totPatientDays).toFixed(4) : "0.0000";
                const foleyDur = totPatientDays > 0 ? (totFoleyDays / totPatientDays).toFixed(4) : "0.0000";
                const ventDur = totPatientDays > 0 ? (totVentDays / totPatientDays).toFixed(4) : "0.0000";

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* CLABSI Card */}
                    <div className={`${C.panelInset} p-4 space-y-2 transition-colors hover:bg-slate-50`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-red-500 tracking-wider">Nhiễm khuẩn huyết (CLABSI)</span>
                        <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 bv103-type-label font-semibold">JCI Site</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="bv103-type-kpi tabular-nums text-slate-800">{totClabsi} <span className="text-xs font-normal text-slate-400">ca</span></span>
                        <span className="bv103-type-label font-semibold text-red-600">{clabsiRate} <span className="text-[11px] font-normal text-slate-400">/1000 CVC-days</span></span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500 font-semibold">
                        <div>CVC Days: <strong className="text-slate-700">{totCvcDays}</strong></div>
                        <div>CVC DUR: <strong className="text-slate-700">{cvcDur}</strong></div>
                      </div>
                    </div>

                    {/* CAUTI Card */}
                    <div className={`${C.panelInset} p-4 space-y-2 transition-colors hover:bg-slate-50`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-500 tracking-wider">Tiết niệu (CAUTI)</span>
                        <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 bv103-type-label font-semibold">JCI Site</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="bv103-type-kpi tabular-nums text-slate-800">{totCauti} <span className="text-xs font-normal text-slate-400">ca</span></span>
                        <span className="bv103-type-label font-semibold text-amber-600">{cautiRate} <span className="text-[11px] font-normal text-slate-400">/1000 F-days</span></span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500 font-semibold">
                        <div>Foley Days: <strong className="text-slate-700">{totFoleyDays}</strong></div>
                        <div>Foley DUR: <strong className="text-slate-700">{foleyDur}</strong></div>
                      </div>
                    </div>

                    {/* VAP Card */}
                    <div className={`${C.panelInset} p-4 space-y-2 transition-colors hover:bg-slate-50`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-medium text-teal-600 tracking-wider">VAP (viêm phổi liên quan thở máy)</span>
                        <span className="rounded-full bg-teal-100 text-teal-700 px-2 py-0.5 bv103-type-label font-semibold">JCI Site</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="bv103-type-kpi tabular-nums text-slate-800">{totVap} <span className="text-xs font-normal text-slate-400">ca</span></span>
                        <span className="bv103-type-label font-semibold text-teal-600">{vapRate} <span className="text-[11px] font-normal text-slate-400">/1000 V-days</span></span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500 font-semibold">
                        <div>Vent Days: <strong className="text-slate-700">{totVentDays}</strong></div>
                        <div>Vent DUR: <strong className="text-slate-700">{ventDur}</strong></div>
                      </div>
                    </div>

                    {/* SSI Card */}
                    <div className={`${C.panelInset} p-4 space-y-2 transition-colors hover:bg-slate-50`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-medium text-blue-600 tracking-wider">Vết mổ (SSI)</span>
                        <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 bv103-type-label font-semibold">JCI Site</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="bv103-type-kpi tabular-nums text-slate-800">{totSsi} <span className="text-xs font-normal text-slate-400">ca</span></span>
                        <span className="bv103-type-label font-semibold text-blue-600">{ssiRate}% <span className="text-[11px] font-normal text-slate-400">tỷ lệ mổ</span></span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500 font-semibold">
                        <div>Số ca mổ: <strong className="text-slate-700">{totSurgeries}</strong></div>
                        <div>Ngày nằm: <strong className="text-slate-700">{totPatientDays}</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* JCI Detailed Table */}
              <ResponsiveTableShell
                maxHeight="max-h-[min(480px,60dvh)]"
                scrollHint="Vuốt ngang để xem chỉ số JCI đầy đủ"
                mobileCards={
                  payload.epidemiologyRates?.length ? (
                    <ul className="divide-y divide-slate-100">
                      {payload.epidemiologyRates.map((r) => (
                        <li key={r.khoa_id} className="space-y-2 px-3 py-3.5">
                          <p className="font-bold text-slate-800">
                            {formatKhoaCompactLabel({ ten_khoa: r.ten_khoa, ma_khoa: r.ma_khoa })}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-lg bg-red-50/50 p-2">
                              <p className="font-medium text-red-700">CLABSI</p>
                              <p className="tabular-nums text-slate-800">
                                {r.obs_clabsi_cases || 0}/{r.obs_cvc_days || 0} · SIR {formatRatio(r.clabsi_sir)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-amber-50/50 p-2">
                              <p className="font-medium text-amber-700">CAUTI</p>
                              <p className="tabular-nums text-slate-800">
                                {r.obs_cauti_cases || 0}/{r.obs_foley_days || 0} · SIR {formatRatio(r.cauti_sir)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-teal-50/50 p-2">
                              <p className="font-medium text-teal-700">VAP</p>
                              <p className="tabular-nums text-slate-800">
                                {r.obs_vap_cases || 0}/{r.obs_vent_days || 0} · SIR {formatRatio(r.vae_sir)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-blue-50/50 p-2">
                              <p className="font-medium text-blue-700">SSI</p>
                              <p className="tabular-nums text-slate-800">
                                {r.obs_ssi_cases || 0}/{r.obs_total_surgeries || 0} · SIR {formatRatio(r.ssi_sir)}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null
                }
              >
                <table className="w-full min-w-[900px] border-collapse text-left text-xs font-medium text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-medium">
                      <th className="px-4 py-3 w-44">Khoa lâm sàng</th>
                      <th className="px-4 py-3 text-center bg-red-50/30 text-red-700">CLABSI / CVC Days</th>
                      <th className="px-4 py-3 text-center bg-red-50/30 text-red-700">CVC DUR</th>
                      <th className="px-4 py-3 text-center bg-red-50/30 text-red-700">CLABSI SIR</th>
                      <th className="px-4 py-3 text-center bg-amber-50/30 text-amber-700">CAUTI / Foley Days</th>
                      <th className="px-4 py-3 text-center bg-amber-50/30 text-amber-700">Foley DUR</th>
                      <th className="px-4 py-3 text-center bg-amber-50/30 text-amber-700">CAUTI SIR</th>
                      <th className="px-4 py-3 text-center bg-teal-50/30 text-teal-700">VAP / Vent Days</th>
                      <th className="px-4 py-3 text-center bg-teal-50/30 text-teal-700">Vent DUR</th>
                      <th className="px-4 py-3 text-center bg-teal-50/30 text-teal-700">VAP SIR</th>
                      <th className="px-4 py-3 text-center bg-blue-50/30 text-blue-700">SSI / Mổ</th>
                      <th className="px-4 py-3 text-center bg-blue-50/30 text-blue-700">SSI SIR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payload.epidemiologyRates.map((r) => (
                      <tr key={r.khoa_id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {formatKhoaCompactLabel({
                            ten_khoa: r.ten_khoa,
                            ma_khoa: r.ma_khoa,
                          })}
                        </td>

                        {/* CLABSI columns */}
                        <td className="px-4 py-3 text-center bg-red-50/10">
                          <span className="font-bold text-slate-900">{r.obs_clabsi_cases || 0}</span>
                          <span className="text-slate-400"> / {r.obs_cvc_days || 0}</span>
                        </td>
                        <td className="px-4 py-3 text-center bg-red-50/10 font-mono">
                          {formatPercentRatio(r.cvc_dur)}
                        </td>
                        <SirCell value={r.clabsi_sir} className="bg-red-50/10" />

                        {/* CAUTI columns */}
                        <td className="px-4 py-3 text-center bg-amber-50/10">
                          <span className="font-bold text-slate-900">{r.obs_cauti_cases || 0}</span>
                          <span className="text-slate-400"> / {r.obs_foley_days || 0}</span>
                        </td>
                        <td className="px-4 py-3 text-center bg-amber-50/10 font-mono">
                          {formatPercentRatio(r.foley_dur)}
                        </td>
                        <SirCell value={r.cauti_sir} className="bg-amber-50/10" />

                        {/* VAP columns */}
                        <td className="px-4 py-3 text-center bg-teal-50/10">
                          <span className="font-bold text-slate-900">{r.obs_vap_cases || 0}</span>
                          <span className="text-slate-400"> / {r.obs_vent_days || 0}</span>
                        </td>
                        <td className="px-4 py-3 text-center bg-teal-50/10 font-mono">
                          {formatPercentRatio(r.vent_dur)}
                        </td>
                        <SirCell value={r.vae_sir} className="bg-teal-50/10" />

                        {/* SSI columns */}
                        <td className="px-4 py-3 text-center bg-blue-50/10">
                          <span className="font-bold text-slate-900">{r.obs_ssi_cases || 0}</span>
                          <span className="text-slate-400"> / {r.obs_total_surgeries || 0}</span>
                        </td>
                        <SirCell value={r.ssi_sir} className="bg-blue-50/10" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTableShell>
            </div>
            </details>
          )}

          <p className="text-center bv103-type-note">
            * Mật độ JCI tính theo ngày nằm viện thu thập từ tab Mẫu số. SIR/SUR chuẩn hoá theo baseline CDC/NHSN
            cấu hình trong danh mục; ô &laquo;—&raquo; nghĩa là chưa đủ dữ liệu chuẩn hoá, không phải bằng 0.
          </p>
        </>
      ) : (
        <p className="text-center text-sm text-slate-500">
          Chưa tải được thống kê hoặc không có phiếu trong khoảng và bộ lọc khoa đã chọn.
        </p>
      )}
    </div>
  );
}
