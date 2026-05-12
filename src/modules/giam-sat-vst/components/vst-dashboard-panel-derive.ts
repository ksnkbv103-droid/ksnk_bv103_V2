import { MOMENTS, VST_DASHBOARD_MOMENT_GAP_LABEL } from "../data";
import { sharePercentagesOneDecimal } from "./vst-dashboard-math";

const MOMENT_ROWS_ORDER = [...MOMENTS, VST_DASHBOARD_MOMENT_GAP_LABEL] as const;

export type MomentWhoRow = {
  ten: string;
  tong: number;
  n_bo_sot: number;
  n_dat: number;
  ty_le_bo_sot: number;
  ty_le_tuan_thu: number;
};

export type KhoaBarRow = { ten: string; dat: number; tong: number; ty_le: number; barColor: string };

type MomentRpcRow = { ten?: string | null; n_bo_sot?: number | null; n_dat?: number | null; tong?: number | null };
type KhoaRpcRow = { ten?: string | null; dat?: number | null; tong?: number | null; ty_le?: number | null };

export function deriveMomentWhoRows(rawList: MomentRpcRow[] | undefined): MomentWhoRow[] {
  const mergedByTen = new Map<string, { n_bo_sot: number; n_dat: number; tong: number }>();
  for (const r of rawList ?? []) {
    const ten = String(r.ten ?? "").trim();
    if (!ten) continue;
    const nb = Number(r.n_bo_sot ?? 0);
    const nd = Number(r.n_dat ?? 0);
    const tg = Number(r.tong ?? 0);
    const prev = mergedByTen.get(ten);
    if (!prev) mergedByTen.set(ten, { n_bo_sot: nb, n_dat: nd, tong: tg });
    else {
      mergedByTen.set(ten, {
        n_bo_sot: prev.n_bo_sot + nb,
        n_dat: prev.n_dat + nd,
        tong: prev.tong + tg,
      });
    }
  }

  const knownSet = new Set<string>([...MOMENT_ROWS_ORDER]);
  const rowFor = (ten: string): MomentWhoRow => {
    const v = mergedByTen.get(ten);
    return {
      ten,
      tong: v?.tong ?? 0,
      n_bo_sot: v?.n_bo_sot ?? 0,
      n_dat: v?.n_dat ?? 0,
      ty_le_bo_sot: 0,
      ty_le_tuan_thu: 0,
    };
  };

  const knownRows = MOMENT_ROWS_ORDER.map((ten) => rowFor(ten));
  const extraTens = [...mergedByTen.keys()]
    .filter((t) => !knownSet.has(t))
    .sort((a, b) => a.localeCompare(b, "vi"));
  const base = [...knownRows, ...extraTens.map(rowFor)];

  const pctMiss = sharePercentagesOneDecimal(base.map((b) => b.n_bo_sot));
  const pctDat = sharePercentagesOneDecimal(base.map((b) => b.n_dat));
  return base.map((b, i) => ({
    ...b,
    ty_le_bo_sot: pctMiss[i] ?? 0,
    ty_le_tuan_thu: pctDat[i] ?? 0,
  }));
}

export function deriveKhoaBarRows(raw: KhoaRpcRow[] | undefined): KhoaBarRow[] {
  const sorted = [...(raw ?? [])].sort((a, b) => {
    const d = Number(a.ty_le) - Number(b.ty_le);
    if (d !== 0) return d;
    return String(a.ten ?? "").localeCompare(String(b.ten ?? ""), "vi");
  });
  const n = sorted.length;
  const GREEN = "#026f17";
  const RED = "#dc2626";
  const GRAY = "#94a3b8";
  const AMBER = "#d97706";
  return sorted.map((r, i) => {
    const isWorst10 = n > 0 && i < Math.min(10, n);
    const isBest10 = n > 0 && i >= Math.max(0, n - Math.min(10, n));
    let barColor = GRAY;
    if (isWorst10 && isBest10) barColor = AMBER;
    else if (isWorst10) barColor = RED;
    else if (isBest10) barColor = GREEN;
    return {
      ten: String(r.ten ?? "—"),
      dat: Number(r.dat) || 0,
      tong: Number(r.tong) || 0,
      ty_le: Number(r.ty_le) || 0,
      barColor,
    };
  });
}
