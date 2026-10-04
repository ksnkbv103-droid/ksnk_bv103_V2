import { revalidatePath } from "next/cache";
import { invalidateGscStrategicAnalyticsCache } from "@/lib/analytics/strategic-analytics-cache";
import { GSC_APP_PATHS } from "./gsc-app-paths";

export function revalidateGscPaths(): void {
  for (const p of GSC_APP_PATHS) {
    revalidatePath(p);
  }
  invalidateGscStrategicAnalyticsCache();
}
