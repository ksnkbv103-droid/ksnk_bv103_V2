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

/** CSSD-034: có phiếu ngược còn hiệu lực (chưa bị từ chối) trỏ về phiếu `phieuId` trong danh sách đang xem. RPC vẫn kiểm lại trong khóa. */
export function coPhieuNguocHieuLuc(
  movs: { phieu_goc_id?: string | null; trang_thai?: unknown }[],
  phieuId: string,
): boolean {
  return movs.some((m) => m.phieu_goc_id === phieuId && normalizeTrangThai(m.trang_thai) !== "TU_CHOI");
}

/** CSSD-034: nút «Lập phiếu ngược» — phiếu XUẤT đã duyệt, chưa là phiếu ngược, chưa có ngược hiệu lực, có quyền sửa kho. */
export function canShowLapPhieuNguoc(input: {
  loai: string;
  trangThai: unknown;
  phieuGocId?: string | null;
  canEdit: boolean;
  coPhieuNguocHieuLuc: boolean;
}): boolean {
  return (
    input.canEdit &&
    input.loai === "XUAT" &&
    normalizeTrangThai(input.trangThai) === "DA_DUYET" &&
    !input.phieuGocId &&
    !input.coPhieuNguocHieuLuc
  );
}

/** CSSD-034: lý do lập phiếu ngược bắt buộc, tối đa 500 ký tự (khớp RPC + zod của action). */
export function validateLyDoPhieuNguoc(lyDo: string | null | undefined): string | null {
  const s = String(lyDo ?? "").trim();
  if (!s) return "Nhập lý do lập phiếu ngược.";
  if (s.length > 500) return "Lý do tối đa 500 ký tự.";
  return null;
}

/** Lý do từ chối bắt buộc; trả lỗi hoặc null. */
export function validateLyDoTuChoi(quyetDinh: "DUYET" | "TU_CHOI", lyDo: string | null | undefined): string | null {
  if (quyetDinh === "TU_CHOI" && !String(lyDo ?? "").trim()) return "Nhập lý do từ chối.";
  return null;
}
