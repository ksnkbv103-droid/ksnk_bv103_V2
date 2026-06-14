import type { BangKiemApDungSource, KhoaApDungContext } from "@/lib/domain/bang-kiem-ap-dung";
import {
  isBkBatBuocTgs,
  isBkBatBuocTgsChoKhoa,
  listBkBatBuocTgsChoKhoa,
} from "@/lib/domain/bang-kiem-ap-dung";
import { roundPercent2 } from "@/lib/analytics/supervision-percent";
import { khoaChartLabel } from "@/lib/analytics/supervision-matrix-mappers";

export type TgsObligationCellStatus = "not_applicable" | "missing_tgs" | "has_tgs";

export const TGS_OBLIGATION_LABELS: Record<TgsObligationCellStatus, string> = {
  not_applicable: "Không áp dụng",
  missing_tgs: "Thiếu TGS",
  has_tgs: "Đã TGS",
};

export type TgsCoverageHit = {
  khoa_id: string;
  bang_kiem_id: string;
};

export type TgsCoverageKhoaRow = {
  id: string;
  ten: string;
  label: string;
  ty_le_bao_phu_tgs: number;
  so_bk_bat_buoc: number;
  so_bk_da_tgs: number;
  so_bk_thieu: number;
  bk_thieu_labels: string[];
  tong_phien_tgs: number;
  ty_le_tuan_thu_tgs: number | null;
};

export function buildTgsHitSet(hits: TgsCoverageHit[]): Set<string> {
  const s = new Set<string>();
  for (const h of hits) {
    s.add(`${h.khoa_id}|${h.bang_kiem_id}`);
  }
  return s;
}

export function obligationCellStatus(
  bk: BangKiemApDungSource,
  khoa: KhoaApDungContext,
  hitSet: Set<string>,
): TgsObligationCellStatus {
  if (!isBkBatBuocTgsChoKhoa(bk, khoa)) return "not_applicable";
  return hitSet.has(`${khoa.id}|${bk.id}`) ? "has_tgs" : "missing_tgs";
}

export function computeTyLeBaoPhuTgs(daTgs: number, batBuoc: number): number {
  if (batBuoc <= 0) return 100;
  return roundPercent2((daTgs / batBuoc) * 100);
}

export function buildTgsCoverageRow(args: {
  khoa: KhoaApDungContext;
  catalog: BangKiemApDungSource[];
  hitSet: Set<string>;
  tong_phien_tgs?: number;
  ty_le_tuan_thu_tgs?: number | null;
}): TgsCoverageKhoaRow {
  const ten = String(args.khoa.ten_khoa ?? "").trim() || "—";
  const batBuoc = listBkBatBuocTgsChoKhoa(args.catalog, args.khoa);
  const daTgs = batBuoc.filter((bk) => args.hitSet.has(`${args.khoa.id}|${bk.id}`));
  const thieu = batBuoc.filter((bk) => !args.hitSet.has(`${args.khoa.id}|${bk.id}`));

  return {
    id: args.khoa.id,
    ten,
    label: khoaChartLabel({ ten, ma_khoa: args.khoa.ma_khoa }),
    ty_le_bao_phu_tgs: computeTyLeBaoPhuTgs(daTgs.length, batBuoc.length),
    so_bk_bat_buoc: batBuoc.length,
    so_bk_da_tgs: daTgs.length,
    so_bk_thieu: thieu.length,
    bk_thieu_labels: thieu.map((b) => String(b.ma_bk ?? b.ten_bang_kiem ?? b.id)),
    tong_phien_tgs: args.tong_phien_tgs ?? 0,
    ty_le_tuan_thu_tgs: args.ty_le_tuan_thu_tgs ?? null,
  };
}

/** Xếp hạng triển khai TGS — khoa yếu (bao phủ thấp) trước. */
export function buildTgsCoverageRanking(
  khoaList: KhoaApDungContext[],
  catalog: BangKiemApDungSource[],
  hitSet: Set<string>,
  gapByKhoaId?: Map<string, { vol_tgs: number; ty_le_tgs: number | null }>,
): TgsCoverageKhoaRow[] {
  return khoaList
    .map((khoa) => {
      const gap = gapByKhoaId?.get(khoa.id);
      return buildTgsCoverageRow({
        khoa,
        catalog,
        hitSet,
        tong_phien_tgs: gap?.vol_tgs,
        ty_le_tuan_thu_tgs: gap?.ty_le_tgs ?? null,
      });
    })
    .filter((r) => r.so_bk_bat_buoc > 0)
    .sort((a, b) => a.ty_le_bao_phu_tgs - b.ty_le_bao_phu_tgs || a.label.localeCompare(b.label, "vi"));
}

export type ObligationMatrixBkColumn = {
  id: string;
  ma_bk: string;
  label: string;
};

export function listObligationMatrixColumns(catalog: BangKiemApDungSource[]): ObligationMatrixBkColumn[] {
  return catalog
    .filter((bk) => bk.is_active !== false && isBkBatBuocTgs(bk))
    .map((bk) => ({
      id: bk.id,
      ma_bk: String(bk.ma_bk ?? bk.id),
      label: String(bk.ma_bk ?? bk.ten_bang_kiem ?? bk.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

export function buildObligationMatrixCells(
  khoaList: KhoaApDungContext[],
  catalog: BangKiemApDungSource[],
  columns: ObligationMatrixBkColumn[],
  hitSet: Set<string>,
): { khoaId: string; bkId: string; status: TgsObligationCellStatus }[] {
  const byId = new Map(catalog.map((b) => [b.id, b]));
  const cells: { khoaId: string; bkId: string; status: TgsObligationCellStatus }[] = [];
  for (const khoa of khoaList) {
    for (const col of columns) {
      const bk = byId.get(col.id);
      if (!bk) continue;
      cells.push({
        khoaId: khoa.id,
        bkId: col.id,
        status: obligationCellStatus(bk, khoa, hitSet),
      });
    }
  }
  return cells;
}
