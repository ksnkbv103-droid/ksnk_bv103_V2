/** Lý do sửa/xóa phiên VST (N-VST-9 / VST-05). @dac-ta R1.24, R1.25 — PO 2026-11-13: tối thiểu 10 ký tự. */

export const VST_EDIT_REASON_MIN_CHARS = 10;

export function normalizeVstEditReason(raw: string | null | undefined): string {
  return String(raw ?? "").trim();
}

export function isValidVstEditReason(raw: string | null | undefined): boolean {
  return normalizeVstEditReason(raw).length >= VST_EDIT_REASON_MIN_CHARS;
}
