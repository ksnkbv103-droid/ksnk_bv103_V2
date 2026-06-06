import { z } from "zod";

export const qlcvChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1),
  done: z.boolean(),
});

export const qlcvChecklistSchema = z.array(qlcvChecklistItemSchema).max(80);

export type QlcvChecklistItem = z.infer<typeof qlcvChecklistItemSchema>;

export function normalizeQlcvChecklist(raw: unknown): QlcvChecklistItem[] {
  const parsed = qlcvChecklistSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (!Array.isArray(raw)) return [];
  const out: QlcvChecklistItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = String(o.label ?? "").trim();
    if (!label) continue;
    out.push({
      id: String(o.id ?? `item-${out.length + 1}`),
      label,
      done: Boolean(o.done),
    });
  }
  return out;
}
