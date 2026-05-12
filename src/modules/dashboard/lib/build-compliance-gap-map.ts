import { buildEmptyComplianceDashboardPayload, type ComplianceDashboardPayload } from "../compliance-dashboard.types";

type GscMap = Record<string, ComplianceDashboardPayload>;

export function buildComplianceGapMap(
  resKq: { gsc: GscMap },
  resCheo: { gsc: GscMap },
  resTgs: { gsc: GscMap },
  tuNgay: string,
  denNgay: string,
): Record<string, { kq: ComplianceDashboardPayload; cheo: ComplianceDashboardPayload; tgs: ComplianceDashboardPayload }> {
  const gapMap: Record<
    string,
    { kq: ComplianceDashboardPayload; cheo: ComplianceDashboardPayload; tgs: ComplianceDashboardPayload }
  > = {};
  const allBks = new Set([...Object.keys(resKq.gsc), ...Object.keys(resCheo.gsc), ...Object.keys(resTgs.gsc)]);
  const empty = () => buildEmptyComplianceDashboardPayload(tuNgay, denNgay);
  allBks.forEach((bk) => {
    gapMap[bk] = {
      kq: resKq.gsc[bk] ?? empty(),
      cheo: resCheo.gsc[bk] ?? empty(),
      tgs: resTgs.gsc[bk] ?? empty(),
    };
  });
  return gapMap;
}
