export type { VstStrategicKpis, VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
export type { GscStrategicKpis, GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";

export type StrategicDashboardFilters = {
  tu_ngay: string;
  den_ngay: string;
  khoi_ids?: string[];
  khoa_ids?: string[];
  nghe_nghiep_ids?: string[];
  khu_vuc_ids?: string[];
  hinh_thuc_ids?: string[];
  bang_kiem_mas?: string[];
};
