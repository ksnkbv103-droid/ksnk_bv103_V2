import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
import { Users, Eye, ClipboardList, ArrowDown, ArrowUp } from "lucide-react";
import type { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import type {
  DashboardKhoaOverviewRow,
  DashboardKsnkStaffSupervisionRow,
} from "@/modules/dashboard/compliance-dashboard.types";

type SupervisionSourceStatsProps = {
  sources: { ten: string; so_phien: number }[];
  /** `tableOnly`: chỉ bảng theo khoa (tab Tự giám sát); `full`: KPI + pie + bảng (tab Cơ cấu nguồn). */
  variant?: "full" | "tableOnly";
  /** Theo khoa — Tự giám sát: cơ hội VST, phiên VST, phiên GSC (RPC + mapper tương thích bản RPC cũ). */
  khoaOverviewRows: DashboardKhoaOverviewRow[];
  ksnkStaffSupervision: DashboardKsnkStaffSupervisionRow[];
  showKsnkStaffWorkload: boolean;
  khoaOptions: MultiSelectOption[];
  selectedKhoaIds: string[];
  selectedKhoiIds: string[];
  khoiOptions: MultiSelectOption[];
};

const PIE_COLORS = ["#026f17", "#0ea5e9", "#f59e0b"] as const;
const PIE_COLOR_FALLBACK = "#94a3b8";

function normKhoaId(id: string) {
  return String(id || "").trim().toLowerCase();
}

type KhoaTuGsSortKey = "tu_gs_vst_co_hoi" | "tu_gs_vst_phien" | "tu_gs_gsc_phien" | "ten";

function compareTuGsRows(
  a: { ten: string; tu_gs_vst_co_hoi: number; tu_gs_vst_phien: number; tu_gs_gsc_phien: number },
  b: { ten: string; tu_gs_vst_co_hoi: number; tu_gs_vst_phien: number; tu_gs_gsc_phien: number },
  key: KhoaTuGsSortKey,
  desc: boolean,
) {
  if (key === "ten") {
    const c = a.ten.localeCompare(b.ten, "vi");
    return desc ? -c : c;
  }
  const va = a[key];
  const vb = b[key];
  if (va !== vb) return desc ? vb - va : va - vb;
  return a.ten.localeCompare(b.ten, "vi");
}

export const SupervisionSourceStats: React.FC<SupervisionSourceStatsProps> = ({
  sources,
  variant = "full",
  khoaOverviewRows,
  ksnkStaffSupervision,
  showKsnkStaffWorkload,
  khoaOptions,
  selectedKhoaIds,
  selectedKhoiIds,
  khoiOptions,
}) => {
  const [tuGsSortKey, setTuGsSortKey] = useState<KhoaTuGsSortKey>("tu_gs_vst_co_hoi");
  const [tuGsSortDesc, setTuGsSortDesc] = useState(true);

  const total = sources.reduce((acc, curr) => acc + curr.so_phien, 0);

  const pieData = sources.map((s, i) => ({
    name: s.ten,
    value: s.so_phien,
    color: PIE_COLORS[i] ?? PIE_COLOR_FALLBACK,
  }));

  const khoaScope = useMemo(() => {
    const byKhoi =
      !selectedKhoiIds?.length || selectedKhoiIds.length >= khoiOptions.length
        ? khoaOptions
        : khoaOptions.filter((k) => k.khoi_id && selectedKhoiIds.includes(k.khoi_id));
    const n = byKhoi.length;
    if (n === 0) return [];
    if (selectedKhoaIds.length === 0 || selectedKhoaIds.length >= n) return byKhoi;
    const set = new Set(selectedKhoaIds);
    return byKhoi.filter((k) => set.has(k.id));
  }, [khoaOptions, selectedKhoaIds, selectedKhoiIds, khoiOptions.length]);

  const khoaTuGsRows = useMemo(() => {
    const fromRpc = new Map<
      string,
      { ten: string; tu_gs_vst_co_hoi: number; tu_gs_vst_phien: number; tu_gs_gsc_phien: number }
    >();
    for (const r of khoaOverviewRows) {
      fromRpc.set(normKhoaId(r.khoa_id), {
        ten: String(r.ten_khoa || "").trim() || "—",
        tu_gs_vst_co_hoi: r.tu_gs_vst_co_hoi ?? 0,
        tu_gs_vst_phien: r.tu_gs_vst_phien ?? 0,
        tu_gs_gsc_phien: r.tu_gs_gsc_phien ?? 0,
      });
    }

    const seenCatalog = new Set<string>();
    const fromCatalog = khoaScope.map((k) => {
      const kid = normKhoaId(k.id);
      seenCatalog.add(kid);
      const hit = fromRpc.get(kid);
      return {
        id: k.id,
        ten: String(k.label || "").trim() || hit?.ten || "—",
        tu_gs_vst_co_hoi: hit?.tu_gs_vst_co_hoi ?? 0,
        tu_gs_vst_phien: hit?.tu_gs_vst_phien ?? 0,
        tu_gs_gsc_phien: hit?.tu_gs_gsc_phien ?? 0,
      };
    });

    const extras: typeof fromCatalog = [];
    for (const r of khoaOverviewRows) {
      const kid = normKhoaId(r.khoa_id);
      if (!kid || seenCatalog.has(kid)) continue;
      extras.push({
        id: r.khoa_id,
        ten: String(r.ten_khoa || "—").trim() || "—",
        tu_gs_vst_co_hoi: r.tu_gs_vst_co_hoi ?? 0,
        tu_gs_vst_phien: r.tu_gs_vst_phien ?? 0,
        tu_gs_gsc_phien: r.tu_gs_gsc_phien ?? 0,
      });
    }

    const combined = [...extras, ...fromCatalog];
    return [...combined].sort((a, b) => compareTuGsRows(a, b, tuGsSortKey, tuGsSortDesc));
  }, [khoaScope, khoaOverviewRows, tuGsSortKey, tuGsSortDesc]);

  const toggleTuGsSort = (key: KhoaTuGsSortKey) => {
    if (key === tuGsSortKey) {
      setTuGsSortDesc((d) => !d);
    } else {
      setTuGsSortKey(key);
      setTuGsSortDesc(key === "ten" ? false : true);
    }
  };

  const sortHeader = (key: KhoaTuGsSortKey, label: string, align: "left" | "right") => {
    const active = tuGsSortKey === key;
    const Icon = active && tuGsSortDesc ? ArrowDown : ArrowUp;
    return (
      <th className={`px-2 py-2.5 sm:px-3 ${align === "right" ? "text-right" : "text-left"}`}>
        <button
          type="button"
          onClick={() => toggleTuGsSort(key)}
          className={`inline-flex max-w-full items-center gap-1 font-black uppercase tracking-wider transition-colors ${
            active ? "text-amber-950" : "text-slate-500 hover:text-slate-800"
          } ${align === "right" ? "ml-auto flex-row-reverse" : ""}`}
        >
          <span className="truncate">{label}</span>
          {active ? <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden /> : null}
        </button>
      </th>
    );
  };

  const khoaTuGsTable = (
    <>
      <div className="mb-3 shrink-0">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Khoa/Phòng — Tự giám sát</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto rounded-lg border border-slate-200/90 xl:max-h-[220px]">
        <table className="w-full text-left text-[11px] sm:text-xs">
              <thead className="sticky top-0 z-[1] bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500 sm:text-[10px]">
                <tr>
                  <th className="px-2 py-2.5 font-black sm:px-3">STT</th>
                  {sortHeader("ten", "Khoa/Phòng", "left")}
                  {sortHeader("tu_gs_vst_co_hoi", "Cơ hội VST", "right")}
                  {sortHeader("tu_gs_vst_phien", "Phiên VST", "right")}
                  {sortHeader("tu_gs_gsc_phien", "Phiên GSC (TG)", "right")}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {khoaTuGsRows.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-2 py-2 font-bold text-slate-400 sm:px-3 sm:py-2.5">{i + 1}</td>
                    <td className="max-w-[10rem] truncate px-2 py-2 font-bold text-slate-700 sm:max-w-none sm:px-3 sm:py-2.5">
                      {p.ten}
                    </td>
                    <td className="px-2 py-2 text-right font-black text-amber-950 sm:px-3 sm:py-2.5">
                      {p.tu_gs_vst_co_hoi.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-right font-black text-amber-900 sm:px-3 sm:py-2.5">
                      {p.tu_gs_vst_phien.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-right font-black text-amber-800 sm:px-3 sm:py-2.5">
                      {p.tu_gs_gsc_phien.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {khoaTuGsRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Chưa có khoa trong phạm vi lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
      </div>
    </>
  );

  if (variant === "tableOnly") {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex max-h-[min(320px,70vh)] min-h-0 min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:max-h-[320px]">
          {khoaTuGsTable}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {sources.map((s, i) => (
          <div key={s.ten} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${pieData[i].color}20`, color: pieData[i].color }}
              >
                {s.ten.includes("Chuyên trách") ? (
                  <Eye className="h-6 w-6" />
                ) : s.ten.includes("chéo") ? (
                  <ClipboardList className="h-6 w-6" />
                ) : (
                  <Users className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.ten}</p>
                <p className="text-2xl font-black text-slate-900">{s.so_phien.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-500">Phiên giám sát</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:items-stretch">
        <div className="flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:min-h-[300px] sm:p-6 xl:h-[320px] xl:min-h-[320px] xl:max-h-[320px]">
          <h3 className="mb-4 shrink-0 text-sm font-black uppercase tracking-widest text-slate-900">
            Tỉ lệ cơ cấu nguồn giám sát (Tổng hợp)
          </h3>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-4 md:flex-row md:gap-6">
            <div className="h-[180px] w-full min-w-0 shrink-0 sm:h-[200px] md:h-[220px] md:w-[48%] xl:h-[230px]">
              <Bv103ResponsiveChart className="h-full w-full">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </Bv103ResponsiveChart>
            </div>
            <div className="w-full min-w-0 flex-1 space-y-2 overflow-y-auto md:w-[52%]">
              {pieData.map((s) => (
                <div key={s.name} className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="truncate text-xs font-bold text-slate-600">{s.name}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-black text-slate-900">
                      {((s.value / (total || 1)) * 100).toFixed(1)}%
                    </span>
                    <p className="text-[10px] font-bold text-slate-400">{s.value} phiên</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:min-h-[300px] sm:p-6 xl:h-[320px] xl:min-h-[320px] xl:max-h-[320px]">
          {khoaTuGsTable}
        </div>
      </div>

      {showKsnkStaffWorkload && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
              Nhân viên Khoa KSNK — hoạt động giám sát chuyên trách
            </h3>
          </div>
          <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-200/90">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Họ tên</th>
                  <th className="px-4 py-3">Mã NV</th>
                  <th className="px-4 py-3 text-right">Cơ hội VST</th>
                  <th className="px-4 py-3 text-right">Phiên VST</th>
                  <th className="px-4 py-3 text-right">Phiên GS chung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ksnkStaffSupervision.map((row, i) => {
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{row.ho_ten}</td>
                      <td className="px-4 py-3 text-slate-500">{row.ma_nv}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-800">
                        {row.so_co_hoi_vst.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-700">
                        {row.so_phien_vst.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-sky-800">
                        {row.so_phien_gsc.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {ksnkStaffSupervision.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Chưa có nhân viên KSNK trong danh mục hoặc chưa tải dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
