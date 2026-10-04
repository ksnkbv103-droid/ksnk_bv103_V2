/**
 * Domain 19c TAC-3A — Đóng việc bắt buộc kết quả.
 * Soft: 1 dòng kết quả OR checklist 100% = kết quả.
 * Không thêm cột DB — tái dùng checklist / nhật ký.
 */

import {
  normalizeQlcvChecklist,
  percentFromQlcvChecklist,
  taskUsesQlcvChecklistForProgress,
} from "@/lib/domain/qlcv-checklist";

/** Checklist đủ 100% (khi việc dùng checklist) = đủ kết quả đóng. */
export function hasQlcvChecklistFullResult(checklist: unknown): boolean {
  if (!taskUsesQlcvChecklistForProgress(checklist)) return false;
  return percentFromQlcvChecklist(normalizeQlcvChecklist(checklist)) >= 100;
}

export function normalizeQlcvKetQuaText(raw: string | null | undefined): string {
  return String(raw ?? "").trim();
}

/**
 * Soft gate trước khi chuyển HOAN_THANH (nghiệm thu / đóng).
 * @returns null nếu OK; message lỗi nếu thiếu kết quả.
 */
export function validateQlcvCloseRequiresResult(input: {
  checklist?: unknown;
  ketQuaText?: string | null;
}): string | null {
  if (hasQlcvChecklistFullResult(input.checklist)) return null;
  const text = normalizeQlcvKetQuaText(input.ketQuaText);
  if (text.length >= 1) return null;
  return "Đóng việc cần 1 dòng kết quả (hoặc checklist đủ 100%).";
}
