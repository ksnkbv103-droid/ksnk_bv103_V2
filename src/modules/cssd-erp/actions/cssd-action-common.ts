import { revalidatePath } from "next/cache";
import type { Station } from "../types/cssd.types";
import { WORKFLOW_STEPS } from "../workflow/domain/cssd-stations";
import { getErrorMessage, mapFkError, tableHasColumn } from "../shared/cssd-db-utils";

/** SSOT: lấy từ [`../domain/cssd-stations.ts`](../domain/cssd-stations.ts) */
export const STEPS: Station[] = [...WORKFLOW_STEPS];

export { getErrorMessage, mapFkError, tableHasColumn };

export function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    /* ngoài request context */
  }
}

