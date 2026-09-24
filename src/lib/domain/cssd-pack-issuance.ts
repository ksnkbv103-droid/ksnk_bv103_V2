import { todayYmdInVn } from "@/lib/format-datetime-vi";

/**
 * QT.22 / PCI.03.02 — cổng cấp phát gói vô khuẩn.
 * Gói thiếu tinh_trang/HSD, hoặc ướt / rách / hỏng / quá hạn = không cấp phát (ướt = bẩn → tái xử lý).
 */

export const PACK_DEFAULT_ISSUABLE_TINH_TRANG = "BINH_THUONG" as const;

export const PACK_NON_ISSUABLE_TINH_TRANG = [
  "UOT",
  "GOI_UOT",
  "WET",
  "RACH",
  "TORN",
  "DAMAGED",
  "BAN",
  "HONG",
  "MAT",
] as const;

/** Giá trị tinh_trang được phép ghi từ kho / kiểm gói trước CAP_PHAT. */
export const PACK_RECORDABLE_TINH_TRANG = [
  PACK_DEFAULT_ISSUABLE_TINH_TRANG,
  "UOT",
  "GOI_UOT",
  "RACH",
  "BAN",
  "HONG",
  "MAT",
] as const;

export type PackRecordableTinhTrang = (typeof PACK_RECORDABLE_TINH_TRANG)[number];

export type PackBatchReleaseGate = {
  /** `trang_thai_me` của mẻ gắn bộ. Thiếu hoặc khác HOAN_THANH → chặn. */
  trangThaiMe?: string | null;
  /** Sự cố tiệt khuẩn OPEN hoặc đã xác nhận gắn mẻ/bộ. */
  hasOpenSterilizationIncident?: boolean | null;
};

export type PackIssuanceInput = {
  han_su_dung?: string | null;
  ngay_het_han?: string | null;
  tinh_trang?: string | null;
  is_red_alert?: boolean | null;
  is_dong_bang?: boolean | null;
  /** YYYY-MM-DD — mặc định hôm nay theo lịch VN (Asia/Ho_Chi_Minh). */
  todayYmd?: string;
  /**
   * Cổng mẻ khi cấp phát thật. Bỏ qua chỉ với lời gọi cũ không đụng mẻ.
   * Khi có: mẻ phải HOAN_THANH, không CHO_BI, không sự cố tiệt khuẩn mở/đã xác nhận.
   */
  batchRelease?: PackBatchReleaseGate | null;
};

function normalizeHanYmd(raw?: string | null): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  return s.slice(0, 10);
}

export function isSterilePackExpired(
  han?: string | null,
  todayYmd?: string,
): boolean {
  const h = normalizeHanYmd(han);
  if (!h || !/^\d{4}-\d{2}-\d{2}$/.test(h)) return false;
  const today = todayYmd || todayYmdInVn();
  return h < today;
}

