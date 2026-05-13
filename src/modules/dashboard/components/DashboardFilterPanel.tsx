import React from "react";
import SearchableMultiSelect, { type MultiSelectOption } from "@/components/shared/SearchableMultiSelect";

type DashboardFilterPanelProps = {
  bangKiemOptions: MultiSelectOption[];
  selectedBangKiemMas: string[];
  setSelectedBangKiemMas: (v: string[]) => void;
  khoiOptions: MultiSelectOption[];
  selectedKhoiIds: string[];
  setSelectedKhoiIds: (v: string[]) => void;
  khoaOptions: MultiSelectOption[];
  selectedKhoaIds: string[];
  setSelectedKhoaIds: (v: string[]) => void;
  ngheOptions: MultiSelectOption[];
  selectedNgheIds: string[];
  setSelectedNgheIds: (v: string[]) => void;
  khuVucOptions: MultiSelectOption[];
  selectedKhuVucIds: string[];
  setSelectedKhuVucIds: (v: string[]) => void;
  tuNgay: string;
  setTuNgay: (v: string) => void;
  denNgay: string;
  setDenNgay: (v: string) => void;
  onRefresh: () => void;
  onOpenComment: () => void;
  onOpenRecommendation: () => void;
  /** Không truyền = ẩn nút in (RBAC widget export). */
  onExport?: () => void;
};

export const DashboardFilterPanel: React.FC<DashboardFilterPanelProps> = (p) => {
  const filteredKhoaOptions = React.useMemo(() => {
    if (!p.selectedKhoiIds || p.selectedKhoiIds.length === 0 || p.selectedKhoiIds.length === p.khoiOptions.length) {
      return p.khoaOptions;
    }
    return p.khoaOptions.filter((k) => k.khoi_id && p.selectedKhoiIds.includes(k.khoi_id));
  }, [p.khoaOptions, p.selectedKhoiIds, p.khoiOptions.length]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <input
            type="date"
            value={p.tuNgay}
            onChange={(e) => {
              p.setTuNgay(e.target.value);
            }}
            className="h-9 min-w-[9.5rem] flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold sm:h-10 sm:flex-none sm:min-w-[10.5rem]"
          />
          <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">đến</span>
          <input
            type="date"
            value={p.denNgay}
            onChange={(e) => {
              p.setDenNgay(e.target.value);
            }}
            className="h-9 min-w-[9.5rem] flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold sm:h-10 sm:flex-none sm:min-w-[10.5rem]"
          />
        </div>

        <SearchableMultiSelect
          label="Khối"
          options={p.khoiOptions}
          selected={p.selectedKhoiIds}
          onChange={p.setSelectedKhoiIds}
          minWidthClassName="min-w-0 w-full"
        />
        <SearchableMultiSelect
          label="Khoa"
          options={filteredKhoaOptions}
          selected={p.selectedKhoaIds}
          onChange={p.setSelectedKhoaIds}
          minWidthClassName="min-w-0 w-full"
        />
        <SearchableMultiSelect
          label="Đối tượng"
          options={p.ngheOptions}
          selected={p.selectedNgheIds}
          onChange={p.setSelectedNgheIds}
          minWidthClassName="min-w-0 w-full"
        />
        <SearchableMultiSelect
          label="Khu vực"
          options={p.khuVucOptions}
          selected={p.selectedKhuVucIds}
          onChange={p.setSelectedKhuVucIds}
          minWidthClassName="min-w-0 w-full"
        />
        <SearchableMultiSelect
          label="Chuyên đề"
          options={p.bangKiemOptions}
          selected={p.selectedBangKiemMas}
          onChange={p.setSelectedBangKiemMas}
          minWidthClassName="min-w-0 w-full"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
        <button
          type="button"
          onClick={p.onRefresh}
          className="h-9 rounded-md bg-[#026f17] px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#015a12]"
        >
          Cập nhật
        </button>
        <button
          type="button"
          onClick={p.onOpenComment}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          Nhận xét
        </button>
        <button
          type="button"
          onClick={p.onOpenRecommendation}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          Kiến nghị
        </button>
        {p.onExport ? (
          <button
            type="button"
            onClick={p.onExport}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-[#026f17] shadow-sm transition-colors hover:bg-slate-50"
          >
            In báo cáo
          </button>
        ) : null}
      </div>
    </div>
  );
};
