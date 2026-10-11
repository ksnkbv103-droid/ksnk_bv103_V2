/** Lý do sửa phiên VST khi Admin bypass cửa sổ 30 phút (N-VST-9 / VST-05). */

export const VST_EDIT_REASON_MIN_CHARS = 3;

export function normalizeVstEditReason(raw: string | null | undefined): string {
  return String(raw ?? "").trim();
}

export function isValidVstEditReason(raw: string | null | undefined): boolean {
  return normalizeVstEditReason(raw).length >= VST_EDIT_REASON_MIN_CHARS;
}
