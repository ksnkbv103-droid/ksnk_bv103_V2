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
  onExport: () => void;
};

export const DashboardFilterPanel: React.FC<DashboardFilterPanelProps> = (p) => {
  const filteredKhoaOptions = React.useMemo(() => {
    if (!p.selectedKhoiIds || p.selectedKhoiIds.length === 0 || p.selectedKhoiIds.length === p.khoiOptions.length) {
      return p.khoaOptions;
    }
    return p.khoaOptions.filter((k) => k.khoi_id && p.selectedKhoiIds.includes(k.khoi_id));
  }, [p.khoaOptions, p.selectedKhoiIds, p.khoiOptions.length]);

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <input 
          type="date" 
          value={p.tuNgay} 
          onChange={(e) => {
            p.setTuNgay(e.target.value);
            // Có thể gọi p.onRefresh() nếu muốn nhảy số ngay
          }} 
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold" 
        />
        <span className="text-slate-400 font-bold text-xs uppercase">đến</span>
        <input 
          type="date" 
          value={p.denNgay} 
          onChange={(e) => {
            p.setDenNgay(e.target.value);
          }} 
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold" 
        />
      </div>
      
      <SearchableMultiSelect label="Khối" options={p.khoiOptions} selected={p.selectedKhoiIds} onChange={p.setSelectedKhoiIds} />
      <SearchableMultiSelect label="Khoa" options={filteredKhoaOptions} selected={p.selectedKhoaIds} onChange={p.setSelectedKhoaIds} />
      <SearchableMultiSelect label="Đối tượng" options={p.ngheOptions} selected={p.selectedNgheIds} onChange={p.setSelectedNgheIds} />
      <SearchableMultiSelect label="Khu vực" options={p.khuVucOptions} selected={p.selectedKhuVucIds} onChange={p.setSelectedKhuVucIds} />
      <SearchableMultiSelect label="Chuyên đề" options={p.bangKiemOptions} selected={p.selectedBangKiemMas} onChange={p.setSelectedBangKiemMas} />

      <div className="flex flex-wrap gap-2 pt-2 xl:pt-0">
        <button type="button" onClick={p.onRefresh} className="h-11 rounded-full bg-[#026f17] px-5 text-[11px] font-black uppercase tracking-widest text-white">Cập nhật</button>
        <button type="button" onClick={p.onOpenComment} className="h-11 rounded-full border border-slate-300 bg-white px-5 text-[11px] font-black uppercase tracking-widest text-slate-700">Ghi chú</button>
        <button type="button" onClick={p.onOpenRecommendation} className="h-11 rounded-full border border-slate-300 bg-white px-5 text-[11px] font-black uppercase tracking-widest text-slate-700">Kiến nghị</button>
        <button type="button" onClick={p.onExport} className="h-11 rounded-full border border-[#026f17]/30 bg-white px-5 text-[11px] font-black uppercase tracking-widest text-[#026f17]">In báo cáo</button>
      </div>
    </div>
  );
};
