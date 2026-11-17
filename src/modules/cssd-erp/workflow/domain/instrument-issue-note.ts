/** Pure: dòng ghi chú audit Hỏng/Mất trên dòng chi tiết — dùng chung cho CSSD và sự cố. */
export type InstrumentIssueType = "HONG" | "MAT";

/** Mốc ghi chú `fn_cssd_append_chi_tiet_issue_note`: now() UTC, định dạng `YYYY-MM-DD HH24:MI:SS`. */
export function issueNoteStamp(createdAt: string): string | null {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Pure: gỡ các dòng `[HONG]/[MAT] <mốc>` đã ghi cho dòng sổ của phiếu bị vô hiệu.
 * Dòng ghi chú và dòng sổ cùng `now()` trong một transaction nên khớp theo mốc giây.
 * Dòng khác (ghi chú gốc, phiếu khác) giữ nguyên.
 */
export function removeChiTietIssueNoteLines(
  oldNote: string,
  lines: { issueType: InstrumentIssueType; createdAt: string }[],
): string {
  const prefixes = lines
    .map((l) => {
      const stamp = issueNoteStamp(l.createdAt);
      return stamp ? `[${l.issueType}] ${stamp}` : null;
    })
    .filter((p): p is string => Boolean(p));
  if (!prefixes.length) return oldNote;
  return oldNote
    .split("\n")
    .filter((ln) => !prefixes.some((p) => ln.startsWith(p)))
    .join("\n")
    .trim();
}
