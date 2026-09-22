import { buildGscAnalyticsDeepLink } from "@/lib/analytics/supervision-deep-link";
import { PCT_SURFACE_LABEL } from "@/lib/analytics/supervision-source-labels";
import { buildVeSinhTayHub, PCT_EMPTY } from "@/lib/domain/bao-cao-pct";
import { pickVeSinhTayChecklistRates, VE_SINH_TAY_WHO } from "@/lib/domain/ve-sinh-tay-catalog";
import type { BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";
import { buildAnalyticsDeepLink } from "./bao-cao-tong-hop-core";

export type BcthReportSectionId =
  | "bc-kpi"
  | "bc-vst"
  | "bc-gsc"
  | "bc-gsc-bk"
  | "bc-trend"
  | "bc-thoi-diem"
  | "bc-nkbv"
  | "bc-cssd"
  | "bc-chuyen-de"
  | "bc-phan-iii";

/** Mục chính — 3 KPI vệ sinh tay ở `#bc-vst`, pool GSC ở `#bc-gsc`. */
export const BCTH_PRIMARY_SECTIONS: { id: BcthReportSectionId; label: string; mobileLabel?: string }[] = [
  { id: "bc-kpi", label: "Tổng quan" },
  { id: "bc-vst", label: "Vệ sinh tay" },
  { id: "bc-gsc", label: "Giám sát chung" },
  { id: "bc-phan-iii", label: "Phần III", mobileLabel: "P.III" },
];

/** Mục phụ — không phải nơi duy nhất của 3 KPI VST. */
export const BCTH_MORE_SECTIONS: { id: BcthReportSectionId; label: string }[] = [
  { id: "bc-trend", label: "Xu hướng" },
  { id: "bc-nkbv", label: "NKBV" },
  { id: "bc-gsc-bk", label: "Bảng kiểm cần can thiệp" },
  { id: "bc-thoi-diem", label: "Thời điểm" },
  { id: "bc-chuyen-de", label: "Chuyên đề" },
  { id: "bc-cssd", label: "Phụ lục CSSD" },
];

export const BCTH_VST_KPI_SURFACE = "bc-vst" as const satisfies BcthReportSectionId;
export const BCTH_GSC_POOL_SURFACE = "bc-gsc" as const satisfies BcthReportSectionId;

export const BCTH_VST_KPI_FIELDS = ["ty_le_vst", "ty_le_vst_ky_thuat", "ty_le_vst_ngoai_khoa"] as const;

export type BcthVstKpiId = "who" | "bm02" | "bm03";

export type BcthVstKpiSlot = {
  id: BcthVstKpiId;
  field: (typeof BCTH_VST_KPI_FIELDS)[number];
  label: string;
  code: string;
  display: string;
  rate: number | null;
  volume: string | null;
  note: string | null;
  href: string;
};

type Deep = { tu_ngay: string; den_ngay: string; khoa_ids?: string[] } | null;

const BARE_HREF: Record<BcthVstKpiId, string> = {
  who: "/thong-ke/vst",
  bm02: "/thong-ke/gsc?bk=BM.07.02",
  bm03: "/thong-ke/gsc?bk=BM.07.03",
};

export function bcthVstStatsHref(id: BcthVstKpiId, deep: Deep): string {
  if (!deep?.tu_ngay || !deep.den_ngay) return BARE_HREF[id];
  if (id === "who") return buildAnalyticsDeepLink("/thong-ke/vst", deep);
  return buildGscAnalyticsDeepLink(deep, id === "bm02" ? "BM.07.02" : "BM.07.03");
}

function deepFromPayload(payload: BaoCaoTongHopPayload | null): Deep {
  const f = payload?.filters;
  if (!f?.tu_ngay || !f.den_ngay) return null;
  return { tu_ngay: f.tu_ngay, den_ngay: f.den_ngay, khoa_ids: f.khoa_ids };
}

function bm02Note(nApDung: number, duMau: boolean): string {
  const distinguish = `Khác ${PCT_SURFACE_LABEL.whoPhuDungKyThuat}`;
  if (nApDung > 0 && !duMau) return `Dưới ngưỡng diễn giải (áp dụng < 30). ${distinguish}`;
  return distinguish;
}

/** Ba KPI mặt trước / khối VST. Không có ty_le_bk và không có % gộp. */
export function buildBcthVstKpiSlots(
  payload: BaoCaoTongHopPayload | null,
  deep?: Deep,
): BcthVstKpiSlot[] {
  const vstK = payload?.vst?.kpis;
  const checklistRows = payload?.gsc?.checklist_overview ?? payload?.gsc?.dynamic_checklists ?? [];
  const bkRates = pickVeSinhTayChecklistRates(checklistRows);
  const kt = bkRates.find((r) => r.slot === "BM02_KY_THUAT_TQ");
  const nk = bkRates.find((r) => r.slot === "BM03_NGOAI_KHOA");
  const hub = buildVeSinhTayHub({
    so_tuan_thu: vstK?.da_tuan_thu ?? 0,
    tong_co_hoi: vstK?.tong_co_hoi ?? 0,
    ky_thuat: kt?.found ? { n_dat: kt.n_dat, n_kd: kt.n_kd } : null,
    ngoai_khoa: nk?.found ? { n_dat: nk.n_dat, n_kd: nk.n_kd } : null,
  });
  const seed = deep === undefined ? deepFromPayload(payload) : deep;

  return [
    {
      id: "who",
      field: "ty_le_vst",
      label: VE_SINH_TAY_WHO.label,
      code: PCT_SURFACE_LABEL.whoTyLeVst,
      display: payload?.capabilities.topic_vst && vstK ? hub.who.display : PCT_EMPTY,
      rate: hub.who.ty_le_vst,
      volume: vstK ? `${hub.who.so_tuan_thu}/${hub.who.tong_co_hoi} cơ hội` : null,
      note: hub.who.tong_co_hoi > 0 && !hub.who.du_mau ? "Dưới ngưỡng diễn giải (cơ hội < 20)" : null,
      href: bcthVstStatsHref("who", seed),
    },
    {
      id: "bm02",
      field: "ty_le_vst_ky_thuat",
      label: kt?.label ?? "Kỹ thuật VST thường quy",
      code: PCT_SURFACE_LABEL.bm02KyThuat,
      display: payload?.capabilities.topic_gsc ? hub.ky_thuat.display : PCT_EMPTY,
      rate: hub.ky_thuat.ty_le_vst_ky_thuat,
      volume: kt?.found ? `${hub.ky_thuat.n_dat}/${hub.ky_thuat.n_ap_dung} áp dụng` : "Chưa có phiên trong kỳ",
      note: bm02Note(hub.ky_thuat.n_ap_dung, hub.ky_thuat.du_mau),
      href: bcthVstStatsHref("bm02", seed),
    },
    {
      id: "bm03",
      field: "ty_le_vst_ngoai_khoa",
      label: nk?.label ?? "VST ngoại khoa",
      code: PCT_SURFACE_LABEL.bm03NgoaiKhoa,
      display: payload?.capabilities.topic_gsc ? hub.ngoai_khoa.display : PCT_EMPTY,
      rate: hub.ngoai_khoa.ty_le_vst_ngoai_khoa,
      volume: nk?.found ? `${hub.ngoai_khoa.n_dat}/${hub.ngoai_khoa.n_ap_dung} áp dụng` : "Chưa có phiên trong kỳ",
      note: hub.ngoai_khoa.n_ap_dung > 0 && !hub.ngoai_khoa.du_mau ? "Dưới ngưỡng diễn giải (áp dụng < 30)" : null,
      href: bcthVstStatsHref("bm03", seed),
    },
  ];
}

/** Field process trên mặt trước. Pool GSC không thuộc họ này. */
export function bcthFrontProcessFields(): readonly string[] {
  return BCTH_VST_KPI_FIELDS;
}

export function isGscPoolField(field: string): boolean {
  return field === "ty_le_bk" || field === "ty_le_gsc";
}
