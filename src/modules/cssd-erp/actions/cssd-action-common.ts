import type { Station } from "../types/cssd.types";
import { WORKFLOW_STEPS } from "../workflow/domain/cssd-stations";
import { getErrorMessage, mapFkError, tableHasColumn } from "../shared/cssd-db-utils";
import {
  revalidateCssdBatchSurfaces,
  revalidateCssdChemicalSurfaces,
  revalidateCssdIncidentSurfaces,
  revalidateCssdInventorySurfaces,
  revalidateCssdMaintenanceSurfaces,
  revalidateCssdWorkflowSurfaces,
  safeRevalidateCssdPath,
} from "@/lib/cssd-server-common";

/** SSOT: [`../workflow/domain/cssd-stations.ts`](../workflow/domain/cssd-stations.ts) */
export const STEPS: Station[] = [...WORKFLOW_STEPS];

export { getErrorMessage, mapFkError, tableHasColumn };

export {
  revalidateCssdBatchSurfaces,
  revalidateCssdChemicalSurfaces,
  revalidateCssdIncidentSurfaces,
  revalidateCssdInventorySurfaces,
  revalidateCssdMaintenanceSurfaces,
  revalidateCssdWorkflowSurfaces,
  safeRevalidateCssdPath,
};

export { appendQuyTrinhException } from "../shared/application/cssd-quy-trinh-exceptions";
