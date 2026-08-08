import type { DapAnDung, TraLoi } from "@/lib/dao-tao/types";

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function sameIdOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/** Chấm theo id phương án ổn định — không phụ thuộc nhãn A/B/C/D sau shuffle. */
export function gradeAnswer(dapAnDung: DapAnDung, traLoi: TraLoi | null | undefined): boolean {
  if (!traLoi || traLoi.kind !== dapAnDung.kind) return false;

  switch (dapAnDung.kind) {
    case "single":
      return traLoi.kind === "single" && !!traLoi.optionId && traLoi.optionId === dapAnDung.optionId;
    case "multi":
      if (!dapAnDung.optionIds.length) return false;
      return traLoi.kind === "multi" && sameIdSet(traLoi.optionIds, dapAnDung.optionIds);
    case "true_false_cluster": {
      if (traLoi.kind !== "true_false_cluster") return false;
      const keys = Object.keys(dapAnDung.byOptionId);
      if (keys.length === 0) return false;
      return keys.every((id) => traLoi.byOptionId[id] === dapAnDung.byOptionId[id]);
    }
    case "order":
      if (!dapAnDung.orderedOptionIds.length) return false;
      return (
        traLoi.kind === "order" &&
        sameIdOrder(traLoi.orderedOptionIds, dapAnDung.orderedOptionIds)
      );
    default:
      return false;
  }
}

export function scoreAttempt(
  items: Array<{ dapAnDung: DapAnDung; traLoi: TraLoi | null | undefined }>,
): { dung: number; tong: number; pct: number; flags: boolean[] } {
  const flags = items.map((it) => gradeAnswer(it.dapAnDung, it.traLoi));
  const dung = flags.filter(Boolean).length;
  const tong = items.length;
  const pct = tong === 0 ? 0 : Math.round((dung / tong) * 1000) / 10;
  return { dung, tong, pct, flags };
}
