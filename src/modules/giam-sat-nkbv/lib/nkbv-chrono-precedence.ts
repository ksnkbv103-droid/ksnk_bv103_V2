/**
 * nkbv-chrono-precedence.ts
 * Kiểm soát trình tự thời gian phân tích sự kiện nhiễm khuẩn bệnh viện.
 * Tuân thủ nguyên tắc CDC/NHSN Chapter 2 và Quyết định 3916/QĐ-BYT:
 * - Giám sát phải tiến hành tuần tự theo thời gian (từ ngày sớm đến ngày muộn).
 * - Các xét nghiệm cận lâm sàng có trước phải được phân tích / xử lý trước.
 * - Các xét nghiệm sau chỉ được phân tích độc lập nếu không nằm trong RIT (14 ngày)
 *   hoặc SBAP của sự kiện trước đó.
 * - NGHIÊM CẤM nhảy cóc xét nghiệm để tránh sai lệch DOE, POA/HAI và LOA.
 */

import { formatDateVi } from "@/lib/format-datetime-vi";

export type ChronoUnresolvedItem = {
  id: string;
  date: string;
  kind: "XN" | "CDHA" | "TIEU_CHUAN";
  label: string;
};

export type ChronoPrecedenceResult =
  | { allowed: true }
  | {
      allowed: false;
      earliestUnresolved: ChronoUnresolvedItem;
      message: string;
    };

export function validateChronoPrecedence(input: {
  targetDate: string;
  targetId: string;
  xnList: Array<{ id: string; ngay?: string | null; benh_pham?: string; vi_khuan?: string }>;
  statusById?: Record<string, string>;
}): ChronoPrecedenceResult {
  const targetDateClean = String(input.targetDate ?? "").slice(0, 10);
  if (!targetDateClean) return { allowed: true };

  // Tìm tất cả các xét nghiệm vi sinh có ngày lấy mẫu trước ngày target mà vẫn đang CHƯA_PHÂN_TÍCH
  const unresolvedEarlier: ChronoUnresolvedItem[] = [];

  for (const x of input.xnList) {
    if (!x.id || x.id === input.targetId || x.id.startsWith("local-")) continue;
    const d = String(x.ngay ?? "").slice(0, 10);
    if (!d || d >= targetDateClean) continue;

    const st = input.statusById?.[x.id] || "CHUA_PHAN_TICH";
    if (st === "CHUA_PHAN_TICH") {
      const label = [x.benh_pham, x.vi_khuan].filter(Boolean).join(" · ") || "Xét nghiệm vi sinh";
      unresolvedEarlier.push({
        id: x.id,
        date: d,
        kind: "XN",
        label,
      });
    }
  }

  if (unresolvedEarlier.length === 0) {
    return { allowed: true };
  }

  // Sắp xếp lấy mẫu sớm nhất chưa phân tích
  unresolvedEarlier.sort((a, b) => a.date.localeCompare(b.date));
  const earliest = unresolvedEarlier[0];

  const earliestDateStr = formatDateVi(earliest.date);
  const targetDateStr = formatDateVi(targetDateClean);

  const message =
    `Theo chuẩn CDC/NHSN & QĐ 3916/QĐ-BYT: Cần phân tích xét nghiệm theo trình tự thời gian (từ sớm đến muộn). ` +
    `Mẫu ngày ${earliestDateStr} (${earliest.label}) chưa được phân tích. ` +
    `Không thể nhảy cóc sang phân tích mẫu ngày ${targetDateStr}. ` +
    `Vui lòng phân tích hoặc xác nhận mẫu ngày ${earliestDateStr} trước để xác định đúng ngày sự kiện (DOE) và khung RIT.`;

  return {
    allowed: false,
    earliestUnresolved: earliest,
    message,
  };
}
