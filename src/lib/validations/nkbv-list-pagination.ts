import { z } from "zod";
import { FACT_LIST_DEFAULT_PAGE_SIZE } from "./fact-list-pagination";

export const NKBV_LIST_SORT_KEYS = ["ngay_phat_hien", "ma_ca", "created_at", "updated_at"] as const;
export type NkbvListSortKey = (typeof NKBV_LIST_SORT_KEYS)[number];

export const nkbvListPaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(FACT_LIST_DEFAULT_PAGE_SIZE),
  search: z.string().max(500).default(""),
  sortKey: z.string().max(64).default("ngay_phat_hien"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type NkbvListPaginationInput = z.infer<typeof nkbvListPaginationSchema>;
