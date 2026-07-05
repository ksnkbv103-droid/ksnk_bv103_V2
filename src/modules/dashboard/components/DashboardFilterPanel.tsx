import React from "react";
import { ChevronDown, ChevronUp, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import SearchableMultiSelect, { type MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { dashboardChrome as UI } from "@/modules/dashboard/lib/dashboard-chrome";
import { useMinWidth } from "@/hooks/use-min-width";

type DashboardFilterPanelProps = {
  hideBangKiem?: boolean;
  variant?: "full" | "brief" | "compact";
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
  khoaFilterLocked?: boolean;
};

function isPartialSelection(selected: string[], options: MultiSelectOption[]) {
  if (options.length === 0) return false;
  return selected.length > 0 && selected.length < options.length;
}

function fmtShortDate(iso: string) {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function summarizeKhoa(
  selected: string[],
  options: MultiSelectOption[],
  locked?: boolean,
): string {
  if (locked) return "Khóa khoa";
  if (!options.length || !selected.length || selected.length === options.length) return "Tất cả khoa";
  if (selected.length === 1) {
    const one = options.find((o) => o.id === selected[0]);
    const label = one?.label?.trim();
    if (label && label.length <= 18) return label;
    return "1 khoa";
  }
  return `${selected.length} khoa`;
}

const ctl =
  "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800";
const btn =
  "inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 touch-manipulation";

export const DashboardFilterPanel: React.FC<DashboardFilterPanelProps> = (p) => {
  const isDesktop = useMinWidth(640, false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isBrief = p.variant === "brief";
  const isCompact = p.variant === "compact" || isBrief;
  const hideBangKiem = isBrief || p.hideBangKiem;

  const filteredKhoaOptions = React.useMemo(() => {
    if (!p.selectedKhoiIds || p.selectedKhoiIds.length === 0 || p.selectedKhoiIds.length === p.khoiOptions.length) {
      return p.khoaOptions;
    }
    return p.khoaOptions.filter((k) => k.khoi_id && p.selectedKhoiIds.includes(k.khoi_id));
  }, [p.khoaOptions, p.selectedKhoiIds, p.khoiOptions.length]);

  const advancedActive =
    isPartialSelection(p.selectedKhoiIds, p.khoiOptions) ||
    isPartialSelection(p.selectedNgheIds, p.ngheOptions) ||
    isPartialSelection(p.selectedKhuVucIds, p.khuVucOptions) ||
    (p.selectedHinhThucIds && p.selectedHinhThucIds.length > 0) ||
    (!hideBangKiem && isPartialSelection(p.selectedBangKiemMas ?? [], p.bangKiemOptions ?? []));

  const hinhThucOptions = [
    { id: "KSNK", label: "Chuyên trách (KSNK)" },
    { id: "TU_GIAM_SAT", label: "Tự giám sát" },
    { id: "CHEO", label: "Giám sát chéo" },
  ];

  const selectSize = "compact" as const;
  const selectMin = "min-w-0 w-full";

  const khoaChip = summarizeKhoa(p.selectedKhoaIds, filteredKhoaOptions, p.khoaFilterLocked);
  const periodChip = `${fmtShortDate(p.tuNgay)} – ${fmtShortDate(p.denNgay)}`;

  React.useEffect(() => {
    if (isDesktop || !mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isDesktop, mobileOpen]);

  const filterBody = (
    <>
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-7 shrink-0 text-xs font-medium text-slate-500">Kỳ</span>
          <input
            type="date"
            value={p.tuNgay}
            onChange={(e) => p.setTuNgay(e.target.value)}
            aria-label="Từ ngày"
            className={`${ctl} min-w-[9.5rem]`}
          />
          <span className="text-xs text-slate-300">–</span>
          <input
            type="date"
            value={p.denNgay}
            onChange={(e) => p.setDenNgay(e.target.value)}
            aria-label="Đến ngày"
            className={`${ctl} min-w-[9.5rem]`}
          />
        </div>

        <div className="min-w-0 sm:max-w-xs">
          <SearchableMultiSelect
            size={selectSize}
            label={p.khoaFilterLocked ? "Khoa (khóa)" : "Khoa"}
            options={filteredKhoaOptions}
            selected={p.selectedKhoaIds}
            onChange={p.setSelectedKhoaIds}
            minWidthClassName={selectMin}
            disabled={p.khoaFilterLocked}
          />
        </div>

        <div className="flex items-center justify-start gap-1.5 sm:justify-end">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={btn}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
            Bộ lọc
            {advancedActive ? (
              <span className="rounded bg-emerald-100 px-1 py-0.5 text-[11px] font-bold text-emerald-800">•</span>
            ) : null}
          </button>
          {p.onRefresh ? (
            <button
              type="button"
              onClick={() => p.onRefresh?.()}
              disabled={p.refreshLoading}
              aria-label="Tải lại"
              className={btn}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${p.refreshLoading ? "animate-spin" : ""}`} aria-hidden />
              <span className="hidden sm:inline">Tải lại</span>
            </button>
          ) : null}
        </div>
      </div>

      {!isCompact && !hideBangKiem && p.bangKiemOptions && p.setSelectedBangKiemMas ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <SearchableMultiSelect
            size={selectSize}
            label="Chuyên đề"
            options={p.bangKiemOptions}
            selected={p.selectedBangKiemMas ?? []}
            onChange={p.setSelectedBangKiemMas}
            minWidthClassName={selectMin}
          />
          {p.setSelectedHinhThucIds ? (
            <SearchableMultiSelect
              size={selectSize}
              label="Hình thức"
              options={hinhThucOptions}
              selected={p.selectedHinhThucIds || []}
              onChange={p.setSelectedHinhThucIds}
              minWidthClassName={selectMin}
            />
          ) : null}
        </div>
      ) : null}

      {showAdvanced ? (
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {!hideBangKiem && isCompact && p.bangKiemOptions && p.setSelectedBangKiemMas ? (
            <SearchableMultiSelect
              size={selectSize}
              label="Chuyên đề"
              options={p.bangKiemOptions}
              selected={p.selectedBangKiemMas ?? []}
              onChange={p.setSelectedBangKiemMas}
              minWidthClassName={selectMin}
            />
          ) : null}
          {p.setSelectedHinhThucIds && isCompact ? (
            <SearchableMultiSelect
              size={selectSize}
              label="Hình thức"
              options={hinhThucOptions}
              selected={p.selectedHinhThucIds || []}
              onChange={p.setSelectedHinhThucIds}
              minWidthClassName={selectMin}
            />
          ) : null}
          <SearchableMultiSelect
            size={selectSize}
            label="Khối"
            options={p.khoiOptions}
            selected={p.selectedKhoiIds}
            onChange={p.setSelectedKhoiIds}
            minWidthClassName={selectMin}
            disabled={p.khoaFilterLocked}
          />
          <SearchableMultiSelect
            size={selectSize}
            label="Đối tượng"
            options={p.ngheOptions}
            selected={p.selectedNgheIds}
            onChange={p.setSelectedNgheIds}
            minWidthClassName={selectMin}
          />
          <SearchableMultiSelect
            size={selectSize}
            label="Khu vực"
            options={p.khuVucOptions}
            selected={p.selectedKhuVucIds}
            onChange={p.setSelectedKhuVucIds}
            minWidthClassName={selectMin}
          />
        </div>
      ) : null}
    </>
  );

  if (!isDesktop && !mobileOpen) {
    return (
      <div className={`${UI.sectionGap} space-y-2`}>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/90 p-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex min-h-9 min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left touch-manipulation hover:bg-white/80"
          >
            <span className="text-xs font-semibold text-slate-800">{periodChip}</span>
            <span className="truncate text-[11px] font-medium text-slate-500">{khoaChip}</span>
          </button>
          <button type="button" onClick={() => setMobileOpen(true)} className={btn} aria-label="Mở bộ lọc">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Lọc
            {advancedActive ? (
              <span className="rounded bg-emerald-100 px-1 py-0.5 text-[11px] font-bold text-emerald-800">•</span>
            ) : null}
          </button>
          {p.onRefresh ? (
            <button
              type="button"
              onClick={() => p.onRefresh?.()}
              disabled={p.refreshLoading}
              aria-label="Tải lại"
              className={btn}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${p.refreshLoading ? "animate-spin" : ""}`} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!isDesktop && mobileOpen) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-slate-900/40 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] touch-manipulation">
        <div className="flex max-h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Bộ lọc thống kê</p>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Đóng bộ lọc"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto p-3 custom-scrollbar">{filterBody}</div>
          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-semibold text-white"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <div className={`${UI.sectionGap} space-y-2`}>{filterBody}</div>;
};
