/**
 * Client-side cache cho danh mục tĩnh (KHOA_PHONG / NGHE_NGHIEP / KHU_VUC_GIAM_SAT / LOAI_NKBV / CHUC_VU / CHUC_DANH).
 *
 * Mục tiêu: cùng 1 tab, mở nhiều form khác nhau không phải gọi lại server action
 * `@/lib/master-data/categories-by-type` (mỗi lần ~300–600 ms RSC round-trip), giảm trầm trọng số
 * request `?_rsc=` thấy trong Network tab khi điều hướng giữa GSC / VST / dashboard.
 *
 * Đặc tính an toàn:
 *  - Lưu vào `sessionStorage` → tự dọn khi đóng tab, không "đầu độc" lâu dài.
 *  - TTL 15 phút (khớp `unstable_cache` server: revalidate 900s).
 *  - Có hàm `invalidateClientDanhMucCache()` để gọi sau khi user CRUD danh mục
 *    trong module Quản trị (bắt buộc khi vận hành).
 *  - Phòng vệ JSON parse / quota lỗi: rơi về fetch trực tiếp.
 */

const TTL_MS = 15 * 60_000;
const KEY_PREFIX = "ksnk:dm-cache:";
const STATIC_TYPES = new Set([
  "KHOA_PHONG",
  "NGHE_NGHIEP",
  "KHU_VUC_GIAM_SAT",
  "LOAI_NKBV",
  "CHUC_VU",
  "CHUC_DANH",
]);

/** Loose để khớp signature `getCategoriesByType` (success: boolean, data optional). */
export type DanhMucResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

function isBrowserStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readCache<T>(type: string): T | null {
  if (!isBrowserStorageAvailable()) return null;
  try {
    const raw = window.sessionStorage.getItem(KEY_PREFIX + type);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: T; at: number } | null;
    if (!parsed || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

function writeCache<T>(type: string, value: T): void {
  if (!isBrowserStorageAvailable()) return;
  try {
    window.sessionStorage.setItem(
      KEY_PREFIX + type,
      JSON.stringify({ v: value, at: Date.now() }),
    );
  } catch {
    // Quota / private mode — bỏ qua, lần sau fetch lại.
  }
}

/**
 * Gọi `fetcher` lần đầu, các lần sau trong cùng tab (≤15 phút) trả từ sessionStorage.
 * Chỉ cache các `type` thuộc nhóm tĩnh; loại khác (vd. dictionary động) gọi thẳng `fetcher`.
 */
export async function getCategoriesByTypeCached<T>(
  type: string,
  fetcher: (t: string) => Promise<DanhMucResult<T>>,
): Promise<DanhMucResult<T>> {
  if (!STATIC_TYPES.has(type)) return fetcher(type);

  const cached = readCache<T>(type);
  if (cached !== null) return { success: true, data: cached };

  const res = await fetcher(type);
  if (res.success && res.data !== undefined) writeCache(type, res.data);
  return res;
}

/** Gọi sau khi CRUD danh mục (module Quản trị) để đảm bảo các tab khác sẽ fetch mới khi mở. */
export function invalidateClientDanhMucCache(type?: string): void {
  if (!isBrowserStorageAvailable()) return;
  try {
    if (type) {
      window.sessionStorage.removeItem(KEY_PREFIX + type);
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
