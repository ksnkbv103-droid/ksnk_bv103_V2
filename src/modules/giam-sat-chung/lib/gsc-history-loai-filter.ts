import type { GscLoaiGiamSatRoute } from "./gsc-app-paths";

type FilterableQuery = {
  eq(column: string, value: string): FilterableQuery;
  or(filters: string): FilterableQuery;
};

/** Lọc lịch sử theo `bk.loai_giam_sat` — khớp filter danh mục bảng kiểm trên form. */
export function applyGscLoaiGiamSatToQuery<Q extends FilterableQuery>(
  query: Q,
  loaiGiamSat?: GscLoaiGiamSatRoute,
): Q {
  if (!loaiGiamSat) return query;
  if (loaiGiamSat === "TUAN_THU") {
    return query.or("loai_giam_sat.is.null,loai_giam_sat.eq.TUAN_THU") as Q;
  }
  return query.eq("loai_giam_sat", loaiGiamSat) as Q;
}