export function normalizePackTinhTrang(raw?: string | null): string {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/** Nhận diện gói ướt / rách / bẩn từ mã tinh_trang hoặc ghi chú ngắn. */
export function isWetOrDamagedPackTinhTrang(raw?: string | null): boolean {
  const t = normalizePackTinhTrang(raw);
  if (!t) return false;
  if ((PACK_NON_ISSUABLE_TINH_TRANG as readonly string[]).includes(t)) return true;
  if (t.includes("UOT") || t.includes("WET")) return true;
  if (t.includes("RACH") || t.includes("TORN")) return true;
  if (t === "BAN" || t.startsWith("BAN_")) return true;
  return false;
}

const BLOCKING_INCIDENT_STATUS = new Set(["OPEN", "CONFIRMED", "DA_XAC_NHAN"]);

function incidentStatus(attrs: Record<string, unknown> | null | undefined): string {
  const raw = String(attrs?.INCIDENT_STATUS ?? attrs?.incident_status ?? "OPEN").trim().toUpperCase();
  return raw || "OPEN";
}

/** Sự cố tiệt khuẩn còn mở hoặc đã xác nhận, gắn đúng bộ hoặc đúng mẻ. */
export function isBlockingSterilizationIncident(
  row: {
    quy_trinh_id?: string | null;
    ma_tram_phat_hien?: string | null;
    ma_tram_gay_loi?: string | null;
    attributes?: Record<string, unknown> | null;
    is_active?: boolean | null;
  },
  scope: { quyTrinhId: string; loTietKhuanId?: string | null },
): boolean {
  if (row.is_active === false) return false;
  const attrs = row.attributes && typeof row.attributes === "object" ? row.attributes : {};
  const status = incidentStatus(attrs);
  if (!BLOCKING_INCIDENT_STATUS.has(status)) return false;

  const loId = String(scope.loTietKhuanId || "").trim();
  const linkedLo = String(attrs.LO_TIET_KHUAN_ID ?? attrs.lo_tiet_khuan_id ?? "").trim();
  const linkedSet = String(row.quy_trinh_id || "").trim() === String(scope.quyTrinhId || "").trim();
  const linkedBatch = Boolean(loId) && linkedLo === loId;
  if (!linkedSet && !linkedBatch) return false;

  const group = String(attrs.INCIDENT_GROUP ?? attrs.incident_group ?? "").trim().toUpperCase();
  const typeCode = String(attrs.INCIDENT_TYPE_CODE ?? "").trim().toUpperCase();
  const tram = `${row.ma_tram_phat_hien || ""} ${row.ma_tram_gay_loi || ""}`.toUpperCase();
  return group === "PROCESS" || typeCode.startsWith("PROCESS_") || tram.includes("TIET_KHUAN");
}

export type PackIssuanceResult = { ok: true } | { ok: false; message: string };

/**
 * Hard-block trước CAP_PHAT / xác nhận cấp phát kho sạch.
 * Bắt buộc có tinh_trang + HSD hợp lệ — thiếu field = chặn có message (không fail im lặng).
 * Không thay gate mẻ ĐẠT / ledger soft-warning.
 */
export function assertPackIssuable(input: PackIssuanceInput): PackIssuanceResult {
  if (input.is_dong_bang) {
    return { ok: false, message: "Bộ đang khóa an toàn — không cấp phát." };
  }
  if (input.is_red_alert) {
    return {
      ok: false,
      message: "Bộ đang cảnh báo đỏ (sự cố) — không cấp phát cho đến khi xử lý.",
    };
  }
  if (input.batchRelease) {
    const trang = String(input.batchRelease.trangThaiMe || "").trim().toUpperCase();
    if (trang === "CHO_BI") {
      return { ok: false, message: "Mẻ đang chờ kết quả BI — bộ chưa được nhả, không cấp phát." };
    }
    if (trang !== "HOAN_THANH") {
      return { ok: false, message: "Mẻ của bộ chưa hoàn thành — không cấp phát." };
    }
    if (input.batchRelease.hasOpenSterilizationIncident) {
      return {
        ok: false,
        message: "Mẻ hoặc bộ đang có sự cố tiệt khuẩn chưa đóng — không cấp phát.",
      };
    }
  }

  const tinh = normalizePackTinhTrang(input.tinh_trang);
  if (!tinh) {
    return {
      ok: false,
      message:
        "Thiếu tình trạng gói (tinh_trang) — không cấp phát. Ghi nhận tình trạng tại Kho dụng cụ trước khi CAP_PHAT.",
    };
  }
  if (tinh === "HONG") {
    return { ok: false, message: "Bộ đã báo hỏng — không cấp phát." };
  }
  if (tinh === "MAT") {
    return { ok: false, message: "Bộ đã báo mất — không cấp phát." };
  }
  if (isWetOrDamagedPackTinhTrang(input.tinh_trang)) {
    return {
      ok: false,
      message:
        "Gói ướt / rách / hỏng bao bì = bẩn (PCI.03.02) — không cấp phát. Chuyển tái xử lý (làm sạch).",
    };
  }

  const han = normalizeHanYmd(input.han_su_dung) || normalizeHanYmd(input.ngay_het_han);
  if (!han || !/^\d{4}-\d{2}-\d{2}$/.test(han)) {
    return {
      ok: false,
      message:
        "Thiếu hạn sử dụng (HSD) — không cấp phát. Hoàn tất mẻ tiệt khuẩn ĐẠT để gán HSD, hoặc bổ sung HSD trên quy trình.",
    };
  }
  if (isSterilePackExpired(han, input.todayYmd)) {
    return {
      ok: false,
      message: `Gói đã quá hạn sử dụng (${han}) — không cấp phát. Thu hồi / tái xử lý.`,
    };
  }

  return { ok: true };
}
