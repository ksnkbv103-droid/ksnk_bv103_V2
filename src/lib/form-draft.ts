/**
 * Bản nháp form giám sát (localStorage) — chống mất dữ liệu khi tải lại trang / tắt máy.
 * Chỉ dùng từ client. Lỗi storage (đầy, chế độ riêng tư) bị nuốt: nháp là tiện ích, không chặn nhập liệu.
 */

const PREFIX = "bv103_form_draft_v1:";
export const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type Envelope<T> = { savedAt: number; data: T };

export function readDraft<T>(key: string, now = Date.now()): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || typeof env.savedAt !== "number" || now - env.savedAt > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return env.data ?? null;
  } catch {
    return null;
  }
}

export function writeDraft<T>(key: string, data: T, now = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: now, data } satisfies Envelope<T>));
  } catch {
    /* quota / private mode */
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
