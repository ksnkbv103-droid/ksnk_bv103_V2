import type { Station } from "@/modules/cssd-erp/types/cssd.types";

export type SuCoStaffSelectOption = {
  id: string;
  label: string;
  keywords?: string[];
  groupLabel?: string;
};

export type SuCoCyclePerformerOption = {
  station: Station;
  stationLabel: string;
  operatorId: string;
  operatorName: string;
  stationTime: string | null;
};

export type SuCoNhanSuRow = { id: string; ho_ten: string; ma_nv: string };

/** Gộp người trên chu kỳ + danh mục MDM cho dropdown form sự cố. */
export function buildSuCoStaffOptions(args: {
  cyclePerformers: SuCoCyclePerformerOption[];
  nhanSu: SuCoNhanSuRow[];
  preferCycleForRelated: boolean;
}): { detectorOptions: SuCoStaffSelectOption[]; relatedOptions: SuCoStaffSelectOption[] } {
  const mdmOptions: SuCoStaffSelectOption[] = args.nhanSu.map((n) => ({
    id: n.id,
    label: n.ma_nv ? `${n.ho_ten} (${n.ma_nv})` : n.ho_ten,
    keywords: [n.ho_ten, n.ma_nv],
    groupLabel: "Danh mục nhân sự",
  }));

  const cycleOptions: SuCoStaffSelectOption[] = args.cyclePerformers.map((p) => ({
    id: p.operatorId,
    label: `${p.operatorName} — ${p.stationLabel}`,
    keywords: [p.operatorName, p.stationLabel, p.station],
    groupLabel: "Trên chu kỳ này",
  }));

  const relatedOptions = args.preferCycleForRelated
    ? [
        ...cycleOptions,
        ...mdmOptions.filter((o) => !cycleOptions.some((c) => c.id === o.id)),
      ]
    : mdmOptions;

  return { detectorOptions: mdmOptions, relatedOptions };
}
