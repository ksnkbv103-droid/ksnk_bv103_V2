"use client";

import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CssdAnalyticsBundle } from "../../actions/cssd-report-read.actions";
import type { CssdVolumeBucket } from "@/lib/analytics/cssd-metrics/cssd-analytics-core";
import { stationLabel } from "@/lib/analytics/cssd-metrics/cssd-analytics-core";
import { CSSD_UI_DATA_SURFACE, CSSD_UI_STAT_LABEL, CSSD_UI_STAT_VALUE } from "../../shared/ui/cssd-ui-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

type Props = {
  data: CssdAnalyticsBundle | null;
  loading: boolean;
  panel: "VOLUME" | "SETS" | "EQUIPMENT" | "STAFF";
};

function MetricCard({ title, value, hint }: { title: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4 shadow-sm">
      <p className={CSSD_UI_STAT_LABEL}>{title}</p>
      <p className={`mt-2 ${CSSD_UI_STAT_VALUE}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function VolumePanel({ data, loading }: { data: CssdAnalyticsBundle | null; loading: boolean }) {
  const [bucket, setBucket] = useState<CssdVolumeBucket>("day");
  const chartData = useMemo(() => {
    if (!data) return [];
    if (bucket === "month") return data.volumeTrendMonth;
    if (bucket === "year") return data.volumeTrendYear;
    return data.volumeTrendDay;
  }, [data, bucket]);

  return (
    <div className={"space-y-3"}>
      <p className="text-xs text-slate-500">
        Sản lượng = số bộ <strong>hoàn thành</strong> từng trạm theo thời gian quét trong kỳ — không phải tồn trạm hiện tại.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(data?.stationVolume || []).map((s) => (
          <MetricCard key={s.station} title={s.label} value={loading ? "…" : s.completed.toLocaleString()} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["day", "Theo ngày"],
            ["month", "Theo tháng"],
            ["year", "Theo năm"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setBucket(k)}
            className={bucket === k ? bv103LayoutChrome.btnPrimary : bv103LayoutChrome.btnSecondary}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={`${CSSD_UI_DATA_SURFACE} p-4`}>
        <h3 className="mb-3 text-[11px] font-medium text-slate-500">
          Xu hướng hoàn thành {bucket === "day" ? "ngày" : bucket === "month" ? "tháng" : "năm"}
          {data?.volumeTrendPoints[0] ? ` · lọc trạm đang chọn` : ""}
        </h3>
        <div className="h-64 w-full min-w-0">
          {loading ? (
            <div className="h-full animate-pulse rounded-xl bg-slate-100" />
          ) : chartData.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">Chưa có sản lượng trong kỳ lọc</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" name="Số bộ hoàn thành" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function SetsPanel({ data, loading }: { data: CssdAnalyticsBundle | null; loading: boolean }) {
  return (
    <div className={"space-y-3"}>
      <p className="text-xs text-slate-500">
        Tách hai chiều: <strong>sở hữu danh mục</strong> (số bộ) vs <strong>khoa nhận cấp phát</strong>{" "}
        (<code className="rounded bg-slate-100 px-1">khoa_nhan_id</code>). Tái sử dụng lấy{" "}
        <code className="rounded bg-slate-100 px-1">suds_count</code> + số chu trình trong kỳ.
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className={"mb-2 text-[11px] font-medium text-slate-500"}>Số bộ theo khoa sở hữu danh mục</h3>
          <AdvancedDataTable
            columns={[
              { header: "Khoa", accessorKey: "ten_khoa", cell: (v: any) => formatKhoaCompactLabel({ ten_khoa: v.ten_khoa }) },
              {
                header: "Số bộ",
                accessorKey: "so_bo",
                cell: (v: any) => <span className="tabular-nums font-semibold">{v.so_bo}</span>,
              },
            ]}
            data={(data?.boByKhoa || []).map((r) => ({ ...r, id: r.khoa_key }))}
            loading={loading}
            enableMultiSelect={false}
          />
        </div>
        <div className="space-y-2">
          <h3 className={"mb-2 text-[11px] font-medium text-slate-500"}>Cấp phát theo khoa nhận (SSOT)</h3>
          <AdvancedDataTable
            columns={[
              { header: "Khoa nhận", accessorKey: "ten_khoa", cell: (v: any) => formatKhoaCompactLabel({ ten_khoa: v.ten_khoa }) },
              {
                header: "Lượt cp",
                accessorKey: "so_cap_phat",
                cell: (v: any) => (
                  <span className="tabular-nums font-semibold">{v.so_cap_phat}</span>
                ),
              },
            ]}
            data={(data?.capPhatByKhoaNhan || []).map((r) => ({ ...r, id: r.khoa_key }))}
            loading={loading}
            enableMultiSelect={false}
          />
        </div>
        <div className="space-y-2">
          <h3 className={"mb-2 text-[11px] font-medium text-slate-500"}>Tái sử dụng &amp; tần suất (top)</h3>
          <AdvancedDataTable
            columns={[
              {
                header: "Bộ",
                accessorKey: "ma_bo",
                cell: (v: any) => (
                  <div>
                    <p className="font-mono text-[11px] text-[var(--primary)]">{v.ma_bo}</p>
                    <p className="text-xs text-slate-600">{v.ten_bo}</p>
                  </div>
                ),
              },
              { header: "Khoa", accessorKey: "ten_khoa", cell: (v: any) => formatKhoaCompactLabel({ ten_khoa: v.ten_khoa }) },
              {
                header: "Suds",
                accessorKey: "suds_hien_tai",
                cell: (v: any) => (
                  <span className="tabular-nums font-semibold">{v.suds_hien_tai}</span>
                ),
              },
              {
                header: "Chu trình kỳ",
                accessorKey: "chu_trinh_ky",
                cell: (v: any) => (
                  <span className="tabular-nums">{v.chu_trinh_ky}</span>
                ),
              },
            ]}
            data={(data?.reuseRows || []).map((r) => ({ ...r, id: r.bo_dung_cu_id }))}
            loading={loading}
            enableMultiSelect={false}
          />
        </div>
      </div>
    </div>
  );
}

function EquipmentPanel({ data, loading }: { data: CssdAnalyticsBundle | null; loading: boolean }) {
  return (
    <div className={"space-y-3"}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard title="Mẻ trong kỳ" value={loading ? "…" : (data?.meQc.so_me_ky ?? 0).toLocaleString()} />
        <MetricCard
          title="QC đạt (mẻ)"
          value={
            loading
              ? "…"
              : data?.meQc.ty_le_qc_dat_me != null
                ? `${data.meQc.ty_le_qc_dat_me}%`
                : "—"
          }
          hint={
            data
              ? `${data.meQc.so_me_dat}/${data.meQc.so_me_da_qc} mẻ đã QC`
              : undefined
          }
        />
        <MetricCard title="Máy sẵn sàng" value={loading ? "…" : (data?.mayReady ?? 0).toLocaleString()} />
        <MetricCard
          title="Máy sửa / bảo trì"
          value={loading ? "…" : (data?.mayRepairing ?? 0).toLocaleString()}
          hint={`Phiếu BT đang mở: ${data?.phieuBaoTriMo ?? 0}`}
        />
      </div>
      <div className="space-y-2">
        <h3 className={"mb-2 text-[11px] font-medium text-slate-500"}>Số lần dùng máy (mẻ trong kỳ)</h3>
        <AdvancedDataTable
          columns={[
            {
              header: "Thiết bị",
              accessorKey: "ten_thiet_bi",
              cell: (v: any) => v.ten_thiet_bi,
            },
            {
              header: "Số mẻ",
              accessorKey: "so_lan_dung",
              cell: (v: any) => (
                <span className="tabular-nums font-semibold">{v.so_lan_dung}</span>
              ),
            },
          ]}
          data={(data?.mayUsage || []).map((r) => ({ ...r, id: r.thiet_bi_id }))}
          loading={loading}
          enableMultiSelect={false}
        />
      </div>
    </div>
  );
}

function StaffPanel({ data, loading }: { data: CssdAnalyticsBundle | null; loading: boolean }) {
  const rows = useMemo(() => {
    const list = data?.staffScans || [];
    const byPerson = new Map<
      string,
      { id: string; nguoi_id: string; ho_ten: string; ma_nv: string; tong: number; byStation: string }
    >();
    for (const s of list) {
      const cur = byPerson.get(s.nguoi_id) || {
        id: s.nguoi_id,
        nguoi_id: s.nguoi_id,
        ho_ten: s.ho_ten,
        ma_nv: s.ma_nv,
        tong: 0,
        byStation: "",
      };
      cur.tong += s.so_quet;
      const part = `${stationLabel(s.station)}: ${s.so_quet}`;
      cur.byStation = cur.byStation ? `${cur.byStation} · ${part}` : part;
      byPerson.set(s.nguoi_id, cur);
    }
    return Array.from(byPerson.values()).sort((a, b) => b.tong - a.tong);
  }, [data]);

  return (
    <div className={"space-y-3"}>
      <p className="text-xs text-slate-500">
        Năng suất KTV CSSD = số lần quét gắn người theo từng trạm trong kỳ. Tách khỏi bảng cơ hội/phiên giám sát
        VST–GSC trên Trung tâm điều hành.
      </p>
      <div className="space-y-2">
        <h3 className={"mb-2 text-[11px] font-medium text-slate-500"}>Quét theo nhân viên</h3>
        <AdvancedDataTable
          columns={[
            {
              header: "Nhân viên",
              accessorKey: "ho_ten",
              cell: (v: any) => (
                <div>
                  <p className="font-semibold text-slate-700">{v.ho_ten}</p>
                  <p className="text-xs text-slate-400">{v.ma_nv}</p>
                </div>
              ),
            },
            {
              header: "Tổng quét",
              accessorKey: "tong",
              cell: (v: any) => <span className="tabular-nums font-semibold">{v.tong}</span>,
            },
            {
              header: "Theo trạm",
              accessorKey: "byStation",
              cell: (v: any) => (
                <span className="text-[11px] text-slate-600">{v.byStation || "—"}</span>
              ),
            },
          ]}
          data={rows}
          loading={loading}
          enableMultiSelect={false}
        />
      </div>
    </div>
  );
}

export default function ReportAnalyticsPanels({ data, loading, panel }: Props) {
  if (panel === "VOLUME") return <VolumePanel data={data} loading={loading} />;
  if (panel === "SETS") return <SetsPanel data={data} loading={loading} />;
  if (panel === "EQUIPMENT") return <EquipmentPanel data={data} loading={loading} />;
  return <StaffPanel data={data} loading={loading} />;
}
