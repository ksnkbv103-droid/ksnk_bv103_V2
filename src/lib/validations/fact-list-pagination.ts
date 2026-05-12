import { z } from "zod";

/** Chuẩn BV103: mặc định 20 dòng/trang cho mọi list `fact_*` (server pagination). */
export const FACT_LIST_DEFAULT_PAGE_SIZE = 20 as const;

/**
 * Hợp đồng phân trang dùng chung cho Server Action + hook `useServerPaginatedTable`.
 * `coerce` để an toàn khi tham số lọc từ URL/query string.
 */
export const factListPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(FACT_LIST_DEFAULT_PAGE_SIZE),
  search: z.string().max(500).default(""),
  sortKey: z.string().max(64).optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type FactListPaginationInput = z.infer<typeof factListPaginationSchema>;
