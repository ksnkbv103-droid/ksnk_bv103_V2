import type {
  BankQuestion,
  QuotaMap,
  QuotaReport,
  SelectExamInput,
  SelectExamResult,
} from "@/lib/dao-tao/types";
import { createSeededRng, shuffledCopy } from "@/lib/dao-tao/rng";
import { buildShuffledSnapshot } from "@/lib/dao-tao/shuffle";

const LOAI_KEYS = ["single", "multi", "true_false_cluster", "order"] as const;
const BLOOM_KEYS = ["1", "2", "3", "4", "5"] as const;

function allocateCounts(total: number, quota: QuotaMap, keys: readonly string[]): Record<string, number> {
  const weights: Record<string, number> = {};
  let sumW = 0;
  for (const k of keys) {
    const w = Math.max(0, Number(quota[k] ?? 0));
    weights[k] = w;
    sumW += w;
  }
  if (sumW <= 0) {
    // đều nếu không cấu hình
    const base = Math.floor(total / keys.length);
    const out: Record<string, number> = {};
    let rem = total;
    for (const k of keys) {
      out[k] = base;
      rem -= base;
    }
    for (let i = 0; rem > 0; i++, rem--) out[keys[i % keys.length]] += 1;
    return out;
  }
  const raw = keys.map((k) => ({ k, v: (weights[k] / sumW) * total }));
  const floors = raw.map((r) => ({ k: r.k, n: Math.floor(r.v), frac: r.v - Math.floor(r.v) }));
  let used = floors.reduce((s, f) => s + f.n, 0);
  const out: Record<string, number> = Object.fromEntries(floors.map((f) => [f.k, f.n]));
  const byFrac = [...floors].sort((a, b) => b.frac - a.frac);
  let rem = total - used;
  for (let i = 0; rem > 0 && i < byFrac.length * 3; i++, rem--) {
    out[byFrac[i % byFrac.length].k] += 1;
  }
  return out;
}

function cellKey(loai: string, bloom: number): string {
  return `${loai}|${bloom}`;
}

function pickBalancedByChuDe(
  pool: BankQuestion[],
  need: number,
  rng: () => number,
  used: Set<string>,
): BankQuestion[] {
  if (need <= 0 || pool.length === 0) return [];
  const available = pool.filter((q) => !used.has(q.id));
  if (available.length === 0) return [];

  const byChuDe = new Map<string, BankQuestion[]>();
  for (const q of available) {
    const list = byChuDe.get(q.chuDeMa) ?? [];
    list.push(q);
    byChuDe.set(q.chuDeMa, list);
  }
  for (const [, list] of byChuDe) shuffleInPlaceLocal(list, rng);

  const picked: BankQuestion[] = [];
  const counts = new Map<string, number>();
  for (const id of byChuDe.keys()) counts.set(id, 0);

  while (picked.length < need) {
    const candidates = [...byChuDe.entries()].filter(([, list]) => list.length > 0);
    if (candidates.length === 0) break;
    candidates.sort((a, b) => (counts.get(a[0]) ?? 0) - (counts.get(b[0]) ?? 0));
    const [chuDeId, list] = candidates[0];
    const q = list.shift()!;
    picked.push(q);
    used.add(q.id);
    counts.set(chuDeId, (counts.get(chuDeId) ?? 0) + 1);
  }
  return picked;
}

function shuffleInPlaceLocal<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function bloomNeighbors(b: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 4; d++) {
    if (b - d >= 1) out.push(b - d);
    if (b + d <= 5) out.push(b + d);
  }
  return out;
}

/**
 * Rút đề đa chiều: quota loại × Bloom, trong mỗi ô lấy đều theo chủ đề;
 * thiếu thì bù cùng loại → Bloom lân cận → bất kỳ còn lại.
 */
