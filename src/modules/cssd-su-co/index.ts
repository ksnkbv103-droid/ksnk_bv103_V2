/**
 * Module CSSD — Báo cáo & xử lý sự cố (bounded context tách khỏi UI luồng chính).
 * @see actions/su-co-report.actions.ts — cổng Server Action
 */
export { createIncidentReport } from "./actions/su-co-report.actions";
export { executeIncidentReportAndRollback } from "./application/su-co-report.application";
export { cssdIncidentReportInputSchema, incidentGroupSchema, type CssdIncidentReportInput } from "./contracts/su-co-report-input.schema";
export {
  classifyIncidentGroupByTypeName,
  INCIDENT_GROUP_LABEL,
  INCIDENT_GROUPS,
  INCIDENT_TYPE_PRESETS,
  INCIDENT_STATION_OPTIONS,
  type IncidentGroup,
  type IncidentPreset,
} from "./domain/cssd-incident-taxonomy";
export { resolveIncidentPolicy, type IncidentKind, type IncidentPolicyOutcome } from "./domain/cssd-incident-policy";
export { default as IncidentReportModal } from "./components/IncidentReportModal";
export { default as IncidentFormFields } from "./components/IncidentFormFields";
export { default as SuCoReportForm } from "./components/SuCoReportForm";
export { default as CssdSuCoPage } from "./views/SuCoBaoCaoPage";
