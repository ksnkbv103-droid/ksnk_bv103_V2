/** Đọc hết range PostgREST. Lỗi giữa chừng ném — không trả phần đã đọc. */

export const RANGE_PAGE_SIZE = 1000;
/** UUID trong một `.in()` — dưới trần URL PostgREST. */
export const RANGE_IN_CHUNK = 100;

type PageResult<T> = { data: T[] | null; error: { message?: string } | null };

export async function fetchAllRangeRows<T>(
  load: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = RANGE_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await load(from, from + pageSize - 1);
    if (error) throw new Error(error.message?.trim() || "Không đọc hết trang.");
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) return rows;
    from += pageSize;
  }
}

export async function fetchAllByIdChunks<T>(
  ids: string[],
  load: (idChunk: string[], from: number, to: number) => PromiseLike<PageResult<T>>,
  opts?: { pageSize?: number; inChunk?: number },
): Promise<T[]> {
  const pageSize = opts?.pageSize ?? RANGE_PAGE_SIZE;
  const inChunk = opts?.inChunk ?? RANGE_IN_CHUNK;
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += inChunk) {
    const idChunk = ids.slice(i, i + inChunk);
    const part = await fetchAllRangeRows((from, to) => load(idChunk, from, to), pageSize);
    rows.push(...part);
  }
  return rows;
}
