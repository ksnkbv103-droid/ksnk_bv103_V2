/**
 * Hiển thị lỗi từ Supabase/PostgREST: object thường không phải `instanceof Error`
 * nên không được coi là "lỗi không xác định".
 */
export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    const parts: string[] = [];
    const msg = o.message;
    if (typeof msg === "string" && msg.trim()) parts.push(msg.trim());
    const det = o.details;
    if (typeof det === "string" && det.trim()) parts.push(det.trim());
    const hint = o.hint;
    if (typeof hint === "string" && hint.trim()) parts.push(`Gợi ý: ${hint.trim()}`);
    const code = o.code;
    if (typeof code === "string" && code.trim()) parts.push(`Mã: ${code}`);
    if (parts.length) return parts.join(" — ");
  }
  if (error === null || error === undefined) return "Lỗi không xác định";
  try {
    const s = JSON.stringify(error);
    if (s && s !== "{}") return s;
  } catch {
    /* bỏ qua */
  }
  return String(error);
}
