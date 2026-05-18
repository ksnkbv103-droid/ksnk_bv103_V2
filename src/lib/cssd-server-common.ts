import { revalidatePath } from "next/cache";

export function safeRevalidateCssdPath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    /* ngoài request context */
  }
}
