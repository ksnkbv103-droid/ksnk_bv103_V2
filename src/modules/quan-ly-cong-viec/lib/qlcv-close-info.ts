import { hasQlcvChecklistFullResult } from "@/lib/domain/qlcv/close-requires-result";

/** Đọc kết quả đóng việc và người nghiệm thu từ nhật ký — thuần, không I/O. */

export function extractQlcvCloseResultText(data: {
  nhat_ky?: unknown;
  checklist?: unknown;
  hoat_dong?: { loai_hoat_dong?: string; noi_dung?: string | null }[] | null;
}): string | null {
  if (hasQlcvChecklistFullResult(data.checklist)) return "Checklist đủ 100%";
  const fromHoatDong = Array.isArray(data.hoat_dong) ? data.hoat_dong : [];
  const fromNhatKy = Array.isArray(data.nhat_ky)
    ? (data.nhat_ky as { loai_hoat_dong?: string; noi_dung?: string | null }[])
    : [];
  const entries = fromHoatDong.length ? fromHoatDong : fromNhatKy;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const loai = String(e.loai_hoat_dong ?? "");
    const noi = String(e.noi_dung ?? "").trim();
    if (!noi) continue;
    if (loai === "HOAN_THANH" || loai === "DUYET_HOAN_THANH" || noi.startsWith("Kết quả:")) {
      // Nhãn «Kết quả» đã nằm ở tiêu đề ô — bỏ tiền tố lưu trong nhật ký để khỏi lặp.
      return noi.replace(/^Kết quả:\s*/u, "") || noi;
    }
  }
  return null;
}

/** Người nghiệm thu cuối — lấy từ nhật ký (SSOT AB-2A), không thêm cột. */
export function extractQlcvLastApproverName(data: {
  hoat_dong?: { loai_hoat_dong?: string; nguoi?: { ho_ten?: string | null } | null }[] | null;
}): string | null {
  const entries = Array.isArray(data.hoat_dong) ? data.hoat_dong : [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const loai = String(entries[i].loai_hoat_dong ?? "");
    if (loai === "HOAN_THANH" || loai === "DUYET_HOAN_THANH") {
      return entries[i].nguoi?.ho_ten?.trim() || null;
    }
  }
  return null;
}
