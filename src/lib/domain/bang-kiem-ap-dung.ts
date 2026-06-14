import { z } from "zod";

export const BK_PHAM_VI = [
  "CA_VIEN",
  "THEO_KHOI",
  "THEO_KHOA",
  "CHI_KSNK",
  "KHUYEN_NGH",
] as const;

export type BkPhamVi = (typeof BK_PHAM_VI)[number];

export const BK_MUC_DO = ["BAT_BUOC", "KHUYEN_NGH", "CHI_KSNK"] as const;

export type BkMucDo = (typeof BK_MUC_DO)[number];

export const BK_TAN_SUAT_DON_VI = ["TUAN", "THANG", "QUY"] as const;

export type BkTanSuatDonVi = (typeof BK_TAN_SUAT_DON_VI)[number];

export const tanSuatToiThieuSchema = z.object({
  don_vi: z.enum(BK_TAN_SUAT_DON_VI),
  so_lan: z.coerce.number().int().min(1),
});

export type BangKiemTanSuatToiThieu = z.infer<typeof tanSuatToiThieuSchema>;

export const apDungJsonbSchema = z.object({
  pham_vi: z.enum(BK_PHAM_VI),
  khoi_ids: z.array(z.string().min(1)).default([]),
  khoa_ids: z.array(z.string().min(1)).default([]),
  khoa_loai_tru: z.array(z.string().min(1)).default([]),
  bat_buoc: z.object({
    tu_giam_sat: z.boolean(),
    ksnk_giam_sat: z.boolean(),
  }),
  muc_do: z.enum(BK_MUC_DO),
  tan_suat_toi_thieu: tanSuatToiThieuSchema.optional(),
  ghi_chu: z.string().optional(),
});

export type BangKiemApDungJsonb = z.infer<typeof apDungJsonbSchema>;

export type BangKiemApDungSource = {
  id: string;
  ma_bk?: string | null;
  ten_bang_kiem?: string | null;
  is_active?: boolean | null;
  phan_loai_chuyen_mon?: string | null;
  loai_giam_sat?: string | null;
  ap_dung_jsonb?: unknown;
};

export type KhoaApDungContext = {
  id: string;
  khoi_id?: string | null;
  ma_khoa?: string | null;
  ten_khoa?: string | null;
  is_active?: boolean | null;
};

export type BangKiemNghiaVuChoKhoa = {
  apDung: boolean;
  mucDo: BkMucDo;
  batBuocTgs: boolean;
  batBuocKsnk: boolean;
  huongDan: string[];
};

export const PHAM_VI_LABELS: Record<BkPhamVi, string> = {
  CA_VIEN: "Cả viện",
  THEO_KHOI: "Theo khối",
  THEO_KHOA: "Theo khoa",
  CHI_KSNK: "Chỉ Khoa KSNK",
  KHUYEN_NGH: "Khuyến nghị",
};

export const MUC_DO_LABELS: Record<BkMucDo, string> = {
  BAT_BUOC: "Bắt buộc",
  KHUYEN_NGH: "Khuyến nghị",
  CHI_KSNK: "Chỉ Khoa KSNK",
};

export const MUC_DO_DESCRIPTIONS: Record<BkMucDo, string> = {
  BAT_BUOC: "Tính vào KPI bao phủ — khoa trong phạm vi thiếu sẽ bị ghi nhận «Thiếu TGS».",
  KHUYEN_NGH: "Khuyến nghị thực hiện — không phạt thiếu trên KPI bắt buộc.",
  CHI_KSNK: "Chỉ áp dụng nội bộ Khoa KSNK — không đưa vào mẫu số TGS lâm sàng.",
};

export const TAN_SUAT_DON_VI_LABELS: Record<BkTanSuatDonVi, string> = {
  TUAN: "tuần",
  THANG: "tháng",
  QUY: "quý",
};

/** Nhãn đọc được khi KSNK đã quy định tần suất; `null` = chưa cấu hình. */
export function formatTanSuatToiThieu(
  ap: Pick<BangKiemApDungJsonb, "tan_suat_toi_thieu">,
): string | null {
  const ts = ap.tan_suat_toi_thieu;
  if (!ts?.don_vi || !ts.so_lan || ts.so_lan < 1) return null;
  const unit = TAN_SUAT_DON_VI_LABELS[ts.don_vi];
  return `${ts.so_lan} phiên TGS tối thiểu / ${unit}`;
}

