"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComplianceDashboardGroupRow, ComplianceDashboardPayload } from "../compliance-dashboard.types";
import { aggregateRateRowsByKhoi } from "../lib/aggregate-rate-rows-by-khoi";

type Props = {
  payload: ComplianceDashboardPayload | null;
  loading?: boolean;
  /** Danh mục từ bộ lọc — để gộp by_khoa → theo khối */
  khoaCatalog?: Array<{ id: string; label?: string; khoi_id?: string }>;
  khoiCatalog?: Array<{ id: string; label: string }>;
};

const COLOR = { GREEN: "#026f17", RED: "#dc2626", BLUE: "#2563eb" } as const;

function buildByKhoiRows(
  payload: ComplianceDashboardPayload | null,
  khoaCatalog: Props["khoaCatalog"],
  khoiCatalog: Props["khoiCatalog"],
): ComplianceDashboardGroupRow[] {
  if (!payload?.by_khoa?.length || !khoaCatalog?.length) return [];
  return aggregateRateRowsByKhoi(payload.by_khoa, khoaCatalog, khoiCatalog ?? []).map((r) => ({
    ...r,
    so_phien: 0,
  }));
}

export default function ComplianceDashboardPanel({ payload, loading, khoaCatalog, khoiCatalog }: Props) {
  const byKhoiRows = buildByKhoiRows(payload, khoaCatalog, khoiCatalog);

  if (!payload) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{loading ? "Đang tải..." : "Không có dữ liệu."}</div>;
  }

  const khoaChart = payload.rank_khoa.map((x) => ({ stt: x.stt, ty_le: x.ty_le, nhom_mau: x.nhom_mau }));
  const vioChart = payload.violations.slice(0, 10).map((x, i) => ({ stt: i + 1, ty_le_vi_pham: x.ty_le_vi_pham }));
  const tongQs = payload.summary.tong_quan_sat ?? 0;
  const tongVp = payload.summary.tong_vi_pham ?? 0;
  const soTuanThu = Math.max(0, tongQs - tongVp);
  const tongPhien = payload.summary.tong_phien ?? 0;
  const hasComplianceActivity = tongPhien > 0 || tongQs > 0;

  return (
    <div className="space-y-6">
      {!loading && !hasComplianceActivity && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Chưa có tiêu chí quan sát (Đạt/Không đạt) trong các phiên đếm được — kiểm tra phiên đã nhập đủ tiêu chí, hoặc đổi tab nguồn (Chuyên trách / Chéo / Tự giám sát) cho khớp loại giám sát.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card label="Số phiên giám sát" value={String(payload.summary.tong_phien)} />
        <Card label="Số tiêu chí quan sát" value={String(tongQs)} />
        <Card label="Số tuân thủ (Đạt)" value={String(soTuanThu)} />
        <Card label="Số không đạt / vi phạm" value={String(tongVp)} />
        <Card label="Tỉ lệ tuân thủ" value={`${payload.summary.ty_le_tuan_thu}%`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-3">
          <Panel title="Biểu đồ xu hướng tuân thủ (tỉ lệ % theo thời gian)">
            <ChartWrap>
              <LineChart data={payload.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="ty_le" stroke="#026f17" strokeWidth={3} />
              </LineChart>
            </ChartWrap>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Panel title="So sánh tỉ lệ tuân thủ giữa các khoa phòng được giám sát">
          <ChartWrap>
            <BarChart data={khoaChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="stt" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="ty_le" radius={[8, 8, 0, 0]}>
                {khoaChart.map((x, i) => (
                  <Cell key={i} fill={COLOR[x.nhom_mau]} />
                ))}
              </Bar>
            </BarChart>
          </ChartWrap>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Panel title="So sánh giữa các đối tượng được giám sát (nghề nghiệp)">
          <SimpleRateTable rows={payload.by_nghe_nghiep} />
        </Panel>
        {byKhoiRows.length > 0 && (
          <Panel title="So sánh theo khối (gộp từ khoa được giám sát)">
            <SimpleRateTable rows={byKhoiRows} />
          </Panel>
        )}
        <Panel title="So sánh các khu vực được giám sát">
          <SimpleRateTable rows={payload.by_khu_vuc} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Bảng xếp hạng tuân thủ theo khoa">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-slate-500">
                  <th className="px-2 py-2">STT</th><th className="px-2 py-2">Khoa</th><th className="px-2 py-2">Tuân thủ (%)</th><th className="px-2 py-2">Quan sát</th>
                </tr>
              </thead>
              <tbody>
                {payload.rank_khoa.map((x) => (
                  <tr key={x.id} className={x.nhom_mau === "GREEN" ? "bg-emerald-50" : x.nhom_mau === "RED" ? "bg-red-50" : "bg-blue-50/50"}>
                    <td className="px-2 py-2 font-bold">{x.stt}</td>
                    <td className="px-2 py-2">{x.ten}</td>
                    <td className="px-2 py-2 font-black">{x.ty_le}</td>
                    <td className="px-2 py-2">{x.tong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="10 tiêu chí vi phạm phổ biến nhất (tỉ lệ không đạt)">
          <ChartWrap>
            <BarChart data={vioChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="stt" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="ty_le_vi_pham" fill="#dc2626" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartWrap>
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-slate-500">
                  <th className="px-2 py-2">STT</th><th className="px-2 py-2">Tiêu chí</th><th className="px-2 py-2">Vi phạm</th><th className="px-2 py-2">Tỷ lệ (%)</th>
                </tr>
              </thead>
              <tbody>
                {payload.violations.slice(0, 10).map((x, idx) => (
                  <tr key={x.criterion_id || x.ten_tieu_chi || idx} className="odd:bg-slate-50">
                    <td className="px-2 py-2 font-bold">{idx + 1}</td>
                    <td className="px-2 py-2">{x.ten_tieu_chi}</td>
                    <td className="px-2 py-2">{x.so_vi_pham}/{x.tong_quan_sat}</td>
                    <td className="px-2 py-2 font-black text-red-600">{x.ty_le_vi_pham}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-800">{value}</p></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4"><h3 className="mb-3 text-[11px] font-black uppercase text-slate-700">{title}</h3>{children}</div>;
}
function ChartWrap({ children }: { children: React.ReactNode }) {
  return <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer></div>;
}
function SimpleRateTable({ rows }: { rows: Array<{ id: string; ten: string; ty_le: number; tong: number; dat: number; so_phien: number }> }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase text-slate-500">
            <th className="px-2 py-2">STT</th><th className="px-2 py-2">Nhóm</th><th className="px-2 py-2">Tuân thủ (%)</th><th className="px-2 py-2">Quan sát</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x, idx) => (
            <tr key={x.id || x.ten || idx} className="odd:bg-slate-50">
              <td className="px-2 py-2 font-bold">{idx + 1}</td>
              <td className="px-2 py-2">{x.ten}</td>
              <td className="px-2 py-2 font-black">{x.ty_le}</td>
              <td className="px-2 py-2">{x.dat}/{x.tong}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

