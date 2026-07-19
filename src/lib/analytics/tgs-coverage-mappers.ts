import type { BangKiemApDungSource, KhoaApDungContext } from "@/lib/domain/bang-kiem-ap-dung";
import { listBkBatBuocTgsChoKhoa } from "@/lib/domain/bang-kiem-ap-dung";
import { roundPercent2 } from "@/lib/analytics/supervision-percent";
import { khoaChartLabel } from "@/lib/analytics/supervision-matrix-mappers";

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

export function computeTyLeBaoPhuTgs(daTgs: number, batBuoc: number): number {
  if (batBuoc <= 0) return 100;
  return roundPercent2((daTgs / batBuoc) * 100);
}

/** Trạng thái ô khoa × BK bắt buộc TGS — không phạt ngoài phạm vi. */
export type TgsBkCellStatus = "khong_ap_dung" | "thieu_tgs" | "da_tgs";

export const TGS_BK_CELL_LABELS: Record<TgsBkCellStatus, string> = {
  khong_ap_dung: "Không áp dụng",
  thieu_tgs: "Thiếu TGS",
  da_tgs: "Đã TGS",
};

export function resolveTgsBkCellStatus(args: { appliesBatBuocTgs: boolean; hasHit: boolean }): TgsBkCellStatus {
  if (!args.appliesBatBuocTgs) return "khong_ap_dung";
  return args.hasHit ? "da_tgs" : "thieu_tgs";
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