export function selectBalancedExam(input: SelectExamInput): SelectExamResult {
  const rng = createSeededRng(input.seed);
  const soCau = Math.max(0, Math.min(input.soCau, input.bank.length));
  const notes: string[] = [];

  const loaiCounts = allocateCounts(soCau, input.loaiQuota, LOAI_KEYS);
  const bloomCounts = allocateCounts(soCau, input.bloomQuota, BLOOM_KEYS);

  // Phân bổ ô loại×bloom gần đúng: lấy min theo tỷ lệ chuẩn hóa
  const cellTargets: Record<string, number> = {};
  let planned = 0;
  for (const loai of LOAI_KEYS) {
    for (const b of BLOOM_KEYS) {
      const bloomN = Number(b);
      const share =
        soCau === 0
          ? 0
          : Math.round(((loaiCounts[loai] || 0) * (bloomCounts[b] || 0)) / Math.max(soCau, 1));
      cellTargets[cellKey(loai, bloomN)] = share;
      planned += share;
    }
  }
  // điều chỉnh tổng về soCau
  let drift = soCau - planned;
  const cellKeys = Object.keys(cellTargets);
  let ci = 0;
  while (drift !== 0 && cellKeys.length > 0) {
    const k = cellKeys[ci % cellKeys.length];
    if (drift > 0) {
      cellTargets[k] += 1;
      drift -= 1;
    } else if (cellTargets[k] > 0) {
      cellTargets[k] -= 1;
      drift += 1;
    }
    ci += 1;
    if (ci > cellKeys.length * soCau + 10) break;
  }

  const used = new Set<string>();
  const selected: BankQuestion[] = [];

  const poolByCell = new Map<string, BankQuestion[]>();
  for (const q of input.bank) {
    const k = cellKey(q.loai, q.bloomLevel);
    const list = poolByCell.get(k) ?? [];
    list.push(q);
    poolByCell.set(k, list);
  }

  for (const [k, need] of Object.entries(cellTargets)) {
    if (need <= 0) continue;
    const pool = poolByCell.get(k) ?? [];
    const got = pickBalancedByChuDe(pool, need, rng, used);
    selected.push(...got);
    if (got.length < need) {
      notes.push(`Thiếu ${need - got.length} câu ô ${k}`);
    }
  }

  // Bù thiếu: cùng loại → bloom gần → bất kỳ
  let missing = soCau - selected.length;
  if (missing > 0) {
    for (const loai of LOAI_KEYS) {
      if (missing <= 0) break;
      for (const bStr of BLOOM_KEYS) {
        if (missing <= 0) break;
        const b = Number(bStr);
        for (const nb of [b, ...bloomNeighbors(b)]) {
          if (missing <= 0) break;
          const pool = (poolByCell.get(cellKey(loai, nb)) ?? []).filter((q) => !used.has(q.id));
          const got = pickBalancedByChuDe(pool, missing, rng, used);
          selected.push(...got);
          missing = soCau - selected.length;
        }
      }
    }
    if (missing > 0) {
      const rest = input.bank.filter((q) => !used.has(q.id));
      const got = pickBalancedByChuDe(rest, missing, rng, used);
      selected.push(...got);
      if (got.length < missing) notes.push(`Bank không đủ: thiếu ${missing - got.length} câu`);
    }
  }

  const ordered =
    input.shuffleCau === false ? selected : shuffledCopy(selected, rng);

  const questions = ordered.map((q) =>
    buildShuffledSnapshot(q, rng, input.shuffleDapAn !== false),
  );

  const report: QuotaReport = {
    requested: soCau,
    selected: questions.length,
    byLoai: {},
    byBloom: {},
    byChuDe: {},
    notes,
  };
  for (const q of questions) {
    report.byLoai[q.loai] = (report.byLoai[q.loai] ?? 0) + 1;
    report.byBloom[String(q.bloomLevel)] = (report.byBloom[String(q.bloomLevel)] ?? 0) + 1;
    report.byChuDe[q.chuDeMa] = (report.byChuDe[q.chuDeMa] ?? 0) + 1;
  }

  return { questions, report };
}
