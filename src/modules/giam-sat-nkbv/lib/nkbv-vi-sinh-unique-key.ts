import crypto from "crypto";

/** Khóa idempotency import LIS — SSOT: mã xét nghiệm duy nhất. */
export function buildViSinhUniqueKey(input: { ma_xet_nghiem: string }): string {
  return String(input.ma_xet_nghiem || "").trim();
}

/** Chỉ dùng để đối chiếu dữ liệu cũ (metadata.unique_key MD5). Import mới dùng ma_xet_nghiem. */
export function buildLegacyViSinhMd5Key(input: {
  ma_benh_nhan: string;
  ma_benh_an: string;
  ma_benh_pham: string;
  tac_nhan: string;
}): string {
  return crypto
    .createHash("md5")
    .update(`${input.ma_benh_nhan}_${input.ma_benh_an}_${input.ma_benh_pham}_${input.tac_nhan}`)
    .digest("hex");
}
