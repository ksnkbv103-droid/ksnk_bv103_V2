/**
 * QT.21 — Bowie–Dick đầu ngày trên máy steam (≠ BD trên form QC mẻ).
 * Lưu specs `bd_dau_ngay_*` + (ME-02) bảng sự kiện `cssd_fact_bowie_dick` khi migration apply.
 */

import { todayYmdInVn } from "@/lib/format-datetime-vi";

export type SteamDailyBdSpecs = {
  bd_dau_ngay_ymd?: string | null;
  bd_dau_ngay_ket_qua?: string | null;
  bd_dau_ngay_at?: string | null;
  bd_dau_ngay_nguoi_id?: string | null;
  /** ME-02: mốc hoàn thành bảo trì gần nhất sau BD hỏng — BD đạt phải sau mốc này. */
  bd_hold_bao_tri_xong_at?: string | null;
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
  /** Máy đang tạm giữ vì BD hỏng (HOLD_QC). */
  machineHeldForBd?: boolean;
  /** Thời điểm hoàn thành phiếu bảo trì gần nhất (ISO). */
  baoTriCompletedAt?: string | null;
};

function todayYmdOperational(d = new Date()): string {
  return todayYmdInVn(d);
}

export function readSteamDailyBdFromSpecs(
  specs?: SteamDailyBdSpecs | Record<string, unknown> | null,
): { ymd: string | null; ketQua: string | null; at: string | null } {
  if (!specs || typeof specs !== "object") return { ymd: null, ketQua: null, at: null };
  const s = specs as SteamDailyBdSpecs;
  const ymd = String(s.bd_dau_ngay_ymd || "").trim().slice(0, 10) || null;
  const ketQua = String(s.bd_dau_ngay_ket_qua || "")
    .trim()
    .toUpperCase() || null;
  const at = String(s.bd_dau_ngay_at || "").trim() || null;
  return { ymd, ketQua, at };
}

export type SteamDailyBdResult =
  | { ok: true; warning?: string }
  | { ok: false; message: string };

export function shouldHoldMachineAfterBdFail(ketQua: string): boolean {
  return String(ketQua || "").trim().toUpperCase() === "KHONG_DAT";
}

/** Client không được ghi lùi/tiến ngày — chỉ chấp nhận đúng ngày server (hoặc không truyền). */
export function steamBdClientYmdAllowed(clientYmd: string | null | undefined, serverYmd: string): boolean {
  const c = String(clientYmd || "").trim().slice(0, 10);
  if (!c) return true;
  return c === String(serverYmd || "").trim().slice(0, 10);
}

/**
 * Cổng nạp mẻ steam (QT.21 / M-11):
 * - KHONG_DAT hôm nay → chặn
 * - thiếu BD ĐẠT hôm nay → chặn
 * - sau BD hỏng: cần bảo trì xong + BD ĐẠT ghi sau thời điểm hoàn thành
 */
export function assertSteamDailyBdForLoad(input: SteamDailyBdGateInput): SteamDailyBdResult {
  if (!input.isSteam) return { ok: true };

  const today = input.todayYmd || todayYmdOperational();
  const { ymd, ketQua, at } = readSteamDailyBdFromSpecs(input.specs);
  const requireRecorded = input.requireRecorded !== false;
  const holdUntil =
    String((input.specs as SteamDailyBdSpecs | null)?.bd_hold_bao_tri_xong_at || "").trim() ||
    String(input.baoTriCompletedAt || "").trim() ||
    null;

  if (ymd === today && ketQua === "KHONG_DAT") {
    return {
      ok: false,
      message:
        "Bowie–Dick đầu ngày KHÔNG ĐẠT — máy tạm giữ; chỉ mở lại sau bảo trì xong và BD đạt mới.",
    };
  }

  if (input.machineHeldForBd || holdUntil) {
    if (ymd !== today || ketQua !== "DAT") {
      return {
        ok: false,
        message: "Máy tạm giữ sau BD hỏng — cần bảo trì xong và ghi BD đạt mới trước khi tạo mẻ.",
      };
    }
    if (holdUntil) {
      const bdAt = at ? Date.parse(at) : NaN;
      const doneAt = Date.parse(holdUntil);
      if (Number.isFinite(doneAt) && (!Number.isFinite(bdAt) || bdAt < doneAt)) {
        return {
          ok: false,
          message: "Cần ghi Bowie–Dick ĐẠT sau khi hoàn thành bảo trì.",
        };
      }
    }
  }

  if (ymd === today && ketQua === "DAT") return { ok: true };

  if (requireRecorded) {
    return {
      ok: false,
      message:
        "Máy hơi nước chưa có Bowie–Dick đầu ngày ĐẠT hôm nay — ghi nhận BD trước khi tạo mẻ.",
    };
  }

  return {
    ok: true,
    warning:
      "Máy hơi nước chưa ghi BD đầu ngày hôm nay trên hồ sơ máy — nên ghi nhận BD đạt trước khi nạp.",
  };
}

export function buildSteamDailyBdSpecsPatch(args: {
  ymd: string;
  ketQua: "DAT" | "KHONG_DAT";
  existing?: Record<string, unknown> | null;
  actorUserId?: string | null;
  atIso?: string | null;
  /** Giữ mốc chờ BD sau bảo trì (không xóa khi ghi BD mới nếu vẫn cần). */
  keepHoldBaoTriXongAt?: string | null;
  clearHoldBaoTriXongAt?: boolean;
}): Record<string, unknown> {
  const base = args.existing && typeof args.existing === "object" ? { ...args.existing } : {};
  const next: Record<string, unknown> = {
    ...base,
    bd_dau_ngay_ymd: String(args.ymd).slice(0, 10),
    bd_dau_ngay_ket_qua: args.ketQua,
    bd_dau_ngay_at: args.atIso || new Date().toISOString(),
    bd_dau_ngay_nguoi_id: args.actorUserId ? String(args.actorUserId) : null,
  };
  if (args.clearHoldBaoTriXongAt) {
    delete next.bd_hold_bao_tri_xong_at;
  } else if (args.keepHoldBaoTriXongAt) {
    next.bd_hold_bao_tri_xong_at = args.keepHoldBaoTriXongAt;
  }
  return next;
}

/** Dòng in phiếu mẻ hơi nước. */
export function formatSteamBdPrintLine(input: {
  isSteam: boolean;
  specs?: SteamDailyBdSpecs | Record<string, unknown> | null;
  nguoiLabel?: string | null;
}): string {
  if (!input.isSteam) return "Không áp dụng";
  const { ymd, ketQua, at } = readSteamDailyBdFromSpecs(input.specs);
  if (!ymd || !ketQua) return "Chưa ghi";
  const gio = at && Number.isFinite(Date.parse(at))
    ? new Date(at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "—";
  const kq = ketQua === "DAT" ? "Đạt" : ketQua === "KHONG_DAT" ? "Không đạt" : ketQua;
  const nguoi = String(input.nguoiLabel || "").trim();
  return `${kq} · ${gio}${nguoi ? ` · ${nguoi}` : ""}`;
}
