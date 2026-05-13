import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
import { Users, Eye, ClipboardList } from "lucide-react";
import type { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import type { DashboardKsnkStaffSupervisionRow } from "@/modules/dashboard/compliance-dashboard.types";

type SupervisionSourceStatsProps = {
  sources: { ten: string; so_phien: number }[];
  /** Phiên tự giám sát theo khoa (đã lọc nguồn TGS), gộp VST + giám sát chung. */
  participationTuGiamSat: { id: string; ten: string; so_phien: number }[];
  /** Nhân viên KSNK: cơ hội VST + phiên VST + phiên GSC (chuyên trách), theo bộ lọc ngày/khoa. */
  ksnkStaffSupervision: DashboardKsnkStaffSupervisionRow[];
  /** Chỉ true với nhân sự KSNK / mạng lưới / quản trị — ẩn hoàn toàn với khoa khác. */
  showKsnkStaffWorkload: boolean;
  khoaOptions: MultiSelectOption[];
  selectedKhoaIds: string[];
  selectedKhoiIds: string[];
  khoiOptions: MultiSelectOption[];
};

/** Bảng màu 3 nguồn giám sát (Chuyên trách / Tự / Chéo); fallback xám khi vượt. */
const PIE_COLORS = ["#026f17", "#0ea5e9", "#f59e0b"] as const;
const PIE_COLOR_FALLBACK = "#94a3b8";

export const SupervisionSourceStats: React.FC<SupervisionSourceStatsProps> = ({
  sources,
  participationTuGiamSat,
  ksnkStaffSupervision,
  showKsnkStaffWorkload,
  khoaOptions,
  selectedKhoaIds,
  selectedKhoiIds,
  khoiOptions,
}) => {
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

  const participationMap = useMemo(
    () => new Map(participationTuGiamSat.map((p) => [p.id, p] as const)),
    [participationTuGiamSat]
  );

  const khoaTuGiamRows = useMemo(() => {
    const rows = khoaScope.map((k) => {
      const hit = participationMap.get(k.id);
      return {
        id: k.id,
        ten: k.label || hit?.ten || "—",
        so_phien: hit?.so_phien ?? 0,
      };
    });
    return [...rows].sort((a, b) => a.so_phien - b.so_phien);
  }, [khoaScope, participationMap]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {sources.map((s, i) => (
          <div key={s.ten} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="mb-8 text-sm font-black uppercase tracking-widest text-slate-900">Tỉ lệ cơ cấu nguồn giám sát (Tổng hợp)</h3>
          <div className="flex min-w-0 flex-col items-center gap-8 md:flex-row">
            <div className="h-[240px] w-full min-w-0 shrink-0 md:w-1/2">
              <Bv103ResponsiveChart className="h-full w-full">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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
            <div className="w-full space-y-4 md:w-1/2">
              {pieData.map((s) => (
                <div key={s.name} className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-bold text-slate-600">{s.name}</span>
                  </div>
                  <div className="text-right">
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

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
              Khoa/Phòng trong phạm vi lọc — phiên tự giám sát
            </h3>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-slate-400 italic">
              Liệt kê theo khoa đã chọn (hoặc toàn bộ trong khối đã chọn); sắp xếp số phiên từ thấp đến cao
            </p>
          </div>

          <div className="max-h-[320px] overflow-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Khoa/Phòng</th>
                  <th className="px-4 py-3 text-right">Phiên tự GS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {khoaTuGiamRows.map((p, i) => (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{p.ten}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center justify-center rounded px-2 py-1 font-black ${
                          p.so_phien === 0 ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-900"
                        }`}
                      >
                        {p.so_phien}
                      </span>
                    </td>
                  </tr>
                ))}
                {khoaTuGiamRows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Chưa có khoa trong phạm vi lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showKsnkStaffWorkload && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
              Nhân viên Khoa KSNK — hoạt động giám sát chuyên trách
            </h3>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-slate-400 italic">
              Cơ hội vệ sinh tay (dòng VST) và phiên VST/GS chung do nhân sự KSNK làm người giám sát — gồm mọi phân loại nguồn (chuyên trách, tự giám sát, chéo). Danh sách: khoa KSNK trong MDM hoặc trường vai trò KSNK; cùng bộ lọc ngày/khoa phía trên.
            </p>
          </div>
          <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-100">
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
                      <td className="px-4 py-3 text-right font-black text-emerald-800">{row.so_co_hoi_vst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-700">{row.so_phien_vst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-black text-sky-800">{row.so_phien_gsc.toLocaleString()}</td>
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
