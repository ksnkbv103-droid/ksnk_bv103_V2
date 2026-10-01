/**
 * Soft: bổ sung người bệnh trên phiên WHO VST — parity GSC metadata keys.
 * Persist vào `gstt_fact_vst_sessions.metadata` khi cột có (migration Soft-local).
 * Default off = is_bo_sung_nguoi_benh false / không gắn NB; không reject khi tắt.
 */

import {
  parseGscBoSungNbFromUnknown,
  serializeGscBoSungNbForMetadata,
  type GscBoSungNbFields,
} from "@/modules/giam-sat-chung/lib/gsc-bo-sung-nguoi-benh";

export type VstBoSungNbSessionSlice = {
  is_bo_sung_nguoi_benh?: boolean;
  ma_benh_an?: string | null;
  ma_nguoi_benh?: string | null;
  ten_nguoi_benh?: string | null;
  so_giuong_nguoi_benh?: string | null;
  /** Form phiên gửi chuỗi; `parseGscBoSungNbFromUnknown` mới siết về phenotype. */
  bn_mdro_phenotype?: string | null;
} & Omit<Partial<GscBoSungNbFields>, "bn_mdro_phenotype">;

export type VstBoSungNbMetadata = {
  is_bo_sung_nguoi_benh: boolean;
  ma_benh_an: string | null;
  ma_nguoi_benh: string | null;
  ten_nguoi_benh: string | null;
  so_giuong_nguoi_benh: string | null;
} & Record<string, string | boolean | null>;

/** Chuẩn hóa ảnh chụp NB từ form/session — tắt = false + null fields (gan_nb=false). */
export function buildVstBoSungNbMetadata(input: VstBoSungNbSessionSlice): VstBoSungNbMetadata {
  const boSungRaw = Boolean(input.is_bo_sung_nguoi_benh);
  const maBa = String(input.ma_benh_an ?? "").trim() || null;
  const maNb = String(input.ma_nguoi_benh ?? "").trim() || null;
  const tenNb = String(input.ten_nguoi_benh ?? "").trim() || null;
  const giuongNb = String(input.so_giuong_nguoi_benh ?? "").trim() || null;
  const boSungEffective = boSungRaw && Boolean(maBa || maNb || tenNb || giuongNb);
  const snap = parseGscBoSungNbFromUnknown(input);
  return {
    is_bo_sung_nguoi_benh: boSungEffective,
    ma_benh_an: boSungEffective ? maBa : null,
    ma_nguoi_benh: boSungEffective ? maNb : null,
    ten_nguoi_benh: boSungEffective ? tenNb : null,
    so_giuong_nguoi_benh: boSungEffective ? giuongNb : null,
    ...serializeGscBoSungNbForMetadata(snap, boSungEffective),
  };
}

const VST_NB_COLUMN_HINTS = [
  "metadata",
  "is_bo_sung_nguoi_benh",
  "ma_benh_an",
  "ma_nguoi_benh",
  "ten_nguoi_benh",
  "so_giuong_nguoi_benh",
] as const;

/** PostgREST / Postgres: cột metadata / flatten NB chưa apply migrate. */
export function isVstSessionsMetadataColumnMissing(error: unknown): boolean {
  const msg = String(
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message
      : error instanceof Error
        ? error.message
        : error ?? "",
  ).toLowerCase();
  if (!msg) return false;
  const mentionsNbCol = VST_NB_COLUMN_HINTS.some((h) => msg.includes(h));
  const missingHint =
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache") ||
    msg.includes("pgrst204") ||
    msg.includes("42703");
  return mentionsNbCol && missingHint;
}

/** Hydrate form từ view/session row (metadata đã flatten hoặc còn jsonb). */
export function parseVstBoSungNbFromSessionRow(
  row: Record<string, unknown> | null | undefined,
): {
  is_bo_sung_nguoi_benh: boolean;
  ma_benh_an: string;
  ma_nguoi_benh: string;
  ten_nguoi_benh: string;
  so_giuong_nguoi_benh: string;
} & GscBoSungNbFields {
  const meta =
    row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const pick = (key: string): unknown =>
    row?.[key] !== undefined && row?.[key] !== null ? row[key] : meta[key];

  const isOn = Boolean(pick("is_bo_sung_nguoi_benh"));
  const snap = parseGscBoSungNbFromUnknown({
    bn_tho_may: pick("bn_tho_may"),
    bn_phau_thuat: pick("bn_phau_thuat"),
    bn_cvc: pick("bn_cvc"),
    bn_foley: pick("bn_foley"),
    bn_nhiem_mdro: pick("bn_nhiem_mdro"),
    bn_mdro_phenotype: pick("bn_mdro_phenotype"),
    bn_nhiem_tac_nhan_nguy_hiem: pick("bn_nhiem_tac_nhan_nguy_hiem"),
    bn_tac_nhan_nguy_hiem_ten: pick("bn_tac_nhan_nguy_hiem_ten"),
  });
  return {
    is_bo_sung_nguoi_benh: isOn,
    ma_benh_an: String(pick("ma_benh_an") ?? "").trim(),
    ma_nguoi_benh: String(pick("ma_nguoi_benh") ?? "").trim(),
    ten_nguoi_benh: String(pick("ten_nguoi_benh") ?? "").trim(),
    so_giuong_nguoi_benh: String(pick("so_giuong_nguoi_benh") ?? "").trim(),
    ...snap,
  };
}
