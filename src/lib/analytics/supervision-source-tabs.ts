/** Ba tab nguồn giám sát: Chuyên trách · Tự giám sát · So sánh (L3b). Chỉ đổi cách xem, không đổi quyền. */

import type { SupervisionSourceLens } from "@/lib/analytics/supervision-source-lens";

export type SupervisionSourceView = SupervisionSourceLens | "sosanh";

/** Người bị khóa vào một khoa (người khoa) mở tab Tự giám sát; KSNK mở Chuyên trách. */
export function defaultSourceView(khoaFilterLocked: boolean | undefined): SupervisionSourceLens {
  return khoaFilterLocked ? "tgs" : "ksnk";
}
