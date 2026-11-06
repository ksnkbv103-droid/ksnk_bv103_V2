import { format, parseISO, startOfMonth, startOfQuarter, startOfYear, subMonths } from "date-fns";
import { todayYmdInVn } from "@/lib/format-datetime-vi";

/**
 * Mốc bắt đầu dữ liệu giám sát KSNK sớm nhất trong cơ sở dữ liệu BV103 (tháng 09/2023).
 */
export const BV103_ANALYTICS_ALL_TIME_START = "2023-09-01";

/**
 * Số **tháng lịch** (đầu tháng → đến ngày) mặc định cho dashboard / báo cáo tổng hợp.
 * Trước đây 12 tháng — rút xuống để giảm khối lượng RPC; người dùng vẫn mở rộng trong UI.
 * Pilot EXPLAIN (cùng cửa sổ mặc định): `scripts/sql/pilot-dashboard-rpc-explain-hybrid.sql`.
 */
const BV103_ANALYTICS_DEFAULT_MONTHS = 3;

const monthSpanMinusOne = BV103_ANALYTICS_DEFAULT_MONTHS - 1;

/** `denIso` dạng `yyyy-MM-dd` → `tu` đầu tháng cách `BV103_ANALYTICS_DEFAULT_MONTHS` tháng. */
export function bv103DefaultTuNgayFromDenIso(denIso: string): string {
  const den = parseISO(denIso);
  return format(startOfMonth(subMonths(den, monthSpanMinusOne)), "yyyy-MM-dd");
}

/** Hôm nay làm `đến ngày` ngầm định → `tu` đầu tháng theo cùng quy tắc. */
export function bv103DefaultTuNgayFromToday(): string {
  return bv103DefaultTuNgayFromDenIso(todayYmdInVn());
}

export type Bv103DatePresetId =
  | "toan_bo"
  | "nam_nay"
  | "12_thang"
  | "quy_nay"
  | "3_thang"
  | "thang_nay";

export type Bv103DatePreset = {
  id: Bv103DatePresetId;
  label: string;
  tuNgay: string;
  denNgay: string;
};

/** Tạo danh sách các preset khoảng thời gian thông dụng cho bộ lọc analytics. */
export function getBv103AnalyticsPresets(denIso?: string): Bv103DatePreset[] {
  const denStr = denIso || todayYmdInVn();
  const denDate = parseISO(denStr);

  return [
    {
      id: "toan_bo",
      label: "Toàn bộ",
      tuNgay: BV103_ANALYTICS_ALL_TIME_START,
      denNgay: denStr,
    },
    {
      id: "nam_nay",
      label: "Năm nay",
      tuNgay: format(startOfYear(denDate), "yyyy-MM-dd"),
      denNgay: denStr,
    },
    {
      id: "12_thang",
      label: "12 tháng",
      tuNgay: format(startOfMonth(subMonths(denDate, 11)), "yyyy-MM-dd"),
      denNgay: denStr,
    },
    {
      id: "quy_nay",
      label: "Quý này",
      tuNgay: format(startOfQuarter(denDate), "yyyy-MM-dd"),
      denNgay: denStr,
    },
    {
      id: "3_thang",
      label: "3 tháng",
      tuNgay: bv103DefaultTuNgayFromDenIso(denStr),
      denNgay: denStr,
    },
    {
      id: "thang_nay",
      label: "Tháng này",
      tuNgay: format(startOfMonth(denDate), "yyyy-MM-dd"),
      denNgay: denStr,
    },
  ];
}
