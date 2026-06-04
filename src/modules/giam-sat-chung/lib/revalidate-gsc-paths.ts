import { revalidatePath } from "next/cache";
import { GSC_APP_PATHS } from "./gsc-app-paths";

export function revalidateGscPaths(): void {
  for (const p of GSC_APP_PATHS) {
    revalidatePath(p);
  }
}