function stripTanSuatIfInvalid(ap: BangKiemApDungJsonb): BangKiemApDungJsonb {
  if (ap.muc_do !== "BAT_BUOC" || !ap.bat_buoc.tu_giam_sat) {
    const { tan_suat_toi_thieu: _drop, ...rest } = ap;
    return rest;
  }
  const ts = ap.tan_suat_toi_thieu;
  if (!ts?.don_vi || !ts.so_lan || ts.so_lan < 1) {
    const { tan_suat_toi_thieu: _drop, ...rest } = ap;
    return rest;
  }
  return ap;
}

/** Khoa thuộc Khoa Kiểm soát nhiễm khuẩn (không vào mẫu số TGS lâm sàng). */
export function isKhoaKsnkDepartment(khoa: Pick<KhoaApDungContext, "ma_khoa" | "ten_khoa">): boolean {
  const ma = String(khoa.ma_khoa ?? "").trim().toUpperCase();
  const ten = String(khoa.ten_khoa ?? "").trim().toLowerCase();
  if (ma === "KSNK" || ma === "C18") return true;
  if (ten.includes("kiểm soát") || ten.includes("kiem soat")) return true;
  return false;
}

export function suggestDefaultApDungJsonb(bk: {
  phan_loai_chuyen_mon?: string | null;
  loai_giam_sat?: string | null;
}): BangKiemApDungJsonb {
  if (bk.loai_giam_sat === "DANH_GIA_HE_THONG" || bk.phan_loai_chuyen_mon === "QUAN_TRI_HE_THONG") {
    return {
      pham_vi: "CHI_KSNK",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: false, ksnk_giam_sat: true },
      muc_do: "CHI_KSNK",
      ghi_chu: "Gợi ý: chỉ KSNK",
    };
  }
  if (bk.phan_loai_chuyen_mon === "CHUYEN_KHOA" || bk.loai_giam_sat === "NHAT_KY_VAN_HANH") {
    return {
      pham_vi: "THEO_KHOA",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: bk.loai_giam_sat === "TUAN_THU" },
      muc_do: "BAT_BUOC",
      ghi_chu: "Gợi ý: chọn khoa áp dụng",
    };
  }
  return {
    pham_vi: "CA_VIEN",
    khoi_ids: [],
    khoa_ids: [],
    khoa_loai_tru: [],
    bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
    muc_do: "BAT_BUOC",
    ghi_chu: "Gợi ý: cả viện",
  };
}

export function parseApDungJsonb(
  raw: unknown,
  bk?: { phan_loai_chuyen_mon?: string | null; loai_giam_sat?: string | null },
): BangKiemApDungJsonb {
  if (!raw || typeof raw !== "object" || Object.keys(raw as object).length === 0) {
    return bk ? suggestDefaultApDungJsonb(bk) : suggestDefaultApDungJsonb({});
  }
  const parsed = apDungJsonbSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return bk ? suggestDefaultApDungJsonb(bk) : suggestDefaultApDungJsonb({});
}

/** Suy ra `pham_vi` từ các lớp cấu hình (lưu DB / analytics). */
export function derivePhamVi(ap: BangKiemApDungJsonb): BkPhamVi {
  if (ap.muc_do === "CHI_KSNK") return "CHI_KSNK";
  if (ap.muc_do === "KHUYEN_NGH") return "KHUYEN_NGH";
  if (ap.khoa_ids.length > 0) return "THEO_KHOA";
  if (ap.khoi_ids.length > 0) return "THEO_KHOI";
  return "CA_VIEN";
}

/** Chuẩn hóa trước khi lưu — đồng bộ `pham_vi`, ràng buộc CHI_KSNK, bỏ tần suất khi không TGS. */
export function normalizeApDungForSave(ap: BangKiemApDungJsonb): BangKiemApDungJsonb {
  let next: BangKiemApDungJsonb;
  if (ap.muc_do === "CHI_KSNK") {
    next = {
      ...ap,
      pham_vi: "CHI_KSNK",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: false, ksnk_giam_sat: ap.bat_buoc.ksnk_giam_sat },
    };
  } else {
    next = { ...ap, pham_vi: derivePhamVi(ap) };
  }
  return stripTanSuatIfInvalid(next);
}

