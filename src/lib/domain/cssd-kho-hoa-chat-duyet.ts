/** HC-C: trạng thái duyệt phiếu kho hóa chất (thuần, dùng chung UI + action). */
export type KhoHcTrangThai = "CHO_DUYET" | "DA_DUYET" | "TU_CHOI";

export function normalizeTrangThai(v: unknown): KhoHcTrangThai {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "CHO_DUYET" || s === "TU_CHOI") return s;
  return "DA_DUYET";
}

export function trangThaiLabel(v: unknown): string {
  const t = normalizeTrangThai(v);
  if (t === "CHO_DUYET") return "Chờ duyệt";
  if (t === "TU_CHOI") return "Từ chối";
  return "Đã duyệt";
}

/** Hiện nút Duyệt/Từ chối: phiếu còn chờ + có quyền approve; chặn người lập (RPC cũng chặn, trừ ngoại lệ). */
export function canShowDuyetButtons(input: {
  trangThai: unknown;
  canApprove: boolean;
  createdBy?: string | null;
  currentUserId?: string | null;
}): boolean {
  if (!input.canApprove) return false;
  return normalizeTrangThai(input.trangThai) === "CHO_DUYET";
}

/** Lý do từ chối bắt buộc; trả lỗi hoặc null. */
export function validateLyDoTuChoi(quyetDinh: "DUYET" | "TU_CHOI", lyDo: string | null | undefined): string | null {
  if (quyetDinh === "TU_CHOI" && !String(lyDo ?? "").trim()) return "Nhập lý do từ chối.";
  return null;
}
