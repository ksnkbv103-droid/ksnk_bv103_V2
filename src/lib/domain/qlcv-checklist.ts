/** Checklist QLCV — logic thuần (không I/O). */

export type QlcvChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export function normalizeQlcvChecklist(raw: unknown): QlcvChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const out: QlcvChecklistItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const label = String(r.label ?? "").trim();
    if (!label) continue;
    const id = String(r.id ?? "").trim() || crypto.randomUUID();
    out.push({ id, label, done: Boolean(r.done) });
  }
  return out;
}

export function percentFromQlcvChecklist(items: QlcvChecklistItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}

export function newChecklistItem(label: string): QlcvChecklistItem {
  return { id: crypto.randomUUID(), label: label.trim(), done: false };
}

/** Mỗi dòng không rỗng trong mô tả mẫu định kỳ → một mục checklist (bỏ prefix `-` / số thứ tự). */
export function parseMoTaToQlcvChecklist(moTa: string | null | undefined): QlcvChecklistItem[] {
  if (!moTa?.trim()) return [];
  const lines = moTa.split(/\r?\n/);
  const out: QlcvChecklistItem[] = [];
  for (const raw of lines) {
    let label = raw.trim();
    if (!label) continue;
    label = label.replace(/^[-*•]\s+/, "");
    label = label.replace(/^\d+[.)]\s+/, "");
    if (!label) continue;
    out.push(newChecklistItem(label));
  }
  return out;
}