/** BK seed «theo khoa/khối» nhưng chưa chọn khoa/khối — cần KSNK hoàn thiện trước khi lưu. */
export function needsApDungKhoaConfiguration(ap: BangKiemApDungJsonb): boolean {
  if (ap.muc_do === "CHI_KSNK") return false;
  if (ap.pham_vi === "THEO_KHOA" && ap.khoa_ids.length === 0) return true;
  if (ap.pham_vi === "THEO_KHOI" && ap.khoi_ids.length === 0) return true;
  return false;
}

function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Số kỳ tần suất trong khoảng ngày (dùng đánh giá nghĩa vụ phiên, không KPI analytics). */
export function countKyTanSuatTrongKhoang(
  don_vi: BkTanSuatDonVi,
  tuNgay: string,
  denNgay: string,
): number {
  const start = parseIsoDate(tuNgay);
  const end = parseIsoDate(denNgay);
  if (!start || !end || end < start) return 0;

  const msDay = 86_400_000;
  const days = Math.floor((end.getTime() - start.getTime()) / msDay) + 1;
  if (days <= 0) return 0;

  if (don_vi === "TUAN") return Math.max(1, Math.ceil(days / 7));
  if (don_vi === "THANG") {
    const months =
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (end.getUTCMonth() - start.getUTCMonth()) +
      1;
    return Math.max(1, months);
  }
  const quarters =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 4 +
    Math.floor(end.getUTCMonth() / 3) -
    Math.floor(start.getUTCMonth() / 3) +
    1;
  return Math.max(1, quarters);
}

/** Tổng số phiên TGS tối thiểu trong kỳ lọc. */
export function computePhienToiThieuTrongKy(
  ts: BangKiemTanSuatToiThieu,
  tuNgay: string,
  denNgay: string,
): number {
  const ky = countKyTanSuatTrongKhoang(ts.don_vi, tuNgay, denNgay);
  return ts.so_lan * ky;
}

export type TanSuatDanhGia = "chua_quy_dinh" | "dat" | "thieu";

export function evaluateTanSuatTrongKy(
  soPhienThucTe: number,
  ap: Pick<BangKiemApDungJsonb, "tan_suat_toi_thieu" | "bat_buoc" | "muc_do">,
  tuNgay: string,
  denNgay: string,
): TanSuatDanhGia {
  const norm = stripTanSuatIfInvalid({
    pham_vi: "CA_VIEN",
    khoi_ids: [],
    khoa_ids: [],
    khoa_loai_tru: [],
    bat_buoc: ap.bat_buoc,
    muc_do: ap.muc_do,
    tan_suat_toi_thieu: ap.tan_suat_toi_thieu,
  });
  const ts = norm.tan_suat_toi_thieu;
  if (!ts) return "chua_quy_dinh";
  const required = computePhienToiThieuTrongKy(ts, tuNgay, denNgay);
  return soPhienThucTe >= required ? "dat" : "thieu";
}

export function validateApDungForSave(ap: BangKiemApDungJsonb): string | null {
  if (ap.pham_vi === "THEO_KHOA" && ap.khoa_ids.length === 0) {
    return "Theo khoa: chọn ít nhất một khoa áp dụng, hoặc chuyển sang «Cả viện».";
  }
  if (ap.pham_vi === "THEO_KHOI" && ap.khoi_ids.length === 0) {
    return "Theo khối: chọn ít nhất một khối áp dụng.";
  }
  const norm = normalizeApDungForSave(ap);
  if (norm.muc_do === "BAT_BUOC" && !norm.bat_buoc.tu_giam_sat && !norm.bat_buoc.ksnk_giam_sat) {
    return "Bắt buộc: chọn ít nhất một đối tượng phải thực hiện.";
  }
  const ts = ap.tan_suat_toi_thieu;
  if (ts && (ts.so_lan < 1 || !ts.don_vi)) {
    return "Tần suất tối thiểu: chọn đơn vị và số phiên ≥ 1, hoặc để trống nếu chưa quy định.";
  }
  if (ts && ap.muc_do === "BAT_BUOC" && !ap.bat_buoc.tu_giam_sat) {
    return "Tần suất tối thiểu chỉ áp dụng khi gán mạng lưới KSNK khoa (TGS).";
  }
  return null;
}

