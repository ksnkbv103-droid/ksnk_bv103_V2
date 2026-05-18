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
import { CSSD_ROUTES } from "@/lib/cssd-routes";

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

/** @deprecated Dùng `revalidateCssdWorkflowSurfaces` hoặc helper theo ngữ cảnh. */
export function safeRevalidate(path: string) {
  safeRevalidateCssdPath(path);
  if (path === CSSD_ROUTES.erpRoot || path.startsWith("/cssd-erp")) {
    revalidateCssdWorkflowSurfaces();
  }
}
