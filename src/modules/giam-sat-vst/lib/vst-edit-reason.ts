/** Lý do sửa phiên VST khi Admin bypass cửa sổ 30 phút (N-VST-9 / VST-05). */

export const VST_EDIT_REASON_MIN_CHARS = 3;

export function normalizeVstEditReason(raw: string | null | undefined): string {
  return String(raw ?? "").trim();
}

export function isValidVstEditReason(raw: string | null | undefined): boolean {
  return normalizeVstEditReason(raw).length >= VST_EDIT_REASON_MIN_CHARS;
}

/** Prompt client — trả null nếu hủy; chuỗi đã trim nếu OK; throw Error message nếu quá ngắn. */
export function promptVstEditReasonOrThrow(): string {
  const raw = window.prompt(
    `Lý do sửa phiên (bắt buộc, tối thiểu ${VST_EDIT_REASON_MIN_CHARS} ký tự):`,
    "",
  );
  if (raw == null) throw new Error("__VST_EDIT_REASON_CANCELLED__");
  const lyDo = normalizeVstEditReason(raw);
  if (!isValidVstEditReason(lyDo)) {
    throw new Error(`Lý do sửa phải tối thiểu ${VST_EDIT_REASON_MIN_CHARS} ký tự.`);
  }
  return lyDo;
}