function hasLayerConfig(ap: BangKiemApDungJsonb): boolean {
  return ap.khoi_ids.length > 0 || ap.khoa_ids.length > 0 || ap.khoa_loai_tru.length > 0;
}

function resolveLegacyPhamVi(ap: BangKiemApDungJsonb, khoa: KhoaApDungContext): boolean {
  switch (ap.pham_vi) {
    case "KHUYEN_NGH":
      return true;
    case "CHI_KSNK":
      return isKhoaKsnkDepartment(khoa);
    case "CA_VIEN":
      if (isKhoaKsnkDepartment(khoa)) return false;
      return !ap.khoa_loai_tru.includes(khoa.id);
    case "THEO_KHOI": {
      const kid = String(khoa.khoi_id ?? "");
      return Boolean(kid && ap.khoi_ids.includes(kid));
    }
    case "THEO_KHOA":
      return ap.khoa_ids.includes(khoa.id);
    default:
      return false;
  }
}

/** Resolve theo lớp: khối ∩ khoa − miễn trừ (CHI_KSNK tách riêng). */
function resolveLayeredPhamVi(ap: BangKiemApDungJsonb, khoa: KhoaApDungContext): boolean {
  if (ap.muc_do === "CHI_KSNK") {
    return isKhoaKsnkDepartment(khoa);
  }

  const explicitKhoa = ap.khoa_ids.includes(khoa.id);

  if (isKhoaKsnkDepartment(khoa)) {
    return explicitKhoa;
  }

  if (ap.khoa_loai_tru.includes(khoa.id)) return false;

  let inScope = true;
  if (ap.khoi_ids.length > 0) {
    const kid = String(khoa.khoi_id ?? "");
    inScope = Boolean(kid && ap.khoi_ids.includes(kid));
  }
  if (ap.khoa_ids.length > 0) {
    inScope = inScope && ap.khoa_ids.includes(khoa.id);
  }
  return inScope;
}

/** BK có áp dụng cho khoa (bất kể bắt buộc TGS). */
export function resolveBkApDungChoKhoa(
  bk: BangKiemApDungSource,
  khoa: KhoaApDungContext,
): boolean {
  const ap = parseApDungJsonb(bk.ap_dung_jsonb, bk);
  if (khoa.is_active === false) return false;

  if (hasLayerConfig(ap) || ap.muc_do === "CHI_KSNK") {
    return resolveLayeredPhamVi(ap, khoa);
  }
  return resolveLegacyPhamVi(ap, khoa);
}

export function describeNghiaVuChoKhoa(
  apRaw: BangKiemApDungJsonb,
  khoa: KhoaApDungContext,
  bk?: BangKiemApDungSource,
): BangKiemNghiaVuChoKhoa {
  const ap = normalizeApDungForSave(apRaw);
  const source: BangKiemApDungSource = { id: bk?.id ?? "", ...bk, ap_dung_jsonb: ap };
  const apDung = resolveBkApDungChoKhoa(source, khoa);
  const batBuocTgs = ap.muc_do === "BAT_BUOC" && ap.bat_buoc.tu_giam_sat && apDung;
  const batBuocKsnk = ap.bat_buoc.ksnk_giam_sat && apDung;

  const huongDan: string[] = [];
  if (!apDung) {
    huongDan.push("Không thuộc phạm vi áp dụng của bảng kiểm này.");
  } else if (ap.muc_do === "KHUYEN_NGH") {
    huongDan.push("Khuyến nghị thực hiện — không tính thiếu trên KPI bắt buộc.");
    if (ap.bat_buoc.tu_giam_sat) {
      huongDan.push("Mạng lưới KSNK khoa: có thể tự giám sát (TGS) khi phù hợp.");
    }
  } else if (ap.muc_do === "CHI_KSNK") {
    huongDan.push("Khoa KSNK: thực hiện và lưu phiên giám sát nội bộ.");
  } else {
    if (batBuocTgs) {
      huongDan.push("Mạng lưới KSNK khoa: bắt buộc tự giám sát (TGS) — tạo phiên TU_GIAM_SAT.");
      const tsLabel = formatTanSuatToiThieu(ap);
      if (tsLabel) {
        huongDan.push(`Quy định tần suất: ${tsLabel}.`);
      }
    }
    if (batBuocKsnk) {
      huongDan.push("Khoa KSNK: giám sát chéo / đối soát phiên của khoa.");
    }
    if (huongDan.length === 0) {
      huongDan.push("Trong phạm vi áp dụng — chưa gán đối tượng thực hiện cụ thể.");
    }
  }

  return { apDung, mucDo: ap.muc_do, batBuocTgs, batBuocKsnk, huongDan };
}

