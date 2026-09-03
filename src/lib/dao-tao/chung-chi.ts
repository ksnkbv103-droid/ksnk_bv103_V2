/** Chứng chỉ KSNK từ lần thi thật đạt — không phải LMS lớp học. */

export const DEFAULT_HAN_CHUNG_CHI_THANG = 12;
export const SAP_HET_HAN_NGAY = 30;

export type ChungChiKind = "chua_co" | "con_han" | "sap_het_han" | "het_han";

export type ChungChiStatus = {
  kind: ChungChiKind;
  kyTen: string | null;
  datLuc: string | null;
  hetHanLuc: string | null;
};

export function parseHanChungChiThang(gan: unknown): number {
  const raw =
    gan && typeof gan === "object"
      ? (gan as { han_chung_chi_thang?: unknown }).han_chung_chi_thang
      : undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 60) return DEFAULT_HAN_CHUNG_CHI_THANG;
  return Math.floor(n);
}

export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const out = new Date(d.getTime());
  out.setMonth(out.getMonth() + months);
  return out.toISOString();
}

export function resolveChungChi(args: {
  lastPassNopLuc: string | null;
  lastPassKyTen: string | null;
  hanThang: number;
  nowIso: string;
}): ChungChiStatus {
  const empty: ChungChiStatus = {
    kind: "chua_co",
    kyTen: null,
    datLuc: null,
    hetHanLuc: null,
  };
  if (!args.lastPassNopLuc) return empty;
  const han = args.hanThang >= 1 && args.hanThang <= 60 ? Math.floor(args.hanThang) : DEFAULT_HAN_CHUNG_CHI_THANG;
  const hetHanLuc = addMonthsIso(args.lastPassNopLuc, han);
  const now = new Date(args.nowIso).getTime();
  const het = new Date(hetHanLuc).getTime();
  if (Number.isNaN(now) || Number.isNaN(het)) return empty;
  const msLeft = het - now;
  const kind: ChungChiKind =
    msLeft < 0 ? "het_han" : msLeft <= SAP_HET_HAN_NGAY * 24 * 60 * 60 * 1000 ? "sap_het_han" : "con_han";
  return {
    kind,
    kyTen: args.lastPassKyTen,
    datLuc: args.lastPassNopLuc,
    hetHanLuc,
  };
}

export function labelChungChiKind(kind: ChungChiKind): string {
  if (kind === "con_han") return "Còn hạn";
  if (kind === "sap_het_han") return "Sắp hết hạn — cần học lại";
  if (kind === "het_han") return "Hết hạn — cần thi lại";
  return "Chưa có chứng chỉ";
}
