import {
  getComplianceDashboardPayloads,
} from "../actions/compliance-dashboard.actions";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import { getVstDashboardPayload, type VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.actions";
import { effectiveFilterIds } from "./dashboard-hook-helpers";

export type SupervisionTabFilter = "ALL" | "KSNK" | "CHEO" | "TU_GIAM_SAT";

export type FetchDashboardPayloadsInput = {
  sType: SupervisionTabFilter;
  bangKiemOverride?: string[];
  selectedBangKiemMas: string[];
  selectedKhoiIds: string[];
  selectedKhoaIds: string[];
  selectedNgheIds: string[];
  selectedKhuVucIds: string[];
  tuNgay: string;
  denNgay: string;
  khoiOptionCount: number;
  khoaOptionCount: number;
  ngheOptionCount: number;
  khuOptionCount: number;
};

export type FetchDashboardPayloadsResult = {
  vst: VstDashboardPayload | null;
  gsc: Record<string, ComplianceDashboardPayload>;
};

/**
 * Gọi RPC compliance (multi) + VST dashboard cho một supervision_type.
 * Dùng chung hook Command Center.
 */
export async function fetchDashboardPayloadsForSupervisionType(
  p: FetchDashboardPayloadsInput,
): Promise<FetchDashboardPayloadsResult> {
  const selected =
    p.bangKiemOverride ??
    (p.selectedBangKiemMas.length > 0 ? p.selectedBangKiemMas : ["VST_WHO"]);
  const needVst = selected.includes("VST_WHO");
  const effKhoi = effectiveFilterIds(p.selectedKhoiIds, p.khoiOptionCount);
  const effKhoa = effectiveFilterIds(p.selectedKhoaIds, p.khoaOptionCount);
  const effNghe = effectiveFilterIds(p.selectedNgheIds, p.ngheOptionCount);
  const effKhu = effectiveFilterIds(p.selectedKhuVucIds, p.khuOptionCount);
  const gscTopics = selected.filter((bk) => bk !== "VST_WHO");

  const [complianceRes, vstRes] = await Promise.all([
    gscTopics.length > 0
      ? getComplianceDashboardPayloads({
          bang_kiem_mas: gscTopics,
          khoi_ids: effKhoi || undefined,
          khoa_ids: effKhoa || undefined,
          nghe_nghiep_ids: effNghe || undefined,
          khu_vuc_ids: effKhu || undefined,
          tu_ngay: p.tuNgay,
          den_ngay: p.denNgay,
          include_options: false,
          supervision_type: p.sType,
        })
      : Promise.resolve(null),
    needVst
      ? getVstDashboardPayload({
          khoi_ids: effKhoi || undefined,
          khoa_ids: effKhoa || undefined,
          nghe_nghiep_ids: effNghe || undefined,
          khu_vuc_ids: effKhu || undefined,
          tu_ngay: p.tuNgay,
          den_ngay: p.denNgay,
          supervision_type: p.sType,
        })
      : Promise.resolve(null),
  ]);

  const nextMap = complianceRes && complianceRes.success ? complianceRes.data : {};

  type PartRow = { id: string; ten: string; so_phien: number };
  const vstPart: PartRow[] = vstRes && vstRes.success ? vstRes.data.participation : [];
  const gscPart: PartRow[] = [];
  Object.values(nextMap).forEach((row) => {
    if (row?.participation?.length) gscPart.push(...row.participation);
  });

  const combinedPartMap = new Map<string, { id: string; ten: string; so_phien: number }>();
  [...vstPart, ...gscPart].forEach((row) => {
    const existing = combinedPartMap.get(row.id);
    if (existing) {
      existing.so_phien += row.so_phien;
    } else {
      combinedPartMap.set(row.id, { ...row });
    }
  });

  const finalVst =
    vstRes && vstRes.success
      ? { ...vstRes.data, participation: Array.from(combinedPartMap.values()) }
      : null;

  return { vst: finalVst, gsc: nextMap };
}