export function listKhoaTrongPhamVi(
  apRaw: BangKiemApDungJsonb,
  allKhoa: KhoaApDungContext[],
  bk?: BangKiemApDungSource,
): KhoaApDungContext[] {
  const ap = normalizeApDungForSave(apRaw);
  const source: BangKiemApDungSource = { id: bk?.id ?? "", ...bk, ap_dung_jsonb: ap };
  return allKhoa.filter(
    (k) => k.is_active !== false && resolveBkApDungChoKhoa(source, k),
  );
}

export function isBkBatBuocTgs(bk: BangKiemApDungSource): boolean {
  if (bk.is_active === false) return false;
  const ap = parseApDungJsonb(bk.ap_dung_jsonb, bk);
  return ap.muc_do === "BAT_BUOC" && ap.bat_buoc.tu_giam_sat;
}

/** BK bắt buộc TGS và áp dụng cho khoa. */
export function isBkBatBuocTgsChoKhoa(bk: BangKiemApDungSource, khoa: KhoaApDungContext): boolean {
  return isBkBatBuocTgs(bk) && resolveBkApDungChoKhoa(bk, khoa);
}

export function listBkBatBuocTgsChoKhoa(
  catalog: BangKiemApDungSource[],
  khoa: KhoaApDungContext,
): BangKiemApDungSource[] {
  return catalog.filter((bk) => isBkBatBuocTgsChoKhoa(bk, khoa));
}

/** Alias intake — BK bắt buộc TGS áp dụng cho khoa. */
export const listBkBatBuocChoKhoa = listBkBatBuocTgsChoKhoa;

/** BK áp dụng cho khoa và gán mạng lưới KSNK khoa (TGS) — dùng tab «BK tôi phải làm». */
export function isBkTuGiamSatChoKhoa(bk: BangKiemApDungSource, khoa: KhoaApDungContext): boolean {
  if (bk.is_active === false) return false;
  const ap = parseApDungJsonb(bk.ap_dung_jsonb, bk);
  return resolveBkApDungChoKhoa(bk, khoa) && ap.bat_buoc.tu_giam_sat;
}

export function listBkTuGiamSatChoKhoa(
  catalog: BangKiemApDungSource[],
  khoa: KhoaApDungContext,
): BangKiemApDungSource[] {
  return catalog.filter((bk) => isBkTuGiamSatChoKhoa(bk, khoa));
}

/** Nhãn ngắn cho bảng danh mục BK. */
export function summarizeApDungForTable(
  bk: Pick<BangKiemApDungSource, "ap_dung_jsonb" | "phan_loai_chuyen_mon" | "loai_giam_sat">,
): {
  phamViLabel: string;
  mucDoLabel: string;
  batBuocTgs: boolean;
  batBuocKsnk: boolean;
  tanSuatLabel: string | null;
  needsKhoaConfig: boolean;
} {
  const ap = parseApDungJsonb(bk.ap_dung_jsonb, bk);
  const norm = normalizeApDungForSave(ap);
  return {
    phamViLabel: PHAM_VI_LABELS[norm.pham_vi],
    mucDoLabel: MUC_DO_LABELS[norm.muc_do],
    batBuocTgs: norm.bat_buoc.tu_giam_sat,
    batBuocKsnk: norm.bat_buoc.ksnk_giam_sat,
    tanSuatLabel: formatTanSuatToiThieu(norm),
    needsKhoaConfig: needsApDungKhoaConfiguration(ap),
  };
}
