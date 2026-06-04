import React from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import SearchableMultiSelect, { type MultiSelectOption } from "@/components/shared/SearchableMultiSelect";

type DashboardFilterPanelProps = {
  /** VST analytics: không lọc theo bảng kiểm (GSC-only). */
  hideBangKiem?: boolean;
  bangKiemOptions?: MultiSelectOption[];
  selectedBangKiemMas?: string[];
  setSelectedBangKiemMas?: (v: string[]) => void;
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
  selectedHinhThucIds?: string[];
  setSelectedHinhThucIds?: (v: string[]) => void;
  tuNgay: string;
  setTuNgay: (v: string) => void;
  denNgay: string;
  setDenNgay: (v: string) => void;
  onRefresh?: () => void;
  refreshLoading?: boolean;
};

function isPartialSelection(selected: string[], options: MultiSelectOption[]) {
  if (options.length === 0) return false;
  return selected.length > 0 && selected.length < options.length;
}

export const DashboardFilterPanel: React.FC<DashboardFilterPanelProps> = (p) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const filteredKhoaOptions = React.useMemo(() => {
    if (!p.selectedKhoiIds || p.selectedKhoiIds.length === 0 || p.selectedKhoiIds.length === p.khoiOptions.length) {
      return p.khoaOptions;
    }
    return p.khoaOptions.filter((k) => k.khoi_id && p.selectedKhoiIds.includes(k.khoi_id));
  }, [p.khoaOptions, p.selectedKhoiIds, p.khoiOptions.length]);

  const advancedActive =
    isPartialSelection(p.selectedKhoiIds, p.khoiOptions) ||
    isPartialSelection(p.selectedKhoaIds, filteredKhoaOptions) ||
    isPartialSelection(p.selectedNgheIds, p.ngheOptions) ||
    isPartialSelection(p.selectedKhuVucIds, p.khuVucOptions) ||
    (p.selectedHinhThucIds && p.selectedHinhThucIds.length > 0);

  const hinhThucOptions = [
    { id: "KSNK", label: "Chuyên trách (KSNK)" },
    { id: "TU_GIAM_SAT", label: "Tự giám sát" },
    { id: "CHEO", label: "Giám sát chéo" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`grid grid-cols-1 gap-2 items-end sm:grid-cols-2 ${p.hideBangKiem ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}
      >
        <div className={`flex flex-wrap items-center gap-2 ${p.hideBangKiem ? "sm:col-span-2" : "sm:col-span-2"}`}>
          <input
            type="date"
            value={p.tuNgay}
            onChange={(e) => {
              p.setTuNgay(e.target.value);
            }}
            aria-label="Từ ngày"
            className="h-9 min-w-[9.5rem] flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold sm:h-10 sm:flex-none sm:min-w-[10.5rem]"
          />
          <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">đến</span>
          <input
            type="date"
            value={p.denNgay}
            onChange={(e) => {
              p.setDenNgay(e.target.value);
            }}
            aria-label="Đến ngày"
            className="h-9 min-w-[9.5rem] flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold sm:h-10 sm:flex-none sm:min-w-[10.5rem]"
          />
        </div>

        {!p.hideBangKiem && p.bangKiemOptions && p.setSelectedBangKiemMas ? (
          <SearchableMultiSelect
            label="Chuyên đề"
            options={p.bangKiemOptions}
            selected={p.selectedBangKiemMas ?? []}
            onChange={p.setSelectedBangKiemMas}
            minWidthClassName="min-w-0 w-full"
          />
        ) : null}

        {p.setSelectedHinhThucIds && (
          <SearchableMultiSelect
            label="Hình thức"
            options={hinhThucOptions}
            selected={p.selectedHinhThucIds || []}
            onChange={p.setSelectedHinhThucIds}
            minWidthClassName="min-w-0 w-full"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
          Lọc nâng cao
          {advancedActive ? (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">Đang lọc</span>
          ) : null}
        </button>
        {p.onRefresh ? (
          <button
            type="button"
            onClick={() => p.onRefresh?.()}
            disabled={p.refreshLoading}
            aria-label="Tải lại thống kê"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${p.refreshLoading ? "animate-spin" : ""}`} aria-hidden />
            Tải lại
          </button>
        ) : null}
        <p className="text-[11px] text-slate-500">
          Khối, khoa, đối tượng, khu vực — tự cập nhật khi đổi lọc hoặc bấm Tải lại.
        </p>
      </div>

      {showAdvanced ? (
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200/90 bg-slate-50/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      ) : null}
    </div>
  );
};
