/** Cùng luật đếm với RPC kho: chỉ `is_active`, không dừng ở trang PostgREST 1000. */

export const CSSD_ACTIVE_PAGE_SIZE = 1000;

export function nextActivePageFrom(chunkLength: number, from: number, pageSize = CSSD_ACTIVE_PAGE_SIZE): number | null {
  if (chunkLength < pageSize) return null;
  return from + pageSize;
}
