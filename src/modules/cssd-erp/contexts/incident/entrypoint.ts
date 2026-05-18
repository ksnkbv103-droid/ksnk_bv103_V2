/**
 * Bounded context entrypoint: Incident (CSSD).
 * SSOT module: `src/modules/cssd-su-co`.
 */
export {
  createIncidentReport,
  unlockDongBangQuyTrinhByMaQr,
} from "../../actions/cssd-workflow-ops.actions";
export { createIncidentReport as createSuCoReport } from "@/modules/cssd-su-co/actions/su-co-report.actions";
export { resolveIncidentPolicy } from "@/modules/cssd-su-co/domain/cssd-incident-policy";
