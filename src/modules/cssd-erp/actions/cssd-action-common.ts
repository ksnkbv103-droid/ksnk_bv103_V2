import type { Station } from "../types/cssd.types";
import { safeRevalidateCssdPath } from "@/lib/cssd-server-common";
import { WORKFLOW_STEPS } from "../workflow/domain/cssd-stations";
import { getErrorMessage, mapFkError, tableHasColumn } from "../shared/cssd-db-utils";

/** SSOT: lấy từ [`../domain/cssd-stations.ts`](../domain/cssd-stations.ts) */
export const STEPS: Station[] = [...WORKFLOW_STEPS];

export { getErrorMessage, mapFkError, tableHasColumn };

/** @deprecated Dùng `safeRevalidateCssdPath` từ `@/lib/cssd-server-common`. */
export function safeRevalidate(path: string) {
  safeRevalidateCssdPath(path);
}

