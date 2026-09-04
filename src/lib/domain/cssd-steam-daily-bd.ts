/**
 * QT.21 — Bowie–Dick đầu ngày trên máy steam (≠ BD trên form QC mẻ).
 * Lưu trên `cssd_dm_thiet_bi.specs`: bd_dau_ngay_ymd, bd_dau_ngay_ket_qua (DAT|KHONG_DAT).
 */

import { todayYmdInVn } from "@/lib/format-datetime-vi";

export type SteamDailyBdSpecs = {
  bd_dau_ngay_ymd?: string | null;
  bd_dau_ngay_ket_qua?: string | null;
};

export type SteamDailyBdGateInput = {
  isSteam: boolean;
  specs?: SteamDailyBdSpecs | Record<string, unknown> | null;
  todayYmd?: string;
  /**
   * QT.21: mặc định true — thiếu BD ĐẠT hôm nay → chặn tạo/chốt nạp.
   * Chỉ truyền false khi cần soft-warning (legacy / tạm thời).
   */
  requireRecorded?: boolean;
};

function todayYmdOperational(d = new Date()): string {
  return todayYmdInVn(d);
}

export function readSteamDailyBdFromSpecs(
  specs?: SteamDailyBdSpecs | Record<string, unknown> | null,
): { ymd: string | null; ketQua: string | null } {
  if (!specs || typeof specs !== "object") return { ymd: null, ketQua: null };
  const s = specs as SteamDailyBdSpecs;
  const ymd = String(s.bd_dau_ngay_ymd || "").trim().slice(0, 10) || null;
  const ketQua = String(s.bd_dau_ngay_ket_qua || "")
    .trim()
    .toUpperCase() || null;
  return { ymd, ketQua };
}

export type SteamDailyBdResult =
  | { ok: true; warning?: string }
  | { ok: false; message: string };

/** Cổng nạp mẻ steam (QT.21): KHONG_DAT / thiếu BD ĐẠT hôm nay → chặn; soft chỉ khi requireRecorded=false. */
export function assertSteamDailyBdForLoad(input: SteamDailyBdGateInput): SteamDailyBdResult {
  if (!input.isSteam) return { ok: true };

  const today = input.todayYmd || todayYmdOperational();
  const { ymd, ketQua } = readSteamDailyBdFromSpecs(input.specs);
  const requireRecorded = input.requireRecorded !== false;

  if (ymd === today && ketQua === "KHONG_DAT") {
    return {
      ok: false,
      message:
        "Bowie–Dick đầu ngày KHÔNG ĐẠT trên máy steam — không được nạp mẻ. Xử lý máy / BD lại trước khi nạp.",
    };
  }

  if (ymd === today && ketQua === "DAT") return { ok: true };

  if (requireRecorded) {
    return {
      ok: false,
      message:
        "Máy steam chưa có Bowie–Dick đầu ngày ĐẠT hôm nay — ghi nhận BD trước khi nạp mẻ (QT.21).",
    };
  }

  return {
    ok: true,
    warning:
      "Máy steam chưa ghi BD đầu ngày hôm nay trên hồ sơ máy — nên ghi nhận BD ĐẠT trước khi nạp (QT.21).",
  };
}

export function buildSteamDailyBdSpecsPatch(args: {
  ymd: string;
  ketQua: "DAT" | "KHONG_DAT";
  existing?: Record<string, unknown> | null;
}): Record<string, unknown> {
  const base = args.existing && typeof args.existing === "object" ? { ...args.existing } : {};
  return {
    ...base,
    bd_dau_ngay_ymd: String(args.ymd).slice(0, 10),
    bd_dau_ngay_ket_qua: args.ketQua,
  };
}
