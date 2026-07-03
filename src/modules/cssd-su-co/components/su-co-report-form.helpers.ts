// src/modules/cssd-su-co/components/su-co-report-form.helpers.ts
import { INCIDENT_TYPE_PRESETS, type IncidentGroup } from "../domain/cssd-incident-taxonomy";
import { CHEMICAL_QUALITY_INCIDENT, OTHER_GENERIC_INCIDENT } from "../domain/cssd-incident-trace";

export function groupTypeDefaults(group: IncidentGroup) {
  if (group === "CHEMICAL") return CHEMICAL_QUALITY_INCIDENT;
  if (group === "OTHER") return OTHER_GENERIC_INCIDENT;
  const options = INCIDENT_TYPE_PRESETS[group];
  const first = options[0];
  return { typeId: first?.code || "", typeTen: first?.label || "" };
}
