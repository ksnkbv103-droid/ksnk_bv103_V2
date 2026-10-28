/** Quyết định hiển thị nút «Báo hoàn thành» ở toolbar chi tiết (thuần, không I/O). */
export type QlcvBaoHoanThanhMode = "none" | "submit" | "scroll";

export function getQlcvBaoHoanThanhMode(input: {
  trangThai: string;
  isAssignee: boolean;
  usesChecklist: boolean;
  requireKetQuaAt100: boolean;
  /** Đang là đề xuất chờ duyệt hoặc đã ở cổng nghiệm thu: không hiện. */
  blocked: boolean;
}): QlcvBaoHoanThanhMode {
  if (input.blocked || !input.isAssignee) return "none";
  if (!["MOI", "DANG_LAM", "TU_CHOI", "QUA_HAN"].includes(input.trangThai)) return "none";
  if (input.usesChecklist || input.requireKetQuaAt100) return "scroll";
  return "submit";
}
